import { getCurrentUser } from "@/lib/auth";
import { getBilledSalesForDate } from "@/lib/settlement";
import { getLocalDateString } from "@/lib/utils";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { AdminSettlementFormClient } from "../../admin-settlement-form-client";

export default async function AdminEditSettlementPage({
  params,
}: {
  params: Promise<{ id: string; settlementId: string }>;
}) {
  const { id, settlementId } = await params;

  // Auth check — admin and manager only
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "manager")) {
    redirect("/");
  }

  const outlet = await prisma.outlet.findUnique({ where: { id } });
  if (!outlet) notFound();

  const settlement = await prisma.dailySettlement.findUnique({
    where: { id: settlementId },
  });

  if (!settlement || settlement.outletId !== id) {
    notFound();
  }

  // Authorization checks
  const now = new Date();
  const settlementTime = new Date(settlement.createdAt);
  const msDiff = now.getTime() - settlementTime.getTime();
  const hoursDiff = msDiff / (1000 * 60 * 60);

  const todayStr = getLocalDateString(new Date());
  const targetDate = new Date(`${settlement.settlementDate.toISOString().split("T")[0]}T00:00:00`);
  const todayDate = new Date(`${todayStr}T00:00:00`);
  const diffMs = todayDate.getTime() - targetDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (user.role === "manager") {
    // Managers can only edit settlements within 24 hours of creation
    if (hoursDiff > 24) {
      redirect(`/outlets/${id}/settlements`);
    }
  } else if (user.role === "admin") {
    // Admins can edit settlements within the last 30 days
    if (diffDays < 0 || diffDays > 30) {
      redirect(`/outlets/${id}/settlements`);
    }
  }

  const dateStr = settlement.settlementDate.toISOString().split("T")[0];
  const billedSales = await getBilledSalesForDate(id, dateStr);

  const initialSummary = {
    settlementDate: dateStr,
    openingCash: settlement.openingCash.toString(),
    billedCash: billedSales.billedCash.toString(),
    billedUpi: billedSales.billedUpi.toString(),
    billedCard: billedSales.billedCard.toString(),
    totalBilled: billedSales.totalBilled.toString(),
  };

  const initialFormValues = {
    actualCash: settlement.actualCash.toString(),
    actualUpi: settlement.actualUpi.toString(),
    actualCard: settlement.actualCard.toString(),
    cashExpense: settlement.cashExpense.toString(),
    cashWithdraw: settlement.cashWithdraw.toString(),
  };

  return (
    <AdminSettlementFormClient
      initialSummary={initialSummary}
      outletName={outlet.name}
      outletId={id}
      role={user.role}
      isEdit={true}
      settlementId={settlementId}
      initialFormValues={initialFormValues}
    />
  );
}
