"use client";

import { Clock, GripVertical, Plus, Trash2, X } from "lucide-react";
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

type QueueItem = {
  id: string;
  title: string;
  source: string;
  duration_s: number | null;
  position: number;
};

export default function QueuePage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const r = await apiFetch("/queue");
    if (r.ok) {
      const j = await r.json();
      setItems(j.data?.items ?? []);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!title || !source) return;
    setSaving(true);
    await apiFetch("/queue", {
      method: "POST",
      body: JSON.stringify({ title, source, position: items.length }),
    });
    setSaving(false);
    setTitle(""); setSource("");
    setShowForm(false);
    load();
  }

  async function remove(id: string) {
    await apiFetch(`/queue/${id}`, { method: "DELETE" });
    load();
  }

  async function clear() {
    await apiFetch("/queue", { method: "DELETE" });
    load();
  }

  function fmt(s: number | null) {
    if (!s) return "—";
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m`;
  }

  return (
    <div className="flex w-full flex-1 flex-col">
      <div className="flex w-full items-center justify-between border-b border-border px-8 py-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Queue</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Manage what displays next on your screen.</p>
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <Button variant="outline" size="sm" onClick={clear}>
              <X className="size-3.5" /> Clear
            </Button>
          )}
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="size-3.5" /> Add item
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-6 px-8 py-6">
        {showForm && (
          <div className="rounded-lg border border-border p-5">
            <p className="mb-4 text-sm font-medium">Add queue item</p>
            <div className="flex flex-wrap gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Title</Label>
                <Input className="h-8 w-52 text-sm" placeholder="Spotify — Now Playing" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Source</Label>
                <Input className="h-8 w-36 text-sm" placeholder="spotify" value={source} onChange={(e) => setSource(e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button size="sm" disabled={saving || !title || !source} onClick={add}>Add</Button>
              </div>
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Queue is empty.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            {items.map((item, i) => (
              <div key={item.id} className="flex items-center gap-4 border-b border-border px-4 py-3.5 last:border-0">
                <GripVertical className="size-4 shrink-0 text-muted-foreground/30" />
                <span className="w-5 text-center font-mono text-xs text-muted-foreground/40">{i + 1}</span>
                <div className="flex flex-1 flex-col gap-0.5">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.source}</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="size-3" /> {fmt(item.duration_s)}
                </div>
                <button type="button" onClick={() => remove(item.id)} className="text-muted-foreground hover:text-destructive transition-colors">
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
