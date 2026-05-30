import { getCurrentOutlet } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { OrdersClient } from "./orders-client";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ from?: string, to?: string }> }) {
  const outlet = await getCurrentOutlet();
  if (!outlet) return null;

  const resolvedParams = await searchParams;

  const getLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalDateString(new Date());
  
  const fromStr = resolvedParams.from || todayStr;
  const toStr = resolvedParams.to || todayStr;

  let start = new Date(`${fromStr}T00:00:00.000`);
  let end = new Date(`${toStr}T23:59:59.999`);

  if (!isFinite(start.getTime()) || !isFinite(end.getTime())) {
    start = new Date(`${todayStr}T00:00:00.000`);
    end = new Date(`${todayStr}T23:59:59.999`);
  }

  const bills = await prisma.bill.findMany({
    where: { 
      outletId: outlet.id,
      createdAt: {
        gte: start,
        lte: end,
      }
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
    take: 100, // Slightly increase limit for range
  });

  const serializedBills = bills.map(b => ({
    id: b.id,
    billNumber: b.billNumber,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
    status: b.status,
    grandTotal: b.grandTotal.toString(),
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

  return <OrdersClient key={`${fromStr}-${toStr}`} initialBills={serializedBills} outletName={outlet.name} />;
}
