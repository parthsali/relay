package db

import "embed"

// Migrations holds all SQL migration files embedded at compile time.
//
//go:embed migrations/*.sql
var Migrations embed.FS
