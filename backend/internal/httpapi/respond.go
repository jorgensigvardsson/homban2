package httpapi

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
)

// maxBodyBytes caps request bodies, so a runaway client cannot exhaust memory.
const maxBodyBytes = 1 << 20 // 1 MiB

// JSON writes v as a JSON response with the given status code.
func JSON(w http.ResponseWriter, r *http.Request, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if v == nil {
		return
	}
	if err := json.NewEncoder(w).Encode(v); err != nil {
		// The status line is already written, so all we can do is record it.
		slog.ErrorContext(r.Context(), "write response body", "err", err)
	}
}

// ErrorBody is the single error shape returned by every endpoint. Keeping one
// shape means the frontend needs exactly one error path.
type ErrorBody struct {
	Error ErrorDetail `json:"error"`
}

// ErrorDetail carries a stable machine-readable code plus a human message.
type ErrorDetail struct {
	Code      string `json:"code"`
	Message   string `json:"message"`
	RequestID string `json:"requestId,omitempty"`
}

// Error writes a problem response. code is a stable identifier the frontend may
// switch on (for example "not_found"); message is safe to show to a user.
func Error(w http.ResponseWriter, r *http.Request, status int, code, message string) {
	JSON(w, r, status, ErrorBody{Error: ErrorDetail{
		Code:      code,
		Message:   message,
		RequestID: RequestIDFrom(r.Context()),
	}})
}

// Decode reads a JSON request body into dst, rejecting unknown fields and
// bodies larger than maxBodyBytes.
func Decode(w http.ResponseWriter, r *http.Request, dst any) error {
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBodyBytes))
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		return err
	}
	// A second value in the stream means the client sent more than one object.
	if dec.More() {
		return errors.New("request body must contain a single JSON object")
	}
	return nil
}
