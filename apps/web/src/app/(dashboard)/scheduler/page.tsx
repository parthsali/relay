"use client";

import { Clock, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

type Schedule = {
  id: string;
  name: string;
  cron: string;
  mode: string;
  active: boolean;
  created_at: string;
};

export default function SchedulerPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [name, setName] = useState("");
  const [cron, setCron] = useState("");
  const [mode, setMode] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    const r = await apiFetch("/schedules");
    if (r.ok) {
      const j = await r.json();
      setSchedules(j.data?.schedules ?? []);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create() {
    if (!name || !cron || !mode) return;
    setSaving(true);
    await apiFetch("/schedules", {
      method: "POST",
      body: JSON.stringify({ name, cron, mode }),
    });
    setSaving(false);
    setName(""); setCron(""); setMode("");
    setShowForm(false);
    load();
  }

  async function toggle(s: Schedule) {
    await apiFetch(`/schedules/${s.id}/active`, {
      method: "PATCH",
      body: JSON.stringify({ active: !s.active }),
    });
    load();
  }

  async function remove(id: string) {
    await apiFetch(`/schedules/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="flex w-full flex-1 flex-col">
      <div className="flex w-full items-center justify-between border-b border-border px-8 py-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Scheduler</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Automate display changes based on time.</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="size-3.5" /> New schedule
        </Button>
      </div>

      <div className="flex flex-col gap-6 px-8 py-6">
        {showForm && (
          <div className="rounded-lg border border-border p-5">
            <p className="mb-4 text-sm font-medium">New schedule</p>
            <div className="flex flex-wrap gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Name</Label>
                <Input className="h-8 w-48 text-sm" placeholder="Morning clock" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Cron</Label>
                <Input className="h-8 w-36 font-mono text-sm" placeholder="0 7 * * *" value={cron} onChange={(e) => setCron(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Mode</Label>
                <Input className="h-8 w-36 text-sm" placeholder="clock" value={mode} onChange={(e) => setMode(e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button size="sm" disabled={saving || !name || !cron || !mode} onClick={create}>Save</Button>
              </div>
            </div>
          </div>
        )}

        {schedules.length === 0 ? (
          <p className="text-sm text-muted-foreground">No schedules yet.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            {schedules.map((s) => (
              <div key={s.id} className="flex items-center gap-4 border-b border-border px-4 py-4 last:border-0">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Clock className="size-4 text-muted-foreground" />
                </div>
                <div className="flex flex-1 flex-col gap-0.5">
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{s.cron} → {s.mode}</p>
                </div>
                <button type="button" onClick={() => toggle(s)}
                  className={`text-xs font-medium px-2 py-0.5 rounded-full cursor-pointer ${s.active ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"}`}>
                  {s.active ? "Active" : "Paused"}
                </button>
                <button type="button" onClick={() => remove(s.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
