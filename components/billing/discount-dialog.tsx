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
      setDiscountValue(initialDiscountValue > 0 ? initialDiscountValue.toString() : "");
      setDiscountReason(initialDiscountReason || "");
      setError(null);
    }
  }, [
    isOpen,
    initialDiscountType,
    initialDiscountValue,
    initialDiscountReason,
  ]);

  const handleApply = () => {
    setError(null);
    const valueNum = parseFloat(discountValue);

    if (isNaN(valueNum) || valueNum <= 0) {
      setError("Please enter a valid discount amount/percentage.");
      return;
    }

    if (discountType === "percentage") {
      if (valueNum < 1 || valueNum > 100) {
        setError("Percentage discount must be between 1% and 100%.");
        return;
      }
    } else if (discountType === "fixed") {
      if (valueNum > subtotal) {
        setError(`Fixed discount amount cannot exceed the total core amount (₹${subtotal.toFixed(2)}).`);
        return;
      }
    }

    if (!discountReason.trim()) {
      setError("Please enter a reason for applying the discount.");
      return;
    }

    onConfirm(discountType, valueNum, discountReason.trim());
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
            Specify a percentage or fixed discount on the core amount (₹{subtotal.toFixed(2)}).
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
                  setDiscountType(val as "percentage" | "fixed");
                  setError(null);
                }}
              >
                <SelectTrigger id="discount-type" className="h-10 bg-[var(--bg-surface)]">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-[var(--bg-surface)] border-[var(--border-default)]">
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="discount-value" className="text-xs font-medium text-[var(--text-secondary)]">
                {discountType === "percentage" ? "Discount (%)" : "Amount (₹)"}
              </Label>
              <Input
                id="discount-value"
                type="number"
                min="1"
                step="any"
                placeholder={discountType === "percentage" ? "e.g. 10" : "e.g. 150"}
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
