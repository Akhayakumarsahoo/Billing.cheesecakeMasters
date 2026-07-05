"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { toast } from "sonner";
import { Download, Calendar, Search, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter, useSearchParams } from "next/navigation";
import { DateRangeFilter } from "@/components/date-range-filter";

interface ReportLine {
  materialId: string;
  materialName: string;
  unit: string;
  gstRate: string;
  hsn: string;
  opening: number;
  purchase: number;
  excess: number;
  totalAdditions: number;
  consumed: number;
  wastage: number;
  transfer: number;
  totalDeductions: number;
  closingStock: number;
  closingSummary: number;
}

interface StockSummaryTabProps {
  inventoryId: string;
  userRole: string;
}

export function StockSummaryTab({ inventoryId, userRole }: StockSummaryTabProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const todayStr = getTodayString();
  const fromDate = searchParams.get("from") || todayStr;
  const toDate = searchParams.get("to") || todayStr;

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReportLine[]>([]);
  const [search, setSearch] = useState("");

  // Cached filters for trigger action
  const [appliedSearch, setAppliedSearch] = useState("");

  useEffect(() => {
    fetchReport();
  }, [inventoryId, fromDate, toDate]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        from: fromDate,
        to: toDate,
        search: appliedSearch,
      });

      const res = await fetch(`/api/inventory/${inventoryId}/stock-summary?${params.toString()}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to load summary");
      setData(body.data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load stock summary report.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(search);
    // Directly fetch report with these triggers
    setTimeout(() => {
      fetchReport();
    }, 50);
  };

  const handleClear = () => {
    setSearch("");
    setAppliedSearch("");
    
    // Clear URL params for from/to dates
    const params = new URLSearchParams(window.location.search);
    params.delete("from");
    params.delete("to");
    router.push(`${window.location.pathname}?${params.toString()}`);
    router.refresh();
  };

  const handleExportCSV = () => {
    if (data.length === 0) {
      toast.error("No data available to export.");
      return;
    }
    const headers = [
      "Raw Material",
      "Opening (A)",
      "Purchase (B)",
      "Excess/short (C)",
      "Total Additions (A+B+C)",
      "Consumed (D)",
      "Wastage (E)",
      "Transfer (F)",
      "Total Deductions (D+E+F)",
      "Closing Stock",
    ];

    const rows = data.map((line) => [
      `"${line.materialName} [${line.unit}]"`,
      (line.opening || 0).toFixed(3),
      (line.purchase || 0).toFixed(3),
      (line.excess || 0).toFixed(3),
      (line.totalAdditions || 0).toFixed(3),
      (line.consumed || 0).toFixed(3),
      (line.wastage || 0).toFixed(3),
      (line.transfer || 0).toFixed(3),
      (line.totalDeductions || 0).toFixed(3),
      (line.closingSummary || 0).toFixed(3),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `stock_summary_report_${fromDate}_to_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV report exported successfully.");
  };

  return (
    <div className="space-y-6">
      {/* Header and Export Action */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Stock Summary Report
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Audit raw material stock movements, additions, deductions, and discrepancies.
          </p>
        </div>
        <Button
          onClick={handleExportCSV}
          variant="outline"
          className="text-xs h-9 border-[var(--border-default)] flex items-center gap-1.5 font-medium shadow-sm bg-white"
        >
          <Download className="h-3.5 w-3.5" />
          Export Report
        </Button>
      </div>

      {/* Filter Card */}
      <Card className="bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm rounded-xl relative z-20 overflow-visible">
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex gap-4 items-end flex-wrap">
            {/* Raw Material search */}
            <div className="space-y-1.5 flex-1 min-w-[200px]">
              <Label htmlFor="search-mat" className="text-xs font-semibold text-[var(--text-secondary)]">
                Raw Material
              </Label>
              <Input
                id="search-mat"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search raw material..."
                className="h-10 border-[var(--border-default)] bg-white text-xs"
              />
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

      {/* Summary Table Card */}
      <Card className="bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm rounded-xl overflow-hidden relative z-10">
        {loading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : data.length === 0 ? (
          <div className="py-12 text-center text-xs text-[var(--text-muted)]">
            No raw material stock records found matching filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[1400px]">
              <TableHeader>
                <TableRow className="border-[var(--border-default)] hover:bg-transparent">
                  <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-semibold py-3 pl-4">
                    Raw Material
                  </TableHead>
                  <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-semibold text-right py-3">
                    Opening (A)
                  </TableHead>
                  <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-semibold text-right py-3">
                    Purchase (B)
                  </TableHead>
                  <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-semibold text-right py-3">
                    Excess/short (C)
                  </TableHead>
                  <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-semibold text-right py-3 bg-blue-50/40 dark:bg-blue-950/10">
                    Total
                  </TableHead>
                  <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-semibold text-right py-3">
                    Consumed (D)
                  </TableHead>
                  <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-semibold text-right py-3">
                    Wastage (E)
                  </TableHead>
                  <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-semibold text-right py-3">
                    Transfer (F)
                  </TableHead>
                  <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-semibold text-right py-3 bg-blue-50/40 dark:bg-blue-950/10">
                    Total
                  </TableHead>
                  <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-semibold text-right py-3 pr-4">
                    Closing Stock
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((line) => (
                  <TableRow
                    key={line.materialId}
                    className="border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]"
                  >
                    <TableCell className="py-3.5 pl-4 text-xs font-semibold text-[var(--text-primary)]">
                      {line.materialName} [{line.unit}]
                    </TableCell>

                    <TableCell className="text-right py-3.5 font-mono text-xs text-[var(--text-secondary)]">
                      {(line.opening || 0).toFixed(3)}
                    </TableCell>

                    <TableCell className="text-right py-3.5 font-mono text-xs text-emerald-600">
                      {(line.purchase || 0).toFixed(3)}
                    </TableCell>

                    <TableCell className="text-right py-3.5 font-mono text-xs text-emerald-600">
                      {(line.excess || 0).toFixed(3)}
                    </TableCell>

                    <TableCell className="text-right py-3.5 font-mono text-xs font-semibold text-[var(--text-primary)] bg-blue-50/20 dark:bg-blue-950/5">
                      {(line.totalAdditions || 0).toFixed(3)}
                    </TableCell>

                    <TableCell className="text-right py-3.5 font-mono text-xs text-rose-600">
                      {(line.consumed || 0).toFixed(3)}
                    </TableCell>

                    <TableCell className="text-right py-3.5 font-mono text-xs text-rose-600">
                      {(line.wastage || 0).toFixed(3)}
                    </TableCell>

                    <TableCell className="text-right py-3.5 font-mono text-xs text-rose-600">
                      {(line.transfer || 0).toFixed(3)}
                    </TableCell>

                    <TableCell className="text-right py-3.5 font-mono text-xs font-semibold text-[var(--text-primary)] bg-blue-50/20 dark:bg-blue-950/5">
                      {(line.totalDeductions || 0).toFixed(3)}
                    </TableCell>

                    <TableCell className="text-right py-3.5 font-mono text-xs font-semibold text-[var(--text-primary)] pr-4">
                      {(line.closingSummary || 0).toFixed(3)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
