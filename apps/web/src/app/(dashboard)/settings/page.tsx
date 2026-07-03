import { Button } from "@/components/ui/button";

const sections = [
  {
    title: "General",
    rows: [
      { label: "Device name", value: "relay-pi.local", type: "text" },
      { label: "Timezone", value: "Asia/Kolkata (UTC+5:30)", type: "text" },
      { label: "Language", value: "English", type: "text" },
    ],
  },
  {
    title: "Display",
    rows: [
      { label: "Brightness", value: "68%", type: "text" },
      { label: "Auto-brightness", value: "Enabled", type: "toggle" },
      { label: "Screen timeout", value: "Never", type: "text" },
      { label: "Orientation", value: "Landscape", type: "text" },
    ],
  },
  {
    title: "Agent",
    rows: [
      { label: "Agent port", value: "8080", type: "text" },
      { label: "Auto-start on boot", value: "Enabled", type: "toggle" },
      { label: "Log level", value: "INFO", type: "text" },
    ],
  },
];

export default function SettingsPage() {
  return (
    <div className="flex w-full flex-1 flex-col">
      <div className="flex w-full items-center justify-between border-b border-border px-8 py-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Configure your Relay device and agent.</p>
        </div>
        <Button size="sm">Save changes</Button>
      </div>

      <div className="flex flex-col gap-8 px-8 py-6">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="mb-3 text-sm font-medium text-muted-foreground">{section.title}</p>
            <div className="overflow-hidden rounded-lg border border-border">
              {section.rows.map((row, i) => (
                <div key={i} className="flex items-center border-b border-border px-4 py-3.5 last:border-0">
                  <p className="w-48 shrink-0 text-sm text-muted-foreground">{row.label}</p>
                  <p className="flex-1 text-sm">{row.value}</p>
                  <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    Edit
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Danger zone */}
        <div>
          <p className="mb-3 text-sm font-medium text-muted-foreground">Danger zone</p>
          <div className="rounded-lg border border-destructive/20 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Reset to factory defaults</p>
                <p className="mt-0.5 text-xs text-muted-foreground">This will erase all settings and data.</p>
              </div>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive border-destructive/30">
                Reset
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
