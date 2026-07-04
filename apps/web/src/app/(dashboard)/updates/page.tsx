"use client";

import { ArrowUpCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
      ...opts?.headers,
    },
  });
}

export default function UpdatesPage() {
  const [agentVersion, setAgentVersion] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [updateURL, setUpdateURL] = useState("");
  const [updateSHA, setUpdateSHA] = useState("");
  const [updateVersion, setUpdateVersion] = useState("");
  const [sent, setSent] = useState(false);

  useWebSocket({
    onMessage: (msg) => {
      if (msg.type === "device.telemetry") {
        const d = msg.data as { agent_version?: string; device_id?: string };
        if (d.agent_version) setAgentVersion(d.agent_version);
        if (d.device_id) setDeviceId(d.device_id);
      }
    },
  });

  async function pushUpdate() {
    if (!deviceId || !updateURL || !updateSHA) return;
    setUpdating(true);
    await apiFetch(`/devices/${deviceId}/command`, {
      method: "POST",
      body: JSON.stringify({
        type: "agent.update",
        version: updateVersion,
        url: updateURL,
        sha256: updateSHA,
      }),
    });
    setUpdating(false);
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  }

  return (
    <div className="flex w-full flex-1 flex-col">
      <div className="border-b border-border px-8 py-6">
        <h1 className="text-xl font-semibold tracking-tight">Updates</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Manage agent versions.
        </p>
      </div>

      <div className="flex flex-col gap-8 px-8 py-6">
        {/* Current agent version */}
        <div>
          <p className="mb-3 text-sm font-medium text-muted-foreground">
            Current version
          </p>
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="flex items-center gap-4 px-4 py-3.5">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
              <p className="flex-1 text-sm font-mono">relay-agent</p>
              <p className="text-xs text-muted-foreground">
                {agentVersion ?? "—"}
              </p>
            </div>
          </div>
        </div>

        {/* OTA push */}
        <div>
          <p className="mb-3 text-sm font-medium text-muted-foreground">
            Push OTA update
          </p>
          <div className="rounded-lg border border-border p-5">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">
                  Version tag
                </label>
                <Input
                  placeholder="v1.2.3"
                  value={updateVersion}
                  onChange={(e) => setUpdateVersion(e.target.value)}
                  className="h-8 text-sm font-mono"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">
                  Binary URL
                </label>
                <Input
                  placeholder="https://github.com/.../relay-agent"
                  value={updateURL}
                  onChange={(e) => setUpdateURL(e.target.value)}
                  className="h-8 text-sm font-mono"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">
                  SHA-256 checksum
                </label>
                <Input
                  placeholder="a3f2b1…"
                  value={updateSHA}
                  onChange={(e) => setUpdateSHA(e.target.value)}
                  className="h-8 text-sm font-mono"
                />
              </div>
              <Button
                size="sm"
                type="button"
                onClick={pushUpdate}
                disabled={
                  updating || !deviceId || !updateURL || !updateSHA || sent
                }
                className="mt-1 w-fit"
              >
                {updating ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <ArrowUpCircle className="size-3.5" />
                )}
                {sent ? "Sent!" : "Push Update"}
              </Button>
              {!deviceId && (
                <p className="text-xs text-muted-foreground">
                  No device online — connect an agent first.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
