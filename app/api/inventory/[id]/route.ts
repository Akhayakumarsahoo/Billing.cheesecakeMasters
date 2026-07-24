import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UpdateInventorySchema } from "@/lib/validators";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    // Scope check: storeroom user can only access their assigned inventory
    if (user.role === "storeroom" && user.inventoryId !== id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Access restricted to your assigned inventory" } },
        { status: 403 }
      );
    } else if (user.role !== "admin" && user.role !== "manager" && user.role !== "storeroom") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized" } },
        { status: 403 }
      );
    }

    const [inventory, recentMovements] = await Promise.all([
      prisma.inventory.findUnique({
        where: { id },
        include: {
          outlets: {
            include: {
              outlet: {
                select: { id: true, name: true, isActive: true }
              }
            }
          },
          rawMaterials: {
            select: {
              id: true,
              currentStock: true,
              lowStockAlert: true,
              isActive: true,
              purchasePrice: true
            }
          }
        }
      }),
      prisma.stockMovement.findMany({
        where: { inventoryId: id },
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          rawMaterial: {
            select: { name: true, unit: true }
          },
          createdBy: {
            select: { name: true, email: true }
          }
        }
      })
    ]);

    if (!inventory) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Inventory not found" } },
        { status: 404 }
      );
    }

    // Compute stats
    const totalMaterials = inventory.rawMaterials.filter(m => m.isActive).length;
    const lowStockCount = inventory.rawMaterials.filter(m => {
      if (!m.isActive || m.lowStockAlert === null) return false;
      const stock = Number(m.currentStock);
      const alert = Number(m.lowStockAlert);
      return stock < alert;
    }).length;

    const totalValuation = inventory.rawMaterials
      .filter(m => m.isActive)
      .reduce((sum, m) => {
        const stock = Number(m.currentStock);
        const price = Number(m.purchasePrice);
        return sum + (stock * price);
      }, 0);

    const data = {
      id: inventory.id,
      name: inventory.name,
      address: inventory.address,
      isActive: inventory.isActive,
      linkedOutlets: inventory.outlets.map(o => ({
        id: o.outlet.id,
        name: o.outlet.name,
        isActive: o.outlet.isActive
      })),
      stats: {
        totalMaterials,
        lowStockCount,
        totalValuation: totalValuation.toFixed(2)
      },
      recentMovements: recentMovements.map(m => ({
        id: m.id,
        movementType: m.movementType,
        referenceType: m.referenceType,
        referenceId: m.referenceId,
        quantityChange: m.quantityChange.toString(),
        note: m.note,
        createdAt: m.createdAt.toISOString(),
        materialName: m.rawMaterial.name,
        unit: m.rawMaterial.unit,
        creatorName: m.createdBy.name,
        creatorEmail: m.createdBy.email
      }))
    };

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("GET /api/inventory/[id] error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch inventory details" } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only admin can update inventory" } },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const result = UpdateInventorySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input values" } },
        { status: 400 }
      );
    }

    const { name, address, outletIds } = result.data;

    // Check unique name if changing name
    if (name) {
      const existing = await prisma.inventory.findFirst({
        where: { name, NOT: { id } }
      });
      if (existing) {
        return NextResponse.json(
          { error: { code: "CONFLICT", message: "An inventory with this name already exists" } },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      // If outletIds is supplied, sync links
      if (outletIds !== undefined) {
        // Delete all old links
        await tx.inventoryOutlet.deleteMany({
          where: { inventoryId: id }
        });

        // Insert new links
        if (outletIds.length > 0) {
          await tx.inventoryOutlet.createMany({
            data: outletIds.map(oId => ({
              inventoryId: id,
              outletId: oId
            }))
          });
        }
      }

      // Update inventory name/address
      return tx.inventory.update({
        where: { id },
        data: {
          name: name ?? undefined,
          address: address !== undefined ? address : undefined
        }
      });
    });

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("PATCH /api/inventory/[id] error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update inventory" } },
      { status: 500 }
    );
  }
}
