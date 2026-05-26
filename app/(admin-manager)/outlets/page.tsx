import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { OutletsClient } from "./outlets-client";
import { prisma } from "@/lib/db";

export default async function OutletsPage() {
  const user = await getCurrentUser();
  
  if (!user || user.role !== "admin") {
    redirect("/");
  }

  const outlets = await prisma.outlet.findMany({
    orderBy: { createdAt: "desc" },
  });

  // Serialize before passing to Client Component
  const serialized = outlets.map((o) => ({
    ...o,
    createdAt: o.createdAt.toISOString(),
  }));

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Outlets</h1>
        <p className="text-sm text-text-muted mt-1">
          Manage your physical locations and POS accounts.
        </p>
      </div>

      <OutletsClient initialData={serialized} />
    </div>
  );
}
