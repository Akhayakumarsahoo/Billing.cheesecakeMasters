import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { InventoryDetailClient } from "./inventory-detail-client";

export default async function InventoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  const { id } = await params;

  if (!user) {
    redirect("/sign-in");
  }

  // Scope check: storeroom user can only access their assigned inventory
  if (user.role === "storeroom" && user.inventoryId !== id) {
    redirect("/inventory");
  }

  if (user.role !== "admin" && user.role !== "manager" && user.role !== "storeroom") {
    redirect("/");
  }

  // Fetch the inventory details
  const inventory = await prisma.inventory.findUnique({
    where: { id },
    include: {
      outlets: {
        include: {
          outlet: true
        }
      },
      rawMaterials: {
        where: { isActive: true },
        select: { id: true }
      }
    }
  });

  if (!inventory) {
    redirect("/inventory");
  }

  // Fetch active outlets (for link/unlink outlet dialog)
  const activeOutlets = await prisma.outlet.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" }
  });

  // Fetch all inventories for selector if role is admin/manager
  let inventoriesList: { id: string; name: string; isActive: boolean }[] = [];
  if (user.role === "admin" || user.role === "manager") {
    inventoriesList = await prisma.inventory.findMany({
      select: { id: true, name: true, isActive: true },
      orderBy: { name: "asc" }
    });
  } else {
    inventoriesList = [{ id: inventory.id, name: inventory.name, isActive: inventory.isActive }];
  }

  // Fetch GST slabs (for raw material dropdowns)
  const gstSlabs = await prisma.gstSlab.findMany({
    orderBy: { id: "asc" }
  });

  // Fetch menu items from linked outlets
  const linkedOutletIds = inventory.outlets.map((o) => o.outletId);
  const menuItems = await prisma.menuItem.findMany({
    where: {
      outletId: { in: linkedOutletIds },
      isActive: true
    },
    include: {
      outlet: { select: { name: true } },
      category: { select: { name: true } }
    },
    orderBy: { name: "asc" }
  });

  // Serialize before passing to client
  const serializedInventory = {
    id: inventory.id,
    name: inventory.name,
    address: inventory.address,
    isActive: inventory.isActive,
    linkedOutlets: inventory.outlets.map((o) => ({
      id: o.outlet.id,
      name: o.outlet.name,
      isActive: o.outlet.isActive
    }))
  };

  const serializedOutlets = activeOutlets.map((o) => ({
    id: o.id,
    name: o.name
  }));

  const serializedAllInventories = inventoriesList.map((inv) => ({
    id: inv.id,
    name: inv.name,
    isActive: inv.isActive
  }));

  const serializedGstSlabs = gstSlabs.map((s) => ({
    id: s.id,
    rate: s.rate.toString(),
    label: s.label
  }));

  const serializedMenuItems = menuItems.map((item) => ({
    id: item.id,
    name: item.name,
    sku: item.sku,
    unit: item.unit,
    basePrice: item.basePrice.toString(),
    outletId: item.outletId,
    outletName: item.outlet.name,
    categoryName: item.category.name
  }));

  return (
    <InventoryDetailClient
      inventory={serializedInventory}
      allInventories={serializedAllInventories}
      activeOutlets={serializedOutlets}
      gstSlabs={serializedGstSlabs}
      menuItems={serializedMenuItems}
      user={user}
    />
  );
}
