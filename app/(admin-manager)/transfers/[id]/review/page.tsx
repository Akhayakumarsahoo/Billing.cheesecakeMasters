"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Package,
  ArrowRight,
  FileText,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface TransferDetail {
  id: string;
  fromInventoryId: string;
  fromInventoryName: string;
  toInventoryId: string;
  toInventoryName: string;
  status: string;
  subtotal: string;
  totalGst: string;
  otherCharges: string;
  otherChargesGst: string;
  grandTotal: string;
  notes?: string | null;
  createdAt: string;
  sentAt?: string | null;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
  cancelledAt?: string | null;
  lines: Array<{
    id: string;
    rawMaterialId: string;
    materialName: string;
    unit: string;
    quantity: string;
    unitPrice: string;
    gstRate: string;
    lineBaseTotal: string;
    lineGstAmount: string;
    lineTotal: string;
  }>;
}

export default function ReviewTransferPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [transfer, setTransfer] = useState<TransferDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTransfer();
  }, [id]);

  const fetchTransfer = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/transfers/${id}`);
      if (!res.ok) throw new Error("Failed to fetch transfer details");
      const body = await res.json();
      setTransfer(body.data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load transfer details");
    } finally {
      setLoading(false);
    }
  };

  const handleRespondTransfer = async (status: "accepted" | "rejected") => {
    if (!transfer) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/transfers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message || `Failed to ${status} transfer`);
      }

      toast.success(
        status === "accepted"
          ? "Stock transfer accepted! Items have been added to inventory."
          : "Stock transfer rejected."
      );

      // Redirect back to destination inventory or previous page
      if (transfer.toInventoryId) {
        router.push(`/inventory/${transfer.toInventoryId}`);
      } else {
        router.back();
      }
    } catch (err: any) {
      toast.error(err.message || `Failed to ${status} transfer`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div>
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!transfer) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center space-y-4 py-16">
        <AlertCircle className="h-12 w-12 text-amber-500 mx-auto" />
        <h2 className="text-lg font-bold text-[var(--text-primary)]">Transfer Not Found</h2>
        <p className="text-xs text-[var(--text-secondary)]">The requested stock transfer could not be found or you do not have permission to view it.</p>
        <Button onClick={() => router.back()} variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Go Back
        </Button>
      </div>
    );
  }

  const isPending = transfer.status === "pending";
  const isAccepted = transfer.status === "accepted";
  const isRejected = transfer.status === "rejected";
  const isCancelled = transfer.status === "cancelled";

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-default)]">
        <div className="space-y-1">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-1 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Inventory
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
              Review Inbound Stock Transfer
            </h1>
            {isPending && (
              <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Pending Review
              </Badge>
            )}
            {isAccepted && (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Accepted
              </Badge>
            )}
            {isRejected && (
              <Badge className="bg-red-100 text-red-800 border-red-300 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800 flex items-center gap-1">
                <XCircle className="h-3 w-3" /> Rejected
              </Badge>
            )}
            {isCancelled && (
              <Badge className="bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-900 dark:text-slate-400 border-slate-700">
                Cancelled
              </Badge>
            )}
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Verify details sent from <span className="font-semibold text-[var(--text-primary)]">{transfer.fromInventoryName}</span> before accepting into stock.
          </p>
        </div>

        {/* Top Quick Actions for Mobile / Responsive */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="h-9 px-3 text-xs cursor-pointer"
          >
            Cancel
          </Button>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Details & Items Table) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Transfer Info Card */}
          <Card className="bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-xs rounded-xl">
            <CardHeader className="pb-3 border-b border-[var(--border-default)]">
              <CardTitle className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <Package className="h-4 w-4 text-[var(--accent-primary)]" />
                Transfer Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-[var(--bg-surface-raised)] border border-[var(--border-default)]">
                  <span className="text-[var(--text-secondary)] font-medium block">From (Source)</span>
                  <p className="font-semibold text-sm text-[var(--text-primary)] mt-1">{transfer.fromInventoryName}</p>
                </div>
                <div className="p-3 rounded-lg bg-[var(--bg-surface-raised)] border border-[var(--border-default)]">
                  <span className="text-[var(--text-secondary)] font-medium block">To (Destination)</span>
                  <p className="font-semibold text-sm text-[var(--text-primary)] mt-1">{transfer.toInventoryName}</p>
                </div>
                <div className="p-3 rounded-lg bg-[var(--bg-surface-raised)] border border-[var(--border-default)]">
                  <span className="text-[var(--text-secondary)] font-medium block">Transfer Created</span>
                  <p className="font-semibold text-xs text-[var(--text-primary)] mt-1">
                    {transfer.createdAt
                      ? new Date(transfer.createdAt).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "N/A"}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-[var(--bg-surface-raised)] border border-[var(--border-default)]">
                  <span className="text-[var(--text-secondary)] font-medium block">Transfer Sent</span>
                  <p className="font-semibold text-xs text-[var(--text-primary)] mt-1">
                    {transfer.sentAt
                      ? new Date(transfer.sentAt).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "N/A"}
                  </p>
                </div>
              </div>

              {/* Notes */}
              <div>
                <span className="text-xs text-[var(--text-secondary)] font-medium block mb-1">Notes / Instructions</span>
                <div className="p-3 rounded-lg bg-[var(--bg-surface-raised)] border border-[var(--border-default)] text-xs text-[var(--text-secondary)] min-h-[44px]">
                  {transfer.notes || "No notes logged for this transfer"}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transfer Line Items Table */}
          <Card className="bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-xs rounded-xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-[var(--border-default)]">
              <CardTitle className="text-sm font-semibold text-[var(--text-primary)] flex items-center justify-between">
                <span>Transferred Line Items ({transfer.lines.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table className="w-full text-xs">
                <TableHeader className="bg-[var(--bg-surface-raised)] border-b border-[var(--border-default)]">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-semibold py-3 pl-4">Item Name</TableHead>
                    <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-semibold py-3 text-center">Unit</TableHead>
                    <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-semibold text-right py-3">Quantity</TableHead>
                    <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-semibold text-right py-3">Unit Price</TableHead>
                    <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-semibold text-right py-3 pr-4">Total Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfer.lines.map((line) => (
                    <TableRow key={line.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]">
                      <TableCell className="text-xs font-semibold text-[var(--text-primary)] py-3 pl-4">
                        {line.materialName}
                      </TableCell>
                      <TableCell className="text-xs text-[var(--text-secondary)] text-center py-3">
                        {line.unit}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono font-medium py-3">
                        {Number(line.quantity).toFixed(3)}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono text-[var(--text-secondary)] py-3">
                        ₹{Number(line.unitPrice).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono font-semibold text-[var(--text-primary)] py-3 pr-4">
                        ₹{Number(line.lineTotal).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (Summary & Action Card) */}
        <div className="space-y-6">
          {/* Action Card */}
          <Card className="bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-xs rounded-xl">
            <CardHeader className="pb-3 border-b border-[var(--border-default)]">
              <CardTitle className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <FileText className="h-4 w-4 text-[var(--accent-primary)]" />
                Transfer Decision
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {isPending && (
                <>
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300">
                    <p className="font-semibold mb-0.5">Action Required</p>
                    Reviewing items will immediately add them to your inventory stock upon acceptance.
                  </div>

                  <div className="space-y-2.5 pt-2">
                    <Button
                      onClick={() => handleRespondTransfer("accepted")}
                      disabled={isSubmitting}
                      className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {isSubmitting ? "Processing..." : "Accept & Add to Stock"}
                    </Button>

                    <Button
                      onClick={() => handleRespondTransfer("rejected")}
                      disabled={isSubmitting}
                      variant="outline"
                      className="w-full h-11 border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 font-semibold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject Transfer
                    </Button>
                  </div>
                </>
              )}

              {isAccepted && (
                <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>Transfer Accepted</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 pl-5">
                    Items were added to stock on{" "}
                    {transfer.acceptedAt
                      ? new Date(transfer.acceptedAt).toLocaleString("en-IN")
                      : "N/A"}
                  </p>
                </div>
              )}

              {isRejected && (
                <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-xs text-red-800 dark:text-red-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <XCircle className="h-4 w-4 shrink-0 text-red-600" />
                    <span>Transfer Rejected</span>
                  </div>
                  <p className="text-[11px] text-red-700 dark:text-red-400 pl-5">
                    This transfer was rejected on{" "}
                    {transfer.rejectedAt
                      ? new Date(transfer.rejectedAt).toLocaleString("en-IN")
                      : "N/A"}
                  </p>
                </div>
              )}

              {isCancelled && (
                <div className="p-3.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-400 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertCircle className="h-4 w-4 shrink-0 text-slate-500" />
                    <span>Transfer Cancelled</span>
                  </div>
                  <p className="text-[11px] pl-5">
                    This transfer was cancelled by the sender.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Financial Breakdown Card */}
          <Card className="bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-xs rounded-xl">
            <CardHeader className="pb-3 border-b border-[var(--border-default)]">
              <CardTitle className="text-sm font-semibold text-[var(--text-primary)]">
                Financial Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div className="flex justify-between text-[var(--text-secondary)] font-medium">
                <span>Subtotal</span>
                <span className="font-mono font-semibold text-[var(--text-primary)]">₹{Number(transfer.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[var(--text-secondary)] font-medium">
                <span>Total GST</span>
                <span className="font-mono font-semibold text-[var(--text-primary)]">₹{Number(transfer.totalGst).toFixed(2)}</span>
              </div>
              {(Number(transfer.otherCharges) > 0 || Number(transfer.otherChargesGst) > 0) && (
                <div className="flex justify-between text-[var(--text-secondary)] font-medium">
                  <span>Other Charges (incl. GST)</span>
                  <span className="font-mono font-semibold text-[var(--text-primary)]">
                    ₹{(Number(transfer.otherCharges) + Number(transfer.otherChargesGst)).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="border-t border-[var(--border-default)] pt-3 flex justify-between text-[var(--text-primary)] font-bold text-sm">
                <span>Grand Total</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 text-base">
                  ₹{Number(transfer.grandTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
