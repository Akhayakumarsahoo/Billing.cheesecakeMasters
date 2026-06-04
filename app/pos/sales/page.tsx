import { getCurrentOutlet } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Decimal } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Receipt, Percent, Coins, Info } from "lucide-react";
import { DateRangeFilter } from "@/components/date-range-filter";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StatCard } from "@/components/ui/stat-card";
import { parseDateRange, bucketPayments, formatINR } from "@/lib/utils";

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const outlet = await getCurrentOutlet();
  if (!outlet) return null;

  const { from, to } = await searchParams;
  const { start, end } = parseDateRange(from, to);

  // Fetch printed bills for this outlet, filtered by completion date
  const bills = await prisma.bill.findMany({
    where: {
      outletId: outlet.id,
      status: "printed",
      completedAt: { gte: start, lte: end },
    },
    include: { payments: true },
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

  // Payment mode breakdown
  const paymentBuckets = bucketPayments(bills);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
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
        {/* Total Sales + Payment Breakdown Card */}
        <Card className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] shadow-sm col-span-1">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Coins className="h-5 w-5 text-[#2563eb]" strokeWidth={2} />
              <span className="font-medium text-[var(--text-primary)]">
                Total Sales
              </span>
            </div>
            <div className="text-4xl font-bold font-mono text-[var(--text-primary)] mb-6">
              ₹ {totalRevenue.toNumber().toLocaleString("en-IN", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })}
            </div>

            <div className="border-t border-[var(--border-subtle)] my-4" />

            <div className="space-y-4 pt-2">
              {[
                { label: "Not paid", value: paymentBuckets.notPaid },
                { label: "Cash", value: paymentBuckets.cash },
                { label: "Card", value: paymentBuckets.card },
                { label: "UPI", value: paymentBuckets.upi },
                { label: "Online (Delivery)", value: paymentBuckets.online },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-[var(--text-secondary)] font-medium">
                    {label}
                  </span>
                  <span className="font-mono text-[var(--text-primary)]">
                    ₹ {value.toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bills count + GST cards */}
        <div className="col-span-1 md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            icon={Receipt}
            label="Bills Generated"
            value={bills.length}
          />
          <StatCard
            icon={Percent}
            label="GST Collected"
            value={`₹${totalGst.toFixed(2)}`}
          />
        </div>
      </div>
    </div>
  );
}
