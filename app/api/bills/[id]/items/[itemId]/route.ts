import { requireOutlet } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UpdateLineItemSchema } from "@/lib/validators";
import { computeLineItem } from "@/lib/gst";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
type Decimal = Prisma.Decimal;
const Decimal = Prisma.Decimal;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string, itemId: string }> }
) {
  try {
    const { id, itemId } = await params;
    const outlet = await requireOutlet();
    if (!outlet) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only outlets can update line items" } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = UpdateLineItemSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input" } },
        { status: 400 }
      );
    }

    const { quantity } = result.data;

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
        { error: { code: "INVALID_STATUS", message: "Can only update items on draft bills" } },
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

    const qtyDecimal = new Decimal(quantity);
    const totals = computeLineItem({
      basePrice: lineItem.basePrice,
      quantity: qtyDecimal,
      gstRate: lineItem.gstRate,
    });

    const updated = await prisma.billLineItem.update({
      where: { id: itemId },
      data: {
        quantity: qtyDecimal,
        lineBaseTotal: totals.lineBaseTotal,
        lineGstAmount: totals.lineGstAmount,
        lineCgst: totals.lineCgst,
        lineSgst: totals.lineSgst,
        lineTotal: totals.lineTotal,
      },
    });

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
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update line item" } },
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
