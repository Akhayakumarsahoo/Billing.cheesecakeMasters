import { getCurrentOutlet } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getBilledSalesForDate } from "@/lib/settlement";
import { SettlementFormClient } from "../../new/settlement-form-client";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, AlertCircle, ShieldAlert } from "lucide-react";

export default async function EditSettlementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const outlet = await getCurrentOutlet();
  if (!outlet) return null;

  // 1. Fetch the settlement
  const settlement = await prisma.dailySettlement.findUnique({
    where: { id },
  });

  if (!settlement) {
    return (
      <div className="p-6 max-w-lg mx-auto text-center space-y-4">
        <AlertCircle className="h-12 w-12 mx-auto text-[var(--state-error-text)]" />
        <h1 className="text-xl font-medium text-[var(--text-primary)]">Settlement Not Found</h1>
        <p className="text-sm text-[var(--text-secondary)]">The settlement record you are trying to edit could not be found.</p>
        <Link
          href="/pos/settlement"
          className={buttonVariants({ variant: "outline", className: "flex items-center gap-2 mx-auto w-fit" })}
        >
          <ArrowLeft className="h-4 w-4" /> Back to History
        </Link>
      </div>
    );
  }

  // 2. Validate ownership
  if (settlement.outletId !== outlet.id) {
    return (
      <div className="p-6 max-w-lg mx-auto text-center space-y-4">
        <ShieldAlert className="h-12 w-12 mx-auto text-[var(--state-error-text)]" />
        <h1 className="text-xl font-medium text-[var(--text-primary)]">Access Denied</h1>
        <p className="text-sm text-[var(--text-secondary)]">You do not have permission to modify this settlement.</p>
        <Link
          href="/pos/settlement"
          className={buttonVariants({ variant: "outline", className: "flex items-center gap-2 mx-auto w-fit" })}
        >
          <ArrowLeft className="h-4 w-4" /> Back to History
        </Link>
      </div>
    );
  }

  // 3. 24-Hour Enforcement Check
  // Exemption is only for global Admin panel, but POS uses always have 24-hour limit.
  const now = new Date();
  const created = new Date(settlement.createdAt);
  const diffMs = now.getTime() - created.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const isLocked = diffHours >= 24;

  if (isLocked) {
    return (
      <div className="p-6 max-w-lg mx-auto text-center space-y-4">
        <ShieldAlert className="h-12 w-12 mx-auto text-[var(--state-warning-border)]" />
        <h1 className="text-xl font-medium text-[var(--text-primary)]">Settlement Locked</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          This settlement was created on{" "}
          <span className="font-semibold text-[var(--text-primary)]">
            {new Date(settlement.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          . Outlets and managers can only modify settlements within 24 hours of creation.
        </p>
        <Link
          href="/pos/settlement"
          className={buttonVariants({ variant: "outline", className: "flex items-center gap-2 mx-auto w-fit" })}
        >
          <ArrowLeft className="h-4 w-4" /> Back to History
        </Link>
      </div>
    );
  }

  // 4. Fetch sales summary and prepopulate form
  const dateStr = settlement.settlementDate.toISOString().split("T")[0];
  const billedSales = await getBilledSalesForDate(outlet.id, dateStr);

  const summary = {
    settlementDate: dateStr,
    openingCash: settlement.openingCash.toString(),
    billedCash: billedSales.billedCash.toString(),
    billedUpi: billedSales.billedUpi.toString(),
    billedCard: billedSales.billedCard.toString(),
    totalBilled: billedSales.totalBilled.toString(),
  };

  const formValues = {
    actualCash: settlement.actualCash.toString(),
    actualUpi: settlement.actualUpi.toString(),
    actualCard: settlement.actualCard.toString(),
    cashExpense: settlement.cashExpense.toString(),
    cashWithdraw: settlement.cashWithdraw.toString(),
  };

  return (
    <SettlementFormClient
      initialSummary={summary}
      outletName={outlet.name}
      isEdit={true}
      settlementId={settlement.id}
      initialFormValues={formValues}
    />
  );
}
