package auth

import (
	"context"
	"errors"
	"testing"
	"time"
)

func TestGenerateCodeShape(t *testing.T) {
	for range 50 {
		code, err := generateCode(6)
		if err != nil {
			t.Fatalf("generateCode: %v", err)
		}
		if len(code) != 6 {
			t.Fatalf("len(%q) = %d, want 6", code, len(code))
		}
		for _, r := range code {
			if r < '0' || r > '9' {
				t.Fatalf("code %q contains a non-digit", code)
			}
		}
	}
}

func TestGenerateCodeRejectsSillyLengths(t *testing.T) {
	for _, length := range []int{0, 3, 13} {
		if _, err := generateCode(length); err == nil {
			t.Errorf("length %d: expected an error", length)
		}
	}
}

func TestConsumeSucceedsOnceOnly(t *testing.T) {
	store := NewMemoryCodeStore()
	ctx := context.Background()
	now := time.Now()
	digest := hashCode([]byte("secret"), "user@example.com", "123456")

	if err := store.Issue(ctx, "user@example.com", digest, now, 10*time.Minute, time.Minute); err != nil {
		t.Fatalf("Issue: %v", err)
	}
	if err := store.Consume(ctx, "user@example.com", digest, now, 5); err != nil {
		t.Fatalf("Consume: %v", err)
	}
	// A code is single-use: replaying it must fail.
	if err := store.Consume(ctx, "user@example.com", digest, now, 5); !errors.Is(err, ErrInvalidCode) {
		t.Fatalf("replay err = %v, want ErrInvalidCode", err)
	}
	if store.Len() != 0 {
		t.Errorf("store still holds %d records", store.Len())
	}
}

func TestConsumeEnforcesAttemptLimit(t *testing.T) {
	store := NewMemoryCodeStore()
	ctx := context.Background()
	now := time.Now()
	good := hashCode([]byte("secret"), "user@example.com", "123456")
	bad := hashCode([]byte("secret"), "user@example.com", "000000")

	if err := store.Issue(ctx, "user@example.com", good, now, 10*time.Minute, time.Minute); err != nil {
		t.Fatalf("Issue: %v", err)
	}

	// Four wrong guesses stay recoverable.
	for i := range 4 {
		if err := store.Consume(ctx, "user@example.com", bad, now, 5); !errors.Is(err, ErrInvalidCode) {
			t.Fatalf("attempt %d: err = %v, want ErrInvalidCode", i+1, err)
		}
	}
	// The fifth voids the code.
	if err := store.Consume(ctx, "user@example.com", bad, now, 5); !errors.Is(err, ErrTooManyAttempts) {
		t.Fatalf("final attempt err = %v, want ErrTooManyAttempts", err)
	}
	// Even the correct code no longer works.
	if err := store.Consume(ctx, "user@example.com", good, now, 5); !errors.Is(err, ErrInvalidCode) {
		t.Fatalf("after lockout err = %v, want ErrInvalidCode", err)
	}
}

func TestConsumeRejectsExpiredCode(t *testing.T) {
	store := NewMemoryCodeStore()
	ctx := context.Background()
	now := time.Now()
	digest := hashCode([]byte("secret"), "user@example.com", "123456")

	if err := store.Issue(ctx, "user@example.com", digest, now, 10*time.Minute, time.Minute); err != nil {
		t.Fatalf("Issue: %v", err)
	}
	later := now.Add(10*time.Minute + time.Second)
	if err := store.Consume(ctx, "user@example.com", digest, later, 5); !errors.Is(err, ErrInvalidCode) {
		t.Fatalf("err = %v, want ErrInvalidCode", err)
	}
}

func TestIssueEnforcesResendCooldown(t *testing.T) {
	store := NewMemoryCodeStore()
	ctx := context.Background()
	now := time.Now()
	digest := hashCode([]byte("secret"), "user@example.com", "123456")

	if err := store.Issue(ctx, "user@example.com", digest, now, 10*time.Minute, time.Minute); err != nil {
		t.Fatalf("first Issue: %v", err)
	}
	if err := store.Issue(ctx, "user@example.com", digest, now.Add(30*time.Second), 10*time.Minute, time.Minute); !errors.Is(err, ErrTooSoon) {
		t.Fatalf("err = %v, want ErrTooSoon", err)
	}
	// Past the cooldown a new code may be issued.
	if err := store.Issue(ctx, "user@example.com", digest, now.Add(2*time.Minute), 10*time.Minute, time.Minute); err != nil {
		t.Fatalf("Issue after cooldown: %v", err)
	}
}

func TestIssuePurgesExpiredRecords(t *testing.T) {
	store := NewMemoryCodeStore()
	ctx := context.Background()
	now := time.Now()
	digest := hashCode([]byte("secret"), "stale@example.com", "123456")

	if err := store.Issue(ctx, "stale@example.com", digest, now, time.Minute, time.Second); err != nil {
		t.Fatalf("Issue: %v", err)
	}
	// A later, unrelated issue sweeps the expired entry.
	if err := store.Issue(ctx, "fresh@example.com", digest, now.Add(time.Hour), time.Minute, time.Second); err != nil {
		t.Fatalf("Issue: %v", err)
	}
	if store.Len() != 1 {
		t.Errorf("store holds %d records, want 1", store.Len())
	}
}

func TestHashCodeBindsToAddress(t *testing.T) {
	secret := []byte("secret")
	// The same code for a different address must not collide.
	if string(hashCode(secret, "a@example.com", "123456")) == string(hashCode(secret, "b@example.com", "123456")) {
		t.Error("digest does not depend on the address")
	}
	// A different secret must produce a different digest.
	if string(hashCode(secret, "a@example.com", "123456")) == string(hashCode([]byte("other"), "a@example.com", "123456")) {
		t.Error("digest does not depend on the secret")
	}
}
