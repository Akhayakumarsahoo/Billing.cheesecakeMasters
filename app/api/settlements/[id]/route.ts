import { getCurrentUser, getCurrentOutlet, getLoggedInUser } from "@/lib/auth";
import { prisma, Decimal } from "@/lib/db";
import { UpdateSettlementSchema } from "@/lib/validators";
import { getBilledSalesForDate, propagateCashBalances } from "@/lib/settlement";
import { getLocalDateString } from "@/lib/utils";
import { NextResponse } from "next/server";

export async function GET(
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
      include: { outlet: { select: { name: true } } },
    });

    if (!settlement) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Settlement not found" } },
        { status: 404 }
      );
    }

    // Scoped check for outlets
    if (outlet && settlement.outletId !== outlet.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized to access this settlement" } },
        { status: 403 }
      );
    }

    return NextResponse.json({
      data: {
        ...settlement,
        openingCash: settlement.openingCash.toString(),
        billedCash: settlement.billedCash.toString(),
        billedUpi: settlement.billedUpi.toString(),
        billedCard: settlement.billedCard.toString(),
        billedOther: settlement.billedOther.toString(),
        actualCash: settlement.actualCash.toString(),
        actualUpi: settlement.actualUpi.toString(),
        actualCard: settlement.actualCard.toString(),
        actualOther: settlement.actualOther.toString(),
        cashExpense: settlement.cashExpense.toString(),
        cashWithdraw: settlement.cashWithdraw.toString(),
        closingCash: settlement.closingCash.toString(),
        settlementDate: settlement.settlementDate.toISOString().split("T")[0],
        createdAt: settlement.createdAt.toISOString(),
        updatedAt: settlement.updatedAt.toISOString(),
      }
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch settlement" } },
      { status: 500 }
    );
  }
}

export async function PUT(
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
        { error: { code: "FORBIDDEN", message: "Not authorized to modify this settlement" } },
        { status: 403 }
      );
    }

     // 24-Hour / 30-Day Edit Limit Enforcement
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
      // Outlets and managers can only edit daily settlements within 24 hours of creation
      if (hoursDiff > 24) {
        return NextResponse.json(
          {
            error: {
              code: "FORBIDDEN",
              message: "Daily settlements can only be edited within 24 hours of creation for outlets and managers.",
            },
          },
          { status: 403 }
        );
      }
    } else if (user?.role === "admin") {
      // Admins can edit daily settlements of any date within the last 30 days
      if (diffDays < 0 || diffDays > 30) {
        return NextResponse.json(
          {
            error: {
              code: "FORBIDDEN",
              message: "Admins can only edit settlements of dates within the last 30 days.",
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

    const body = await req.json();
    const result = UpdateSettlementSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid settlement input" } },
        { status: 400 }
      );
    }

    const data = result.data;

    // We recalculate system billed sales for the date, just in case any printed bills were updated or deleted in the DB
    const dateStr = settlement.settlementDate.toISOString().split("T")[0];
    const billedSales = await getBilledSalesForDate(settlement.outletId, dateStr);

    const actualCash = data.actualCash !== undefined ? new Decimal(data.actualCash) : settlement.actualCash;
    const actualUpi = data.actualUpi !== undefined ? new Decimal(data.actualUpi) : settlement.actualUpi;
    const actualCard = data.actualCard !== undefined ? new Decimal(data.actualCard) : settlement.actualCard;
    const actualOther = data.actualOther !== undefined ? new Decimal(data.actualOther) : settlement.actualOther;
    const cashExpense = data.cashExpense !== undefined ? new Decimal(data.cashExpense) : settlement.cashExpense;
    const cashWithdraw = data.cashWithdraw !== undefined ? new Decimal(data.cashWithdraw) : settlement.cashWithdraw;

    // closing = opening + actualCash - cashExpense - cashWithdraw
    const closingCash = settlement.openingCash
      .plus(actualCash)
      .minus(cashExpense)
      .minus(cashWithdraw);

    const loggedInUser = await getLoggedInUser();

    const updated = await prisma.dailySettlement.update({
      where: { id },
      data: {
        billedCash: billedSales.billedCash,
        billedUpi: billedSales.billedUpi,
        billedCard: billedSales.billedCard,
        billedOther: billedSales.billedOther,
        actualCash,
        actualUpi,
        actualCard,
        actualOther,
        cashExpense,
        cashWithdraw,
        closingCash,
        status: "active", // Reactivates if it was cancelled
        modifiedById: loggedInUser?.id ?? null,
      },
    });

    // Run propagation chronologically starting from this settlement's date
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
        billedOther: s.billedOther.toString(),
        actualCash: s.actualCash.toString(),
        actualUpi: s.actualUpi.toString(),
        actualCard: s.actualCard.toString(),
        actualOther: s.actualOther.toString(),
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
      { error: { code: "INTERNAL_ERROR", message: "Failed to update settlement" } },
      { status: 500 }
    );
  }
}
