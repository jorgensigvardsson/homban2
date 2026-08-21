/**
 * Proxy configuration.
 *
 * The defaults are what `npm run dev` at the repo root expects; every value can
 * be overridden with an environment variable (put them in a .env consumed by
 * your shell, or set them inline).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/** A path prefix routed to a specific upstream. First match wins. */
export interface Route {
  /** Path prefix, e.g. "/api". Matched against the request path. */
  prefix: string;
  /** Upstream origin, e.g. "http://127.0.0.1:8080". */
  target: string;
  /** Label used in log lines. */
  name: string;
}

export interface ProxyConfig {
  httpsPort: number;
  /** Plain HTTP port that redirects to HTTPS. Set to 0 to disable. */
  httpRedirectPort: number;
  /** Hostnames the certificate is valid for. */
  domains: string[];
  certDir: string;
  routes: Route[];
  /** Upstream used when no route prefix matches (the frontend dev server). */
  fallback: Route;
}

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 65535) {
    throw new Error(`${name} must be an integer between 0 and 65535, got "${raw}"`);
  }
  return parsed;
}

function str(name: string, fallback: string): string {
  const raw = process.env[name];
  return raw === undefined || raw === '' ? fallback : raw;
}

export const config: ProxyConfig = {
  httpsPort: num('PROXY_HTTPS_PORT', 443),
  httpRedirectPort: num('PROXY_HTTP_PORT', 80),
  domains: str('PROXY_DOMAINS', 'localhost,127.0.0.1,::1,homban.localhost')
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean),
  certDir: path.resolve(str('PROXY_CERT_DIR', path.join(here, '..', 'certs'))),
  routes: [
    {
      prefix: '/api',
      name: 'backend',
      target: str('BACKEND_TARGET', 'http://127.0.0.1:8080'),
    },
  ],
  fallback: {
    prefix: '/',
    name: 'frontend',
    target: str('FRONTEND_TARGET', 'http://127.0.0.1:5173'),
  },
};

/** Resolves the upstream for a request path. */
export function routeFor(pathname: string, cfg: ProxyConfig = config): Route {
  for (const route of cfg.routes) {
    if (pathname === route.prefix || pathname.startsWith(`${route.prefix}/`)) {
      return route;
    }
  }
  return cfg.fallback;
}

/** The browser-facing origin, omitting the port when it is the default 443. */
export function publicOrigin(cfg: ProxyConfig = config): string {
  return cfg.httpsPort === 443 ? 'https://localhost' : `https://localhost:${cfg.httpsPort}`;
}
