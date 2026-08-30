// Package email delivers transactional mail: StdoutSender for local
// development, SMTPSender (smtp.go) for a real deployment.
package email

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"strings"
	"time"
)

// Sender delivers a message to one recipient.
type Sender interface {
	// SendSignInCode mails a one-time sign-in code to the given address.
	SendSignInCode(ctx context.Context, to, code string, validFor time.Duration) error
}

// StdoutSender prints the message instead of sending it, so local development
// needs no mail account. The code is deliberately easy to spot in the
// `npm run dev` output.
type StdoutSender struct {
	out    io.Writer
	logger *slog.Logger
}

// NewStdoutSender writes to out (typically os.Stdout).
func NewStdoutSender(out io.Writer, logger *slog.Logger) *StdoutSender {
	if logger == nil {
		logger = slog.Default()
	}
	return &StdoutSender{out: out, logger: logger}
}

// SendSignInCode implements Sender by printing a banner to stdout.
func (s *StdoutSender) SendSignInCode(_ context.Context, to, code string, validFor time.Duration) error {
	banner := strings.Join([]string{
		"",
		"  +--------------------------------------------------+",
		"  |  SIGN-IN CODE (development: no mail was sent)     |",
		"  +--------------------------------------------------+",
		fmt.Sprintf("  |  to:    %-40s |", truncate(to, 40)),
		fmt.Sprintf("  |  code:  %-40s |", code),
		fmt.Sprintf("  |  valid: %-40s |", validFor.String()),
		"  +--------------------------------------------------+",
		"",
	}, "\n")

	if _, err := fmt.Fprintln(s.out, banner); err != nil {
		return fmt.Errorf("write sign-in code: %w", err)
	}
	return nil
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	if max <= 3 {
		return s[:max]
	}
	return s[:max-3] + "..."
}

var _ Sender = (*StdoutSender)(nil)
