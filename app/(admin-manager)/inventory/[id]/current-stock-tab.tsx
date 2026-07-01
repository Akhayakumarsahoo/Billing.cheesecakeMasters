"use client";

import React, { useState, useEffect } from "react";
import { Search, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  currentStock: string;
  lowStockAlert: string | null;
  isActive: boolean;
}

interface CurrentStockTabProps {
  inventoryId: string;
  userRole: string;
}

export function CurrentStockTab({ inventoryId, userRole }: CurrentStockTabProps) {
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Track edited values as string to allow precise typing
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [savingRows, setSavingRows] = useState<Record<string, boolean>>({});
  const [savingAll, setSavingAll] = useState(false);

  useEffect(() => {
    fetchStock();
  }, [inventoryId]);

  const fetchStock = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/raw-materials?inventoryId=${inventoryId}`);
      if (!res.ok) throw new Error("Failed to load stock levels");
      const body = await res.json();
      // Only keep active raw materials for stock adjustments
      const activeItems = (body.data as RawMaterial[]).filter(m => m.isActive);
      setMaterials(activeItems);
      // Reset adjustments state
      setEditedValues({});
    } catch (err: any) {
      toast.error(err.message || "Failed to load current stock.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (id: string, value: string) => {
    // Only permit positive/negative floats with up to 3 decimals temporarily
    setEditedValues((prev) => ({
      ...prev,
      [id]: value
    }));
  };

  const hasUnsavedChanges = (m: RawMaterial) => {
    const newVal = editedValues[m.id];
    if (newVal === undefined) return false;
    const oldStock = Number(m.currentStock);
    const newStock = Number(newVal);
    return !isNaN(newStock) && newStock !== oldStock;
  };

  const handleSaveRow = async (m: RawMaterial) => {
    const value = editedValues[m.id];
    if (value === undefined) return;

    const targetStock = Number(value);
    if (isNaN(targetStock) || targetStock < 0) {
      toast.error("Please enter a valid non-negative number.");
      return;
    }

    setSavingRows((prev) => ({ ...prev, [m.id]: true }));
    try {
      const res = await fetch("/api/raw-materials/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryId,
          adjustments: [{ rawMaterialId: m.id, targetStock }]
        })
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to save adjustment");

      toast.success(`Stock level adjusted for ${m.name}`);
      // Remove this row from local edited records
      setEditedValues(prev => {
        const copy = { ...prev };
        delete copy[m.id];
        return copy;
      });
      fetchStock();
    } catch (err: any) {
      toast.error(err.message || "Failed to save adjustment.");
    } finally {
      setSavingRows((prev) => ({ ...prev, [m.id]: false }));
    }
  };

  const handleSaveAll = async () => {
    const adjustmentsList = materials
      .filter(hasUnsavedChanges)
      .map((m) => {
        const val = Number(editedValues[m.id]);
        return { rawMaterialId: m.id, targetStock: val };
      })
      .filter((adj) => !isNaN(adj.targetStock) && adj.targetStock >= 0);

    if (adjustmentsList.length === 0) {
      toast.info("No changed rows to save.");
      return;
    }

    setSavingAll(true);
    try {
      const res = await fetch("/api/raw-materials/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryId,
          adjustments: adjustmentsList
        })
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to save batch adjustments");

      toast.success(`Batch adjustment saved for ${adjustmentsList.length} items`);
      setEditedValues({});
      fetchStock();
    } catch (err: any) {
      toast.error(err.message || "Failed to save batch adjustments.");
    } finally {
      setSavingAll(false);
    }
  };

  const filtered = materials.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const editedCount = materials.filter(hasUnsavedChanges).length;
  const isAllowed = userRole === "admin" || userRole === "storeroom";

  return (
    <div className="space-y-4">
      {/* Top Filter and Batch Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
          <Input
            placeholder="Filter items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 bg-[var(--bg-surface)] border-[var(--border-default)] rounded-md"
          />
        </div>

        {isAllowed && (
          <Button
            onClick={handleSaveAll}
            disabled={editedCount === 0 || savingAll}
            className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-medium h-10 px-4 rounded-md flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Save All ({editedCount})
          </Button>
        )}
      </div>

      {/* Stock Levels List */}
      <Card className="bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-xs text-[var(--text-muted)]">
            No active raw materials found.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-[var(--border-default)] hover:bg-transparent">
                <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium">Name</TableHead>
                <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium">Unit</TableHead>
                <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium text-right w-36">Current Stock</TableHead>
                {isAllowed && (
                  <>
                    <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium text-right w-44">Adjust Stock</TableHead>
                    <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium text-right w-24">Action</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m) => {
                const stock = Number(m.currentStock);
                const alert = m.lowStockAlert ? Number(m.lowStockAlert) : null;
                const isLowStock = alert !== null && stock < alert;

                const inputValue = editedValues[m.id] !== undefined ? editedValues[m.id] : m.currentStock;
                const isChanged = hasUnsavedChanges(m);

                return (
                  <TableRow key={m.id} className="border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]">
                    <TableCell className="text-sm font-medium text-[var(--text-primary)]">
                      {m.name}
                      {isLowStock && (
                        <span className="ml-2 text-[10px] bg-[var(--state-error-bg)] text-[var(--state-error-text)] px-1.5 py-0.5 rounded font-semibold border border-[var(--state-error-border)]">
                          LOW STOCK
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-[var(--text-secondary)] font-medium font-mono">
                      {m.unit}
                    </TableCell>
                    <TableCell className="text-sm text-right font-mono font-semibold text-[var(--text-primary)]">
                      {stock.toFixed(3)}
                    </TableCell>
                    {isAllowed && (
                      <>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Input
                              type="number"
                              step="0.001"
                              value={inputValue}
                              onChange={(e) => handleInputChange(m.id, e.target.value)}
                              className={`h-9 w-28 text-right font-mono text-sm border-[var(--border-default)] ${
                                isChanged ? "border-amber-500 ring-1 ring-amber-500 focus-visible:ring-amber-500 bg-amber-50/20" : ""
                              }`}
                            />
                            <span className="text-xs text-[var(--text-muted)] w-8 text-left">{m.unit}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSaveRow(m)}
                            disabled={!isChanged || savingRows[m.id]}
                            className={`h-9 px-3 ${
                              isChanged ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50" : "text-gray-400"
                            }`}
                          >
                            {savingRows[m.id] ? "Saving..." : "Save"}
                          </Button>
                        </TableCell>
                      </>
                    )}
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
