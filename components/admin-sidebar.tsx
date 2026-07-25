"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  UtensilsCrossed,
  Store,
  Users,
  ListOrdered,
  Coins,
  BarChart3,
  Warehouse,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

interface AdminSidebarProps {
  role?: string;
}

export function AdminSidebar({ role }: AdminSidebarProps) {
  const pathname = usePathname();
  const { setOpen } = useSidebar();
  const [mounted, setMounted] = useState(false);
  const [persistedOutletId, setPersistedOutletId] = useState<string | null>(null);

  const [prevPath, setPrevPath] = useState<string | null>(null);

  useEffect(() => {
    if (pathname !== prevPath) {
      setPrevPath(pathname);
      if (pathname?.startsWith("/inventory")) {
        setOpen(false);
      }
    }
  }, [pathname, prevPath, setOpen]);

  useEffect(() => {
    setMounted(true);
    const handleStorageChange = () => {
      setPersistedOutletId(localStorage.getItem("selectedOutletId"));
    };
    handleStorageChange();
    
    // Custom event to listen for changes from OutletSelector in the same tab
    window.addEventListener("local-storage", handleStorageChange);
    return () => window.removeEventListener("local-storage", handleStorageChange);
  }, [pathname]);

  const isSpecificOutlet = pathname?.startsWith("/outlets/") && pathname !== "/outlets";
  
  let currentOutletId = null;
  if (isSpecificOutlet) {
    const parts = pathname?.split("/") || [];
    currentOutletId = parts[2];
  } else if (mounted) {
    currentOutletId = persistedOutletId;
  }

  const hasSpecificOutlet = Boolean(currentOutletId && currentOutletId !== "all");

  const isOutletsActive = pathname === "/outlets";
  const isMenuActive = isSpecificOutlet && pathname?.endsWith("/menu");
  const isOrdersActive = isSpecificOutlet && pathname?.endsWith("/orders");
  const isSettlementsActive = isSpecificOutlet && pathname?.includes("/settlements");
  const isReportsActive = pathname?.endsWith("/reports");
  const isInventoryActive = pathname?.startsWith("/inventory");
  const isDashboardActive = (pathname === "/" || (isSpecificOutlet && !isMenuActive && !isOrdersActive && !isSettlementsActive)) && !isReportsActive && !isInventoryActive;

  const dashboardHref = hasSpecificOutlet 
    ? `/outlets/${currentOutletId}` 
    : "/dashboard";

  const reportsHref = hasSpecificOutlet
    ? `/outlets/${currentOutletId}/reports`
    : "/reports";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-[56px] justify-center border-b border-border-default p-0">
        <div className="flex items-center gap-2.5 px-3 h-full">
          <img
            src="/favicon.svg"
            alt="Cheesecake Masters"
            width={36}
            height={36}
            className="shrink-0 w-9 h-9 object-contain"
          />
          <span className="font-semibold text-sm text-text-primary group-data-[collapsible=icon]:hidden truncate">
            Cheesecake Masters
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {role !== "storeroom" && (
                <SidebarMenuItem>
                  <SidebarMenuButton render={<Link href={dashboardHref} />} isActive={isDashboardActive} tooltip="Dashboard">
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {role !== "storeroom" && hasSpecificOutlet && (
                <SidebarMenuItem>
                  <SidebarMenuButton render={<Link href={`/outlets/${currentOutletId}/orders`} />} isActive={isOrdersActive} tooltip="All orders">
                    <ListOrdered />
                    <span>All orders</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {role !== "storeroom" && hasSpecificOutlet && (
                <SidebarMenuItem>
                  <SidebarMenuButton render={<Link href={`/outlets/${currentOutletId}/settlements`} />} isActive={isSettlementsActive} tooltip="Daily Settlement">
                    <Coins />
                    <span>Daily Settlement</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {role !== "storeroom" && (
                <SidebarMenuItem>
                  <SidebarMenuButton render={<Link href={reportsHref} />} isActive={isReportsActive} tooltip="Reports">
                    <BarChart3 />
                    <span>Reports</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              <SidebarMenuItem>
                <SidebarMenuButton render={<Link href="/inventory" onClick={() => setOpen(false)} />} isActive={isInventoryActive} tooltip="Inventory">
                  <Warehouse />
                  <span>Inventory</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {role !== "storeroom" && hasSpecificOutlet && (
                <SidebarMenuItem>
                  <SidebarMenuButton render={<Link href={`/outlets/${currentOutletId}/menu`} />} isActive={isMenuActive} tooltip="Menu Management">
                    <UtensilsCrossed />
                    <span>Menu Management</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {role === "admin" && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton render={<Link href="/outlets" />} isActive={isOutletsActive} tooltip="Outlet Management">
                      <Store />
                      <span>Outlet Management</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton render={<Link href="/users" />} isActive={pathname?.startsWith("/users")} tooltip="User Management">
                      <Users />
                      <span>User Management</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="p-3 m-2 rounded-lg bg-bg-surface-raised border border-border-default text-xs group-data-[collapsible=icon]:hidden">
          <p className="text-text-secondary font-medium">Need help? Give us a call</p>
          <a
            href="tel:+917609083736"
            className="text-text-primary font-bold font-mono hover:underline mt-1 block"
          >
            +91-7609083736
          </a>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
