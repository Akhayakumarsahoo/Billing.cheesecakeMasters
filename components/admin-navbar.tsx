import { UserButton } from "@clerk/nextjs";
import { prisma } from "@/lib/db";
import { OutletSelector } from "./admin-navbar/outlet-selector";
import { getCurrentUser } from "@/lib/auth";
import { SidebarTrigger } from "@/components/ui/sidebar";

export async function AdminNavbar() {
  const outlets = await prisma.outlet.findMany({
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });
  
  const user = await getCurrentUser();

  return (
    <header className="h-[56px] bg-bg-surface border-b border-border-default flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="-ml-2 mr-2" />
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 bg-accent-primary" />
          <span className="font-mono font-semibold text-lg text-text-primary hidden sm:inline-block">
            BillFlow
          </span>
        </div>
        <OutletSelector outlets={outlets} />
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{user?.name || "User"}</span>
        <UserButton />
      </div>
    </header>
  );
}
