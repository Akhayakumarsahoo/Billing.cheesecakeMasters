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
      SELECT 
        l."gstRate", 
        SUM(l."lineBaseTotal") as "taxableValue", 
        SUM(l."lineCgst") as "cgst", 
        SUM(l."lineSgst") as "sgst", 
        SUM(l."lineGstAmount") as "totalGst"
      FROM bill_line_items l
      JOIN bills b ON l."billId" = b.id
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

    query += ` GROUP BY l."gstRate" ORDER BY l."gstRate" ASC`;

    const rawData = await prisma.$queryRawUnsafe<any[]>(query);

    const data = rawData.map((row) => ({
      gstRate: row.gstRate?.toString() || "0",
      taxableValue: row.taxableValue?.toString() || "0",
      cgst: row.cgst?.toString() || "0",
      sgst: row.sgst?.toString() || "0",
      totalGst: row.totalGst?.toString() || "0",
    }));

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch GST by slab dashboard" } },
      { status: 500 }
    );
  }
}
