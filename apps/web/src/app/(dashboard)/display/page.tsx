"use client";

import {
  BarChart2,
  CalendarDays,
  Clock,
  Cloud,
  Film,
  ImageIcon,
  Layers,
  Loader2,
  Monitor,
  Music2,
  Play,
  Type,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useWebSocket } from "@/hooks/use-websocket";
import { cn } from "@/lib/utils";

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

const modes = [
  {
    id: "spotify",
    label: "Spotify",
    icon: Music2,
    desc: "Now playing with album art",
  },
  { id: "clock", label: "Clock", icon: Clock, desc: "Time and date display" },
  {
    id: "weather",
    label: "Weather",
    icon: Cloud,
    desc: "Live conditions and forecast",
  },
  {
    id: "image",
    label: "Image",
    icon: ImageIcon,
    desc: "Static image from assets",
  },
  { id: "gif", label: "GIF", icon: Film, desc: "Animated GIF loop" },
  {
    id: "text",
    label: "Text",
    icon: Type,
    desc: "Scrolling or static message",
  },
  {
    id: "calendar",
    label: "Calendar",
    icon: CalendarDays,
    desc: "Upcoming events",
  },
  {
    id: "stats",
    label: "CPU Stats",
    icon: BarChart2,
    desc: "CPU, RAM, temperature",
  },
  {
    id: "monitor",
    label: "System Monitor",
    icon: Monitor,
    desc: "Full system readout",
  },
  {
    id: "slideshow",
    label: "Slideshow",
    icon: Layers,
    desc: "Cycle through images",
  },
];

// ── Reusable row components ───────────────────────────────────────────────────

function ToggleRow({
  label,
  defaultChecked,
}: {
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border px-5 py-3.5 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}

function SelectRow({
  label,
  defaultValue,
  options,
}: {
  label: string;
  defaultValue: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center justify-between border-b border-border px-5 py-3 last:border-0">
      <Label className="text-sm text-muted-foreground">{label}</Label>
      <Select defaultValue={defaultValue}>
        <SelectTrigger className="h-7 w-36 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ── Mode config panels ────────────────────────────────────────────────────────

function SpotifyConfig() {
  return (
    <>
      <ToggleRow label="Show Album Art" defaultChecked />
      <ToggleRow label="Show Song Name" defaultChecked />
      <ToggleRow label="Show Artist" defaultChecked />
      <ToggleRow label="Progress Bar" defaultChecked />
      <ToggleRow label="Background Blur" />
      <ToggleRow label="Auto Brightness" />
      <SelectRow
        label="Refresh Interval"
        defaultValue="5"
        options={[
          { value: "5", label: "5 seconds" },
          { value: "10", label: "10 seconds" },
          { value: "30", label: "30 seconds" },
        ]}
      />
    </>
  );
}

function ClockConfig() {
  return (
    <>
      <ToggleRow label="24-hour format" />
      <ToggleRow label="Show Seconds" defaultChecked />
      <ToggleRow label="Show Date" defaultChecked />
      <SelectRow
        label="Timezone"
        defaultValue="local"
        options={[
          { value: "local", label: "Local" },
          { value: "utc", label: "UTC" },
          { value: "ny", label: "America/New_York" },
          { value: "la", label: "America/Los_Angeles" },
        ]}
      />
      <SelectRow
        label="Font"
        defaultValue="geist"
        options={[
          { value: "geist", label: "Geist Mono" },
          { value: "inter", label: "Inter" },
        ]}
      />
    </>
  );
}

function WeatherConfig() {
  return (
    <>
      <ToggleRow label="Show Humidity" defaultChecked />
      <ToggleRow label="Show Wind" defaultChecked />
      <ToggleRow label="Show Forecast" />
      <ToggleRow label="Weather Icons" defaultChecked />
      <SelectRow
        label="Temperature"
        defaultValue="c"
        options={[
          { value: "c", label: "Celsius" },
          { value: "f", label: "Fahrenheit" },
        ]}
      />
    </>
  );
}

const configs: Record<string, React.FC> = {
  spotify: SpotifyConfig,
  clock: ClockConfig,
  weather: WeatherConfig,
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DisplayPage() {
  const [active, setActive] = useState("spotify");
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  const activeMode = modes.find((m) => m.id === active) ?? modes[0];
  const Config = configs[active];

  useWebSocket({
    onMessage: (msg) => {
      if (msg.type === "device.telemetry") {
        const d = msg.data as { device_id?: string };
        if (d.device_id) setDeviceId(d.device_id);
      }
      if (msg.type === "device.online") {
        const d = msg.data as { device_id?: string; name?: string };
        if (d.device_id) setDeviceId(d.device_id);
        if (d.name) setDeviceName(d.name);
      }
      if (msg.type === "device.offline") {
        setDeviceId(null);
        setDeviceName(null);
      }
    },
  });

  async function apply() {
    if (!deviceId) {
      toast.error("No device connected");
      return;
    }
    setApplying(true);
    const r = await apiFetch(`/devices/${deviceId}/command`, {
      method: "POST",
      body: JSON.stringify({ type: "display.set_mode", mode: active }),
    });
    setApplying(false);
    if (r.ok) toast.success(`Mode set to ${active}`);
    else toast.error("Failed to apply mode");
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-8 py-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Display</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Choose a mode and push it to the device.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {deviceId ? (
            <div className="flex items-center gap-1.5">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
              </span>
              <span className="text-xs text-muted-foreground">
                {deviceName ?? `${deviceId.slice(0, 8)}…`}
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground/50">No device</span>
          )}
          <Button size="sm" onClick={apply} disabled={applying || !deviceId}>
            {applying ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Play className="size-3.5" />
            )}
            Apply
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Mode list */}
        <div className="flex w-52 shrink-0 flex-col overflow-y-auto border-r border-border py-3">
          {modes.map((m) => {
            const Icon = m.icon;
            const isActive = active === m.id;
            return (
              <button
                type="button"
                key={m.id}
                onClick={() => setActive(m.id)}
                className={cn(
                  "group flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                  isActive
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "size-3.5 shrink-0",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground/50 group-hover:text-muted-foreground",
                  )}
                />
                <span className="text-[13px] font-medium">{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Config panel */}
        <div className="flex flex-1 flex-col overflow-y-auto">
          {/* Mode header */}
          <div className="border-b border-border px-8 py-5">
            <p className="text-[15px] font-semibold">{activeMode.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {activeMode.desc}
            </p>
          </div>

          {/* Options */}
          {Config ? (
            <div className="overflow-hidden">
              <Config />
            </div>
          ) : (
            <div className="px-8 py-6">
              <p className="text-sm text-muted-foreground">
                No options for this mode.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
