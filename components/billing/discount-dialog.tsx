"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface DiscountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  subtotal: number;
  originalTotalWithTax: number;
  initialDiscountType: "percentage" | "fixed" | null;
  initialDiscountValue: number;
  initialDiscountReason: string;
  onConfirm: (
    discountType: "percentage" | "fixed" | null,
    discountValue: number,
    discountReason: string
  ) => void;
}

export function DiscountDialog({
  isOpen,
  onClose,
  subtotal,
  originalTotalWithTax,
  initialDiscountType,
  initialDiscountValue,
  initialDiscountReason,
  onConfirm,
}: DiscountDialogProps) {
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [discountReason, setDiscountReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Set initial states when dialog opens
  useEffect(() => {
    if (isOpen) {
      setDiscountType(initialDiscountType || "percentage");
      setDiscountReason(initialDiscountReason || "");
      setError(null);

      if (initialDiscountType === "percentage") {
        setDiscountValue(initialDiscountValue > 0 ? initialDiscountValue.toString() : "");
      } else if (initialDiscountType === "fixed") {
        // If it's already a fixed discount, the entered grand total is originalTotalWithTax * (1 - initialDiscountValue / subtotal)
        const discRatio = subtotal > 0 ? initialDiscountValue / subtotal : 0;
        const targetGrandTotal = originalTotalWithTax * (1 - discRatio);
        setDiscountValue(Math.max(0, Math.round(targetGrandTotal)).toString());
      } else {
        setDiscountValue("");
      }
    }
  }, [
    isOpen,
    initialDiscountType,
    initialDiscountValue,
    initialDiscountReason,
    originalTotalWithTax,
    subtotal,
  ]);

  const handleApply = () => {
    setError(null);
    const valueNum = parseFloat(discountValue);

    if (isNaN(valueNum) || valueNum < 0) {
      setError(discountType === "percentage"
        ? "Please enter a valid discount percentage."
        : "Please enter a valid fixed price."
      );
      return;
    }

    let calculatedDiscountValue = valueNum;

    if (discountType === "percentage") {
      if (valueNum < 1 || valueNum > 100) {
        setError("Percentage discount must be between 1% and 100%.");
        return;
      }
    } else if (discountType === "fixed") {
      // valueNum is the entered target total with tax (Fixed Price)
      const maxTotal = Math.round(originalTotalWithTax);
      if (valueNum > maxTotal) {
        setError(`Fixed price cannot exceed the original total with tax (₹${maxTotal}).`);
        return;
      }

      // Back calculate the discount amount:
      // discount amount = original sub total - entered subtotal
      // entered subtotal = original subtotal * (entered total with tax / original total with tax)
      if (originalTotalWithTax > 0) {
        const enteredSubtotal = subtotal * (valueNum / originalTotalWithTax);
        calculatedDiscountValue = Math.max(0, subtotal - enteredSubtotal);
      } else {
        calculatedDiscountValue = 0;
      }
    }

    if (!discountReason.trim()) {
      setError("Please enter a reason for applying the discount.");
      return;
    }

    onConfirm(discountType, calculatedDiscountValue, discountReason.trim());
    onClose();
  };

  const handleRemove = () => {
    onConfirm(null, 0, "");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)]">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium text-[var(--text-primary)]">
            Apply Discount
          </DialogTitle>
          <DialogDescription className="text-xs text-[var(--text-secondary)]">
            {discountType === "percentage"
              ? `Specify a percentage discount on the core amount (₹${subtotal.toFixed(2)}).`
              : `Specify a target total bill amount with tax (original total: ₹${Math.round(originalTotalWithTax)}).`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <div className="p-3 text-xs bg-[var(--state-error-bg)] text-[var(--state-error-text)] border border-[var(--state-error-border)] rounded-md">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="discount-type" className="text-xs font-medium text-[var(--text-secondary)]">
                Discount Type
              </Label>
              <Select
                value={discountType}
                onValueChange={(val) => {
                  const prevType = discountType;
                  const newType = val as "percentage" | "fixed";
                  setDiscountType(newType);
                  setError(null);

                  const currentValNum = parseFloat(discountValue);
                  if (newType === "fixed" && prevType === "percentage") {
                    if (!isNaN(currentValNum) && currentValNum >= 0 && currentValNum <= 100) {
                      const targetGrandTotal = originalTotalWithTax * (1 - currentValNum / 100);
                      setDiscountValue(Math.max(0, Math.round(targetGrandTotal)).toString());
                    } else {
                      setDiscountValue(Math.max(0, Math.round(originalTotalWithTax)).toString());
                    }
                  } else if (newType === "percentage" && prevType === "fixed") {
                    if (!isNaN(currentValNum) && currentValNum >= 0 && originalTotalWithTax > 0) {
                      const pct = (1 - currentValNum / originalTotalWithTax) * 100;
                      if (pct >= 0 && pct <= 100) {
                        setDiscountValue(Math.max(0, Math.min(100, Number(pct.toFixed(2)))).toString());
                      } else {
                        setDiscountValue("");
                      }
                    } else {
                      setDiscountValue("");
                    }
                  }
                }}
              >
                <SelectTrigger id="discount-type" className="h-10 bg-[var(--bg-surface)]">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-[var(--bg-surface)] border-[var(--border-default)]">
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed">Fixed Price</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="discount-value" className="text-xs font-medium text-[var(--text-secondary)]">
                {discountType === "percentage" ? "Discount (%)" : "Fixed Price (₹)"}
              </Label>
              <Input
                id="discount-value"
                type="number"
                min="0"
                step="any"
                placeholder={discountType === "percentage" ? "e.g. 10" : `e.g. ${Math.round(originalTotalWithTax)}`}
                value={discountValue}
                onChange={(e) => {
                  setDiscountValue(e.target.value);
                  setError(null);
                }}
                className="h-10 bg-[var(--bg-surface)] font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="discount-reason" className="text-xs font-medium text-[var(--text-secondary)]">
              Reason for Discount
            </Label>
            <Input
              id="discount-reason"
              placeholder="e.g. Customer loyalty, item damage, special campaign"
              value={discountReason}
              onChange={(e) => {
                setDiscountReason(e.target.value);
                setError(null);
              }}
              className="h-10 bg-[var(--bg-surface)]"
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          {initialDiscountType && (
            <Button
              type="button"
              variant="outline"
              onClick={handleRemove}
              className="text-[var(--state-error-text)] border-[var(--state-error-border)] hover:bg-[var(--state-error-bg)] sm:mr-auto"
            >
              Remove Discount
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="text-[var(--text-secondary)]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white"
          >
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
