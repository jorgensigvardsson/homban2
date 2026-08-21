package store

import (
	"context"
	"sync"
)

// Memory is an in-process Store used for local development and tests.
type Memory struct {
	mu     sync.RWMutex
	closed bool
}

// NewMemory returns an empty in-memory store.
func NewMemory() *Memory {
	return &Memory{}
}

// Ping implements Store.
func (m *Memory) Ping(ctx context.Context) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	m.mu.RLock()
	defer m.mu.RUnlock()
	if m.closed {
		return context.Canceled
	}
	return nil
}

// Close implements Store.
func (m *Memory) Close(context.Context) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.closed = true
	return nil
}

// compile-time check that Memory satisfies the port.
var _ Store = (*Memory)(nil)
