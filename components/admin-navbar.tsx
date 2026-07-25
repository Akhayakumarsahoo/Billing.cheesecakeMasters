import { UserButton } from "@clerk/nextjs";
import { prisma } from "@/lib/db";
import { OutletSelector } from "./admin-navbar/outlet-selector";
import { SidebarTrigger } from "@/components/ui/sidebar";

export async function AdminNavbar() {
  const outlets = await prisma.outlet.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <header className="h-[56px] bg-bg-surface border-b border-border-default flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="-ml-2 mr-1 hidden md:inline-flex" />
        <img
          src="/favicon.svg"
          className="md:hidden shrink-0 w-10 h-10 object-contain"
          alt="Cheesecake Masters"
          width={40}
          height={40}
        />
        <OutletSelector outlets={outlets} />
      </div>
      <div className="flex items-center gap-3">
        <UserButton />
      </div>
    </header>
  );
}
