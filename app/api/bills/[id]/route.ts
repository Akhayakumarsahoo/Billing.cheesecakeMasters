import { requireOutlet, getLoggedInUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CreateBillSchema } from "@/lib/validators";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const outlet = await requireOutlet();

    const bill = await prisma.bill.findUnique({
      where: { id },
      include: {
        lineItems: true,
        payments: true,
      },
    });

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

    return NextResponse.json({
      data: {
        ...bill,
        grandTotal: bill.grandTotal.toString(),
        subtotal: bill.subtotal.toString(),
        totalCgst: bill.totalCgst.toString(),
        totalSgst: bill.totalSgst.toString(),
        totalGst: bill.totalGst.toString(),
        lineItems: bill.lineItems.map(li => ({
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
        payments: bill.payments.map(p => ({
          ...p,
          amount: p.amount.toString(),
        }))
      }
    }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch bill" } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const outlet = await requireOutlet();
    if (!outlet) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only outlets can update draft bills" } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = CreateBillSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input" } },
        { status: 400 }
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
        { error: { code: "INVALID_STATUS", message: "Can only update draft bills" } },
        { status: 409 }
      );
    }

    const loggedInUser = await getLoggedInUser();

    const updated = await prisma.bill.update({
      where: { id },
      data: {
        ...result.data,
        modifiedById: loggedInUser?.id ?? null,
      },
    });

    return NextResponse.json({
      data: {
        ...updated,
        grandTotal: updated.grandTotal.toString(),
        subtotal: updated.subtotal.toString(),
        totalCgst: updated.totalCgst.toString(),
        totalSgst: updated.totalSgst.toString(),
        totalGst: updated.totalGst.toString(),
      }
    }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update bill" } },
      { status: 500 }
    );
  }
}
