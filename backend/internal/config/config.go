// Package config loads the service configuration from the environment.
//
// Every setting has a development-friendly default so that `go run ./cmd/server`
// works with no setup. In Azure Container Apps the same variables are supplied
// as container environment variables / secret references.
package config

import (
	"fmt"
	"log/slog"
	"net"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/jorgensigvardsson/homban2/backend/internal/auth"
)

// Config is the fully resolved configuration for one process.
type Config struct {
	// Env is the deployment environment: development, staging or production.
	Env string
	// Host is the interface to bind to. Empty means all interfaces.
	Host string
	// Port is the TCP port to listen on. Azure Container Apps injects PORT.
	Port int

	LogLevel  slog.Level
	LogFormat string // "text" or "json"

	// ShutdownTimeout bounds how long in-flight requests may finish during
	// a graceful shutdown.
	ShutdownTimeout time.Duration

	// Auth configures passwordless sign-in and session cookies.
	Auth AuthConfig

	// SQLite configures the on-disk database file. Unset during local
	// development, in which case the in-memory store is used instead.
	SQLite SQLiteConfig
}

// AuthConfig configures sign-in codes and session tokens.
type AuthConfig struct {
	// JWTSecret signs session tokens (HS256).
	//
	// Deliberately unrelated to the TLS certificate: TLS terminates at the
	// Azure ingress, where the app has no access to the private key, and a
	// managed certificate rotates on its own schedule, which would invalidate
	// every session. Signing keys and transport keys stay separate.
	JWTSecret string
	// UsingDevSecret is true when JWTSecret fell back to the built-in
	// development value, which must never happen outside development.
	UsingDevSecret bool

	JWTIssuer   string
	JWTAudience string
	// SessionTTL is how long a session token stays valid.
	SessionTTL time.Duration

	// CookieName holds the session token.
	CookieName string
	// CookieSecure marks the cookie HTTPS-only. On by default, since even
	// local development is served over TLS by the reverse proxy.
	CookieSecure bool

	// CodeLength is the number of digits in a sign-in code.
	CodeLength int
	// CodeTTL is how long a sign-in code stays usable.
	CodeTTL time.Duration
	// CodeMaxAttempts is how often one code may be guessed at.
	CodeMaxAttempts int
	// CodeResendAfter is the cooldown between code requests per address.
	CodeResendAfter time.Duration
}

// devJWTSecret is used only when APP_ENV is development and JWT_SECRET is
// unset. It is a constant so that restarting the backend does not sign
// everyone out mid-session.
const devJWTSecret = "homban-development-only-signing-secret-do-not-deploy"

// SQLiteConfig describes where the SQLite database file lives.
type SQLiteConfig struct {
	Path string
}

// Enabled reports whether a database file path is configured.
func (c SQLiteConfig) Enabled() bool {
	return c.Path != ""
}

// Load reads the configuration from the process environment.
func Load() (Config, error) {
	cfg := Config{
		Env:             env("APP_ENV", "development"),
		Host:            env("HOST", "127.0.0.1"),
		LogFormat:       env("LOG_FORMAT", "text"),
		ShutdownTimeout: 15 * time.Second,
		SQLite: SQLiteConfig{
			Path: env("SQLITE_PATH", ""),
		},
	}

	port, err := envInt("PORT", 8080)
	if err != nil {
		return Config{}, err
	}
	cfg.Port = port

	level, err := parseLevel(env("LOG_LEVEL", "info"))
	if err != nil {
		return Config{}, err
	}
	cfg.LogLevel = level

	if cfg.ShutdownTimeout, err = envDuration("SHUTDOWN_TIMEOUT", 15*time.Second); err != nil {
		return Config{}, err
	}

	if cfg.Auth, err = loadAuth(cfg.Env); err != nil {
		return Config{}, err
	}

	return cfg, nil
}

