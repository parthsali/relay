package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/parthsali/relay/apps/agent/internal/config"
	"github.com/parthsali/relay/apps/agent/internal/display"
	"github.com/parthsali/relay/apps/agent/internal/spotify"
	"github.com/parthsali/relay/apps/agent/internal/telemetry"
	"github.com/parthsali/relay/apps/agent/internal/updater"
	"github.com/parthsali/relay/apps/agent/internal/wsclient"
)

// Version is set at build time via -ldflags "-X main.Version=x.y.z".
var Version = "dev"

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}
	log.Printf("relay-agent %s starting (device=%s)", Version, cfg.DeviceID)

	disp := display.NewStubDisplay(cfg.Brightness)
	defer disp.Close()

	spt := spotify.New()

	// Shared mutable state — guarded by mu.
	var mu sync.RWMutex
	mode := display.ModeClock
	brightness := cfg.Brightness

	// Message handler: dispatches commands received from the backend.
	var ws *wsclient.Client
	ws = wsclient.New(cfg.BackendURL, cfg.DeviceID, cfg.DeviceSecret, func(msg wsclient.Msg) {
		switch msg.Type {

		case wsclient.TypeSpotifySync:
			p, err := wsclient.Decode[wsclient.SpotifySyncPayload](msg)
			if err != nil {
				return
			}
			spt.SetToken(p.AccessToken)
			log.Println("agent: spotify token synced")

		case wsclient.TypeDisplaySetMode:
			p, err := wsclient.Decode[wsclient.DisplaySetModePayload](msg)
			if err != nil {
				return
			}
			mu.Lock()
			mode = p.Mode
			mu.Unlock()
			disp.SetMode(p.Mode)

		case wsclient.TypeDisplaySetBrightness:
			p, err := wsclient.Decode[wsclient.DisplaySetBrightnessPayload](msg)
			if err != nil {
				return
			}
			mu.Lock()
			brightness = p.Brightness
			mu.Unlock()
			disp.SetBrightness(p.Brightness)

		case wsclient.TypeAgentRestart:
			log.Println("agent: restart requested")
			os.Exit(0)

		case wsclient.TypeAgentUpdate:
			p, err := wsclient.Decode[wsclient.AgentUpdatePayload](msg)
			if err != nil {
				return
			}
			log.Printf("agent: update to %s requested", p.Version)
			if err := updater.Update(p.URL, p.SHA256); err != nil {
				log.Printf("agent: update failed: %v", err)
			}

		case wsclient.TypeError:
			p, _ := wsclient.Decode[wsclient.ErrorPayload](msg)
			log.Printf("agent: backend error: %s — %s", p.Code, p.Message)
		}
	})

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	var wg sync.WaitGroup

	// Telemetry reporter — reads /proc/* and sends stats every 30s.
	wg.Add(1)
	go func() {
		defer wg.Done()
		sendTelemetry(ws, &mu, &mode, &brightness) // immediate on start
		tick := time.NewTicker(30 * time.Second)
		defer tick.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-tick.C:
				sendTelemetry(ws, &mu, &mode, &brightness)
			}
		}
	}()

	// Spotify poller — polls every 5s when mode=spotify and token is set.
	wg.Add(1)
	go func() {
		defer wg.Done()
		tick := time.NewTicker(5 * time.Second)
		defer tick.Stop()
		var lastTitle string
		for {
			select {
			case <-ctx.Done():
				return
			case <-tick.C:
				mu.RLock()
				currentMode := mode
				mu.RUnlock()
				if currentMode != display.ModeSpotify || !spt.HasToken() {
					continue
				}
				track, err := spt.CurrentlyPlaying(ctx)
				if err != nil || track == nil {
					continue
				}
				if track.Title == lastTitle {
					continue
				}
				lastTitle = track.Title
				disp.ShowSpotify(track.Title, track.Artist, track.AlbumArt, track.ProgressMs, track.DurationMs)
				m, _ := wsclient.Encode(wsclient.TypeAgentNowPlaying, wsclient.NowPlayingPayload{
					IsPlaying: track.IsPlaying, Title: track.Title, Artist: track.Artist,
					AlbumArt: track.AlbumArt, ProgressMs: track.ProgressMs, DurationMs: track.DurationMs,
				})
				ws.Send(m)
			}
		}
	}()

	// Clock renderer — ticks the display every second when in clock mode.
	wg.Add(1)
	go func() {
		defer wg.Done()
		tick := time.NewTicker(time.Second)
		defer tick.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-tick.C:
				mu.RLock()
				m := mode
				mu.RUnlock()
				if m == display.ModeClock {
					disp.ShowClock()
				}
			}
		}
	}()

	// WebSocket connection loop — handles reconnection internally.
	wg.Add(1)
	go func() {
		defer wg.Done()
		ws.Run(ctx)
	}()

	wg.Wait()
	log.Println("agent: shutdown complete")
}

func sendTelemetry(ws *wsclient.Client, mu *sync.RWMutex, mode *string, brightness *int) {
	snap := telemetry.Read()
	mu.RLock()
	m, b := *mode, *brightness
	mu.RUnlock()
	msg, err := wsclient.Encode(wsclient.TypeAgentTelemetry, wsclient.TelemetryPayload{
		AgentVersion: Version,
		DisplayMode:  m,
		Brightness:   b,
		CPUPercent:   snap.CPUPercent,
		MemMB:        snap.MemMB,
		TempC:        snap.TempC,
		UptimeS:      snap.UptimeS,
		WiFiDBM:      snap.WiFiDBM,
		IPAddress:    snap.IPAddress,
	})
	if err == nil {
		ws.Send(msg)
	}
}
