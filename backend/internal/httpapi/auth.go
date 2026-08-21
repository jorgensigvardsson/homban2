package httpapi

import (
	"errors"
	"net/http"
	"time"

	"github.com/jorgensigvardsson/homban2/backend/internal/auth"
)

// requestCodeRequest is the body of POST /api/v1/auth/request-code.
type requestCodeRequest struct {
	Email string `json:"email"`
}

// requestCodeResponse tells the UI when the code dies and when it may ask for
// a new one. It never contains the code.
type requestCodeResponse struct {
	Email             string    `json:"email"`
	ExpiresAt         time.Time `json:"expiresAt"`
	ResendAfterSecs   int       `json:"resendAfterSeconds"`
	CodeLength        int       `json:"codeLength"`
	DeliveredToStdout bool      `json:"deliveredToStdout"`
}

// handleRequestCode mails a one-time sign-in code to the given address.
func (a *API) handleRequestCode(w http.ResponseWriter, r *http.Request) {
	var body requestCodeRequest
	if err := Decode(w, r, &body); err != nil {
		Error(w, r, http.StatusBadRequest, "invalid_body", "Expected a JSON object with an \"email\" field.")
		return
	}

	result, err := a.deps.Auth.RequestCode(r.Context(), body.Email)
	switch {
	case errors.Is(err, auth.ErrInvalidEmail):
		Error(w, r, http.StatusBadRequest, "invalid_email", "That does not look like an email address.")
		return
	case errors.Is(err, auth.ErrTooSoon):
		// Deliberately vague about the remaining wait: the UI already knows
		// the cooldown from the previous response.
		Error(w, r, http.StatusTooManyRequests, "too_soon", "A code was already sent. Check your inbox before asking for another.")
		return
	case err != nil:
		LoggerFrom(r.Context()).Error("request sign-in code", "err", err)
		Error(w, r, http.StatusInternalServerError, "internal_error", "Could not send the sign-in code.")
		return
	}

	JSON(w, r, http.StatusAccepted, requestCodeResponse{
		Email:             result.Email,
		ExpiresAt:         result.ExpiresAt,
		ResendAfterSecs:   int(result.ResendAfter.Seconds()),
		CodeLength:        a.deps.CodeLength,
		DeliveredToStdout: a.deps.MailToStdout,
	})
}

// verifyCodeRequest is the body of POST /api/v1/auth/verify-code.
type verifyCodeRequest struct {
	Email string `json:"email"`
	Code  string `json:"code"`
}

// handleVerifyCode redeems a code and sets the session cookie.
func (a *API) handleVerifyCode(w http.ResponseWriter, r *http.Request) {
	var body verifyCodeRequest
	if err := Decode(w, r, &body); err != nil {
		Error(w, r, http.StatusBadRequest, "invalid_body", "Expected a JSON object with \"email\" and \"code\" fields.")
		return
	}

	session, err := a.deps.Auth.VerifyCode(r.Context(), body.Email, body.Code)
	switch {
	case errors.Is(err, auth.ErrInvalidEmail):
		Error(w, r, http.StatusBadRequest, "invalid_email", "That does not look like an email address.")
		return
	case errors.Is(err, auth.ErrTooManyAttempts):
		Error(w, r, http.StatusTooManyRequests, "too_many_attempts", "Too many wrong codes. Request a new one.")
		return
	case errors.Is(err, auth.ErrInvalidCode):
		Error(w, r, http.StatusUnauthorized, "invalid_code", "That code is wrong or has expired.")
		return
	case err != nil:
		LoggerFrom(r.Context()).Error("verify sign-in code", "err", err)
		Error(w, r, http.StatusInternalServerError, "internal_error", "Could not complete sign-in.")
		return
	}

	a.setSessionCookie(w, session.Token, session.ExpiresAt)
	JSON(w, r, http.StatusOK, identityResponse{
		Email:     session.Identity.Email,
		Role:      string(session.Identity.Role),
		ExpiresAt: session.ExpiresAt,
	})
}

// identityResponse describes the signed-in user to the frontend.
type identityResponse struct {
	Email     string    `json:"email"`
	Role      string    `json:"role"`
	ExpiresAt time.Time `json:"expiresAt,omitzero"`
}

// handleMe returns the caller's identity. Behind RequireAuth, so reaching the
// handler at all means the cookie was valid.
func (a *API) handleMe(w http.ResponseWriter, r *http.Request) {
	id, ok := IdentityFrom(r.Context())
	if !ok {
		// Unreachable behind RequireAuth; treated as a bug, not a 401.
		Error(w, r, http.StatusInternalServerError, "internal_error", "Missing identity.")
		return
	}
	JSON(w, r, http.StatusOK, identityResponse{Email: id.Email, Role: string(id.Role)})
}

// handleLogout clears the session cookie. It succeeds even without a valid
// session, so signing out is always possible.
func (a *API) handleLogout(w http.ResponseWriter, r *http.Request) {
	a.clearSessionCookie(w)
	JSON(w, r, http.StatusNoContent, nil)
}

// setSessionCookie writes the session token as a hardened cookie.
//
// HttpOnly keeps it away from JavaScript, so an XSS bug cannot read the token.
// Secure keeps it off plaintext connections. SameSite=Lax stops other sites
// from driving state-changing requests with the user's cookie attached, while
// still surviving a normal link into the app.
func (a *API) setSessionCookie(w http.ResponseWriter, token string, expiresAt time.Time) {
	http.SetCookie(w, &http.Cookie{
		Name:     a.deps.CookieName,
		Value:    token,
		Path:     "/",
		Expires:  expiresAt,
		MaxAge:   int(time.Until(expiresAt).Seconds()),
		HttpOnly: true,
		Secure:   a.deps.CookieSecure,
		SameSite: http.SameSiteLaxMode,
	})
}

// clearSessionCookie expires the cookie. The attributes must match the ones
// used when setting it, or the browser keeps the original.
func (a *API) clearSessionCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     a.deps.CookieName,
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(0, 0),
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   a.deps.CookieSecure,
		SameSite: http.SameSiteLaxMode,
	})
}
