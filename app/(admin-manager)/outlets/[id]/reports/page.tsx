import { getCurrentUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { parseDateRange } from "@/lib/utils";
import { prisma } from "@/lib/db";
import { ReportsClient } from "@/components/reports/reports-client";
import { Decimal } from "@/lib/db";

export default async function OutletReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string; itemId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "manager")) {
    redirect("/");
  }

  const { id } = await params;
  const outlet = await prisma.outlet.findUnique({
    where: { id },
  });
  if (!outlet) notFound();

  const { from, to, itemId } = await searchParams;
  const { start, end } = parseDateRange(from, to);

  // 1. Fetch active outlets (for layout and selectors)
  const activeOutlets = await prisma.outlet.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // 2. Fetch all menu items for the outlet item selector
  const menuItems = await prisma.menuItem.findMany({
    where: { outletId: id },
    orderBy: { name: "asc" },
    select: { id: true, name: true, sku: true },
  });

  // 3. Report 2: Item-wise sales report
  let itemSalesSummary: {
    selectedItemName?: string;
    selectedItemSku?: string | null;
    totalQuantity: string;
    totalAmount: string;
    averagePrice: string;
    allPerformance?: {
      name: string;
      sku: string | null;
      quantity: string;
      amount: string;
      averagePrice: string;
    }[];
  };

  if (itemId && itemId !== "all") {
    // Find the item details
    const selectedItem = menuItems.find((i) => i.id === itemId);

    // Fetch line items for this specific menuItemId
    const lineItems = await prisma.billLineItem.findMany({
      where: {
        menuItemId: itemId,
        bill: {
          outletId: id,
          status: "printed",
          completedAt: { gte: start, lte: end },
        },
      },
      select: {
        quantity: true,
        lineTotal: true,
      },
    });

    const totalQty = lineItems.reduce((sum, li) => sum.add(li.quantity), new Decimal(0));
    const totalAmt = lineItems.reduce((sum, li) => sum.add(li.lineTotal), new Decimal(0));
    const avg = totalQty.greaterThan(0) ? totalAmt.div(totalQty) : new Decimal(0);

    itemSalesSummary = {
      selectedItemName: selectedItem?.name || "Unknown Item",
      selectedItemSku: selectedItem?.sku || null,
      totalQuantity: totalQty.toString(),
      totalAmount: totalAmt.toFixed(2),
      averagePrice: avg.toFixed(2),
    };
  } else {
    // Fetch all printed line items for the outlet in the range
    const lineItems = await prisma.billLineItem.findMany({
      where: {
        bill: {
          outletId: id,
          status: "printed",
          completedAt: { gte: start, lte: end },
        },
      },
      select: {
        itemName: true,
        sku: true,
        quantity: true,
        lineTotal: true,
      },
    });

    // Group by itemName
    const grouped: Record<string, { sku: string | null; quantity: Decimal; amount: Decimal }> = {};
    lineItems.forEach((li) => {
      if (!grouped[li.itemName]) {
        grouped[li.itemName] = {
          sku: li.sku,
          quantity: new Decimal(0),
          amount: new Decimal(0),
        };
      }
      grouped[li.itemName].quantity = grouped[li.itemName].quantity.add(li.quantity);
      grouped[li.itemName].amount = grouped[li.itemName].amount.add(li.lineTotal);
    });

    // Convert to list and sort by quantity descending
    const allPerformance = Object.entries(grouped)
      .map(([name, data]) => {
        const avg = data.quantity.greaterThan(0) ? data.amount.div(data.quantity) : new Decimal(0);
        return {
          name,
          sku: data.sku,
          quantity: data.quantity.toString(),
          amount: data.amount.toFixed(2),
          averagePrice: avg.toFixed(2),
        };
      })
      .sort((a, b) => parseFloat(b.quantity) - parseFloat(a.quantity));

    // Overall sum
    const totalQty = lineItems.reduce((sum, li) => sum.add(li.quantity), new Decimal(0));
    const totalAmt = lineItems.reduce((sum, li) => sum.add(li.lineTotal), new Decimal(0));
    const avg = totalQty.greaterThan(0) ? totalAmt.div(totalQty) : new Decimal(0);

    itemSalesSummary = {
      totalQuantity: totalQty.toString(),
      totalAmount: totalAmt.toFixed(2),
      averagePrice: avg.toFixed(2),
      allPerformance,
    };
  }

  // 4. Report 3: Discount report
  const discountedBills = await prisma.bill.findMany({
    where: {
      outletId: id,
      status: "printed",
      discount: { gt: 0 },
      completedAt: { gte: start, lte: end },
    },
    select: {
      id: true,
      billNumber: true,
      subtotal: true,
      discount: true,
      discountType: true,
      discountValue: true,
      grandTotal: true,
      discountReason: true,
      createdAt: true,
      updatedAt: true,
      status: true,
      customerName: true,
      customerPhone: true,
      totalCgst: true,
      totalSgst: true,
      totalGst: true,
      payments: {
        select: {
          mode: true,
          amount: true,
        },
      },
      lineItems: {
        select: {
          id: true,
          itemName: true,
          quantity: true,
          unit: true,
          basePrice: true,
          gstRate: true,
        },
      },
    },
    orderBy: { completedAt: "desc" },
  });

  const totalDiscountVal = discountedBills.reduce(
    (sum, b) => sum.add(b.discount),
    new Decimal(0)
  );

  const serializedDiscountReport = {
    totalDiscount: totalDiscountVal.toFixed(2),
    bills: discountedBills.map((b) => ({
      id: b.id,
      billNumber: b.billNumber,
      subtotal: b.subtotal.toFixed(2),
      discount: b.discount.toFixed(2),
      discountType: b.discountType,
      discountValue: b.discountValue ? b.discountValue.toString() : null,
      grandTotal: b.grandTotal.toFixed(2),
      discountReason: b.discountReason || "N/A",
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
      status: b.status,
      customerName: b.customerName,
      customerPhone: b.customerPhone,
      totalCgst: b.totalCgst.toFixed(2),
      totalSgst: b.totalSgst.toFixed(2),
      totalGst: b.totalGst.toFixed(2),
      payments: b.payments.map((p) => ({
        mode: p.mode,
        amount: p.amount.toFixed(2),
      })),
      lineItems: b.lineItems.map((li) => ({
        id: li.id,
        itemName: li.itemName,
        quantity: li.quantity.toString(),
        unit: li.unit,
        basePrice: li.basePrice.toFixed(2),
        gstRate: li.gstRate.toString(),
      })),
    })),
  };

  // 5. Report 4: Walk away report
  const walkaways = await prisma.walkaway.findMany({
    where: {
      outletId: id,
      createdAt: { gte: start, lte: end },
    },
    select: {
      id: true,
      reason: true,
      customReason: true,
      createdAt: true,
      createdByEmail: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const serializedWalkawayReport = {
    totalWalkaways: walkaways.length,
    walkaways: walkaways.map((w) => ({
      id: w.id,
      reason: w.reason,
      customReason: w.customReason || null,
      createdAt: w.createdAt.toISOString(),
      createdByEmail: w.createdByEmail || "N/A",
    })),
  };

  // 6. Report 5: Customer report
  const customerBills = await prisma.bill.findMany({
    where: {
      outletId: id,
      status: "printed",
      customerPhone: { not: null },
      completedAt: { gte: start, lte: end },
    },
    select: {
      id: true,
      billNumber: true,
      customerName: true,
      customerPhone: true,
      grandTotal: true,
      completedAt: true,
      createdAt: true,
      updatedAt: true,
      status: true,
      subtotal: true,
      discount: true,
      discountType: true,
      discountValue: true,
      discountReason: true,
      totalCgst: true,
      totalSgst: true,
      totalGst: true,
      payments: {
        select: {
          mode: true,
          amount: true,
        },
      },
      lineItems: {
        select: {
          id: true,
          itemName: true,
          quantity: true,
          unit: true,
          basePrice: true,
          gstRate: true,
        },
      },
    },
    orderBy: { completedAt: "desc" },
  });

  const serializedCustomerReport = {
    totalCustomers: customerBills.length,
    customers: customerBills.map((c) => ({
      id: c.id,
      billNumber: c.billNumber,
      customerName: c.customerName || "N/A",
      customerPhone: c.customerPhone || "N/A",
      grandTotal: c.grandTotal.toFixed(2),
      completedAt: c.completedAt ? c.completedAt.toISOString() : new Date().toISOString(),
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      status: c.status,
      subtotal: c.subtotal.toFixed(2),
      discount: c.discount.toFixed(2),
      discountType: c.discountType,
      discountValue: c.discountValue ? c.discountValue.toString() : null,
      discountReason: c.discountReason || "N/A",
      totalCgst: c.totalCgst.toFixed(2),
      totalSgst: c.totalSgst.toFixed(2),
      totalGst: c.totalGst.toFixed(2),
      payments: c.payments.map((p) => ({
        mode: p.mode,
        amount: p.amount.toFixed(2),
      })),
      lineItems: c.lineItems.map((li) => ({
        id: li.id,
        itemName: li.itemName,
        quantity: li.quantity.toString(),
        unit: li.unit,
        basePrice: li.basePrice.toFixed(2),
        gstRate: li.gstRate.toString(),
      })),
    })),
  };

  return (
    <ReportsClient
      outletId={id}
      outlets={activeOutlets}
      rangeError={false}
      menuItems={menuItems}
      selectedItemId={itemId || "all"}
      itemSalesSummary={itemSalesSummary}
      discountReport={serializedDiscountReport}
      walkawayReport={serializedWalkawayReport}
      customerReport={serializedCustomerReport}
    />
  );
}
