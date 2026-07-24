import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { parseDateRange, getLocalDateString } from "@/lib/utils";
import { AdminSettlementHistoryClient } from "./admin-settlement-history-client";

export default async function OutletSettlementsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { id } = await params;
  const [{ from, to }, user] = await Promise.all([
    searchParams,
    getCurrentUser(),
  ]);

  if (!user || (user.role !== "admin" && user.role !== "manager")) {
    redirect("/");
  }

  let effectiveFrom = from;
  let effectiveTo = to;

  if (!effectiveFrom || !effectiveTo) {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 6);

    effectiveFrom = effectiveFrom || getLocalDateString(sevenDaysAgo);
    effectiveTo = effectiveTo || getLocalDateString(today);
  }

  const { start, end } = parseDateRange(effectiveFrom, effectiveTo);

  const [outlet, latestActiveSettlement, settlements] = await Promise.all([
    prisma.outlet.findUnique({ where: { id } }),
    prisma.dailySettlement.findFirst({
      where: {
        outletId: id,
        status: "active",
      },
      orderBy: {
        settlementDate: "desc",
      },
    }),
    prisma.dailySettlement.findMany({
      where: {
        outletId: id,
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
    }),
  ]);

  if (!outlet) notFound();

  const currentCashBoxBalance = latestActiveSettlement
    ? latestActiveSettlement.closingCash.toString()
    : "0.00";

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
    <AdminSettlementHistoryClient
      initialSettlements={serializedSettlements}
      currentCashBoxBalance={currentCashBoxBalance}
      outletName={outlet.name}
      outletId={id}
      role={user.role}
      fromDate={effectiveFrom}
      toDate={effectiveTo}
    />
  );
}
