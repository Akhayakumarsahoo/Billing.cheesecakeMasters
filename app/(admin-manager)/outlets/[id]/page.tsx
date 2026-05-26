import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";

export default async function OutletDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "manager")) {
    redirect("/");
  }

  const outlet = await prisma.outlet.findUnique({
    where: { id },
  });

  if (!outlet) {
    notFound();
  }

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {outlet.name} Dashboard
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Viewing specific dashboard for {outlet.name} (GSTIN: {outlet.gstin || "N/A"})
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border-default rounded-lg bg-bg-surface py-24 text-center">
        <h3 className="text-lg font-medium">Specific Outlet Dashboard</h3>
        <p className="text-text-muted mt-1">
          This dashboard view is currently static and will be implemented soon.
        </p>
      </div>
    </div>
  );
}
