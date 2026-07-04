// Package updater performs in-place binary self-update.
// It downloads the new binary, verifies SHA256, atomically replaces the current
// executable, then requests a systemd restart via SIGTERM (systemd Restart=always).
package updater

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strings"
)

// Update downloads url, verifies sha256, replaces the running binary, then restarts.
// expectedSHA256 must be a lowercase hex string (64 chars).
func Update(downloadURL, expectedSHA256 string) error {
	log.Printf("updater: downloading %s", downloadURL)

	resp, err := http.Get(downloadURL) //nolint:noctx
	if err != nil {
		return fmt.Errorf("download: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("download: HTTP %d", resp.StatusCode)
	}

	// Write to temp file while hashing in parallel.
	tmp, err := os.CreateTemp("", "relay-agent-update-*")
	if err != nil {
		return fmt.Errorf("create temp: %w", err)
	}
	tmpPath := tmp.Name()
	defer os.Remove(tmpPath) // no-op after Rename succeeds

	h := sha256.New()
	if _, err := io.Copy(io.MultiWriter(tmp, h), resp.Body); err != nil {
		tmp.Close()
		return fmt.Errorf("write: %w", err)
	}
	tmp.Close()

	// Verify checksum.
	got := strings.ToLower(hex.EncodeToString(h.Sum(nil)))
	want := strings.ToLower(expectedSHA256)
	if got != want {
		return fmt.Errorf("sha256 mismatch: got %s want %s", got, want)
	}
	log.Printf("updater: checksum OK (%s)", got[:12]+"…")

	// Find and replace current binary atomically.
	self, err := os.Executable()
	if err != nil {
		return fmt.Errorf("resolve executable: %w", err)
	}

	if err := os.Chmod(tmpPath, 0o755); err != nil {
		return fmt.Errorf("chmod: %w", err)
	}
	if err := os.Rename(tmpPath, self); err != nil {
		return fmt.Errorf("replace binary: %w", err)
	}
	log.Printf("updater: binary replaced at %s", self)

	// Ask systemd to restart. The new binary runs on next start.
	// This is best-effort: if systemctl is unavailable the process exits anyway.
	restart()
	return nil
}

func restart() {
	log.Println("updater: requesting systemd restart")
	if err := exec.Command("systemctl", "restart", "relay-agent").Run(); err != nil {
		// Fallback: exit cleanly so systemd Restart=always brings up the new binary.
		log.Printf("updater: systemctl failed (%v), exiting for systemd restart", err)
		os.Exit(0)
	}
}
