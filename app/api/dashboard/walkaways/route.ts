import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseDateRange } from "@/lib/utils";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    if (user.role !== "admin" && user.role !== "manager") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized" } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;
    const outletIdsParam = searchParams.get("outletIds");
    const outletIds = outletIdsParam ? outletIdsParam.split(",").filter(Boolean) : [];

    const { start, end } = parseDateRange(from, to);

    // Validate maximum range of 93 days (approx 3 months)
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 93) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Date range cannot exceed 3 months (93 days)." } },
        { status: 400 }
      );
    }

    const whereClause: any = {
      createdAt: {
        gte: start,
        lte: end,
      },
    };

    if (outletIds.length > 0) {
      whereClause.outletId = { in: outletIds };
    }

    const [totalWalkaways, walkawayReasons] = await Promise.all([
      prisma.walkaway.count({
        where: whereClause,
      }),
      prisma.walkaway.groupBy({
        by: ["reason"],
        where: whereClause,
        _count: { id: true },
      }),
    ]);

    const reasonStats: Record<string, number> = {
      "Price too high": 0,
      "Desired item/flavor out of stock": 0,
      "Long waiting time": 0,
      "Will return later": 0,
      "Just exploring/browsing": 0,
      "Other": 0,
    };

    for (const wr of walkawayReasons) {
      if (wr.reason in reasonStats) {
        reasonStats[wr.reason] = wr._count.id;
      } else {
        reasonStats["Other"] += wr._count.id;
      }
    }

    return NextResponse.json({
      data: {
        totalWalkaways,
        reasonStats,
      },
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: error.message || "Failed to fetch walkaway stats" } },
      { status: 500 }
    );
  }
}
