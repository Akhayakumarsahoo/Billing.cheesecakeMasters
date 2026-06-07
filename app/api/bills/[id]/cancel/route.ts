import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentOutlet, getCurrentUser, getLoggedInUser } from "@/lib/auth";
import { syncSettlementForDate } from "@/lib/settlement";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const outlet = await getCurrentOutlet();
    const user = await getCurrentUser();

    if (!outlet && !user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    if (user && user.role !== "admin" && user.role !== "manager") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Forbidden" } }, { status: 403 });
    }

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

    // Outlets can only cancel their own bills
    if (outlet && bill.outletId !== outlet.id) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Forbidden" } }, { status: 403 });
    }

    const billDate = new Date(bill.createdAt);
    const now = new Date();
    const diffMs = now.getTime() - billDate.getTime();
    const isWithin24Hours = diffMs >= 0 && diffMs <= 24 * 60 * 60 * 1000;
                      
    const isAdmin = user?.role === "admin";
                      
    if (!isWithin24Hours && !isAdmin) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Cannot cancel bills created more than 24 hours ago" } }, 
        { status: 400 }
      );
    }

    if (bill.status === "cancelled") {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Bill is already cancelled" } }, 
        { status: 400 }
      );
    }

    const loggedInUser = await getLoggedInUser();

    const updatedBill = await prisma.bill.update({
      where: { id },
      data: {
        status: "cancelled",
        cancelledAt: new Date(),
        modifiedById: loggedInUser?.id ?? null,
      },
    });

    if (updatedBill.completedAt) {
      await syncSettlementForDate(updatedBill.outletId, updatedBill.completedAt);
    }

    return NextResponse.json({ data: updatedBill });
  } catch (error: any) {
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: error.message } }, { status: 500 });
  }
}
