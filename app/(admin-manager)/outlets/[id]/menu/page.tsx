import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { MenuManagementClient } from "@/components/menu/menu-management-client";

export default async function OutletMenuPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  
  // Only admin can access menu management
  if (!user || user.role !== "admin") {
    redirect("/");
  }

  const outlet = await prisma.outlet.findUnique({
    where: { id },
  });

  if (!outlet) {
    notFound();
  }

  // Fetch initial data for the client component
  const categories = await prisma.menuCategory.findMany({
    where: { outletId: id, isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  const items = await prisma.menuItem.findMany({
    where: { outletId: id, isActive: true },
    include: {
      category: { select: { id: true, name: true, sortOrder: true } },
      gstSlab: { select: { id: true, rate: true, label: true } },
    },
    orderBy: [
      { category: { sortOrder: "asc" } },
      { name: "asc" },
    ],
  });

  const gstSlabs = await prisma.gstSlab.findMany({
    orderBy: { id: "asc" },
  });

  // Serialize decimals/dates for client component
  const serializedItems = items.map((item) => ({
    ...item,
    basePrice: item.basePrice.toString(),
    createdAt: item.createdAt.toISOString(),
    category: {
      ...item.category,
    },
    gstSlab: {
      ...item.gstSlab,
      rate: item.gstSlab.rate.toString(),
    },
  }));

  const serializedCategories = categories.map((c) => ({
    id: c.id,
    name: c.name,
    sortOrder: c.sortOrder,
  }));

  return (
    <div className="max-w-4xl mx-auto py-6">
      <MenuManagementClient
        outletId={id}
        initialCategories={serializedCategories}
        initialItems={serializedItems as any}
        gstSlabs={gstSlabs.map(g => ({ id: g.id, label: g.label }))}
      />
    </div>
  );
}
