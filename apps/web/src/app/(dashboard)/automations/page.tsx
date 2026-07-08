"use client";

import { Plus, Trash2, Zap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
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

type Automation = {
  id: string;
  name: string;
  trigger_type: string;
  trigger_value: string | null;
  action_type: string;
  action_value: string;
  active: boolean;
};

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState("");
  const [actionType, setActionType] = useState("");
  const [actionValue, setActionValue] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const r = await apiFetch("/automations");
    if (r.ok) {
      const j = await r.json();
      setAutomations(j.data?.automations ?? []);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    if (!name || !triggerType || !actionType || !actionValue) return;
    setSaving(true);
    const r = await apiFetch("/automations", {
      method: "POST",
      body: JSON.stringify({
        name,
        trigger_type: triggerType,
        action_type: actionType,
        action_value: actionValue,
      }),
    });
    setSaving(false);
    if (r.ok) {
      toast.success("Automation created");
      setName("");
      setTriggerType("");
      setActionType("");
      setActionValue("");
      setShowForm(false);
      load();
    } else {
      toast.error("Failed to create automation");
    }
  }

  async function toggle(a: Automation) {
    const r = await apiFetch(`/automations/${a.id}/active`, {
      method: "PATCH",
      body: JSON.stringify({ active: !a.active }),
    });
    if (r.ok) {
      toast.success(a.active ? "Automation paused" : "Automation activated");
      load();
    } else {
      toast.error("Failed to update automation");
    }
  }

  async function remove(id: string) {
    const r = await apiFetch(`/automations/${id}`, { method: "DELETE" });
    if (r.ok) {
      toast.success("Automation deleted");
      load();
    } else toast.error("Failed to delete automation");
  }

  return (
    <div className="flex w-full flex-1 flex-col">
      <div className="flex w-full items-center justify-between border-b border-border px-8 py-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Automations</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Trigger display changes automatically based on conditions.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="size-3.5" /> New automation
        </Button>
      </div>

      <div className="flex flex-col gap-6 px-8 py-6">
        {showForm && (
          <div className="rounded-lg border border-border p-5">
            <p className="mb-4 text-sm font-medium">New automation</p>
            <div className="flex flex-wrap gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Name</Label>
                <Input
                  className="h-8 w-44 text-sm"
                  placeholder="Spotify Playing"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Trigger</Label>
                <Input
                  className="h-8 w-36 text-sm"
                  placeholder="spotify.playing"
                  value={triggerType}
                  onChange={(e) => setTriggerType(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Action type</Label>
                <Input
                  className="h-8 w-36 text-sm"
                  placeholder="display.set_mode"
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Action value</Label>
                <Input
                  className="h-8 w-36 text-sm"
                  placeholder="spotify"
                  value={actionValue}
                  onChange={(e) => setActionValue(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button
                  size="sm"
                  disabled={
                    saving ||
                    !name ||
                    !triggerType ||
                    !actionType ||
                    !actionValue
                  }
                  onClick={create}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        )}

        {automations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No automations yet.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            {automations.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-4 border-b border-border px-4 py-4 last:border-0"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Zap className="size-4 text-muted-foreground" />
                </div>
                <div className="flex flex-1 flex-col gap-0.5">
                  <p className="text-sm font-medium">{a.name}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-foreground/60">{a.trigger_type}</span>
                    {" → "}
                    {a.action_value}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggle(a)}
                  className={`text-xs font-medium px-2 py-0.5 rounded-full cursor-pointer ${a.active ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"}`}
                >
                  {a.active ? "Active" : "Paused"}
                </button>
                <button
                  type="button"
                  onClick={() => remove(a.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
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
