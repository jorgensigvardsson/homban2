package httpapi

import (
	"context"
	"net/http"

	"github.com/jorgensigvardsson/homban2/backend/internal/auth"
)

type identityKey struct{}

// IdentityFrom returns the authenticated caller carried by ctx.
func IdentityFrom(ctx context.Context) (auth.Identity, bool) {
	id, ok := ctx.Value(identityKey{}).(auth.Identity)
	return id, ok
}

// RequireAuth rejects requests without a valid session cookie, and puts the
// caller's identity in the request context for handlers to read.
func (a *API) RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie(a.deps.CookieName)
		if err != nil || cookie.Value == "" {
			unauthorized(w, r)
			return
		}

		identity, err := a.deps.Auth.Tokens().Verify(cookie.Value)
		if err != nil {
			// Expired or tampered-with: drop the cookie so the browser stops
			// sending it, and make the client sign in again.
			a.clearSessionCookie(w)
			LoggerFrom(r.Context()).Debug("rejected session cookie", "err", err)
			unauthorized(w, r)
			return
		}

		ctx := context.WithValue(r.Context(), identityKey{}, identity)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RequireRole rejects callers whose role is not in allowed. It must be applied
// inside RequireAuth, which is what puts the identity in the context.
func (a *API) RequireRole(allowed ...auth.Role) Middleware {
	permitted := make(map[auth.Role]struct{}, len(allowed))
	for _, role := range allowed {
		permitted[role] = struct{}{}
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			identity, ok := IdentityFrom(r.Context())
			if !ok {
				// RequireRole was used without RequireAuth: a wiring bug.
				Error(w, r, http.StatusInternalServerError, "internal_error", "Missing identity.")
				return
			}
			if _, ok := permitted[identity.Role]; !ok {
				Error(w, r, http.StatusForbidden, "forbidden", "Your account may not do that.")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func unauthorized(w http.ResponseWriter, r *http.Request) {
	Error(w, r, http.StatusUnauthorized, "unauthenticated", "Sign in to continue.")
}
