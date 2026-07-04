"use client";

import { Download } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useWebSocket } from "@/hooks/use-websocket";

type LogEntry = { ts: string; level: string; msg: string };

const levelColor: Record<string, string> = {
  INFO: "text-blue-400",
  WARN: "text-yellow-400",
  ERROR: "text-red-400",
  DEBUG: "text-muted-foreground",
};

function fmtTime(d: Date) {
  return d.toTimeString().slice(0, 8);
}

function msgFromEvent(
  type: string,
  data: unknown,
): { level: string; msg: string } | null {
  const d = data as Record<string, unknown>;
  if (type === "device.online")
    return {
      level: "INFO",
      msg: `Agent connected · device ${String(d.device_id ?? "").slice(0, 8)}… (${d.name ?? ""})`,
    };
  if (type === "device.offline")
    return {
      level: "WARN",
      msg: `Agent disconnected · device ${String(d.device_id ?? "").slice(0, 8)}…`,
    };
  if (type === "device.telemetry")
    return {
      level: "DEBUG",
      msg: `Telemetry · CPU ${Number(d.cpu_percent ?? 0).toFixed(1)}% · ${Number(d.temp_c ?? 0).toFixed(1)}°C · ${d.ip_address ?? ""}`,
    };
  if (type === "spotify.now_playing") {
    const t = d as { title?: string; artist?: string };
    return {
      level: "INFO",
      msg: `Now playing · ${t.title ?? "—"} — ${t.artist ?? "—"}`,
    };
  }
  if (type === "spotify.idle")
    return { level: "INFO", msg: "Spotify idle — nothing playing" };
  if (type === "spotify.error")
    return { level: "ERROR", msg: `Spotify error · ${d.message ?? "unknown"}` };
  return null;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useWebSocket({
    onMessage: (msg) => {
      const entry = msgFromEvent(msg.type, msg.data);
      if (!entry) return;
      setLogs((prev) => [
        ...prev.slice(-199),
        { ts: fmtTime(new Date()), ...entry },
      ]);
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  function exportLogs() {
    const text = logs
      .map((l) => `${l.ts}  ${l.level.padEnd(5)}  ${l.msg}`)
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    a.download = `relay-logs-${Date.now()}.txt`;
    a.click();
  }

  return (
    <div className="flex w-full flex-1 flex-col">
      <div className="flex w-full items-center justify-between border-b border-border px-8 py-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Logs</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Live agent and system log output.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={exportLogs}
          disabled={logs.length === 0}
        >
          <Download className="size-3.5" /> Export
        </Button>
      </div>

      <div className="flex flex-1 flex-col px-8 py-6">
        <div className="flex-1 overflow-auto rounded-lg border border-border bg-muted/30 p-4 font-mono text-xs leading-relaxed">
          {logs.length === 0 ? (
            <p className="text-muted-foreground/40">Waiting for events…</p>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="flex gap-4 py-0.5">
                <span className="shrink-0 text-muted-foreground/50">
                  {log.ts}
                </span>
                <span
                  className={`w-12 shrink-0 font-semibold ${levelColor[log.level] ?? "text-foreground"}`}
                >
                  {log.level}
                </span>
                <span className="text-foreground/80">{log.msg}</span>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
