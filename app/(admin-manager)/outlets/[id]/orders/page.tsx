import { getCurrentUser } from "@/lib/auth";
import { prisma, Decimal } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { AdminOrdersClient } from "./admin-orders-client";
import { parseDateRange } from "@/lib/utils";

export default async function OutletOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { id } = await params;
  const [{ from, to }, user, outlet] = await Promise.all([
    searchParams,
    getCurrentUser(),
    prisma.outlet.findUnique({ where: { id } })
  ]);

  if (!user || (user.role !== "admin" && user.role !== "manager")) {
    redirect("/");
  }

  if (!outlet) notFound();

  const { start, end } = parseDateRange(from, to);

  const bills = await prisma.bill.findMany({
    where: { 
      outletId: id,
      OR: [
        { completedAt: { gte: start, lte: end } },
        { status: "draft", createdAt: { gte: start, lte: end } }
      ]
    },
    include: {
      payments: true,
      modifiedBy: { select: { name: true } },
      lineItems: true,
    },
    orderBy: { createdAt: "desc" },
    take: 150,
  });

  // Calculate summary metrics for the selected range
  let netSales = new Decimal(0);
  let printedCount = 0;
  let cancelledCount = 0;
  let cancelledTotal = new Decimal(0);

  for (const b of bills) {
    if (b.status === "printed") {
      netSales = netSales.add(b.grandTotal);
      printedCount++;
    } else if (b.status === "cancelled") {
      cancelledTotal = cancelledTotal.add(b.grandTotal);
      cancelledCount++;
    }
  }

  const summaryStats = {
    netSales: netSales.toFixed(2),
    printedCount,
    cancelledCount,
    cancelledTotal: cancelledTotal.toFixed(2),
  };

  const serializedBills = bills.map(b => ({
    id: b.id,
    billNumber: b.billNumber,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
    status: b.status,
    grandTotal: b.grandTotal.toString(),
    subtotal: b.subtotal.toString(),
    totalCgst: b.totalCgst.toString(),
    totalSgst: b.totalSgst.toString(),
    totalGst: b.totalGst.toString(),
    discount: b.discount.toString(),
    discountType: b.discountType,
    discountReason: b.discountReason,
    discountValue: b.discountValue ? b.discountValue.toString() : null,
    modifiedByName: b.modifiedBy?.name ?? null,
    payments: b.payments.map(p => ({
      mode: p.mode,
      amount: p.amount.toString()
    })),
    lineItems: b.lineItems.map(li => ({
      id: li.id,
      itemName: li.itemName,
      basePrice: li.basePrice.toString(),
      unit: li.unit,
      gstRate: li.gstRate.toString(),
      quantity: li.quantity.toString()
    }))
  }));

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <AdminOrdersClient
        initialBills={serializedBills}
        outletName={outlet.name}
        role={user.role}
        fromDate={from || "today"}
        toDate={to || "today"}
        summaryStats={summaryStats}
      />
    </div>
  );
}
