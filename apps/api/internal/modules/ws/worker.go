package ws

import (
	"context"
	"log"
	"time"

	"github.com/parthsali/relay/apps/api/internal/hub"
	spotifyModule "github.com/parthsali/relay/apps/api/internal/modules/spotify"
)

const spotifyPollInterval = 5 * time.Second

// startSpotifyWorker polls Spotify every 5 s and pushes updates to the web client
// via the hub. It exits cleanly when ctx is cancelled (i.e. the web client disconnects).
func startSpotifyWorker(ctx context.Context, h *hub.Hub, svc *spotifyModule.Service, userID string) {
	// Check Spotify connection immediately and send initial state.
	sendSpotifyUpdate(ctx, h, svc, userID)

	ticker := time.NewTicker(spotifyPollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Printf("ws: spotify worker stopped (user=%s)", userID)
			return
		case <-ticker.C:
			sendSpotifyUpdate(ctx, h, svc, userID)
		}
	}
}

func sendSpotifyUpdate(ctx context.Context, h *hub.Hub, svc *spotifyModule.Service, userID string) {
	// Don't poll if Spotify isn't connected for this user.
	if !svc.IsConnected(ctx, userID) {
		return
	}

	result, err := svc.NowPlaying(ctx, userID)
	if err != nil {
		log.Printf("ws: spotify poll error (user=%s): %v", userID, err)
		h.SendToWeb(hub.Msg{
			Type: hub.TypeSpotifyError,
			Data: map[string]string{"message": err.Error()},
		})
		return
	}

	if result == nil || !result.IsPlaying {
		h.SendToWeb(hub.Msg{Type: hub.TypeSpotifyIdle})
		return
	}

	h.SendToWeb(hub.Msg{
		Type: hub.TypeSpotifyNowPlaying,
		Data: result,
	})
}
