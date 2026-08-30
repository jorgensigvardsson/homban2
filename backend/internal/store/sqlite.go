package store

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

// SQLite is a database/sql-backed Store using the pure-Go, cgo-free SQLite
// driver, so the backend keeps building with CGO_ENABLED=0 in Docker.
//
// SQLite serializes writes at the file level: only one connection may hold
// the write lock at a time. The pool is capped at a single connection so a
// second writer queues behind the first instead of failing with
// SQLITE_BUSY. WAL mode still lets reads proceed concurrently with that one
// writer.
type SQLite struct {
	db *sql.DB
}

// NewSQLite opens the database file at path, creating its parent directory
// and the file itself if either is missing.
func NewSQLite(ctx context.Context, path string) (*SQLite, error) {
	if dir := filepath.Dir(path); dir != "." {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return nil, fmt.Errorf("create database directory: %w", err)
		}
	}

	dsn := fmt.Sprintf("file:%s?_journal_mode=WAL&_busy_timeout=5000&_foreign_keys=1", path)
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}
	db.SetMaxOpenConns(1)

	if err := db.PingContext(ctx); err != nil {
		db.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}

	return &SQLite{db: db}, nil
}

// Ping implements Store.
func (s *SQLite) Ping(ctx context.Context) error {
	return s.db.PingContext(ctx)
}

// Close implements Store.
func (s *SQLite) Close(context.Context) error {
	return s.db.Close()
}

// compile-time check that SQLite satisfies the port.
var _ Store = (*SQLite)(nil)
