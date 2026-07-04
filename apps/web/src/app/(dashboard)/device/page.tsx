"use client";

import { useState, useEffect, useCallback } from "react";
import { Cpu, Thermometer, Wifi, Clock, Plus, Trash2, Copy, Check, RotateCcw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWebSocket } from "@/hooks/use-websocket";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001";

function getToken() {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(/(?:^|;\s*)relay_token=([^;]+)/);
  return m?.[1] ?? "";
}

async function apiFetch(path: string, opts?: RequestInit) {
  return fetch(`${API}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json", ...opts?.headers },
  });
}

type Device = {
  id: string;
  name: string;
  created_at: string;
  is_online: boolean;
};

type Telemetry = {
  cpu_percent: number;
  mem_mb: number;
  temp_c: number;
  uptime_s: number;
  wifi_dbm: number;
  ip_address: string;
  display_mode: string;
  brightness: number;
  agent_version: string;
};

function fmtUptime(s: number) {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function DevicePage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [telemetry, setTelemetry] = useState<Record<string, Telemetry>>({});
  const [name, setName] = useState("");
  const [registering, setRegistering] = useState(false);
  const [secret, setSecret] = useState<{ id: string; secret: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchDevices = useCallback(async () => {
    const r = await apiFetch("/devices");
    if (r.ok) {
      const j = await r.json();
      setDevices(j.data?.devices ?? []);
    }
  }, []);

  useEffect(() => { fetchDevices(); }, [fetchDevices]);

  useWebSocket({
    onMessage: (msg) => {
      if (msg.type === "device.telemetry") {
        const { device_id, ...stats } = msg.data;
        setTelemetry((prev) => ({ ...prev, [device_id]: stats }));
      }
      if (msg.type === "device.online" || msg.type === "device.offline") {
        fetchDevices();
      }
    },
  });

  async function register() {
    if (!name.trim()) return;
    setRegistering(true);
    const r = await apiFetch("/devices/register", { method: "POST", body: JSON.stringify({ name }) });
    setRegistering(false);
    if (r.ok) {
      const j = await r.json();
      setSecret({ id: j.data.device.id, secret: j.data.secret });
      setName("");
      fetchDevices();
    }
  }

  async function deleteDevice(id: string) {
    await apiFetch(`/devices/${id}`, { method: "DELETE" });
    fetchDevices();
  }

  async function restartDevice(id: string) {
    await apiFetch(`/devices/${id}/command`, {
      method: "POST",
      body: JSON.stringify({ type: "agent.restart" }),
    });
  }

  function copySecret() {
    if (!secret) return;
    navigator.clipboard.writeText(secret.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex w-full flex-1 flex-col">
      <div className="border-b border-border px-8 py-6">
        <h1 className="text-xl font-semibold tracking-tight">Devices</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Register and monitor Relay Pi agents.</p>
      </div>

      <div className="flex flex-col divide-y divide-border">
        {/* Register */}
        <div className="px-8 py-6">
          <p className="mb-3 text-sm font-medium text-muted-foreground">Register new device</p>
          <div className="flex items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="device-name" className="text-xs">Device name</Label>
              <Input id="device-name" placeholder="relay-pi" value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && register()}
                className="h-8 w-52 text-sm" />
            </div>
            <Button size="sm" onClick={register} disabled={registering || !name.trim()}>
              <Plus className="size-3.5" /> Register
            </Button>
          </div>

          {secret && (
            <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
              <p className="mb-2 text-xs font-medium text-amber-600 dark:text-amber-400">
                Save this secret — it won&apos;t be shown again.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 overflow-x-auto rounded bg-muted px-3 py-2 font-mono text-xs">
                  RELAY_DEVICE_ID={secret.id}{"\n"}RELAY_DEVICE_SECRET={secret.secret}
                </code>
                <Button variant="outline" size="sm" onClick={copySecret}>
                  {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Device list */}
        <div className="px-8 py-6">
          <p className="mb-3 text-sm font-medium text-muted-foreground">Registered devices</p>
          {devices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No devices registered yet.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {devices.map((d) => {
                const t = telemetry[d.id];
                const online = d.is_online;
                return (
                  <div key={d.id} className="overflow-hidden rounded-lg border border-border">
                    {/* header */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <span className={`relative flex size-2 shrink-0 ${online ? "" : "opacity-40"}`}>
                        {online && <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />}
                        <span className={`relative inline-flex size-2 rounded-full ${online ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                      </span>
                      <div>
                        <p className="text-sm font-medium">{d.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">{d.id.slice(0, 8)}…</p>
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        {online && (
                          <Button variant="outline" size="sm" onClick={() => restartDevice(d.id)}>
                            <RotateCcw className="size-3.5" /> Restart
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive"
                          onClick={() => deleteDevice(d.id)}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* telemetry */}
                    {t && (
                      <div className="grid grid-cols-5 gap-px border-t border-border bg-border">
                        {[
                          { icon: Cpu, label: "CPU", value: `${t.cpu_percent.toFixed(1)}%` },
                          { icon: Zap, label: "RAM", value: `${t.mem_mb.toFixed(0)} MB` },
                          { icon: Thermometer, label: "Temp", value: `${t.temp_c.toFixed(1)}°C` },
                          { icon: Clock, label: "Uptime", value: fmtUptime(t.uptime_s) },
                          { icon: Wifi, label: "Wi-Fi", value: t.wifi_dbm ? `${t.wifi_dbm} dBm` : t.ip_address },
                        ].map(({ icon: Icon, label, value }) => (
                          <div key={label} className="flex flex-col gap-1 bg-background px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <Icon className="size-3 text-muted-foreground/50" />
                              <span className="text-xs text-muted-foreground">{label}</span>
                            </div>
                            <p className="text-sm font-semibold tabular-nums">{value}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {!t && online && (
                      <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
                        Waiting for telemetry…
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
