import { requireOutlet } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AddLineItemSchema } from "@/lib/validators";
import { computeLineItem } from "@/lib/gst";
import { NextResponse } from "next/server";
import { Decimal } from "@prisma/client/runtime/library";

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

    const { menuItemId, quantity, itemName, basePrice, gstRate } = result.data;

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

    const qtyDecimal = new Decimal(quantity);
    let finalItemName = "";
    let finalSku: string | null = null;
    let finalUnit = "custom";
    let finalBasePrice = new Decimal(0);
    let finalGstRate = new Decimal(0);
    let finalMenuItemId: string | undefined = undefined;

    if (menuItemId) {
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

      finalItemName = menuItem.name;
      finalSku = menuItem.sku;
      finalUnit = menuItem.unit;
      finalBasePrice = menuItem.basePrice;
      finalGstRate = menuItem.gstSlab.rate;
      finalMenuItemId = menuItem.id;
    } else {
      finalItemName = itemName!;
      finalBasePrice = new Decimal(basePrice!);
      finalGstRate = new Decimal(gstRate!);
    }

    const totals = computeLineItem({
      basePrice: finalBasePrice,
      quantity: qtyDecimal,
      gstRate: finalGstRate,
    });

    const lineItem = await prisma.billLineItem.create({
      data: {
        billId: id,
        menuItemId: finalMenuItemId,
        itemName: finalItemName,
        sku: finalSku,
        unit: finalUnit,
        quantity: qtyDecimal,
        basePrice: finalBasePrice,
        gstRate: finalGstRate,
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
