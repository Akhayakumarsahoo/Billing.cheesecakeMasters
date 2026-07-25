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

  // Parallelize ALL 5 queries concurrently in a single Promise.all (Eliminating DB Waterfalls for TTFB < 300ms)
  const [inventory, activeOutlets, inventoriesList, gstSlabs, menuItems] = await Promise.all([
    prisma.inventory.findUnique({
      where: { id },
      include: {
        outlets: {
          include: {
            outlet: true
          }
        },
        rawMaterials: {
          select: {
            id: true,
            name: true,
            unit: true,
            currentStock: true,
            lowStockAlert: true,
            isActive: true,
            purchasePrice: true
          }
        }
      }
    }),
    prisma.outlet.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
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
    }),
    prisma.menuItem.findMany({
      where: {
        outlet: {
          inventoryLinks: {
            some: { inventoryId: id }
          }
        },
        isActive: true
      },
      include: {
        outlet: { select: { name: true } },
        category: { select: { name: true } }
      },
      orderBy: { name: "asc" }
    })
  ]);

  if (!inventory) {
    redirect("/inventory");
  }

  const finalInventoriesList = (user.role === "admin" || user.role === "manager")
    ? inventoriesList
    : [{ id: inventory.id, name: inventory.name, isActive: inventory.isActive }];

  // Pre-calculate initial stats server-side so LCP element renders immediately on HTML paint
  const activeRawMaterials = inventory.rawMaterials.filter(m => m.isActive);
  const totalMaterials = activeRawMaterials.length;
  const lowStockCount = activeRawMaterials.filter(m => {
    if (m.lowStockAlert === null) return false;
    const stock = Number(m.currentStock);
    const alert = Number(m.lowStockAlert);
    return stock < alert;
  }).length;

  const totalValuation = activeRawMaterials.reduce((sum, m) => {
    const stock = Number(m.currentStock);
    const price = Number(m.purchasePrice);
    return sum + (stock * price);
  }, 0);

  const initialStats = {
    totalMaterials,
    lowStockCount,
    totalValuation: totalValuation.toFixed(2)
  };

  const initialRawMaterials = activeRawMaterials.map(m => ({
    id: m.id,
    name: m.name,
    unit: m.unit,
    currentStock: m.currentStock.toString(),
    lowStockAlert: m.lowStockAlert ? m.lowStockAlert.toString() : null,
    isActive: m.isActive
  }));

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
      initialStats={initialStats}
      initialRawMaterials={initialRawMaterials}
      user={user}
    />
  );
}
