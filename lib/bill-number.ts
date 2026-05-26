import { prisma } from "./db";

export async function generateBillNumber(outletId: string): Promise<string> {
  const year = new Date().getFullYear();

  // Get outlet index (1-based) for the prefix
  const outlets = await prisma.outlet.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  const outletIndex = outlets.findIndex((o) => o.id === outletId) + 1;

  // Upsert sequence row and increment atomically
  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `INSERT INTO bill_sequences ("outletId", year, "lastSeq")
       VALUES ($1, $2, 0)
       ON CONFLICT ("outletId") DO NOTHING`,
      outletId,
      year,
    );

    // Reset sequence if year has changed
    await tx.$executeRawUnsafe(
      `UPDATE bill_sequences SET "lastSeq" = 0, year = $1
       WHERE "outletId" = $2 AND year != $1`,
      year,
      outletId,
    );

    const rows = await tx.$queryRawUnsafe<{ lastSeq: number }[]>(
      `UPDATE bill_sequences SET "lastSeq" = "lastSeq" + 1
       WHERE "outletId" = $1
       RETURNING "lastSeq"`,
      outletId,
    );

    return rows[0].lastSeq;
  });

  const seq = String(result).padStart(5, "0");
  return `OTL${outletIndex}-${year}-${seq}`;
}
