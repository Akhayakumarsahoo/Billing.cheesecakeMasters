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

/**
 * Atomically adjusts the current stock of a raw material by the given change.
 * Prevents having to recompute historical aggregate sums for simple transactions.
 */
export async function adjustStock(
  rawMaterialId: string,
  quantityChange: Prisma.Decimal | number,
  tx?: Prisma.TransactionClient
) {
  const db = tx || prisma;

  const updatedMaterial = await db.rawMaterial.update({
    where: { id: rawMaterialId },
    data: {
      currentStock: {
        increment: quantityChange
      }
    }
  });

  return updatedMaterial;
}

