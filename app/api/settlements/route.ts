import { getCurrentUser, getCurrentOutlet, getLoggedInUser } from "@/lib/auth";
import { prisma, Decimal } from "@/lib/db";
import { CreateSettlementSchema } from "@/lib/validators";
import { getBilledSalesForDate, getOpeningCashForDate, propagateCashBalances } from "@/lib/settlement";
import { getLocalDateString } from "@/lib/utils";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    const outlet = await getCurrentOutlet();

    if (!user && !outlet) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const skip = (page - 1) * limit;

    let targetOutletId: string;

    if (outlet) {
      targetOutletId = outlet.id;
    } else {
      if (user!.role !== "admin" && user!.role !== "manager") {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "Not authorized" } },
          { status: 403 }
        );
      }
      const paramOutletId = searchParams.get("outletId");
      if (!paramOutletId) {
        return NextResponse.json(
          { error: { code: "MISSING_PARAM", message: "outletId is required" } },
          { status: 400 }
        );
      }
      targetOutletId = paramOutletId;
    }

    const [settlements, total] = await Promise.all([
      prisma.dailySettlement.findMany({
        where: {
          outletId: targetOutletId,
          settlementDate: {
            gte: new Date(searchParams.get("from") ? `${searchParams.get("from")}T00:00:00.000Z` : "2000-01-01T00:00:00.000Z"),
            lte: new Date(searchParams.get("to") ? `${searchParams.get("to")}T23:59:59.999Z` : new Date().toISOString()),
          },
        },
        include: {
          createdBy: { select: { name: true } },
          modifiedBy: { select: { name: true } },
        },
        orderBy: { settlementDate: "desc" },
        skip,
        take: limit,
      }),
      prisma.dailySettlement.count({
        where: { outletId: targetOutletId },
      }),
    ]);

    const serialized = settlements.map((s) => ({
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
      createdByName: s.createdBy?.name ?? null,
      modifiedByName: s.modifiedBy?.name ?? null,
      createdBy: undefined,
      modifiedBy: undefined,
    }));

    return NextResponse.json({
      data: {
        settlements: serialized,
        total,
        page,
        limit,
      }
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch settlements" } },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const outletAuth = await getCurrentOutlet();
    const user = await getCurrentUser();

    if (!outletAuth && !user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const body = await req.json();
    let targetOutletId: string;

    if (outletAuth) {
      targetOutletId = outletAuth.id;
    } else {
      if (user!.role !== "admin" && user!.role !== "manager") {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "Not authorized" } },
          { status: 403 }
        );
      }
      const bodyOutletId = body.outletId;
      if (!bodyOutletId || typeof bodyOutletId !== "string") {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "outletId is required" } },
          { status: 400 }
        );
      }
      // Check outlet exists
      const outletExists = await prisma.outlet.findUnique({ where: { id: bodyOutletId } });
      if (!outletExists) {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "Outlet not found" } },
          { status: 404 }
        );
      }
      targetOutletId = bodyOutletId;
    }

    const result = CreateSettlementSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid settlement input" } },
        { status: 400 }
      );
    }

    const {
      settlementDate,
      actualCash,
      actualUpi,
      actualCard,
      cashExpense,
      cashWithdraw,
    } = result.data;

    // Date validations
    const todayStr = getLocalDateString(new Date());
    const targetDate = new Date(`${settlementDate}T00:00:00.000Z`);
    const todayDate = new Date(`${todayStr}T00:00:00.000Z`);
    const diffMs = todayDate.getTime() - targetDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (outletAuth || user?.role === "manager") {
      // Outlets and managers can only create daily settlements for today's date
      if (settlementDate !== todayStr) {
        return NextResponse.json(
          {
            error: {
              code: "FORBIDDEN",
              message: `${outletAuth ? "Outlets" : "Managers"} can only create daily settlements for today's date.`,
            },
          },
          { status: 403 }
        );
      }
    } else if (user?.role === "admin") {
      // Admins can create daily settlements of any date within the last 30 days
      if (diffDays < 0 || diffDays > 30) {
        return NextResponse.json(
          {
            error: {
              code: "FORBIDDEN",
              message: "Admins can only create daily settlements for dates within the last 30 days.",
            },
          },
          { status: 403 }
        );
      }
    }

    const date = new Date(`${settlementDate}T00:00:00.000Z`);

    // Check if settlement already exists for this date
    const existing = await prisma.dailySettlement.findUnique({
      where: {
        outletId_settlementDate: {
          outletId: targetOutletId,
          settlementDate: date,
        },
      },
    });

    if (existing && existing.status !== "cancelled") {
      return NextResponse.json(
        {
          error: {
            code: "CONFLICT",
            message: `A settlement for ${settlementDate} already exists. Please edit it instead of creating a new one.`,
          },
        },
        { status: 409 }
      );
    }

    // Fetch system billed sales and opening cash
    const billedSales = await getBilledSalesForDate(targetOutletId, settlementDate);
    const openingCash = await getOpeningCashForDate(targetOutletId, settlementDate);

    // Compute closing cash
    const closingCash = openingCash
      .plus(new Decimal(actualCash))
      .minus(new Decimal(cashExpense))
      .minus(new Decimal(cashWithdraw));

    const loggedInUser = await getLoggedInUser();
    const userId = loggedInUser?.id ?? null;

    let settlement;

    if (existing && existing.status === "cancelled") {
      // Overwrite and reactivate the cancelled settlement
      settlement = await prisma.dailySettlement.update({
        where: { id: existing.id },
        data: {
          openingCash,
          billedCash: billedSales.billedCash,
          billedUpi: billedSales.billedUpi,
          billedCard: billedSales.billedCard,
          actualCash: new Decimal(actualCash),
          actualUpi: new Decimal(actualUpi),
          actualCard: new Decimal(actualCard),
          cashExpense: new Decimal(cashExpense),
          cashWithdraw: new Decimal(cashWithdraw),
          closingCash,
          status: "active",
          createdById: userId,
          modifiedById: userId,
          createdAt: new Date(), // Reset createdAt to now so user gets a fresh 24 hours to cancel/edit
        },
      });
    } else {
      // Create new record
      settlement = await prisma.dailySettlement.create({
        data: {
          outletId: targetOutletId,
          settlementDate: date,
          openingCash,
          billedCash: billedSales.billedCash,
          billedUpi: billedSales.billedUpi,
          billedCard: billedSales.billedCard,
          actualCash: new Decimal(actualCash),
          actualUpi: new Decimal(actualUpi),
          actualCard: new Decimal(actualCard),
          cashExpense: new Decimal(cashExpense),
          cashWithdraw: new Decimal(cashWithdraw),
          closingCash,
          status: "active",
          createdById: userId,
          modifiedById: userId,
        },
      });
    }

    // Run propagation chronologically starting from this settlement's date
    await propagateCashBalances(targetOutletId, date);

    const updatedSettlement = await prisma.dailySettlement.findUnique({
      where: { id: settlement.id },
    });

    const s = updatedSettlement || settlement;

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
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create settlement" } },
      { status: 500 }
    );
  }
}
