import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentOutlet } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const outlet = await getCurrentOutlet();
    if (!outlet) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const bill = await prisma.bill.findUnique({
      where: { id },
    });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    if (bill.outletId !== outlet.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const billDate = new Date(bill.createdAt);
    const today = new Date();
    
    const isSameDay = billDate.getFullYear() === today.getFullYear() &&
                      billDate.getMonth() === today.getMonth() &&
                      billDate.getDate() === today.getDate();
                      
    if (!isSameDay) {
      return NextResponse.json({ error: "Cannot edit bills from previous days" }, { status: 400 });
    }

    // Wrap the reset logic in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete all payments
      await tx.billPayment.deleteMany({
        where: { billId: id },
      });

      // 2. Delete all line items
      await tx.billLineItem.deleteMany({
        where: { billId: id },
      });

      // 3. Reset bill to draft and clear totals
      await tx.bill.update({
        where: { id },
        data: {
          status: "draft",
          subtotal: 0,
          totalCgst: 0,
          totalSgst: 0,
          totalGst: 0,
          grandTotal: 0,
          completedAt: null,
          cancelledAt: null,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
