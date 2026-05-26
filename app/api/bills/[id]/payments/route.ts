import { requireOutlet } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AddPaymentSchema } from "@/lib/validators";
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
      include: { payments: true },
    });

    if (!bill) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Bill not found" } },
        { status: 404 }
      );
    }

    if (user.role === "cashier" && outlet.id !== bill.outletId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Cannot access this bill" } },
        { status: 403 }
      );
    }

    const serialized = bill.payments.map((p) => ({
      ...p,
      amount: p.amount.toString(),
      paidAt: p.paidAt.toISOString(),
    }));

    return NextResponse.json({ data: serialized }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch payments" } },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const outlet = await requireOutlet();
    if (!outlet) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only outlets can add payments" } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = AddPaymentSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input" } },
        { status: 400 }
      );
    }

    const { mode, amount } = result.data;

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
        { error: { code: "INVALID_STATUS", message: "Can only add payments to draft bills" } },
        { status: 409 }
      );
    }

    const payment = await prisma.billPayment.create({
      data: {
        billId: id,
        mode: mode as any,
        amount,
      },
    });

    return NextResponse.json({
      data: {
        ...payment,
        amount: payment.amount.toString(),
      }
    }, { status: 201 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to add payment" } },
      { status: 500 }
    );
  }
}
