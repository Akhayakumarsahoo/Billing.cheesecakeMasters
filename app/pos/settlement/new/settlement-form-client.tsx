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
  TrendingDown,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatINR } from "@/lib/utils";

interface SummaryData {
  settlementDate: string;
  openingCash: string;
  billedCash: string;
  billedUpi: string;
  billedCard: string;
  totalBilled: string;
  exists?: boolean;
}

interface SettlementFormClientProps {
  initialSummary: SummaryData;
  outletName: string;
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

export function SettlementFormClient({
  initialSummary,
  outletName,
  isEdit = false,
  settlementId,
  initialFormValues,
}: SettlementFormClientProps) {
  const router = useRouter();
  const [date, setDate] = useState<string>(initialSummary.settlementDate);
  const [summary, setSummary] = useState<SummaryData>(initialSummary);
  const [isFetchingSummary, setIsFetchingSummary] = useState(false);

  // Form Fields
  const [actualCash, setActualCash] = useState<string>(initialFormValues?.actualCash || "");
  const [actualUpi, setActualUpi] = useState<string>(initialFormValues?.actualUpi || "");
  const [actualCard, setActualCard] = useState<string>(initialFormValues?.actualCard || "");
  const [cashExpense, setCashExpense] = useState<string>(initialFormValues?.cashExpense || "");
  const [cashWithdraw, setCashWithdraw] = useState<string>(initialFormValues?.cashWithdraw || "");

  const [closingCashInput, setClosingCashInput] = useState<string>("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch summary when date changes in creation mode
  useEffect(() => {
    if (isEdit || date === initialSummary.settlementDate) return;

    const fetchSummary = async () => {
      setIsFetchingSummary(true);
      setError(null);
      try {
        const res = await fetch(`/api/settlements/summary?date=${date}`);
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
  }, [date, isEdit, initialSummary.settlementDate]);

  const safeParse = (val: string): number => {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Compute differences
  const getDifference = (actual: string, billed: string) => {
    const act = safeParse(actual);
    const bil = safeParse(billed);
    return act - bil;
  };

  const cashDiff = getDifference(actualCash, summary.billedCash);
  const upiDiff = getDifference(actualUpi, summary.billedUpi);
  const cardDiff = getDifference(actualCard, summary.billedCard);

  // Compute Closing Cash
  const opening = safeParse(summary.openingCash);
  const actCashNum = safeParse(actualCash);
  const expense = safeParse(cashExpense);
  const withdraw = safeParse(cashWithdraw);
  const closingCash = opening + actCashNum - expense - withdraw;

  // Synchronize closingCashInput when summary openingCash changes
  useEffect(() => {
    const openingVal = safeParse(summary.openingCash);
    const actCashVal = safeParse(actualCash);
    const expVal = safeParse(cashExpense);
    const wthVal = safeParse(cashWithdraw);
    setClosingCashInput((openingVal + actCashVal - expVal - wthVal).toString());
  }, [summary.openingCash]);

  const handleInputChange = (
    value: string,
    setter: (val: string) => void
  ) => {
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setter(value);
    }
  };

  // Synchronized inputs handlers
  const handleActualCashChange = (val: string) => {
    if (val === "" || /^-?\d*\.?\d*$/.test(val)) {
      setActualCash(val);
      const actNum = safeParse(val);
      const newClosing = opening + actNum - expense - withdraw;
      setClosingCashInput(newClosing.toString());
    }
  };

  const handleExpenseChange = (val: string) => {
    if (val === "" || /^\d*\.?\d*$/.test(val)) {
      setCashExpense(val);
      const expNum = safeParse(val);
      const newClosing = opening + actCashNum - expNum - withdraw;
      setClosingCashInput(newClosing.toString());
    }
  };

  const handleWithdrawChange = (val: string) => {
    if (val === "" || /^\d*\.?\d*$/.test(val)) {
      setCashWithdraw(val);
      const wthNum = safeParse(val);
      const newClosing = opening + actCashNum - expense - wthNum;
      setClosingCashInput(newClosing.toString());
    }
  };

  const handleClosingCashChange = (val: string) => {
    if (val === "" || /^-?\d*\.?\d*$/.test(val)) {
      setClosingCashInput(val);
      if (val === "") {
        setActualCash("");
        return;
      }
      const closingNum = safeParse(val);
      const newActual = closingNum - opening + expense + withdraw;
      setActualCash(newActual.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    const parsedActualCash = parseFloat(actualCash || "0");
    const parsedActualUpi = parseFloat(actualUpi || "0");
    const parsedActualCard = parseFloat(actualCard || "0");
    const parsedCashExpense = parseFloat(cashExpense || "0");
    const parsedCashWithdraw = parseFloat(cashWithdraw || "0");

    if (parsedActualCash < 0) {
      setError("Actual Cash Received cannot be negative. Please adjust the Estimated Closing Balance or Cash Box Operations.");
      setIsSubmitting(false);
      return;
    }
    if (parsedActualUpi < 0) {
      setError("Actual UPI Received cannot be negative.");
      setIsSubmitting(false);
      return;
    }
    if (parsedActualCard < 0) {
      setError("Actual Card Received cannot be negative.");
      setIsSubmitting(false);
      return;
    }
    if (parsedCashExpense < 0) {
      setError("Cash Expense cannot be negative.");
      setIsSubmitting(false);
      return;
    }
    if (parsedCashWithdraw < 0) {
      setError("Cash Withdrawal / Remittance cannot be negative.");
      setIsSubmitting(false);
      return;
    }

    const payload = {
      settlementDate: date,
      actualCash: parsedActualCash,
      actualUpi: parsedActualUpi,
      actualCard: parsedActualCard,
      cashExpense: parsedCashExpense,
      cashWithdraw: parsedCashWithdraw,
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

      // Redirect after a brief success message display
      setTimeout(() => {
        router.push("/pos/settlement");
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
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Back Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/pos/settlement"
          className={buttonVariants({ variant: "ghost", size: "icon", className: "h-8 w-8 text-[var(--text-secondary)] hover:text-[var(--text-primary)]" })}
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
        </Link>
        <div>
          <h1 className="text-xl font-medium text-[var(--text-primary)]">
            {isEdit ? "Edit Settlement" : "New Settlement"}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {isEdit ? "Modify past daily settlement for " : "Perform end of day drawer reconciliation for "} {outletName}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-[var(--state-error-bg)] border border-[var(--state-error-border)] rounded-xl p-4 text-sm text-[var(--state-error-text)] flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {summary.exists && !isEdit && (
        <div className="bg-[var(--state-warning-bg)] border border-[var(--state-warning-border)] rounded-xl p-4 text-sm text-[var(--state-warning-text)] flex items-start gap-3 animate-in fade-in duration-300">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>
            A daily settlement for {date} already exists. You cannot create a duplicate settlement for this date.
          </span>
        </div>
      )}

      {success && (
        <div className="bg-[var(--state-success-bg)] border border-[var(--state-success-border)] rounded-xl p-4 text-sm text-[var(--state-success-text)] flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm rounded-xl">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-base font-medium text-[var(--text-primary)] mb-2 flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
                <Wallet className="h-5 w-5 text-[var(--text-secondary)]" strokeWidth={1.5} />
                Cash Drawer & Operations
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                {/* Row 1: Settlement Date */}
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="settlementDate" className="text-sm text-[var(--text-secondary)] font-medium">
                    Settlement Date
                  </Label>
                  <Input
                    id="settlementDate"
                    type="date"
                    value={date}
                    disabled={true}
                    onChange={(e) => setDate(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                    className="font-mono h-10 bg-[var(--bg-surface-raised)] border-[var(--border-default)] cursor-not-allowed"
                  />
                </div>

                {/* Separator */}
                <div className="sm:col-span-2 border-t border-[var(--border-subtle)] my-1" />

                {/* Row 2: Opening Cash Balance & Actual Cash Received */}
                <div className="space-y-2">
                  <Label className="text-sm text-[var(--text-secondary)] font-medium">
                    Opening Cash Balance
                  </Label>
                  <div className="h-10 px-3 flex items-center font-mono text-sm bg-[var(--bg-surface-raised)] border border-[var(--border-default)] rounded-md text-[var(--text-primary)]">
                    ₹ {formatINR(opening)}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="actualCash" className="text-sm text-[var(--text-primary)] font-medium">
                    Actual Cash Received (₹)
                  </Label>
                  <Input
                    id="actualCash"
                    type="text"
                    inputMode="decimal"
                    value={actualCash}
                    disabled={isSubmitting}
                    onChange={(e) => handleActualCashChange(e.target.value)}
                    className="font-mono text-sm h-10 bg-white border-[var(--border-default)]"
                    placeholder="0.00"
                  />
                  <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mt-1 px-1">
                    <span>Billed: <strong className="font-mono text-[var(--text-primary)]">₹{formatINR(parseFloat(summary.billedCash))}</strong></span>
                    <span>Diff: <span className={`${diffColorClass(cashDiff)} font-mono`}>{cashDiff !== 0 && diffSymbol(cashDiff)}₹{formatINR(cashDiff)}</span></span>
                  </div>
                </div>

                {/* Row 3: Actual UPI Received & Actual Card Received */}
                <div className="space-y-2">
                  <Label htmlFor="actualUpi" className="text-sm text-[var(--text-primary)] font-medium">
                    Actual UPI Received (₹)
                  </Label>
                  <Input
                    id="actualUpi"
                    type="text"
                    inputMode="decimal"
                    value={actualUpi}
                    disabled={isSubmitting}
                    onChange={(e) => handleInputChange(e.target.value, setActualUpi)}
                    className="font-mono text-sm h-10 bg-white border-[var(--border-default)]"
                    placeholder="0.00"
                  />
                  <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mt-1 px-1">
                    <span>Billed: <strong className="font-mono text-[var(--text-primary)]">₹{formatINR(parseFloat(summary.billedUpi))}</strong></span>
                    <span>Diff: <span className={`${diffColorClass(upiDiff)} font-mono`}>{upiDiff !== 0 && diffSymbol(upiDiff)}₹{formatINR(upiDiff)}</span></span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="actualCard" className="text-sm text-[var(--text-primary)] font-medium">
                    Actual Card Received (₹)
                  </Label>
                  <Input
                    id="actualCard"
                    type="text"
                    inputMode="decimal"
                    value={actualCard}
                    disabled={isSubmitting}
                    onChange={(e) => handleInputChange(e.target.value, setActualCard)}
                    className="font-mono text-sm h-10 bg-white border-[var(--border-default)]"
                    placeholder="0.00"
                  />
                  <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mt-1 px-1">
                    <span>Billed: <strong className="font-mono text-[var(--text-primary)]">₹{formatINR(parseFloat(summary.billedCard))}</strong></span>
                    <span>Diff: <span className={`${diffColorClass(cardDiff)} font-mono`}>{cardDiff !== 0 && diffSymbol(cardDiff)}₹{formatINR(cardDiff)}</span></span>
                  </div>
                </div>

                {/* Separator */}
                <div className="sm:col-span-2 border-t border-[var(--border-subtle)] my-1" />

                {/* Row 4: Cash Expense & Cash Withdrawal */}
                <div className="space-y-2">
                  <Label htmlFor="cashExpense" className="text-sm text-[var(--text-primary)] font-medium">
                    Cash Expense (₹)
                  </Label>
                  <Input
                    id="cashExpense"
                    type="text"
                    inputMode="decimal"
                    value={cashExpense}
                    disabled={isSubmitting}
                    onChange={(e) => handleExpenseChange(e.target.value)}
                    className="font-mono text-sm h-10 bg-white border-[var(--border-default)] text-[var(--state-error-text)]"
                    placeholder="0.00"
                  />
                  <p className="text-[11px] text-[var(--text-muted)] px-1">Log any cash expenditures paid directly from the drawer.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cashWithdraw" className="text-sm text-[var(--text-primary)] font-medium">
                    Cash Withdrawal / Remittance (₹)
                  </Label>
                  <Input
                    id="cashWithdraw"
                    type="text"
                    inputMode="decimal"
                    value={cashWithdraw}
                    disabled={isSubmitting}
                    onChange={(e) => handleWithdrawChange(e.target.value)}
                    className="font-mono text-sm h-10 bg-white border-[var(--border-default)] text-[var(--text-secondary)]"
                    placeholder="0.00"
                  />
                  <p className="text-[11px] text-[var(--text-muted)] px-1">Log any cash removed for deposit, remittance, or bank transfer.</p>
                </div>

                {/* Separator */}
                <div className="sm:col-span-2 border-t border-[var(--border-subtle)] my-1" />

                {/* Row 5: Estimated Closing Balance */}
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="closingCash" className="text-sm font-semibold text-[var(--text-primary)]">
                    Estimated Closing Balance (₹)
                  </Label>
                  <Input
                    id="closingCash"
                    type="text"
                    inputMode="decimal"
                    value={closingCashInput}
                    disabled={isSubmitting}
                    onChange={(e) => handleClosingCashChange(e.target.value)}
                    className="font-mono text-sm h-10 bg-white border-[var(--border-default)] font-bold text-lg"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={isSubmitting || isFetchingSummary || (summary.exists && !isEdit)}
              className="w-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white h-12 rounded-lg text-sm font-medium flex justify-center items-center gap-2"
            >
              <Save className="h-4 w-4" strokeWidth={1.5} />
              {isSubmitting
                ? "Saving Settlement..."
                : isEdit
                ? "Save Modified Settlement"
                : summary.exists
                ? "Settlement Already Exists"
                : "Save Settlement"}
            </Button>
          </div>
      </form>
    </div>
  );
}
