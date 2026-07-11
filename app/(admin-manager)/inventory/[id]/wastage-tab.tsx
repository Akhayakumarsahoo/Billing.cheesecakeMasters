"use client";

import React, { useState, useEffect } from "react";
import { Plus, Search, X, AlertTriangle, Eye, Ban, Check, Trash2, Calendar as CalendarIcon } from "lucide-react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

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

  // Views: "list" | "create"
  const [view, setView] = useState<"list" | "create">("list");
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const toLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const today = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 6);

  const [fromDate, setFromDate] = useState(() => toLocalDateString(sevenDaysAgo));
  const [toDate, setToDate] = useState(() => toLocalDateString(today));
  const todayStr = toLocalDateString(today);

  const [draftRange, setDraftRange] = useState<DateRange>({
    from: sevenDaysAgo,
    to: today
  });
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Lists
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);

  // Form State
  const [wastageDate, setWastageDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [reason, setReason] = useState("");
  const [lines, setLines] = useState<WastageLine[]>([]);

  // Search inside form
  const [materialSearch, setMaterialSearch] = useState("");
  const [showMaterialDropdown, setShowMaterialDropdown] = useState(false);

  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"draft" | "confirmed">("draft");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchRecords();
  }, [inventoryId, fromDate, toDate]);

  useEffect(() => {
    fetchRawMaterials();
  }, [inventoryId]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const url = `/api/wastage?inventoryId=${inventoryId}&from=${fromDate}&to=${toDate}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load wastage records");
      const body = await res.json();
      setRecords(body.data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load wastage records.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    const parseLocalDate = (str: string): Date => {
      const [y, m, d] = str.split("-").map(Number);
      return new Date(y, m - 1, d);
    };
    setDraftRange({
      from: parseLocalDate(fromDate),
      to: parseLocalDate(toDate)
    });
    setIsPopoverOpen(true);
  };

  const getShortcutList = () => {
    const now = new Date();
    const todayVal = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const yesterday = new Date(todayVal);
    yesterday.setDate(todayVal.getDate() - 1);

    const last7 = new Date(todayVal);
    last7.setDate(todayVal.getDate() - 6);

    const last30 = new Date(todayVal);
    last30.setDate(todayVal.getDate() - 29);

    const last90 = new Date(todayVal);
    last90.setDate(todayVal.getDate() - 89);

    const thisMonthStart = new Date(todayVal.getFullYear(), todayVal.getMonth(), 1);

    const lastMonthStart = new Date(todayVal.getFullYear(), todayVal.getMonth() - 1, 1);
    const lastMonthEnd = new Date(todayVal.getFullYear(), todayVal.getMonth(), 0);

    return [
      { key: "today", label: "Today", from: todayVal, to: todayVal },
      { key: "yesterday", label: "Yesterday", from: yesterday, to: yesterday },
      { key: "last7", label: "Last 7 Days", from: last7, to: todayVal },
      { key: "last30", label: "Last 30 Days", from: last30, to: todayVal },
      { key: "last90", label: "Last 90 Days", from: last90, to: todayVal },
      { key: "thisMonth", label: "This Month", from: thisMonthStart, to: todayVal },
      { key: "lastMonth", label: "Last Month", from: lastMonthStart, to: lastMonthEnd },
    ];
  };

  const activeShortcutKey = (() => {
    if (!draftRange?.from || !draftRange?.to) return null;
    const shortcuts = getShortcutList();
    for (const s of shortcuts) {
      if (toLocalDateString(draftRange.from) === toLocalDateString(s.from) && 
          toLocalDateString(draftRange.to) === toLocalDateString(s.to)) {
        return s.key;
      }
    }
    return null;
  })();

  const handleShortcutClick = (key: string, from: Date, to: Date) => {
    setDraftRange({ from, to });
    const fromStr = toLocalDateString(from);
    const toStr = toLocalDateString(to);
    setFromDate(fromStr);
    setToDate(toStr);
    setIsPopoverOpen(false);
  };

  const handleApply = () => {
    if (!draftRange?.from) {
      toast.error("Please select a start date");
      return;
    }

    const to = draftRange.to ?? draftRange.from;
    const diffDays = Math.ceil(
      (to.getTime() - draftRange.from.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays > 93) {
      toast.error("Date range cannot exceed 3 months (93 days)");
      return;
    }

    setFromDate(toLocalDateString(draftRange.from));
    setToDate(toLocalDateString(to));
    setIsPopoverOpen(false);
  };

  const previewLabel = () => {
    if (draftRange?.from) {
      const fromStr = format(draftRange.from, "dd/MM/yyyy");
      const toStr = draftRange.to ? format(draftRange.to, "dd/MM/yyyy") : fromStr;
      return `${fromStr} to ${toStr}`;
    }
    return "Select date range";
  };

  const displayLabel = () => {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (fromDate === toDate) return format(from, "MMM d, yyyy");
    return `${format(from, "MMM d")} – ${format(to, "MMM d, yyyy")}`;
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

    if (status === "confirmed") {
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
        notes: null,
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
    setSelectedRecordId(recordId);
    setLoadingDetail(true);
    setIsDetailsOpen(true);
    try {
      const res = await fetch(`/api/wastage/${recordId}`);
      if (!res.ok) throw new Error("Failed to load wastage record details");
      const body = await res.json();
      setDetailRecord(body.data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load details");
      setIsDetailsOpen(false);
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
      if (isDetailsOpen && recordId) {
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
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Wastage & Spoilage Logs</h2>
            
            <Popover open={isPopoverOpen} onOpenChange={(val) => {
              if (val) handleOpen();
              else setIsPopoverOpen(false);
            }}>
              <PopoverTrigger
                className={cn(
                  "inline-flex items-center gap-2 h-9 px-3 rounded-md text-xs font-normal border cursor-pointer select-none",
                  "bg-[var(--bg-surface)] border-[var(--border-default)]",
                  "text-[var(--text-primary)] transition-colors outline-none",
                  "hover:bg-[var(--bg-hover)] hover:border-[var(--border-strong)]",
                  "min-w-[200px] whitespace-nowrap",
                  isPopoverOpen && "border-[var(--border-strong)] bg-[var(--bg-hover)]"
                )}
              >
                <CalendarIcon className="h-3.5 w-3.5 text-[var(--text-secondary)] shrink-0" strokeWidth={1.5} />
                <span className="flex-1 text-left font-sans">{displayLabel()}</span>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-xl rounded-xl overflow-hidden flex flex-col z-50" align="start">
                <div className="flex flex-row">
                  {/* Sidebar with Shortcuts */}
                  <div className="w-44 flex flex-col border-r border-[var(--border-default)] py-2 bg-[var(--bg-surface)] shrink-0">
                    {getShortcutList().map((s) => {
                      const isActive = activeShortcutKey === s.key;
                      return (
                        <button
                          key={s.key}
                          type="button"
                          onClick={() => handleShortcutClick(s.key, s.from, s.to)}
                          className={cn(
                            "w-full text-left py-2.5 px-4 text-xs font-medium transition-colors select-none",
                            isActive
                              ? "bg-[var(--bg-active)] text-[var(--text-primary)] border-r-2 border-[var(--accent-primary)]"
                              : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                          )}
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Calendar component */}
                  <div className="p-3">
                    <CalendarComponent
                      mode="range"
                      selected={draftRange}
                      onSelect={(val) => val && setDraftRange(val)}
                      numberOfMonths={2}
                      disabled={{ after: new Date() }}
                      defaultMonth={draftRange?.from}
                      className="relative p-0"
                    />
                  </div>
                </div>

                {/* Footer of the Popover */}
                <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-[var(--border-default)] bg-[var(--bg-surface-raised)]">
                  <span className="text-xs text-[var(--text-secondary)] font-mono">
                    {previewLabel()}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsPopoverOpen(false)}
                      className="h-8 text-xs px-3 font-medium"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleApply}
                      className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white h-8 text-xs px-4 font-medium"
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
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

        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-3xl bg-white border-[var(--border-default)]">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold text-[var(--text-primary)]">
                Wastage Log Details
              </DialogTitle>
              <DialogDescription className="text-xs text-[var(--text-muted)]">
                {detailRecord && `Logged: ${new Date(detailRecord.createdAt).toLocaleString("en-IN")}`}
              </DialogDescription>
            </DialogHeader>

            {loadingDetail || !detailRecord ? (
              <div className="py-8 space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Details grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl p-4 text-xs">
                  <div>
                    <p className="text-[var(--text-muted)] font-medium">Wastage Date</p>
                    <p className="font-semibold mt-1">{detailRecord.wastageDate}</p>
                  </div>
                  <div>
                    <p className="text-[var(--text-muted)] font-medium">Reason for Wastage</p>
                    <p className="font-semibold mt-1">{detailRecord.reason || "General spoilage"}</p>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)] font-medium">Status:</span>
                  {detailRecord.status === "draft" && <Badge className="bg-gray-100 text-gray-800 border border-gray-300">Draft</Badge>}
                  {detailRecord.status === "confirmed" && <Badge className="bg-green-100 text-green-800 border border-green-300">Confirmed</Badge>}
                  {detailRecord.status === "cancelled" && <Badge className="bg-red-100 text-red-800 border border-red-300">Cancelled</Badge>}
                </div>

                {/* Lines Table */}
                <div className="border border-[var(--border-default)] rounded-xl overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[var(--border-default)] hover:bg-transparent">
                        <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium">Raw Material</TableHead>
                        <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium">Unit</TableHead>
                        <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium text-right">Wasted Quantity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailRecord.lines.map((line: any) => (
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
                </div>
              </div>
            )}

            <DialogFooter className="mt-4 flex flex-row gap-2 justify-between items-center sm:justify-between w-full">
              {/* Left side actions if allowed */}
              <div className="flex gap-2">
                {detailRecord && isAllowed && detailRecord.status === "draft" && (
                  <>
                    <Button
                      onClick={() => handleUpdateStatus(detailRecord.id, "confirmed")}
                      disabled={isSubmitting}
                      className="bg-green-600 hover:bg-green-700 text-white font-medium h-9 text-xs"
                    >
                      Confirm wastage
                    </Button>
                    <Button
                      onClick={() => handleUpdateStatus(detailRecord.id, "cancelled")}
                      disabled={isSubmitting}
                      variant="outline"
                      className="border-red-600 text-red-600 hover:bg-red-50 font-medium h-9 text-xs"
                    >
                      Cancel log
                    </Button>
                  </>
                )}

                {detailRecord && isAllowed && detailRecord.status === "confirmed" && (
                  <Button
                    onClick={() => handleUpdateStatus(detailRecord.id, "cancelled")}
                    disabled={isSubmitting}
                    variant="outline"
                    className="border-red-600 text-red-600 hover:bg-red-50 font-medium h-9 text-xs"
                  >
                    Cancel log & revert stock
                  </Button>
                )}
              </div>

              {/* Right side close button */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDetailsOpen(false)}
                  className="h-9 text-xs"
                >
                  Close
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl p-4">
              
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
                              <div className="text-[10px] text-[var(--text-muted)] font-mono">Available Stock: {(line.availableStock || 0).toFixed(3)} {line.unit}</div>
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
