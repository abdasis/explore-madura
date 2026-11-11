// Package migrations menyediakan berkas SQL yang di-embed ke biner API.
package migrations

import "embed"

// FS berisi seluruh migrasi forward-only.
//
//go:embed *.sql
var FS embed.FS
