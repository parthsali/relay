import { Button } from "@/components/ui/button";
import {
  Cpu, Thermometer, Wifi, Clock, RefreshCw,
  RotateCcw, Music2, Monitor, Zap, Power, ChevronRight,
} from "lucide-react";

const stats = [
  { label: "Uptime", value: "3d 12h", sub: "since last reboot", icon: Clock },
  { label: "CPU Usage", value: "8%", sub: "ARM Cortex-A53", icon: Cpu },
  { label: "RAM", value: "19%", sub: "373 MB / 1.8 GB", icon: Zap },
  { label: "Temperature", value: "46°C", sub: "normal · throttle at 80°C", icon: Thermometer },
  { label: "Wi-Fi", value: "−62 dBm", sub: "relay-home · 5 GHz", icon: Wifi },
];

const activity = [
  { time: "11:02 AM", msg: "Auto-brightness adjusted to 68%", dot: "bg-blue-500" },
  { time: "10:50 AM", msg: "Weather data refreshed", dot: "bg-emerald-500" },
  { time: "10:45 AM", msg: "Spotify: Blinding Lights → Starboy", dot: "bg-emerald-500" },
  { time: "10:42 AM", msg: "Display mode updated → Spotify", dot: "bg-emerald-500" },
  { time: "10:41 AM", msg: "Agent connected · relay-pi.local", dot: "bg-emerald-500" },
];

export default function HomePage() {
  return (
    <div className="flex w-full flex-1 flex-col">
      {/* Page header */}
      <div className="flex w-full items-center justify-between border-b border-border px-8 py-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">relay-pi.local</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              Online
            </span>
            <span className="text-border">·</span>
            192.168.1.42
            <span className="text-border">·</span>
            Raspberry Pi 4
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="size-3.5" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <RotateCcw className="size-3.5" />
            Restart Agent
          </Button>
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
            <Power className="size-3.5" />
            Shutdown
          </Button>
        </div>
      </div>

      <div className="flex w-full flex-col divide-y divide-border">
        {/* Current display */}
        <div className="px-8 py-6">
          <p className="mb-3 text-sm font-medium text-muted-foreground">Current Display</p>
          <div className="flex items-center gap-4 rounded-lg border border-border p-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
              <Music2 className="size-5 text-muted-foreground" />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium">Spotify</p>
              <p className="text-sm text-muted-foreground">Blinding Lights — The Weeknd</p>
            </div>
            <Button variant="outline" size="sm" className="ml-auto">
              <Monitor className="size-3.5" />
              Change display
            </Button>
          </div>
        </div>

        {/* System stats */}
        <div className="px-8 py-6">
          <p className="mb-4 text-sm font-medium text-muted-foreground">System</p>
          <div className="grid grid-cols-5 gap-3">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="rounded-lg border border-border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{s.label}</span>
                    <Icon className="size-3.5 text-muted-foreground/40" />
                  </div>
                  <p className="text-2xl font-semibold tabular-nums tracking-tight">{s.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{s.sub}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Activity */}
        <div className="px-8 py-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium">Activity</p>
            <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              View logs <ChevronRight className="size-3" />
            </button>
          </div>
          <div className="overflow-hidden rounded-lg border border-border">
            {activity.map((a, i) => (
              <div
                key={i}
                className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0"
              >
                <span className={`size-1.5 shrink-0 rounded-full ${a.dot}`} />
                <span className="flex-1 text-sm">{a.msg}</span>
                <span className="font-mono text-xs text-muted-foreground">{a.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
