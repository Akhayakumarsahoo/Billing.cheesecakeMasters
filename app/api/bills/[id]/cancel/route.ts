import { getCurrentUser, getCurrentOutlet, requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const outlet = await getCurrentOutlet();
    if (!user && !outlet) return new Response(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }), { status: 401 });

    const bill = await prisma.bill.findUnique({
      where: { id },
    });

    if (!bill) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Bill not found" } },
        { status: 404 }
      );
    }

    if (outlet && outlet.id !== bill.outletId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Cannot access this bill" } },
        { status: 403 }
      );
    }

    if (bill.status !== "printed") {
      return NextResponse.json(
        { error: { code: "INVALID_STATUS", message: "Can only cancel printed bills" } },
        { status: 409 }
      );
    }

    const updated = await prisma.bill.update({
      where: { id },
      data: {
        status: "cancelled",
        cancelledAt: new Date(),
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
      { error: { code: "INTERNAL_ERROR", message: "Failed to cancel bill" } },
      { status: 500 }
    );
  }
}
