import { getCurrentOutlet } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseDateRange, getLocalDateString } from "@/lib/utils";
import { redirect } from "next/navigation";
import { SettlementHistoryClient } from "./settlement-history-client";

export default async function SettlementPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const outlet = await getCurrentOutlet();
  if (!outlet) return null;

  const { from, to } = await searchParams;

  if (!from || !to) {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 6);

    const fromStr = getLocalDateString(sevenDaysAgo);
    const toStr = getLocalDateString(today);

    redirect(`/pos/settlement?from=${fromStr}&to=${toStr}`);
  }

  const parsed = parseDateRange(from, to);
  const start = parsed.start;
  const end = parsed.end;

  // 1. Fetch latest active settlement to get current cash box balance
  const latestActiveSettlement = await prisma.dailySettlement.findFirst({
    where: {
      outletId: outlet.id,
      status: "active",
    },
    orderBy: {
      settlementDate: "desc",
    },
  });

  const currentCashBoxBalance = latestActiveSettlement
    ? latestActiveSettlement.closingCash.toString()
    : "0.00";

  // 2. Fetch settlements in range
  const settlements = await prisma.dailySettlement.findMany({
    where: {
      outletId: outlet.id,
      settlementDate: {
        gte: start,
        lte: end,
      },
    },
    include: {
      createdBy: { select: { name: true } },
      modifiedBy: { select: { name: true } },
    },
    orderBy: {
      settlementDate: "desc",
    },
  });

  const serializedSettlements = settlements.map((s) => ({
    id: s.id,
    outletId: s.outletId,
    settlementDate: s.settlementDate.toISOString().split("T")[0],
    openingCash: s.openingCash.toString(),
    billedCash: s.billedCash.toString(),
    billedUpi: s.billedUpi.toString(),
    billedCard: s.billedCard.toString(),
    actualCash: s.actualCash.toString(),
    actualUpi: s.actualUpi.toString(),
    actualCard: s.actualCard.toString(),
    cashExpense: s.cashExpense.toString(),
    cashWithdraw: s.cashWithdraw.toString(),
    closingCash: s.closingCash.toString(),
    status: s.status,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    createdByName: s.createdBy?.name ?? null,
    modifiedByName: s.modifiedBy?.name ?? null,
  }));

  return (
    <SettlementHistoryClient
      initialSettlements={serializedSettlements}
      currentCashBoxBalance={currentCashBoxBalance}
      outletName={outlet.name}
      fromDate={from}
      toDate={to}
    />
  );
}
