import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { recomputeStock } from "@/lib/inventory";
import { z } from "zod";
import { NextResponse } from "next/server";
import { getLocalDateString } from "@/lib/utils";

const AdjustStockSchema = z.object({
  inventoryId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
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

    const { inventoryId, date, adjustments } = result.data;

    // Scope check for storeroom users
    if (user.role === "storeroom" && user.inventoryId !== inventoryId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Access restricted to your assigned inventory" } },
        { status: 403 }
      );
    }

    const todayStr = getLocalDateString(new Date());
    const isPreviousDate = !!(date && date < todayStr);
    const endDate = isPreviousDate ? new Date(`${date}T23:59:59.999`) : null;

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

        let oldStock = Number(material.currentStock);
        let adjustmentDate = new Date();

        if (isPreviousDate && endDate) {
          adjustmentDate = endDate;

          // Compute movements after endDate
          const afterAggregation = await tx.stockMovement.aggregate({
            where: {
              rawMaterialId: adj.rawMaterialId,
              createdAt: { gt: endDate }
            },
            _sum: {
              quantityChange: true
            }
          });
          const changeAfter = Number(afterAggregation._sum.quantityChange || 0);
          oldStock = oldStock - changeAfter;
        }

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
            note: isPreviousDate
              ? `Manual stock adjustment for ${date} (from ${oldStock.toFixed(3)} to ${newStock.toFixed(3)})`
              : `Manual stock adjustment (from ${oldStock.toFixed(3)} to ${newStock.toFixed(3)})`,
            createdById: user.id,
            createdAt: adjustmentDate
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
