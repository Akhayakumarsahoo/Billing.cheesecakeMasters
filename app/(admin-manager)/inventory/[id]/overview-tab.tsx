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

interface StockMovement {
  id: string;
  movementType: string;
  referenceType: string;
  referenceId: string | null;
  quantityChange: string;
  note: string | null;
  createdAt: string;
  materialName: string;
  unit: string;
  creatorName: string;
  creatorEmail: string;
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
  const [recentMovements, setRecentMovements] = useState<StockMovement[]>([]);

  useEffect(() => {
    fetchDetails();
  }, [inventory.id]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/inventory/${inventory.id}`);
      if (!res.ok) throw new Error("Failed to load details");
      const body = await res.json();
      setStats(body.data.stats);
      setRecentMovements(body.data.recentMovements);
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

      {/* Recent stock movements log */}
      <div>
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-1.5">
          <List className="h-4 w-4" />
          Recent Stock Movements
        </h2>
        <Card className="bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : recentMovements.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)]">
              No stock movements recorded yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[var(--border-default)] hover:bg-transparent">
                  <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium">Material</TableHead>
                  <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium">Type</TableHead>
                  <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium text-right">Change</TableHead>
                  <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium">Reference</TableHead>
                  <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium">By User</TableHead>
                  <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium">Date & Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentMovements.map((move) => {
                  const val = Number(move.quantityChange);
                  const isPositive = val > 0;
                  return (
                    <TableRow key={move.id} className="border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]">
                      <TableCell className="text-sm font-medium text-[var(--text-primary)]">
                        {move.materialName}
                      </TableCell>
                      <TableCell className="text-xs capitalize font-medium text-[var(--text-secondary)]">
                        {move.movementType.replace("_", " ")}
                      </TableCell>
                      <TableCell className={`font-mono text-sm text-right font-semibold ${isPositive ? "text-[var(--state-success-text)]" : "text-[var(--state-error-text)]"}`}>
                        {isPositive ? `+${val.toFixed(3)}` : val.toFixed(3)} {move.unit}
                      </TableCell>
                      <TableCell className="text-xs text-[var(--text-secondary)] font-mono">
                        {move.referenceType.replace("_", " ")}
                      </TableCell>
                      <TableCell className="text-xs text-[var(--text-secondary)]">
                        {move.creatorName}
                      </TableCell>
                      <TableCell className="text-xs text-[var(--text-muted)]">
                        {new Date(move.createdAt).toLocaleString("en-IN")}
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
