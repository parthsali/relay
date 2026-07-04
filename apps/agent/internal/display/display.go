// Package display abstracts the LED matrix behind an interface.
// This file contains the stub (CGO-free) implementation used in CI and dev.
// The real rpi-rgb-led-matrix driver lives in display_hw.go behind a build tag.
package display

import (
	"fmt"
	"log"
	"time"
)

// Mode constants must match what the backend sends in display.set_mode commands.
const (
	ModeClock   = "clock"
	ModeSpotify = "spotify"
	ModeWeather = "weather"
)

// Display is the abstraction over the physical LED matrix.
type Display interface {
	// SetMode switches the active display scene (clock | spotify | weather).
	SetMode(mode string)
	// SetBrightness adjusts LED brightness 0–100.
	SetBrightness(b int)
	// ShowClock renders the current time. Called every second in clock mode.
	ShowClock()
	// ShowSpotify renders currently-playing track info.
	ShowSpotify(title, artist, albumArt string, progressMs, durationMs int)
	// Close releases hardware resources.
	Close()
}

// ── Stub (no CGO) ────────────────────────────────────────────────────────────

// StubDisplay logs operations. Safe on any OS — used in CI and on dev machines.
type StubDisplay struct {
	mode       string
	brightness int
}

// NewStubDisplay returns a Display that only logs — no hardware required.
func NewStubDisplay(brightness int) Display {
	log.Printf("display[stub]: initialised brightness=%d", brightness)
	return &StubDisplay{mode: ModeClock, brightness: brightness}
}

func (d *StubDisplay) SetMode(mode string) {
	d.mode = mode
	log.Printf("display[stub]: mode=%s", mode)
}

func (d *StubDisplay) SetBrightness(b int) {
	d.brightness = b
	log.Printf("display[stub]: brightness=%d", b)
}

func (d *StubDisplay) ShowClock() {
	// High-frequency (1/s) — intentionally silent in stub to avoid log spam.
	// On real hardware this writes time pixels to the matrix buffer.
	_ = fmt.Sprintf("%s", time.Now().Format("15:04:05"))
}

func (d *StubDisplay) ShowSpotify(title, artist, albumArt string, progressMs, durationMs int) {
	log.Printf("display[stub]: spotify — %q by %q [%d/%dms]", title, artist, progressMs, durationMs)
}

func (d *StubDisplay) Close() {
	log.Println("display[stub]: closed")
}
