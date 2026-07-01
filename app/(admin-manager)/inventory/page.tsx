import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { InventoryClient } from "./inventory-client";

export default async function InventoryPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // If user role is storeroom, redirect to their assigned inventory
  if (user.role === "storeroom") {
    if (user.inventoryId) {
      redirect(`/inventory/${user.inventoryId}`);
    } else {
      // Fallback if no inventory assigned
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h1 className="text-lg font-medium text-[var(--text-primary)]">No Assigned Inventory</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Your user account is not linked to any inventory. Please contact your administrator.</p>
          </div>
        </div>
      );
    }
  }

  if (user.role !== "admin" && user.role !== "manager") {
    redirect("/");
  }

  // Fetch all active/inactive inventories
  const inventories = await prisma.inventory.findMany({
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
    },
    orderBy: { name: "asc" }
  });

  // Fetch active outlets for mapping
  const activeOutlets = await prisma.outlet.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" }
  });

  // Serialize models before passing to Client component
  const serializedInventories = inventories.map(inv => ({
    id: inv.id,
    name: inv.name,
    address: inv.address,
    isActive: inv.isActive,
    createdAt: inv.createdAt.toISOString(),
    updatedAt: inv.updatedAt.toISOString(),
    linkedOutlets: inv.outlets.map(o => ({
      id: o.outlet.id,
      name: o.outlet.name
    })),
    activeMaterialsCount: inv.rawMaterials.length
  }));

  const serializedOutlets = activeOutlets.map(o => ({
    id: o.id,
    name: o.name
  }));

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Manage central stores, kitchens, and outlet-specific stock levels.
        </p>
      </div>

      <InventoryClient 
        initialInventories={serializedInventories} 
        activeOutlets={serializedOutlets} 
        userRole={user.role} 
      />
    </div>
  );
}
