package httpapi

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"log/slog"
	"net/http"
	"runtime/debug"
	"time"
)

// Middleware wraps an http.Handler with additional behaviour.
type Middleware func(http.Handler) http.Handler

// Chain applies middleware to h so that the first entry is the outermost
// wrapper (that is, it sees the request first).
func Chain(h http.Handler, mw ...Middleware) http.Handler {
	for i := len(mw) - 1; i >= 0; i-- {
		h = mw[i](h)
	}
	return h
}

type requestIDKey struct{}

// RequestIDHeader is the header used to accept and echo a correlation id. The
// Azure Container Apps ingress and most gateways forward this header.
const RequestIDHeader = "X-Request-Id"

// RequestID ensures every request has a correlation id, taken from the incoming
// header when present, and echoes it back on the response.
func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := r.Header.Get(RequestIDHeader)
		if id == "" {
			id = newID()
		}
		w.Header().Set(RequestIDHeader, id)
		ctx := context.WithValue(r.Context(), requestIDKey{}, id)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RequestIDFrom returns the correlation id carried by ctx, if any.
func RequestIDFrom(ctx context.Context) string {
	id, _ := ctx.Value(requestIDKey{}).(string)
	return id
}

// Logger logs one line per request, and attaches a logger carrying the request
// id to the context so handlers can log with correlation for free.
func Logger(logger *slog.Logger) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}

			reqLogger := logger.With("requestId", RequestIDFrom(r.Context()))
			ctx := context.WithValue(r.Context(), loggerKey{}, reqLogger)

			next.ServeHTTP(rec, r.WithContext(ctx))

			reqLogger.LogAttrs(r.Context(), levelFor(rec.status), "request",
				slog.String("method", r.Method),
				slog.String("path", r.URL.Path),
				slog.Int("status", rec.status),
				slog.Int64("bytes", rec.written),
				slog.Duration("duration", time.Since(start)),
			)
		})
	}
}

type loggerKey struct{}

// LoggerFrom returns the request-scoped logger, falling back to the default.
func LoggerFrom(ctx context.Context) *slog.Logger {
	if l, ok := ctx.Value(loggerKey{}).(*slog.Logger); ok {
		return l
	}
	return slog.Default()
}

// Recover turns a handler panic into a 500 response instead of killing the
// whole process.
func Recover(logger *slog.Logger) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if v := recover(); v != nil {
					if v == http.ErrAbortHandler {
						panic(v) // deliberate abort, let net/http handle it
					}
					logger.Error("panic recovered",
						"requestId", RequestIDFrom(r.Context()),
						"panic", v,
						"stack", string(debug.Stack()),
					)
					Error(w, r, http.StatusInternalServerError, "internal_error", "Something went wrong.")
				}
			}()
			next.ServeHTTP(w, r)
		})
	}
}

// NoCacheAPI stops browsers and intermediate proxies from caching API replies.
func NoCacheAPI(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		next.ServeHTTP(w, r)
	})
}

type statusRecorder struct {
	http.ResponseWriter
	status  int
	written int64
	wrote   bool
}

func (r *statusRecorder) WriteHeader(status int) {
	if r.wrote {
		return
	}
	r.wrote = true
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}

func (r *statusRecorder) Write(b []byte) (int, error) {
	r.wrote = true
	n, err := r.ResponseWriter.Write(b)
	r.written += int64(n)
	return n, err
}

// Unwrap lets net/http reach the underlying writer for optional interfaces
// such as http.Flusher (needed for streaming responses).
func (r *statusRecorder) Unwrap() http.ResponseWriter { return r.ResponseWriter }

func levelFor(status int) slog.Level {
	switch {
	case status >= 500:
		return slog.LevelError
	case status >= 400:
		return slog.LevelWarn
	default:
		return slog.LevelInfo
	}
}

func newID() string {
	var b [8]byte
	// rand.Read from crypto/rand never fails as of Go 1.24.
	_, _ = rand.Read(b[:])
	return hex.EncodeToString(b[:])
}
