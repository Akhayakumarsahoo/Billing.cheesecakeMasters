import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentOutlet } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const outlet = await getCurrentOutlet();
    if (!outlet) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });

    const bill = await prisma.bill.findUnique({
      where: { id },
      include: {
        lineItems: {
          include: {
            menuItem: {
              include: { gstSlab: true }
            }
          }
        }
      }
    });

    if (!bill) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Bill not found" } }, { status: 404 });
    }

    if (bill.outletId !== outlet.id) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Forbidden" } }, { status: 403 });
    }

    const billDate = new Date(bill.createdAt);
    const today = new Date();
    
    const isSameDay = billDate.getFullYear() === today.getFullYear() &&
                      billDate.getMonth() === today.getMonth() &&
                      billDate.getDate() === today.getDate();
                      
    if (!isSameDay) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Cannot cancel bills from previous days" } }, 
        { status: 400 }
      );
    }

    if (bill.status === "cancelled") {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Bill is already cancelled" } }, 
        { status: 400 }
      );
    }

    const updatedBill = await prisma.bill.update({
      where: { id },
      data: {
        status: "cancelled",
        cancelledAt: new Date(),
      },
    });

    return NextResponse.json({ data: updatedBill });
  } catch (error: any) {
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: error.message } }, { status: 500 });
  }
}
