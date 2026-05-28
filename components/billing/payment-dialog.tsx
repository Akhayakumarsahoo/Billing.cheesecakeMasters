"use client";

import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Banknote, Smartphone, CreditCard, Receipt, SplitSquareHorizontal } from "lucide-react";

const paymentModes = [
  { id: "cash", name: "Cash", icon: Banknote },
  { id: "upi", name: "UPI", icon: Smartphone },
  { id: "card", name: "Card", icon: CreditCard },
  { id: "other", name: "Other", icon: Receipt },
  { id: "part_payment", name: "Part Payment", icon: SplitSquareHorizontal },
];

const standardModes = paymentModes.filter(m => m.id !== "part_payment");

export function PaymentDialog({
  isOpen,
  onClose,
  grandTotal,
  onConfirm,
  isProcessing,
}: {
  isOpen: boolean;
  onClose: () => void;
  grandTotal: number;
  onConfirm: (payments: { mode: string; amount: number }[]) => void;
  isProcessing: boolean;
}) {
  const [selectedMode, setSelectedMode] = useState("cash");
  
  // For single mode, amount is always grandTotal

  // For part payment
  const [splitAmounts, setSplitAmounts] = useState<Record<string, string>>({
    cash: "",
    upi: "",
    card: "",
    other: "",
  });

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setSplitAmounts({ cash: "", upi: "", card: "", other: "" });
    }
  }, [isOpen, grandTotal]);

  const handleSplitChange = (mode: string, value: string) => {
    setSplitAmounts(prev => ({ ...prev, [mode]: value }));
  };

  const splitTotal = useMemo(() => {
    return Object.values(splitAmounts).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
  }, [splitAmounts]);

  const handleConfirm = () => {
    if (selectedMode === "part_payment") {
      const splitTotalCents = Math.round(splitTotal * 100);
      const grandTotalCents = Math.round(grandTotal * 100);
      if (splitTotalCents < grandTotalCents) return;
      
      const payments: { mode: string; amount: number }[] = [];
      let remainingCents = grandTotalCents;

      // Prioritize non-cash for exact amounts, cash handles the rest/change
      const nonCashModes = ["upi", "card", "other"];
      
      for (const mode of nonCashModes) {
        const valCents = Math.round((parseFloat(splitAmounts[mode]) || 0) * 100);
        if (valCents > 0) {
          const allocatedCents = Math.min(valCents, remainingCents);
          if (allocatedCents > 0) {
            payments.push({ mode, amount: allocatedCents / 100 });
            remainingCents -= allocatedCents;
          }
        }
      }

      // Cash takes the rest if available
      const cashValCents = Math.round((parseFloat(splitAmounts["cash"]) || 0) * 100);
      if (cashValCents > 0 && remainingCents > 0) {
        const allocatedCents = Math.min(cashValCents, remainingCents);
        if (allocatedCents > 0) {
          payments.push({ mode: "cash", amount: allocatedCents / 100 });
          remainingCents -= allocatedCents;
        }
      }

      onConfirm(payments);

    } else {
      // Single mode
      onConfirm([{ mode: selectedMode, amount: grandTotal }]);
    }
  };

  const isPartPayment = selectedMode === "part_payment";
  
  // Validation for button using rounded cents to bypass float precision limits and allow paying in excess (with change return)
  const isValid = isPartPayment 
    ? Math.round(splitTotal * 100) >= Math.round(grandTotal * 100)
    : true;

  const Content = (
    <div className="space-y-6 pt-4">
      <div>
        <div className="text-sm font-medium text-[var(--text-secondary)] mb-1">Amount to Pay</div>
        <div className="text-3xl font-mono font-medium text-[var(--text-primary)]">
          ₹{grandTotal.toFixed(2)}
        </div>
      </div>

      <div className="space-y-3">
        <Label>Payment Method</Label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {paymentModes.map((mode) => {
            const Icon = mode.icon;
            const isSelected = selectedMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setSelectedMode(mode.id)}
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors ${
                  isSelected 
                    ? "border-[var(--accent-primary)] bg-[var(--bg-surface-raised)] text-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)]" 
                    : "border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={1.5} />
                <span>{mode.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {isPartPayment ? (
        <div className="space-y-4 pt-2 border-t border-[var(--border-default)]">
          <Label>Split Amounts</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {standardModes.map(mode => (
              <div key={mode.id} className="space-y-1.5">
                <Label className="text-xs text-[var(--text-secondary)]">{mode.name}</Label>
                <Input 
                  type="number" 
                  placeholder="0.00"
                  value={splitAmounts[mode.id]}
                  onChange={(e) => handleSplitChange(mode.id, e.target.value)}
                  className="font-mono"
                />
              </div>
            ))}
          </div>

          <div className="bg-[var(--bg-surface-raised)] p-3 rounded-lg border border-[var(--border-default)] space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Total Entered:</span>
              <span className="font-mono font-medium">₹{splitTotal.toFixed(2)}</span>
            </div>
            
            {splitTotal < grandTotal && (
              <div className="flex justify-between text-sm text-[var(--state-warning-text)]">
                <span>Remaining:</span>
                <span className="font-mono font-medium">₹{(grandTotal - splitTotal).toFixed(2)}</span>
              </div>
            )}
            
            {splitTotal > grandTotal && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">Change to return:</span>
                <span className="font-mono text-[var(--state-success-text)] font-medium">
                  ₹{(splitTotal - grandTotal).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] bg-[var(--bg-surface)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete Payment</DialogTitle>
          <DialogDescription className="hidden">Complete payment for the current bill.</DialogDescription>
        </DialogHeader>
        {Content}
        <DialogFooter className="mt-6 pt-4 border-t border-[var(--border-default)]">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={isProcessing}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={isProcessing || !isValid}
            className="w-full sm:w-auto bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)]"
          >
            {isProcessing ? "Processing..." : "Confirm Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
