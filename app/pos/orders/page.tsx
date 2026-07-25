import { getCurrentOutlet } from "@/lib/auth";
import { prisma, Decimal } from "@/lib/db";
import { parseDateRange } from "@/lib/utils";
import { OrdersClient } from "./orders-client";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ from?: string, to?: string }> }) {
  const outlet = await getCurrentOutlet();
  if (!outlet) return null;

  const resolvedParams = await searchParams;
  const { start, end, todayStr } = parseDateRange(resolvedParams.from, resolvedParams.to);

  const fromStr = resolvedParams.from || todayStr;
  const toStr = resolvedParams.to || todayStr;

  const bills = await prisma.bill.findMany({
    where: { 
      outletId: outlet.id,
      OR: [
        { completedAt: { gte: start, lte: end } },
        { status: "draft", createdAt: { gte: start, lte: end } }
      ]
    },
    include: {
      payments: true,
      modifiedBy: { select: { name: true } },
      lineItems: {
        include: {
          menuItem: {
            include: { gstSlab: true }
          }
        }
      },
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
      quantity: li.quantity.toString(),
      menuItem: li.menuItem ? {
        id: li.menuItem.id,
        name: li.menuItem.name,
        sku: li.menuItem.sku,
        basePrice: li.menuItem.basePrice.toString(),
        unit: li.menuItem.unit,
        categoryId: li.menuItem.categoryId,
        gstSlab: { rate: li.menuItem.gstSlab.rate.toString() }
      } : undefined
    }))
  }));

  return (
    <OrdersClient
      initialBills={serializedBills}
      outletName={outlet.name}
      fromDate={fromStr}
      toDate={toStr}
      summaryStats={summaryStats}
    />
  );
}

