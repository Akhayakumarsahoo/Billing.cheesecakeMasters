import { requireOutlet, getLoggedInUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CheckoutBillSchema } from "@/lib/validators";
import { computeLineItem, computeBillTotals } from "@/lib/gst";
import { generateBillNumber } from "@/lib/bill-number";
import { syncSettlementForDate } from "@/lib/settlement";
import { NextResponse } from "next/server";
import { Decimal } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const outlet = await requireOutlet();
    if (!outlet) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only outlets can complete checkouts" } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = CheckoutBillSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input" } },
        { status: 400 }
      );
    }

    const { 
      editingBillId, 
      customerName, 
      customerPhone, 
      notes, 
      lineItems, 
      payments,
      discountType,
      discountValue,
      discountReason,
    } = result.data;

    // 1. Resolve menu items and cache them in memory to eliminate N+1 queries
    const menuItemIds = lineItems
      .map((item) => item.menuItemId)
      .filter((id): id is string => typeof id === "string");

    const fetchedMenuItems = menuItemIds.length > 0
      ? await prisma.menuItem.findMany({
          where: { id: { in: menuItemIds } },
          include: { gstSlab: true },
        })
      : [];

    const menuItemMap = new Map(fetchedMenuItems.map((item) => [item.id, item]));

    // 2. Validate menu items and compute individual line items
    const finalLineItemsData: {
      menuItemId?: string | null;
      itemName: string;
      sku: string | null;
      unit: string;
      quantity: Decimal;
      basePrice: Decimal;
      gstRate: Decimal;
      lineBaseTotal: Decimal;
      lineGstAmount: Decimal;
      lineCgst: Decimal;
      lineSgst: Decimal;
      lineTotal: Decimal;
    }[] = [];
    for (const item of lineItems) {
      let finalItemName = "";
      let finalSku: string | null = null;
      let finalUnit = "custom";
      let finalBasePrice = new Decimal(0);
      let finalGstRate = new Decimal(0);
      let finalMenuItemId: string | undefined = undefined;

      if (item.menuItemId) {
        const menuItem = menuItemMap.get(item.menuItemId);
        if (!menuItem || !menuItem.isActive) {
          return NextResponse.json(
            { error: { code: "NOT_FOUND", message: `Menu item not found or inactive: ${item.menuItemId}` } },
            { status: 404 }
          );
        }

        if (outlet.id !== menuItem.outletId) {
          return NextResponse.json(
            { error: { code: "FORBIDDEN", message: `Menu item ${menuItem.name} does not belong to this outlet` } },
            { status: 403 }
          );
        }

        finalItemName = menuItem.name;
        finalSku = menuItem.sku;
        finalUnit = menuItem.unit;
        finalBasePrice = menuItem.basePrice;
        finalGstRate = menuItem.gstSlab.rate;
        finalMenuItemId = menuItem.id;
      } else {
        finalItemName = item.itemName!;
        finalBasePrice = new Decimal(item.basePrice!);
        finalGstRate = new Decimal(item.gstRate!);
      }

      const qtyDecimal = new Decimal(item.quantity);
      const lineTotals = computeLineItem({
        basePrice: finalBasePrice,
        quantity: qtyDecimal,
        gstRate: finalGstRate,
      });

      finalLineItemsData.push({
        menuItemId: finalMenuItemId,
        itemName: finalItemName,
        sku: finalSku,
        unit: finalUnit,
        quantity: qtyDecimal,
        basePrice: finalBasePrice,
        gstRate: finalGstRate,
        lineBaseTotal: lineTotals.lineBaseTotal,
        lineGstAmount: lineTotals.lineGstAmount,
        lineCgst: lineTotals.lineCgst,
        lineSgst: lineTotals.lineSgst,
        lineTotal: lineTotals.lineTotal,
      });
    }

    // 3. Compute overall totals
    const initialTotals = computeBillTotals(finalLineItemsData);

    // Calculate and validate discount
    let discountAmount = new Decimal(0);
    if (discountType && discountValue !== undefined && discountValue !== null) {
      const valDec = new Decimal(discountValue);
      if (discountType === "percentage") {
        if (discountValue < 1 || discountValue > 100) {
          return NextResponse.json(
            { error: { code: "VALIDATION_ERROR", message: "Percentage discount must be between 1 and 100" } },
            { status: 400 }
          );
        }
        discountAmount = initialTotals.subtotal.mul(valDec).div(100);
      } else if (discountType === "fixed") {
        if (valDec.greaterThan(initialTotals.subtotal)) {
          return NextResponse.json(
            { error: { code: "VALIDATION_ERROR", message: "Fixed discount amount cannot exceed total core amount" } },
            { status: 400 }
          );
        }
        discountAmount = valDec;
      }
    }

    const finalTotals = computeBillTotals(finalLineItemsData, discountAmount);
    const finalGrandTotal = finalTotals.grandTotal;

    // 4. Validate payment total matches computed grand total
    const paymentTotal = payments.reduce(
      (sum, p) => sum.add(new Decimal(p.amount)),
      new Decimal(0)
    );

    if (!paymentTotal.equals(finalGrandTotal)) {
      return NextResponse.json(
        { error: { code: "PAYMENT_MISMATCH", message: "Payment total does not match bill total" } },
        { status: 422 }
      );
    }

    const loggedInUser = await getLoggedInUser();

    // 5. Execute all database mutations atomically inside a single transaction
    const finalBill = await prisma.$transaction(async (tx) => {
      let billId = editingBillId;

      if (billId) {
        // Fetch current bill and verify same-day edit permissions
        const bill = await tx.bill.findUnique({ where: { id: billId } });
        if (!bill) {
          throw new Error("BILL_NOT_FOUND");
        }
        if (bill.outletId !== outlet.id) {
          throw new Error("FORBIDDEN");
        }

        const billDate = new Date(bill.createdAt);
        const now = new Date();
        const diffMs = now.getTime() - billDate.getTime();
        const isWithin24Hours = diffMs >= 0 && diffMs <= 24 * 60 * 60 * 1000;
        if (!isWithin24Hours) {
          throw new Error("PAST_DAY_EDIT_FORBIDDEN");
        }

        // Clean up previous line items & payments
        await tx.billPayment.deleteMany({ where: { billId } });
        await tx.billLineItem.deleteMany({ where: { billId } });

        // Update the main bill row
        await tx.bill.update({
          where: { id: billId },
          data: {
            status: "printed",
            completedAt: new Date(),
            subtotal: finalTotals.subtotal,
            totalCgst: finalTotals.totalCgst,
            totalSgst: finalTotals.totalSgst,
            totalGst: finalTotals.totalGst,
            grandTotal: finalTotals.grandTotal,
            discount: discountAmount,
            discountType: discountType || null,
            discountReason: discountReason || null,
            discountValue: discountValue !== undefined && discountValue !== null ? new Decimal(discountValue) : null,
            customerName: customerName || null,
            customerPhone: customerPhone || null,
            notes: notes || null,
            modifiedById: loggedInUser?.id ?? null,
          },
        });
      } else {
        // Generate new sequential bill number and create a new bill row
        const billNumber = await generateBillNumber(outlet.id, tx);
        const newBill = await tx.bill.create({
          data: {
            billNumber,
            outletId: outlet.id,
            status: "printed",
            completedAt: new Date(),
            subtotal: finalTotals.subtotal,
            totalCgst: finalTotals.totalCgst,
            totalSgst: finalTotals.totalSgst,
            totalGst: finalTotals.totalGst,
            grandTotal: finalTotals.grandTotal,
            discount: discountAmount,
            discountType: discountType || null,
            discountReason: discountReason || null,
            discountValue: discountValue !== undefined && discountValue !== null ? new Decimal(discountValue) : null,
            customerName: customerName || null,
            customerPhone: customerPhone || null,
            notes: notes || null,
          },
        });
        billId = newBill.id;
      }

      // Batch insert the new line items
      const discountRatio = finalTotals.subtotal.greaterThan(0) ? discountAmount.div(finalTotals.subtotal) : new Decimal(0);
      await tx.billLineItem.createMany({
        data: finalLineItemsData.map((item) => {
          const discountedLineBaseTotal = item.lineBaseTotal.mul(new Decimal(1).sub(discountRatio));
          const discountedLineGst = discountedLineBaseTotal.mul(item.gstRate).div(100);
          const lineCgst = discountedLineGst.div(2);
          const lineSgst = discountedLineGst.div(2);
          const lineTotal = discountedLineBaseTotal.add(discountedLineGst);

          return {
            billId: billId!,
            menuItemId: item.menuItemId,
            itemName: item.itemName,
            sku: item.sku,
            unit: item.unit,
            quantity: item.quantity,
            basePrice: item.basePrice,
            gstRate: item.gstRate,
            lineBaseTotal: discountedLineBaseTotal,
            lineGstAmount: discountedLineGst,
            lineCgst: lineCgst,
            lineSgst: lineSgst,
            lineTotal: lineTotal,
          };
        }),
      });

      // Batch insert the new payments
      await tx.billPayment.createMany({
        data: payments.map((p) => ({
          billId: billId!,
          mode: p.mode,
          amount: new Decimal(p.amount),
        })),
      });

      // Retrieve full bill including lineItems and payments
      return tx.bill.findUnique({
        where: { id: billId },
        include: {
          lineItems: true,
          payments: true,
        },
      });
    }, {
      timeout: 10000,
    });

    if (finalBill && finalBill.completedAt) {
      await syncSettlementForDate(finalBill.outletId, finalBill.completedAt);
    }

    if (!finalBill) {
      return NextResponse.json(
        { error: { code: "INTERNAL_ERROR", message: "Failed to load finalized bill" } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        ...finalBill,
        grandTotal: finalBill.grandTotal.toString(),
        subtotal: finalBill.subtotal.toString(),
        totalCgst: finalBill.totalCgst.toString(),
        totalSgst: finalBill.totalSgst.toString(),
        totalGst: finalBill.totalGst.toString(),
        discount: finalBill.discount.toString(),
        discountValue: finalBill.discountValue ? finalBill.discountValue.toString() : null,
        lineItems: finalBill.lineItems.map((li) => ({
          ...li,
          quantity: li.quantity.toString(),
          basePrice: li.basePrice.toString(),
          gstRate: li.gstRate.toString(),
          lineBaseTotal: li.lineBaseTotal.toString(),
          lineGstAmount: li.lineGstAmount.toString(),
          lineCgst: li.lineCgst.toString(),
          lineSgst: li.lineSgst.toString(),
          lineTotal: li.lineTotal.toString(),
        })),
        payments: finalBill.payments.map((p) => ({
          ...p,
          amount: p.amount.toString(),
        })),
      }
    }, { status: 201 });

  } catch (error: any) {
    if (error instanceof Response) return error;

    if (error instanceof Error) {
      if (error.message === "BILL_NOT_FOUND") {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "Bill not found" } },
          { status: 404 }
        );
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "Cannot access this bill" } },
          { status: 403 }
        );
      }
      if (error.message === "PAST_DAY_EDIT_FORBIDDEN") {
        return NextResponse.json(
          { error: { code: "BAD_REQUEST", message: "Cannot edit bills created more than 24 hours ago" } },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: error.message || "Checkout failed" } },
      { status: 500 }
    );
  }
}
