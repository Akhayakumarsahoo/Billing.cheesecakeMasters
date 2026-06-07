import { IndianRupee, Percent, Receipt, Info, Wallet, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { Decimal } from "@/lib/db";
import { DateRangeFilter } from "@/components/date-range-filter";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { StatCard } from "@/components/ui/stat-card";
import { parseDateRange, formatINR } from "@/lib/utils";

import { Suspense } from "react";
import { OutletDashboardSkeleton } from "@/components/ui-skeletons";

export default async function OutletDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { id } = await params;

  // Auth check — admin and manager only
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "manager")) {
    redirect("/");
  }

  const outlet = await prisma.outlet.findUnique({ where: { id } });
  if (!outlet) notFound();

  const { from, to } = await searchParams;

  return (
    <>
      {/* Page Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-medium text-[var(--text-primary)]">
            {outlet.name} Dashboard
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            GSTIN: {outlet.gstin || "N/A"}
          </p>
        </div>
        <DateRangeFilter />
      </div>

      <Suspense key={`${from || ""}-${to || ""}`} fallback={<OutletDashboardSkeleton />}>
        <OutletDashboardContent id={id} from={from} to={to} />
      </Suspense>
    </>
  );
}

async function OutletDashboardContent({
  id,
  from,
  to,
}: {
  id: string;
  from?: string;
  to?: string;
}) {
  const { start, end } = parseDateRange(from, to);

  // 1. Fetch aggregations for this outlet
  const aggregations = await prisma.bill.aggregate({
    where: {
      outletId: id,
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
        outletId: id,
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

  // Fetch latest active settlement closing cash balance
  const latestActiveSettlement = await prisma.dailySettlement.findFirst({
    where: { outletId: id, status: "active" },
    orderBy: { settlementDate: "desc" },
  });
  const currentCashBoxBalance = latestActiveSettlement ? latestActiveSettlement.closingCash.toNumber() : 0;

  return (
    <>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard
          icon={IndianRupee}
          label="Total Revenue"
          value={`₹${formatINR(totalRevenue.toNumber())}`}
          subtext="Selected date range"
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
          label="Cash Box Balance"
          value={`₹${formatINR(currentCashBoxBalance)}`}
          subtext="Current drawer balance"
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
      </div>
    </>
  );
}
