"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListOrdered,
  Coins,
  BarChart3,
  Warehouse,
  MoreHorizontal,
} from "lucide-react";

interface AdminBottomNavProps {
  role?: string;
}

export function AdminBottomNav({ role }: AdminBottomNavProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [persistedOutletId, setPersistedOutletId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const handleStorageChange = () => {
      setPersistedOutletId(localStorage.getItem("selectedOutletId"));
    };
    handleStorageChange();

    window.addEventListener("local-storage", handleStorageChange);
    return () => window.removeEventListener("local-storage", handleStorageChange);
  }, [pathname]);

  if (role === "storeroom") return null;

  const isSpecificOutlet = pathname?.startsWith("/outlets/") && pathname !== "/outlets";
  
  let currentOutletId = null;
  if (isSpecificOutlet) {
    const parts = pathname?.split("/") || [];
    currentOutletId = parts[2];
  } else if (mounted) {
    currentOutletId = persistedOutletId;
  }

  const hasSpecificOutlet = Boolean(currentOutletId && currentOutletId !== "all");

  const isMoreActive = pathname === "/more";
  const isReportsActive = pathname?.endsWith("/reports");
  const isInventoryActive = pathname?.startsWith("/inventory");
  const isMenuActive = isSpecificOutlet && pathname?.endsWith("/menu");
  const isOrdersActive = isSpecificOutlet && pathname?.endsWith("/orders");
  const isSettlementsActive = isSpecificOutlet && pathname?.includes("/settlements");
  const isDashboardActive =
    !isMoreActive &&
    !isReportsActive &&
    !isInventoryActive &&
    !isMenuActive &&
    !isOrdersActive &&
    !isSettlementsActive &&
    (pathname === "/" || pathname === "/dashboard" || isSpecificOutlet);

  const navItems = hasSpecificOutlet
    ? [
        {
          label: "Dashboard",
          href: `/outlets/${currentOutletId}`,
          icon: LayoutDashboard,
          isActive: isDashboardActive,
        },
        {
          label: "All orders",
          href: `/outlets/${currentOutletId}/orders`,
          icon: ListOrdered,
          isActive: isOrdersActive,
        },
        {
          label: "Settlements",
          href: `/outlets/${currentOutletId}/settlements`,
          icon: Coins,
          isActive: isSettlementsActive,
        },
        {
          label: "Reports",
          href: `/outlets/${currentOutletId}/reports`,
          icon: BarChart3,
          isActive: isReportsActive,
        },
        {
          label: "More",
          href: "/more",
          icon: MoreHorizontal,
          isActive: isMoreActive,
        },
      ]
    : [
        {
          label: "Dashboard",
          href: "/dashboard",
          icon: LayoutDashboard,
          isActive: isDashboardActive,
        },
        {
          label: "Reports",
          href: "/reports",
          icon: BarChart3,
          isActive: isReportsActive,
        },
        {
          label: "Inventory",
          href: "/inventory",
          icon: Warehouse,
          isActive: isInventoryActive,
        },
        {
          label: "More",
          href: "/more",
          icon: MoreHorizontal,
          isActive: isMoreActive,
        },
      ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-bg-surface border-t border-border-default h-16 flex items-center justify-around px-1 pb-[env(safe-area-inset-bottom)] shadow-lg">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex flex-col items-center justify-center w-full h-full text-[11px] font-medium transition-colors ${
              item.isActive
                ? "text-accent-primary font-semibold"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <Icon className={`h-5 w-5 mb-0.5 ${item.isActive ? "stroke-[2.25]" : "stroke-[1.5]"}`} />
            <span className="truncate max-w-[68px] text-center">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
