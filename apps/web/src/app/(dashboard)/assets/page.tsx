"use client";

import { ExternalLink, FileVideo, ImageIcon, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

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

type Asset = {
  id: string;
  name: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  public_url: string;
  created_at: string;
};

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);

  const load = useCallback(async () => {
    const r = await apiFetch("/assets");
    if (r.ok) {
      const j = await r.json();
      setAssets(j.data?.assets ?? []);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function remove(id: string) {
    await apiFetch(`/assets/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="flex w-full flex-1 flex-col">
      <div className="border-b border-border px-8 py-6">
        <h1 className="text-xl font-semibold tracking-tight">Assets</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Images and media files used in your scenes. Upload via GCS and register with <code className="font-mono text-xs">POST /assets/meta</code>.
        </p>
      </div>

      <div className="px-8 py-6">
        {assets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assets yet. Upload files to your GCS bucket and register them via the API.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            {assets.map((a) => {
              const isVideo = a.mime_type.startsWith("video/");
              const Icon = isVideo ? FileVideo : ImageIcon;
              return (
                <div key={a.id} className="flex items-center gap-4 border-b border-border px-4 py-3.5 last:border-0">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Icon className="size-4 text-muted-foreground" />
                  </div>
                  <div className="flex flex-1 flex-col gap-0.5">
                    <p className="font-mono text-sm font-medium">{a.filename}</p>
                    <p className="text-xs text-muted-foreground">{a.name}</p>
                  </div>
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    {a.mime_type.split("/")[1]}
                  </span>
                  <span className="w-20 text-right text-xs text-muted-foreground">
                    {fmtBytes(a.size_bytes)}
                  </span>
                  {a.public_url && (
                    <a href={a.public_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                      <ExternalLink className="size-3.5" />
                    </a>
                  )}
                  <button type="button" onClick={() => remove(a.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
