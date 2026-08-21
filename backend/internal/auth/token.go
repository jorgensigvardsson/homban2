// Package auth implements passwordless sign-in: a one-time code is mailed to
// the user, and exchanging it for a signed JWT establishes a session.
package auth

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Role is a coarse permission level carried in the token.
//
// Extend this as the app grows. Keep the values stable: they are baked into
// tokens that stay valid until they expire.
type Role string

const (
	// RoleAdmin can do everything. Every user gets this for now.
	RoleAdmin Role = "admin"
)

// Valid reports whether r is a role this build knows about.
func (r Role) Valid() bool {
	return r == RoleAdmin
}

// Identity is the authenticated caller, as recovered from a token.
type Identity struct {
	// Email is the address that proved ownership of a sign-in code.
	Email string
	Role  Role
}

// Claims is the JWT payload: the registered claims plus our own.
type Claims struct {
	jwt.RegisteredClaims
	Role Role `json:"role"`
}

// signingMethod is fixed at HS256 and never read from the token itself.
// Accepting the token's own "alg" is the classic JWT vulnerability.
var signingMethod = jwt.SigningMethodHS256

// TokenService issues and verifies session tokens.
//
// It signs with a symmetric secret because one service both issues and
// verifies. If another service ever needs to verify tokens without being able
// to mint them, switch to asymmetric signing (EdDSA) and publish a JWKS.
type TokenService struct {
	secret   []byte
	issuer   string
	audience string
	ttl      time.Duration
	now      func() time.Time
}

// TokenConfig configures a TokenService.
type TokenConfig struct {
	// Secret must be at least MinSecretLength bytes.
	Secret string
	// Issuer and Audience are checked on every verification.
	Issuer   string
	Audience string
	// TTL is how long an issued token stays valid.
	TTL time.Duration
}

// MinSecretLength is the shortest accepted signing secret. HS256 keys shorter
// than the hash output weaken the signature.
const MinSecretLength = 32

// NewTokenService validates the configuration and returns a ready service.
func NewTokenService(cfg TokenConfig) (*TokenService, error) {
	if len(cfg.Secret) < MinSecretLength {
		return nil, fmt.Errorf("jwt secret must be at least %d characters, got %d", MinSecretLength, len(cfg.Secret))
	}
	if cfg.Issuer == "" || cfg.Audience == "" {
		return nil, errors.New("jwt issuer and audience are required")
	}
	if cfg.TTL <= 0 {
		return nil, errors.New("jwt ttl must be positive")
	}
	return &TokenService{
		secret:   []byte(cfg.Secret),
		issuer:   cfg.Issuer,
		audience: cfg.Audience,
		ttl:      cfg.TTL,
		now:      time.Now,
	}, nil
}

// TTL is how long newly issued tokens live. The cookie uses the same value.
func (s *TokenService) TTL() time.Duration { return s.ttl }

// Issue mints a signed token for the given identity.
func (s *TokenService) Issue(id Identity) (string, time.Time, error) {
	if id.Email == "" {
		return "", time.Time{}, errors.New("identity email is required")
	}
	if !id.Role.Valid() {
		return "", time.Time{}, fmt.Errorf("unknown role %q", id.Role)
	}

	now := s.now()
	expiresAt := now.Add(s.ttl)

	jti, err := randomID()
	if err != nil {
		return "", time.Time{}, err
	}

	claims := Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   id.Email,
			Issuer:    s.issuer,
			Audience:  jwt.ClaimStrings{s.audience},
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			// A unique id per token, so individual sessions can be revoked
			// once there is somewhere to keep a deny list.
			ID: jti,
		},
		Role: id.Role,
	}

	signed, err := jwt.NewWithClaims(signingMethod, claims).SignedString(s.secret)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("sign token: %w", err)
	}
	return signed, expiresAt, nil
}

// ErrInvalidToken is returned for every verification failure. The caller only
// needs to know the token is unusable, never why.
var ErrInvalidToken = errors.New("invalid token")

// Verify checks the signature and the registered claims, and returns the
// identity the token asserts.
func (s *TokenService) Verify(raw string) (Identity, error) {
	claims := &Claims{}

	_, err := jwt.ParseWithClaims(strings.TrimSpace(raw), claims,
		func(*jwt.Token) (any, error) { return s.secret, nil },
		// Pin the algorithm: without this, a token could ask to be verified
		// with "none" or with an asymmetric method.
		jwt.WithValidMethods([]string{signingMethod.Alg()}),
		jwt.WithIssuer(s.issuer),
		jwt.WithAudience(s.audience),
		jwt.WithExpirationRequired(),
		// Small allowance for clock drift between issuer and verifier.
		jwt.WithLeeway(30*time.Second),
		jwt.WithTimeFunc(s.now),
	)
	if err != nil {
		return Identity{}, fmt.Errorf("%w: %w", ErrInvalidToken, err)
	}

	if claims.Subject == "" {
		return Identity{}, fmt.Errorf("%w: missing subject", ErrInvalidToken)
	}
	if !claims.Role.Valid() {
		// A role this build does not know about: refuse rather than guess.
		return Identity{}, fmt.Errorf("%w: unknown role %q", ErrInvalidToken, claims.Role)
	}

	return Identity{Email: claims.Subject, Role: claims.Role}, nil
}

func randomID() (string, error) {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "", fmt.Errorf("generate token id: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(b[:]), nil
}
