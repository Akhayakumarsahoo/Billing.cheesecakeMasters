import { requireOutlet, getLoggedInUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CompleteBillSchema } from "@/lib/validators";
import { computeBillTotals } from "@/lib/gst";
import { NextResponse } from "next/server";
import { Decimal } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const outlet = await requireOutlet();
    if (!outlet) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only outlets can complete bills" } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = CompleteBillSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input" } },
        { status: 400 }
      );
    }

    const bill = await prisma.bill.findUnique({
      where: { id },
      include: { lineItems: true, payments: true },
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

    if (bill.status !== "draft") {
      return NextResponse.json(
        { error: { code: "INVALID_STATUS", message: "Can only complete draft bills" } },
        { status: 409 }
      );
    }

    if (bill.lineItems.length === 0) {
      return NextResponse.json(
        { error: { code: "EMPTY_BILL", message: "Bill has no items" } },
        { status: 422 }
      );
    }

    if (bill.payments.length === 0) {
      return NextResponse.json(
        { error: { code: "NO_PAYMENT", message: "Bill has no payments" } },
        { status: 422 }
      );
    }

    const totals = computeBillTotals(bill.lineItems, bill.discount);

    const paymentTotal = bill.payments.reduce(
      (sum, p) => sum.add(p.amount),
      new Decimal(0)
    );

    if (!paymentTotal.equals(totals.grandTotal)) {
      return NextResponse.json(
        { error: { code: "PAYMENT_MISMATCH", message: "Payment total does not match bill total" } },
        { status: 422 }
      );
    }

    const loggedInUser = await getLoggedInUser();

    const updated = await prisma.bill.update({
      where: { id },
      data: {
        status: "printed",
        completedAt: new Date(),
        subtotal: totals.subtotal,
        totalCgst: totals.totalCgst,
        totalSgst: totals.totalSgst,
        totalGst: totals.totalGst,
        grandTotal: totals.grandTotal,
        modifiedById: loggedInUser?.id ?? null,
        ...(result.data.customerName !== undefined && { customerName: result.data.customerName }),
        ...(result.data.customerPhone !== undefined && { customerPhone: result.data.customerPhone }),
        ...(result.data.notes !== undefined && { notes: result.data.notes }),
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
      { error: { code: "INTERNAL_ERROR", message: "Failed to complete bill" } },
      { status: 500 }
    );
  }
}
