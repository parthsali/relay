"use client";

import {
  ChevronRight,
  Clock,
  Cpu,
  Monitor,
  Music2,
  RotateCcw,
  Thermometer,
  Wifi,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useWebSocket } from "@/hooks/use-websocket";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001";

function getToken() {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(/(?:^|;\s*)relay_token=([^;]+)/);
  return m?.[1] ?? "";
}

async function apiFetch(path: string, opts?: RequestInit) {
  return fetch(`${API}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
      ...opts?.headers,
    },
  });
}

type Device = { id: string; name: string; is_online: boolean };

type Telemetry = {
  cpu_percent: number;
  mem_mb: number;
  temp_c: number;
  uptime_s: number;
  wifi_dbm: number;
  ip_address: string;
  display_mode: string;
  brightness: number;
};

type NowPlaying = {
  is_playing: boolean;
  track_name: string;
  artists: string[];
};

type ActivityItem = { time: string; msg: string; dot: string };

function fmtUptime(s: number) {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function fmtTime(d = new Date()) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function HomePage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [restarting, setRestarting] = useState(false);
  const activityRef = useRef<ActivityItem[]>([]);

  const pushActivity = useCallback((msg: string, dot = "bg-emerald-500") => {
    const item = { time: fmtTime(), msg, dot };
    activityRef.current = [item, ...activityRef.current].slice(0, 8);
    setActivity([...activityRef.current]);
  }, []);

  const fetchDevices = useCallback(async () => {
    const r = await apiFetch("/devices");
    if (r.ok) {
      const j = await r.json();
      setDevices(j.data?.devices ?? []);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  useWebSocket({
    onMessage: useCallback(
      (msg) => {
        if (msg.type === "device.telemetry") {
          const { device_id: _id, ...stats } = msg.data;
          setTelemetry(stats as Telemetry);
        } else if (msg.type === "device.online") {
          fetchDevices();
          pushActivity(
            `Agent connected · ${msg.data?.name ?? ""}`,
            "bg-emerald-500",
          );
        } else if (msg.type === "device.offline") {
          fetchDevices();
          pushActivity("Agent disconnected", "bg-red-500");
        } else if (msg.type === "spotify.now_playing") {
          setNowPlaying(msg.data as NowPlaying);
        } else if (msg.type === "spotify.idle") {
          setNowPlaying((p) => (p ? { ...p, is_playing: false } : null));
        }
      },
      [fetchDevices, pushActivity],
    ),
  });

  const primary = devices.find((d) => d.is_online) ?? devices[0] ?? null;

  async function restartAgent() {
    if (!primary) return;
    setRestarting(true);
    await apiFetch(`/devices/${primary.id}/command`, {
      method: "POST",
      body: JSON.stringify({ type: "agent.restart" }),
    });
    setRestarting(false);
    pushActivity("Restart command sent", "bg-blue-500");
  }

  const stats = telemetry
    ? [
        {
          label: "CPU",
          value: `${telemetry.cpu_percent.toFixed(1)}%`,
          sub: "ARM Cortex-A53",
          icon: Cpu,
        },
        {
          label: "RAM",
          value: `${telemetry.mem_mb.toFixed(0)} MB`,
          sub: "used",
          icon: Zap,
        },
        {
          label: "Temp",
          value: `${telemetry.temp_c.toFixed(1)}°C`,
          sub: telemetry.temp_c < 70 ? "normal" : "hot",
          icon: Thermometer,
        },
        {
          label: "Uptime",
          value: fmtUptime(telemetry.uptime_s),
          sub: "since last reboot",
          icon: Clock,
        },
        {
          label: "Wi-Fi",
          value: telemetry.wifi_dbm ? `${telemetry.wifi_dbm} dBm` : "—",
          sub: telemetry.ip_address || "—",
          icon: Wifi,
        },
      ]
    : null;

  return (
    <div className="flex w-full flex-1 flex-col">
      {/* Header */}
      <div className="flex w-full items-center justify-between border-b border-border px-8 py-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {primary?.name ?? "No device"}
          </h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            {primary?.is_online ? (
              <>
                <span className="flex items-center gap-1.5">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                  </span>
                  Online
                </span>
                {telemetry?.ip_address && (
                  <>
                    <span className="text-border">·</span>
                    {telemetry.ip_address}
                  </>
                )}
              </>
            ) : (
              <span className="text-muted-foreground">Offline</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={restartAgent}
            disabled={!primary?.is_online || restarting}
          >
            <RotateCcw className="size-3.5" />
            Restart Agent
          </Button>
        </div>
      </div>

      <div className="flex w-full flex-col divide-y divide-border">
        {/* Current display */}
        <div className="px-8 py-6">
          <p className="mb-3 text-sm font-medium text-muted-foreground">
            Current Display
          </p>
          <div className="flex items-center gap-4 rounded-lg border border-border p-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
              <Music2 className="size-5 text-muted-foreground" />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium capitalize">
                {telemetry?.display_mode ?? "—"}
              </p>
              {nowPlaying?.is_playing ? (
                <p className="text-sm text-muted-foreground">
                  {nowPlaying.track_name} — {nowPlaying.artists.join(", ")}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Nothing playing</p>
              )}
            </div>
            <Link
              href="/display"
              className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent transition-colors"
            >
              <Monitor className="size-3.5" />
              Change display
            </Link>
          </div>
        </div>

        {/* System stats */}
        <div className="px-8 py-6">
          <p className="mb-4 text-sm font-medium text-muted-foreground">
            System
          </p>
          {stats ? (
            <div className="grid grid-cols-5 gap-3">
              {stats.map((s) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.label}
                    className="rounded-lg border border-border p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {s.label}
                      </span>
                      <Icon className="size-3.5 text-muted-foreground/40" />
                    </div>
                    <p className="text-2xl font-semibold tabular-nums tracking-tight">
                      {s.value}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {s.sub}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {primary?.is_online
                ? "Waiting for telemetry…"
                : "No device online."}
            </p>
          )}
        </div>

        {/* Activity */}
        <div className="px-8 py-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium">Activity</p>
            <Link
              href="/logs"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              View logs <ChevronRight className="size-3" />
            </Link>
          </div>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No activity yet — connect a device to see events.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              {activity.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0"
                >
                  <span className={`size-1.5 shrink-0 rounded-full ${a.dot}`} />
                  <span className="flex-1 text-sm">{a.msg}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {a.time}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
