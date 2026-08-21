package httpapi

import (
	"net/http"
	"strings"
)

// JSONProblems rewrites the plain-text 404 and 405 responses that
// http.ServeMux generates into the API's JSON error shape, so the frontend has
// exactly one error format to parse. Responses written by our own handlers
// already carry a JSON content type and are passed through untouched.
//
// Doing it this way (rather than registering a catch-all route) keeps
// ServeMux's method-aware 405 with its Allow header intact.
func JSONProblems(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		next.ServeHTTP(&problemWriter{ResponseWriter: w, req: r}, r)
	})
}

type problemWriter struct {
	http.ResponseWriter
	req      *http.Request
	replaced bool
	wrote    bool
}

func (p *problemWriter) WriteHeader(status int) {
	if p.wrote {
		return
	}
	p.wrote = true

	code, ok := problemCodes[status]
	if ok && !strings.Contains(p.Header().Get("Content-Type"), "json") {
		p.replaced = true
		Error(p.ResponseWriter, p.req, status, code, problemMessages[status])
		return
	}
	p.ResponseWriter.WriteHeader(status)
}

func (p *problemWriter) Write(b []byte) (int, error) {
	if !p.wrote {
		p.WriteHeader(http.StatusOK)
	}
	if p.replaced {
		// Discard ServeMux's text body; ours is already written.
		return len(b), nil
	}
	return p.ResponseWriter.Write(b)
}

// Unwrap lets net/http reach the underlying writer for optional interfaces.
func (p *problemWriter) Unwrap() http.ResponseWriter { return p.ResponseWriter }

var problemCodes = map[int]string{
	http.StatusNotFound:         "not_found",
	http.StatusMethodNotAllowed: "method_not_allowed",
}

var problemMessages = map[int]string{
	http.StatusNotFound:         "No such endpoint.",
	http.StatusMethodNotAllowed: "That method is not allowed for this endpoint.",
}
