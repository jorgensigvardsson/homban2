package httpapi

import (
	"context"
	"net/http"
	"time"
)

// HealthResponse is the payload of the health and readiness endpoints.
type HealthResponse struct {
	Status  string    `json:"status"`
	Version string    `json:"version"`
	Env     string    `json:"env"`
	Time    time.Time `json:"time"`
}

// handleHealth is a liveness probe: it reports that the process is up and
// serving, without touching any dependency.
func (a *API) handleHealth(w http.ResponseWriter, r *http.Request) {
	JSON(w, r, http.StatusOK, HealthResponse{
		Status:  "ok",
		Version: a.deps.Version,
		Env:     a.deps.Env,
		Time:    time.Now().UTC(),
	})
}

// handleReady is a readiness probe: it fails while a dependency the service
// cannot serve without is unavailable.
func (a *API) handleReady(w http.ResponseWriter, r *http.Request) {
	// Bound the probe so a slow dependency cannot pin it open indefinitely.
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	if err := a.deps.Store.Ping(ctx); err != nil {
		LoggerFrom(r.Context()).Warn("readiness check failed", "err", err)
		Error(w, r, http.StatusServiceUnavailable, "not_ready", "Store is unavailable.")
		return
	}

	JSON(w, r, http.StatusOK, HealthResponse{
		Status:  "ready",
		Version: a.deps.Version,
		Env:     a.deps.Env,
		Time:    time.Now().UTC(),
	})
}
