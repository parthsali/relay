import { TopNav } from "@/components/top-nav";
import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex flex-1 flex-col overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
