import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { parseDateRange } from "@/lib/utils";
import { prisma } from "@/lib/db";
import { ReportsClient } from "@/components/reports/reports-client";
import { Decimal } from "@/lib/db";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "manager")) {
    redirect("/");
  }

  const { from, to } = await searchParams;
  const { start, end } = parseDateRange(from, to);

  // Calculate difference in days to enforce the 31-day limit
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const rangeError = diffDays > 31;

  let allOutlets: { id: string; name: string }[] = [];
  let salesData: { date: string; [key: string]: string | number }[] = [];
  let totalAllSales = "0.00";

  if (!rangeError) {
    allOutlets = await prisma.outlet.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    const bills = await prisma.bill.findMany({
      where: {
        status: "printed",
        completedAt: { gte: start, lte: end },
      },
      select: {
        grandTotal: true,
        completedAt: true,
        outletId: true,
      },
    });

    // Sum overall sales
    const overallTotal = bills.reduce(
      (sum, b) => sum.add(b.grandTotal),
      new Decimal(0)
    );
    totalAllSales = overallTotal.toFixed(2);

    // Group sales by day (local date string) and outlet
    const salesByDayAndOutlet: Record<string, Record<string, Decimal>> = {};

    // Helper: generate array of all dates in the range day-by-day
    const currentDate = new Date(start);
    const dateStrings: string[] = [];
    while (currentDate <= end) {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, "0");
      const day = String(currentDate.getDate()).padStart(2, "0");
      const dStr = `${year}-${month}-${day}`;
      dateStrings.push(dStr);
      salesByDayAndOutlet[dStr] = {};
      allOutlets.forEach((o) => {
        salesByDayAndOutlet[dStr][o.id] = new Decimal(0);
      });
      // Increment day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Populate actual sales from bills
    bills.forEach((bill) => {
      if (bill.completedAt) {
        const year = bill.completedAt.getFullYear();
        const month = String(bill.completedAt.getMonth() + 1).padStart(2, "0");
        const day = String(bill.completedAt.getDate()).padStart(2, "0");
        const dStr = `${year}-${month}-${day}`;
        if (dStr in salesByDayAndOutlet) {
          const prev = salesByDayAndOutlet[dStr][bill.outletId] || new Decimal(0);
          salesByDayAndOutlet[dStr][bill.outletId] = prev.add(bill.grandTotal);
        }
      }
    });

    // Transform into row list
    salesData = dateStrings.map((dStr) => {
      const row: { date: string; [key: string]: string | number } = { date: dStr };
      allOutlets.forEach((o) => {
        row[o.id] = salesByDayAndOutlet[dStr][o.id].toFixed(2);
      });
      return row;
    });
  }

  return (
    <ReportsClient
      outletId="all"
      rangeError={rangeError}
      outlets={allOutlets}
      salesReportData={{
        totalSales: totalAllSales,
        rows: salesData,
      }}
    />
  );
}
