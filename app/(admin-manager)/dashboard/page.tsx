import {
  IndianRupee,
  Percent,
  Banknote,
  Smartphone,
  CreditCard,
  Receipt,
  Info,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default async function SalesDashboard({ searchParams }: { searchParams: Promise<{ from?: string, to?: string }> }) {
  const resolvedParams = await searchParams;

  const getLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalDateString(new Date());
  
  const fromStr = resolvedParams.from || todayStr;
  const toStr = resolvedParams.to || todayStr;

  let start = new Date(`${fromStr}T00:00:00.000`);
  let end = new Date(`${toStr}T23:59:59.999`);

  if (!isFinite(start.getTime()) || !isFinite(end.getTime())) {
    start = new Date(`${todayStr}T00:00:00.000`);
    end = new Date(`${todayStr}T23:59:59.999`);
  }

  // Fetch all outlets
  const outlets = await prisma.outlet.findMany({
    where: { isActive: true },
    select: { id: true, name: true }
  });

  // Fetch all printed bills
  const bills = await prisma.bill.findMany({
    where: {
      status: "printed",
      createdAt: {
        gte: start,
        lte: end,
      }
    },
    include: {
      payments: true,
      outlet: {
        select: {
          name: true
        }
      }
    }
  });

  const totalRevenue = bills.reduce((sum, bill) => sum.add(bill.grandTotal), new Decimal(0));
  const totalGst = bills.reduce((sum, bill) => sum.add(bill.totalGst), new Decimal(0));

  let totalCash = new Decimal(0);
  let totalCard = new Decimal(0);
  let totalOnline = new Decimal(0);
  let totalOther = new Decimal(0);
  let totalNotPaid = new Decimal(0);

  // For outlet breakdown
  const outletStats: Record<string, {
    name: string;
    billsCount: number;
    revenue: Decimal;
    cgst: Decimal;
    sgst: Decimal;
    gstTotal: Decimal;
  }> = {};

  outlets.forEach(o => {
    outletStats[o.id] = {
      name: o.name,
      billsCount: 0,
      revenue: new Decimal(0),
      cgst: new Decimal(0),
      sgst: new Decimal(0),
      gstTotal: new Decimal(0)
    };
  });

  bills.forEach(bill => {
    // Overall Payment Breakdown
    let billPaymentsTotal = new Decimal(0);
    bill.payments.forEach((p) => {
      billPaymentsTotal = billPaymentsTotal.add(p.amount);
      const mode = p.mode.toLowerCase();
      if (mode === "cash") totalCash = totalCash.add(p.amount);
      else if (mode === "card") totalCard = totalCard.add(p.amount);
      else if (mode === "online" || mode === "upi" || mode === "netbanking") totalOnline = totalOnline.add(p.amount);
      else totalOther = totalOther.add(p.amount);
    });

    if (bill.grandTotal.greaterThan(billPaymentsTotal)) {
      totalNotPaid = totalNotPaid.add(bill.grandTotal.sub(billPaymentsTotal));
    }

    // Outlet Breakdown
    if (outletStats[bill.outletId]) {
      outletStats[bill.outletId].billsCount += 1;
      outletStats[bill.outletId].revenue = outletStats[bill.outletId].revenue.add(bill.grandTotal);
      outletStats[bill.outletId].cgst = outletStats[bill.outletId].cgst.add(bill.totalCgst);
      outletStats[bill.outletId].sgst = outletStats[bill.outletId].sgst.add(bill.totalSgst);
      outletStats[bill.outletId].gstTotal = outletStats[bill.outletId].gstTotal.add(bill.totalGst);
    }
  });

  const outletStatsList = Object.values(outletStats).filter(s => s.billsCount > 0);

  return (
    <>
      {/* Section 1 — Page Header + Filters */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-medium text-[#111110]">
            Sales Dashboard
          </h1>
          <p className="text-sm text-[#6B6B68] mt-1">
            All outlets
          </p>
        </div>
        <DateRangeFilter />
      </div>

      {/* Section 2 — Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Card className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <IndianRupee className="h-5 w-5 text-[var(--text-secondary)]" strokeWidth={1.5} />
              <span className="text-sm text-[var(--text-secondary)]">Total Revenue</span>
            </div>
            <div className="text-2xl font-medium font-mono text-[var(--text-primary)] mb-1">
              ₹{totalRevenue.toNumber().toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-[var(--text-muted)]">Across all outlets</div>
          </CardContent>
        </Card>

        <Card className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Receipt className="h-5 w-5 text-[var(--text-secondary)]" strokeWidth={1.5} />
              <span className="text-sm text-[var(--text-secondary)]">Total Bills</span>
            </div>
            <div className="text-2xl font-medium font-mono text-[var(--text-primary)] mb-1">
              {bills.length}
            </div>
            <div className="text-xs text-[var(--text-muted)]">Printed bills only</div>
          </CardContent>
        </Card>

        <Card className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Percent className="h-5 w-5 text-[var(--text-secondary)]" strokeWidth={1.5} />
              <span className="text-sm text-[var(--text-secondary)]">GST Collected</span>
            </div>
            <div className="text-2xl font-medium font-mono text-[var(--text-primary)] mb-1">
              ₹{totalGst.toNumber().toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-[var(--text-muted)]">CGST + SGST</div>
          </CardContent>
        </Card>
      </div>

      {/* Section 3 — Payment Breakdown */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">Payment Breakdown</h2>
        <Card className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] shadow-sm max-w-md">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)] font-medium">Not paid</span>
                <span className="font-mono text-[var(--text-primary)]">
                  ₹ {totalNotPaid.toNumber().toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)] font-medium">Cash</span>
                <span className="font-mono text-[var(--text-primary)]">
                  ₹ {totalCash.toNumber().toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)] font-medium">Card</span>
                <span className="font-mono text-[var(--text-primary)]">
                  ₹ {totalCard.toNumber().toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)] font-medium">Online</span>
                <span className="font-mono text-[var(--text-primary)]">
                  ₹ {totalOnline.toNumber().toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)] font-medium flex items-center gap-1">
                  Other
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[var(--text-primary)]">
                    ₹ {totalOther.toNumber().toLocaleString("en-IN")}
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

      {/* Section 4 — Sales by Outlet Table */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">
          Sales by Outlet
        </h2>
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-[var(--border-default)]">
                <TableHead className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide text-left h-10">
                  Outlet
                </TableHead>
                <TableHead className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide text-right h-10">
                  Bills
                </TableHead>
                <TableHead className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide text-right h-10">
                  Revenue
                </TableHead>
                <TableHead className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide text-right h-10 hidden sm:table-cell">
                  CGST
                </TableHead>
                <TableHead className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide text-right h-10 hidden sm:table-cell">
                  SGST
                </TableHead>
                <TableHead className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide text-right h-10">
                  GST Total
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {outletStatsList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-[var(--text-muted)]">
                    No sales data found for the selected date range.
                  </TableCell>
                </TableRow>
              ) : (
                outletStatsList.map((stat, i) => (
                  <TableRow key={stat.name} className="border-[var(--border-default)] hover:bg-[var(--bg-surface-raised)]">
                    <TableCell className="text-sm font-medium text-[var(--text-primary)]">
                      {stat.name}
                    </TableCell>
                    <TableCell className="text-sm text-[var(--text-primary)] text-right">
                      {stat.billsCount}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-[var(--text-primary)] text-right">
                      ₹{stat.revenue.toNumber().toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-[var(--text-primary)] text-right hidden sm:table-cell">
                      ₹{stat.cgst.toNumber().toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-[var(--text-primary)] text-right hidden sm:table-cell">
                      ₹{stat.sgst.toNumber().toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-[var(--text-primary)] text-right">
                      ₹{stat.gstTotal.toNumber().toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))
              )}
              {outletStatsList.length > 0 && (
                <TableRow className="border-0 bg-[var(--bg-surface-raised)] hover:bg-[var(--bg-surface-raised)]">
                  <TableCell className="text-sm font-medium text-[var(--text-primary)]">Total</TableCell>
                  <TableCell className="text-sm font-medium text-[var(--text-primary)] text-right">
                    {outletStatsList.reduce((sum, s) => sum + s.billsCount, 0)}
                  </TableCell>
                  <TableCell className="font-mono text-sm font-medium text-[var(--text-primary)] text-right">
                    ₹{outletStatsList.reduce((sum, s) => sum + s.revenue.toNumber(), 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="font-mono text-sm font-medium text-[var(--text-primary)] text-right hidden sm:table-cell">
                    ₹{outletStatsList.reduce((sum, s) => sum + s.cgst.toNumber(), 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="font-mono text-sm font-medium text-[var(--text-primary)] text-right hidden sm:table-cell">
                    ₹{outletStatsList.reduce((sum, s) => sum + s.sgst.toNumber(), 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="font-mono text-sm font-medium text-[var(--text-primary)] text-right">
                    ₹{outletStatsList.reduce((sum, s) => sum + s.gstTotal.toNumber(), 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
