import { Cpu, Thermometer, Wifi, Zap } from "lucide-react";

const metrics = [
  { label: "CPU Usage", value: "8%", max: 8, status: "good", icon: Cpu },
  { label: "RAM Usage", value: "19%", max: 19, status: "good", icon: Zap },
  {
    label: "Temperature",
    value: "46°C",
    max: 58,
    status: "good",
    icon: Thermometer,
  },
  {
    label: "Wi-Fi Signal",
    value: "−62 dBm",
    max: 78,
    status: "good",
    icon: Wifi,
  },
];

const statusColor: Record<string, string> = {
  good: "bg-emerald-500",
  warn: "bg-yellow-500",
  bad: "bg-red-500",
};

export default function HealthPage() {
  return (
    <div className="flex w-full flex-1 flex-col">
      <div className="border-b border-border px-8 py-6">
        <h1 className="text-xl font-semibold tracking-tight">Health</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Real-time system performance metrics.
        </p>
      </div>

      <div className="flex flex-col gap-6 px-8 py-6">
        <div className="grid grid-cols-4 gap-3">
          {metrics.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.label}
                className="rounded-lg border border-border p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {m.label}
                  </span>
                  <Icon className="size-3.5 text-muted-foreground/40" />
                </div>
                <p className="text-2xl font-semibold tabular-nums">{m.value}</p>
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${statusColor[m.status]}`}
                    style={{ width: `${m.max}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Status checks */}
        <div>
          <p className="mb-3 text-sm font-medium text-muted-foreground">
            Status checks
          </p>
          <div className="overflow-hidden rounded-lg border border-border">
            {[
              { check: "Agent process", ok: true },
              { check: "Display output", ok: true },
              { check: "Network reachable", ok: true },
              { check: "Disk space ≥ 10%", ok: true },
              { check: "Temperature < 80°C", ok: true },
            ].map((c, i) => (
              <div
                key={i}
                className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0"
              >
                <span
                  className={`size-1.5 rounded-full ${c.ok ? "bg-emerald-500" : "bg-red-500"}`}
                />
                <span className="flex-1 text-sm">{c.check}</span>
                <span
                  className={`text-xs font-medium ${c.ok ? "text-emerald-500" : "text-red-500"}`}
                >
                  {c.ok ? "Pass" : "Fail"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
