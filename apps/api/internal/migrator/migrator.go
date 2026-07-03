package migrator

import (
	"context"
	"fmt"
	"io/fs"
	"log"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

const createMigrationsTable = `
CREATE TABLE IF NOT EXISTS schema_migrations (
    id         SERIAL      PRIMARY KEY,
    name       VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`

// Migrator runs ordered .sql files and tracks them in schema_migrations.
type Migrator struct {
	pool *pgxpool.Pool
	fs   fs.FS
	dir  string
}

// New creates a Migrator. Pass the embedded FS and the sub-directory that
// holds the *.sql files (e.g. "migrations").
func New(pool *pgxpool.Pool, migrations fs.FS, dir string) *Migrator {
	return &Migrator{pool: pool, fs: migrations, dir: dir}
}

// Run applies all pending migrations in lexicographic order.
func (m *Migrator) Run(ctx context.Context) error {
	if _, err := m.pool.Exec(ctx, createMigrationsTable); err != nil {
		return fmt.Errorf("create schema_migrations: %w", err)
	}

	entries, err := fs.ReadDir(m.fs, m.dir)
	if err != nil {
		return fmt.Errorf("read migrations dir: %w", err)
	}

	var files []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".sql") {
			files = append(files, e.Name())
		}
	}
	sort.Strings(files)

	for _, name := range files {
		if err := m.apply(ctx, name); err != nil {
			return fmt.Errorf("migration %s: %w", name, err)
		}
	}
	return nil
}

func (m *Migrator) apply(ctx context.Context, name string) error {
	var count int
	if err := m.pool.QueryRow(ctx,
		"SELECT COUNT(*) FROM schema_migrations WHERE name = $1", name,
	).Scan(&count); err != nil {
		return err
	}
	if count > 0 {
		return nil // already applied
	}

	content, err := fs.ReadFile(m.fs, m.dir+"/"+name)
	if err != nil {
		return err
	}

	tx, err := m.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	if _, err := tx.Exec(ctx, string(content)); err != nil {
		return fmt.Errorf("exec SQL: %w", err)
	}
	if _, err := tx.Exec(ctx,
		"INSERT INTO schema_migrations (name) VALUES ($1)", name,
	); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return err
	}

	log.Printf("applied migration: %s", name)
	return nil
}
