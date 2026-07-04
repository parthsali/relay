import { Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const schedules = [
  {
    id: 1,
    name: "Morning Clock",
    trigger: "Every day at 07:00",
    scene: "Clock — Full Screen",
    active: true,
  },
  {
    id: 2,
    name: "Work Hours Stats",
    trigger: "Mon–Fri 09:00–18:00",
    scene: "System Stats",
    active: true,
  },
  {
    id: 3,
    name: "Night Dim",
    trigger: "Every day at 22:00",
    scene: "Dim Display",
    active: false,
  },
];

export default function SchedulerPage() {
  return (
    <div className="flex w-full flex-1 flex-col">
      <div className="flex w-full items-center justify-between border-b border-border px-8 py-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Scheduler</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Automate display changes based on time.
          </p>
        </div>
        <Button size="sm">
          <Plus className="size-3.5" />
          New schedule
        </Button>
      </div>

      <div className="px-8 py-6">
        <div className="overflow-hidden rounded-lg border border-border">
          {schedules.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-4 border-b border-border px-4 py-4 last:border-0"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                <Clock className="size-4 text-muted-foreground" />
              </div>
              <div className="flex flex-1 flex-col gap-0.5">
                <p className="text-sm font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground">
                  {s.trigger} → {s.scene}
                </p>
              </div>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.active ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"}`}
              >
                {s.active ? "Active" : "Paused"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
