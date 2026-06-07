import { getCurrentOutlet, requireOutlet, getCurrentUser, getLoggedInUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UpdateLineItemSchema } from "@/lib/validators";
import { computeLineItem, computeBillTotals } from "@/lib/gst";
import { syncSettlementForDate } from "@/lib/settlement";
import { NextResponse } from "next/server";
import { Decimal } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string, itemId: string }> }
) {
  try {
    const { id, itemId } = await params;
    
    const body = await req.json();
    const result = UpdateLineItemSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input" } },
        { status: 400 }
      );
    }

    const { quantity, itemName, basePrice, payments } = result.data;

    // Resolve Auth
    const user = await getCurrentUser();
    const outlet = await getCurrentOutlet();

    if (!outlet && (!user || user.role !== "admin")) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized" } },
        { status: 403 }
      );
    }

    const bill = await prisma.bill.findUnique({ where: { id } });
    if (!bill) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Bill not found" } },
        { status: 404 }
      );
    }

    const isOutlet = !!outlet;
    const isAdmin = user?.role === "admin";

    if (isOutlet) {
      if (bill.outletId !== outlet.id) {
        return NextResponse.json({ error: { code: "FORBIDDEN", message: "Cannot access this bill" } }, { status: 403 });
      }
      if (bill.status !== "draft") {
        return NextResponse.json({ error: { code: "INVALID_STATUS", message: "POS can only update draft bills" } }, { status: 409 });
      }
    }

    const lineItem = await prisma.billLineItem.findUnique({
      where: { id: itemId },
    });

    if (!lineItem || lineItem.billId !== id) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Line item not found" } },
        { status: 404 }
      );
    }

    // Admins can edit open items on printed bills
    if (isAdmin && bill.status !== "draft") {
      if (lineItem.menuItemId) {
        return NextResponse.json(
          { error: { code: "BAD_REQUEST", message: "Only open items can be modified on completed bills" } },
          { status: 400 }
        );
      }
    }

    const qtyDecimal = quantity !== undefined ? new Decimal(quantity) : lineItem.quantity;
    const finalItemName = itemName !== undefined ? itemName : lineItem.itemName;
    const finalBasePrice = basePrice !== undefined ? new Decimal(basePrice) : lineItem.basePrice;

    const lineTotals = computeLineItem({
      basePrice: finalBasePrice,
      quantity: qtyDecimal,
      gstRate: lineItem.gstRate,
    });

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update the target line item
      const itemUpdate = await tx.billLineItem.update({
        where: { id: itemId },
        data: {
          itemName: finalItemName,
          basePrice: finalBasePrice,
          quantity: qtyDecimal,
          lineBaseTotal: lineTotals.lineBaseTotal,
          lineGstAmount: lineTotals.lineGstAmount,
          lineCgst: lineTotals.lineCgst,
          lineSgst: lineTotals.lineSgst,
          lineTotal: lineTotals.lineTotal,
        },
      });

      // 2. Recalculate bill-level totals if printed (completed)
      if (bill.status === "printed") {
        const allLineItems = await tx.billLineItem.findMany({
          where: { billId: id },
        });

        // Compute initial totals (undiscounted)
        const rawLineItemsForTotals = allLineItems.map(li => {
          const isCurrentItem = li.id === itemId;
          const bp = isCurrentItem ? finalBasePrice : li.basePrice;
          const qty = isCurrentItem ? qtyDecimal : li.quantity;
          return computeLineItem({
            basePrice: bp,
            quantity: qty,
            gstRate: li.gstRate,
          });
        });

        const initialTotals = computeBillTotals(rawLineItemsForTotals);

        // Get existing discount details
        let discountAmount = new Decimal(0);
        if (bill.discountType && bill.discountValue !== null) {
          const valDec = new Decimal(bill.discountValue);
          if (bill.discountType === "percentage") {
            discountAmount = initialTotals.subtotal.mul(valDec).div(100);
          } else if (bill.discountType === "fixed") {
            if (valDec.greaterThan(initialTotals.subtotal)) {
              discountAmount = initialTotals.subtotal;
            } else {
              discountAmount = valDec;
            }
          }
        }

        // Recalculate final totals with the discount
        const finalTotals = computeBillTotals(rawLineItemsForTotals, discountAmount);
        const discountRatio = finalTotals.subtotal.greaterThan(0) ? discountAmount.div(finalTotals.subtotal) : new Decimal(0);

        // Update each line item in database with distributed discount
        for (const li of allLineItems) {
          const isCurrentItem = li.id === itemId;
          const bp = isCurrentItem ? finalBasePrice : li.basePrice;
          const qty = isCurrentItem ? qtyDecimal : li.quantity;
          const name = isCurrentItem ? finalItemName : li.itemName;
          const undiscountedLineBaseTotal = bp.mul(qty);
          
          const discountedLineBaseTotal = undiscountedLineBaseTotal.mul(new Decimal(1).sub(discountRatio));
          const discountedLineGst = discountedLineBaseTotal.mul(li.gstRate).div(100);
          const lineCgst = discountedLineGst.div(2);
          const lineSgst = discountedLineGst.div(2);
          const lineTotal = discountedLineBaseTotal.add(discountedLineGst);

          await tx.billLineItem.update({
            where: { id: li.id },
            data: {
              itemName: name,
              basePrice: bp,
              quantity: qty,
              lineBaseTotal: discountedLineBaseTotal,
              lineGstAmount: discountedLineGst,
              lineCgst,
              lineSgst,
              lineTotal,
            },
          });
        }

        // Adjust payments: either use client-provided payments or fall back to proportional scaling
        const oldGrandTotal = bill.grandTotal;
        const newGrandTotal = finalTotals.grandTotal;
        
        if (payments) {
          const totalPayment = payments.reduce((sum, p) => sum.add(new Decimal(p.amount)), new Decimal(0));
          if (!totalPayment.equals(newGrandTotal)) {
            throw new Error(`PAYMENT_MISMATCH: Payment total (₹${totalPayment.toNumber()}) must exactly match the new grand total (₹${newGrandTotal.toNumber()}).`);
          }

          await tx.billPayment.deleteMany({ where: { billId: id } });
          await tx.billPayment.createMany({
            data: payments.map((p) => ({
              billId: id,
              mode: p.mode,
              amount: new Decimal(p.amount),
            })),
          });
        } else if (!newGrandTotal.equals(oldGrandTotal)) {
          const dbPayments = await tx.billPayment.findMany({ where: { billId: id } });
          if (dbPayments.length === 1) {
            await tx.billPayment.update({
              where: { id: dbPayments[0].id },
              data: { amount: newGrandTotal }
            });
          } else if (dbPayments.length > 1) {
            let remaining = newGrandTotal;
            for (let i = 0; i < dbPayments.length; i++) {
              const p = dbPayments[i];
              if (i === dbPayments.length - 1) {
                await tx.billPayment.update({
                  where: { id: p.id },
                  data: { amount: remaining }
                });
              } else {
                const proportion = p.amount.div(oldGrandTotal);
                const newAmount = newGrandTotal.mul(proportion).toDecimalPlaces(2);
                await tx.billPayment.update({
                  where: { id: p.id },
                  data: { amount: newAmount }
                });
                remaining = remaining.sub(newAmount);
              }
            }
          }
        }

        // Update the main bill row
        const loggedInUser = await getLoggedInUser();
        await tx.bill.update({
          where: { id },
          data: {
            subtotal: finalTotals.subtotal,
            totalCgst: finalTotals.totalCgst,
            totalSgst: finalTotals.totalSgst,
            totalGst: finalTotals.totalGst,
            grandTotal: finalTotals.grandTotal,
            discount: discountAmount,
            modifiedById: loggedInUser?.id ?? null,
          },
        });
      }

      return itemUpdate;
    }, {
      timeout: 10000,
    });

    // Sync settlement after transaction completes successfully
    if (bill.completedAt) {
      await syncSettlementForDate(bill.outletId, bill.completedAt);
    }

    return NextResponse.json({
      data: {
        ...updated,
        quantity: updated.quantity.toString(),
        basePrice: updated.basePrice.toString(),
        gstRate: updated.gstRate.toString(),
        lineBaseTotal: updated.lineBaseTotal.toString(),
        lineGstAmount: updated.lineGstAmount.toString(),
        lineCgst: updated.lineCgst.toString(),
        lineSgst: updated.lineSgst.toString(),
        lineTotal: updated.lineTotal.toString(),
      }
    }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    if (error instanceof Error && error.message.startsWith("PAYMENT_MISMATCH:")) {
      return NextResponse.json(
        { error: { code: "PAYMENT_MISMATCH", message: error.message.split("PAYMENT_MISMATCH: ")[1] } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: error.message || "Failed to update line item" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string, itemId: string }> }
) {
  try {
    const { id, itemId } = await params;
    const outlet = await requireOutlet();
    if (!outlet) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only outlets can delete line items" } },
        { status: 403 }
      );
    }

    const bill = await prisma.bill.findUnique({ where: { id } });
    if (!bill) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Bill not found" } },
        { status: 404 }
      );
    }

    if (outlet.id !== bill.outletId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Cannot access this bill" } },
        { status: 403 }
      );
    }

    if (bill.status !== "draft") {
      return NextResponse.json(
        { error: { code: "INVALID_STATUS", message: "Can only delete items from draft bills" } },
        { status: 409 }
      );
    }

    const lineItem = await prisma.billLineItem.findUnique({
      where: { id: itemId },
    });

    if (!lineItem || lineItem.billId !== id) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Line item not found" } },
        { status: 404 }
      );
    }

    await prisma.billLineItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ data: { deleted: true } }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to delete line item" } },
      { status: 500 }
    );
  }
}
