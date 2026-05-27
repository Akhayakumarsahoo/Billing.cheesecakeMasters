import { getCurrentOutlet } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PosSidebar } from "@/components/layout/pos-sidebar";
import { PosTopNav } from "@/components/layout/pos-top-nav";
import { PosBottomNav } from "@/components/layout/pos-bottom-nav";

export default async function PosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const outlet = await getCurrentOutlet();
  
  if (!outlet) {
    redirect("/dashboard");
  }

  return (
    <div className="flex h-screen bg-[var(--bg-base)] overflow-hidden">
      <PosSidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <PosTopNav outletName={outlet.name} />
        <main className="flex-1 overflow-y-auto pb-16 sm:pb-0">
          {children}
        </main>
        <PosBottomNav />
      </div>
    </div>
  );
}
