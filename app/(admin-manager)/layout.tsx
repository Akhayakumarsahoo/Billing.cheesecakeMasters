import { AdminNavbar } from "@/components/admin-navbar";
import { AdminSidebar } from "@/components/admin-sidebar";
import { AdminBottomNav } from "@/components/admin-bottom-nav";
import { getCurrentUser } from "@/lib/auth";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const role = user?.role || "outlet";

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-bg-base font-sans text-text-primary flex w-full">
        <div className="hidden md:block">
          <AdminSidebar role={role} />
        </div>
        <SidebarInset className="flex flex-col flex-1 overflow-hidden w-full min-w-0">
          <AdminNavbar />
          <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8 overflow-y-auto bg-bg-base w-full">
            {children}
          </main>
          <AdminBottomNav role={role} />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
