package auth

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"strings"
	"testing"
	"time"
)

const testSecret = "test-secret-that-is-long-enough-to-pass"

func newTestTokens(t *testing.T) *TokenService {
	t.Helper()
	svc, err := NewTokenService(TokenConfig{
		Secret:   testSecret,
		Issuer:   "homban",
		Audience: "homban-web",
		TTL:      time.Hour,
	})
	if err != nil {
		t.Fatalf("NewTokenService: %v", err)
	}
	return svc
}

func TestIssueThenVerifyRoundTrip(t *testing.T) {
	svc := newTestTokens(t)

	token, expiresAt, err := svc.Issue(Identity{Email: "user@example.com", Role: RoleAdmin})
	if err != nil {
		t.Fatalf("Issue: %v", err)
	}
	if time.Until(expiresAt) > time.Hour+time.Second {
		t.Errorf("expiry %v is beyond the configured TTL", expiresAt)
	}

	got, err := svc.Verify(token)
	if err != nil {
		t.Fatalf("Verify: %v", err)
	}
	if got.Email != "user@example.com" {
		t.Errorf("email = %q, want %q", got.Email, "user@example.com")
	}
	if got.Role != RoleAdmin {
		t.Errorf("role = %q, want %q", got.Role, RoleAdmin)
	}
}

func TestVerifyRejectsShortSecret(t *testing.T) {
	if _, err := NewTokenService(TokenConfig{Secret: "too-short", Issuer: "i", Audience: "a", TTL: time.Hour}); err == nil {
		t.Fatal("expected a short secret to be rejected")
	}
}

func TestVerifyRejectsTamperedPayload(t *testing.T) {
	svc := newTestTokens(t)
	token, _, err := svc.Issue(Identity{Email: "user@example.com", Role: RoleAdmin})
	if err != nil {
		t.Fatalf("Issue: %v", err)
	}

	// Rewrite the role claim, keeping the original signature.
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		t.Fatalf("expected 3 token segments, got %d", len(parts))
	}
	raw, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		t.Fatalf("decode payload: %v", err)
	}
	var claims map[string]any
	if err := json.Unmarshal(raw, &claims); err != nil {
		t.Fatalf("unmarshal payload: %v", err)
	}
	claims["sub"] = "attacker@example.com"
	rewritten, err := json.Marshal(claims)
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}
	parts[1] = base64.RawURLEncoding.EncodeToString(rewritten)

	if _, err := svc.Verify(strings.Join(parts, ".")); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("err = %v, want ErrInvalidToken", err)
	}
}

func TestVerifyRejectsUnsignedToken(t *testing.T) {
	svc := newTestTokens(t)

	// The classic attack: alg "none" with no signature at all.
	header := base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"none","typ":"JWT"}`))
	payload := base64.RawURLEncoding.EncodeToString([]byte(
		`{"sub":"attacker@example.com","role":"admin","iss":"homban","aud":"homban-web","exp":99999999999}`))

	if _, err := svc.Verify(header + "." + payload + "."); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("err = %v, want ErrInvalidToken", err)
	}
}

func TestVerifyRejectsForeignSigner(t *testing.T) {
	mine := newTestTokens(t)
	theirs, err := NewTokenService(TokenConfig{
		Secret:   "a-completely-different-secret-value-here",
		Issuer:   "homban",
		Audience: "homban-web",
		TTL:      time.Hour,
	})
	if err != nil {
		t.Fatalf("NewTokenService: %v", err)
	}

	token, _, err := theirs.Issue(Identity{Email: "user@example.com", Role: RoleAdmin})
	if err != nil {
		t.Fatalf("Issue: %v", err)
	}
	if _, err := mine.Verify(token); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("err = %v, want ErrInvalidToken", err)
	}
}

func TestVerifyRejectsWrongAudience(t *testing.T) {
	issuer := newTestTokens(t)
	other, err := NewTokenService(TokenConfig{
		Secret:   testSecret,
		Issuer:   "homban",
		Audience: "some-other-app",
		TTL:      time.Hour,
	})
	if err != nil {
		t.Fatalf("NewTokenService: %v", err)
	}

	token, _, err := issuer.Issue(Identity{Email: "user@example.com", Role: RoleAdmin})
	if err != nil {
		t.Fatalf("Issue: %v", err)
	}
	if _, err := other.Verify(token); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("err = %v, want ErrInvalidToken", err)
	}
}

func TestVerifyRejectsExpiredToken(t *testing.T) {
	svc := newTestTokens(t)

	base := time.Now()
	svc.now = func() time.Time { return base }
	token, _, err := svc.Issue(Identity{Email: "user@example.com", Role: RoleAdmin})
	if err != nil {
		t.Fatalf("Issue: %v", err)
	}

	// Past the one hour TTL, and past the 30s clock-drift leeway.
	svc.now = func() time.Time { return base.Add(time.Hour + time.Minute) }

	if _, err := svc.Verify(token); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("err = %v, want ErrInvalidToken", err)
	}
}

func TestIssueRejectsUnknownRole(t *testing.T) {
	svc := newTestTokens(t)
	if _, _, err := svc.Issue(Identity{Email: "user@example.com", Role: Role("wizard")}); err == nil {
		t.Fatal("expected an unknown role to be rejected")
	}
}
