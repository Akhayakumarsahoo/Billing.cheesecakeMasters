"use client";

import React, { useState, useEffect } from "react";
import { Package, AlertTriangle, List, Link as LinkIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface LinkedOutlet {
  id: string;
  name: string;
  isActive: boolean;
}

interface Inventory {
  id: string;
  name: string;
  address: string | null;
  isActive: boolean;
  linkedOutlets: LinkedOutlet[];
}

interface ActiveOutlet {
  id: string;
  name: string;
}

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  currentStock: string;
  lowStockAlert: string | null;
  isActive: boolean;
}

interface OverviewTabProps {
  inventory: Inventory;
  activeOutlets: ActiveOutlet[];
  userRole: string;
  onUpdateInventory: (inv: Inventory) => void;
}

export function OverviewTab({
  inventory,
  activeOutlets,
  userRole,
  onUpdateInventory
}: OverviewTabProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalMaterials: 0, lowStockCount: 0, totalValuation: "0" });
  const [materials, setMaterials] = useState<RawMaterial[]>([]);

  useEffect(() => {
    fetchDetails();
  }, [inventory.id]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const [resDetails, resMaterials] = await Promise.all([
        fetch(`/api/inventory/${inventory.id}`),
        fetch(`/api/raw-materials?inventoryId=${inventory.id}`)
      ]);

      if (!resDetails.ok) throw new Error("Failed to load details");
      if (!resMaterials.ok) throw new Error("Failed to load stock levels");

      const bodyDetails = await resDetails.json();
      const bodyMaterials = await resMaterials.json();

      setStats(bodyDetails.data.stats);
      const activeItems = (bodyMaterials.data as RawMaterial[]).filter(m => m.isActive);
      setMaterials(activeItems);
    } catch (err: any) {
      toast.error(err.message || "Failed to load overview data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-sm font-medium text-[var(--text-secondary)]">Stock Valuation</span>
            <Package className="h-4 w-4 text-[var(--text-secondary)]" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-semibold text-[var(--text-primary)]">
                ₹{Number(stats.totalValuation || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            )}
            <p className="text-xs text-[var(--text-muted)] mt-1">Total worth of active stock</p>
          </CardContent>
        </Card>

        <Card className="bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-sm font-medium text-[var(--text-secondary)]">Low Stock Alerts</span>
            <AlertTriangle className="h-4 w-4 text-[var(--state-warning-border)]" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className={`text-2xl font-semibold ${stats.lowStockCount > 0 ? "text-[var(--state-error-text)]" : "text-[var(--text-primary)]"}`}>
                {stats.lowStockCount}
              </div>
            )}
            <p className="text-xs text-[var(--text-muted)] mt-1">Below target stock level</p>
          </CardContent>
        </Card>

        <Card className="bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-sm font-medium text-[var(--text-secondary)]">Outlet Mappings</span>
            <LinkIcon className="h-4 w-4 text-[var(--text-secondary)]" />
          </CardHeader>
          <CardContent className="flex flex-col justify-between h-[calc(100%-48px)]">
            <div>
              <div className="text-xl font-semibold text-[var(--text-primary)] truncate">
                {inventory.linkedOutlets.length > 0
                  ? `${inventory.linkedOutlets.length} Linked`
                  : "Standalone Store"}
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-1 truncate max-w-[220px]">
                {inventory.linkedOutlets.length > 0
                  ? inventory.linkedOutlets.map((o) => o.name).join(", ")
                  : "Functions as a storage warehouse"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Stock Levels */}
      <div>
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-1.5">
          <Package className="h-4 w-4" />
          Current Stock Levels
        </h2>
        <Card className="bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : materials.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)]">
              No active raw materials found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[var(--border-default)] hover:bg-transparent">
                  <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium">Material Name</TableHead>
                  <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium">Unit</TableHead>
                  <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium text-right">Current Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials.map((m) => {
                  const stock = Number(m.currentStock || 0);
                  const alert = m.lowStockAlert ? Number(m.lowStockAlert) : null;
                  const isLowStock = alert !== null && stock < alert;

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
                        {(stock || 0).toFixed(3)}
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
  );
}
