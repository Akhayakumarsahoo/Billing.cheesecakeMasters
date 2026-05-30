import {
  IndianRupee,
  Percent,
  Receipt,
  Info,
  Wallet,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { prisma } from "@/lib/db";
import { Decimal } from "@/lib/db";
import { DateRangeFilter } from "@/components/date-range-filter";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StatCard } from "@/components/ui/stat-card";
import { parseDateRange, bucketPayments, formatINR } from "@/lib/utils";

export default async function SalesDashboard({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const { start, end } = parseDateRange(from, to);

  // Fetch active outlets (for building the per-outlet breakdown)
  const outlets = await prisma.outlet.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  // Fetch the latest active daily settlement for all active outlets
  const latestSettlements = await prisma.dailySettlement.findMany({
    where: {
      status: "active",
      outletId: { in: outlets.map((o) => o.id) },
    },
    orderBy: { settlementDate: "desc" },
  });

  const cashboxMap: Record<string, Decimal> = {};
  const processedOutlets = new Set<string>();
  for (const o of outlets) {
    cashboxMap[o.id] = new Decimal(0);
  }
  for (const s of latestSettlements) {
    if (!processedOutlets.has(s.outletId)) {
      cashboxMap[s.outletId] = s.closingCash;
      processedOutlets.add(s.outletId);
    }
  }
  const totalCashboxBalance = Object.values(cashboxMap).reduce(
    (sum, bal) => sum.add(bal),
    new Decimal(0),
  );

  // Fetch all printed bills in the selected date range.
  // Filter on completedAt (the bill's actual completion timestamp).
  const bills = await prisma.bill.findMany({
    where: {
      status: "printed",
      completedAt: { gte: start, lte: end },
    },
    include: {
      payments: true,
      outlet: { select: { name: true } },
    },
  });

  // ── Aggregate totals ────────────────────────────────────
  const totalRevenue = bills.reduce(
    (sum: Decimal, bill) => sum.add(bill.grandTotal),
    new Decimal(0),
  );
  const totalGst = bills.reduce(
    (sum: Decimal, bill) => sum.add(bill.totalGst),
    new Decimal(0),
  );

  // Payment mode breakdown — extracted to shared util
  const paymentBuckets = bucketPayments(bills);

  // Per-outlet breakdown — build stats map in a single pass over bills
  const outletStatsMap: Record<
    string,
    {
      id: string;
      name: string;
      billsCount: number;
      revenue: Decimal;
      cgst: Decimal;
      sgst: Decimal;
      gstTotal: Decimal;
    }
  > = {};

  // Initialise a row for every active outlet
  for (const o of outlets) {
    outletStatsMap[o.id] = {
      id: o.id,
      name: o.name,
      billsCount: 0,
      revenue: new Decimal(0),
      cgst: new Decimal(0),
      sgst: new Decimal(0),
      gstTotal: new Decimal(0),
    };
  }

  // Accumulate each bill into its outlet's stats
  for (const bill of bills) {
    const stat = outletStatsMap[bill.outletId];
    if (!stat) continue;
    stat.billsCount += 1;
    stat.revenue = stat.revenue.add(bill.grandTotal);
    stat.cgst = stat.cgst.add(bill.totalCgst);
    stat.sgst = stat.sgst.add(bill.totalSgst);
    stat.gstTotal = stat.gstTotal.add(bill.totalGst);
  }

  // Only show outlets that actually have bills in the selected range
  const outletStatsList = Object.values(outletStatsMap).filter(
    (s) => s.billsCount > 0,
  );

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

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={IndianRupee}
          label="Total Revenue"
          value={`₹${formatINR(totalRevenue.toNumber())}`}
          subtext="Across all outlets"
        />
        <StatCard
          icon={Receipt}
          label="Total Bills"
          value={bills.length}
          subtext="Printed bills only"
        />
        <StatCard
          icon={Percent}
          label="GST Collected"
          value={`₹${formatINR(totalGst.toNumber())}`}
          subtext="CGST + SGST"
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
                { label: "Not paid", value: paymentBuckets.notPaid },
                { label: "Cash", value: paymentBuckets.cash },
                { label: "Card", value: paymentBuckets.card },
                { label: "Online / UPI", value: paymentBuckets.online },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-[var(--text-secondary)] font-medium">{label}</span>
                  <span className="font-mono text-[var(--text-primary)]">
                    ₹ {value.toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)] font-medium flex items-center gap-1">
                  Other
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[var(--text-primary)]">
                    ₹ {paymentBuckets.other.toLocaleString("en-IN")}
                  </span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Any uncategorized payment methods</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
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
                {["Outlet", "Bills", "Revenue", "CGST", "SGST", "GST Total", "Cash Box"].map(
                  (heading, i) => (
                    <TableHead
                      key={heading}
                      className={`text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide h-10 ${
                        i === 0 ? "text-left" : "text-right"
                      } ${i === 3 || i === 4 ? "hidden sm:table-cell" : ""}`}
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
                    colSpan={7}
                    className="text-center py-8 text-[var(--text-muted)]"
                  >
                    No sales data found for the selected date range.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {outletStatsList.map((stat) => (
                    <TableRow
                      key={stat.name}
                      className="border-[var(--border-default)] hover:bg-[var(--bg-surface-raised)]"
                    >
                      <TableCell className="text-sm font-medium text-[var(--text-primary)]">
                        {stat.name}
                      </TableCell>
                      <TableCell className="text-sm text-[var(--text-primary)] text-right">
                        {stat.billsCount}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-[var(--text-primary)] text-right">
                        ₹{formatINR(stat.revenue.toNumber())}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-[var(--text-primary)] text-right hidden sm:table-cell">
                        ₹{formatINR(stat.cgst.toNumber())}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-[var(--text-primary)] text-right hidden sm:table-cell">
                        ₹{formatINR(stat.sgst.toNumber())}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-[var(--text-primary)] text-right">
                        ₹{formatINR(stat.gstTotal.toNumber())}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-[var(--text-primary)] text-right">
                        ₹{formatINR(cashboxMap[stat.id]?.toNumber() || 0)}
                      </TableCell>
                    </TableRow>
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
                    <TableCell className="font-mono text-sm font-medium text-[var(--text-primary)] text-right hidden sm:table-cell">
                      ₹{formatINR(outletStatsList.reduce((s, o) => s + o.cgst.toNumber(), 0))}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-medium text-[var(--text-primary)] text-right hidden sm:table-cell">
                      ₹{formatINR(outletStatsList.reduce((s, o) => s + o.sgst.toNumber(), 0))}
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
