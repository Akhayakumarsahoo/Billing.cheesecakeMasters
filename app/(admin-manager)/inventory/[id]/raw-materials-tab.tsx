"use client";

import React, { useState, useEffect } from "react";
import { Plus, Search, MoreVertical, Edit, Power, PowerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface GstSlab {
  id: number;
  rate: string;
  label: string;
}

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  purchasePrice: string;
  transferPrice: string;
  currentStock: string;
  lowStockAlert: string | null;
  isActive: boolean;
  gstSlabId: number;
  gstRate: string;
}

interface RawMaterialsTabProps {
  inventoryId: string;
  gstSlabs: GstSlab[];
  userRole: string;
}

export function RawMaterialsTab({
  inventoryId,
  gstSlabs,
  userRole
}: RawMaterialsTabProps) {
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Dialog State
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("kg");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [transferPrice, setTransferPrice] = useState("");
  const [gstSlabId, setGstSlabId] = useState("");
  const [lowStockAlert, setLowStockAlert] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const unitsList = ["kg", "litre", "pcs", "gram", "ml", "box", "pack"];

  useEffect(() => {
    fetchMaterials();
  }, [inventoryId]);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/raw-materials?inventoryId=${inventoryId}`);
      if (!res.ok) throw new Error("Failed to load materials");
      const body = await res.json();
      setMaterials(body.data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load raw materials");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setName("");
    setUnit("kg");
    setPurchasePrice("");
    setTransferPrice("");
    setGstSlabId(gstSlabs[2]?.id?.toString() || ""); // default to 18% if exists, or first
    setLowStockAlert("");
    setIsOpen(true);
  };

  const handleOpenEdit = (m: RawMaterial) => {
    setEditingId(m.id);
    setName(m.name);
    setUnit(m.unit);
    setPurchasePrice(m.purchasePrice);
    setTransferPrice(m.transferPrice);
    setGstSlabId(m.gstSlabId.toString());
    setLowStockAlert(m.lowStockAlert || "");
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !unit.trim() || !purchasePrice || !transferPrice || !gstSlabId) {
      toast.error("Please fill all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const isEdit = !!editingId;
      const url = isEdit ? `/api/raw-materials/${editingId}` : `/api/raw-materials`;
      const method = isEdit ? "PATCH" : "POST";

      const payload = {
        inventoryId,
        name: name.trim(),
        unit: unit.trim(),
        purchasePrice: Number(purchasePrice),
        transferPrice: Number(transferPrice),
        gstSlabId: Number(gstSlabId),
        lowStockAlert: lowStockAlert ? Number(lowStockAlert) : null
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to save raw material");

      toast.success(isEdit ? "Raw material updated." : "Raw material created.");
      setIsOpen(false);
      fetchMaterials();
    } catch (err: any) {
      toast.error(err.message || "Failed to save material.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (m: RawMaterial) => {
    try {
      const res = await fetch(`/api/raw-materials/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: !m.isActive
        })
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message || "Failed to toggle status");
      }

      toast.success(m.isActive ? "Raw material deactivated." : "Raw material activated.");
      fetchMaterials();
    } catch (err: any) {
      toast.error(err.message || "Failed to change status.");
    }
  };

  const filtered = materials.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const isAdmin = userRole === "admin";

  return (
    <div className="space-y-4">
      {/* Top Filter and Add Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
          <Input
            placeholder="Search raw materials..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 bg-[var(--bg-surface)] border-[var(--border-default)] rounded-md"
          />
        </div>

        {isAdmin && (
          <Button onClick={handleOpenCreate} className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-medium h-10 px-4 rounded-md flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Material
          </Button>
        )}
      </div>

      {/* Materials Table */}
      <Card className="bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-xs text-[var(--text-muted)]">
            No raw materials found.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-[var(--border-default)] hover:bg-transparent">
                <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium">Name</TableHead>
                <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium">Unit</TableHead>
                <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium text-right">Current Stock</TableHead>
                <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium text-right">Purchase Price</TableHead>
                <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium text-right">Transfer Price</TableHead>
                <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium">GST Rate</TableHead>
                <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium">Status</TableHead>
                {isAdmin && <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m) => {
                const stock = Number(m.currentStock);
                const alert = m.lowStockAlert ? Number(m.lowStockAlert) : null;
                const isLowStock = alert !== null && stock < alert;

                return (
                  <TableRow key={m.id} className="border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]">
                    <TableCell className="text-sm font-medium text-[var(--text-primary)]">
                      {m.name}
                    </TableCell>
                    <TableCell className="text-xs text-[var(--text-secondary)] font-medium">
                      {m.unit}
                    </TableCell>
                    <TableCell className={`text-sm text-right font-mono font-semibold ${isLowStock ? "text-[var(--state-error-text)] bg-[var(--state-error-bg)] rounded px-1" : "text-[var(--text-primary)]"}`}>
                      {stock.toFixed(3)}
                    </TableCell>
                    <TableCell className="text-sm text-right font-mono text-[var(--text-secondary)]">
                      ₹{Number(m.purchasePrice).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-sm text-right font-mono text-[var(--text-secondary)]">
                      ₹{Number(m.transferPrice).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-xs text-[var(--text-secondary)] font-mono">
                      {m.gstRate}%
                    </TableCell>
                    <TableCell className="text-xs">
                      {m.isActive ? (
                        <Badge variant="outline" className="border-[var(--state-success-border)] text-[var(--state-success-text)] bg-[var(--state-success-bg)]">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-[var(--state-error-border)] text-[var(--state-error-text)] bg-[var(--state-error-bg)]">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 w-8 p-0" />}>
                            <MoreVertical className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[var(--bg-surface)] border-[var(--border-default)] shadow-md">
                            <DropdownMenuItem onClick={() => handleOpenEdit(m)} className="cursor-pointer flex items-center gap-2">
                              <Edit className="h-3.5 w-3.5" />
                              <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleActive(m)} className="cursor-pointer flex items-center gap-2 text-[var(--state-error-text)] focus:text-[var(--state-error-text)]">
                              {m.isActive ? (
                                <>
                                  <PowerOff className="h-3.5 w-3.5" />
                                  <span>Deactivate</span>
                                </>
                              ) : (
                                <>
                                  <Power className="h-3.5 w-3.5" />
                                  <span>Activate</span>
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md bg-[var(--bg-surface)] border-[var(--border-default)] rounded-xl shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-medium">
              {editingId ? "Edit Raw Material" : "Create Raw Material"}
            </DialogTitle>
            <DialogDescription className="text-sm text-[var(--text-secondary)]">
              Specify the material details. Scoped to the current inventory.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="mat-name" className="text-sm font-medium">Material Name *</Label>
              <Input
                id="mat-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Flour"
                required
                className="border-[var(--border-default)] h-10"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="mat-unit" className="text-sm font-medium">Unit *</Label>
                <Select value={unit} onValueChange={(val) => setUnit(val || "")}>
                  <SelectTrigger id="mat-unit" className="border-[var(--border-default)] h-10">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[var(--border-default)]">
                    {unitsList.map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mat-gst" className="text-sm font-medium">GST Slab *</Label>
                <Select value={gstSlabId} onValueChange={(val) => setGstSlabId(val || "")}>
                  <SelectTrigger id="mat-gst" className="border-[var(--border-default)] h-10">
                    <SelectValue placeholder="Select GST" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[var(--border-default)]">
                    {gstSlabs.map(slab => (
                      <SelectItem key={slab.id} value={slab.id.toString()}>
                        {slab.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="mat-purchase" className="text-sm font-medium">Purchase Price * (excl. GST)</Label>
                <Input
                  id="mat-purchase"
                  type="number"
                  step="0.01"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  placeholder="0.00"
                  required
                  className="border-[var(--border-default)] h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mat-transfer" className="text-sm font-medium">Transfer Price *</Label>
                <Input
                  id="mat-transfer"
                  type="number"
                  step="0.01"
                  value={transferPrice}
                  onChange={(e) => setTransferPrice(e.target.value)}
                  placeholder="0.00"
                  required
                  className="border-[var(--border-default)] h-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mat-alert" className="text-sm font-medium">Low Stock Alert Quantity (optional)</Label>
              <Input
                id="mat-alert"
                type="number"
                step="0.001"
                value={lowStockAlert}
                onChange={(e) => setLowStockAlert(e.target.value)}
                placeholder="Alert threshold"
                className="border-[var(--border-default)] h-10"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="border-[var(--border-default)]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white"
              >
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
