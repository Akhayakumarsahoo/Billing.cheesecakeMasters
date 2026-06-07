import {
  IndianRupee,
  Percent,
  Receipt,
  Info,
  Wallet,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClickableRow } from "@/components/clickable-row";
import { prisma } from "@/lib/db";
import { Decimal } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { DateRangeFilter } from "@/components/date-range-filter";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StatCard } from "@/components/ui/stat-card";
import { parseDateRange, formatINR } from "@/lib/utils";

import { Suspense } from "react";
import { DashboardSkeleton } from "@/components/ui-skeletons";

export default async function SalesDashboard({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;

  return (
    <>
      {/* Page Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-medium text-[var(--text-primary)]">
            Sales Dashboard
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">All outlets</p>
        </div>
        <DateRangeFilter />
      </div>

      <Suspense key={`${from || ""}-${to || ""}`} fallback={<DashboardSkeleton />}>
        <DashboardContent from={from} to={to} />
      </Suspense>
    </>
  );
}

async function DashboardContent({ from, to }: { from?: string; to?: string }) {
  const { start, end } = parseDateRange(from, to);

  // Fetch active outlets (for building the per-outlet breakdown)
  const outlets = await prisma.outlet.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  const cashboxMap: Record<string, Decimal> = {};
  for (const o of outlets) {
    cashboxMap[o.id] = new Decimal(0);
  }

  if (outlets.length > 0) {
    const latestSettlements = await prisma.$queryRaw<
      { outletId: string; closingCash: string }[]
    >`
      SELECT DISTINCT ON ("outletId") "outletId", "closingCash"::text
      FROM daily_settlements
      WHERE status = 'active' AND "outletId" IN (${Prisma.join(outlets.map((o) => o.id))})
      ORDER BY "outletId", "settlementDate" DESC
    `;

    for (const s of latestSettlements) {
      cashboxMap[s.outletId] = new Decimal(s.closingCash);
    }
  }

  const totalCashboxBalance = Object.values(cashboxMap).reduce(
    (sum, bal) => sum.add(bal),
    new Decimal(0),
  );

  // 1. Fetch aggregations for all printed bills in the selected date range.
  const aggregations = await prisma.bill.aggregate({
    where: {
      status: "printed",
      completedAt: { gte: start, lte: end },
    },
    _count: { id: true },
    _sum: {
      grandTotal: true,
      totalGst: true,
      discount: true,
    },
  });

  const totalRevenue = aggregations._sum.grandTotal || new Decimal(0);
  const totalGst = aggregations._sum.totalGst || new Decimal(0);
  const totalDiscount = aggregations._sum.discount || new Decimal(0);
  const totalBillsCount = aggregations._count.id;

  // 2. Fetch payment mode aggregates from billPayment
  const paymentBreakdown = await prisma.billPayment.groupBy({
    by: ["mode"],
    where: {
      bill: {
        status: "printed",
        completedAt: { gte: start, lte: end },
      },
    },
    _sum: {
      amount: true,
    },
  });

  const paymentBuckets = { cash: 0, upi: 0, card: 0, online: 0, notPaid: 0 };
  for (const item of paymentBreakdown) {
    const mode = item.mode.toLowerCase();
    const sum = item._sum.amount?.toNumber() || 0;
    if (mode === "cash") paymentBuckets.cash = sum;
    else if (mode === "card") paymentBuckets.card = sum;
    else if (mode === "upi") paymentBuckets.upi = sum;
    else if (mode === "online") paymentBuckets.online = sum;
  }

  // 3. Fetch outlet-level grouping
  const outletGroups = await prisma.bill.groupBy({
    by: ["outletId"],
    where: {
      status: "printed",
      completedAt: { gte: start, lte: end },
    },
    _count: {
      id: true,
    },
    _sum: {
      grandTotal: true,
      discount: true,
      totalGst: true,
    },
  });

  const outletStatsMap: Record<
    string,
    {
      id: string;
      name: string;
      billsCount: number;
      revenue: Decimal;
      discount: Decimal;
      gstTotal: Decimal;
    }
  > = {};

  for (const o of outlets) {
    outletStatsMap[o.id] = {
      id: o.id,
      name: o.name,
      billsCount: 0,
      revenue: new Decimal(0),
      discount: new Decimal(0),
      gstTotal: new Decimal(0),
    };
  }

  for (const g of outletGroups) {
    const stat = outletStatsMap[g.outletId];
    if (!stat) continue;
    stat.billsCount = g._count.id;
    stat.revenue = g._sum.grandTotal || new Decimal(0);
    stat.discount = g._sum.discount || new Decimal(0);
    stat.gstTotal = g._sum.totalGst || new Decimal(0);
  }

  const outletStatsList = Object.values(outletStatsMap);

  return (
    <>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard
          icon={IndianRupee}
          label="Total Revenue"
          value={`₹${formatINR(totalRevenue.toNumber())}`}
          subtext="Across all outlets"
        />
        <StatCard
          icon={Receipt}
          label="Total Bills"
          value={totalBillsCount}
          subtext="Printed bills only"
        />
        <StatCard
          icon={Percent}
          label="GST Collected"
          value={`₹${formatINR(totalGst.toNumber())}`}
          subtext="CGST + SGST"
        />
        <StatCard
          icon={Tag}
          label="Total Discount"
          value={`₹${formatINR(totalDiscount.toNumber())}`}
          subtext="Total discounts given"
        />
        <StatCard
          icon={Wallet}
          label="Cash Drawer Balance"
          value={`₹${formatINR(totalCashboxBalance.toNumber())}`}
          subtext="Consolidated cash in hand"
        />
      </div>

      {/* Payment Breakdown */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">
          Payment Breakdown
        </h2>
        <Card className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] shadow-sm max-w-md">
          <CardContent className="p-6">
            <div className="space-y-4">
              {[
                { label: "Cash", value: paymentBuckets.cash },
                { label: "Card", value: paymentBuckets.card },
                { label: "UPI", value: paymentBuckets.upi },
                { label: "Online (Delivery)", value: paymentBuckets.online },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-[var(--text-secondary)] font-medium">{label}</span>
                  <span className="font-mono text-[var(--text-primary)]">
                    ₹ {value.toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales by Outlet Table */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">
          Sales by Outlet
        </h2>
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-[var(--border-default)]">
                {["Outlet", "Bills", "Revenue", "Discount", "GST Total", "Cash Box"].map(
                  (heading, i) => (
                    <TableHead
                      key={heading}
                      className={`text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide h-10 ${
                        i === 0 ? "text-left" : "text-right"
                      }`}
                    >
                      {heading}
                    </TableHead>
                  ),
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {outletStatsList.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-[var(--text-muted)]"
                  >
                    No sales data found for the selected date range.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {outletStatsList.map((stat) => (
                    <ClickableRow
                      key={stat.name}
                      href={`/outlets/${stat.id}`}
                      className="border-[var(--border-default)] group"
                    >
                      <TableCell className="text-sm font-medium text-[var(--text-primary)] group-hover:underline">
                        {stat.name}
                      </TableCell>
                      <TableCell className="text-sm text-[var(--text-primary)] text-right">
                        {stat.billsCount}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-[var(--text-primary)] text-right">
                        ₹{formatINR(stat.revenue.toNumber())}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-[var(--text-primary)] text-right">
                        ₹{formatINR(stat.discount.toNumber())}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-[var(--text-primary)] text-right">
                        ₹{formatINR(stat.gstTotal.toNumber())}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-[var(--text-primary)] text-right">
                        ₹{formatINR(cashboxMap[stat.id]?.toNumber() || 0)}
                      </TableCell>
                    </ClickableRow>
                  ))}

                  {/* Totals Row */}
                  <TableRow className="border-0 bg-[var(--bg-surface-raised)] hover:bg-[var(--bg-surface-raised)]">
                    <TableCell className="text-sm font-medium text-[var(--text-primary)]">
                      Total
                    </TableCell>
                    <TableCell className="text-sm font-medium text-[var(--text-primary)] text-right">
                      {outletStatsList.reduce((s, o) => s + o.billsCount, 0)}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-medium text-[var(--text-primary)] text-right">
                      ₹{formatINR(outletStatsList.reduce((s, o) => s + o.revenue.toNumber(), 0))}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-medium text-[var(--text-primary)] text-right">
                      ₹{formatINR(outletStatsList.reduce((s, o) => s + o.discount.toNumber(), 0))}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-medium text-[var(--text-primary)] text-right">
                      ₹{formatINR(outletStatsList.reduce((s, o) => s + o.gstTotal.toNumber(), 0))}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-medium text-[var(--text-primary)] text-right">
                      ₹{formatINR(outletStatsList.reduce((s, o) => s + (cashboxMap[o.id]?.toNumber() || 0), 0))}
                    </TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
