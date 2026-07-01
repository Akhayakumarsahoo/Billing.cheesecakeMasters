import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { recomputeStock } from "@/lib/inventory";
import { z } from "zod";
import { NextResponse } from "next/server";

const AdjustStockSchema = z.object({
  inventoryId: z.string().uuid(),
  adjustments: z.array(
    z.object({
      rawMaterialId: z.string().uuid(),
      targetStock: z.number()
    })
  ).min(1)
});

export async function POST(req: Request) {
  try {
    const user = await requireAuth();

    // Permission checks
    if (user.role !== "admin" && user.role !== "storeroom") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only admin and assigned storeroom users can adjust stock" } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = AdjustStockSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid adjustments list payload" } },
        { status: 400 }
      );
    }

    const { inventoryId, adjustments } = result.data;

    // Scope check for storeroom users
    if (user.role === "storeroom" && user.inventoryId !== inventoryId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Access restricted to your assigned inventory" } },
        { status: 403 }
      );
    }

    // Run batch database transaction
    const results = await prisma.$transaction(async (tx) => {
      const updatedMaterials = [];

      for (const adj of adjustments) {
        // Fetch raw material to get currentStock
        const material = await tx.rawMaterial.findUnique({
          where: { id: adj.rawMaterialId }
        });

        if (!material) {
          throw new Error(`Material with ID ${adj.rawMaterialId} not found`);
        }

        // Verify the material belongs to the inventory
        if (material.inventoryId !== inventoryId) {
          throw new Error(`Material ${material.name} does not belong to inventory ${inventoryId}`);
        }

        const oldStock = Number(material.currentStock);
        const newStock = adj.targetStock;
        const diff = newStock - oldStock;

        if (diff === 0) continue; // skip unchanged

        // Insert stock movement
        await tx.stockMovement.create({
          data: {
            inventoryId,
            rawMaterialId: adj.rawMaterialId,
            movementType: "adjustment",
            referenceType: "manual",
            quantityChange: diff,
            note: `Manual stock adjustment (from ${oldStock.toFixed(3)} to ${newStock.toFixed(3)})`,
            createdById: user.id
          }
        });

        // Recompute stock
        const updated = await recomputeStock(adj.rawMaterialId, tx);
        updatedMaterials.push(updated);
      }

      return updatedMaterials;
    }, {
      timeout: 10000 // 10s timeout to handle batch updates safely
    });

    return NextResponse.json({ data: { updatedCount: results.length } }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("POST /api/raw-materials/adjust error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: error.message || "Failed to adjust stock levels" } },
      { status: 500 }
    );
  }
}
