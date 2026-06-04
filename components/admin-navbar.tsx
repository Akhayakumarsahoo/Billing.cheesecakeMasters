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
      <div className="flex items-center gap-4">
        <SidebarTrigger className="-ml-2 mr-2" />
        <img
          src="/favicon.svg"
          className="lg:hidden md:block"
          alt="Cheesecake Masters"
          width={20}
          height={20}
        />
        <OutletSelector outlets={outlets} />
      </div>
      <div className="flex items-center gap-3">
        <UserButton />
      </div>
    </header>
  );
}
