import { IndianRupee, Percent, Receipt, Info, Wallet } from "lucide-react";
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
import { parseDateRange, bucketPayments, formatINR } from "@/lib/utils";

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
  const { start, end } = parseDateRange(from, to);

  // Fetch printed bills for this outlet, filtered by completion date
  const bills = await prisma.bill.findMany({
    where: {
      outletId: id,
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

  // Fetch latest active settlement closing cash balance
  const latestActiveSettlement = await prisma.dailySettlement.findFirst({
    where: { outletId: id, status: "active" },
    orderBy: { settlementDate: "desc" },
  });
  const currentCashBoxBalance = latestActiveSettlement ? latestActiveSettlement.closingCash.toNumber() : 0;

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

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={IndianRupee}
          label="Total Revenue"
          value={`₹${formatINR(totalRevenue.toNumber())}`}
          subtext="Selected date range"
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
      </div>
    </>
  );
}
