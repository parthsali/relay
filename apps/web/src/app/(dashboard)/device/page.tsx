import { Cpu, Wifi, HardDrive, Monitor } from "lucide-react";

const info = [
  { section: "Hardware", rows: [
    { label: "Model", value: "Raspberry Pi 4 Model B" },
    { label: "CPU", value: "ARM Cortex-A72 · 4 cores · 1.8 GHz" },
    { label: "RAM", value: "4 GB LPDDR4" },
    { label: "Storage", value: "64 GB microSD — 38 GB free" },
    { label: "OS", value: "Raspberry Pi OS Lite (64-bit)" },
  ]},
  { section: "Display", rows: [
    { label: "Resolution", value: "1920 × 1080 @ 60 Hz" },
    { label: "Interface", value: "HDMI 0" },
    { label: "Orientation", value: "Landscape" },
    { label: "Brightness", value: "68%" },
  ]},
  { section: "Network", rows: [
    { label: "Hostname", value: "relay-pi.local" },
    { label: "IP Address", value: "192.168.1.42" },
    { label: "Wi-Fi", value: "relay-home · 5 GHz" },
    { label: "Signal", value: "−62 dBm (Good)" },
  ]},
];

export default function DevicePage() {
  return (
    <div className="flex w-full flex-1 flex-col">
      <div className="border-b border-border px-8 py-6">
        <h1 className="text-xl font-semibold tracking-tight">Device</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Hardware and system information.</p>
      </div>

      <div className="flex flex-col gap-8 px-8 py-6">
        {info.map((group) => (
          <div key={group.section}>
            <p className="mb-3 text-sm font-medium text-muted-foreground">{group.section}</p>
            <div className="overflow-hidden rounded-lg border border-border">
              {group.rows.map((row, i) => (
                <div key={i} className="flex items-center border-b border-border px-4 py-3 last:border-0">
                  <p className="w-40 shrink-0 text-sm text-muted-foreground">{row.label}</p>
                  <p className="text-sm font-medium">{row.value}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
