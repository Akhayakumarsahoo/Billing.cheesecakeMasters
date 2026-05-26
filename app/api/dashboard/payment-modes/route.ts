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

    const { outletId, dateFrom, dateTo } = result.data;

    let query = `
      SELECT p.mode, SUM(p.amount) as "totalAmount", COUNT(p.id) as "transactionCount"
      FROM bill_payments p
      JOIN bills b ON p."billId" = b.id
      WHERE b.status = 'printed'
    `;

    if (outletId) {
      query += ` AND b."outletId" = '${outletId}'`;
    }
    if (dateFrom) {
      query += ` AND b."completedAt" >= '${dateFrom}'`;
    }
    if (dateTo) {
      query += ` AND b."completedAt" <= '${dateTo}T23:59:59.999Z'`;
    }

    query += ` GROUP BY p.mode`;

    const rawData = await prisma.$queryRawUnsafe<any[]>(query);

    const data = rawData.map((row) => ({
      mode: row.mode,
      totalAmount: row.totalAmount?.toString() || "0",
      transactionCount: Number(row.transactionCount || 0),
    }));

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch payment modes dashboard" } },
      { status: 500 }
    );
  }
}
