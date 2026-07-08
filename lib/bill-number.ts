import { prisma } from "./db";
import { Prisma } from "@prisma/client";

export async function generateBillNumber(
  outletId: string,
  tx?: Prisma.TransactionClient,
  outletSequenceIndex?: number
): Promise<string> {
  const client = tx || prisma;
  const year = new Date().getFullYear();

  let outletIndex = outletSequenceIndex;
  if (outletIndex === undefined) {
    const outlet = await client.outlet.findUnique({
      where: { id: outletId },
      select: { sequenceIndex: true },
    });
    if (!outlet) {
      throw new Error(`Outlet not found: ${outletId}`);
    }
    outletIndex = outlet.sequenceIndex;
  }

  // Execute sequence update using a single atomic PostgreSQL query.
  // This automatically inserts or updates, increments, and handles year reset in one network round-trip.
  const rows = await client.$queryRaw<{ lastSeq: number }[]>`
    INSERT INTO bill_sequences ("outletId", year, "lastSeq")
    VALUES (${outletId}, ${year}, 1)
    ON CONFLICT ("outletId")
    DO UPDATE SET
      "lastSeq" = CASE WHEN bill_sequences.year = EXCLUDED.year THEN bill_sequences."lastSeq" + 1 ELSE 1 END,
      year = EXCLUDED.year
    RETURNING "lastSeq"
  `;

  if (!rows || rows.length === 0) {
    throw new Error(`Failed to generate sequence index for outlet: ${outletId}`);
  }

  const seq = String(rows[0].lastSeq).padStart(5, "0");
  return `OTL${outletIndex}-${year}-${seq}`;
}

