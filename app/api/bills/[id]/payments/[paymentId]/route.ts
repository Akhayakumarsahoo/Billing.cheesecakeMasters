import { requireOutlet } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string, paymentId: string }> }
) {
  try {
    const { id, paymentId } = await params;
    const outlet = await requireOutlet();
    if (!outlet) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only outlets can delete payments" } },
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
        { error: { code: "INVALID_STATUS", message: "Can only delete payments from draft bills" } },
        { status: 409 }
      );
    }

    const payment = await prisma.billPayment.findUnique({
      where: { id: paymentId },
    });

    if (!payment || payment.billId !== id) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Payment not found" } },
        { status: 404 }
      );
    }

    await prisma.billPayment.delete({
      where: { id: paymentId },
    });

    return NextResponse.json({ data: { deleted: true } }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to delete payment" } },
      { status: 500 }
    );
  }
}
