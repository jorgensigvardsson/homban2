/**
 * Local HTTPS reverse proxy.
 *
 * It mirrors how the app is fronted in Azure: one origin serves both the UI and
 * the API, so the frontend can call "/api/..." with no CORS and no absolute
 * URLs anywhere in the code.
 *
 *   https://localhost/api/*  ->  Go backend   (127.0.0.1:8080)
 *   https://localhost/*      ->  Vite dev server (127.0.0.1:5173)
 *
 * WebSocket upgrades are forwarded too, which is what keeps Vite's hot reload
 * working through the proxy.
 */
import http from 'node:http';
import https from 'node:https';
import type { Duplex } from 'node:stream';
import { createProxyServer } from 'http-proxy-3';
import { config, publicOrigin, routeFor, type Route } from './config.js';
import { ensureCertificates } from './certs.js';

const certs = await ensureCertificates(config.certDir, config.domains);

const proxy = createProxyServer({
  // Preserve the client's Host header so the upstream builds correct URLs.
  changeOrigin: false,
  // Send X-Forwarded-For / -Proto / -Host, as Azure ingress does.
  xfwd: true,
  ws: true,
  // Vite streams responses; do not buffer them waiting for a full body.
  proxyTimeout: 60_000,
  timeout: 60_000,
});

proxy.on('error', (err: NodeJS.ErrnoException, req, res) => {
  const target = (req as http.IncomingMessage & { hombanRoute?: Route }).hombanRoute;
  log('error', `${req.method ?? '?'} ${req.url ?? '?'} -> ${target?.name ?? 'unknown'}: ${err.message}`);

  // res is a ServerResponse for normal requests and a socket for upgrades.
  if (!res || !('writeHead' in res)) {
    (res as Duplex | undefined)?.destroy();
    return;
  }
  if (res.headersSent) {
    res.end();
    return;
  }
  res.writeHead(502, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(badGatewayPage(target, err));
});

const server = https.createServer({ key: certs.key, cert: certs.cert }, (req, res) => {
  const route = routeFor(pathOf(req.url));
  (req as http.IncomingMessage & { hombanRoute?: Route }).hombanRoute = route;
  proxy.web(req, res, { target: route.target });
});

server.on('upgrade', (req, socket, head) => {
  const route = routeFor(pathOf(req.url));
  (req as http.IncomingMessage & { hombanRoute?: Route }).hombanRoute = route;
  socket.on('error', () => socket.destroy());
  proxy.ws(req, socket, head, { target: route.target });
});

// A TLS handshake failure (typically an untrusted CA) must not kill the proxy.
server.on('tlsClientError', (err: NodeJS.ErrnoException) => {
  if (err.code === 'ECONNRESET' || err.code === 'ERR_SSL_TLSV1_ALERT_UNKNOWN_CA') return;
  log('warn', `TLS handshake failed: ${err.message}`);
});

server.listen(config.httpsPort, () => {
  log('info', `listening on ${publicOrigin()}`);
  for (const route of config.routes) {
    log('info', `  ${route.prefix}/*  -> ${route.target}  (${route.name})`);
  }
  log('info', `  /*        -> ${config.fallback.target}  (${config.fallback.name})`);

  if (certs.caIsNew) {
    log('warn', 'A new local CA was generated. Trust it once so the browser stops warning:');
    log('warn', '  npm run trust-ca');
  }
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    log('error', `port ${config.httpsPort} is already in use. Set PROXY_HTTPS_PORT to a free port, e.g. 8443.`);
    process.exit(1);
  }
  if (err.code === 'EACCES') {
    log('error', `not allowed to bind port ${config.httpsPort}. Set PROXY_HTTPS_PORT to a port above 1024, e.g. 8443.`);
    process.exit(1);
  }
  throw err;
});

// Plain HTTP listener that only redirects, so typing "localhost" in the address
// bar lands on HTTPS. Optional: a port clash just disables it.
if (config.httpRedirectPort > 0) {
  const redirect = http.createServer((req, res) => {
    const host = (req.headers.host ?? 'localhost').replace(/:\d+$/, '');
    const port = config.httpsPort === 443 ? '' : `:${config.httpsPort}`;
    res.writeHead(308, { Location: `https://${host}${port}${req.url ?? '/'}` });
    res.end();
  });
  redirect.on('error', (err: NodeJS.ErrnoException) => {
    log('warn', `HTTP redirect on port ${config.httpRedirectPort} disabled (${err.code ?? err.message}).`);
  });
  redirect.listen(config.httpRedirectPort, () => {
    log('info', `redirecting http://localhost:${config.httpRedirectPort} -> HTTPS`);
  });
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    log('info', 'shutting down');
    server.close(() => process.exit(0));
    // Do not wait forever for idle keep-alive sockets.
    setTimeout(() => process.exit(0), 2_000).unref();
  });
}

function pathOf(url: string | undefined): string {
  const raw = url ?? '/';
  const queryAt = raw.indexOf('?');
  return queryAt === -1 ? raw : raw.slice(0, queryAt);
}

function log(level: 'info' | 'warn' | 'error', message: string): void {
  const stamp = new Date().toISOString().slice(11, 19);
  const stream = level === 'info' ? console.log : console.error;
  stream(`${stamp} proxy ${level}: ${message}`);
}

/** A readable page instead of a bare socket error when an upstream is down. */
function badGatewayPage(route: Route | undefined, err: NodeJS.ErrnoException): string {
  const name = route?.name ?? 'upstream';
  const target = route?.target ?? 'unknown target';
  const hint =
    name === 'backend'
      ? 'Is the Go API running? Start everything with <code>npm run dev</code> in the repo root.'
      : 'Is the Vite dev server running? Start everything with <code>npm run dev</code> in the repo root.';
  return `<!doctype html>
<meta charset="utf-8">
<title>502 - ${name} unreachable</title>
<style>
  body { font: 16px/1.6 system-ui, sans-serif; margin: 4rem auto; max-width: 40rem; padding: 0 1rem; }
  code { background: #f1f1f1; padding: .1rem .35rem; border-radius: .25rem; }
  .muted { color: #666; }
</style>
<h1>502 &mdash; cannot reach the ${name}</h1>
<p>The proxy could not connect to <code>${target}</code>.</p>
<p>${hint}</p>
<p class="muted">${err.code ?? ''} ${escapeHtml(err.message)}</p>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);
}
