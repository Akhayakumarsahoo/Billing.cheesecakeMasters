import { AdminNavbar } from "@/components/admin-navbar";
import { AdminSidebar } from "@/components/admin-sidebar";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const role = user?.role || "outlet";

  return (
    <div className="min-h-screen bg-bg-base font-sans text-text-primary flex flex-col">
      <AdminNavbar />
      <div className="flex flex-1 overflow-hidden">
        <AdminSidebar role={role} />
        <main className="flex-1 p-8 overflow-y-auto bg-bg-base">
          {children}
        </main>
      </div>
    </div>
  );
}
