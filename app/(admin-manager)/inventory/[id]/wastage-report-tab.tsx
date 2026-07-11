"use client";

import React, { useState, useEffect } from "react";
import { Search, Calendar as CalendarIcon, FileText, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

interface WastageLine {
  id: string;
  rawMaterialId: string;
  materialName: string;
  unit: string;
  quantity: string;
}

interface WastageRecord {
  id: string;
  wastageDate: string;
  status: "draft" | "confirmed" | "cancelled";
  reason: string | null;
  notes: string | null;
  creatorName: string;
  lines: WastageLine[];
}

interface WastageReportTabProps {
  inventoryId: string;
  userRole: string;
}

export function WastageReportTab({ inventoryId, userRole }: WastageReportTabProps) {
  const toLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const today = new Date();

  // "by default it will be selected as today"
  const [fromDate, setFromDate] = useState(() => toLocalDateString(today));
  const [toDate, setToDate] = useState(() => toLocalDateString(today));

  const [records, setRecords] = useState<WastageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [draftRange, setDraftRange] = useState<DateRange>({
    from: today,
    to: today
  });
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  useEffect(() => {
    fetchRecords();
  }, [inventoryId, fromDate, toDate]);

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

  // Perform item-wise aggregation
  const itemWiseMap: Record<string, { materialName: string; unit: string; totalQty: number; logsCount: number }> = {};
  
  let totalWastedQty = 0;
  let totalIncidentsCount = 0;

  // Filter for confirmed records only
  const confirmedRecords = records.filter((r) => r.status === "confirmed");

  confirmedRecords.forEach((record) => {
    const lines = record.lines || [];
    lines.forEach((line) => {
      const key = line.rawMaterialId;
      const qty = Number(line.quantity || 0);
      
      if (!itemWiseMap[key]) {
        itemWiseMap[key] = {
          materialName: line.materialName,
          unit: line.unit,
          totalQty: 0,
          logsCount: 0
        };
      }
      
      itemWiseMap[key].totalQty += qty;
      itemWiseMap[key].logsCount += 1;
      
      totalWastedQty += qty;
    });
    totalIncidentsCount += 1;
  });

  const aggregatedItems = Object.values(itemWiseMap).sort((a, b) => b.totalQty - a.totalQty);
  
  const filteredItems = aggregatedItems.filter((item) =>
    item.materialName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Filters Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-[var(--bg-surface)] border border-[var(--border-default)] p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-4 flex-wrap flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
            <Input
              placeholder="Search materials..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-[var(--bg-surface)] border-[var(--border-default)] focus:border-[var(--border-strong)] h-10 rounded-md"
            />
          </div>

          <Popover open={isPopoverOpen} onOpenChange={(val) => {
            if (val) handleOpen();
            else setIsPopoverOpen(false);
          }}>
            <PopoverTrigger
              className={cn(
                "inline-flex items-center gap-2 h-10 px-3 rounded-md text-sm font-normal border cursor-pointer select-none",
                "bg-[var(--bg-surface)] border-[var(--border-default)]",
                "text-[var(--text-primary)] transition-colors outline-none",
                "hover:bg-[var(--bg-hover)] hover:border-[var(--border-strong)]",
                "min-w-[220px] whitespace-nowrap",
                isPopoverOpen && "border-[var(--border-strong)] bg-[var(--bg-hover)]"
              )}
            >
              <CalendarIcon className="h-4 w-4 text-[var(--text-secondary)] shrink-0" strokeWidth={1.5} />
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
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-sm font-medium text-[var(--text-secondary)]">Total Wasted Quantity</span>
            <FileText className="h-4 w-4 text-[var(--text-secondary)]" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-semibold text-[var(--text-primary)]">
                {totalWastedQty.toFixed(3)}
              </div>
            )}
            <p className="text-xs text-[var(--text-muted)] mt-1">Sum of all confirmed wastage lines</p>
          </CardContent>
        </Card>

        <Card className="bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-sm font-medium text-[var(--text-secondary)]">Unique Items Wasted</span>
            <ClipboardList className="h-4 w-4 text-[var(--text-secondary)]" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-semibold text-[var(--text-primary)]">
                {aggregatedItems.length}
              </div>
            )}
            <p className="text-xs text-[var(--text-muted)] mt-1">Different raw materials reported</p>
          </CardContent>
        </Card>

        <Card className="bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-sm font-medium text-[var(--text-secondary)]">Wastage Incidents</span>
            <FileText className="h-4 w-4 text-[var(--text-secondary)]" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-semibold text-[var(--text-primary)]">
                {totalIncidentsCount}
              </div>
            )}
            <p className="text-xs text-[var(--text-muted)] mt-1">Total confirmed logs in range</p>
          </CardContent>
        </Card>
      </div>

      {/* Item-wise Wastage Table */}
      <Card className="bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="border-b border-[var(--border-default)] pb-4">
          <CardTitle className="text-sm font-semibold text-[var(--text-primary)]">Item-wise Wastage Summary</CardTitle>
        </CardHeader>
        {loading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-8 text-center text-xs text-[var(--text-muted)]">
            No wastage reported in this date range.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-[var(--border-default)] hover:bg-transparent">
                <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium">Material Name</TableHead>
                <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium">Unit</TableHead>
                <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium text-right">Logs Count</TableHead>
                <TableHead className="text-xs uppercase text-[var(--text-secondary)] font-medium text-right">Total Wasted Qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item, idx) => (
                <TableRow key={idx} className="border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]">
                  <TableCell className="text-sm font-medium text-[var(--text-primary)]">
                    {item.materialName}
                  </TableCell>
                  <TableCell className="text-xs text-[var(--text-secondary)] font-medium font-mono">
                    {item.unit}
                  </TableCell>
                  <TableCell className="text-sm text-right font-mono font-medium text-[var(--text-secondary)]">
                    {item.logsCount}
                  </TableCell>
                  <TableCell className="text-sm text-right font-mono font-semibold text-[var(--text-primary)]">
                    {item.totalQty.toFixed(3)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
