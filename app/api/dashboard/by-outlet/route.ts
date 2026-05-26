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
        { error: { code: "FORBIDDEN", message: "Cashiers cannot access dashboard" } },
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

    const { dateFrom, dateTo } = result.data;
    const where: any = { status: "printed" };

    if (dateFrom || dateTo) {
      where.completedAt = {};
      if (dateFrom) where.completedAt.gte = new Date(dateFrom);
      if (dateTo) where.completedAt.lte = new Date(`${dateTo}T23:59:59.999Z`);
    }

    const outletsGrouped = await prisma.bill.groupBy({
      by: ["outletId"],
      where,
      _count: { id: true },
      _sum: {
        grandTotal: true,
        totalCgst: true,
        totalSgst: true,
        totalGst: true,
      },
    });

    const outlets = await prisma.outlet.findMany({
      where: { id: { in: outletsGrouped.map((g) => g.outletId) } },
      select: { id: true, name: true },
    });

    const outletMap = new Map(outlets.map((o) => [o.id, o.name]));

    let data = outletsGrouped.map((g) => ({
      outletId: g.outletId,
      outletName: outletMap.get(g.outletId) || "Unknown",
      billCount: g._count.id,
      totalRevenue: g._sum.grandTotal?.toString() || "0",
      totalCgst: g._sum.totalCgst?.toString() || "0",
      totalSgst: g._sum.totalSgst?.toString() || "0",
      totalGst: g._sum.totalGst?.toString() || "0",
    }));

    // Order by totalRevenue desc
    data.sort((a, b) => parseFloat(b.totalRevenue) - parseFloat(a.totalRevenue));

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch by-outlet dashboard" } },
      { status: 500 }
    );
  }
}
