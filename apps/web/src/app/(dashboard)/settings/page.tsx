"use client";

import { Check, Loader2, Pencil, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

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

type Device = {
  id: string;
  name: string;
  agent_version: string | null;
  last_seen_at: string | null;
  created_at: string;
  is_online: boolean;
};

type DeviceState = {
  display_mode: string;
  brightness: number;
  ip_address: string;
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center border-b border-border px-5 py-3.5 last:border-0">
      <p className="w-44 shrink-0 text-sm text-muted-foreground">{label}</p>
      <p className="flex-1 text-sm">
        {value ?? <span className="text-muted-foreground/40">—</span>}
      </p>
    </div>
  );
}

function EditableRow({
  label,
  value,
  onSave,
}: {
  label: string;
  value: string;
  onSave: (next: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  async function save() {
    if (!draft.trim() || draft === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    await onSave(draft.trim());
    setSaving(false);
    setEditing(false);
  }

  return (
    <div className="flex items-center border-b border-border px-5 py-3 last:border-0">
      <p className="w-44 shrink-0 text-sm text-muted-foreground">{label}</p>
      {editing ? (
        <div className="flex flex-1 items-center gap-2">
          <Input
            className="h-7 flex-1 text-sm"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setEditing(false);
            }}
            autoFocus
          />
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {saving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Check className="size-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <>
          <p className="flex-1 text-sm">{value}</p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="size-3.5" />
          </button>
        </>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [states, setStates] = useState<Record<string, DeviceState>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const r = await apiFetch("/devices");
    if (r.ok) {
      const j = await r.json();
      const devs: Device[] = j.data?.devices ?? [];
      setDevices(devs);
      // Fetch state for each device in parallel
      const stateEntries = await Promise.all(
        devs.map(async (d) => {
          const sr = await apiFetch(`/devices/${d.id}/state`);
          if (sr.ok) {
            const sj = await sr.json();
            return [d.id, sj.data] as [string, DeviceState];
          }
          return null;
        }),
      );
      const stateMap: Record<string, DeviceState> = {};
      for (const entry of stateEntries) {
        if (entry) stateMap[entry[0]] = entry[1];
      }
      setStates(stateMap);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function renameDevice(id: string, name: string) {
    const r = await apiFetch(`/devices/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
    if (r.ok) {
      toast.success("Device renamed");
      load();
    } else toast.error("Failed to rename device");
  }

  async function deleteDevice(id: string) {
    if (!confirm("Remove this device? The agent will need to re-register."))
      return;
    const r = await apiFetch(`/devices/${id}`, { method: "DELETE" });
    if (r.ok) {
      toast.success("Device removed");
      load();
    } else toast.error("Failed to remove device");
  }

  return (
    <div className="flex w-full flex-1 flex-col">
      <div className="border-b border-border px-8 py-6">
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Manage your registered devices.
        </p>
      </div>

      <div className="flex flex-col gap-8 px-8 py-6">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> Loading…
          </div>
        ) : devices.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No devices registered yet. Use the agent to register one.
          </p>
        ) : (
          devices.map((d) => {
            const state = states[d.id];
            return (
              <div key={d.id}>
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`size-1.5 rounded-full ${d.is_online ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
                    />
                    <p className="text-sm font-medium text-muted-foreground">
                      {d.is_online ? "Online" : "Offline"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteDevice(d.id)}
                    className="text-xs text-muted-foreground/50 hover:text-destructive transition-colors"
                  >
                    Remove device
                  </button>
                </div>
                <div className="overflow-hidden rounded-lg border border-border">
                  <EditableRow
                    label="Device name"
                    value={d.name}
                    onSave={(name) => renameDevice(d.id, name)}
                  />
                  <InfoRow
                    label="Device ID"
                    value={<span className="font-mono text-xs">{d.id}</span>}
                  />
                  <InfoRow
                    label="Agent version"
                    value={d.agent_version ?? "unknown"}
                  />
                  <InfoRow
                    label="IP address"
                    value={state?.ip_address || "—"}
                  />
                  <InfoRow label="Display mode" value={state?.display_mode} />
                  <InfoRow
                    label="Brightness"
                    value={state ? `${state.brightness}%` : undefined}
                  />
                  <InfoRow
                    label="Last seen"
                    value={
                      d.last_seen_at
                        ? new Date(d.last_seen_at).toLocaleString()
                        : "Never"
                    }
                  />
                  <InfoRow
                    label="Registered"
                    value={new Date(d.created_at).toLocaleDateString()}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
