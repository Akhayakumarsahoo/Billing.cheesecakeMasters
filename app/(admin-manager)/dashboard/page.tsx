import { prisma } from "@/lib/db";
import { Decimal } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { parseDateRange } from "@/lib/utils";
import { Suspense } from "react";
import { DashboardSkeleton } from "@/components/ui-skeletons";
import { DashboardClient } from "./dashboard-client";

export default async function SalesDashboard({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;

  return (
    <Suspense key={`${from || ""}-${to || ""}`} fallback={<DashboardSkeleton />}>
      <DashboardContent from={from} to={to} />
    </Suspense>
  );
}

async function DashboardContent({ from, to }: { from?: string; to?: string }) {
  const { start, end } = parseDateRange(from, to);

  // Fetch active outlets (for building the per-outlet breakdown)
  const outlets = await prisma.outlet.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  const cashboxMap: Record<string, Decimal> = {};
  for (const o of outlets) {
    cashboxMap[o.id] = new Decimal(0);
  }

  if (outlets.length > 0) {
    const latestSettlements = await prisma.$queryRaw<
      { outletId: string; closingCash: string }[]
    >`
      SELECT DISTINCT ON ("outletId") "outletId", "closingCash"::text
      FROM daily_settlements
      WHERE status = 'active' AND "outletId" IN (${Prisma.join(outlets.map((o) => o.id))})
      ORDER BY "outletId", "settlementDate" DESC
    `;

    for (const s of latestSettlements) {
      cashboxMap[s.outletId] = new Decimal(s.closingCash);
    }
  }

  // 1. Fetch walkaways count grouped by outletId
  const outletWalkaways = await prisma.walkaway.groupBy({
    by: ["outletId"],
    where: {
      createdAt: { gte: start, lte: end },
    },
    _count: { id: true },
  });

  // 2. Fetch walkaway reasons grouped by outletId and reason
  const walkawayReasons = await prisma.walkaway.groupBy({
    by: ["outletId", "reason"],
    where: {
      createdAt: { gte: start, lte: end },
    },
    _count: { id: true },
  });

  // 3. Fetch printed bills aggregations grouped by outletId
  const outletGroups = await prisma.bill.groupBy({
    by: ["outletId"],
    where: {
      status: "printed",
      completedAt: { gte: start, lte: end },
    },
    _count: {
      id: true,
    },
    _sum: {
      grandTotal: true,
      discount: true,
      totalGst: true,
    },
  });

  // 4. Fetch printed bill payment details using SQL group by to avoid loading all rows
  const paymentBreakdown = await prisma.$queryRaw<
    { outletId: string; mode: string; totalAmount: string }[]
  >`
    SELECT b."outletId", p.mode::text, SUM(p.amount)::text as "totalAmount"
    FROM bill_payments p
    JOIN bills b ON p."billId" = b.id
    WHERE b.status = 'printed' AND b."completedAt" >= ${start} AND b."completedAt" <= ${end}
    GROUP BY b."outletId", p.mode
  `;

  const outletPaymentsMap: Record<string, { cash: number; upi: number; card: number; online: number }> = {};
  for (const o of outlets) {
    outletPaymentsMap[o.id] = { cash: 0, upi: 0, card: 0, online: 0 };
  }
  for (const item of paymentBreakdown) {
    const outletId = item.outletId;
    const mode = item.mode.toLowerCase();
    const amount = parseFloat(item.totalAmount || "0");
    if (!outletPaymentsMap[outletId]) continue;
    if (mode === "cash") outletPaymentsMap[outletId].cash += amount;
    else if (mode === "card") outletPaymentsMap[outletId].card += amount;
    else if (mode === "upi") outletPaymentsMap[outletId].upi += amount;
    else if (mode === "online") outletPaymentsMap[outletId].online += amount;
  }

  const outletWalkawaysMap: Record<string, Record<string, number>> = {};
  const walkawayMap: Record<string, number> = {};
  for (const o of outlets) {
    walkawayMap[o.id] = 0;
    outletWalkawaysMap[o.id] = {
      "Price too high": 0,
      "Desired item/flavor out of stock": 0,
      "Long waiting time": 0,
      "Will return later": 0,
      "Just exploring/browsing": 0,
      "Other": 0,
    };
  }

  for (const ow of outletWalkaways) {
    walkawayMap[ow.outletId] = ow._count.id;
  }

  for (const wr of walkawayReasons) {
    const outletId = wr.outletId;
    if (!outletWalkawaysMap[outletId]) continue;
    const reason = wr.reason;
    const count = wr._count.id;
    if (reason in outletWalkawaysMap[outletId]) {
      outletWalkawaysMap[outletId][reason] = count;
    } else {
      outletWalkawaysMap[outletId]["Other"] += count;
    }
  }

  const outletStatsMap: Record<
    string,
    {
      id: string;
      name: string;
      billsCount: number;
      revenue: Decimal;
      discount: Decimal;
      gstTotal: Decimal;
      walkawayCount: number;
    }
  > = {};

  for (const o of outlets) {
    outletStatsMap[o.id] = {
      id: o.id,
      name: o.name,
      billsCount: 0,
      revenue: new Decimal(0),
      discount: new Decimal(0),
      gstTotal: new Decimal(0),
      walkawayCount: walkawayMap[o.id] || 0,
    };
  }

  for (const g of outletGroups) {
    const stat = outletStatsMap[g.outletId];
    if (!stat) continue;
    stat.billsCount = g._count.id;
    stat.revenue = g._sum.grandTotal || new Decimal(0);
    stat.discount = g._sum.discount || new Decimal(0);
    stat.gstTotal = g._sum.totalGst || new Decimal(0);
  }

  const outletStatsList = outlets.map((o) => {
    const stat = outletStatsMap[o.id];
    const payments = outletPaymentsMap[o.id] || { cash: 0, upi: 0, card: 0, online: 0 };
    const walkawayReasonsList = outletWalkawaysMap[o.id] || {
      "Price too high": 0,
      "Desired item/flavor out of stock": 0,
      "Long waiting time": 0,
      "Will return later": 0,
      "Just exploring/browsing": 0,
      "Other": 0,
    };
    return {
      id: o.id,
      name: o.name,
      billsCount: stat?.billsCount || 0,
      revenue: stat?.revenue.toNumber() || 0,
      discount: stat?.discount.toNumber() || 0,
      gstTotal: stat?.gstTotal.toNumber() || 0,
      cashboxBalance: cashboxMap[o.id]?.toNumber() || 0,
      walkawayCount: stat?.walkawayCount || 0,
      walkawayReasons: walkawayReasonsList,
      payments,
    };
  });

  return <DashboardClient initialData={outletStatsList} />;
}
