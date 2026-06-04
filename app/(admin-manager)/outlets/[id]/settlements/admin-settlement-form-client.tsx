"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Wallet,
  ArrowLeft,
  Calendar,
  Save,
  Info,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatINR, getLocalDateString } from "@/lib/utils";

interface SummaryData {
  settlementDate: string;
  openingCash: string;
  billedCash: string;
  billedUpi: string;
  billedCard: string;
  totalBilled: string;
}

interface AdminSettlementFormClientProps {
  initialSummary: SummaryData;
  outletName: string;
  outletId: string;
  role: string;
  isEdit?: boolean;
  settlementId?: string;
  initialFormValues?: {
    actualCash: string;
    actualUpi: string;
    actualCard: string;
    cashExpense: string;
    cashWithdraw: string;
  };
}

export function AdminSettlementFormClient({
  initialSummary,
  outletName,
  outletId,
  role,
  isEdit = false,
  settlementId,
  initialFormValues,
}: AdminSettlementFormClientProps) {
  const router = useRouter();
  const [date, setDate] = useState<string>(initialSummary.settlementDate);
  const [summary, setSummary] = useState<SummaryData>(initialSummary);
  const [isFetchingSummary, setIsFetchingSummary] = useState(false);

  // Form Fields
  const [actualCash, setActualCash] = useState<string>(initialFormValues?.actualCash || "0");
  const [actualUpi, setActualUpi] = useState<string>(initialFormValues?.actualUpi || "0");
  const [actualCard, setActualCard] = useState<string>(initialFormValues?.actualCard || "0");
  const [cashExpense, setCashExpense] = useState<string>(initialFormValues?.cashExpense || "0");
  const [cashWithdraw, setCashWithdraw] = useState<string>(initialFormValues?.cashWithdraw || "0");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Date boundaries
  const maxDateStr = getLocalDateString(new Date());
  const minDateStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return getLocalDateString(d);
  })();

  // Fetch summary when date changes in creation mode
  useEffect(() => {
    if (isEdit || date === initialSummary.settlementDate) return;

    const fetchSummary = async () => {
      setIsFetchingSummary(true);
      setError(null);
      try {
        const res = await fetch(`/api/settlements/summary?date=${date}&outletId=${outletId}`);
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error?.message || "Failed to fetch date summary");
        }
        setSummary(json.data);
      } catch (err: any) {
        setError(err.message || "Could not retrieve system sales for the selected date.");
      } finally {
        setIsFetchingSummary(false);
      }
    };

    fetchSummary();
  }, [date, isEdit, initialSummary.settlementDate, outletId]);

  // Compute differences
  const getDifference = (actual: string, billed: string) => {
    const act = parseFloat(actual || "0");
    const bil = parseFloat(billed || "0");
    return act - bil;
  };

  const cashDiff = getDifference(actualCash, summary.billedCash);
  const upiDiff = getDifference(actualUpi, summary.billedUpi);
  const cardDiff = getDifference(actualCard, summary.billedCard);

  // Compute Closing Cash
  const opening = parseFloat(summary.openingCash || "0");
  const actCashNum = parseFloat(actualCash || "0");
  const expense = parseFloat(cashExpense || "0");
  const withdraw = parseFloat(cashWithdraw || "0");
  const closingCash = opening + actCashNum - expense - withdraw;

  const handleInputChange = (
    value: string,
    setter: (val: string) => void
  ) => {
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setter(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    const payload = {
      outletId,
      settlementDate: date,
      actualCash: parseFloat(actualCash || "0"),
      actualUpi: parseFloat(actualUpi || "0"),
      actualCard: parseFloat(actualCard || "0"),
      cashExpense: parseFloat(cashExpense || "0"),
      cashWithdraw: parseFloat(cashWithdraw || "0"),
    };

    try {
      const endpoint = isEdit ? `/api/settlements/${settlementId}` : "/api/settlements";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message || `Failed to ${isEdit ? "update" : "create"} settlement`);
      }

      setSuccess(`Daily settlement for ${date} successfully saved.`);
      router.refresh();

      setTimeout(() => {
        router.push(`/outlets/${outletId}/settlements`);
      }, 1500);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

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
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Back Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/outlets/${outletId}/settlements`}
          className={buttonVariants({ variant: "ghost", size: "icon", className: "h-8 w-8 text-[var(--text-secondary)] hover:text-[var(--text-primary)]" })}
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
        </Link>
        <div>
          <h1 className="text-xl font-medium text-[var(--text-primary)]">
            {isEdit ? "Edit Settlement" : "New Settlement"}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {isEdit ? "Modify daily settlement drawer reconciliations for " : "Perform daily drawer reconciliation for "} {outletName}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-[var(--state-error-bg)] border border-[var(--state-error-border)] rounded-xl p-4 text-sm text-[var(--state-error-text)] flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-[var(--state-success-bg)] border border-[var(--state-success-border)] rounded-xl p-4 text-sm text-[var(--state-success-text)] flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column — Config & Form Inputs */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm rounded-xl">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-base font-medium text-[var(--text-primary)] mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" strokeWidth={1.5} />
                Settlement Period & Drawer
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="settlementDate" className="text-sm text-[var(--text-secondary)]">
                    Settlement Date
                  </Label>
                  <Input
                    id="settlementDate"
                    type="date"
                    value={date}
                    disabled={isEdit || role !== "admin"}
                    onChange={(e) => setDate(e.target.value)}
                    min={minDateStr}
                    max={maxDateStr}
                    className="font-mono text-sm bg-white border-[var(--border-default)] disabled:bg-[var(--bg-surface-raised)]"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-[var(--text-secondary)]">
                    Opening Cash Balance
                  </Label>
                  <div className="h-10 px-3 flex items-center font-mono text-sm bg-[var(--bg-surface-raised)] border border-[var(--border-default)] rounded-md text-[var(--text-primary)]">
                    ₹ {formatINR(opening)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm rounded-xl">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-base font-medium text-[var(--text-primary)] mb-2">
                Actual Sales Receipts
              </h2>
              <p className="text-xs text-[var(--text-secondary)] -mt-2">
                Enter the physical counts and payment statement figures received today.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="actualCash" className="text-sm text-[var(--text-primary)]">
                    Actual Cash Received (₹)
                  </Label>
                  <Input
                    id="actualCash"
                    type="text"
                    inputMode="decimal"
                    value={actualCash}
                    disabled={isSubmitting}
                    onChange={(e) => handleInputChange(e.target.value, setActualCash)}
                    className="font-mono text-sm bg-white border-[var(--border-default)]"
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="actualUpi" className="text-sm text-[var(--text-primary)]">
                    Actual UPI Received (₹)
                  </Label>
                  <Input
                    id="actualUpi"
                    type="text"
                    inputMode="decimal"
                    value={actualUpi}
                    disabled={isSubmitting}
                    onChange={(e) => handleInputChange(e.target.value, setActualUpi)}
                    className="font-mono text-sm bg-white border-[var(--border-default)]"
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="actualCard" className="text-sm text-[var(--text-primary)]">
                    Actual Card Received (₹)
                  </Label>
                  <Input
                    id="actualCard"
                    type="text"
                    inputMode="decimal"
                    value={actualCard}
                    disabled={isSubmitting}
                    onChange={(e) => handleInputChange(e.target.value, setActualCard)}
                    className="font-mono text-sm bg-white border-[var(--border-default)]"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm rounded-xl">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-base font-medium text-[var(--text-primary)] mb-2">
                Cash Box Operations
              </h2>
              <p className="text-xs text-[var(--text-secondary)] -mt-2">
                Log cash expenditures or remittances/withdrawals taken directly from the drawer today.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cashExpense" className="text-sm text-[var(--text-primary)]">
                    Cash Expense (₹)
                  </Label>
                  <Input
                    id="cashExpense"
                    type="text"
                    inputMode="decimal"
                    value={cashExpense}
                    disabled={isSubmitting}
                    onChange={(e) => handleInputChange(e.target.value, setCashExpense)}
                    className="font-mono text-sm bg-white border-[var(--border-default)] text-[var(--state-error-text)]"
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cashWithdraw" className="text-sm text-[var(--text-primary)]">
                    Cash Withdrawal / Remittance (₹)
                  </Label>
                  <Input
                    id="cashWithdraw"
                    type="text"
                    inputMode="decimal"
                    value={cashWithdraw}
                    disabled={isSubmitting}
                    onChange={(e) => handleInputChange(e.target.value, setCashWithdraw)}
                    className="font-mono text-sm bg-white border-[var(--border-default)] text-[var(--text-secondary)]"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column — Reconciliation Comparative Table & Live Balances */}
        <div className="lg:col-span-5 space-y-6">
          <Card className={`bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm rounded-xl overflow-hidden transition-opacity ${isFetchingSummary ? "opacity-50 pointer-events-none" : ""}`}>
            <div className="p-5 border-b border-[var(--border-default)] bg-[var(--bg-surface-raised)] flex items-center justify-between">
              <span className="font-medium text-[var(--text-primary)]">Reconciliation Difference</span>
              <span className="font-mono text-xs text-[var(--text-secondary)] bg-[var(--bg-hover)] px-2 py-0.5 rounded border border-[var(--border-default)]">
                {date}
              </span>
            </div>

            <div className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-medium text-xs">Payment Mode</TableHead>
                    <TableHead className="font-medium text-xs text-right">Billed</TableHead>
                    <TableHead className="font-medium text-xs text-right">Actual</TableHead>
                    <TableHead className="font-medium text-xs text-right">Difference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { mode: "Cash", billed: summary.billedCash, actual: actualCash, diff: cashDiff },
                    { mode: "UPI", billed: summary.billedUpi, actual: actualUpi, diff: upiDiff },
                    { mode: "Card", billed: summary.billedCard, actual: actualCard, diff: cardDiff },
                  ].map((row) => (
                    <TableRow key={row.mode}>
                      <TableCell className="font-medium text-xs text-[var(--text-primary)]">
                        {row.mode}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-right text-[var(--text-secondary)]">
                        ₹{formatINR(parseFloat(row.billed))}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-right text-[var(--text-primary)]">
                        ₹{formatINR(parseFloat(row.actual || "0"))}
                      </TableCell>
                      <TableCell className={`font-mono text-xs text-right ${diffColorClass(row.diff)}`}>
                        {row.diff !== 0 && diffSymbol(row.diff)}₹{formatINR(row.diff)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Running Balance Card */}
          <Card className={`bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm rounded-xl ${isFetchingSummary ? "opacity-50" : ""}`}>
            <CardContent className="p-6 space-y-6">
              <h2 className="text-base font-medium text-[var(--text-primary)] flex items-center gap-2">
                <Wallet className="h-4 w-4" strokeWidth={1.5} />
                Closing Cash Preview
              </h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center text-[var(--text-secondary)]">
                  <span>Opening Cash:</span>
                  <span className="font-mono">₹{formatINR(opening)}</span>
                </div>
                <div className="flex justify-between items-center text-[var(--text-secondary)]">
                  <span>(+) Actual Cash Received:</span>
                  <span className="font-mono text-[var(--text-primary)]">₹{formatINR(actCashNum)}</span>
                </div>
                <div className="flex justify-between items-center text-[var(--text-secondary)]">
                  <span>(−) Cash Expenditure:</span>
                  <span className="font-mono text-[var(--state-error-text)]">₹{formatINR(expense)}</span>
                </div>
                <div className="flex justify-between items-center text-[var(--text-secondary)]">
                  <span>(−) Cash Remitted / Withdrawn:</span>
                  <span className="font-mono">₹{formatINR(withdraw)}</span>
                </div>

                <div className="border-t border-[var(--border-default)] pt-4 mt-2 flex justify-between items-center text-[var(--text-primary)] font-medium">
                  <span className="text-sm">Estimated Closing Balance:</span>
                  <span className="font-mono text-xl font-bold">
                    ₹{formatINR(closingCash)}
                  </span>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || isFetchingSummary}
                className="w-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white h-12 rounded-lg text-sm font-medium flex justify-center items-center gap-2 mt-4"
              >
                <Save className="h-4 w-4" strokeWidth={1.5} />
                {isSubmitting
                  ? "Saving Settlement..."
                  : isEdit
                  ? "Save Modified Settlement"
                  : "Save Settlement"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
