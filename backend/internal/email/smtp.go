package email

import (
	"context"
	"fmt"
	"net/mail"
	"net/smtp"
	"strings"
	"time"
)

// SMTPConfig configures outgoing mail over SMTP with STARTTLS — the pattern
// virtually every provider supports, including Gmail with an app password.
// A provider that only offers implicit TLS (port 465, no STARTTLS upgrade)
// is not supported by this minimal implementation.
type SMTPConfig struct {
	Host     string
	Port     int
	Username string
	Password string
	// From is used as both the envelope sender and the "From" header. May be
	// a bare address or "Display Name <address>".
	From string
}

// SMTPSender delivers mail through an SMTP relay.
type SMTPSender struct {
	cfg      SMTPConfig
	fromAddr string // bare address, for the envelope
}

// NewSMTPSender validates cfg and returns a ready sender.
func NewSMTPSender(cfg SMTPConfig) (*SMTPSender, error) {
	if cfg.Host == "" {
		return nil, fmt.Errorf("smtp host is required")
	}
	if cfg.Port <= 0 {
		return nil, fmt.Errorf("smtp port must be positive")
	}
	if cfg.From == "" {
		return nil, fmt.Errorf("smtp from address is required")
	}
	parsed, err := mail.ParseAddress(cfg.From)
	if err != nil {
		return nil, fmt.Errorf("smtp from address: %w", err)
	}
	return &SMTPSender{cfg: cfg, fromAddr: parsed.Address}, nil
}

// SendSignInCode implements Sender by relaying a plain-text message over SMTP.
func (s *SMTPSender) SendSignInCode(ctx context.Context, to, code string, validFor time.Duration) error {
	if err := ctx.Err(); err != nil {
		return err
	}

	msg, err := buildMessage(s.cfg.From, to, code, validFor)
	if err != nil {
		return err
	}

	var auth smtp.Auth
	if s.cfg.Username != "" {
		auth = &loginAuth{username: s.cfg.Username, password: s.cfg.Password}
	}

	addr := fmt.Sprintf("%s:%d", s.cfg.Host, s.cfg.Port)
	if err := smtp.SendMail(addr, auth, s.fromAddr, []string{to}, msg); err != nil {
		return fmt.Errorf("smtp send: %w", err)
	}
	return nil
}

// buildMessage renders a minimal RFC 5322 message. to is always the output of
// auth.NormalizeEmail, which already rejects the characters that would let it
// break out of a header; the check below is defense in depth at this
// package's own boundary.
func buildMessage(from, to, code string, validFor time.Duration) ([]byte, error) {
	if strings.ContainsAny(to, "\r\n") {
		return nil, fmt.Errorf("recipient address contains invalid characters")
	}

	var b strings.Builder
	fmt.Fprintf(&b, "From: %s\r\n", from)
	fmt.Fprintf(&b, "To: %s\r\n", to)
	fmt.Fprintf(&b, "Subject: Your Homban sign-in code\r\n")
	fmt.Fprintf(&b, "MIME-Version: 1.0\r\n")
	fmt.Fprintf(&b, "Content-Type: text/plain; charset=\"utf-8\"\r\n")
	fmt.Fprintf(&b, "\r\n")
	fmt.Fprintf(&b, "Your Homban sign-in code is: %s\r\n\r\nIt expires in %s. If you did not request this, ignore this email.\r\n",
		code, validFor.String())
	return []byte(b.String()), nil
}

// loginAuth implements the SMTP "AUTH LOGIN" mechanism, which the standard
// library does not provide (only PLAIN and CRAM-MD5). Microsoft's SMTP
// servers (Outlook.com, Office 365) reject PLAIN outright with "504 5.7.4
// Unrecognized authentication type" and require LOGIN instead; LOGIN is also
// accepted by every other mainstream provider (Gmail included), so this
// covers both without needing to pick a mechanism per provider.
type loginAuth struct {
	username, password string
}

func (a *loginAuth) Start(*smtp.ServerInfo) (string, []byte, error) {
	return "LOGIN", nil, nil
}

func (a *loginAuth) Next(fromServer []byte, more bool) ([]byte, error) {
	if !more {
		return nil, nil
	}
	switch prompt := strings.ToLower(strings.TrimSpace(string(fromServer))); {
	case strings.HasPrefix(prompt, "username"):
		return []byte(a.username), nil
	case strings.HasPrefix(prompt, "password"):
		return []byte(a.password), nil
	default:
		return nil, fmt.Errorf("unexpected LOGIN challenge: %q", fromServer)
	}
}

var _ smtp.Auth = (*loginAuth)(nil)
var _ Sender = (*SMTPSender)(nil)
