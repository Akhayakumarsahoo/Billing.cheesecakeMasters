"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Search, RefreshCw, History, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter, useSearchParams } from "next/navigation";
import { DateRangeFilter } from "@/components/date-range-filter";

interface ManualMovement {
  id: string;
  createdAt: string;
  materialName: string;
  unit: string;
  quantityChange: number;
  note: string | null;
  createdByName: string;
  createdByEmail: string;
}

interface ManualMovementsTabProps {
  inventoryId: string;
  userRole: string;
}

export function ManualMovementsTab({ inventoryId, userRole }: ManualMovementsTabProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<ManualMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [direction, setDirection] = useState("all");

  useEffect(() => {
    fetchMovements();
  }, [inventoryId, searchParams, direction]);

  const fetchMovements = async () => {
    try {
      setLoading(true);
      const fromVal = searchParams.get("from");
      const toVal = searchParams.get("to");

      const params = new URLSearchParams();
      if (fromVal) params.set("from", fromVal);
      if (toVal) params.set("to", toVal);
      if (search) params.set("search", search);
      if (direction !== "all") params.set("direction", direction);

      const res = await fetch(`/api/inventory/${inventoryId}/manual-movements?${params.toString()}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to load manual movements");

      setData(body.data || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load manual stock movements.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMovements();
  };

  const handleClear = () => {
    setSearch("");
    setDirection("all");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("from");
    params.delete("to");
    router.push(`?${params.toString()}`);
  };

  const formatDateTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <div className="space-y-4">
      {/* Filters Card */}
      <Card className="bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm rounded-xl relative z-20 overflow-visible">
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex gap-4 items-end flex-wrap">
            {/* Raw Material search */}
            <div className="space-y-1.5 flex-1 min-w-[200px]">
              <Label htmlFor="search-mat" className="text-xs font-semibold text-[var(--text-secondary)]">
                Raw Material
              </Label>
              <div className="relative">
                <Input
                  id="search-mat"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search raw material..."
                  className="h-10 border-[var(--border-default)] bg-white text-xs pl-8"
                />
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)] pointer-events-none" />
              </div>
            </div>

            {/* Type/Direction Filter */}
            <div className="space-y-1.5 w-44">
              <Label htmlFor="direction-filter" className="text-xs font-semibold text-[var(--text-secondary)]">
                Adjustment Type
              </Label>
              <Select value={direction} onValueChange={(val) => setDirection(val || "all")}>
                <SelectTrigger id="direction-filter" className="h-10 text-xs border-[var(--border-default)] bg-white">
                  <SelectValue placeholder="All Adjustments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Adjustments</SelectItem>
                  <SelectItem value="increase" className="text-xs">Increase (Excess)</SelectItem>
                  <SelectItem value="decrease" className="text-xs">Decrease (Short)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[var(--text-secondary)] block">
                Date Range
              </Label>
              <DateRangeFilter />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 h-10 items-center">
              <Button
                type="button"
                onClick={handleClear}
                variant="outline"
                className="h-10 px-4 text-xs font-semibold border-[var(--border-default)] bg-white flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                Clear
              </Button>
              <Button
                type="submit"
                className="h-10 px-6 text-xs font-semibold bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white flex items-center gap-1.5"
              >
                <Search className="h-3.5 w-3.5" />
                Search
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Movements Table Card */}
      <Card className="bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm rounded-xl overflow-hidden relative z-10">
        {loading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : data.length === 0 ? (
          <div className="py-12 text-center text-xs text-[var(--text-muted)] flex flex-col items-center gap-2">
            <History className="h-8 w-8 text-[var(--text-muted)] opacity-60" />
            No manual stock adjustments found matching filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[var(--border-default)] hover:bg-transparent">
                  <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-semibold py-3 pl-4">
                    Date & Time
                  </TableHead>
                  <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-semibold py-3">
                    Raw Material
                  </TableHead>
                  <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-semibold text-right py-3 w-40">
                    Change Qty
                  </TableHead>
                  <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-semibold py-3 pl-8">
                    Note / Explanation
                  </TableHead>
                  <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-semibold py-3 pr-4 w-60">
                    Adjusted By
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((m) => {
                  const isIncrease = m.quantityChange > 0;
                  return (
                    <TableRow
                      key={m.id}
                      className="border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]"
                    >
                      <TableCell className="py-3.5 pl-4 text-xs text-[var(--text-secondary)] font-mono">
                        {formatDateTime(m.createdAt)}
                      </TableCell>
                      <TableCell className="py-3.5 text-xs font-semibold text-[var(--text-primary)]">
                        {m.materialName} [{m.unit}]
                      </TableCell>
                      <TableCell className="text-right py-3.5 font-mono text-xs font-semibold">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] ${
                          isIncrease
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                            : "bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400"
                        }`}>
                          {isIncrease ? (
                            <ArrowUpRight className="h-3 w-3" />
                          ) : (
                            <ArrowDownLeft className="h-3 w-3" />
                          )}
                          {isIncrease ? "+" : ""}
                          {m.quantityChange.toFixed(3)}
                        </span>
                      </TableCell>
                      <TableCell className="py-3.5 text-xs text-[var(--text-secondary)] pl-8">
                        {m.note || "Manual stock adjustment"}
                      </TableCell>
                      <TableCell className="py-3.5 text-xs text-[var(--text-primary)] pr-4">
                        <div className="font-semibold">{m.createdByName}</div>
                        <div className="text-[10px] text-[var(--text-muted)] font-mono">{m.createdByEmail}</div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
