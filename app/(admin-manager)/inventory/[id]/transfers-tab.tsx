"use client";

import React, { useState, useEffect } from "react";
import { Plus, Search, ArrowLeftRight, X, AlertTriangle, Eye, Edit2, Ban, Check, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Inventory {
  id: string;
  name: string;
}

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  transferPrice: string;
  currentStock: string;
  gstRate: string;
  isActive: boolean;
}

interface TransferLine {
  rawMaterialId: string;
  materialName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  lineTotal: number;
  availableStock: number;
}

interface StockTransfer {
  id: string;
  fromInventoryId: string;
  fromInventoryName: string;
  toInventoryId: string;
  toInventoryName: string;
  status: "draft" | "pending" | "accepted" | "rejected" | "cancelled";
  subtotal: string;
  totalGst: string;
  otherCharges: string;
  otherChargesGst: string;
  grandTotal: string;
  notes: string | null;
  itemsCount: number;
  createdAt: string;
}

interface TransfersTabProps {
  inventoryId: string;
  userRole: string;
}

export function TransfersTab({ inventoryId, userRole }: TransfersTabProps) {
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [loading, setLoading] = useState(true);

  // Views: "list" | "create" | "view"
  const [view, setView] = useState<"list" | "create" | "view">("list");
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);

  // Lists
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);

  // Form State
  const [toInventoryId, setToInventoryId] = useState("");
  const [notes, setNotes] = useState("");
  const [otherCharges, setOtherCharges] = useState("0");
  const [otherChargesGst, setOtherChargesGst] = useState("0");
  const [lines, setLines] = useState<TransferLine[]>([]);

  // Search inside form
  const [materialSearch, setMaterialSearch] = useState("");
  const [showMaterialDropdown, setShowMaterialDropdown] = useState(false);

  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"draft" | "pending">("draft");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTransfers();
    fetchInventories();
    fetchRawMaterials();
  }, [inventoryId]);

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/transfers?inventoryId=${inventoryId}`);
      if (!res.ok) throw new Error("Failed to load transfers");
      const body = await res.json();
      setTransfers(body.data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load transfers.");
    } finally {
      setLoading(false);
    }
  };

  const fetchInventories = async () => {
    try {
      const res = await fetch("/api/inventory");
      if (res.ok) {
        const body = await res.json();
        // Exclude current inventory
        setInventories((body.data as Inventory[]).filter(i => i.id !== inventoryId));
      }
    } catch (err) {
      console.error(err);
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

  // Calculations
  const calculatedSubtotal = lines.reduce((sum, line) => sum + (line.quantity * line.unitPrice), 0);
  const calculatedGst = lines.reduce((sum, line) => sum + (line.quantity * line.unitPrice * (line.gstRate / 100)), 0);
  const calculatedGrandTotal = calculatedSubtotal + calculatedGst + Number(otherCharges || 0) + Number(otherChargesGst || 0);

  const handleAddMaterial = (m: RawMaterial) => {
    if (lines.some(l => l.rawMaterialId === m.id)) {
      toast.info(`${m.name} is already in the list.`);
      setShowMaterialDropdown(false);
      setMaterialSearch("");
      return;
    }

    const newLine: TransferLine = {
      rawMaterialId: m.id,
      materialName: m.name,
      unit: m.unit,
      quantity: 1,
      unitPrice: Number(m.transferPrice),
      gstRate: Number(m.gstRate),
      lineTotal: Number(m.transferPrice) * (1 + Number(m.gstRate) / 100),
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
      const lineTotal = (quantity * line.unitPrice) * (1 + line.gstRate / 100);
      return { ...line, quantity, lineTotal };
    }));
  };

  const handleUnitPriceChange = (idx: number, val: number) => {
    setLines(prev => prev.map((line, i) => {
      if (i !== idx) return line;
      const unitPrice = val < 0 ? 0 : val;
      const lineTotal = (line.quantity * unitPrice) * (1 + line.gstRate / 100);
      return { ...line, unitPrice, lineTotal };
    }));
  };

  const handleLineTotalChange = (idx: number, val: number) => {
    setLines(prev => prev.map((line, i) => {
      if (i !== idx) return line;
      const lineTotal = val < 0 ? 0 : val;
      const factor = line.quantity * (1 + line.gstRate / 100);
      const unitPrice = factor > 0 ? lineTotal / factor : 0;
      return { ...line, unitPrice, lineTotal };
    }));
  };

  // Form submit
  const handleOpenConfirm = (status: "draft" | "pending") => {
    if (!toInventoryId) {
      toast.error("Please select a destination inventory.");
      return;
    }
    if (lines.length === 0) {
      toast.error("Please add at least one line item.");
      return;
    }

    // Check stock validation before sending
    if (status === "pending") {
      setSubmitStatus(status);
      setIsConfirmDialogOpen(true);
    } else {
      submitForm(status);
    }
  };

  const submitForm = async (status: "draft" | "pending") => {
    setIsSubmitting(true);
    try {
      const payload = {
        fromInventoryId: inventoryId,
        toInventoryId,
        notes: notes.trim() || null,
        otherCharges: Number(otherCharges || 0),
        otherChargesGst: Number(otherChargesGst || 0),
        lines: lines.map(l => ({
          rawMaterialId: l.rawMaterialId,
          quantity: l.quantity,
          unitPrice: l.unitPrice
        })),
        status
      };

      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to create transfer");

      toast.success(status === "pending" ? "Stock transfer sent." : "Stock transfer draft saved.");
      setIsConfirmDialogOpen(false);
      setView("list");
      fetchTransfers();
    } catch (err: any) {
      toast.error(err.message || "Failed to create transfer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Details
  const [detailTransfer, setDetailTransfer] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const handleOpenView = async (transferId: string) => {
    setView("view");
    setSelectedTransferId(transferId);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/transfers/${transferId}`);
      if (!res.ok) throw new Error("Failed to load transfer details");
      const body = await res.json();
      setDetailTransfer(body.data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load details");
      setView("list");
    } finally {
      setLoadingDetail(false);
    }
  };

  // State Transition calls (Accept, Reject, Cancel)
  const handleUpdateStatus = async (transferId: string, newStatus: string) => {
    let confirmMsg = "";
    if (newStatus === "accepted") confirmMsg = "Are you sure you want to accept this transfer? This will add stock to this inventory.";
    if (newStatus === "rejected") confirmMsg = "Are you sure you want to reject this transfer? This will restore stock to the source inventory.";
    if (newStatus === "cancelled") confirmMsg = "Are you sure you want to cancel this transfer? This will restore stock to the source inventory.";

    if (confirmMsg && !confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/transfers/${transferId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message || `Failed to update transfer status to ${newStatus}`);
      }

      toast.success(`Transfer status updated: ${newStatus}`);
      // Refresh
      fetchTransfers();
      if (view === "view") {
        handleOpenView(transferId);
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
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Stock Transfers</h2>
          {isAllowed && (
            <Button onClick={() => setView("create")} className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-medium h-10 px-4 rounded-md flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Transfer
            </Button>
          )}
        </div>

        <Card className="bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : transfers.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)]">
              No stock transfers logged.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[var(--border-default)] hover:bg-transparent">
                  <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium">Transfer ID</TableHead>
                  <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium">Type</TableHead>
                  <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium">From Inventory</TableHead>
                  <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium">To Inventory</TableHead>
                  <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium text-center">Items</TableHead>
                  <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium text-right">Grand Total</TableHead>
                  <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium">Status</TableHead>
                  <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map((t) => {
                  const isOutbound = t.fromInventoryId === inventoryId;
                  const typeLabel = isOutbound ? "Outbound" : "Inbound";
                  
                  return (
                    <TableRow key={t.id} className="border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]">
                      <TableCell className="text-sm font-medium text-[var(--text-primary)] font-mono truncate max-w-[120px]">
                        {t.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="text-xs font-semibold">
                        <span className={isOutbound ? "text-amber-600" : "text-blue-600"}>
                          {typeLabel}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-[var(--text-secondary)] font-medium">{t.fromInventoryName}</TableCell>
                      <TableCell className="text-xs text-[var(--text-secondary)] font-medium">{t.toInventoryName}</TableCell>
                      <TableCell className="text-xs text-[var(--text-secondary)] text-center font-mono">{t.itemsCount}</TableCell>
                      <TableCell className="text-sm text-right font-mono font-semibold text-[var(--text-primary)]">
                        ₹{Number(t.grandTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-xs">
                        {t.status === "draft" && <Badge className="bg-gray-100 text-gray-800 border border-gray-300">Draft</Badge>}
                        {t.status === "pending" && <Badge className="bg-blue-100 text-blue-800 border border-blue-300">Pending</Badge>}
                        {t.status === "accepted" && <Badge className="bg-green-100 text-green-800 border border-green-300">Accepted</Badge>}
                        {t.status === "rejected" && <Badge className="bg-red-100 text-red-800 border border-red-300">Rejected</Badge>}
                        {t.status === "cancelled" && <Badge className="bg-red-100 text-red-800 border border-red-300">Cancelled</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenView(t.id)} className="h-8 w-8 p-0">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          
                          {/* Outbound Actions */}
                          {isAllowed && isOutbound && t.status === "draft" && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(t.id, "pending")} className="h-8 w-8 p-0 text-blue-600" title="Send Transfer">
                                <Plus className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(t.id, "cancelled")} className="h-8 w-8 p-0 text-red-600" title="Cancel Draft">
                                <Ban className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}

                          {isAllowed && isOutbound && t.status === "pending" && (
                            <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(t.id, "cancelled")} className="h-8 w-8 p-0 text-red-600" title="Recall/Cancel Transfer">
                              <Ban className="h-3.5 w-3.5" />
                            </Button>
                          )}

                          {/* Inbound Actions */}
                          {isAllowed && !isOutbound && t.status === "pending" && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(t.id, "accepted")} className="h-8 w-8 p-0 text-green-600" title="Accept Transfer">
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(t.id, "rejected")} className="h-8 w-8 p-0 text-red-600" title="Reject Transfer">
                                <Ban className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    );
  }

  if (view === "view") {
    if (loadingDetail || !detailTransfer) {
      return (
        <div className="p-6 space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      );
    }

    const t = detailTransfer;
    const isOutbound = t.fromInventoryId === inventoryId;

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center pb-3 border-b border-[var(--border-default)]">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Transfer details: <span className="font-mono">{t.id}</span>
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-1">Logged: {new Date(t.createdAt).toLocaleString("en-IN")}</p>
          </div>
          <div className="flex items-center gap-2">
            {t.status === "draft" && <Badge className="bg-gray-100 text-gray-800">Draft</Badge>}
            {t.status === "pending" && <Badge className="bg-blue-100 text-blue-800">Pending</Badge>}
            {t.status === "accepted" && <Badge className="bg-green-100 text-green-800">Accepted</Badge>}
            {t.status === "rejected" && <Badge className="bg-red-100 text-red-800">Rejected</Badge>}
            {t.status === "cancelled" && <Badge className="bg-red-100 text-red-800">Cancelled</Badge>}
            <Button variant="outline" size="sm" onClick={() => setView("list")} className="h-9">
              Back to List
            </Button>
          </div>
        </div>

        {/* Transfer Header Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl p-4 text-sm">
          <div>
            <p className="text-[var(--text-muted)] font-medium">Source (Sender)</p>
            <p className="font-semibold mt-1">{t.fromInventoryName}</p>
          </div>
          <div>
            <p className="text-[var(--text-muted)] font-medium">Destination (Receiver)</p>
            <p className="font-semibold mt-1">{t.toInventoryName}</p>
          </div>
          <div>
            <p className="text-[var(--text-muted)] font-medium">Notes</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1 whitespace-pre-wrap">
              {t.notes || "No notes logged for this transfer"}
            </p>
          </div>
        </div>

        {/* Lines Table */}
        <Card className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="border-[var(--border-default)] hover:bg-transparent">
                <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium">Item Name</TableHead>
                <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium">Unit</TableHead>
                <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium text-right">Quantity</TableHead>
                <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium text-right">Transfer Price</TableHead>
                <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium text-right">GST Rate</TableHead>
                <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium text-right">Total Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {t.lines.map((line: any) => (
                <TableRow key={line.id} className="border-[var(--border-subtle)]">
                  <TableCell className="text-sm font-medium text-[var(--text-primary)]">{line.materialName}</TableCell>
                  <TableCell className="text-xs text-[var(--text-secondary)]">{line.unit}</TableCell>
                  <TableCell className="text-sm text-right font-mono">{Number(line.quantity).toFixed(3)}</TableCell>
                  <TableCell className="text-sm text-right font-mono">₹{Number(line.unitPrice).toFixed(2)}</TableCell>
                  <TableCell className="text-sm text-right font-mono">{Number(line.gstRate)}%</TableCell>
                  <TableCell className="text-sm text-right font-mono font-semibold">₹{Number(line.lineTotal).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Inbound/Outbound Pending Action triggers inside detailed view */}
        {isAllowed && t.status === "pending" && (
          <div className="flex gap-3 justify-end">
            {!isOutbound ? (
              <>
                <Button onClick={() => handleUpdateStatus(t.id, "accepted")} className="bg-green-600 hover:bg-green-700 text-white font-medium h-10 px-4 rounded-md">
                  Accept Transfer
                </Button>
                <Button onClick={() => handleUpdateStatus(t.id, "rejected")} variant="outline" className="border-red-600 text-red-600 hover:bg-red-50 font-medium h-10 px-4 rounded-md">
                  Reject Transfer
                </Button>
              </>
            ) : (
              <Button onClick={() => handleUpdateStatus(t.id, "cancelled")} variant="outline" className="border-red-600 text-red-600 hover:bg-red-50 font-medium h-10 px-4 rounded-md">
                Cancel Transfer
              </Button>
            )}
          </div>
        )}

        {/* Totals Summary */}
        <div className="flex flex-col items-end gap-2 text-sm pr-4">
          <div className="flex justify-between w-64 border-b border-[var(--border-subtle)] pb-1.5 text-[var(--text-secondary)]">
            <span>Subtotal (excl. GST)</span>
            <span className="font-mono">₹{Number(t.subtotal).toFixed(2)}</span>
          </div>
          <div className="flex justify-between w-64 border-b border-[var(--border-subtle)] pb-1.5 text-[var(--text-secondary)]">
            <span>Total GST</span>
            <span className="font-mono">₹{Number(t.totalGst).toFixed(2)}</span>
          </div>
          {Number(t.otherCharges) > 0 && (
            <div className="flex justify-between w-64 border-b border-[var(--border-subtle)] pb-1.5 text-[var(--text-secondary)]">
              <span>Other Charges</span>
              <span className="font-mono">₹{Number(t.otherCharges).toFixed(2)}</span>
            </div>
          )}
          {Number(t.otherChargesGst) > 0 && (
            <div className="flex justify-between w-64 border-b border-[var(--border-subtle)] pb-1.5 text-[var(--text-secondary)]">
              <span>Other Charges GST</span>
              <span className="font-mono">₹{Number(t.otherChargesGst).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between w-64 text-base font-semibold text-[var(--text-primary)] pt-1">
            <span>Grand Total</span>
            <span className="font-mono">₹{Number(t.grandTotal).toFixed(2)}</span>
          </div>
        </div>
      </div>
    );
  }

  if (view === "create") {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center pb-3 border-b border-[var(--border-default)]">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">New Stock Transfer</h2>
          <Button variant="outline" size="sm" onClick={() => setView("list")} className="h-9">
            Cancel
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl p-4">
              {/* Destination Inventory Selector */}
              <div className="space-y-1.5">
                <Label htmlFor="dest-inv" className="text-sm font-medium">To Inventory *</Label>
                 <Select value={toInventoryId} onValueChange={(val) => setToInventoryId(val || "")}>
                  <SelectTrigger id="dest-inv" className="border-[var(--border-default)] bg-white h-10">
                    <SelectValue placeholder="Select destination...">
                      {inventories.find(i => i.id === toInventoryId)?.name || undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[var(--border-default)]">
                    {inventories.map(i => (
                      <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="transfer-notes" className="text-sm font-medium">Notes (optional)</Label>
                <Input
                  id="transfer-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Transfer reasons..."
                  className="h-10 border-[var(--border-default)] bg-white"
                />
              </div>
            </div>

            {/* Line Items Table & Add Material */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Transfer Items</h3>

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
                          {m.name} ({m.unit}) — Stock: {Number(m.currentStock).toFixed(3)}
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
                    No items added. Search raw materials in your inventory to transfer.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[var(--border-default)] hover:bg-transparent">
                        <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium">Material Name</TableHead>
                        <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium w-16">Unit</TableHead>
                        <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium text-right w-24">Quantity</TableHead>
                        <TableHead className="text-xs uppercase text(--text-secondary) font-medium text-right w-28">Unit Price</TableHead>
                        <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium text-right w-20">GST</TableHead>
                        <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium text-right w-32">Total Price</TableHead>
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
                              <div className="text-[10px] text-[var(--text-muted)]">Available: {(line.availableStock || 0).toFixed(3)} {line.unit}</div>
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
                                className={`h-8 w-20 text-right font-mono text-xs border-[var(--border-default)] bg-white ${
                                  isShortage ? "border-[var(--state-error-border)] bg-[var(--state-error-bg)]" : ""
                                }`}
                                required
                              />
                              {isShortage && (
                                <div className="text-[9px] text-[var(--state-error-text)] font-semibold mt-1">
                                  Only {(line.availableStock || 0).toFixed(3)} available
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                step="0.01"
                                value={line.unitPrice || ""}
                                onChange={(e) => handleUnitPriceChange(idx, Number(e.target.value))}
                                className="h-8 w-24 text-right font-mono text-xs border-[var(--border-default)] bg-white"
                                required
                              />
                            </TableCell>
                            <TableCell className="text-xs font-mono text-[var(--text-secondary)] text-right">
                              {line.gstRate}%
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                step="0.01"
                                value={line.lineTotal || ""}
                                onChange={(e) => handleLineTotalChange(idx, Number(e.target.value))}
                                className="h-8 w-28 text-right font-mono text-xs font-semibold border-[var(--border-default)] bg-white"
                                required
                              />
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

          {/* Form right (Summary panel) */}
          <div className="space-y-6">
            <Card className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl shadow-sm p-4 space-y-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-2">
                Transfer Summary
              </h3>

              <div className="space-y-2 text-xs text-[var(--text-secondary)]">
                <div className="flex justify-between">
                  <span>Subtotal (excl. GST)</span>
                  <span className="font-mono">₹{calculatedSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total GST</span>
                  <span className="font-mono">₹{calculatedGst.toFixed(2)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border-subtle)] items-center">
                  <Label htmlFor="transfer-charges" className="text-xs">Other Charges</Label>
                  <Input
                    id="transfer-charges"
                    type="number"
                    value={otherCharges}
                    onChange={(e) => setOtherCharges(e.target.value)}
                    className="h-8 text-right font-mono text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 items-center">
                  <Label htmlFor="transfer-charges-gst" className="text-xs">Charges GST</Label>
                  <Input
                    id="transfer-charges-gst"
                    type="number"
                    value={otherChargesGst}
                    onChange={(e) => setOtherChargesGst(e.target.value)}
                    className="h-8 text-right font-mono text-xs"
                  />
                </div>
              </div>

              <div className="border-t border-[var(--border-default)] pt-3 flex flex-col gap-1 items-end">
                <span className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wide">Grand Total</span>
                <span className="text-2xl font-mono font-semibold text-[var(--text-primary)]">
                  ₹{calculatedGrandTotal.toFixed(2)}
                </span>
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <Button
                  type="button"
                  onClick={() => handleOpenConfirm("pending")}
                  className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white w-full h-10"
                >
                  Send Transfer
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

        {/* Send Confirm Dialog */}
        <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
          <DialogContent className="max-w-sm bg-[var(--bg-surface)] border-[var(--border-default)] rounded-xl shadow-lg">
            <DialogHeader className="flex flex-col items-center">
              <ShieldAlert className="h-10 w-10 text-[var(--state-warning-border)] mb-2" />
              <DialogTitle className="text-base font-semibold text-[var(--text-primary)] text-center">Send Stock Transfer</DialogTitle>
              <DialogDescription className="text-xs text-[var(--text-secondary)] text-center mt-1">
                Sending this transfer will immediately deduct quantities from this inventory's stock.
                The receiving inventory will need to accept it to receive the stock.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 justify-center pt-2">
              <Button
                variant="outline"
                onClick={() => setIsConfirmDialogOpen(false)}
                className="border-[var(--border-default)]"
              >
                Cancel
              </Button>
              <Button
                onClick={() => submitForm("pending")}
                disabled={isSubmitting}
                className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white"
              >
                {isSubmitting ? "Sending..." : "Yes, Send"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return null;
}
