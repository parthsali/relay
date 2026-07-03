import { FolderOpen, Plus, ImageIcon, FileVideo } from "lucide-react";
import { Button } from "@/components/ui/button";

const assets = [
  { name: "background-dark.png", type: "image", size: "2.4 MB" },
  { name: "logo-white.svg", type: "image", size: "12 KB" },
  { name: "intro-loop.mp4", type: "video", size: "18 MB" },
  { name: "weather-bg.png", type: "image", size: "1.1 MB" },
  { name: "clock-bg.jpg", type: "image", size: "800 KB" },
];

export default function AssetsPage() {
  return (
    <div className="flex w-full flex-1 flex-col">
      <div className="flex w-full items-center justify-between border-b border-border px-8 py-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Assets</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Images and media files used in your scenes.</p>
        </div>
        <Button size="sm">
          <Plus className="size-3.5" />
          Upload
        </Button>
      </div>

      <div className="px-8 py-6">
        <div className="overflow-hidden rounded-lg border border-border">
          {assets.map((a, i) => {
            const Icon = a.type === "video" ? FileVideo : ImageIcon;
            return (
              <div key={i} className="flex items-center gap-4 border-b border-border px-4 py-3.5 last:border-0">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Icon className="size-4 text-muted-foreground" />
                </div>
                <p className="flex-1 text-sm font-medium font-mono">{a.name}</p>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">{a.type}</span>
                <span className="w-20 text-right text-xs text-muted-foreground">{a.size}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
