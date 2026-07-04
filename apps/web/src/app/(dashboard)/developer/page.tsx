import { Copy, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const keys = [
  {
    name: "Production key",
    key: "rly_live_••••••••••••••••••••••3f9a",
    created: "Jun 12 2025",
    lastUsed: "Today",
  },
  {
    name: "Dev key",
    key: "rly_test_••••••••••••••••••••••8c2b",
    created: "May 3 2025",
    lastUsed: "Yesterday",
  },
];

const endpoints = [
  { method: "GET", path: "/health", desc: "Agent health check" },
  { method: "GET", path: "/users/me", desc: "Current user" },
  { method: "GET", path: "/display", desc: "Current display state" },
  { method: "POST", path: "/display", desc: "Update display" },
];

const methodColor: Record<string, string> = {
  GET: "text-blue-400",
  POST: "text-emerald-400",
  DELETE: "text-red-400",
};

export default function DeveloperPage() {
  return (
    <div className="flex w-full flex-1 flex-col">
      <div className="flex w-full items-center justify-between border-b border-border px-8 py-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Developer</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            API keys, webhooks, and integration docs.
          </p>
        </div>
        <Button size="sm">
          <Plus className="size-3.5" />
          New key
        </Button>
      </div>

      <div className="flex flex-col gap-8 px-8 py-6">
        <div>
          <p className="mb-3 text-sm font-medium text-muted-foreground">
            API Keys
          </p>
          <div className="overflow-hidden rounded-lg border border-border">
            {keys.map((k) => (
              <div
                key={k.name}
                className="flex items-center gap-4 border-b border-border px-4 py-4 last:border-0"
              >
                <div className="flex flex-1 flex-col gap-1">
                  <p className="text-sm font-medium">{k.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {k.key}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    Created {k.created}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Last used {k.lastUsed}
                  </p>
                </div>
                <button
                  type="button"
                  className="flex size-7 items-center justify-center rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Copy className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-medium text-muted-foreground">
            Endpoints
          </p>
          <div className="overflow-hidden rounded-lg border border-border">
            {endpoints.map((e, i) => (
              <div
                key={i}
                className="flex items-center gap-4 border-b border-border px-4 py-3.5 last:border-0"
              >
                <span
                  className={`w-10 shrink-0 font-mono text-xs font-semibold ${methodColor[e.method]}`}
                >
                  {e.method}
                </span>
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
