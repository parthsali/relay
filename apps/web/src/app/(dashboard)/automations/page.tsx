import { Zap, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const automations = [
  { name: "Spotify Playing", trigger: "Spotify starts playing", action: "Switch to Now Playing scene", active: true },
  { name: "Work Hours", trigger: "Mon–Fri 09:00", action: "Show System Stats", active: true },
  { name: "Night Mode", trigger: "Every day at 22:00", action: "Dim display to 10%", active: false },
  { name: "High CPU", trigger: "CPU > 80%", action: "Show alert overlay", active: true },
];

export default function AutomationsPage() {
  return (
    <div className="flex w-full flex-1 flex-col">
      <div className="flex w-full items-center justify-between border-b border-border px-8 py-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Automations</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Trigger display changes automatically based on conditions.</p>
        </div>
        <Button size="sm">
          <Plus className="size-3.5" />
          New automation
        </Button>
      </div>

      <div className="px-8 py-6">
        <div className="overflow-hidden rounded-lg border border-border">
          {automations.map((a, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-border px-4 py-4 last:border-0">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                <Zap className="size-4 text-muted-foreground" />
              </div>
              <div className="flex flex-1 flex-col gap-0.5">
                <p className="text-sm font-medium">{a.name}</p>
                <p className="text-xs text-muted-foreground">
                  <span className="text-foreground/60">{a.trigger}</span>
                  {" → "}
                  {a.action}
                </p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${a.active ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"}`}>
                {a.active ? "Active" : "Paused"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
