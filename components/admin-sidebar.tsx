"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  UtensilsCrossed,
  Receipt,
  Store,
  Users,
  Settings,
  ListOrdered,
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
} from "@/components/ui/sidebar";

interface AdminSidebarProps {
  role?: string;
}

export function AdminSidebar({ role }: AdminSidebarProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [persistedOutletId, setPersistedOutletId] = useState<string | null>(null);

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

  const isOutletsActive = pathname === "/outlets";
  const isMenuActive = isSpecificOutlet && pathname?.endsWith("/menu");
  const isOrdersActive = isSpecificOutlet && pathname?.endsWith("/orders");
  const isDashboardActive = pathname === "/" || (isSpecificOutlet && !isMenuActive && !isOrdersActive);

  const dashboardHref = currentOutletId && currentOutletId !== "all" 
    ? `/outlets/${currentOutletId}` 
    : "/dashboard";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2 mt-2">
          <div className="h-6 w-6 bg-accent-primary shrink-0" />
          <span className="font-mono font-semibold text-lg text-text-primary group-data-[collapsible=icon]:hidden truncate">
            BillFlow
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link href={dashboardHref} />} isActive={isDashboardActive} tooltip="Dashboard">
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {currentOutletId && currentOutletId !== "all" && (
                <SidebarMenuItem>
                  <SidebarMenuButton render={<Link href={`/outlets/${currentOutletId}/orders`} />} isActive={isOrdersActive} tooltip="All orders">
                    <ListOrdered />
                    <span>All orders</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              
              {currentOutletId && currentOutletId !== "all" && (
                <>
                  {role === "admin" && (
                    <SidebarMenuItem>
                      <SidebarMenuButton render={<Link href={`/outlets/${currentOutletId}/menu`} />} isActive={isMenuActive} tooltip="Menu">
                        <UtensilsCrossed />
                        <span>Menu</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </>
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
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Settings">
              <Settings />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
