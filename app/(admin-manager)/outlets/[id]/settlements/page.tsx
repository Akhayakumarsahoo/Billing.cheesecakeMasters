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

  // Auth check — admin and manager only
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "manager")) {
    redirect("/");
  }

  const outlet = await prisma.outlet.findUnique({ where: { id } });
  if (!outlet) notFound();

  const { from, to } = await searchParams;

  if (!from || !to) {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 6);

    const fromStr = getLocalDateString(sevenDaysAgo);
    const toStr = getLocalDateString(today);

    redirect(`/outlets/${id}/settlements?from=${fromStr}&to=${toStr}`);
  }

  const parsed = parseDateRange(from, to);
  const start = parsed.start;
  const end = parsed.end;

  // 1. Fetch latest active settlement to get current cash box balance
  const latestActiveSettlement = await prisma.dailySettlement.findFirst({
    where: {
      outletId: id,
      status: "active",
    },
    orderBy: {
      settlementDate: "desc",
    },
  });

  const currentCashBoxBalance = latestActiveSettlement
    ? latestActiveSettlement.closingCash.toString()
    : "0.00";

  // 2. Fetch all settlements within date range
  const settlements = await prisma.dailySettlement.findMany({
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
  });

  const serializedSettlements = settlements.map((s) => ({
    id: s.id,
    outletId: s.outletId,
    settlementDate: s.settlementDate.toISOString().split("T")[0],
    openingCash: s.openingCash.toString(),
    billedCash: s.billedCash.toString(),
    billedUpi: s.billedUpi.toString(),
    billedCard: s.billedCard.toString(),
    billedOther: s.billedOther.toString(),
    actualCash: s.actualCash.toString(),
    actualUpi: s.actualUpi.toString(),
    actualCard: s.actualCard.toString(),
    actualOther: s.actualOther.toString(),
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
    />
  );
}
