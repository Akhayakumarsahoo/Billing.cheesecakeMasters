import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, getLoggedInUser } from "@/lib/auth";
import { Decimal } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized. Only admins can edit payment modes." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { payments } = body as {
      payments: { mode: string; amount: number }[];
    };

    if (!Array.isArray(payments) || payments.length === 0) {
      return NextResponse.json(
        { error: "Invalid payment data provided." },
        { status: 400 }
      );
    }

    const bill = await prisma.bill.findUnique({
      where: { id },
      include: { payments: true },
    });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found." }, { status: 404 });
    }

    if (bill.status !== "printed") {
      return NextResponse.json(
        { error: "Only printed bills can have their payment modes edited." },
        { status: 400 }
      );
    }

    // Verify payment sum matches grand total
    const totalPayment = payments.reduce(
      (sum, p) => sum.add(new Decimal(p.amount)),
      new Decimal(0)
    );

    if (!totalPayment.equals(bill.grandTotal)) {
      return NextResponse.json(
        {
          error: `Payment total (₹${totalPayment.toNumber()}) must exactly match the bill's grand total (₹${bill.grandTotal.toNumber()}).`,
        },
        { status: 400 }
      );
    }

    const loggedInUser = await getLoggedInUser();

    // Delete existing and create new payments within a transaction
    await prisma.$transaction(async (tx) => {
      await tx.billPayment.deleteMany({
        where: { billId: id },
      });

      for (const p of payments) {
        await tx.billPayment.create({
          data: {
            billId: id,
            mode: p.mode as any, // Cast to any to bypass string vs PaymentMode enum issue
            amount: p.amount,
          },
        });
      }

      await tx.bill.update({
        where: { id },
        data: {
          modifiedById: loggedInUser?.id ?? null,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to edit bill payments:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while updating the payments." },
      { status: 500 }
    );
  }
}
