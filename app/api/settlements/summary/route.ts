import { getCurrentUser, getCurrentOutlet } from "@/lib/auth";
import { getBilledSalesForDate, getOpeningCashForDate } from "@/lib/settlement";
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
    const dateStr = searchParams.get("date") || getLocalDateString(new Date());

    let targetOutletId: string;

    if (outlet) {
      targetOutletId = outlet.id;
    } else {
      // Must be admin or manager
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

    const billedSales = await getBilledSalesForDate(targetOutletId, dateStr);
    const openingCash = await getOpeningCashForDate(targetOutletId, dateStr);

    return NextResponse.json({
      data: {
        settlementDate: dateStr,
        openingCash: openingCash.toString(),
        billedCash: billedSales.billedCash.toString(),
        billedUpi: billedSales.billedUpi.toString(),
        billedCard: billedSales.billedCard.toString(),
        billedOther: billedSales.billedOther.toString(),
        totalBilled: billedSales.totalBilled.toString(),
      }
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch settlement summary" } },
      { status: 500 }
    );
  }
}
