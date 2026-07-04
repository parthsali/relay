import { ArrowUpCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const updates = [
  { name: "relay-agent", current: "0.9.4", latest: "1.0.0", breaking: true },
  {
    name: "display-engine",
    current: "2.1.1",
    latest: "2.1.3",
    breaking: false,
  },
];

const upToDate = [
  { name: "auth-module", version: "1.4.2" },
  { name: "spotify-integration", version: "0.8.1" },
  { name: "weather-provider", version: "1.0.5" },
];

export default function UpdatesPage() {
  return (
    <div className="flex w-full flex-1 flex-col">
      <div className="border-b border-border px-8 py-6">
        <h1 className="text-xl font-semibold tracking-tight">Updates</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Manage agent and module versions.
        </p>
      </div>

      <div className="flex flex-col gap-8 px-8 py-6">
        {updates.length > 0 && (
          <div>
            <p className="mb-3 text-sm font-medium text-muted-foreground">
              Available updates
            </p>
            <div className="overflow-hidden rounded-lg border border-border">
              {updates.map((u) => (
                <div
                  key={u.name}
                  className="flex items-center gap-4 border-b border-border px-4 py-4 last:border-0"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                    <ArrowUpCircle className="size-4 text-muted-foreground" />
                  </div>
                  <div className="flex flex-1 flex-col gap-0.5">
                    <p className="text-sm font-medium font-mono">{u.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {u.current} →{" "}
                      <span className="text-foreground">{u.latest}</span>
                      {u.breaking && (
                        <span className="ml-2 text-yellow-500">breaking</span>
                      )}
                    </p>
                  </div>
                  <Button size="sm" variant="outline">
                    Update
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="mb-3 text-sm font-medium text-muted-foreground">
            Up to date
          </p>
          <div className="overflow-hidden rounded-lg border border-border">
            {upToDate.map((u) => (
              <div
                key={u.name}
                className="flex items-center gap-4 border-b border-border px-4 py-3.5 last:border-0"
              >
                <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                <p className="flex-1 text-sm font-mono">{u.name}</p>
                <p className="text-xs text-muted-foreground">{u.version}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
