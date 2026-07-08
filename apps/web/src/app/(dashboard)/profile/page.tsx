"use client";

import { Check, Loader2, Pencil, X } from "lucide-react";
import Image from "next/image";
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

type User = {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
  created_at: string;
};

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const r = await apiFetch("/users/me");
    if (r.ok) {
      const j = await r.json();
      setUser(j.data);
      setDraft(j.data?.name ?? "");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveName() {
    if (!draft.trim() || draft === user?.name) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const r = await apiFetch("/users/me", {
      method: "PATCH",
      body: JSON.stringify({ name: draft.trim() }),
    });
    if (r.ok) {
      const j = await r.json();
      setUser(j.data);
      toast.success("Name updated");
    } else {
      toast.error("Failed to update name");
    }
    setSaving(false);
    setEditing(false);
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex w-full flex-1 flex-col">
      <div className="border-b border-border px-8 py-6">
        <h1 className="text-xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Your account information.
        </p>
      </div>

      <div className="flex flex-col gap-8 px-8 py-6">
        {/* Avatar + name block */}
        <div className="flex items-center gap-5">
          {user.avatar_url ? (
            <Image
              src={user.avatar_url}
              alt={user.name}
              width={56}
              height={56}
              className="size-14 rounded-full object-cover"
            />
          ) : (
            <div className="flex size-14 items-center justify-center rounded-full bg-accent text-base font-semibold">
              {initials}
            </div>
          )}
          <div>
            <p className="text-base font-semibold">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>

        {/* Details */}
        <div>
          <p className="mb-3 text-sm font-medium text-muted-foreground">
            Account
          </p>
          <div className="overflow-hidden rounded-lg border border-border">
            {/* Editable name row */}
            <div className="flex items-center border-b border-border px-5 py-3">
              <p className="w-44 shrink-0 text-sm text-muted-foreground">
                Display name
              </p>
              {editing ? (
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    className="h-7 flex-1 text-sm"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveName();
                      if (e.key === "Escape") setEditing(false);
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={saveName}
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
                    onClick={() => {
                      setEditing(false);
                      setDraft(user.name);
                    }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <p className="flex-1 text-sm">{user.name}</p>
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
            {/* Read-only rows */}
            {[
              { label: "Email", value: user.email },
              {
                label: "User ID",
                value: <span className="font-mono text-xs">{user.id}</span>,
              },
              {
                label: "Member since",
                value: new Date(user.created_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }),
              },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex items-center border-b border-border px-5 py-3.5 last:border-0"
              >
                <p className="w-44 shrink-0 text-sm text-muted-foreground">
                  {label}
                </p>
                <p className="flex-1 text-sm">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
