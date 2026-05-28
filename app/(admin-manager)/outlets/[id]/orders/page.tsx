import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
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

  // Auth check — admin and manager only
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "manager")) {
    redirect("/");
  }

  const outlet = await prisma.outlet.findUnique({ where: { id } });
  if (!outlet) notFound();

  const { from, to } = await searchParams;
  const { start, end } = parseDateRange(from, to);


  const bills = await prisma.bill.findMany({
    where: { 
      outletId: id,
      createdAt: {
        gte: start,
        lte: end,
      }
    },
    include: {
      payments: true,
      lineItems: {
        include: {
          menuItem: {
            include: { gstSlab: true }
          }
        }
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const serializedBills = bills.map(b => ({
    id: b.id,
    billNumber: b.billNumber,
    createdAt: b.createdAt.toISOString(),
    status: b.status,
    grandTotal: b.grandTotal.toString(),
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
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <AdminOrdersClient 
        initialBills={serializedBills} 
        outletName={outlet.name} 
        role={user.role} 
      />
    </div>
  );
}
