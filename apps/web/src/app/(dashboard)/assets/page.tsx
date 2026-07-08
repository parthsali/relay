"use client";

import {
  ExternalLink,
  FileVideo,
  ImageIcon,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

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
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const r = await apiFetch("/assets");
    if (r.ok) {
      const j = await r.json();
      setAssets(j.data?.assets ?? []);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    try {
      // Step 1 — get a signed GCS PUT URL from the API
      const urlRes = await apiFetch("/assets/upload-url", {
        method: "POST",
        body: JSON.stringify({ filename: file.name, mime_type: file.type }),
      });
      if (!urlRes.ok) {
        const j = await urlRes.json().catch(() => ({}));
        throw new Error(j?.error?.message ?? "Failed to get upload URL");
      }
      const { data } = await urlRes.json();
      const { upload_url, gcs_path } = data as {
        upload_url: string;
        gcs_path: string;
      };

      // Step 2 — PUT the file directly to GCS (no auth header needed, it's in the signed URL)
      const putRes = await fetch(upload_url, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!putRes.ok) throw new Error("GCS upload failed");

      // Step 3 — register the asset metadata in the DB
      await apiFetch("/assets/meta", {
        method: "POST",
        body: JSON.stringify({
          name: file.name,
          filename: file.name,
          gcs_path: gcs_path,
          mime_type: file.type,
          size_bytes: file.size,
        }),
      });
      toast.success(`${file.name} uploaded`);
      load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) upload(file);
  }

  async function remove(id: string) {
    const r = await apiFetch(`/assets/${id}`, { method: "DELETE" });
    if (r.ok) {
      toast.success("Asset deleted");
      load();
    } else toast.error("Failed to delete asset");
  }

  return (
    <div className="flex w-full flex-1 flex-col">
      <div className="flex w-full items-center justify-between border-b border-border px-8 py-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Assets</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Images and media files used in your scenes.
          </p>
        </div>
        <Button
          size="sm"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Plus className="size-3.5" />
          )}
          {uploading ? "Uploading…" : "Upload"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={onFileChange}
        />
      </div>

      <div className="flex flex-col gap-4 px-8 py-6">
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {assets.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No assets yet. Click <strong>Upload</strong> to add an image or
            video. Requires{" "}
            <code className="font-mono text-xs">GCS_BUCKET</code> and{" "}
            <code className="font-mono text-xs">
              GOOGLE_APPLICATION_CREDENTIALS
            </code>{" "}
            to be set.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            {assets.map((a) => {
              const isVideo = a.mime_type.startsWith("video/");
              const Icon = isVideo ? FileVideo : ImageIcon;
              return (
                <div
                  key={a.id}
                  className="flex items-center gap-4 border-b border-border px-4 py-3.5 last:border-0"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Icon className="size-4 text-muted-foreground" />
                  </div>
                  <div className="flex flex-1 flex-col gap-0.5">
                    <p className="font-mono text-sm font-medium">
                      {a.filename}
                    </p>
                    <p className="text-xs text-muted-foreground">{a.name}</p>
                  </div>
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    {a.mime_type.split("/")[1]}
                  </span>
                  <span className="w-20 text-right text-xs text-muted-foreground">
                    {fmtBytes(a.size_bytes)}
                  </span>
                  {a.public_url && (
                    <a
                      href={a.public_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ExternalLink className="size-3.5" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(a.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
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
