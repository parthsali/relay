import { Clock, Cloud, Newspaper, Plug, Thermometer } from "lucide-react";
import { Button } from "@/components/ui/button";

const integrations = [
  {
    name: "Weather",
    desc: "Show live weather and forecasts.",
    icon: Cloud,
    connected: true,
  },
  {
    name: "Clock",
    desc: "Display current time and date.",
    icon: Clock,
    connected: true,
  },
  {
    name: "News",
    desc: "Scroll headlines from RSS feeds.",
    icon: Newspaper,
    connected: false,
  },
  {
    name: "System Stats",
    desc: "CPU, RAM, and temperature readouts.",
    icon: Thermometer,
    connected: true,
  },
];

export default function IntegrationsPage() {
  return (
    <div className="flex w-full flex-1 flex-col">
      <div className="flex w-full items-center justify-between border-b border-border px-8 py-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Integrations</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Connect external data sources to your display.
          </p>
        </div>
        <Button size="sm">
          <Plug className="size-3.5" />
          Browse
        </Button>
      </div>

      <div className="px-8 py-6">
        <div className="grid grid-cols-2 gap-3">
          {integrations.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.name}
                className="flex items-start gap-4 rounded-lg border border-border p-5"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Icon className="size-4 text-muted-foreground" />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{item.name}</p>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${item.connected ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"}`}
                    >
                      {item.connected ? "On" : "Off"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
