import { requireOutlet } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AddLineItemSchema } from "@/lib/validators";
import { computeLineItem } from "@/lib/gst";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
type Decimal = Prisma.Decimal;
const Decimal = Prisma.Decimal;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const outlet = await requireOutlet();
    if (!outlet) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only outlets can add line items" } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = AddLineItemSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input" } },
        { status: 400 }
      );
    }

    const { menuItemId, quantity } = result.data;

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
        { error: { code: "INVALID_STATUS", message: "Can only add items to draft bills" } },
        { status: 409 }
      );
    }

    const menuItem = await prisma.menuItem.findUnique({
      where: { id: menuItemId },
      include: { gstSlab: true },
    });

    if (!menuItem || !menuItem.isActive) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Menu item not found or inactive" } },
        { status: 404 }
      );
    }

    if (outlet.id !== menuItem.outletId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Menu item does not belong to this outlet" } },
        { status: 403 }
      );
    }

    const qtyDecimal = new Decimal(quantity);
    const totals = computeLineItem({
      basePrice: menuItem.basePrice,
      quantity: qtyDecimal,
      gstRate: menuItem.gstSlab.rate,
    });

    const lineItem = await prisma.billLineItem.create({
      data: {
        billId: id,
        menuItemId: menuItem.id,
        itemName: menuItem.name,
        sku: menuItem.sku,
        unit: menuItem.unit,
        quantity: qtyDecimal,
        basePrice: menuItem.basePrice,
        gstRate: menuItem.gstSlab.rate,
        lineBaseTotal: totals.lineBaseTotal,
        lineGstAmount: totals.lineGstAmount,
        lineCgst: totals.lineCgst,
        lineSgst: totals.lineSgst,
        lineTotal: totals.lineTotal,
      },
    });

    return NextResponse.json({
      data: {
        ...lineItem,
        quantity: lineItem.quantity.toString(),
        basePrice: lineItem.basePrice.toString(),
        gstRate: lineItem.gstRate.toString(),
        lineBaseTotal: lineItem.lineBaseTotal.toString(),
        lineGstAmount: lineItem.lineGstAmount.toString(),
        lineCgst: lineItem.lineCgst.toString(),
        lineSgst: lineItem.lineSgst.toString(),
        lineTotal: lineItem.lineTotal.toString(),
      }
    }, { status: 201 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to add line item" } },
      { status: 500 }
    );
  }
}
