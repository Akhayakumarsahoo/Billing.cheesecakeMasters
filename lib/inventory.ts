import { prisma } from "./db";
import { Prisma } from "@prisma/client";

/**
 * Recalculates the current stock for a given raw material by summing
 * all non-cancelled stock movements. Updates the RawMaterial model
 * atomically within the transaction context if provided.
 */
export async function recomputeStock(
  rawMaterialId: string,
  tx?: Prisma.TransactionClient
) {
  const db = tx || prisma;

  // Aggregate quantity changes for this material
  const aggregation = await db.stockMovement.aggregate({
    where: { rawMaterialId },
    _sum: {
      quantityChange: true
    }
  });

  const newStock = aggregation._sum.quantityChange || new Prisma.Decimal(0);

  // Update the raw material's current stock
  const updatedMaterial = await db.rawMaterial.update({
    where: { id: rawMaterialId },
    data: {
      currentStock: newStock
    }
  });

  return updatedMaterial;
}
