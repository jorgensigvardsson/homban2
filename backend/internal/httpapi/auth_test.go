package httpapi_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/jorgensigvardsson/homban2/backend/internal/auth"
	"github.com/jorgensigvardsson/homban2/backend/internal/httpapi"
	"github.com/jorgensigvardsson/homban2/backend/internal/store"
)

const (
	testCookieName = "homban_session"
	testSecret     = "test-secret-that-is-long-enough-to-pass"
)

// codeCatcher stands in for the mail sender and keeps the last code.
type codeCatcher struct{ code string }

func (c *codeCatcher) SendSignInCode(_ context.Context, _, code string, _ time.Duration) error {
	c.code = code
	return nil
}

func newAuthHandler(t *testing.T) (http.Handler, *codeCatcher) {
	t.Helper()

	tokens, err := auth.NewTokenService(auth.TokenConfig{
		Secret:   testSecret,
		Issuer:   "homban",
		Audience: "homban-web",
		TTL:      time.Hour,
	})
	if err != nil {
		t.Fatalf("NewTokenService: %v", err)
	}

	catcher := &codeCatcher{}
	service, err := auth.NewService(auth.NewMemoryCodeStore(), catcher, tokens, auth.ServiceConfig{
		CodeLength:  6,
		CodeTTL:     10 * time.Minute,
		MaxAttempts: 5,
		ResendAfter: time.Minute,
		HashSecret:  testSecret,
	}, nil)
	if err != nil {
		t.Fatalf("NewService: %v", err)
	}

	handler := httpapi.New(httpapi.Deps{
		Store:        store.NewMemory(),
		Auth:         service,
		Version:      "test",
		Env:          "test",
		CookieName:   testCookieName,
		CookieSecure: true,
		CodeLength:   6,
		MailToStdout: true,
	})
	return handler, catcher
}

func postJSON(t *testing.T, handler http.Handler, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	return rec
}

func sessionCookie(t *testing.T, rec *httptest.ResponseRecorder) *http.Cookie {
	t.Helper()
	for _, c := range rec.Result().Cookies() {
		if c.Name == testCookieName {
			return c
		}
	}
	t.Fatalf("no %s cookie in response", testCookieName)
	return nil
}

