import Sidebar from "@/components/dashboard/Sidebar";
import MobileNav from "@/components/dashboard/MobileNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
      <Sidebar />
      <main
        className="flex-1 overflow-y-auto pb-20 lg:pb-0"
        style={{ background: "var(--bg)" }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          {children}
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
