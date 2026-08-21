package auth

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/mail"
	"strings"
	"time"

	"github.com/jorgensigvardsson/homban2/backend/internal/email"
)

// ErrInvalidEmail is returned for an address that cannot be parsed.
var ErrInvalidEmail = errors.New("invalid email address")

// ServiceConfig tunes the sign-in flow.
type ServiceConfig struct {
	// CodeLength is the number of digits in a sign-in code.
	CodeLength int
	// CodeTTL is how long a code stays usable.
	CodeTTL time.Duration
	// MaxAttempts is how often one code may be guessed at before it is voided.
	MaxAttempts int
	// ResendAfter is the cooldown between code requests for one address.
	ResendAfter time.Duration
	// HashSecret keys the stored code digests.
	HashSecret string
}

// Service runs the passwordless sign-in flow.
type Service struct {
	codes  CodeStore
	sender email.Sender
	tokens *TokenService
	cfg    ServiceConfig
	logger *slog.Logger
	now    func() time.Time
}

// NewService wires the flow together.
func NewService(codes CodeStore, sender email.Sender, tokens *TokenService, cfg ServiceConfig, logger *slog.Logger) (*Service, error) {
	switch {
	case codes == nil:
		return nil, errors.New("code store is required")
	case sender == nil:
		return nil, errors.New("email sender is required")
	case tokens == nil:
		return nil, errors.New("token service is required")
	case cfg.CodeTTL <= 0:
		return nil, errors.New("code ttl must be positive")
	case cfg.MaxAttempts <= 0:
		return nil, errors.New("max attempts must be positive")
	case cfg.HashSecret == "":
		return nil, errors.New("hash secret is required")
	}
	if logger == nil {
		logger = slog.Default()
	}
	return &Service{
		codes:  codes,
		sender: sender,
		tokens: tokens,
		cfg:    cfg,
		logger: logger,
		now:    time.Now,
	}, nil
}

// CodeRequest describes an issued code, without revealing the code itself.
type CodeRequest struct {
	// Email is the normalised address the code was sent to.
	Email string
	// ExpiresAt is when the code stops working.
	ExpiresAt time.Time
	// ResendAfter is how long the caller must wait before asking again.
	ResendAfter time.Duration
}

// RequestCode generates a code, stores its digest and mails it out.
//
// Note there is no user directory yet: any syntactically valid address can sign
// in. Once users are stored, look the address up here and return the same
// response whether or not it exists, so the endpoint cannot be used to
// enumerate accounts.
func (s *Service) RequestCode(ctx context.Context, rawEmail string) (CodeRequest, error) {
	address, err := NormalizeEmail(rawEmail)
	if err != nil {
		return CodeRequest{}, err
	}

	code, err := generateCode(s.cfg.CodeLength)
	if err != nil {
		return CodeRequest{}, err
	}

	now := s.now()
	digest := hashCode([]byte(s.cfg.HashSecret), address, code)

	if err := s.codes.Issue(ctx, address, digest, now, s.cfg.CodeTTL, s.cfg.ResendAfter); err != nil {
		return CodeRequest{}, err
	}

	if err := s.sender.SendSignInCode(ctx, address, code, s.cfg.CodeTTL); err != nil {
		// Delivery failed, so the stored code is unusable. Nothing sensitive
		// is logged: the code itself never appears in a log line.
		s.logger.ErrorContext(ctx, "send sign-in code", "err", err)
		return CodeRequest{}, fmt.Errorf("deliver sign-in code: %w", err)
	}

	return CodeRequest{
		Email:       address,
		ExpiresAt:   now.Add(s.cfg.CodeTTL),
		ResendAfter: s.cfg.ResendAfter,
	}, nil
}

// Session is a freshly established session.
type Session struct {
	Token     string
	ExpiresAt time.Time
	Identity  Identity
}

// VerifyCode redeems a code and issues a session token.
func (s *Service) VerifyCode(ctx context.Context, rawEmail, code string) (Session, error) {
	address, err := NormalizeEmail(rawEmail)
	if err != nil {
		return Session{}, err
	}
	code = strings.TrimSpace(code)
	if code == "" {
		return Session{}, ErrInvalidCode
	}

	digest := hashCode([]byte(s.cfg.HashSecret), address, code)
	if err := s.codes.Consume(ctx, address, digest, s.now(), s.cfg.MaxAttempts); err != nil {
		return Session{}, err
	}

	identity := Identity{Email: address, Role: s.roleFor(address)}

	token, expiresAt, err := s.tokens.Issue(identity)
	if err != nil {
		return Session{}, err
	}

	s.logger.InfoContext(ctx, "sign-in succeeded", "email", address, "role", identity.Role)
	return Session{Token: token, ExpiresAt: expiresAt, Identity: identity}, nil
}

// Tokens exposes the token service, so the HTTP layer can verify cookies.
func (s *Service) Tokens() *TokenService { return s.tokens }

// roleFor decides what a user may do.
//
// Everyone is an admin while the app is being built. This is the single place
// to change once roles come from a user record.
func (s *Service) roleFor(string) Role {
	return RoleAdmin
}

// NormalizeEmail validates an address and reduces it to a canonical form, so
// that "Foo@Example.com " and "foo@example.com" are one account.
func NormalizeEmail(raw string) (string, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "", fmt.Errorf("%w: address is empty", ErrInvalidEmail)
	}
	// Reject display-name forms like `Foo <foo@example.com>`: we want a bare
	// address, and the angle-bracket form would make the key ambiguous.
	if strings.ContainsAny(trimmed, "<>,;\"") {
		return "", fmt.Errorf("%w: %q", ErrInvalidEmail, raw)
	}
	parsed, err := mail.ParseAddress(trimmed)
	if err != nil {
		return "", fmt.Errorf("%w: %q", ErrInvalidEmail, raw)
	}
	at := strings.LastIndex(parsed.Address, "@")
	if at <= 0 || at == len(parsed.Address)-1 {
		return "", fmt.Errorf("%w: %q", ErrInvalidEmail, raw)
	}
	// Only the domain is case-insensitive per the RFC, but treating the whole
	// address that way is what every provider does in practice.
	return strings.ToLower(parsed.Address), nil
}
