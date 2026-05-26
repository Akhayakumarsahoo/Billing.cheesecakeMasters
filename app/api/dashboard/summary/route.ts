import { getCurrentUser, getCurrentOutlet, requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DashboardQuerySchema } from "@/lib/validators";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    const outlet = await getCurrentOutlet();
    if (!user && !outlet) return new Response(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }), { status: 401 });
    if (outlet) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Cashiers cannot access general dashboard" } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const paramsObj = Object.fromEntries(searchParams.entries());
    const result = DashboardQuerySchema.safeParse(paramsObj);

    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid query params" } },
        { status: 400 }
      );
    }

    const { outletId, dateFrom, dateTo } = result.data;
    const where: any = { status: "printed" };

    if (outletId) where.outletId = outletId;

    if (dateFrom || dateTo) {
      where.completedAt = {};
      if (dateFrom) where.completedAt.gte = new Date(dateFrom);
      if (dateTo) where.completedAt.lte = new Date(`${dateTo}T23:59:59.999Z`);
    }

    const aggregations = await prisma.bill.aggregate({
      where,
      _count: { id: true },
      _sum: {
        grandTotal: true,
        totalCgst: true,
        totalSgst: true,
        totalGst: true,
      },
    });

    return NextResponse.json({
      data: {
        billCount: aggregations._count.id,
        totalRevenue: aggregations._sum.grandTotal?.toString() || "0",
        totalCgst: aggregations._sum.totalCgst?.toString() || "0",
        totalSgst: aggregations._sum.totalSgst?.toString() || "0",
        totalGst: aggregations._sum.totalGst?.toString() || "0",
      }
    }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch dashboard summary" } },
      { status: 500 }
    );
  }
}
