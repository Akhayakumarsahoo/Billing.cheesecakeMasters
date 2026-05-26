"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  UtensilsCrossed,
  Receipt,
  Store,
  Users,
  Settings,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface AdminSidebarProps {
  role?: string;
}

export function AdminSidebar({ role }: AdminSidebarProps) {
  const pathname = usePathname();

  const isSpecificOutlet = pathname?.startsWith("/outlets/");
  const isOutletsActive = pathname === "/outlets";
  const isDashboardActive = pathname === "/" || isSpecificOutlet;

  return (
    <aside className="w-[240px] bg-bg-surface border-r border-border-default flex flex-col justify-between py-4 shrink-0">
      <nav className="flex flex-col gap-1">
        <Link href="/">
          <div
            className={`h-10 px-3 rounded-lg flex items-center gap-3 text-sm cursor-pointer mx-2 ${
              isDashboardActive
                ? "bg-[#E8E7E4] text-[#111110] font-medium"
                : "text-[#6B6B68] hover:bg-[#F0EFED]"
            }`}
          >
            <LayoutDashboard className="h-4 w-4" strokeWidth={1.5} />
            Dashboard
          </div>
        </Link>
        
        {isSpecificOutlet && (
          <>
            <div className="h-10 px-3 rounded-lg flex items-center gap-3 text-sm cursor-pointer mx-2 text-[#6B6B68] hover:bg-[#F0EFED]">
              <UtensilsCrossed className="h-4 w-4" strokeWidth={1.5} />
              Menu
            </div>
            <div className="h-10 px-3 rounded-lg flex items-center gap-3 text-sm cursor-pointer mx-2 text-[#6B6B68] hover:bg-[#F0EFED]">
              <Receipt className="h-4 w-4" strokeWidth={1.5} />
              Bills
            </div>
          </>
        )}

        {role === "admin" && (
          <>
            <Link href="/outlets">
              <div
                className={`h-10 px-3 rounded-lg flex items-center gap-3 text-sm cursor-pointer mx-2 ${
                  isOutletsActive
                    ? "bg-[#E8E7E4] text-[#111110] font-medium"
                    : "text-[#6B6B68] hover:bg-[#F0EFED]"
                }`}
              >
                <Store className="h-4 w-4" strokeWidth={1.5} />
                Outlet Management
              </div>
            </Link>
            <Link href="/users">
              <div
                className={`h-10 px-3 rounded-lg flex items-center gap-3 text-sm cursor-pointer mx-2 ${
                  pathname?.startsWith("/users")
                    ? "bg-[#E8E7E4] text-[#111110] font-medium"
                    : "text-[#6B6B68] hover:bg-[#F0EFED]"
                }`}
              >
                <Users className="h-4 w-4" strokeWidth={1.5} />
                User Management
              </div>
            </Link>
          </>
        )}
      </nav>
      <div className="flex flex-col gap-1">
        <div className="px-4 mb-2">
          <Separator />
        </div>
        <div className="h-10 px-3 rounded-lg flex items-center gap-3 text-sm cursor-pointer mx-2 text-[#6B6B68] hover:bg-[#F0EFED]">
          <Settings className="h-4 w-4" strokeWidth={1.5} />
          Settings
        </div>
      </div>
    </aside>
  );
}
