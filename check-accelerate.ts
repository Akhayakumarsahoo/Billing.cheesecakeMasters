import fs from "fs";
import path from "path";

const envLocal = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf-8");
const lines = envLocal.split("\n");
for (const line of lines) {
  const parts = line.split("=");
  if (parts.length >= 2) {
    const key = parts[0].trim();
    let val = parts.slice(1).join("=").trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    process.env[key] = val;
  }
}

async function testAll() {
  const { prisma } = await import("./lib/db");

  console.log("Testing outlets query...");
  const outlets = await prisma.outlet.findMany({ select: { id: true, name: true } });
  console.log("✓ Outlets count:", outlets.length);

  console.log("Testing walkaways groupBy...");
  const walkaways = await prisma.walkaway.groupBy({
    by: ["outletId"],
    _count: { id: true },
  });
  console.log("✓ Walkaways count:", walkaways.length);

  console.log("Testing bills groupBy...");
  const bills = await prisma.bill.groupBy({
    by: ["outletId"],
    _sum: { grandTotal: true, discount: true, totalGst: true },
    _count: { id: true },
  });
  console.log("✓ Bills grouped:", bills.length);

  console.log("Testing raw query for payment breakdown...");
  const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = new Date();
  const paymentBreakdown = await prisma.$queryRaw<{ outletId: string; mode: string; totalAmount: string }[]>`
    SELECT b."outletId", p.mode::text, SUM(p.amount)::text as "totalAmount"
    FROM bill_payments p
    JOIN bills b ON p."billId" = b.id
    WHERE b.status = 'printed' AND b."completedAt" >= ${start} AND b."completedAt" <= ${end}
    GROUP BY b."outletId", p.mode
  `;
  console.log("✓ Payment breakdown rows:", paymentBreakdown.length);

  console.log("Testing transactions...");
  await prisma.$transaction(async (tx) => {
    const count = await tx.outlet.count();
    console.log("✓ Inside transaction, outlets count:", count);
  });

  console.log("\nALL DATABASE TESTS PASSED SUCCESSFULLY!");
}

testAll()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\nTEST FAILED WITH ERROR:");
    console.error(err);
    process.exit(1);
  });
