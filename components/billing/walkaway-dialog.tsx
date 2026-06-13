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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

const PREDEFINED_REASONS = [
  "Price too high",
  "Desired item/flavor out of stock",
  "Long waiting time",
  "Bad customer service",
  "Just exploring/browsing",
  "Other",
];

interface WalkawayDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, customReason?: string) => Promise<void>;
}

export function WalkawayDialog({
  isOpen,
  onClose,
  onConfirm,
}: WalkawayDialogProps) {
  const [selectedReason, setSelectedReason] = useState<string>("Price too high");
  const [customReason, setCustomReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedReason("Price too high");
      setCustomReason("");
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSave = async () => {
    setError(null);

    if (selectedReason === "Other" && !customReason.trim()) {
      setError("Please specify the custom reason.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(selectedReason, selectedReason === "Other" ? customReason.trim() : undefined);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to log walkaway");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="max-w-md bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)]">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium text-[var(--text-primary)]">
            Log Customer Walkaway
          </DialogTitle>
          <DialogDescription className="text-xs text-[var(--text-secondary)]">
            Record the reason why the customer left without purchasing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <div className="p-3 text-xs bg-[var(--state-error-bg)] text-[var(--state-error-text)] border border-[var(--state-error-border)] rounded-md">
              {error}
            </div>
          )}

          <RadioGroup
            value={selectedReason}
            onValueChange={(val: string) => {
              setSelectedReason(val);
              setError(null);
            }}
            className="space-y-2"
          >
            {PREDEFINED_REASONS.map((reason) => (
              <div key={reason} className="flex items-center space-x-2">
                <RadioGroupItem value={reason} id={`reason-${reason}`} className="border-border-strong text-accent-primary" />
                <Label
                  htmlFor={`reason-${reason}`}
                  className="text-sm font-medium text-[var(--text-primary)] cursor-pointer select-none"
                >
                  {reason}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {selectedReason === "Other" && (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
              <Label htmlFor="custom-reason" className="text-xs font-medium text-[var(--text-secondary)]">
                Custom Reason Details
              </Label>
              <Textarea
                id="custom-reason"
                placeholder="Please describe why the customer did not purchase..."
                value={customReason}
                onChange={(e) => {
                  setCustomReason(e.target.value);
                  setError(null);
                }}
                className="bg-[var(--bg-surface)] border-[var(--border-default)] focus-visible:ring-1 focus-visible:ring-ring resize-none h-20"
                maxLength={500}
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="text-[var(--text-secondary)]"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white"
          >
            {isSubmitting ? "Saving..." : "Save Walkaway"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
