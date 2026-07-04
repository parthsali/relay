"use client";

import { Cpu, Thermometer, Wifi, Zap } from "lucide-react";
import { useState } from "react";
import { useWebSocket } from "@/hooks/use-websocket";

type Telemetry = {
  cpu_percent: number;
  mem_mb: number;
  temp_c: number;
  uptime_s: number;
  wifi_dbm: number;
  ip_address: string;
  device_id: string;
};

type DeviceStatus = { device_id: string; online: boolean };

function bar(pct: number, warn: number, bad: number) {
  if (pct >= bad) return "bg-red-500";
  if (pct >= warn) return "bg-yellow-500";
  return "bg-emerald-500";
}

export default function HealthPage() {
  const [telem, setTelem] = useState<Telemetry | null>(null);
  const [devices, setDevices] = useState<Record<string, DeviceStatus>>({});

  useWebSocket({
    onMessage: (msg) => {
      if (msg.type === "device.telemetry") {
        setTelem(msg.data as Telemetry);
      }
      if (msg.type === "device.online") {
        const d = msg.data as { device_id: string };
        setDevices((p) => ({
          ...p,
          [d.device_id]: { device_id: d.device_id, online: true },
        }));
      }
      if (msg.type === "device.offline") {
        const d = msg.data as { device_id: string };
        setDevices((p) => ({
          ...p,
          [d.device_id]: { device_id: d.device_id, online: false },
        }));
      }
    },
  });

  const cpu = telem?.cpu_percent ?? 0;
  const mem = telem?.mem_mb ?? 0;
  const temp = telem?.temp_c ?? 0;
  const wifi = telem ? Math.abs(telem.wifi_dbm) : 0;
  const deviceOnline = Object.values(devices).some((d) => d.online);

  const metrics = [
    {
      label: "CPU Usage",
      value: telem ? `${cpu.toFixed(1)}%` : "—",
      pct: cpu,
      warn: 70,
      bad: 90,
      icon: Cpu,
    },
    {
      label: "RAM Usage",
      value: telem ? `${mem.toFixed(0)} MB` : "—",
      pct: Math.min(mem / 5, 100),
      warn: 60,
      bad: 85,
      icon: Zap,
    },
    {
      label: "Temperature",
      value: telem ? `${temp.toFixed(1)}°C` : "—",
      pct: Math.min((temp / 85) * 100, 100),
      warn: 65,
      bad: 80,
      icon: Thermometer,
    },
    {
      label: "Wi-Fi Signal",
      value: telem ? `${telem.wifi_dbm} dBm` : "—",
      pct: Math.min(wifi, 100),
      warn: 70,
      bad: 85,
      icon: Wifi,
    },
  ];

  const checks = [
    { check: "Agent connected", ok: deviceOnline },
    { check: "Telemetry received", ok: !!telem },
    { check: "Network reachable", ok: deviceOnline },
    { check: "Temperature < 80°C", ok: !telem || temp < 80 },
    { check: "CPU < 90%", ok: !telem || cpu < 90 },
  ];

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
            const color = bar(m.pct, m.warn, m.bad);
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
                    className={`h-full rounded-full transition-all ${color}`}
                    style={{ width: `${m.pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div>
          <p className="mb-3 text-sm font-medium text-muted-foreground">
            Status checks
          </p>
          <div className="overflow-hidden rounded-lg border border-border">
            {checks.map((c) => (
              <div
                key={c.check}
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
