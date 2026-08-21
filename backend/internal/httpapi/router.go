// Package httpapi contains the HTTP surface of the service: routing,
// middleware and handlers. It depends on the other packages through
// interfaces and small structs only.
package httpapi

import (
	"log/slog"
	"net/http"

	"github.com/jorgensigvardsson/homban2/backend/internal/auth"
	"github.com/jorgensigvardsson/homban2/backend/internal/store"
)

// Deps are the collaborators the HTTP layer needs.
type Deps struct {
	Logger  *slog.Logger
	Store   store.Store
	Auth    *auth.Service
	Version string
	Env     string

	// CookieName and CookieSecure describe the session cookie.
	CookieName   string
	CookieSecure bool
	// CodeLength is echoed to the UI so the code input sizes itself.
	CodeLength int
	// MailToStdout tells the UI that codes are printed to the server log
	// instead of being mailed, so it can say where to look.
	MailToStdout bool
}

// API holds the dependencies shared by all handlers.
type API struct {
	deps Deps
}

// New builds the fully wired http.Handler for the service.
func New(deps Deps) http.Handler {
	if deps.Logger == nil {
		deps.Logger = slog.Default()
	}
	api := &API{deps: deps}

	mux := http.NewServeMux()

	// --- Public routes ---------------------------------------------------
	// Health and readiness. Container Apps points its probes at these.
	mux.HandleFunc("GET /api/v1/health", api.handleHealth)
	mux.HandleFunc("GET /api/v1/ready", api.handleReady)

	// Sign-in. Reachable without a session, for obvious reasons.
	mux.HandleFunc("POST /api/v1/auth/request-code", api.handleRequestCode)
	mux.HandleFunc("POST /api/v1/auth/verify-code", api.handleVerifyCode)
	mux.HandleFunc("POST /api/v1/auth/logout", api.handleLogout)

	// --- Authenticated routes --------------------------------------------
	// api.authed requires a valid session cookie. Wrapping each route makes
	// it obvious at a glance which endpoints are protected.
	mux.Handle("GET /api/v1/auth/me", api.authed(api.handleMe))

	// Domain routes go here as the app takes shape, for example:
	//   mux.Handle("GET /api/v1/boards/{id}", api.authed(api.handleGetBoard))
	// Restrict one to certain roles with a second argument:
	//   mux.Handle("DELETE /api/v1/boards/{id}",
	//       api.authed(api.handleDeleteBoard, api.RequireRole(auth.RoleAdmin)))

	return Chain(mux,
		RequestID,
		Logger(deps.Logger),
		Recover(deps.Logger),
		JSONProblems,
		NoCacheAPI,
	)
}

// authed requires a valid session for h, and applies any extra middleware
// (such as RequireRole) inside the session check, so those middlewares can
// rely on the identity being present.
func (a *API) authed(h http.HandlerFunc, mw ...Middleware) http.Handler {
	return a.RequireAuth(Chain(h, mw...))
}
