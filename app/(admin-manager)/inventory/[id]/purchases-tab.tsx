"use client";

import React, { useState, useEffect } from "react";
import { Plus, Search, ShoppingCart, Calendar as CalendarIcon, FileText, X, AlertTriangle, Eye, Edit2, Ban } from "lucide-react";
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

interface GstSlab {
  id: number;
  rate: string;
  label: string;
}

interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  gstin: string | null;
}

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  purchasePrice: string;
  gstRate: string;
  gstSlabId: number;
  isActive: boolean;
}

interface PurchaseInvoiceLine {
  rawMaterialId: string;
  materialName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  lineTotal: number;
}

interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  status: "draft" | "confirmed" | "cancelled";
  subtotal: string;
  totalGst: string;
  otherCharges: string;
  otherChargesGst: string;
  grandTotal: string;
  notes: string | null;
  supplierName: string;
  itemsCount: number;
  createdAt: string;
}

interface PurchasesTabProps {
  inventoryId: string;
  userRole: string;
  gstSlabs: GstSlab[];
}

export function PurchasesTab({ inventoryId, userRole, gstSlabs }: PurchasesTabProps) {
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  // View States
  // "list" | "create" | "edit" | "view"
  const [view, setView] = useState<"list" | "create" | "edit" | "view">("list");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  // Database lists
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);

  // Form State
  const [supplierId, setSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [otherCharges, setOtherCharges] = useState("0");
  const [otherChargesGst, setOtherChargesGst] = useState("0");
  const [lines, setLines] = useState<PurchaseInvoiceLine[]>([]);

  // Search filter inside forms
  const [supplierSearch, setSupplierSearch] = useState("");
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);

  const [materialSearch, setMaterialSearch] = useState("");
  const [showMaterialDropdown, setShowMaterialDropdown] = useState(false);

  // Confirmation dialogs
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"draft" | "confirmed">("draft");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Supplier popover state
  const [isNewSupplierOpen, setIsNewSupplierOpen] = useState(false);
  const [newSupName, setNewSupName] = useState("");
  const [newSupPhone, setNewSupPhone] = useState("");
  const [newSupAddress, setNewSupAddress] = useState("");
  const [newSupGstin, setNewSupGstin] = useState("");

  // New Material popover state
  const [isNewMaterialOpen, setIsNewMaterialOpen] = useState(false);
  const [newMatName, setNewMatName] = useState("");
  const [newMatUnit, setNewMatUnit] = useState("kg");
  const [newMatPurchase, setNewMatPurchase] = useState("");
  const [newMatTransfer, setNewMatTransfer] = useState("");
  const [newMatGstId, setNewMatGstId] = useState("");

  // New Inbound Pending Transfers States
  const [pendingTransfers, setPendingTransfers] = useState<any[]>([]);
  const [reviewTransferOpen, setReviewTransferOpen] = useState(false);
  const [reviewTransfer, setReviewTransfer] = useState<any>(null);
  const [loadingTransfer, setLoadingTransfer] = useState(false);
  const [isRespondingTransfer, setIsRespondingTransfer] = useState(false);

  useEffect(() => {
    fetchInvoices();
    fetchSuppliers();
    fetchRawMaterials();
    fetchPendingTransfers();
  }, [inventoryId]);

  const fetchPendingTransfers = async () => {
    try {
      const res = await fetch(`/api/transfers?inventoryId=${inventoryId}`);
      if (!res.ok) throw new Error("Failed to load inbound transfers");
      const body = await res.json();
      const inboundPending = body.data.filter(
        (t: any) => t.toInventoryId === inventoryId && t.status === "pending"
      );
      setPendingTransfers(inboundPending);
    } catch (err: any) {
      console.error("fetchPendingTransfers error:", err);
    }
  };

  const handleViewTransfer = async (id: string) => {
    setReviewTransferOpen(true);
    setLoadingTransfer(true);
    setReviewTransfer(null);
    try {
      const res = await fetch(`/api/transfers/${id}`);
      if (!res.ok) throw new Error("Failed to fetch transfer details");
      const body = await res.json();
      setReviewTransfer(body.data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load transfer details");
      setReviewTransferOpen(false);
    } finally {
      setLoadingTransfer(false);
    }
  };

  const handleRespondTransfer = (status: "accepted" | "rejected") => {
    if (!reviewTransfer) return;
    const verb = status === "accepted" ? "accept" : "reject";
    if (!confirm(`Are you sure you want to ${verb} this stock transfer?`)) {
      return;
    }

    const transferId = reviewTransfer.id;
    setReviewTransferOpen(false);

    const respondPromise = (async () => {
      const res = await fetch(`/api/transfers/${transferId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || `Failed to ${verb} transfer`);

      fetchPendingTransfers();
      fetchInvoices();
      return body;
    })();

    toast.promise(respondPromise, {
      loading: status === "accepted" ? "Accepting transfer and adding stock in background..." : "Rejecting transfer in background...",
      success: status === "accepted" ? "Transfer accepted, purchase invoice generated." : "Transfer rejected.",
      error: (err) => err.message || `Failed to ${verb} transfer.`
    });
  };

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/purchase-invoices?inventoryId=${inventoryId}`);
      if (!res.ok) throw new Error("Failed to load invoices");
      const body = await res.json();
      setInvoices(body.data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await fetch("/api/suppliers");
      if (res.ok) {
        const body = await res.json();
        setSuppliers(body.data);
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

  // Line item handlers
  const handleAddMaterial = (m: RawMaterial) => {
    // Check if already in lines
    if (lines.some(l => l.rawMaterialId === m.id)) {
      toast.info(`${m.name} is already in the list.`);
      setShowMaterialDropdown(false);
      setMaterialSearch("");
      return;
    }

    const newLine: PurchaseInvoiceLine = {
      rawMaterialId: m.id,
      materialName: m.name,
      unit: m.unit,
      quantity: 1,
      unitPrice: Number(m.purchasePrice),
      gstRate: Number(m.gstRate),
      lineTotal: Number(m.purchasePrice) * (1 + Number(m.gstRate) / 100)
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
      // unitPrice = lineTotal / (qty * (1 + gst/100))
      const factor = line.quantity * (1 + line.gstRate / 100);
      const unitPrice = factor > 0 ? lineTotal / factor : 0;
      return { ...line, unitPrice, lineTotal };
    }));
  };

  // Form Submissions
  const handleOpenConfirm = (status: "draft" | "confirmed") => {
    if (!supplierId) {
      toast.error("Please select a supplier.");
      return;
    }
    if (!invoiceNumber.trim()) {
      toast.error("Please enter the invoice number.");
      return;
    }
    if (lines.length === 0) {
      toast.error("Please add at least one line item.");
      return;
    }

    setSubmitStatus(status);
    if (status === "confirmed") {
      setIsConfirmDialogOpen(true);
    } else {
      submitForm(status);
    }
  };

  const submitForm = (status: "draft" | "confirmed") => {
    const payload = {
      inventoryId,
      supplierId,
      invoiceNumber: invoiceNumber.trim(),
      invoiceDate,
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

    const isEdit = view === "edit" && selectedInvoiceId;
    const url = isEdit ? `/api/purchase-invoices/${selectedInvoiceId}` : `/api/purchase-invoices`;
    const method = isEdit ? "PATCH" : "POST";

    setIsConfirmDialogOpen(false);
    setView("list");

    const savePromise = (async () => {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to save purchase invoice");
      fetchInvoices();
      return body;
    })();

    toast.promise(savePromise, {
      loading: status === "confirmed" ? "Confirming purchase invoice in background..." : "Saving draft purchase invoice in background...",
      success: status === "confirmed" ? "Purchase invoice confirmed and stock added." : "Purchase invoice saved as draft.",
      error: (err) => err.message || "Failed to save purchase invoice."
    });
  };

  // View Details
  const [detailInvoice, setDetailInvoice] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const handleOpenView = async (invoiceId: string) => {
    setView("view");
    setSelectedInvoiceId(invoiceId);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/purchase-invoices/${invoiceId}`);
      if (!res.ok) throw new Error("Failed to load invoice details");
      const body = await res.json();
      setDetailInvoice(body.data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load details");
      setView("list");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleOpenEdit = async (invoiceId: string) => {
    setView("edit");
    setSelectedInvoiceId(invoiceId);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/purchase-invoices/${invoiceId}`);
      if (!res.ok) throw new Error("Failed to load invoice details");
      const body = await res.json();
      const inv = body.data;

      setSupplierId(inv.supplierId);
      setSupplierSearch(inv.supplierName);
      setInvoiceNumber(inv.invoiceNumber);
      setInvoiceDate(inv.invoiceDate);
      setNotes(inv.notes || "");
      setOtherCharges(inv.otherCharges);
      setOtherChargesGst(inv.otherChargesGst);
      setLines(inv.lines.map((l: any) => ({
        rawMaterialId: l.rawMaterialId,
        materialName: l.materialName,
        unit: l.unit,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        gstRate: Number(l.gstRate),
        lineTotal: Number(l.lineTotal)
      })));
    } catch (err: any) {
      toast.error(err.message || "Failed to load invoice details");
      setView("list");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCancelInvoice = (invoiceId: string) => {
    if (!confirm("Are you sure you want to cancel this confirmed invoice? This will deduct the stock added by this invoice.")) {
      return;
    }

    const cancelPromise = (async () => {
      const res = await fetch(`/api/purchase-invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" })
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message || "Failed to cancel invoice");
      }

      fetchInvoices();
      return res;
    })();

    toast.promise(cancelPromise, {
      loading: "Cancelling purchase invoice in background...",
      success: "Purchase invoice cancelled.",
      error: (err) => err.message || "Failed to cancel invoice."
    });
  };

  // Add Inline Supplier
  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupName.trim()) return;

    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSupName.trim(),
          phone: newSupPhone.trim() || null,
          address: newSupAddress.trim() || null,
          gstin: newSupGstin.trim() || null
        })
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to create supplier");

      toast.success("Supplier created.");
      fetchSuppliers();
      setSupplierId(body.data.id);
      setSupplierSearch(body.data.name);
      setIsNewSupplierOpen(false);

      // Reset
      setNewSupName("");
      setNewSupPhone("");
      setNewSupAddress("");
      setNewSupGstin("");
    } catch (err: any) {
      toast.error(err.message || "Failed to create supplier");
    }
  };

  // Add Inline Material (Admin only)
  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatName.trim() || !newMatUnit || !newMatPurchase || !newMatTransfer || !newMatGstId) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const res = await fetch("/api/raw-materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryId,
          name: newMatName.trim(),
          unit: newMatUnit,
          purchasePrice: Number(newMatPurchase),
          transferPrice: Number(newMatTransfer),
          gstSlabId: Number(newMatGstId)
        })
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to create material");

      toast.success("Raw material created.");
      fetchRawMaterials();
      
      // Auto-add to lines
      const slab = gstSlabs.find(s => s.id === Number(newMatGstId));
      const added: RawMaterial = {
        id: body.data.id,
        name: body.data.name,
        unit: body.data.unit,
        purchasePrice: body.data.purchasePrice.toString(),
        gstRate: slab?.rate || "0",
        gstSlabId: body.data.gstSlabId,
        isActive: true
      };
      handleAddMaterial(added);
      setIsNewMaterialOpen(false);

      // Reset
      setNewMatName("");
      setNewMatPurchase("");
      setNewMatTransfer("");
      setNewMatGstId("");
    } catch (err: any) {
      toast.error(err.message || "Failed to create material");
    }
  };

  const handleOpenCreateNew = () => {
    setSupplierId("");
    setSupplierSearch("");
    setInvoiceNumber("");
    setInvoiceDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setOtherCharges("0");
    setOtherChargesGst("0");
    setLines([]);
    setView("create");
  };

  const isAllowed = userRole === "admin" || userRole === "storeroom";

  // Filter dropdowns
  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(supplierSearch.toLowerCase())
  );

  const filteredMaterials = rawMaterials.filter(m =>
    m.name.toLowerCase().includes(materialSearch.toLowerCase())
  );

  // ---------------- RENDERING VIEWS ----------------

  if (view === "list") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Purchase Invoices</h2>
          {isAllowed && (
            <Button onClick={handleOpenCreateNew} className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-medium h-10 px-4 rounded-md flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Purchase
            </Button>
          )}
        </div>

        {/* Pending Inbound Transfers Alert Section */}
        {pendingTransfers.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/20 dark:border-amber-900/30 dark:bg-amber-950/5 rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-800 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                Pending Inbound Stock Transfers ({pendingTransfers.length})
              </CardTitle>
              <p className="text-xs text-amber-700 dark:text-amber-500 font-medium">
                Other inventories have sent stock transfers to this inventory. Review and accept/reject them below to generate purchase invoices.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-amber-100 dark:border-amber-950/40 hover:bg-transparent">
                      <TableHead className="text-xs uppercase text-amber-800 dark:text-amber-400 font-medium pl-4">Source Inventory</TableHead>
                      <TableHead className="text-xs uppercase text-amber-800 dark:text-amber-400 font-medium">Date</TableHead>
                      <TableHead className="text-xs uppercase text-amber-800 dark:text-amber-400 font-medium text-center">Items</TableHead>
                      <TableHead className="text-xs uppercase text-amber-800 dark:text-amber-400 font-medium text-right">Value</TableHead>
                      <TableHead className="text-xs uppercase text-amber-800 dark:text-amber-400 font-medium text-right pr-4">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingTransfers.map((t) => (
                      <TableRow key={t.id} className="border-amber-100/50 dark:border-amber-950/20 hover:bg-amber-50/40">
                        <TableCell className="text-xs font-medium text-amber-900 dark:text-amber-300 pl-4">{t.fromInventoryName}</TableCell>
                        <TableCell className="text-xs text-amber-700 dark:text-amber-400">
                          {new Date(t.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                          })}
                        </TableCell>
                        <TableCell className="text-xs text-center font-mono text-amber-900 dark:text-amber-300">{t.itemsCount}</TableCell>
                        <TableCell className="text-xs text-right font-mono font-semibold text-amber-900 dark:text-amber-300">
                          ₹{Number(t.grandTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewTransfer(t.id)}
                            className="h-8 text-xs bg-white hover:bg-amber-100/20 border-amber-200 text-amber-800 font-medium shadow-sm"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)]">
              No purchase invoices logged.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[var(--border-default)] hover:bg-transparent">
                  <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium">Invoice No.</TableHead>
                  <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium">Supplier</TableHead>
                  <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium">Date</TableHead>
                  <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium text-center">Items</TableHead>
                  <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium text-right">Grand Total</TableHead>
                  <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium">Status</TableHead>
                  <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id} className="border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]">
                    <TableCell className="text-sm font-medium text-[var(--text-primary)] font-mono">
                      {inv.invoiceNumber}
                    </TableCell>
                    <TableCell className="text-xs text-[var(--text-secondary)] font-medium">
                      {inv.supplierName}
                    </TableCell>
                    <TableCell className="text-xs text-[var(--text-secondary)]">
                      {inv.invoiceDate}
                    </TableCell>
                    <TableCell className="text-xs text-[var(--text-secondary)] text-center font-mono">
                      {inv.itemsCount}
                    </TableCell>
                    <TableCell className="text-sm text-right font-mono font-semibold text-[var(--text-primary)]">
                      ₹{Number(inv.grandTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-xs">
                      {inv.status === "draft" && (
                        <Badge className="bg-[var(--state-info-bg)] text-[var(--state-info-text)] border border-[var(--state-info-border)] hover:bg-[var(--state-info-bg)]">Draft</Badge>
                      )}
                      {inv.status === "confirmed" && (
                        <Badge className="bg-[var(--state-success-bg)] text-[var(--state-success-text)] border border-[var(--state-success-border)] hover:bg-[var(--state-success-bg)]">Confirmed</Badge>
                      )}
                      {inv.status === "cancelled" && (
                        <Badge className="bg-[var(--state-error-bg)] text-[var(--state-error-text)] border border-[var(--state-error-border)] hover:bg-[var(--state-error-bg)]">Cancelled</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenView(inv.id)} className="h-8 w-8 p-0">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {isAllowed && inv.status === "draft" && (
                          <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(inv.id)} className="h-8 w-8 p-0 text-amber-600">
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {isAllowed && inv.status === "confirmed" && (
                          <Button variant="ghost" size="sm" onClick={() => handleCancelInvoice(inv.id)} className="h-8 w-8 p-0 text-[var(--state-error-text)]">
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

        {/* Review Inbound Transfer Dialog */}
        <Dialog open={reviewTransferOpen} onOpenChange={setReviewTransferOpen}>
          <DialogContent className="max-w-2xl bg-white border-[var(--border-default)] shadow-xl rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold text-[var(--text-primary)]">
                Review Inbound Stock Transfer
              </DialogTitle>
              <DialogDescription className="text-xs text-[var(--text-secondary)]">
                Verify transfer details and accept/reject it to add items to your stock.
              </DialogDescription>
            </DialogHeader>

            {loadingTransfer ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : reviewTransfer ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl p-4 text-xs">
                  <div>
                    <span className="text-[var(--text-muted)] font-medium">Source Inventory</span>
                    <p className="font-semibold text-sm mt-1">{reviewTransfer.fromInventoryName}</p>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] font-medium">Transfer Date</span>
                    <p className="font-semibold text-sm mt-1">
                      {new Date(reviewTransfer.createdAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[var(--text-muted)] font-medium">Notes</span>
                    <p className="mt-1 text-[var(--text-secondary)] bg-white p-2 rounded border border-[var(--border-default)] min-h-[40px]">
                      {reviewTransfer.notes || "No notes logged for this transfer"}
                    </p>
                  </div>
                </div>

                <div className="border border-[var(--border-default)] rounded-xl overflow-hidden max-h-[250px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10">
                      <TableRow className="border-[var(--border-default)] hover:bg-transparent">
                        <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium py-2.5 pl-4">Item Name</TableHead>
                        <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium py-2.5">Unit</TableHead>
                        <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium text-right py-2.5">Quantity</TableHead>
                        <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium text-right py-2.5">Unit Price</TableHead>
                        <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium text-right py-2.5 pr-4">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reviewTransfer.lines.map((line: any) => (
                        <TableRow key={line.id} className="border-[var(--border-subtle)]">
                          <TableCell className="text-xs font-semibold pl-4">{line.materialName}</TableCell>
                          <TableCell className="text-xs text-[var(--text-secondary)]">{line.unit}</TableCell>
                          <TableCell className="text-xs text-right font-mono font-medium">{Number(line.quantity).toFixed(3)}</TableCell>
                          <TableCell className="text-xs text-right font-mono">₹{Number(line.unitPrice).toFixed(2)}</TableCell>
                          <TableCell className="text-xs text-right font-mono font-semibold pr-4">₹{Number(line.lineTotal).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex flex-col items-end gap-1.5 text-xs pr-2">
                  <div className="flex justify-between w-64 border-b border-[var(--border-subtle)] pb-1.5 text-[var(--text-secondary)] font-medium">
                    <span>Subtotal</span>
                    <span className="font-mono">₹{Number(reviewTransfer.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between w-64 border-b border-[var(--border-subtle)] pb-1.5 text-[var(--text-secondary)] font-medium">
                    <span>Total GST</span>
                    <span className="font-mono">₹{Number(reviewTransfer.totalGst).toFixed(2)}</span>
                  </div>
                  {(Number(reviewTransfer.otherCharges) > 0 || Number(reviewTransfer.otherChargesGst) > 0) && (
                    <div className="flex justify-between w-64 border-b border-[var(--border-subtle)] pb-1.5 text-[var(--text-secondary)] font-medium">
                      <span>Other Charges (incl. GST)</span>
                      <span className="font-mono">₹{(Number(reviewTransfer.otherCharges) + Number(reviewTransfer.otherChargesGst)).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between w-64 pt-1 text-[var(--text-primary)] font-bold text-sm">
                    <span>Grand Total</span>
                    <span className="font-mono">₹{Number(reviewTransfer.grandTotal).toFixed(2)}</span>
                  </div>
                </div>

                <DialogFooter className="mt-4 flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setReviewTransferOpen(false)}
                    disabled={isRespondingTransfer}
                    className="h-9 text-xs"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => handleRespondTransfer("rejected")}
                    disabled={isRespondingTransfer}
                    variant="outline"
                    className="border-red-600 text-red-600 hover:bg-red-50 h-9 text-xs font-semibold"
                  >
                    Reject
                  </Button>
                  <Button
                    onClick={() => handleRespondTransfer("accepted")}
                    disabled={isRespondingTransfer}
                    className="bg-green-600 hover:bg-green-700 text-white h-9 text-xs font-semibold"
                  >
                    {isRespondingTransfer ? "Accepting..." : "Accept & Generate Purchase Invoice"}
                  </Button>
                </DialogFooter>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (view === "view") {
    if (loadingDetail || !detailInvoice) {
      return (
        <div className="p-6 space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      );
    }

    const inv = detailInvoice;

    return (
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex justify-between items-center pb-3 border-b border-[var(--border-default)]">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Invoice details: <span className="font-mono">{inv.invoiceNumber}</span>
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-1">Logged: {new Date(inv.createdAt).toLocaleString("en-IN")}</p>
          </div>
          <div className="flex items-center gap-2">
            {inv.status === "draft" && <Badge className="bg-[var(--state-info-bg)] text-[var(--state-info-text)]">Draft</Badge>}
            {inv.status === "confirmed" && <Badge className="bg-[var(--state-success-bg)] text-[var(--state-success-text)]">Confirmed</Badge>}
            {inv.status === "cancelled" && <Badge className="bg-[var(--state-error-bg)] text-[var(--state-error-text)]">Cancelled</Badge>}
            <Button variant="outline" size="sm" onClick={() => setView("list")} className="h-9">
              Back to List
            </Button>
          </div>
        </div>

        {/* Invoice Header Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl p-4 text-sm">
          <div>
            <p className="text-[var(--text-muted)] font-medium">Supplier</p>
            <p className="font-semibold mt-1">{inv.supplierName}</p>
            {inv.supplierPhone && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{inv.supplierPhone}</p>}
            {inv.supplierGstin && <p className="text-xs text-[var(--text-secondary)] mt-0.5">GSTIN: {inv.supplierGstin}</p>}
          </div>
          <div>
            <p className="text-[var(--text-muted)] font-medium">Invoice Date</p>
            <p className="font-semibold mt-1">{inv.invoiceDate}</p>
          </div>
          <div>
            <p className="text-[var(--text-muted)] font-medium">Notes</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1 whitespace-pre-wrap">
              {inv.notes || "No notes logged for this invoice"}
            </p>
          </div>
        </div>

        {/* Invoice Lines Table */}
        <Card className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="border-[var(--border-default)] hover:bg-transparent">
                <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium">Item Name</TableHead>
                <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium">Unit</TableHead>
                <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium text-right">Quantity</TableHead>
                <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium text-right">Unit Price</TableHead>
                <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium text-right">GST Rate</TableHead>
                <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium text-right">Total Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inv.lines.map((line: any) => (
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

        {/* Totals Summary */}
        <div className="flex flex-col items-end gap-2 text-sm pr-4">
          <div className="flex justify-between w-64 border-b border-[var(--border-subtle)] pb-1.5 text-[var(--text-secondary)]">
            <span>Subtotal (excl. GST)</span>
            <span className="font-mono">₹{Number(inv.subtotal).toFixed(2)}</span>
          </div>
          <div className="flex justify-between w-64 border-b border-[var(--border-subtle)] pb-1.5 text-[var(--text-secondary)]">
            <span>Total GST</span>
            <span className="font-mono">₹{Number(inv.totalGst).toFixed(2)}</span>
          </div>
          {Number(inv.otherCharges) > 0 && (
            <div className="flex justify-between w-64 border-b border-[var(--border-subtle)] pb-1.5 text-[var(--text-secondary)]">
              <span>Other Charges</span>
              <span className="font-mono">₹{Number(inv.otherCharges).toFixed(2)}</span>
            </div>
          )}
          {Number(inv.otherChargesGst) > 0 && (
            <div className="flex justify-between w-64 border-b border-[var(--border-subtle)] pb-1.5 text-[var(--text-secondary)]">
              <span>Other Charges GST</span>
              <span className="font-mono">₹{Number(inv.otherChargesGst).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between w-64 text-base font-semibold text-[var(--text-primary)] pt-1">
            <span>Grand Total</span>
            <span className="font-mono">₹{Number(inv.grandTotal).toFixed(2)}</span>
          </div>
        </div>
      </div>
    );
  }

  // Create / Edit View
  if (view === "create" || view === "edit") {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-[var(--border-default)]">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            {view === "edit" ? "Edit Purchase Invoice" : "Create Purchase Invoice"}
          </h2>
          <Button variant="outline" size="sm" onClick={() => setView("list")} className="h-9">
            Cancel
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Form left */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl p-4">
              {/* Supplier Search */}
              <div className="space-y-1.5 relative">
                <Label className="text-sm font-medium text-[var(--text-primary)]">Supplier *</Label>
                <div className="flex gap-1.5">
                  <Input
                    value={supplierSearch}
                    onChange={(e) => {
                      setSupplierSearch(e.target.value);
                      setShowSupplierDropdown(true);
                      if (supplierId) setSupplierId(""); // reset selected ID if they type
                    }}
                    onFocus={() => setShowSupplierDropdown(true)}
                    placeholder="Search supplier..."
                    className="h-10 border-[var(--border-default)] bg-white text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsNewSupplierOpen(true)}
                    className="px-2.5 h-10 shrink-0 border-[var(--border-default)] text-xs font-semibold"
                  >
                    + New
                  </Button>
                </div>

                {/* Custom searchable list */}
                {showSupplierDropdown && supplierSearch && (
                  <div className="absolute top-16 left-0 right-0 z-50 max-h-40 overflow-y-auto bg-white border border-[var(--border-default)] rounded-md shadow-lg p-1 space-y-0.5">
                    {filteredSuppliers.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSupplierId(s.id);
                          setSupplierSearch(s.name);
                          setShowSupplierDropdown(false);
                        }}
                        className="w-full text-left px-2 py-1.5 hover:bg-[var(--bg-hover)] rounded text-xs"
                      >
                        {s.name}
                      </button>
                    ))}
                    {filteredSuppliers.length === 0 && (
                      <p className="text-xs text-[var(--text-muted)] p-2">No suppliers found.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Invoice Number */}
              <div className="space-y-1.5">
                <Label htmlFor="inv-no" className="text-sm font-medium text-[var(--text-primary)]">Invoice Number *</Label>
                <Input
                  id="inv-no"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="Supplier's Invoice No."
                  className="h-10 border-[var(--border-default)] bg-white text-sm"
                />
              </div>

              {/* Invoice Date */}
              <div className="space-y-1.5">
                <Label htmlFor="inv-date" className="text-sm font-medium text-[var(--text-primary)]">Invoice Date *</Label>
                <Input
                  id="inv-date"
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="h-10 border-[var(--border-default)] bg-white text-sm"
                />
              </div>
            </div>

            {/* Line Items Table & Add Material */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Invoice Items</h3>

                {/* Material Search and Inline Creation */}
                <div className="relative w-72 flex gap-1.5">
                  <Input
                    value={materialSearch}
                    onChange={(e) => {
                      setMaterialSearch(e.target.value);
                      setShowMaterialDropdown(true);
                    }}
                    onFocus={() => setShowMaterialDropdown(true)}
                    placeholder="Search/Add raw material..."
                    className="h-9 border-[var(--border-default)] bg-[var(--bg-surface)] text-xs"
                  />
                  {userRole === "admin" && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsNewMaterialOpen(true)}
                      className="px-2 h-9 shrink-0 border-[var(--border-default)] text-xs"
                    >
                      + New
                    </Button>
                  )}

                  {/* Material Search Dropdown */}
                  {showMaterialDropdown && materialSearch && (
                    <div className="absolute top-10 left-0 right-0 z-50 max-h-40 overflow-y-auto bg-white border border-[var(--border-default)] rounded-md shadow-lg p-1 space-y-0.5">
                      {filteredMaterials.map(m => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleAddMaterial(m)}
                          className="w-full text-left px-2 py-1.5 hover:bg-[var(--bg-hover)] rounded text-xs"
                        >
                          {m.name} ({m.unit})
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
                    No items added. Use the search bar above to select raw materials.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[var(--border-default)] hover:bg-transparent">
                        <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium">Material Name</TableHead>
                        <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium w-16">Unit</TableHead>
                        <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium text-right w-24">Quantity</TableHead>
                        <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium text-right w-28">Unit Price</TableHead>
                        <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium text-right w-20">GST</TableHead>
                        <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium text-right w-32">Total Price</TableHead>
                        <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium text-right w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((line, idx) => (
                        <TableRow key={line.rawMaterialId} className="border-[var(--border-subtle)]">
                          <TableCell className="text-sm font-medium text-[var(--text-primary)]">
                            {line.materialName}
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
                              className="h-8 w-20 text-right font-mono text-xs border-[var(--border-default)] bg-white"
                              required
                            />
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
                      ))}
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
                Invoice Summary
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
                  <Label htmlFor="charges" className="text-xs">Other Charges</Label>
                  <Input
                    id="charges"
                    type="number"
                    value={otherCharges}
                    onChange={(e) => setOtherCharges(e.target.value)}
                    className="h-8 text-right font-mono text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 items-center">
                  <Label htmlFor="charges-gst" className="text-xs">Charges GST</Label>
                  <Input
                    id="charges-gst"
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

              <div className="space-y-1.5 pt-2">
                <Label htmlFor="notes" className="text-xs font-medium">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Supplier remarks..."
                  rows={3}
                  className="border-[var(--border-default)] bg-white text-xs"
                />
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <Button
                  type="button"
                  onClick={() => handleOpenConfirm("confirmed")}
                  className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white w-full h-10"
                >
                  Confirm Invoice
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

        {/* Confirm Invoice Dialog */}
        <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
          <DialogContent className="max-w-sm bg-[var(--bg-surface)] border-[var(--border-default)] rounded-xl shadow-lg">
            <DialogHeader className="flex flex-col items-center">
              <AlertTriangle className="h-10 w-10 text-[var(--state-warning-border)] mb-2" />
              <DialogTitle className="text-base font-semibold text-[var(--text-primary)] text-center">Confirm Invoice</DialogTitle>
              <DialogDescription className="text-xs text-[var(--text-secondary)] text-center mt-1">
                Confirming this invoice will add stock to the inventory.
                This action cannot be undone without cancelling the invoice.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 justify-center pt-2">
              <Button
                variant="outline"
                onClick={() => setIsConfirmDialogOpen(false)}
                className="border-[var(--border-default)]"
              >
                No, Go Back
              </Button>
              <Button
                onClick={() => submitForm("confirmed")}
                disabled={isSubmitting}
                className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white"
              >
                {isSubmitting ? "Confirming..." : "Yes, Confirm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* New Supplier Dialog inline */}
        <Dialog open={isNewSupplierOpen} onOpenChange={setIsNewSupplierOpen}>
          <DialogContent className="max-w-md bg-[var(--bg-surface)] border-[var(--border-default)] rounded-xl shadow-lg">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold">Add New Supplier</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateSupplier} className="space-y-3.5">
              <div className="space-y-1">
                <Label htmlFor="sup-name" className="text-xs font-medium">Supplier Name *</Label>
                <Input
                  id="sup-name"
                  value={newSupName}
                  onChange={(e) => setNewSupName(e.target.value)}
                  placeholder="e.g. Flour Wholesaler"
                  required
                  className="h-9 border-[var(--border-default)] text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sup-phone" className="text-xs font-medium">Phone</Label>
                <Input
                  id="sup-phone"
                  value={newSupPhone}
                  onChange={(e) => setNewSupPhone(e.target.value)}
                  placeholder="Phone number"
                  className="h-9 border-[var(--border-default)] text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sup-addr" className="text-xs font-medium">Address</Label>
                <Input
                  id="sup-addr"
                  value={newSupAddress}
                  onChange={(e) => setNewSupAddress(e.target.value)}
                  placeholder="Supplier address"
                  className="h-9 border-[var(--border-default)] text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sup-gst" className="text-xs font-medium">GSTIN</Label>
                <Input
                  id="sup-gst"
                  value={newSupGstin}
                  onChange={(e) => setNewSupGstin(e.target.value)}
                  placeholder="15-character GSTIN"
                  className="h-9 border-[var(--border-default)] text-xs"
                />
              </div>
              <DialogFooter className="pt-2">
                <Button variant="outline" type="button" onClick={() => setIsNewSupplierOpen(false)} className="border-[var(--border-default)] h-9 text-xs">
                  Cancel
                </Button>
                <Button type="submit" className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white h-9 text-xs">
                  Save Supplier
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* New Material Dialog inline */}
        <Dialog open={isNewMaterialOpen} onOpenChange={setIsNewMaterialOpen}>
          <DialogContent className="max-w-md bg-[var(--bg-surface)] border-[var(--border-default)] rounded-xl shadow-lg">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold">Add New Raw Material</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateMaterial} className="space-y-3.5">
              <div className="space-y-1">
                <Label htmlFor="inline-mat-name" className="text-xs font-medium">Material Name *</Label>
                <Input
                  id="inline-mat-name"
                  value={newMatName}
                  onChange={(e) => setNewMatName(e.target.value)}
                  placeholder="e.g. Cocoa Powder"
                  required
                  className="h-9 border-[var(--border-default)] text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <Label htmlFor="inline-mat-unit" className="text-xs font-medium">Unit *</Label>
                  <Select value={newMatUnit} onValueChange={(val) => setNewMatUnit(val || "")}>
                    <SelectTrigger id="inline-mat-unit" className="border-[var(--border-default)] h-9 text-xs">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[var(--border-default)]">
                      {["kg", "litre", "pcs", "gram", "ml", "box", "pack"].map(u => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="inline-mat-gst" className="text-xs font-medium">GST Slab *</Label>
                  <Select value={newMatGstId} onValueChange={(val) => setNewMatGstId(val || "")}>
                    <SelectTrigger id="inline-mat-gst" className="border-[var(--border-default)] h-9 text-xs">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[var(--border-default)]">
                      {gstSlabs.map(s => (
                        <SelectItem key={s.id} value={s.id.toString()}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <Label htmlFor="inline-mat-purchase" className="text-xs font-medium">Purchase Price *</Label>
                  <Input
                    id="inline-mat-purchase"
                    type="number"
                    step="0.01"
                    value={newMatPurchase}
                    onChange={(e) => setNewMatPurchase(e.target.value)}
                    placeholder="0.00"
                    required
                    className="h-9 border-[var(--border-default)] text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="inline-mat-transfer" className="text-xs font-medium">Transfer Price *</Label>
                  <Input
                    id="inline-mat-transfer"
                    type="number"
                    step="0.01"
                    value={newMatTransfer}
                    onChange={(e) => setNewMatTransfer(e.target.value)}
                    placeholder="0.00"
                    required
                    className="h-9 border-[var(--border-default)] text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button variant="outline" type="button" onClick={() => setIsNewMaterialOpen(false)} className="border-[var(--border-default)] h-9 text-xs">
                  Cancel
                </Button>
                <Button type="submit" className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white h-9 text-xs">
                  Save Material
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return null;
}