func TestSignInSetsHardenedCookieAndGrantsAccess(t *testing.T) {
	handler, catcher := newAuthHandler(t)

	rec := postJSON(t, handler, "/api/v1/auth/request-code", `{"email":"user@example.com"}`)
	if rec.Code != http.StatusAccepted {
		t.Fatalf("request-code status = %d, want %d (%s)", rec.Code, http.StatusAccepted, rec.Body)
	}
	// The response must never carry the code itself.
	if strings.Contains(rec.Body.String(), catcher.code) {
		t.Error("response body leaks the sign-in code")
	}

	rec = postJSON(t, handler, "/api/v1/auth/verify-code",
		`{"email":"user@example.com","code":"`+catcher.code+`"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("verify-code status = %d, want %d (%s)", rec.Code, http.StatusOK, rec.Body)
	}

	cookie := sessionCookie(t, rec)
	if !cookie.HttpOnly {
		t.Error("session cookie is not HttpOnly")
	}
	if !cookie.Secure {
		t.Error("session cookie is not Secure")
	}
	if cookie.SameSite != http.SameSiteLaxMode {
		t.Errorf("SameSite = %v, want Lax", cookie.SameSite)
	}
	if cookie.Path != "/" {
		t.Errorf("Path = %q, want /", cookie.Path)
	}
	// The token may only travel in the HttpOnly cookie, never in the body,
	// or a script could read it.
	if strings.Contains(rec.Body.String(), cookie.Value) {
		t.Error("response body leaks the session token")
	}

	// The cookie now unlocks the protected endpoint.
	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
	req.AddCookie(cookie)
	meRec := httptest.NewRecorder()
	handler.ServeHTTP(meRec, req)
	if meRec.Code != http.StatusOK {
		t.Fatalf("me status = %d, want %d (%s)", meRec.Code, http.StatusOK, meRec.Body)
	}

	var me struct {
		Email string `json:"email"`
		Role  string `json:"role"`
	}
	if err := json.Unmarshal(meRec.Body.Bytes(), &me); err != nil {
		t.Fatalf("decode me: %v", err)
	}
	if me.Email != "user@example.com" {
		t.Errorf("email = %q", me.Email)
	}
	if me.Role != "admin" {
		t.Errorf("role = %q, want admin", me.Role)
	}
}

func TestProtectedEndpointRejectsMissingAndBogusCookies(t *testing.T) {
	handler, _ := newAuthHandler(t)

	cases := map[string]*http.Cookie{
		"no cookie":   nil,
		"empty value": {Name: testCookieName, Value: ""},
		"not a jwt":   {Name: testCookieName, Value: "garbage"},
		"forged signature": {Name: testCookieName, Value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
			"eyJzdWIiOiJhdHRhY2tlckBleGFtcGxlLmNvbSIsInJvbGUiOiJhZG1pbiJ9.bm90LWEtcmVhbC1zaWduYXR1cmU"},
	}

	for name, cookie := range cases {
		t.Run(name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
			if cookie != nil {
				req.AddCookie(cookie)
			}
			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, req)

			if rec.Code != http.StatusUnauthorized {
				t.Fatalf("status = %d, want %d", rec.Code, http.StatusUnauthorized)
			}
			var body httpapi.ErrorBody
			if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
				t.Fatalf("decode body: %v", err)
			}
			if body.Error.Code != "unauthenticated" {
				t.Errorf("code = %q, want unauthenticated", body.Error.Code)
			}
		})
	}
}

func TestVerifyCodeRejectsWrongCode(t *testing.T) {
	handler, catcher := newAuthHandler(t)

	if rec := postJSON(t, handler, "/api/v1/auth/request-code", `{"email":"user@example.com"}`); rec.Code != http.StatusAccepted {
		t.Fatalf("request-code status = %d", rec.Code)
	}
	wrong := "999999"
	if catcher.code == wrong {
		wrong = "111111"
	}

	rec := postJSON(t, handler, "/api/v1/auth/verify-code",
		`{"email":"user@example.com","code":"`+wrong+`"}`)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusUnauthorized)
	}
	for _, c := range rec.Result().Cookies() {
		if c.Name == testCookieName && c.Value != "" {
			t.Error("a failed verification handed out a session cookie")
		}
	}
}

func TestCodeIsSingleUse(t *testing.T) {
	handler, catcher := newAuthHandler(t)

	postJSON(t, handler, "/api/v1/auth/request-code", `{"email":"user@example.com"}`)
	body := `{"email":"user@example.com","code":"` + catcher.code + `"}`

	if rec := postJSON(t, handler, "/api/v1/auth/verify-code", body); rec.Code != http.StatusOK {
		t.Fatalf("first verify status = %d", rec.Code)
	}
	if rec := postJSON(t, handler, "/api/v1/auth/verify-code", body); rec.Code != http.StatusUnauthorized {
		t.Fatalf("replayed verify status = %d, want %d", rec.Code, http.StatusUnauthorized)
	}
}

func TestRequestCodeEnforcesCooldown(t *testing.T) {
	handler, _ := newAuthHandler(t)

	if rec := postJSON(t, handler, "/api/v1/auth/request-code", `{"email":"user@example.com"}`); rec.Code != http.StatusAccepted {
		t.Fatalf("first status = %d", rec.Code)
	}
	rec := postJSON(t, handler, "/api/v1/auth/request-code", `{"email":"user@example.com"}`)
	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf("second status = %d, want %d", rec.Code, http.StatusTooManyRequests)
	}
}

func TestRequestCodeRejectsInvalidEmail(t *testing.T) {
	handler, _ := newAuthHandler(t)

	rec := postJSON(t, handler, "/api/v1/auth/request-code", `{"email":"nope"}`)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusBadRequest)
	}
}

func TestRequestCodeRejectsUnknownFields(t *testing.T) {
	handler, _ := newAuthHandler(t)

	// A client must not be able to smuggle extra fields such as a role.
	rec := postJSON(t, handler, "/api/v1/auth/request-code",
		`{"email":"user@example.com","role":"admin"}`)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusBadRequest)
	}
}

func TestLogoutClearsCookieAndWorksWithoutSession(t *testing.T) {
	handler, _ := newAuthHandler(t)

	rec := postJSON(t, handler, "/api/v1/auth/logout", "")
	if rec.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusNoContent)
	}
	cookie := sessionCookie(t, rec)
	if cookie.Value != "" {
		t.Errorf("cookie value = %q, want empty", cookie.Value)
	}
	if cookie.MaxAge >= 0 {
		t.Errorf("MaxAge = %d, want negative so the browser drops it", cookie.MaxAge)
	}
}
