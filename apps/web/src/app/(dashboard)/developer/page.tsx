"use client";

import { Check, Copy, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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

type APIKey = { id: string; name: string; key_prefix: string; created_at: string };

const endpoints = [
  { method: "GET",    path: "/health",        desc: "Server health" },
  { method: "GET",    path: "/users/me",       desc: "Current user" },
  { method: "GET",    path: "/devices",        desc: "List devices" },
  { method: "POST",   path: "/devices/register", desc: "Register device" },
  { method: "GET",    path: "/schedules",      desc: "List schedules" },
  { method: "GET",    path: "/queue",          desc: "List queue" },
  { method: "GET",    path: "/automations",    desc: "List automations" },
  { method: "GET",    path: "/assets",         desc: "List assets" },
];

const methodColor: Record<string, string> = {
  GET: "text-blue-400", POST: "text-emerald-400", DELETE: "text-red-400", PATCH: "text-yellow-400",
};

export default function DeveloperPage() {
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState<{ id: string; plain: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const r = await apiFetch("/developer/keys");
    if (r.ok) {
      const j = await r.json();
      setKeys(j.data?.keys ?? []);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create() {
    if (!newKeyName.trim()) return;
    setCreating(true);
    const r = await apiFetch("/developer/keys", {
      method: "POST",
      body: JSON.stringify({ name: newKeyName }),
    });
    setCreating(false);
    if (r.ok) {
      const j = await r.json();
      setRevealed({ id: j.data.key.id, plain: j.data.plain_key });
      setNewKeyName("");
      load();
    }
  }

  async function remove(id: string) {
    await apiFetch(`/developer/keys/${id}`, { method: "DELETE" });
    if (revealed?.id === id) setRevealed(null);
    load();
  }

  function copyKey() {
    if (!revealed) return;
    navigator.clipboard.writeText(revealed.plain);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex w-full flex-1 flex-col">
      <div className="border-b border-border px-8 py-6">
        <h1 className="text-xl font-semibold tracking-tight">Developer</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">API keys and endpoint reference.</p>
      </div>

      <div className="flex flex-col gap-8 px-8 py-6">
        {/* Create key */}
        <div>
          <p className="mb-3 text-sm font-medium text-muted-foreground">New API key</p>
          <div className="flex items-center gap-2">
            <Input className="h-8 w-56 text-sm" placeholder="Key name…" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()} />
            <Button size="sm" disabled={creating || !newKeyName.trim()} onClick={create}>
              <Plus className="size-3.5" /> Generate
            </Button>
          </div>
          {revealed && (
            <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
              <p className="mb-2 text-xs font-medium text-amber-600 dark:text-amber-400">Copy this key — it won&apos;t be shown again.</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 overflow-x-auto rounded bg-muted px-3 py-2 font-mono text-xs">{revealed.plain}</code>
                <Button variant="outline" size="sm" onClick={copyKey}>
                  {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Key list */}
        {keys.length > 0 && (
          <div>
            <p className="mb-3 text-sm font-medium text-muted-foreground">API Keys</p>
            <div className="overflow-hidden rounded-lg border border-border">
              {keys.map((k) => (
                <div key={k.id} className="flex items-center gap-4 border-b border-border px-4 py-4 last:border-0">
                  <div className="flex flex-1 flex-col gap-1">
                    <p className="text-sm font-medium">{k.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{k.key_prefix}…</p>
                  </div>
                  <button type="button" onClick={() => remove(k.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Endpoint reference */}
        <div>
          <p className="mb-3 text-sm font-medium text-muted-foreground">Endpoints</p>
          <div className="overflow-hidden rounded-lg border border-border">
            {endpoints.map((e, i) => (
              <div key={i} className="flex items-center gap-4 border-b border-border px-4 py-3.5 last:border-0">
                <span className={`w-10 shrink-0 font-mono text-xs font-semibold ${methodColor[e.method]}`}>{e.method}</span>
                <span className="flex-1 font-mono text-sm">{e.path}</span>
                <span className="text-xs text-muted-foreground">{e.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
