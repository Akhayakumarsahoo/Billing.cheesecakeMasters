import { getCurrentOutlet } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Decimal } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Receipt, Percent, Coins, Info, Tag } from "lucide-react";
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
import { POSSalesSkeletonBody } from "@/components/ui-skeletons";

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const outlet = await getCurrentOutlet();
  if (!outlet) return null;

  const { from, to } = await searchParams;

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

      <Suspense key={`${from || ""}-${to || ""}`} fallback={<POSSalesSkeletonBody />}>
        <SalesContent outlet={outlet} from={from} to={to} />
      </Suspense>
    </div>
  );
}

async function SalesContent({
  outlet,
  from,
  to,
}: {
  outlet: { id: string; name: string };
  from?: string;
  to?: string;
}) {
  const { start, end } = parseDateRange(from, to);

  // 1. Fetch aggregations for this outlet
  const aggregations = await prisma.bill.aggregate({
    where: {
      outletId: outlet.id,
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
        outletId: outlet.id,
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

  return (
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
        <div className="col-span-1 md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={Receipt}
            label="Bills Generated"
            value={totalBillsCount}
          />
          <StatCard
            icon={Percent}
            label="GST Collected"
            value={`₹${totalGst.toFixed(2)}`}
          />
          <StatCard
            icon={Tag}
            label="Total Discount"
            value={`₹${totalDiscount.toFixed(2)}`}
          />
        </div>
      </div>
  );
}
