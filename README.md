# Homban

A web application with a React frontend and a Go backend. Both are served
through a single HTTPS origin, locally and in the cloud.

The app's purpose is still to be defined — this repository currently holds the
running skeleton everything else gets built on.

## What you need installed

| Tool | Version | Check with |
| --- | --- | --- |
| [Node.js](https://nodejs.org) | 20 or later | `node --version` |
| [Go](https://go.dev/dl/) | 1.26 or later | `go version` |

Nothing else. No Docker, no OpenSSL, no separate certificate tool — the proxy
generates its own certificates in pure JavaScript.

## First-time setup

Run every command from the repository root.

### 1. Install dependencies

```bash
npm install
```

This installs the frontend and proxy packages. The backend needs nothing
installed: `go run` fetches its single dependency on first build.

### 2. Start everything

```bash
npm run dev
```

One command starts all three processes in one terminal, with each line prefixed
by which one produced it. On the very first run the proxy also generates its
certificates. You are up when you see all three of these:

```
[proxy]    proxy info: listening on https://localhost
[frontend] VITE v8.2.2  ready in 325 ms
[backend]  msg=listening addr=127.0.0.1:8080 env=development
```

Leave this running and use a second terminal for everything else.

#### Windows with Node 25 on this workstation

Node `v25.2.1` currently fails in `tsx` on this machine with
`uv_os_get_passwd returned ENOMEM`. This is a Node/Windows user-info error, not
an indication that the app has run out of memory. Check the version first with
`node --version`. When it reports Node 25, start the stack with:

```powershell
npm run dev:node25
```

That command still starts the backend, frontend and HTTPS proxy together. It
first compiles the proxy to ignored `proxy/build/` JavaScript and therefore
avoids the broken `tsx` startup path. Frontend hot reload still works; restart
the command after editing proxy source files. Use ordinary `npm run dev` again
after Node has been upgraded or downgraded to a version where `os.userInfo()`
works.

### 3. Trust the local certificate (once per machine)

The proxy serves HTTPS with a certificate it issued itself, which browsers
distrust by default. Teach your machine to trust it:

```bash
npm run trust-ca
```

- **Windows** — adds the certificate authority to your own user store, so **no
  administrator rights are needed**. Windows shows a one-time security warning
  dialog; click **Yes**.
- **macOS** — adds it to your login keychain; you may be asked for your
  password.
- **Linux** — prints the two `sudo` commands to run, because distributions
  differ.

**Restart the browser completely afterwards** — it caches trust decisions.

Undo it any time with `npm run trust-ca -- --remove`.

**Firefox keeps its own trust store** and ignores the system one. Either set
`security.enterprise_roots.enabled` to `true` in `about:config`, or import
`proxy/certs/ca.crt` under Settings → Privacy & Security → Certificates → View
Certificates → Authorities → Import.

If you would rather not trust anything, you can click through the browser's
warning instead. Everything works, you just get a warning each session.

### 4. Open the app

Go to **<https://localhost>** — not `http://localhost:5173`. The session cookie
is marked `Secure`, so signing in only works over HTTPS through the proxy.

You will land on the login page.

### 5. Sign in (the code is in your terminal)

Type any email address that looks valid — there is no user directory yet, so
anything works — and press **Send code**.

**No mail is sent in development.** The code is printed by the backend, so look
at the terminal running `npm run dev` and find the box in the `[backend]` lane:

```
[backend]   +--------------------------------------------------+
[backend]   |  SIGN-IN CODE (development: no mail was sent)    |
[backend]   +--------------------------------------------------+
[backend]   |  to:    you@example.com                          |
[backend]   |  code:  225449                                   |
[backend]   |  valid: 10m0s                                    |
[backend]   +--------------------------------------------------+
```

Type those six digits into the page and you are in. The code is valid for
10 minutes, works once, and allows five wrong guesses before it is voided.

In development the session then lasts **30 days**, so you only do this about
once a month. That is far too long for a real deployment and is why the default
drops to 12 hours as soon as `APP_ENV` is not `development`.

### Checking it works without a browser

Useful for scripts and agents:

```bash
# Through the proxy. -k skips certificate verification.
curl -k https://localhost/api/v1/health      # {"status":"ok",...}
curl -k -o /dev/null -w "%{http_code}\n" https://localhost/   # 200 = frontend served
```

The full sign-in flow over curl, reading the code straight out of the backend
log, is in [Signing in](#signing-in) below.

## Everyday development

```bash
npm run dev        # backend + frontend + proxy, all in one terminal
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Runs all three processes with colour-coded, prefixed logs |
| `npm run dev:node25` | Windows/Node 25 fallback: runs all three with a precompiled proxy |
| `npm run build` | Production build: frontend to `frontend/dist`, backend to `backend/bin/server` |
| `npm test` | Runs the Go tests |
| `npm run check` | Typechecks the frontend and proxy, and runs `go vet` |
| `npm run trust-ca` | Adds the local CA to the OS trust store (`-- --remove` to undo) |
| `npm run certs:clean` | Deletes the generated certificates; the next `npm run dev` mints new ones |

Each part can also be run on its own:

```bash
npm run dev:backend     # or: cd backend && go run ./cmd/server
npm run dev:frontend    # or: cd frontend && npm run dev
npm run dev:proxy       # or: cd proxy   && npm run dev
```

Editing frontend files hot-reloads in the browser. Editing proxy files restarts
the proxy. **Editing Go files does not restart the backend** — stop `npm run dev`
with `Ctrl-C` and start it again. (Optional: install
[air](https://github.com/air-verse/air) and point `dev:backend` at it for
automatic reloads.)

## How it fits together

In development:

```
                    +--------------------------------------+
  browser           |  proxy (Node/TypeScript)             |
  https://localhost |  https://localhost:443               |
  ----------------> |                                      |
                    |  /api/*  -->  Go API   127.0.0.1:8080|
                    |  /*      -->  Vite dev 127.0.0.1:5173|
                    +--------------------------------------+
```

In Azure the same single-origin shape is kept, with managed services taking the
proxy's place:

```
  browser --> Azure ingress --> /api/* --> backend container (Container Apps)
                            \-> /*     --> static frontend build
                                             backend --> Cosmos DB
```

Because the browser only ever sees one origin, the frontend calls the API with
relative paths (`/api/v1/health`). There is no CORS configuration anywhere, and
no environment-specific base URLs to manage.

### Ports

| Port | Process | Notes |
| --- | --- | --- |
| 443 | Reverse proxy (HTTPS) | The only port you open in a browser |
| 80 | Reverse proxy (HTTP) | Redirects to HTTPS; skipped if the port is taken |
| 8080 | Go backend | Bound to `127.0.0.1`, reached through the proxy |
| 5173 | Vite dev server | Bound to `127.0.0.1`, reached through the proxy |

Every port and target can be overridden with environment variables — see
[.env.example](.env.example).

## Signing in

Sign-in is passwordless: you get a one-time code by email, and exchanging it for
a session sets a cookie.

```
  1. POST /api/v1/auth/request-code   {"email": "..."}      -> 202
       backend generates a 6-digit code, stores its digest, "mails" it
  2. POST /api/v1/auth/verify-code    {"email","code"}      -> 200 + Set-Cookie
       backend signs a JWT and puts it in an HttpOnly cookie
  3. GET  /api/v1/auth/me                                   -> 200 {email, role}
       any protected endpoint; the browser sends the cookie automatically
  4. POST /api/v1/auth/logout                               -> 204, cookie cleared
```

**During development no mail is sent.** The code is printed to stdout, so it
shows up in the `[backend]` lane of `npm run dev`:

```
  +--------------------------------------------------+
  |  SIGN-IN CODE (development: no mail was sent)    |
  +--------------------------------------------------+
  |  to:    you@example.com                          |
  |  code:  225449                                   |
  |  valid: 10m0s                                    |
  +--------------------------------------------------+
```

Any syntactically valid address works — there is no user directory yet, so
whatever you type is treated as a valid account.

### Signing in from the command line

Handy for testing an endpoint, or for an agent that has no browser. This reads
the code out of the running backend's output, so run `npm run dev` with its log
going to a file first:

```bash
npm run dev > /tmp/dev.log 2>&1 &

# 1. Ask for a code.
curl -k -X POST https://localhost/api/v1/auth/request-code \
  -H "Content-Type: application/json" -d '{"email":"you@example.com"}'

# 2. Pluck it out of the log.
CODE=$(grep -oE "code:  [0-9]+" /tmp/dev.log | tail -1 | grep -oE "[0-9]+")

# 3. Exchange it for a session, saving the cookie to a jar.
curl -k -c /tmp/jar -X POST https://localhost/api/v1/auth/verify-code \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"you@example.com\",\"code\":\"$CODE\"}"

# 4. Use the session.
curl -k -b /tmp/jar https://localhost/api/v1/auth/me
```

### How the session is held

The JWT lives in a cookie marked `HttpOnly`, `Secure` and `SameSite=Lax`.
HttpOnly means JavaScript cannot read the token, so an XSS bug cannot steal a
session. The consequence is that the frontend never handles the token at all:
there is nothing in `localStorage`, and nothing is attached to requests by hand.
"Am I signed in?" is answered by asking the server (`/auth/me`).

The token carries a `role` claim, `admin` for everyone right now. Roles are
[a Go type](backend/internal/auth/token.go) rather than free-form strings, and a
token whose role this build does not recognise is rejected rather than assumed
harmless.

### What signs the tokens

A dedicated secret in `JWT_SECRET`, using HS256 — deliberately **not** the TLS
certificate. TLS terminates at the Azure ingress where the app cannot read the
private key, managed certificates rotate on their own schedule (which would
invalidate every session), and a key that proves server identity should not also
mint credentials.

Two deliberate shortcuts make local development less annoying, and both are
development-only: sessions last **30 days** instead of 12 hours, and the signing
secret falls back to a built-in constant. Together they mean you sign in about
once a month and never get signed out by restarting the backend. Neither applies
once `APP_ENV` is not `development`.

In development, `JWT_SECRET` may be left unset: a built-in constant is used and
the backend logs a warning. It is constant so that restarting the backend does
not sign you out. The service refuses to start without a real secret when
`APP_ENV` is anything other than `development`. Generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Because one service both issues and verifies tokens, a symmetric secret is the
right tool. Move to asymmetric signing (EdDSA plus a published JWKS) only when
some *other* service has to verify tokens without being able to mint them.

### Limits that are enforced

| Rule | Default | Setting |
| --- | --- | --- |
| Code lifetime | 10 minutes | `OTP_TTL` |
| Wrong guesses before the code is voided | 5 | `OTP_MAX_ATTEMPTS` |
| Cooldown between code requests per address | 60 seconds | `OTP_RESEND_AFTER` |
| Session lifetime | **30 days in development**, 12 hours otherwise | `SESSION_TTL` |

A code is single-use: redeeming it deletes it, so it cannot be replayed. Codes
are stored as keyed digests rather than in the clear, though the real defence
against guessing six digits is the attempt limit plus the short lifetime.

## Layout

```
backend/                 Go service (one dependency: golang-jwt)
  cmd/server/            main: config, logging, graceful shutdown
  internal/config/       environment-based configuration
  internal/auth/         sign-in codes, session tokens, roles
  internal/email/        mail delivery; prints to stdout for now
  internal/httpapi/      routing, middleware, handlers
  internal/store/        persistence port; in-memory today, Cosmos later
  Dockerfile             distroless image for Container Apps

frontend/                React + TypeScript + Vite + Tailwind v4
  src/api/               typed API client and per-resource query hooks
  src/components/        shared components, including the route guard
  src/hooks/             small reusable hooks
  src/pages/             one file per route
  src/App.tsx            route table

proxy/                   Local HTTPS reverse proxy (TypeScript)
  src/config.ts          ports, targets and routing rules
  src/certs.ts           generates the local CA and certificate
  src/index.ts           the proxy server
  scripts/trust-ca.ts    installs the CA in the OS trust store
  certs/                 generated, git-ignored
```

## Adding things

**A backend endpoint.** Register the route in
[backend/internal/httpapi/router.go](backend/internal/httpapi/router.go) and add
a handler next to it. Go 1.22+ patterns include the method and path variables:

```go
mux.HandleFunc("GET /api/v1/boards/{id}", api.handleGetBoard)
```

In the handler, read variables with `r.PathValue("id")`, respond with
`JSON(w, r, http.StatusOK, body)` or `Error(w, r, status, code, message)`. Every
request already has a correlation id, a request-scoped logger
(`LoggerFrom(r.Context())`) and panic recovery.

**An endpoint that needs a signed-in user.** Wrap the handler in `api.authed`,
which is what makes the protection visible at the route table:

```go
mux.Handle("GET /api/v1/boards/{id}", api.authed(api.handleGetBoard))

// Restricted further by role:
mux.Handle("DELETE /api/v1/boards/{id}",
    api.authed(api.handleDeleteBoard, api.RequireRole(auth.RoleAdmin)))
```

Inside the handler, `IdentityFrom(r.Context())` returns the caller's email and
role. Reaching the handler at all means the session was valid.

**A frontend page.** Add a component under `src/pages/` and a `<Route>` in
[frontend/src/App.tsx](frontend/src/App.tsx). Routes nested inside
`<RequireSession>` demand a signed-in user and redirect to `/login` otherwise,
remembering where the visitor was headed; put public pages outside it.

**A new role.** Add it to the `Role` type and `Valid()` in
[backend/internal/auth/token.go](backend/internal/auth/token.go), mirror it in
the `Role` union in [frontend/src/api/auth.ts](frontend/src/api/auth.ts), and
decide who gets it in `Service.roleFor` — the single seam where roles are
assigned today.

**A frontend API call.** Add a module under `src/api/` following
[health.ts](frontend/src/api/health.ts): response types, a `queryOptions`
factory, and a hook. Failures always arrive as an `ApiError` carrying the
backend's error `code` and `requestId`.

**A persistence operation.** Add the method to the `Store` interface in
[backend/internal/store/store.go](backend/internal/store/store.go) and implement
it for every backing store. Handlers depend on the interface, never on a
concrete database.

## Conventions worth knowing

- **One error shape.** Every failure is `{"error":{"code","message","requestId"}}`,
  including the 404 and 405 that the router itself generates. The frontend has a
  single error path.
- **Relative API paths only.** Never a hard-coded host or port in frontend code.
- **API version in the path.** Everything lives under `/api/v1`.
- **Config from the environment, with dev defaults.** The service starts with no
  setup, and the same binary is configured differently in Azure.

## Troubleshooting

**`uv_os_get_passwd returned ENOMEM` while starting the proxy.** On this
Windows workstation, Node `v25.2.1` has a broken `os.userInfo()` call used by
`tsx`. Run `npm run dev:node25` from the repository root. Despite the wording,
freeing memory does not fix this particular error.

**"Port 443 is already in use."** Something else (often IIS or another dev
proxy) holds it. Either stop it, or run with a different port:

```bash
PROXY_HTTPS_PORT=8443 npm run dev     # then open https://localhost:8443
```

On Windows PowerShell: `$env:PROXY_HTTPS_PORT=8443; npm run dev`.

**The browser still warns about the certificate.** Run `npm run trust-ca` and
restart the browser completely. Firefox keeps its own trust store: either set
`security.enterprise_roots.enabled` to true in `about:config`, or import
`proxy/certs/ca.crt` under Settings, Privacy & Security, Certificates.

**"502 — cannot reach the backend/frontend."** That process is not running.
Check the `npm run dev` output for a crash in the `[backend]` or `[frontend]`
lane.

**Hot reload stopped working.** The HMR socket goes through the proxy, so the
proxy has to be running. If you changed `PROXY_HTTPS_PORT`, use the same value
for both processes so Vite tells the browser the right port.

**Certificates look broken after fiddling.** `npm run certs:clean`, then
`npm run dev` to mint a fresh CA, then `npm run trust-ca` again.

**"cannot listen on 127.0.0.1:8080 (is another instance already running?)"** A
previous backend is still alive — usually a `go run` child that outlived its
parent terminal. On Windows: `taskkill /F /IM server.exe`.

**The sign-in code never arrives.** It is not mailed yet. Look in the terminal
running `npm run dev`, in the `[backend]` lane.

**Signed out after every backend restart.** Only happens if `JWT_SECRET` is set
to a fresh random value each run. Unset it in development and the constant
development secret keeps sessions alive across restarts.

**Stuck at "Sign in to continue" in a loop.** The cookie is `Secure`, so it is
only stored over HTTPS. Reach the app at `https://localhost` through the proxy,
never at `http://localhost:5173` directly.

## Road to Azure

Not built yet, but the skeleton is shaped for it:

- **Backend** — `backend/Dockerfile` produces a distroless image that reads
  `PORT` and binds all interfaces, which is what Container Apps expects. The
  probes are `GET /api/v1/health` (liveness) and `GET /api/v1/ready` (readiness).
- **Frontend** — `npm run build` emits static files in `frontend/dist`, ready for
  Static Web Apps or Blob Storage behind a CDN. Hosting must fall back to
  `index.html` for unknown paths so client-side routing works.
- **Database** — `COSMOS_ENDPOINT` / `COSMOS_DATABASE` / `COSMOS_CONTAINER` are
  already read by the config package. The implementation goes in
  `internal/store/cosmos.go` behind the existing `Store` interface, authenticating
  with a managed identity rather than keys.
- **Logging** — set `LOG_FORMAT=json` in the container so Azure Monitor parses
  the structured `slog` output.
- **Secrets** — `JWT_SECRET` becomes a Container Apps secret backed by Key
  Vault. Rotating it signs everyone out, which is acceptable but worth doing
  deliberately.
- **Email** — implement `email.Sender` against Azure Communication Services (or
  SMTP) and swap it in `buildAuth`. Nothing else changes.
- **Sign-in codes across replicas** — codes currently live in process memory, so
  scaling past one replica breaks sign-in: the code is issued by one instance and
  verified by another. Before scaling out, back `auth.CodeStore` with Redis or a
  Cosmos container with a TTL. Session tokens themselves are stateless and scale
  fine.

## Licence

GPL-3.0-or-later. See [LICENSE](LICENSE).
