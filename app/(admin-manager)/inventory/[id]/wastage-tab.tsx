"use client";

import React, { useState, useEffect } from "react";
import { Plus, Search, X, AlertTriangle, Eye, Ban, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  currentStock: string;
  isActive: boolean;
}

interface WastageLine {
  rawMaterialId: string;
  materialName: string;
  unit: string;
  quantity: number;
  availableStock: number;
}

interface WastageRecord {
  id: string;
  wastageDate: string;
  status: "draft" | "confirmed" | "cancelled";
  reason: string | null;
  notes: string | null;
  creatorName: string;
  itemsCount: number;
  createdAt: string;
}

interface WastageTabProps {
  inventoryId: string;
  userRole: string;
}

export function WastageTab({ inventoryId, userRole }: WastageTabProps) {
  const [records, setRecords] = useState<WastageRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Views: "list" | "create" | "view"
  const [view, setView] = useState<"list" | "create" | "view">("list");
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  // Lists
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);

  // Form State
  const [wastageDate, setWastageDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<WastageLine[]>([]);

  // Search inside form
  const [materialSearch, setMaterialSearch] = useState("");
  const [showMaterialDropdown, setShowMaterialDropdown] = useState(false);

  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"draft" | "confirmed">("draft");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchRecords();
    fetchRawMaterials();
  }, [inventoryId]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/wastage?inventoryId=${inventoryId}`);
      if (!res.ok) throw new Error("Failed to load wastage records");
      const body = await res.json();
      setRecords(body.data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load wastage records.");
    } finally {
      setLoading(false);
    }
  };

  const fetchRawMaterials = async () => {
    try {
      const res = await fetch(`/api/raw-materials?inventoryId=${inventoryId}`);
      if (res.ok) {
        const body = await res.json();
        setRawMaterials((body.data as RawMaterial[]).filter(m => m.isActive));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMaterial = (m: RawMaterial) => {
    if (lines.some(l => l.rawMaterialId === m.id)) {
      toast.info(`${m.name} is already in the list.`);
      setShowMaterialDropdown(false);
      setMaterialSearch("");
      return;
    }

    const newLine: WastageLine = {
      rawMaterialId: m.id,
      materialName: m.name,
      unit: m.unit,
      quantity: 1,
      availableStock: Number(m.currentStock)
    };

    setLines(prev => [...prev, newLine]);
    setShowMaterialDropdown(false);
    setMaterialSearch("");
  };

  const handleRemoveLine = (idx: number) => {
    setLines(prev => prev.filter((_, i) => i !== idx));
  };

  const handleQuantityChange = (idx: number, val: number) => {
    setLines(prev => prev.map((line, i) => {
      if (i !== idx) return line;
      const quantity = val < 0 ? 0 : val;
      return { ...line, quantity };
    }));
  };

  // Form submit
  const handleOpenConfirm = (status: "draft" | "confirmed") => {
    if (!wastageDate) {
      toast.error("Please select a wastage date.");
      return;
    }
    if (lines.length === 0) {
      toast.error("Please add at least one line item.");
      return;
    }

    // Check stock validation before confirming
    if (status === "confirmed") {
      const hasShortage = lines.some(l => l.quantity > l.availableStock);
      if (hasShortage) {
        toast.error("One or more items exceed available stock levels.");
        return;
      }
      setSubmitStatus(status);
      setIsConfirmDialogOpen(true);
    } else {
      submitForm(status);
    }
  };

  const submitForm = async (status: "draft" | "confirmed") => {
    setIsSubmitting(true);
    try {
      const payload = {
        inventoryId,
        wastageDate,
        reason: reason.trim() || null,
        notes: notes.trim() || null,
        lines: lines.map(l => ({
          rawMaterialId: l.rawMaterialId,
          quantity: l.quantity
        })),
        status
      };

      const res = await fetch("/api/wastage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to create wastage log");

      toast.success(status === "confirmed" ? "Wastage record confirmed and stock deducted." : "Wastage draft saved.");
      setIsConfirmDialogOpen(false);
      setView("list");
      // Reset form
      setReason("");
      setNotes("");
      setLines([]);
      setWastageDate(new Date().toISOString().split("T")[0]);
      fetchRecords();
    } catch (err: any) {
      toast.error(err.message || "Failed to log wastage.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Details
  const [detailRecord, setDetailRecord] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const handleOpenView = async (recordId: string) => {
    setView("view");
    setSelectedRecordId(recordId);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/wastage/${recordId}`);
      if (!res.ok) throw new Error("Failed to load wastage record details");
      const body = await res.json();
      setDetailRecord(body.data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load details");
      setView("list");
    } finally {
      setLoadingDetail(false);
    }
  };

  // State Transition calls (Confirm, Cancel)
  const handleUpdateStatus = async (recordId: string, newStatus: string) => {
    let confirmMsg = "";
    if (newStatus === "confirmed") confirmMsg = "Are you sure you want to confirm this wastage? This will deduct stock from this inventory.";
    if (newStatus === "cancelled") confirmMsg = "Are you sure you want to cancel this wastage? This will restore stock levels.";

    if (confirmMsg && !confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/wastage/${recordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message || `Failed to update wastage status to ${newStatus}`);
      }

      toast.success(`Wastage record: ${newStatus}`);
      fetchRecords();
      if (view === "view") {
        handleOpenView(recordId);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update status.");
    }
  };

  const isAllowed = userRole === "admin" || userRole === "storeroom";
  const filteredMaterials = rawMaterials.filter(m =>
    m.name.toLowerCase().includes(materialSearch.toLowerCase())
  );

  // ---------------- RENDERING VIEWS ----------------

  if (view === "list") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Wastage & Spoilage Logs</h2>
          {isAllowed && (
            <Button onClick={() => setView("create")} className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-medium h-10 px-4 rounded-md flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Report Wastage
            </Button>
          )}
        </div>

        <Card className="bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : records.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)]">
              No wastage logs recorded.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[var(--border-default)] hover:bg-transparent">
                  <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium">Log ID</TableHead>
                  <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium">Wastage Date</TableHead>
                  <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium">Reason</TableHead>
                  <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium text-center">Items Count</TableHead>
                  <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium">Logged By</TableHead>
                  <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium">Status</TableHead>
                  <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id} className="border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]">
                    <TableCell className="text-sm font-medium text-[var(--text-primary)] font-mono truncate max-w-[120px]">
                      {r.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="text-xs text-[var(--text-secondary)] font-medium">{r.wastageDate}</TableCell>
                    <TableCell className="text-xs text-[var(--text-secondary)] font-medium max-w-[150px] truncate">
                      {r.reason || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-[var(--text-secondary)] text-center font-mono">{r.itemsCount}</TableCell>
                    <TableCell className="text-xs text-[var(--text-secondary)] font-medium">{r.creatorName}</TableCell>
                    <TableCell className="text-xs">
                      {r.status === "draft" && <Badge className="bg-gray-100 text-gray-800 border border-gray-300">Draft</Badge>}
                      {r.status === "confirmed" && <Badge className="bg-green-100 text-green-800 border border-green-300">Confirmed</Badge>}
                      {r.status === "cancelled" && <Badge className="bg-red-100 text-red-800 border border-red-300">Cancelled</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenView(r.id)} className="h-8 w-8 p-0">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        
                        {isAllowed && r.status === "draft" && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(r.id, "confirmed")} className="h-8 w-8 p-0 text-green-600" title="Confirm Wastage">
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(r.id, "cancelled")} className="h-8 w-8 p-0 text-red-600" title="Cancel Draft">
                              <Ban className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}

                        {isAllowed && r.status === "confirmed" && (
                          <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(r.id, "cancelled")} className="h-8 w-8 p-0 text-red-600" title="Cancel Log & Revert Stock">
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    );
  }

  if (view === "view") {
    if (loadingDetail || !detailRecord) {
      return (
        <div className="p-6 space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      );
    }

    const r = detailRecord;

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center pb-3 border-b border-[var(--border-default)]">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Wastage Log: <span className="font-mono">{r.id}</span>
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-1">Logged: {new Date(r.createdAt).toLocaleString("en-IN")}</p>
          </div>
          <div className="flex items-center gap-2">
            {r.status === "draft" && <Badge className="bg-gray-100 text-gray-800">Draft</Badge>}
            {r.status === "confirmed" && <Badge className="bg-green-100 text-green-800">Confirmed</Badge>}
            {r.status === "cancelled" && <Badge className="bg-red-100 text-red-800">Cancelled</Badge>}
            <Button variant="outline" size="sm" onClick={() => setView("list")} className="h-9">
              Back to List
            </Button>
          </div>
        </div>

        {/* Details Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl p-4 text-sm">
          <div>
            <p className="text-[var(--text-muted)] font-medium">Wastage Date</p>
            <p className="font-semibold mt-1">{r.wastageDate}</p>
          </div>
          <div>
            <p className="text-[var(--text-muted)] font-medium">Reason for Wastage</p>
            <p className="font-semibold mt-1">{r.reason || "General spoilage"}</p>
          </div>
          <div>
            <p className="text-[var(--text-muted)] font-medium">Notes & Context</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1 whitespace-pre-wrap">
              {r.notes || "No additional notes logged"}
            </p>
          </div>
        </div>

        {/* Lines Table */}
        <Card className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="border-[var(--border-default)] hover:bg-transparent">
                <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium">Raw Material</TableHead>
                <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium">Unit</TableHead>
                <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium text-right">Wasted Quantity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {r.lines.map((line: any) => (
                <TableRow key={line.id} className="border-[var(--border-subtle)]">
                  <TableCell className="text-sm font-medium text-[var(--text-primary)]">{line.materialName}</TableCell>
                  <TableCell className="text-xs text-[var(--text-secondary)]">{line.unit}</TableCell>
                  <TableCell className="text-sm text-right font-mono font-semibold text-red-600">
                    -{Number(line.quantity).toFixed(3)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Confirmation buttons in details */}
        {isAllowed && r.status === "draft" && (
          <div className="flex gap-3 justify-end">
            <Button onClick={() => handleUpdateStatus(r.id, "confirmed")} className="bg-green-600 hover:bg-green-700 text-white font-medium h-10 px-4 rounded-md">
              Confirm wastage
            </Button>
            <Button onClick={() => handleUpdateStatus(r.id, "cancelled")} variant="outline" className="border-red-600 text-red-600 hover:bg-red-50 font-medium h-10 px-4 rounded-md">
              Cancel log
            </Button>
          </div>
        )}

        {isAllowed && r.status === "confirmed" && (
          <div className="flex gap-3 justify-end">
            <Button onClick={() => handleUpdateStatus(r.id, "cancelled")} variant="outline" className="border-red-600 text-red-600 hover:bg-red-50 font-medium h-10 px-4 rounded-md">
              Cancel log & revert stock
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (view === "create") {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center pb-3 border-b border-[var(--border-default)]">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Report Raw Material Wastage</h2>
          <Button variant="outline" size="sm" onClick={() => setView("list")} className="h-9">
            Cancel
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl p-4">
              
              {/* Wastage Date */}
              <div className="space-y-1.5">
                <Label htmlFor="wastage-date" className="text-sm font-medium">Wastage Date *</Label>
                <Input
                  id="wastage-date"
                  type="date"
                  value={wastageDate}
                  onChange={(e) => setWastageDate(e.target.value)}
                  className="h-10 border-[var(--border-default)] bg-white"
                  required
                />
              </div>

              {/* Reason */}
              <div className="space-y-1.5">
                <Label htmlFor="wastage-reason" className="text-sm font-medium">Reason / Category</Label>
                <Input
                  id="wastage-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Spoiled, Expired, Spillage..."
                  className="h-10 border-[var(--border-default)] bg-white"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="wastage-notes" className="text-sm font-medium">Notes (optional)</Label>
                <Input
                  id="wastage-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Specific details..."
                  className="h-10 border-[var(--border-default)] bg-white"
                />
              </div>
            </div>

            {/* Line Items Table & Add Material */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Items to log as wasted</h3>

                <div className="relative w-64">
                  <Input
                    value={materialSearch}
                    onChange={(e) => {
                      setMaterialSearch(e.target.value);
                      setShowMaterialDropdown(true);
                    }}
                    onFocus={() => setShowMaterialDropdown(true)}
                    placeholder="Search raw material..."
                    className="h-9 border-[var(--border-default)] bg-[var(--bg-surface)] text-xs"
                  />

                  {showMaterialDropdown && materialSearch && (
                    <div className="absolute top-10 left-0 right-0 z-50 max-h-40 overflow-y-auto bg-white border border-[var(--border-default)] rounded-md shadow-lg p-1 space-y-0.5">
                      {filteredMaterials.map(m => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleAddMaterial(m)}
                          className="w-full text-left px-2 py-1.5 hover:bg-[var(--bg-hover)] rounded text-xs"
                        >
                          {m.name} ({m.unit}) — Available Stock: {Number(m.currentStock).toFixed(3)}
                        </button>
                      ))}
                      {filteredMaterials.length === 0 && (
                        <p className="text-xs text-[var(--text-muted)] p-2">No active materials found.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Items Card */}
              <Card className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl overflow-hidden shadow-sm">
                {lines.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                    No items added. Search raw materials in your inventory to report wastage.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[var(--border-default)] hover:bg-transparent">
                        <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium">Material Name</TableHead>
                        <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium w-24">Unit</TableHead>
                        <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium text-right w-36">Wasted Quantity</TableHead>
                        <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium text-right w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((line, idx) => {
                        const isShortage = line.quantity > line.availableStock;
                        return (
                          <TableRow key={line.rawMaterialId} className="border-[var(--border-subtle)]">
                            <TableCell className="text-sm font-medium text-[var(--text-primary)]">
                              <div>{line.materialName}</div>
                              <div className="text-[10px] text-[var(--text-muted)] font-mono">Available Stock: {line.availableStock.toFixed(3)} {line.unit}</div>
                            </TableCell>
                            <TableCell className="text-xs text-[var(--text-secondary)]">
                              {line.unit}
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                step="0.001"
                                value={line.quantity || ""}
                                onChange={(e) => handleQuantityChange(idx, Number(e.target.value))}
                                className={`h-8 w-28 text-right font-mono text-xs border-[var(--border-default)] bg-white ${
                                  isShortage ? "border-red-500 bg-red-50 text-red-900" : ""
                                }`}
                                required
                              />
                              {isShortage && (
                                <div className="text-[9px] text-red-600 font-semibold mt-1">
                                  Exceeds available stock level!
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => handleRemoveLine(idx)}
                                className="h-8 w-8 p-0 text-[var(--text-secondary)] hover:text-red-600"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </Card>
            </div>
          </div>

          {/* Actions summary panel */}
          <div className="space-y-6">
            <Card className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl shadow-sm p-4 space-y-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-2">
                Report Actions
              </h3>

              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Confirming wastage will permanently deduct the selected quantities from your current stock levels. Reversing is possible by cancelling the wastage log.
              </p>

              <div className="flex flex-col gap-2 pt-2">
                <Button
                  type="button"
                  onClick={() => handleOpenConfirm("confirmed")}
                  className="bg-red-600 hover:bg-red-700 text-white w-full h-10"
                >
                  Confirm Wastage
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenConfirm("draft")}
                  className="w-full h-10 border-[var(--border-default)]"
                >
                  Save as Draft
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {/* Confirmation dialog for Confirm Wastage */}
        <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
          <DialogContent className="bg-white border-[var(--border-default)]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                <span>Confirm stock deduction?</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-[var(--text-secondary)] mt-2">
                You are about to deduct stock levels for {lines.length} raw materials. This action will log a "wastage" movement in the audit trail.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4 flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsConfirmDialogOpen(false)}
                disabled={isSubmitting}
                className="h-10"
              >
                No, review
              </Button>
              <Button
                onClick={() => submitForm("confirmed")}
                disabled={isSubmitting}
                className="bg-red-600 hover:bg-red-700 text-white h-10"
              >
                {isSubmitting ? "Deducting..." : "Yes, confirm wastage"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return null;
}
