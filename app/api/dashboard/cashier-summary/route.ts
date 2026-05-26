import { requireOutlet } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DashboardQuerySchema } from "@/lib/validators";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const outlet = await requireOutlet();
    if (!outlet) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only outlets can access cashier summary" } },
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
    const outletId = outlet.id;

    let query = `
      SELECT 
        DATE(b."completedAt") as "date", 
        p.mode, 
        SUM(p.amount) as "totalAmount", 
        COUNT(p.id) as "transactionCount"
      FROM bill_payments p
      JOIN bills b ON p."billId" = b.id
      WHERE b.status = 'printed' AND b."outletId" = '${outletId}'
    `;

    if (dateFrom) {
      query += ` AND b."completedAt" >= '${dateFrom}'`;
    }
    if (dateTo) {
      query += ` AND b."completedAt" <= '${dateTo}T23:59:59.999Z'`;
    }

    query += ` GROUP BY DATE(b."completedAt"), p.mode ORDER BY "date" DESC`;

    const rawData = await prisma.$queryRawUnsafe<any[]>(query);

    const data = rawData.map((row) => ({
      date: row.date ? new Date(row.date).toISOString().split("T")[0] : "",
      mode: row.mode,
      totalAmount: row.totalAmount?.toString() || "0",
      transactionCount: Number(row.transactionCount || 0),
    }));

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch cashier summary" } },
      { status: 500 }
    );
  }
}
