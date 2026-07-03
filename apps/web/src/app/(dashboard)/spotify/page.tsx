"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Music2, Loader2, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001";

interface NowPlaying {
  is_playing: boolean;
  track_name: string;
  artists: string[];
  album_name: string;
  album_art: string;
  progress_ms: number;
  duration_ms: number;
  track_url: string;
}

function getToken(): string {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(/(?:^|;\s*)relay_token=([^;]+)/);
  return m?.[1] ?? "";
}

function apiFetch(path: string, options?: RequestInit) {
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
}

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function SpotifyPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [connected, setConnected] = useState<boolean | null>(null);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const fetchStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await apiFetch("/spotify/status");
      const data = await res.json();
      setConnected(!!data.connected);
    } catch {
      setConnected(false);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const fetchNowPlaying = useCallback(async () => {
    try {
      const res = await apiFetch("/spotify/now-playing");
      if (res.ok) setNowPlaying(await res.json());
    } catch { /* silent — don't break UI on poll failure */ }
  }, []);

  // On mount: handle OAuth callback params, then check status
  useEffect(() => {
    const conn = searchParams.get("connected");
    const err = searchParams.get("error");
    if (conn === "true") {
      setBanner({ type: "success", msg: "Spotify connected successfully!" });
      router.replace("/spotify");
    } else if (err === "spotify_auth_failed") {
      setBanner({ type: "error", msg: "Spotify authorisation failed. Please try again." });
      router.replace("/spotify");
    }
    fetchStatus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll now-playing every 5 s when connected
  useEffect(() => {
    if (!connected) { setNowPlaying(null); return; }
    fetchNowPlaying();
    const id = setInterval(fetchNowPlaying, 5000);
    return () => clearInterval(id);
  }, [connected, fetchNowPlaying]);

  // Auto-dismiss banner after 5 s
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 5000);
    return () => clearTimeout(t);
  }, [banner]);

  async function handleConnect() {
    setConnecting(true);
    try {
      // Backend returns { url } — we navigate the browser there so Spotify sees a real redirect
      const res = await apiFetch("/spotify/connect");
      if (!res.ok) throw new Error("failed");
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      setBanner({ type: "error", msg: "Could not start Spotify connection. Is the API running?" });
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await apiFetch("/spotify/disconnect", { method: "DELETE" });
      setConnected(false);
      setNowPlaying(null);
      setBanner({ type: "success", msg: "Disconnected from Spotify." });
    } catch {
      setBanner({ type: "error", msg: "Failed to disconnect. Please try again." });
    } finally {
      setDisconnecting(false);
    }
  }

  const progress =
    nowPlaying && nowPlaying.duration_ms > 0
      ? Math.round((nowPlaying.progress_ms / nowPlaying.duration_ms) * 100)
      : 0;

  return (
    <div className="flex w-full flex-1 flex-col">

      {/* Header */}
      <div className="flex w-full items-center justify-between border-b border-border px-8 py-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Spotify</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Display currently playing music on your screen.
          </p>
        </div>
        {connected && (
          <Button variant="outline" size="sm" onClick={handleDisconnect} disabled={disconnecting}>
            {disconnecting && <Loader2 className="size-3.5 animate-spin" />}
            Disconnect
          </Button>
        )}
      </div>

      <div className="px-8 py-6 flex flex-col gap-6">

        {/* Banner */}
        {banner && (
          <div className={`rounded-lg border px-4 py-3 text-sm ${
            banner.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
              : "border-destructive/30 bg-destructive/5 text-destructive"
          }`}>
            {banner.msg}
          </div>
        )}

        {/* Status card */}
        <div className="flex items-center gap-4 rounded-lg border border-border p-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[#1DB954]/10">
            <Music2 className="size-5 text-[#1DB954]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Spotify</p>
            <p className="text-xs text-muted-foreground">
              {statusLoading
                ? "Checking connection…"
                : connected
                ? "Account connected — playback data is live"
                : "Connect your Spotify account to show what's playing"}
            </p>
          </div>
          {statusLoading ? (
            <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
          ) : connected ? (
            <span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-500">
              Connected
            </span>
          ) : (
            <Button size="sm" onClick={handleConnect} disabled={connecting}>
              {connecting && <Loader2 className="size-3.5 animate-spin" />}
              Connect Spotify
            </Button>
          )}
        </div>

        {/* Now playing */}
        {connected && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Now Playing</p>
              <button
                onClick={fetchNowPlaying}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Refresh"
              >
                <RefreshCw className="size-3.5" />
              </button>
            </div>

            {nowPlaying?.is_playing ? (
              <div className="flex items-center gap-5 rounded-lg border border-border p-5">
                {nowPlaying.album_art && (
                  <img
                    src={nowPlaying.album_art}
                    alt={nowPlaying.album_name}
                    className="size-16 shrink-0 rounded-md object-cover shadow-sm"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <a
                        href={nowPlaying.track_url}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate text-base font-semibold hover:underline"
                      >
                        {nowPlaying.track_name}
                      </a>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {nowPlaying.artists.join(", ")} · {nowPlaying.album_name}
                      </p>
                    </div>
                    <a
                      href={nowPlaying.track_url}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ExternalLink className="size-3.5" />
                    </a>
                  </div>
                  {/* Progress */}
                  <div className="mt-4 space-y-1.5">
                    <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-[#1DB954] transition-all duration-1000"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] tabular-nums text-muted-foreground">
                      <span>{formatMs(nowPlaying.progress_ms)}</span>
                      <span>{formatMs(nowPlaying.duration_ms)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-border p-5 text-sm text-muted-foreground">
                Nothing playing right now. Start something on Spotify and it will appear here.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SpotifyPage() {
  return (
    <Suspense>
      <SpotifyPageInner />
    </Suspense>
  );
}
