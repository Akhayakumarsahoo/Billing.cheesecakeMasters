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
}

interface StockSummaryTabProps {
  inventoryId: string;
  userRole: string;
}

export function StockSummaryTab({ inventoryId, userRole }: StockSummaryTabProps) {
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReportLine[]>([]);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState(getTodayString());
  const [toDate, setToDate] = useState(getTodayString());

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
    setFromDate(getTodayString());
    setToDate(getTodayString());
    setAppliedSearch("");
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
      line.opening.toFixed(3),
      line.purchase.toFixed(3),
      line.excess.toFixed(3),
      line.totalAdditions.toFixed(3),
      line.consumed.toFixed(3),
      line.wastage.toFixed(3),
      line.transfer.toFixed(3),
      line.totalDeductions.toFixed(3),
      line.closingStock.toFixed(3),
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
      <Card className="bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm rounded-xl">
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            {/* Raw Material search */}
            <div className="space-y-1.5 col-span-1">
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

            {/* From Date */}
            <div className="space-y-1.5 col-span-1">
              <Label htmlFor="from-date" className="text-xs font-semibold text-[var(--text-secondary)]">
                From Date
              </Label>
              <div className="relative">
                <Input
                  id="from-date"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="h-10 pl-9 border-[var(--border-default)] bg-white text-xs"
                />
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-[var(--text-muted)] pointer-events-none" />
              </div>
            </div>

            {/* To Date */}
            <div className="space-y-1.5 col-span-1">
              <Label htmlFor="to-date" className="text-xs font-semibold text-[var(--text-secondary)]">
                To Date
              </Label>
              <div className="relative">
                <Input
                  id="to-date"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-10 pl-9 border-[var(--border-default)] bg-white text-xs"
                />
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-[var(--text-muted)] pointer-events-none" />
              </div>
            </div>

            {/* Action buttons */}
            <div className="col-span-1 md:col-span-3 flex gap-2 justify-end pt-2">
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
      <Card className="bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm rounded-xl overflow-hidden">
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
                      {line.opening.toFixed(3)}
                    </TableCell>

                    <TableCell className="text-right py-3.5 font-mono text-xs text-emerald-600">
                      {line.purchase.toFixed(3)}
                    </TableCell>

                    <TableCell className="text-right py-3.5 font-mono text-xs text-emerald-600">
                      {line.excess.toFixed(3)}
                    </TableCell>

                    <TableCell className="text-right py-3.5 font-mono text-xs font-semibold text-[var(--text-primary)] bg-blue-50/20 dark:bg-blue-950/5">
                      {line.totalAdditions.toFixed(3)}
                    </TableCell>

                    <TableCell className="text-right py-3.5 font-mono text-xs text-rose-600">
                      {line.consumed.toFixed(3)}
                    </TableCell>

                    <TableCell className="text-right py-3.5 font-mono text-xs text-rose-600">
                      {line.wastage.toFixed(3)}
                    </TableCell>

                    <TableCell className="text-right py-3.5 font-mono text-xs text-rose-600">
                      {line.transfer.toFixed(3)}
                    </TableCell>

                    <TableCell className="text-right py-3.5 font-mono text-xs font-semibold text-[var(--text-primary)] bg-blue-50/20 dark:bg-blue-950/5">
                      {line.totalDeductions.toFixed(3)}
                    </TableCell>

                    <TableCell className="text-right py-3.5 font-mono text-xs font-semibold text-[var(--text-primary)] pr-4">
                      {line.closingStock.toFixed(3)}
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
