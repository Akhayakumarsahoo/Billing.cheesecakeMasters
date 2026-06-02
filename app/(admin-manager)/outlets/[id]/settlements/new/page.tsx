import { getCurrentUser } from "@/lib/auth";
import { getBilledSalesForDate, getOpeningCashForDate } from "@/lib/settlement";
import { getLocalDateString } from "@/lib/utils";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { AdminSettlementFormClient } from "../admin-settlement-form-client";

export default async function AdminNewSettlementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Auth check — admin and manager only
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "manager")) {
    redirect("/");
  }

  const outlet = await prisma.outlet.findUnique({ where: { id } });
  if (!outlet) notFound();

  const todayStr = getLocalDateString(new Date());

  // If manager, check if today's settlement already exists (managers can only manage today's)
  if (user.role === "manager") {
    const existing = await prisma.dailySettlement.findUnique({
      where: {
        outletId_settlementDate: {
          outletId: id,
          settlementDate: new Date(`${todayStr}T00:00:00.000Z`),
        },
      },
    });

    if (existing && existing.status !== "cancelled") {
      redirect(`/outlets/${id}/settlements/edit/${existing.id}`);
    }
  }

  const billedSales = await getBilledSalesForDate(id, todayStr);
  const openingCash = await getOpeningCashForDate(id, todayStr);

  const initialSummary = {
    settlementDate: todayStr,
    openingCash: openingCash.toString(),
    billedCash: billedSales.billedCash.toString(),
    billedUpi: billedSales.billedUpi.toString(),
    billedCard: billedSales.billedCard.toString(),
    billedOther: billedSales.billedOther.toString(),
    totalBilled: billedSales.totalBilled.toString(),
  };

  return (
    <AdminSettlementFormClient
      initialSummary={initialSummary}
      outletName={outlet.name}
      outletId={id}
      role={user.role}
    />
  );
}
