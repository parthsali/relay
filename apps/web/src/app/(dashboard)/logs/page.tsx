import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const logs = [
  { ts: "11:02:34", level: "INFO", msg: "Auto-brightness adjusted to 68%" },
  { ts: "10:50:01", level: "INFO", msg: "Weather data refreshed successfully" },
  { ts: "10:45:22", level: "INFO", msg: "Spotify track changed: Blinding Lights → Starboy" },
  { ts: "10:42:10", level: "INFO", msg: "Display mode updated → Spotify" },
  { ts: "10:41:55", level: "INFO", msg: "Agent connected · relay-pi.local" },
  { ts: "10:41:50", level: "DEBUG", msg: "JWT verified for user parth@example.com" },
  { ts: "10:40:00", level: "WARN", msg: "CPU temperature approaching 70°C" },
  { ts: "10:38:12", level: "INFO", msg: "Scheduled task triggered: Work Hours Stats" },
  { ts: "10:30:00", level: "ERROR", msg: "Failed to reach weather API — retrying in 60s" },
];

const levelColor: Record<string, string> = {
  INFO: "text-blue-400",
  DEBUG: "text-muted-foreground",
  WARN: "text-yellow-400",
  ERROR: "text-red-400",
};

export default function LogsPage() {
  return (
    <div className="flex w-full flex-1 flex-col">
      <div className="flex w-full items-center justify-between border-b border-border px-8 py-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Logs</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Live agent and system log output.</p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="size-3.5" />
          Export
        </Button>
      </div>

      <div className="flex flex-1 flex-col px-8 py-6">
        <div className="flex-1 overflow-auto rounded-lg border border-border bg-muted/30 p-4 font-mono text-xs leading-relaxed">
          {logs.map((log, i) => (
            <div key={i} className="flex gap-4 py-0.5">
              <span className="shrink-0 text-muted-foreground/50">{log.ts}</span>
              <span className={`w-12 shrink-0 font-semibold ${levelColor[log.level]}`}>{log.level}</span>
              <span className="text-foreground/80">{log.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
