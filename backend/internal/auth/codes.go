package auth

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"sync"
	"time"
)

// Errors returned when redeeming or requesting a sign-in code.
var (
	// ErrInvalidCode covers wrong, unknown and expired codes alike. Callers
	// must not distinguish them: doing so tells an attacker which addresses
	// have a code outstanding.
	ErrInvalidCode = errors.New("invalid or expired sign-in code")
	// ErrTooManyAttempts means the code was guessed at too often and is now
	// discarded. The user has to request a new one.
	ErrTooManyAttempts = errors.New("too many attempts")
	// ErrTooSoon means a code was requested again before the cooldown elapsed.
	ErrTooSoon = errors.New("a code was already sent recently")
)

// CodeStore keeps outstanding sign-in codes.
//
// Both operations are atomic per key, because the attempt counter is a security
// control: a read-modify-write from the caller would let concurrent requests
// slip past the limit.
type CodeStore interface {
	// Issue records a new code hash for key, replacing any previous one.
	// It returns ErrTooSoon if the previous code for key is younger than
	// resendAfter.
	Issue(ctx context.Context, key string, hash []byte, now time.Time, ttl, resendAfter time.Duration) error

	// Consume checks hash against the stored code for key. On success the
	// record is removed, so a code works exactly once. On failure it returns
	// ErrInvalidCode, or ErrTooManyAttempts once maxAttempts is reached.
	Consume(ctx context.Context, key string, hash []byte, now time.Time, maxAttempts int) error
}

// MemoryCodeStore keeps codes in process memory.
//
// Good enough for local development and a single instance. Before scaling to
// more than one replica in Azure this has to move to shared storage (Redis, or
// Cosmos with a TTL on the container), otherwise a user's code lands on one
// replica and the verification request on another.
type MemoryCodeStore struct {
	mu      sync.Mutex
	records map[string]*codeRecord
}

type codeRecord struct {
	hash      []byte
	issuedAt  time.Time
	expiresAt time.Time
	attempts  int
}

// NewMemoryCodeStore returns an empty store.
func NewMemoryCodeStore() *MemoryCodeStore {
	return &MemoryCodeStore{records: make(map[string]*codeRecord)}
}

// Issue implements CodeStore.
func (s *MemoryCodeStore) Issue(_ context.Context, key string, hash []byte, now time.Time, ttl, resendAfter time.Duration) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.purgeExpiredLocked(now)

	if existing, ok := s.records[key]; ok {
		if now.Sub(existing.issuedAt) < resendAfter {
			return ErrTooSoon
		}
	}

	s.records[key] = &codeRecord{
		hash:      hash,
		issuedAt:  now,
		expiresAt: now.Add(ttl),
	}
	return nil
}

// Consume implements CodeStore.
func (s *MemoryCodeStore) Consume(_ context.Context, key string, hash []byte, now time.Time, maxAttempts int) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	rec, ok := s.records[key]
	if !ok {
		return ErrInvalidCode
	}
	if now.After(rec.expiresAt) {
		delete(s.records, key)
		return ErrInvalidCode
	}

	// Compare in constant time so the response cannot leak the code.
	if !hmac.Equal(rec.hash, hash) {
		rec.attempts++
		if rec.attempts >= maxAttempts {
			delete(s.records, key)
			return ErrTooManyAttempts
		}
		return ErrInvalidCode
	}

	// A code is single-use.
	delete(s.records, key)
	return nil
}

// Len reports the number of outstanding codes. Intended for tests and metrics.
func (s *MemoryCodeStore) Len() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return len(s.records)
}

func (s *MemoryCodeStore) purgeExpiredLocked(now time.Time) {
	for key, rec := range s.records {
		if now.After(rec.expiresAt) {
			delete(s.records, key)
		}
	}
}

var _ CodeStore = (*MemoryCodeStore)(nil)

// generateCode returns a numeric code of the requested length, drawn from a
// cryptographically secure source with no modulo bias.
func generateCode(length int) (string, error) {
	if length < 4 || length > 12 {
		return "", fmt.Errorf("code length must be between 4 and 12, got %d", length)
	}

	digits := make([]byte, length)
	for i := range digits {
		n, err := rand.Int(rand.Reader, big.NewInt(10))
		if err != nil {
			return "", fmt.Errorf("generate code: %w", err)
		}
		digits[i] = byte('0' + n.Int64())
	}
	return string(digits), nil
}

// hashCode binds the code to the address it was issued for and keys the digest
// with the server secret, so stored values are useless on their own.
//
// The real defence against guessing a 6-digit code is the attempt limit plus
// the short lifetime, not the hash.
func hashCode(secret []byte, key, code string) []byte {
	mac := hmac.New(sha256.New, secret)
	mac.Write([]byte(key))
	mac.Write([]byte{0})
	mac.Write([]byte(strings.TrimSpace(code)))
	return mac.Sum(nil)
}
