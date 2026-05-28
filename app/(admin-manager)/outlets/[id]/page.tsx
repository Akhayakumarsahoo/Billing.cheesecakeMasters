import {
  IndianRupee,
  Percent,
  Receipt,
  Info,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { DateRangeFilter } from "@/components/date-range-filter";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function OutletDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string, to?: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "manager")) {
    redirect("/");
  }

  const outlet = await prisma.outlet.findUnique({
    where: { id },
  });

  if (!outlet) {
    notFound();
  }

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

  // Fetch all printed bills for this outlet
  const bills = await prisma.bill.findMany({
    where: {
      outletId: id,
      status: "printed",
      createdAt: {
        gte: start,
        lte: end,
      }
    },
    include: {
      payments: true,
    }
  });

  const totalRevenue = bills.reduce((sum, bill) => sum.add(bill.grandTotal), new Prisma.Decimal(0));
  const totalGst = bills.reduce((sum, bill) => sum.add(bill.totalGst), new Prisma.Decimal(0));

  let totalCash = new Prisma.Decimal(0);
  let totalCard = new Prisma.Decimal(0);
  let totalOnline = new Prisma.Decimal(0);
  let totalOther = new Prisma.Decimal(0);
  let totalNotPaid = new Prisma.Decimal(0);

  bills.forEach(bill => {
    // Payment Breakdown
    let billPaymentsTotal = new Prisma.Decimal(0);
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
  });

  return (
    <>
      {/* Section 1 — Page Header + Filters */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-medium text-[#111110]">
            {outlet.name} Dashboard
          </h1>
          <p className="text-sm text-[#6B6B68] mt-1">
            GSTIN: {outlet.gstin || "N/A"}
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
            <div className="text-xs text-[var(--text-muted)]">Selected date range</div>
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
    </>
  );
}
