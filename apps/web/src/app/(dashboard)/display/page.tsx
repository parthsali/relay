"use client";

import {
  BarChart2,
  CalendarDays,
  Clock,
  Cloud,
  Film,
  ImageIcon,
  Layers,
  Monitor,
  Music2,
  Play,
  Type,
} from "lucide-react";
import { useState } from "react";
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
import { cn } from "@/lib/utils";

const modes = [
  { id: "spotify", label: "Spotify", icon: Music2 },
  { id: "clock", label: "Clock", icon: Clock },
  { id: "weather", label: "Weather", icon: Cloud },
  { id: "image", label: "Image", icon: ImageIcon },
  { id: "gif", label: "GIF", icon: Film },
  { id: "text", label: "Text", icon: Type },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "stats", label: "CPU Stats", icon: BarChart2 },
  { id: "monitor", label: "System Monitor", icon: Monitor },
  { id: "slideshow", label: "Slideshow", icon: Layers },
];

function SpotifyConfig() {
  return (
    <div className="flex flex-col gap-4">
      {[
        ["Enable", true],
        ["Show Album Art", true],
        ["Show Song Name", true],
        ["Show Artist", true],
        ["Progress Bar", true],
        ["Background Blur", false],
        ["Auto Brightness", false],
      ].map(([label, def]) => (
        <div
          key={label as string}
          className="flex items-center justify-between"
        >
          <Label className="text-sm text-muted-foreground">
            {label as string}
          </Label>
          <Switch defaultChecked={def as boolean} />
        </div>
      ))}
      <div className="flex flex-col gap-1.5 pt-1">
        <Label className="text-sm text-muted-foreground">
          Refresh Interval
        </Label>
        <Select defaultValue="5">
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5 seconds</SelectItem>
            <SelectItem value="10">10 seconds</SelectItem>
            <SelectItem value="30">30 seconds</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function ClockConfig() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm text-muted-foreground">24-hour format</Label>
        <Switch />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-sm text-muted-foreground">Show Seconds</Label>
        <Switch defaultChecked />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-sm text-muted-foreground">Show Date</Label>
        <Switch defaultChecked />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-sm text-muted-foreground">Timezone</Label>
        <Select defaultValue="local">
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="local">Local</SelectItem>
            <SelectItem value="utc">UTC</SelectItem>
            <SelectItem value="ny">America/New_York</SelectItem>
            <SelectItem value="la">America/Los_Angeles</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-sm text-muted-foreground">Font</Label>
        <Select defaultValue="geist">
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="geist">Geist Mono</SelectItem>
            <SelectItem value="inter">Inter</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function WeatherConfig() {
  return (
    <div className="flex flex-col gap-4">
      {[
        ["Show Humidity", true],
        ["Show Wind", true],
        ["Show Forecast", false],
        ["Weather Icons", true],
      ].map(([label, def]) => (
        <div
          key={label as string}
          className="flex items-center justify-between"
        >
          <Label className="text-sm text-muted-foreground">
            {label as string}
          </Label>
          <Switch defaultChecked={def as boolean} />
        </div>
      ))}
      <div className="flex flex-col gap-1.5 pt-1">
        <Label className="text-sm text-muted-foreground">
          Temperature Unit
        </Label>
        <Select defaultValue="c">
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="c">Celsius</SelectItem>
            <SelectItem value="f">Fahrenheit</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

const configs: Record<string, React.FC> = {
  spotify: SpotifyConfig,
  clock: ClockConfig,
  weather: WeatherConfig,
};

export default function DisplayPage() {
  const [active, setActive] = useState("spotify");
  const Config = configs[active];

  return (
    <div className="flex h-full gap-0">
      {/* Mode picker */}
      <div className="flex w-56 shrink-0 flex-col border-r border-border overflow-y-auto px-2 py-4">
        <p className="mb-2 px-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/40">
          Mode
        </p>
        {modes.map((m) => {
          const Icon = m.icon;
          return (
            <button
              type="button"
              key={m.id}
              onClick={() => setActive(m.id)}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-left transition-colors w-full",
                active === m.id
                  ? "bg-sidebar-accent text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60",
              )}
            >
              <Icon
                className={cn(
                  "size-3.75 shrink-0",
                  active === m.id
                    ? "text-foreground"
                    : "text-muted-foreground/50",
                )}
              />
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Config panel */}
      <div className="flex flex-1 flex-col gap-8 px-10 py-9 overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold capitalize">{active}</h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              Configure display settings
            </p>
          </div>
          <Button size="sm">
            <Play className="size-3.5" />
            Apply
          </Button>
        </div>

        <div className="max-w-xs">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-widest text-muted-foreground/40">
            Options
          </p>
          <div className="flex flex-col gap-px rounded-xl border border-border overflow-hidden bg-border">
            <div className="bg-card px-4 py-4">
              {Config ? (
                <Config />
              ) : (
                <p className="text-[13px] text-muted-foreground">
                  No options for this mode.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
