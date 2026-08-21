// Package store defines the persistence boundary for the service.
//
// The interface exists so that the HTTP layer never talks to a database
// directly. Today the only implementation is Memory; a Cosmos DB
// implementation will be added alongside it (cosmos.go) without touching
// any handler code.
package store

import "context"

// Store is the persistence port used by the rest of the application.
//
// As the domain takes shape, add the operations it needs here (for example
// CreateBoard/GetBoard) and implement them for every backing store.
type Store interface {
	// Ping verifies that the store is reachable. Used by the readiness probe.
	Ping(ctx context.Context) error
	// Close releases any resources held by the store.
	Close(ctx context.Context) error
}
