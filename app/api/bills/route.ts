import { getCurrentUser, getCurrentOutlet } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BillHistoryQuerySchema, CreateBillSchema } from "@/lib/validators";
import { generateBillNumber } from "@/lib/bill-number";
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
    const paramsObj = Object.fromEntries(searchParams.entries());
    const result = BillHistoryQuerySchema.safeParse(paramsObj);

    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid query params" } },
        { status: 400 }
      );
    }

    const { page, limit, status, paymentMode, customerName, customerPhone, billNumber, dateFrom, dateTo } = result.data;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (outlet) {
      where.outletId = outlet.id;
    } else if (user && paramsObj.outletId) {
      where.outletId = paramsObj.outletId;
    }

    if (status) where.status = status;
    if (billNumber) where.billNumber = { contains: billNumber, mode: "insensitive" };
    if (customerName) where.customerName = { contains: customerName, mode: "insensitive" };
    if (customerPhone) where.customerPhone = { contains: customerPhone, mode: "insensitive" };

    if (dateFrom || dateTo) {
      where.completedAt = {};
      if (dateFrom) where.completedAt.gte = new Date(dateFrom);
      if (dateTo) where.completedAt.lte = new Date(`${dateTo}T23:59:59.999Z`);
    }

    if (paymentMode) {
      where.payments = { some: { mode: paymentMode } };
    }

    const [bills, total] = await Promise.all([
      prisma.bill.findMany({
        where,
        skip,
        take: limit,
        include: {
          outlet: { select: { id: true, name: true } },
          payments: { select: { mode: true, amount: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.bill.count({ where }),
    ]);

    const serialized = bills.map((b) => ({
      ...b,
      grandTotal: b.grandTotal.toString(),
      subtotal: b.subtotal.toString(),
      totalCgst: b.totalCgst.toString(),
      totalSgst: b.totalSgst.toString(),
      totalGst: b.totalGst.toString(),
      createdAt: b.createdAt.toISOString(),
      completedAt: b.completedAt?.toISOString() || null,
      cancelledAt: b.cancelledAt?.toISOString() || null,
      payments: b.payments.map(p => ({ mode: p.mode, amount: p.amount.toString() })),
    }));

    return NextResponse.json({
      data: {
        bills: serialized,
        total,
        page,
        limit,
      }
    }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch bills" } },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const outletAuth = await getCurrentOutlet();
    if (!outletAuth) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only outlets can create bills" } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = CreateBillSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input" } },
        { status: 400 }
      );
    }

    const outlet = await prisma.outlet.findUnique({ where: { id: outletAuth.id } });
    if (!outlet || !outlet.isActive) {
      return NextResponse.json(
        { error: { code: "INVALID_OUTLET", message: "Outlet not found or inactive" } },
        { status: 400 }
      );
    }

    const billNumber = await generateBillNumber(outlet.id);

    const bill = await prisma.bill.create({
      data: {
        ...result.data,
        billNumber,
        outletId: outlet.id,
        status: "draft",
      },
    });

    return NextResponse.json({
      data: {
        ...bill,
        grandTotal: bill.grandTotal.toString(),
        subtotal: bill.subtotal.toString(),
        totalCgst: bill.totalCgst.toString(),
        totalSgst: bill.totalSgst.toString(),
        totalGst: bill.totalGst.toString(),
      }
    }, { status: 201 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create bill" } },
      { status: 500 }
    );
  }
}
