import { Music2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SpotifyPage() {
  const connected = true;
  const track = { title: "Blinding Lights", artist: "The Weeknd", album: "After Hours", progress: 62 };

  return (
    <div className="flex w-full flex-1 flex-col">
      <div className="flex w-full items-center justify-between border-b border-border px-8 py-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Spotify</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Display currently playing music on your screen.</p>
        </div>
        {connected && (
          <Button variant="outline" size="sm">
            <ExternalLink className="size-3.5" />
            Disconnect
          </Button>
        )}
      </div>

      <div className="px-8 py-6 flex flex-col gap-6">
        {/* Status */}
        <div className="flex items-center gap-3 rounded-lg border border-border p-4">
          <div className="flex size-10 items-center justify-center rounded-md bg-[#1DB954]/10">
            <Music2 className="size-5 text-[#1DB954]" />
          </div>
          <div>
            <p className="text-sm font-medium">Spotify</p>
            <p className="text-xs text-muted-foreground">Connected as parth@example.com</p>
          </div>
          <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
            Connected
          </span>
        </div>

        {/* Now playing */}
        <div>
          <p className="mb-3 text-sm font-medium text-muted-foreground">Now Playing</p>
          <div className="rounded-lg border border-border p-5">
            <p className="text-lg font-semibold">{track.title}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{track.artist} · {track.album}</p>
            <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-foreground" style={{ width: `${track.progress}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
