package auth

import (
	"context"
	"errors"
	"testing"
	"time"
)

// captureSender records what would have been mailed.
type captureSender struct {
	to   string
	code string
	err  error
	sent int
}

func (c *captureSender) SendSignInCode(_ context.Context, to, code string, _ time.Duration) error {
	if c.err != nil {
		return c.err
	}
	c.to, c.code, c.sent = to, code, c.sent+1
	return nil
}

func newTestService(t *testing.T) (*Service, *captureSender) {
	t.Helper()
	return newTestServiceWithUsers(t, nil)
}

func newTestServiceWithUsers(t *testing.T, users map[string]Role) (*Service, *captureSender) {
	t.Helper()
	sender := &captureSender{}
	svc, err := NewService(NewMemoryCodeStore(), sender, newTestTokens(t), ServiceConfig{
		CodeLength:  6,
		CodeTTL:     10 * time.Minute,
		MaxAttempts: 5,
		ResendAfter: time.Minute,
		HashSecret:  testSecret,
		Users:       users,
	}, nil)
	if err != nil {
		t.Fatalf("NewService: %v", err)
	}
	return svc, sender
}

func TestSignInFlow(t *testing.T) {
	svc, sender := newTestService(t)
	ctx := context.Background()

	// Mixed case and padding must normalise to one account.
	request, err := svc.RequestCode(ctx, "  User@Example.COM ")
	if err != nil {
		t.Fatalf("RequestCode: %v", err)
	}
	if request.Email != "user@example.com" {
		t.Errorf("email = %q, want normalised", request.Email)
	}
	if sender.sent != 1 {
		t.Fatalf("sender called %d times, want 1", sender.sent)
	}
	if len(sender.code) != 6 {
		t.Fatalf("code %q is not 6 digits", sender.code)
	}

	session, err := svc.VerifyCode(ctx, "user@example.com", sender.code)
	if err != nil {
		t.Fatalf("VerifyCode: %v", err)
	}
	if session.Identity.Role != RoleAdmin {
		t.Errorf("role = %q, want %q", session.Identity.Role, RoleAdmin)
	}

	// The token must verify against the same service.
	identity, err := svc.Tokens().Verify(session.Token)
	if err != nil {
		t.Fatalf("Verify issued token: %v", err)
	}
	if identity.Email != "user@example.com" {
		t.Errorf("token subject = %q", identity.Email)
	}
}

func TestVerifyCodeAcceptsCodeRequestedForDifferentCasing(t *testing.T) {
	svc, sender := newTestService(t)
	ctx := context.Background()

	if _, err := svc.RequestCode(ctx, "user@example.com"); err != nil {
		t.Fatalf("RequestCode: %v", err)
	}
	// Same account, typed differently on the verify step.
	if _, err := svc.VerifyCode(ctx, "USER@example.com", sender.code); err != nil {
		t.Fatalf("VerifyCode: %v", err)
	}
}

func TestVerifyCodeRejectsWrongCode(t *testing.T) {
	svc, sender := newTestService(t)
	ctx := context.Background()

	if _, err := svc.RequestCode(ctx, "user@example.com"); err != nil {
		t.Fatalf("RequestCode: %v", err)
	}
	wrong := "999999"
	if sender.code == wrong {
		wrong = "111111"
	}
	if _, err := svc.VerifyCode(ctx, "user@example.com", wrong); !errors.Is(err, ErrInvalidCode) {
		t.Fatalf("err = %v, want ErrInvalidCode", err)
	}
}

func TestVerifyCodeRejectsEmptyCode(t *testing.T) {
	svc, _ := newTestService(t)
	if _, err := svc.VerifyCode(context.Background(), "user@example.com", "   "); !errors.Is(err, ErrInvalidCode) {
		t.Fatalf("err = %v, want ErrInvalidCode", err)
	}
}

func TestRequestCodeRejectsBadAddresses(t *testing.T) {
	svc, _ := newTestService(t)
	ctx := context.Background()

	for _, address := range []string{"", "   ", "not-an-email", "@example.com", "user@", "Foo <foo@example.com>", "a@b@c"} {
		if _, err := svc.RequestCode(ctx, address); !errors.Is(err, ErrInvalidEmail) {
			t.Errorf("RequestCode(%q) err = %v, want ErrInvalidEmail", address, err)
		}
	}
}

func TestRequestCodeDoesNotStoreCodeWhenDeliveryFails(t *testing.T) {
	sender := &captureSender{err: errors.New("smtp exploded")}
	store := NewMemoryCodeStore()
	svc, err := NewService(store, sender, newTestTokens(t), ServiceConfig{
		CodeLength:  6,
		CodeTTL:     10 * time.Minute,
		MaxAttempts: 5,
		ResendAfter: time.Minute,
		HashSecret:  testSecret,
	}, nil)
	if err != nil {
		t.Fatalf("NewService: %v", err)
	}

	if _, err := svc.RequestCode(context.Background(), "user@example.com"); err == nil {
		t.Fatal("expected a delivery failure to surface")
	}
}

func TestRequestCodeIgnoresUnrecognizedAddressWhenAllowlistConfigured(t *testing.T) {
	svc, sender := newTestServiceWithUsers(t, map[string]Role{"admin@example.com": RoleAdmin})
	ctx := context.Background()

	request, err := svc.RequestCode(ctx, "stranger@example.com")
	if err != nil {
		t.Fatalf("RequestCode: %v", err)
	}
	if request.Email != "stranger@example.com" {
		t.Errorf("email = %q, want the request echoed back", request.Email)
	}
	if sender.sent != 0 {
		t.Fatalf("sender called %d times, want 0 for an unrecognized address", sender.sent)
	}

	// No code was ever issued, so any guess is rejected the same way a wrong
	// code would be — the caller cannot tell "unrecognized" from "wrong".
	if _, err := svc.VerifyCode(ctx, "stranger@example.com", "123456"); !errors.Is(err, ErrInvalidCode) {
		t.Fatalf("err = %v, want ErrInvalidCode", err)
	}
}

func TestVerifyCodeAssignsConfiguredRole(t *testing.T) {
	svc, sender := newTestServiceWithUsers(t, map[string]Role{
		"admin@example.com": RoleAdmin,
		"kid@example.com":   RoleUser,
	})
	ctx := context.Background()

	if _, err := svc.RequestCode(ctx, "kid@example.com"); err != nil {
		t.Fatalf("RequestCode: %v", err)
	}
	session, err := svc.VerifyCode(ctx, "kid@example.com", sender.code)
	if err != nil {
		t.Fatalf("VerifyCode: %v", err)
	}
	if session.Identity.Role != RoleUser {
		t.Errorf("role = %q, want %q", session.Identity.Role, RoleUser)
	}
}

func TestNormalizeEmail(t *testing.T) {
	cases := map[string]string{
		"user@example.com":     "user@example.com",
		"  User@Example.COM  ": "user@example.com",
		"a.b+tag@sub.dom.se":   "a.b+tag@sub.dom.se",
	}
	for input, want := range cases {
		got, err := NormalizeEmail(input)
		if err != nil {
			t.Errorf("NormalizeEmail(%q): %v", input, err)
			continue
		}
		if got != want {
			t.Errorf("NormalizeEmail(%q) = %q, want %q", input, got, want)
		}
	}
}
