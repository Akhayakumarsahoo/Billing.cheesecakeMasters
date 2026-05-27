import { getCurrentOutlet } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Receipt, Percent, Coins, Info } from "lucide-react";
import { Prisma } from "@prisma/client";
import { DateRangeFilter } from "@/components/date-range-filter";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const outlet = await getCurrentOutlet();
  if (!outlet) return null;

  const resolvedParams = await searchParams;

  // Set default dates if none provided
  const getLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalDateString(new Date());

  const fromStr = resolvedParams.from || todayStr;
  const toStr = resolvedParams.to || todayStr;

  const start = new Date(`${fromStr}T00:00:00.000`);
  const end = new Date(`${toStr}T23:59:59.999`);

  const bills = await prisma.bill.findMany({
    where: {
      outletId: outlet.id,
      status: "printed",
      completedAt: {
        gte: start,
        lte: end,
      },
    },
    include: {
      payments: true,
    },
  });

  const totalRevenue = bills.reduce(
    (sum, bill) => sum.add(bill.grandTotal),
    new Prisma.Decimal(0),
  );
  const totalGst = bills.reduce(
    (sum, bill) => sum.add(bill.totalGst),
    new Prisma.Decimal(0),
  );

  let totalCash = new Prisma.Decimal(0);
  let totalCard = new Prisma.Decimal(0);
  let totalOnline = new Prisma.Decimal(0);
  let totalOther = new Prisma.Decimal(0);
  let totalNotPaid = new Prisma.Decimal(0);

  bills.forEach((bill) => {
    let billPaymentsTotal = new Prisma.Decimal(0);
    bill.payments.forEach((p) => {
      billPaymentsTotal = billPaymentsTotal.add(p.amount);
      const mode = p.mode.toLowerCase();
      if (mode === "cash") totalCash = totalCash.add(p.amount);
      else if (mode === "card") totalCard = totalCard.add(p.amount);
      else if (mode === "online" || mode === "upi" || mode === "netbanking")
        totalOnline = totalOnline.add(p.amount);
      else totalOther = totalOther.add(p.amount);
    });

    if (bill.grandTotal.greaterThan(billPaymentsTotal)) {
      totalNotPaid = totalNotPaid.add(bill.grandTotal.sub(billPaymentsTotal));
    }
  });

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-medium text-[var(--text-primary)]">
            Sales Summary
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Performance for {outlet.name}
          </p>
        </div>
        <DateRangeFilter />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Total Sales Breakdown Card */}
        <Card className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] shadow-sm col-span-1">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Coins className="h-5 w-5 text-[#2563eb]" strokeWidth={2} />
              <span className="font-medium text-[var(--text-primary)]">
                Total Sales
              </span>
            </div>
            <div className="text-4xl font-bold font-mono text-[var(--text-primary)] mb-6">
              ₹{" "}
              {totalRevenue
                .toNumber()
                .toLocaleString("en-IN", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2,
                })}
            </div>

            <div className="border-t border-[var(--border-subtle)] my-4"></div>

            <div className="space-y-4 pt-2">
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)] font-medium">
                  Not paid
                </span>
                <span className="font-mono text-[var(--text-primary)]">
                  ₹ {totalNotPaid.toNumber().toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)] font-medium">
                  Cash
                </span>
                <span className="font-mono text-[var(--text-primary)]">
                  ₹ {totalCash.toNumber().toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)] font-medium">
                  Card
                </span>
                <span className="font-mono text-[var(--text-primary)]">
                  ₹ {totalCard.toNumber().toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)] font-medium">
                  Online
                </span>
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

        {/* Other Metrics */}
        <div className="col-span-1 md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Receipt
                  className="h-5 w-5 text-[var(--text-secondary)]"
                  strokeWidth={1.5}
                />
                <span className="text-sm text-[var(--text-secondary)]">
                  Bills Generated
                </span>
              </div>
              <div className="text-2xl font-medium font-mono text-[var(--text-primary)] mb-1">
                {bills.length}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Percent
                  className="h-5 w-5 text-[var(--text-secondary)]"
                  strokeWidth={1.5}
                />
                <span className="text-sm text-[var(--text-secondary)]">
                  GST Collected
                </span>
              </div>
              <div className="text-2xl font-medium font-mono text-[var(--text-primary)] mb-1">
                ₹{totalGst.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
