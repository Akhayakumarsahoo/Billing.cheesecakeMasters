import { prisma } from "./db";
import { Prisma } from "@prisma/client";

export async function generateBillNumber(
  outletId: string,
  tx?: Prisma.TransactionClient
): Promise<string> {
  const client = tx || prisma;
  const year = new Date().getFullYear();

  const outlet = await client.outlet.findUnique({
    where: { id: outletId },
    select: { sequenceIndex: true },
  });
  if (!outlet) {
    throw new Error(`Outlet not found: ${outletId}`);
  }
  const outletIndex = outlet.sequenceIndex;

  const executeSequenceUpdate = async (t: Prisma.TransactionClient) => {
    await t.$executeRawUnsafe(
      `INSERT INTO bill_sequences ("outletId", year, "lastSeq")
       VALUES ($1, $2, 0)
       ON CONFLICT ("outletId") DO NOTHING`,
      outletId,
      year,
    );

    // Reset sequence if year has changed
    await t.$executeRawUnsafe(
      `UPDATE bill_sequences SET "lastSeq" = 0, year = $1
       WHERE "outletId" = $2 AND year != $1`,
      year,
      outletId,
    );

    const rows = await t.$queryRawUnsafe<{ lastSeq: number }[]>(
      `UPDATE bill_sequences SET "lastSeq" = "lastSeq" + 1
       WHERE "outletId" = $1
       RETURNING "lastSeq"`,
      outletId,
    );

    return rows[0].lastSeq;
  };

  // Run the sequence update inside the provided transaction, or start a new transaction with 10000ms timeout
  const result = tx
    ? await executeSequenceUpdate(tx)
    : await prisma.$transaction(async (innerTx) => {
        return executeSequenceUpdate(innerTx);
      }, {
        timeout: 10000,
      });

  const seq = String(result).padStart(5, "0");
  return `OTL${outletIndex}-${year}-${seq}`;
}
