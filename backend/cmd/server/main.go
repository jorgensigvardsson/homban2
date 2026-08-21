// Command server is the homban HTTP API.
//
// Locally it is started by the repo-root `npm run dev`, which also starts the
// Vite dev server and the HTTPS reverse proxy in front of both. In Azure it
// runs as a container behind Container Apps ingress.
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"runtime/debug"
	"syscall"
	"time"

	"github.com/jorgensigvardsson/homban2/backend/internal/auth"
	"github.com/jorgensigvardsson/homban2/backend/internal/config"
	"github.com/jorgensigvardsson/homban2/backend/internal/email"
	"github.com/jorgensigvardsson/homban2/backend/internal/httpapi"
	"github.com/jorgensigvardsson/homban2/backend/internal/store"
)

// version is overridden at build time:
//
//	go build -ldflags "-X main.version=$(git rev-parse --short HEAD)" ./cmd/server
var version = ""

func main() {
	if err := run(); err != nil {
		slog.Error("server stopped", "err", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	logger := newLogger(cfg)
	slog.SetDefault(logger)

	// Ctrl-C, plus SIGTERM as sent by Container Apps when it drains a revision.
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	db, err := openStore(ctx, cfg, logger)
	if err != nil {
		return fmt.Errorf("open store: %w", err)
	}
	defer func() {
		closeCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := db.Close(closeCtx); err != nil {
			logger.Error("close store", "err", err)
		}
	}()

	authService, err := buildAuth(cfg, logger)
	if err != nil {
		return fmt.Errorf("configure auth: %w", err)
	}
	if cfg.Auth.UsingDevSecret {
		logger.Warn("signing sessions with the built-in development secret; set JWT_SECRET before deploying",
			"sessionTTL", cfg.Auth.SessionTTL)
	}

	srv := &http.Server{
		Addr: cfg.Addr(),
		Handler: httpapi.New(httpapi.Deps{
			Logger:       logger,
			Store:        db,
			Auth:         authService,
			Version:      buildVersion(),
			Env:          cfg.Env,
			CookieName:   cfg.Auth.CookieName,
			CookieSecure: cfg.Auth.CookieSecure,
			CodeLength:   cfg.Auth.CodeLength,
			// Codes go to stdout until a real mail sender is configured.
			MailToStdout: true,
		}),
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      60 * time.Second,
		IdleTimeout:       90 * time.Second,
		ErrorLog:          slog.NewLogLogger(logger.Handler(), slog.LevelWarn),
	}

	// Bind before announcing, so failing to take the port is reported as such
	// instead of following a misleading "listening" line.
	listener, err := net.Listen("tcp", srv.Addr)
	if err != nil {
		return fmt.Errorf("cannot listen on %s (is another instance already running?): %w", srv.Addr, err)
	}

	logger.Info("listening",
		"addr", listener.Addr().String(),
		"env", cfg.Env,
		"version", buildVersion(),
	)

	serveErr := make(chan error, 1)
	go func() {
		if err := srv.Serve(listener); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serveErr <- err
			return
		}
		serveErr <- nil
	}()

	select {
	case err := <-serveErr:
		return err
	case <-ctx.Done():
		logger.Info("shutdown requested, draining connections", "timeout", cfg.ShutdownTimeout)
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("graceful shutdown: %w", err)
	}
	logger.Info("stopped cleanly")
	return nil
}

// openStore picks the persistence implementation from configuration. Once the
// Cosmos implementation exists this returns it whenever Cosmos is configured.
func openStore(_ context.Context, cfg config.Config, logger *slog.Logger) (store.Store, error) {
	if cfg.Cosmos.Enabled() {
		return nil, errors.New("cosmos store is not implemented yet; unset COSMOS_ENDPOINT to use the in-memory store")
	}
	logger.Warn("using in-memory store; data is lost on restart")
	return store.NewMemory(), nil
}

func newLogger(cfg config.Config) *slog.Logger {
	opts := &slog.HandlerOptions{Level: cfg.LogLevel}
	var h slog.Handler
	if cfg.LogFormat == "json" {
		h = slog.NewJSONHandler(os.Stdout, opts)
	} else {
		h = slog.NewTextHandler(os.Stdout, opts)
	}
	return slog.New(h)
}

// buildVersion prefers the ldflags value and otherwise falls back to the VCS
// revision Go stamps into the binary automatically.
func buildVersion() string {
	if version != "" {
		return version
	}
	info, ok := debug.ReadBuildInfo()
	if !ok {
		return "dev"
	}
	for _, s := range info.Settings {
		if s.Key == "vcs.revision" {
			if len(s.Value) > 12 {
				return s.Value[:12]
			}
			return s.Value
		}
	}
	return "dev"
}

// buildAuth assembles the sign-in flow: where codes are kept, how they are
// delivered, and how session tokens are signed.
func buildAuth(cfg config.Config, logger *slog.Logger) (*auth.Service, error) {
	tokens, err := auth.NewTokenService(auth.TokenConfig{
		Secret:   cfg.Auth.JWTSecret,
		Issuer:   cfg.Auth.JWTIssuer,
		Audience: cfg.Auth.JWTAudience,
		TTL:      cfg.Auth.SessionTTL,
	})
	if err != nil {
		return nil, err
	}

	// Development stub: the code is printed to stdout, so it shows up in the
	// `npm run dev` output. Swap this for a real Sender when mail is set up.
	sender := email.NewStdoutSender(os.Stdout, logger)

	// In-memory codes are fine for one instance. More than one replica needs
	// shared storage, or a user's code and their verification request can
	// land on different instances.
	codes := auth.NewMemoryCodeStore()

	return auth.NewService(codes, sender, tokens, auth.ServiceConfig{
		CodeLength:  cfg.Auth.CodeLength,
		CodeTTL:     cfg.Auth.CodeTTL,
		MaxAttempts: cfg.Auth.CodeMaxAttempts,
		ResendAfter: cfg.Auth.CodeResendAfter,
		HashSecret:  cfg.Auth.JWTSecret,
	}, logger)
}
