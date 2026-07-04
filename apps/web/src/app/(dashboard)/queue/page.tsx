import { Clock, GripVertical, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const items = [
  {
    id: 1,
    title: "Spotify — Now Playing",
    source: "Spotify",
    duration: "Until stopped",
  },
  { id: 2, title: "Weather Overview", source: "Weather", duration: "10 min" },
  { id: 3, title: "Clock — Full Screen", source: "Clock", duration: "5 min" },
  { id: 4, title: "System Stats", source: "System", duration: "3 min" },
];

export default function QueuePage() {
  return (
    <div className="flex w-full flex-1 flex-col">
      <div className="flex w-full items-center justify-between border-b border-border px-8 py-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Queue</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage what displays next on your screen.
          </p>
        </div>
        <Button size="sm">
          <Plus className="size-3.5" />
          Add item
        </Button>
      </div>

      <div className="px-8 py-6">
        <div className="overflow-hidden rounded-lg border border-border">
          {items.map((item, i) => (
            <div
              key={item.id}
              className="flex items-center gap-4 border-b border-border px-4 py-3.5 last:border-0"
            >
              <GripVertical className="size-4 shrink-0 text-muted-foreground/30 cursor-grab" />
              <span className="w-5 text-center text-xs font-mono text-muted-foreground/40">
                {i + 1}
              </span>
              <div className="flex flex-1 flex-col gap-0.5">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.source}</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3" />
                {item.duration}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
