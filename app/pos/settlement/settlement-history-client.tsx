"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Wallet,
  Plus,
  Edit,
  XCircle,
  Coins,
  ChevronDown,
  ChevronUp,
  Info,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Check,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatINR } from "@/lib/utils";
import { DateRangeFilter } from "@/components/date-range-filter";

export interface SerializedSettlement {
  id: string;
  outletId: string;
  settlementDate: string;
  openingCash: string;
  billedCash: string;
  billedUpi: string;
  billedCard: string;
  billedOther: string;
  actualCash: string;
  actualUpi: string;
  actualCard: string;
  actualOther: string;
  cashExpense: string;
  cashWithdraw: string;
  closingCash: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdByName?: string | null;
  modifiedByName?: string | null;
}

interface SettlementHistoryClientProps {
  initialSettlements: SerializedSettlement[];
  currentCashBoxBalance: string;
  outletName: string;
}

export function SettlementHistoryClient({
  initialSettlements,
  currentCashBoxBalance,
  outletName,
}: SettlementHistoryClientProps) {
  const router = useRouter();
  const settlements = initialSettlements;
  const [expandedMobileRow, setExpandedMobileRow] = useState<string | null>(null);
  const [breakdownSettlement, setBreakdownSettlement] = useState<SerializedSettlement | null>(null);

  const formatDateTime = (dateStr: string) => {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: true
    }).format(new Date(dateStr));
  };

  // Cancellation State
  const [cancellingSettlement, setCancellingSettlement] = useState<SerializedSettlement | null>(null);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Check if today's settlement already exists
  const todayLocalStr = new Date().toLocaleDateString("sv-SE");
  const todaySettlement = settlements.find((s) => s.settlementDate === todayLocalStr);

  const isWithin24Hours = (createdAtStr: string) => {
    const now = new Date();
    const created = new Date(createdAtStr);
    const diffMs = now.getTime() - created.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours < 24;
  };

  const handleCancelClick = (settlement: SerializedSettlement) => {
    setCancellingSettlement(settlement);
    setCancelError(null);
    setIsCancelConfirmOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!cancellingSettlement) return;

    setIsCancelling(true);
    setCancelError(null);

    try {
      const res = await fetch(`/api/settlements/${cancellingSettlement.id}/cancel`, {
        method: "POST",
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to cancel settlement");
      }

      // Reload page/data to get updated running balances
      router.refresh();
      setIsCancelConfirmOpen(false);
      setCancellingSettlement(null);
    } catch (err: any) {
      setCancelError(err.message || "An unexpected error occurred.");
    } finally {
      setIsCancelling(false);
    }
  };

  const toggleMobileRow = (id: string) => {
    setExpandedMobileRow(expandedMobileRow === id ? null : id);
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-medium text-[var(--text-primary)]">
            Daily Settlement
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            End of day drawer reconciliation for {outletName}
          </p>
        </div>
        {todaySettlement ? (
          <Link
            href={`/pos/settlement/edit/${todaySettlement.id}`}
            className={buttonVariants({ className: "bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white self-start sm:self-center flex items-center gap-2" })}
          >
            <Edit className="h-4 w-4" strokeWidth={1.5} />
            Edit Today's Settlement
          </Link>
        ) : (
          <Link
            href="/pos/settlement/new"
            className={buttonVariants({ className: "bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white self-start sm:self-center flex items-center gap-2" })}
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            New Settlement
          </Link>
        )}
      </div>

      {/* Metric Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] p-6 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-[var(--bg-hover)] rounded-lg text-[var(--text-primary)]">
            <Wallet className="h-6 w-6" strokeWidth={1.5} />
          </div>
          <div>
            <span className="text-sm text-[var(--text-secondary)] font-medium">
              Cash Box Balance
            </span>
            <div className="text-3xl font-bold font-mono text-[var(--text-primary)] mt-1">
              ₹ {formatINR(parseFloat(currentCashBoxBalance))}
            </div>
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] p-6 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-[var(--bg-hover)] rounded-lg text-[var(--text-primary)]">
            <Calendar className="h-6 w-6" strokeWidth={1.5} />
          </div>
          <div>
            <span className="text-sm text-[var(--text-secondary)] font-medium">
              Total Settlements
            </span>
            <div className="text-3xl font-bold font-mono text-[var(--text-primary)] mt-1">
              {settlements.length}
            </div>
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] p-6 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-[var(--bg-hover)] rounded-lg text-[var(--text-primary)]">
            <Coins className="h-6 w-6" strokeWidth={1.5} />
          </div>
          <div>
            <span className="text-sm text-[var(--text-secondary)] font-medium">
              Last Settled Date
            </span>
            <div className="text-xl font-bold font-mono text-[var(--text-primary)] mt-1.5">
              {settlements.length > 0
                ? new Date(`${settlements[0].settlementDate}T00:00:00`).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "No settlements"}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] shadow-sm">
        <div className="p-5 border-b border-[var(--border-default)] flex items-center justify-between gap-4 flex-wrap">
          <span className="font-medium text-[var(--text-primary)]">
            Settlement History
          </span>
          <div className="flex items-center gap-3">
            <DateRangeFilter />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-[var(--text-muted)] cursor-help hover:text-[var(--text-secondary)]" />
                </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Outlets can edit or cancel settlements within 24 hours of creation. After 24 hours, only admins can modify past records.
                </p>
              </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {settlements.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <Coins className="h-12 w-12 mx-auto text-[var(--text-muted)] animate-bounce" strokeWidth={1} />
            <h3 className="text-lg font-medium text-[var(--text-primary)]">
              No daily settlements found
            </h3>
            <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto">
              Reconcile your cash box and sales receipts at the end of every business day.
            </p>
            <Link
              href="/pos/settlement/new"
              className={buttonVariants({ className: "bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white mt-2 flex items-center gap-2 w-fit mx-auto" })}
            >
              <Plus className="h-4 w-4" strokeWidth={1.5} />
              Create First Settlement
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-b-xl">
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <Table>
                <TableHeader className="bg-[var(--bg-surface-raised)]">
                  <TableRow>
                    <TableHead className="font-medium">Date</TableHead>
                    <TableHead className="font-medium">Opening Cash</TableHead>
                    <TableHead className="font-medium">Actual Cash</TableHead>
                    <TableHead className="font-medium">Expenses</TableHead>
                    <TableHead className="font-medium">Withdrawals</TableHead>
                    <TableHead className="font-medium">Closing Cash</TableHead>
                    <TableHead className="font-medium">Short/Excess</TableHead>
                    <TableHead className="font-medium">Status</TableHead>
                    <TableHead className="text-right font-medium">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settlements.map((s, idx) => {
                    const active = s.status === "active";
                    const isEditable = active && isWithin24Hours(s.createdAt);
                    const actualCashVal = parseFloat(s.actualCash);
                    const billedCashVal = parseFloat(s.billedCash);
                    const cashDiffVal = actualCashVal - billedCashVal;

                    const totalBilled = parseFloat(s.billedCash) + parseFloat(s.billedUpi) + parseFloat(s.billedCard) + parseFloat(s.billedOther);
                    const totalActual = parseFloat(s.actualCash) + parseFloat(s.actualUpi) + parseFloat(s.actualCard) + parseFloat(s.actualOther);
                    const totalDiff = totalActual - totalBilled;

                    return (
                      <TableRow key={s.id} className={idx % 2 === 1 ? "bg-[var(--bg-surface-raised)]" : ""}>
                        <TableCell className="font-medium font-mono text-[var(--text-primary)]">
                          <div className="flex items-center gap-1.5">
                            <span>
                              {new Date(`${s.settlementDate}T00:00:00`).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })}
                            </span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <span className="inline-flex cursor-help text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors p-0.5">
                                    <Info className="h-4 w-4" strokeWidth={1.5} />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="p-3 bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-md rounded-lg text-xs space-y-1.5 text-[var(--text-primary)] font-sans">
                                  <div>
                                    <span className="font-medium text-[var(--text-secondary)] mr-1">Created:</span>
                                    <span className="font-mono">{formatDateTime(s.createdAt)}</span>
                                    {s.createdByName && (
                                      <span className="text-[var(--text-muted)] ml-1">by {s.createdByName}</span>
                                    )}
                                  </div>
                                  <div>
                                    <span className="font-medium text-[var(--text-secondary)] mr-1">Last Modified:</span>
                                    <span className="font-mono">{formatDateTime(s.updatedAt)}</span>
                                    {s.modifiedByName && (
                                      <span className="text-[var(--text-muted)] ml-1">by {s.modifiedByName}</span>
                                    )}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-[var(--text-primary)]">
                          ₹{formatINR(parseFloat(s.openingCash))}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-[var(--text-primary)]">
                          ₹{formatINR(actualCashVal)}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-[var(--state-error-text)]">
                          ₹{formatINR(parseFloat(s.cashExpense))}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-[var(--text-secondary)]">
                          ₹{formatINR(parseFloat(s.cashWithdraw))}
                        </TableCell>
                        <TableCell className="font-mono font-medium text-sm text-[var(--text-primary)]">
                          ₹{formatINR(parseFloat(s.closingCash))}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-[var(--text-primary)]">
                          <button
                            onClick={() => setBreakdownSettlement(s)}
                            className={`flex items-center gap-1 hover:underline text-left cursor-pointer transition-colors ${
                              totalDiff > 0
                                ? "text-[var(--state-success-text)] font-semibold"
                                : totalDiff < 0
                                ? "text-[var(--state-error-text)] font-semibold"
                                : "text-[var(--text-secondary)]"
                            }`}
                            title="Click to view mismatches breakdown"
                          >
                            {totalDiff > 0 ? `+₹${formatINR(totalDiff)}` : totalDiff < 0 ? `-₹${formatINR(Math.abs(totalDiff))}` : "₹0.00"}
                            {totalDiff === 0 && (
                              <Check className="h-4 w-4 text-[var(--state-success-border)] inline-block shrink-0" strokeWidth={2.5} />
                            )}
                          </button>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`rounded font-medium px-2 py-0.5 text-xs ${
                              active
                                ? "bg-[var(--state-success-bg)] text-[var(--state-success-text)] border-[var(--state-success-border)]"
                                : "bg-[var(--state-error-bg)] text-[var(--state-error-text)] border-[var(--state-error-border)]"
                            }`}
                          >
                            {active ? "Active" : "Cancelled"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end items-center gap-1.5">
                            {isEditable ? (
                              <>
                                <Link
                                  href={`/pos/settlement/edit/${s.id}`}
                                  className={buttonVariants({ variant: "ghost", size: "icon", className: "h-8 w-8 text-[var(--text-secondary)] hover:text-[var(--text-primary)]" })}
                                >
                                  <Edit className="h-4 w-4" strokeWidth={1.5} />
                                </Link>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-[var(--state-error-text)] hover:bg-[var(--state-error-bg)]"
                                  onClick={() => handleCancelClick(s)}
                                >
                                  <XCircle className="h-4 w-4" strokeWidth={1.5} />
                                </Button>
                              </>
                            ) : active ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <span className="text-xs text-[var(--text-muted)] cursor-not-allowed select-none px-2 py-1 bg-[var(--bg-hover)] rounded border border-[var(--border-default)] inline-flex items-center gap-1">
                                      <Info className="h-3 w-3" /> Locked
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Settlement was created more than 24 hours ago and cannot be modified.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <span className="text-xs font-mono text-[var(--text-muted)] select-none">
                                N/A
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards View */}
            <div className="block md:hidden divide-y divide-[var(--border-subtle)]">
              {settlements.map((s) => {
                const isExpanded = expandedMobileRow === s.id;
                const active = s.status === "active";
                const isEditable = active && isWithin24Hours(s.createdAt);
                const actualCashVal = parseFloat(s.actualCash);
                const billedCashVal = parseFloat(s.billedCash);
                const cashDiffVal = actualCashVal - billedCashVal;

                const totalBilled = parseFloat(s.billedCash) + parseFloat(s.billedUpi) + parseFloat(s.billedCard) + parseFloat(s.billedOther);
                const totalActual = parseFloat(s.actualCash) + parseFloat(s.actualUpi) + parseFloat(s.actualCard) + parseFloat(s.actualOther);
                const totalDiff = totalActual - totalBilled;

                return (
                  <div key={s.id} className="p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-sm font-medium text-[var(--text-primary)]">
                          {new Date(`${s.settlementDate}T00:00:00`).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <span className="inline-flex cursor-help text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors p-0.5">
                                <Info className="h-4 w-4" strokeWidth={1.5} />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="p-3 bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-md rounded-lg text-xs space-y-1.5 text-[var(--text-primary)] font-sans">
                              <div>
                                <span className="font-medium text-[var(--text-secondary)] mr-1">Created:</span>
                                <span className="font-mono">{formatDateTime(s.createdAt)}</span>
                                {s.createdByName && (
                                  <span className="text-[var(--text-muted)] ml-1">by {s.createdByName}</span>
                                )}
                              </div>
                              <div>
                                <span className="font-medium text-[var(--text-secondary)] mr-1">Last Modified:</span>
                                <span className="font-mono">{formatDateTime(s.updatedAt)}</span>
                                {s.modifiedByName && (
                                  <span className="text-[var(--text-muted)] ml-1">by {s.modifiedByName}</span>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={`rounded font-medium px-1.5 py-0.5 text-[10px] ${
                            active
                              ? "bg-[var(--state-success-bg)] text-[var(--state-success-text)] border-[var(--state-success-border)]"
                              : "bg-[var(--state-error-bg)] text-[var(--state-error-text)] border-[var(--state-error-border)]"
                          }`}
                        >
                          {active ? "Active" : "Cancelled"}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-[var(--text-secondary)]"
                          onClick={() => toggleMobileRow(s.id)}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-[var(--text-secondary)] text-xs block">
                          Opening Cash
                        </span>
                        <span className="font-mono text-[var(--text-primary)] font-medium">
                          ₹{formatINR(parseFloat(s.openingCash))}
                        </span>
                      </div>
                      <div>
                        <span className="text-[var(--text-secondary)] text-xs block">
                          Closing Cash
                        </span>
                        <span className="font-mono text-[var(--text-primary)] font-medium">
                          ₹{formatINR(parseFloat(s.closingCash))}
                        </span>
                      </div>
                      <div>
                        <span className="text-[var(--text-secondary)] text-xs block">
                          Short/Excess
                        </span>
                        <button
                          onClick={() => setBreakdownSettlement(s)}
                          className={`font-mono font-medium hover:underline text-left cursor-pointer flex items-center gap-0.5 transition-colors ${
                            totalDiff > 0
                              ? "text-[var(--state-success-text)] font-semibold"
                              : totalDiff < 0
                              ? "text-[var(--state-error-text)] font-semibold"
                              : "text-[var(--text-secondary)]"
                          }`}
                          title="Click to view mismatches breakdown"
                        >
                          {totalDiff > 0 ? `+₹${formatINR(totalDiff)}` : totalDiff < 0 ? `-₹${formatINR(Math.abs(totalDiff))}` : "₹0.00"}
                          {totalDiff === 0 && (
                            <Check className="h-3.5 w-3.5 text-[var(--state-success-border)] inline-block shrink-0" strokeWidth={2.5} />
                          )}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="pt-3 border-t border-[var(--border-subtle)] space-y-3 animate-in slide-in-from-top duration-200">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-[var(--text-secondary)]">Actual Cash Sales:</span>
                            <div className="font-mono text-sm text-[var(--text-primary)]">
                              ₹{formatINR(actualCashVal)}
                            </div>
                          </div>
                          <div>
                            <span className="text-[var(--text-secondary)]">Billed Cash Sales:</span>
                            <div className="font-mono text-sm text-[var(--text-primary)]">
                              ₹{formatINR(parseFloat(s.billedCash))}
                            </div>
                          </div>
                          <div>
                            <span className="text-[var(--text-secondary)]">Actual UPI Sales:</span>
                            <div className="font-mono text-sm text-[var(--text-primary)]">
                              ₹{formatINR(parseFloat(s.actualUpi))}
                            </div>
                          </div>
                          <div>
                            <span className="text-[var(--text-secondary)]">Billed UPI Sales:</span>
                            <div className="font-mono text-sm text-[var(--text-primary)]">
                              ₹{formatINR(parseFloat(s.billedUpi))}
                            </div>
                          </div>
                          <div>
                            <span className="text-[var(--text-secondary)]">Actual Card Sales:</span>
                            <div className="font-mono text-sm text-[var(--text-primary)]">
                              ₹{formatINR(parseFloat(s.actualCard))}
                            </div>
                          </div>
                          <div>
                            <span className="text-[var(--text-secondary)]">Billed Card Sales:</span>
                            <div className="font-mono text-sm text-[var(--text-primary)]">
                              ₹{formatINR(parseFloat(s.billedCard))}
                            </div>
                          </div>
                          <div>
                            <span className="text-[var(--text-secondary)]">Cash Expenses:</span>
                            <div className="font-mono text-sm text-[var(--state-error-text)]">
                              ₹{formatINR(parseFloat(s.cashExpense))}
                            </div>
                          </div>
                          <div>
                            <span className="text-[var(--text-secondary)]">Cash Remitted / Withdrawn:</span>
                            <div className="font-mono text-sm text-[var(--text-secondary)]">
                              ₹{formatINR(parseFloat(s.cashWithdraw))}
                            </div>
                          </div>
                        </div>

                        {/* Mobile Actions */}
                        {isEditable && (
                          <div className="flex items-center gap-2 pt-2">
                            <Link
                              href={`/pos/settlement/edit/${s.id}`}
                              className={buttonVariants({ variant: "outline", size: "sm", className: "flex-1 text-xs flex justify-center items-center gap-1.5" })}
                            >
                              <Edit className="h-3.5 w-3.5" /> Edit
                            </Link>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs border-[var(--state-error-border)] text-[var(--state-error-text)] hover:bg-[var(--state-error-bg)]"
                              onClick={() => handleCancelClick(s)}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" /> Cancel
                            </Button>
                          </div>
                        )}
                        {!isEditable && active && (
                          <div className="bg-[var(--bg-hover)] border border-[var(--border-default)] rounded-lg p-2 text-center text-xs text-[var(--text-secondary)]">
                            This settlement was created over 24 hours ago and is locked.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Cancellation Dialog */}
      <Dialog open={isCancelConfirmOpen} onOpenChange={setIsCancelConfirmOpen}>
        <DialogContent className="sm:max-w-md bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[var(--text-primary)]">
              <AlertTriangle className="h-5 w-5 text-[var(--state-warning-border)] animate-pulse" />
              Cancel Settlement
            </DialogTitle>
            <DialogDescription className="text-sm text-[var(--text-secondary)] mt-2">
              Are you sure you want to cancel the daily settlement for{" "}
              <span className="font-semibold text-[var(--text-primary)]">
                {cancellingSettlement &&
                  new Date(`${cancellingSettlement.settlementDate}T00:00:00`).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
              </span>
              ?
            </DialogDescription>
          </DialogHeader>

          <div className="bg-[var(--state-warning-bg)] border border-[var(--state-warning-border)] rounded-lg p-4 text-xs text-[var(--state-warning-text)] space-y-2">
            <p className="font-semibold flex items-center gap-1">
              <Info className="h-3.5 w-3.5 inline" /> Critical Repercussions:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Its actual receipts, expenses, and withdrawals will be set to ₹0.00.</li>
              <li>The cash box balance for this day will become equal to the opening cash.</li>
              <li>All subsequent settlements will automatically recalculate and adjust their balances.</li>
              <li>This action is irreversible.</li>
            </ul>
          </div>

          {cancelError && (
            <div className="bg-[var(--state-error-bg)] border border-[var(--state-error-border)] rounded-lg p-3 text-xs text-[var(--state-error-text)]">
              {cancelError}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              disabled={isCancelling}
              onClick={() => setIsCancelConfirmOpen(false)}
              className="text-xs"
            >
              No, Keep It
            </Button>
            <Button
              disabled={isCancelling}
              onClick={handleCancelConfirm}
              className="bg-[var(--state-error-border)] hover:bg-[var(--state-error-text)] text-white text-xs"
            >
              {isCancelling ? "Cancelling..." : "Yes, Cancel Settlement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detailed Breakdown Dialog */}
      <Dialog open={!!breakdownSettlement} onOpenChange={(open) => !open && setBreakdownSettlement(null)}>
        <DialogContent className="sm:max-w-md bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-[var(--text-primary)]">
              Settlement Mismatches Breakdown
            </DialogTitle>
            <DialogDescription className="text-sm text-[var(--text-secondary)] mt-2">
              Detailed mismatch analysis for{" "}
              <span className="font-semibold text-[var(--text-primary)] font-mono">
                {breakdownSettlement &&
                  new Date(`${breakdownSettlement.settlementDate}T00:00:00`).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
              </span>
            </DialogDescription>
          </DialogHeader>

          {breakdownSettlement && (() => {
            const getDiffForMode = (act: string, bil: string) => parseFloat(act) - parseFloat(bil);
            const cashD = getDiffForMode(breakdownSettlement.actualCash, breakdownSettlement.billedCash);
            const upiD = getDiffForMode(breakdownSettlement.actualUpi, breakdownSettlement.billedUpi);
            const cardD = getDiffForMode(breakdownSettlement.actualCard, breakdownSettlement.billedCard);
            const otherD = getDiffForMode(breakdownSettlement.actualOther, breakdownSettlement.billedOther);

            const totBilled = parseFloat(breakdownSettlement.billedCash) +
                              parseFloat(breakdownSettlement.billedUpi) +
                              parseFloat(breakdownSettlement.billedCard) +
                              parseFloat(breakdownSettlement.billedOther);

            const totActual = parseFloat(breakdownSettlement.actualCash) +
                              parseFloat(breakdownSettlement.actualUpi) +
                              parseFloat(breakdownSettlement.actualCard) +
                              parseFloat(breakdownSettlement.actualOther);

            const totDiff = totActual - totBilled;

            const diffColorClass = (diff: number) => {
              if (diff > 0) return "text-[var(--state-success-text)] font-semibold";
              if (diff < 0) return "text-[var(--state-error-text)] font-semibold";
              return "text-[var(--text-secondary)] font-mono";
            };

            const diffSymbol = (diff: number) => {
              if (diff > 0) return "+";
              return "";
            };

            return (
              <div className="space-y-4">
                <div className="border border-[var(--border-default)] rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-[var(--bg-surface-raised)]">
                      <TableRow>
                        <TableHead className="font-medium text-xs">Mode</TableHead>
                        <TableHead className="font-medium text-xs text-right">Billed</TableHead>
                        <TableHead className="font-medium text-xs text-right">Actual</TableHead>
                        <TableHead className="font-medium text-xs text-right">Difference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        { mode: "Cash", billed: breakdownSettlement.billedCash, actual: breakdownSettlement.actualCash, diff: cashD },
                        { mode: "UPI", billed: breakdownSettlement.billedUpi, actual: breakdownSettlement.actualUpi, diff: upiD },
                        { mode: "Card", billed: breakdownSettlement.billedCard, actual: breakdownSettlement.actualCard, diff: cardD },
                        { mode: "Other", billed: breakdownSettlement.billedOther, actual: breakdownSettlement.actualOther, diff: otherD },
                      ].map((row) => (
                        <TableRow key={row.mode}>
                          <TableCell className="font-medium text-xs text-[var(--text-primary)]">
                            {row.mode}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-right text-[var(--text-secondary)]">
                            ₹{formatINR(parseFloat(row.billed))}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-right text-[var(--text-primary)]">
                            ₹{formatINR(parseFloat(row.actual))}
                          </TableCell>
                          <TableCell className={`font-mono text-xs text-right ${diffColorClass(row.diff)}`}>
                            {row.diff !== 0 && diffSymbol(row.diff)}₹{formatINR(row.diff)}
                            {row.diff === 0 && (
                              <Check className="h-3.5 w-3.5 text-[var(--state-success-border)] inline-block shrink-0 ml-1" strokeWidth={2.5} />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-[var(--bg-surface-raised)] font-semibold border-t border-[var(--border-default)]">
                        <TableCell className="text-xs text-[var(--text-primary)] font-bold">
                          Total
                        </TableCell>
                        <TableCell className="font-mono text-xs text-right text-[var(--text-primary)]">
                          ₹{formatINR(totBilled)}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-right text-[var(--text-primary)] font-bold">
                          ₹{formatINR(totActual)}
                        </TableCell>
                        <TableCell className={`font-mono text-xs text-right font-bold ${diffColorClass(totDiff)}`}>
                          {totDiff !== 0 && diffSymbol(totDiff)}₹{formatINR(totDiff)}
                          {totDiff === 0 && (
                            <Check className="h-3.5 w-3.5 text-[var(--state-success-border)] inline-block shrink-0 ml-1 font-bold" strokeWidth={2.5} />
                          )}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {totDiff === 0 ? (
                  <div className="bg-[var(--state-success-bg)] border border-[var(--state-success-border)] rounded-lg p-3 text-xs text-[var(--state-success-text)] text-center font-medium">
                    Perfect match! Cash drawer and digital receipts are completely reconciled.
                  </div>
                ) : (
                  <div className={`border rounded-lg p-3 text-xs text-center font-medium ${
                    totDiff > 0 
                      ? "bg-[var(--state-success-bg)] border-[var(--state-success-border)] text-[var(--state-success-text)]"
                      : "bg-[var(--state-error-bg)] border-[var(--state-error-border)] text-[var(--state-error-text)]"
                  }`}>
                    {totDiff > 0 
                      ? `Excess of ₹${formatINR(totDiff)} detected in receipts.` 
                      : `Shortage of ₹${formatINR(Math.abs(totDiff))} detected in receipts.`}
                  </div>
                )}
              </div>
            );
          })()}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBreakdownSettlement(null)}
              className="text-xs w-full sm:w-auto"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
