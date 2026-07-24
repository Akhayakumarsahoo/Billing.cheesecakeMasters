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

  // Fetch inventory, active outlets, inventories list, and GST slabs in parallel
  const [inventory, activeOutlets, inventoriesList, gstSlabs] = await Promise.all([
    prisma.inventory.findUnique({
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
    }),
    prisma.outlet.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" }
    }),
    (user.role === "admin" || user.role === "manager")
      ? prisma.inventory.findMany({
          select: { id: true, name: true, isActive: true },
          orderBy: { name: "asc" }
        })
      : Promise.resolve([]),
    prisma.gstSlab.findMany({
      orderBy: { id: "asc" }
    })
  ]);

  if (!inventory) {
    redirect("/inventory");
  }

  const finalInventoriesList = (user.role === "admin" || user.role === "manager")
    ? inventoriesList
    : [{ id: inventory.id, name: inventory.name, isActive: inventory.isActive }];

  // Fetch menu items from linked outlets
  const linkedOutletIds = inventory.outlets.map((o) => o.outletId);
  const menuItems = linkedOutletIds.length > 0
    ? await prisma.menuItem.findMany({
        where: {
          outletId: { in: linkedOutletIds },
          isActive: true
        },
        include: {
          outlet: { select: { name: true } },
          category: { select: { name: true } }
        },
        orderBy: { name: "asc" }
      })
    : [];

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

  const serializedAllInventories = finalInventoriesList.map((inv) => ({
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