func loadAuth(appEnv string) (AuthConfig, error) {
	a := AuthConfig{
		JWTSecret:   env("JWT_SECRET", ""),
		JWTIssuer:   env("JWT_ISSUER", "homban"),
		JWTAudience: env("JWT_AUDIENCE", "homban-web"),
		CookieName:  env("AUTH_COOKIE_NAME", "homban_session"),
	}

	if a.JWTSecret == "" {
		if appEnv != "development" {
			return AuthConfig{}, fmt.Errorf("JWT_SECRET is required when APP_ENV=%s (at least %d characters)", appEnv, auth.MinSecretLength)
		}
		a.JWTSecret = devJWTSecret
		a.UsingDevSecret = true
	}
	if len(a.JWTSecret) < auth.MinSecretLength {
		return AuthConfig{}, fmt.Errorf("JWT_SECRET must be at least %d characters, got %d", auth.MinSecretLength, len(a.JWTSecret))
	}

	// Sessions last a month in development so that building the app is not
	// interrupted by signing in again. That is deliberately far too long for a
	// real deployment, hence the shorter default everywhere else.
	sessionDefault := 12 * time.Hour
	if appEnv == "development" {
		sessionDefault = 30 * 24 * time.Hour
	}

	var err error
	if a.SessionTTL, err = envDuration("SESSION_TTL", sessionDefault); err != nil {
		return AuthConfig{}, err
	}
	if a.CookieSecure, err = envBool("AUTH_COOKIE_SECURE", true); err != nil {
		return AuthConfig{}, err
	}
	if a.CodeLength, err = envInt("OTP_LENGTH", 6); err != nil {
		return AuthConfig{}, err
	}
	if a.CodeTTL, err = envDuration("OTP_TTL", 10*time.Minute); err != nil {
		return AuthConfig{}, err
	}
	if a.CodeMaxAttempts, err = envInt("OTP_MAX_ATTEMPTS", 5); err != nil {
		return AuthConfig{}, err
	}
	if a.CodeResendAfter, err = envDuration("OTP_RESEND_AFTER", time.Minute); err != nil {
		return AuthConfig{}, err
	}

	if !a.CookieSecure && appEnv != "development" {
		return AuthConfig{}, fmt.Errorf("AUTH_COOKIE_SECURE must not be disabled when APP_ENV=%s", appEnv)
	}

	return a, nil
}

// Addr is the listen address for the HTTP server.
func (c Config) Addr() string {
	return net.JoinHostPort(c.Host, strconv.Itoa(c.Port))
}

// IsDevelopment reports whether the service runs in a local dev setup.
func (c Config) IsDevelopment() bool {
	return c.Env == "development"
}

func env(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}

func envInt(key string, fallback int) (int, error) {
	raw := env(key, "")
	if raw == "" {
		return fallback, nil
	}
	v, err := strconv.Atoi(raw)
	if err != nil {
		return 0, fmt.Errorf("%s: %w", key, err)
	}
	return v, nil
}

func envDuration(key string, fallback time.Duration) (time.Duration, error) {
	raw := env(key, "")
	if raw == "" {
		return fallback, nil
	}
	v, err := time.ParseDuration(raw)
	if err != nil {
		return 0, fmt.Errorf("%s: %w", key, err)
	}
	if v <= 0 {
		return 0, fmt.Errorf("%s must be positive, got %s", key, raw)
	}
	return v, nil
}

func envBool(key string, fallback bool) (bool, error) {
	raw := env(key, "")
	if raw == "" {
		return fallback, nil
	}
	v, err := strconv.ParseBool(raw)
	if err != nil {
		return false, fmt.Errorf("%s: %w", key, err)
	}
	return v, nil
}

func parseLevel(s string) (slog.Level, error) {
	switch strings.ToLower(s) {
	case "debug":
		return slog.LevelDebug, nil
	case "info":
		return slog.LevelInfo, nil
	case "warn", "warning":
		return slog.LevelWarn, nil
	case "error":
		return slog.LevelError, nil
	default:
		return 0, fmt.Errorf("LOG_LEVEL: unknown level %q", s)
	}
}
