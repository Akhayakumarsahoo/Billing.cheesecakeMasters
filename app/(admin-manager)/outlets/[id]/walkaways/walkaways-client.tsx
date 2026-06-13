"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { ArrowLeft, Edit2, Trash2, Search, Footprints, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { DateRangeFilter } from "@/components/date-range-filter";
import { TableSkeleton } from "@/components/ui-skeletons";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PREDEFINED_REASONS = [
  "Price too high",
  "Desired item/flavor out of stock",
  "Long waiting time",
  "Bad customer service",
  "Just exploring/browsing",
  "Other",
];

interface WalkawayItem {
  id: string;
  outletId: string;
  reason: string;
  customReason: string | null;
  createdAt: string;
  createdByEmail: string | null;
}

interface WalkawaysClientProps {
  initialWalkaways: WalkawayItem[];
  outletName: string;
  outletId: string;
  fromDate: string;
  toDate: string;
}

export function WalkawaysClient({
  initialWalkaways,
  outletName,
  outletId,
  fromDate,
  toDate,
}: WalkawaysClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [walkaways, setWalkaways] = useState<WalkawayItem[]>(initialWalkaways);
  const [search, setSearch] = useState("");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Edit State
  const [editingWalkaway, setEditingWalkaway] = useState<WalkawayItem | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [customReason, setCustomReason] = useState<string>("");
  const [editError, setEditError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setWalkaways(initialWalkaways);
  }, [initialWalkaways]);

  const urlFrom = searchParams.get("from") || fromDate;
  const urlTo = searchParams.get("to") || toDate;
  const isTransitioning = urlFrom !== fromDate || urlTo !== toDate;

  const formatDateTime = (dateStr: string) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: true,
    }).format(new Date(dateStr));
  };

  const startEdit = (w: WalkawayItem) => {
    setEditingWalkaway(w);
    setSelectedReason(w.reason);
    setCustomReason(w.customReason || "");
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingWalkaway) return;
    setEditError(null);

    if (selectedReason === "Other" && !customReason.trim()) {
      setEditError("Please specify the custom reason details.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/walkaways/${editingWalkaway.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: selectedReason,
          customReason: selectedReason === "Other" ? customReason.trim() : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || "Failed to update walkaway");
      }

      const updated = await res.json();
      toast.success("Walkaway log updated successfully");

      setWalkaways((prev) =>
        prev.map((w) => (w.id === editingWalkaway.id ? { ...w, ...updated.data } : w))
      );
      setEditingWalkaway(null);
      router.refresh();
    } catch (err: any) {
      setEditError(err.message || "Something went wrong while saving");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this walkaway log? This action cannot be undone.")) {
      return;
    }

    setIsProcessing(id);
    try {
      const res = await fetch(`/api/walkaways/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || "Failed to delete walkaway");
      }

      toast.success("Walkaway log deleted successfully");
      setWalkaways((prev) => prev.filter((w) => w.id !== id));
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete walkaway log");
    } finally {
      setIsProcessing(null);
    }
  };

  const filteredWalkaways = walkaways.filter((w) => {
    const term = search.toLowerCase();
    const reasonMatch = w.reason.toLowerCase().includes(term);
    const customReasonMatch = w.customReason?.toLowerCase().includes(term) || false;
    const emailMatch = w.createdByEmail?.toLowerCase().includes(term) || false;
    return reasonMatch || customReasonMatch || emailMatch;
  });

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <Button
          variant="ghost"
          className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] pl-0 w-fit h-auto py-1"
          onClick={() => router.push(`/outlets/${outletId}/orders`)}
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          <span>Back to Orders</span>
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
          <div>
            <h1 className="text-xl font-medium text-[var(--text-primary)]">Walkaway Logs</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Walkaway records for {outletName}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
              <Input
                placeholder="Search cashier or reason..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 rounded-lg bg-[var(--bg-surface)] border-[var(--border-default)]"
              />
            </div>
            <DateRangeFilter />
          </div>
        </div>
      </div>

      {isTransitioning ? (
        <TableSkeleton rows={5} cols={5} />
      ) : (
        <Card className="bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm rounded-xl">
          <CardHeader className="p-6 pb-4">
            <CardTitle className="text-lg font-medium text-[var(--text-primary)]">Logged Walkaways</CardTitle>
            <CardDescription className="text-sm text-[var(--text-secondary)]">
              Customer walkaways recorded in the selected date range.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[var(--border-default)] hover:bg-transparent">
                  <TableHead className="font-medium text-[var(--text-secondary)] w-[200px]">
                    Date & Time
                  </TableHead>
                  <TableHead className="font-medium text-[var(--text-secondary)]">
                    Reason
                  </TableHead>
                  <TableHead className="font-medium text-[var(--text-secondary)]">
                    Custom Details
                  </TableHead>
                  <TableHead className="font-medium text-[var(--text-secondary)]">
                    Logged By
                  </TableHead>
                  <TableHead className="font-medium text-[var(--text-secondary)] text-right w-[120px]">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWalkaways.map((w, index) => (
                  <TableRow
                    key={w.id}
                    className={
                      index % 2 === 1 ? "bg-[var(--bg-surface-raised)]" : "bg-[var(--bg-surface)]"
                    }
                  >
                    <TableCell className="font-mono text-xs text-[var(--text-primary)]">
                      {formatDateTime(w.createdAt)}
                    </TableCell>
                    <TableCell className="text-[var(--text-primary)] font-medium text-sm">
                      {w.reason}
                    </TableCell>
                    <TableCell className="text-sm text-[var(--text-secondary)] max-w-[240px] truncate" title={w.customReason || ""}>
                      {w.customReason || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-[var(--text-secondary)]">
                      {w.createdByEmail || "System"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-[var(--text-secondary)] border-[var(--border-default)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                          onClick={() => startEdit(w)}
                          disabled={isProcessing !== null}
                          title="Edit Log"
                        >
                          <Edit2 className="h-4 w-4" strokeWidth={1.5} />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-[var(--state-error-text)] border-[var(--state-error-border)] hover:bg-[var(--state-error-bg)] hover:text-[var(--state-error-text)]"
                          onClick={() => handleDelete(w.id)}
                          disabled={isProcessing !== null}
                          title="Delete Log"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {filteredWalkaways.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-[var(--text-muted)]">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Footprints className="h-8 w-8 opacity-45" strokeWidth={1.5} />
                        <p className="text-sm">No walkaway logs found.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {editingWalkaway && (
        <Dialog open={!!editingWalkaway} onOpenChange={(open) => !open && !isSaving && setEditingWalkaway(null)}>
          <DialogContent className="max-w-md bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)]">
            <DialogHeader>
              <DialogTitle className="text-lg font-medium text-[var(--text-primary)]">
                Edit Walkaway Reason
              </DialogTitle>
              <DialogDescription className="text-xs text-[var(--text-secondary)]">
                Update why the customer walked away from this sale.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {editError && (
                <div className="p-3 text-xs bg-[var(--state-error-bg)] text-[var(--state-error-text)] border border-[var(--state-error-border)] rounded-md flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
                  <span>{editError}</span>
                </div>
              )}

              <RadioGroup
                value={selectedReason}
                onValueChange={(val: string) => {
                  setSelectedReason(val);
                  setEditError(null);
                }}
                className="space-y-2"
              >
                {PREDEFINED_REASONS.map((reason) => (
                  <div key={reason} className="flex items-center space-x-2">
                    <RadioGroupItem
                      value={reason}
                      id={`edit-reason-${reason}`}
                      className="border-[var(--border-strong)] text-[var(--accent-primary)]"
                    />
                    <Label
                      htmlFor={`edit-reason-${reason}`}
                      className="text-sm font-medium text-[var(--text-primary)] cursor-pointer select-none"
                    >
                      {reason}
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              {selectedReason === "Other" && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                  <Label htmlFor="edit-custom-reason" className="text-xs font-medium text-[var(--text-secondary)]">
                    Custom Reason Details
                  </Label>
                  <Textarea
                    id="edit-custom-reason"
                    placeholder="Please specify why the customer did not purchase..."
                    value={customReason}
                    onChange={(e) => {
                      setCustomReason(e.target.value);
                      setEditError(null);
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
                onClick={() => setEditingWalkaway(null)}
                className="text-[var(--text-secondary)]"
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
