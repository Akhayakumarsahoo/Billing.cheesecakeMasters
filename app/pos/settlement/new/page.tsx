import { getCurrentOutlet } from "@/lib/auth";
import { getBilledSalesForDate, getOpeningCashForDate } from "@/lib/settlement";
import { getLocalDateString } from "@/lib/utils";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { SettlementFormClient } from "./settlement-form-client";

export default async function NewSettlementPage() {
  const outlet = await getCurrentOutlet();
  if (!outlet) return null;

  const todayStr = getLocalDateString(new Date());

  // Check if a daily settlement for today already exists in the database
  const existing = await prisma.dailySettlement.findUnique({
    where: {
      outletId_settlementDate: {
        outletId: outlet.id,
        settlementDate: new Date(`${todayStr}T00:00:00.000Z`),
      },
    },
  });

  if (existing && existing.status !== "cancelled") {
    redirect(`/pos/settlement/edit/${existing.id}`);
  }

  const billedSales = await getBilledSalesForDate(outlet.id, todayStr);
  const openingCash = await getOpeningCashForDate(outlet.id, todayStr);

  const initialSummary = {
    settlementDate: todayStr,
    openingCash: openingCash.toString(),
    billedCash: billedSales.billedCash.toString(),
    billedUpi: billedSales.billedUpi.toString(),
    billedCard: billedSales.billedCard.toString(),
    totalBilled: billedSales.totalBilled.toString(),
  };

  return (
    <SettlementFormClient
      initialSummary={initialSummary}
      outletName={outlet.name}
    />
  );
}
