import { getCurrentUser, getCurrentOutlet, getLoggedInUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { propagateCashBalances } from "@/lib/settlement";
import { getLocalDateString } from "@/lib/utils";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const outlet = await getCurrentOutlet();

    if (!user && !outlet) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const settlement = await prisma.dailySettlement.findUnique({
      where: { id },
    });

    if (!settlement) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Settlement not found" } },
        { status: 404 }
      );
    }

    // Scope check for outlets
    if (outlet && settlement.outletId !== outlet.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized to cancel this settlement" } },
        { status: 403 }
      );
    }

    // 24-Hour / 30-Day Cancellation Limit Enforcement
    const now = new Date();
    const settlementTime = new Date(settlement.createdAt);
    const msDiff = now.getTime() - settlementTime.getTime();
    const hoursDiff = msDiff / (1000 * 60 * 60);

    const todayStr = getLocalDateString(new Date());
    const targetDate = new Date(`${settlement.settlementDate.toISOString().split("T")[0]}T00:00:00.000Z`);
    const todayDate = new Date(`${todayStr}T00:00:00.000Z`);
    const diffMs = todayDate.getTime() - targetDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (outlet || user?.role === "manager") {
      // Outlets and managers can only cancel daily settlements within 24 hours of creation
      if (hoursDiff > 24) {
        return NextResponse.json(
          {
            error: {
              code: "FORBIDDEN",
              message: "Daily settlements can only be cancelled within 24 hours of creation for outlets and managers.",
            },
          },
          { status: 403 }
        );
      }
    } else if (user?.role === "admin") {
      // Admins can cancel daily settlements of any date within the last 30 days
      if (diffDays < 0 || diffDays > 30) {
        return NextResponse.json(
          {
            error: {
              code: "FORBIDDEN",
              message: "Admins can only cancel settlements of dates within the last 30 days.",
            },
          },
          { status: 403 }
        );
      }
    } else {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized" } },
        { status: 403 }
      );
    }

    const loggedInUser = await getLoggedInUser();

    // Update status to cancelled, set closing cash to equal opening cash to reflect zero net effect
    const updated = await prisma.dailySettlement.update({
      where: { id },
      data: {
        status: "cancelled",
        closingCash: settlement.openingCash,
        modifiedById: loggedInUser?.id ?? null,
      },
    });

    // Run propagation starting from this settlement's date (so it is excluded and subsequent balances adjust)
    await propagateCashBalances(settlement.outletId, settlement.settlementDate);

    const reloaded = await prisma.dailySettlement.findUnique({
      where: { id },
    });

    const s = reloaded || updated;

    return NextResponse.json({
      data: {
        ...s,
        openingCash: s.openingCash.toString(),
        billedCash: s.billedCash.toString(),
        billedUpi: s.billedUpi.toString(),
        billedCard: s.billedCard.toString(),
        actualCash: s.actualCash.toString(),
        actualUpi: s.actualUpi.toString(),
        actualCard: s.actualCard.toString(),
        cashExpense: s.cashExpense.toString(),
        cashWithdraw: s.cashWithdraw.toString(),
        closingCash: s.closingCash.toString(),
        settlementDate: s.settlementDate.toISOString().split("T")[0],
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      }
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to cancel settlement" } },
      { status: 500 }
    );
  }
}
