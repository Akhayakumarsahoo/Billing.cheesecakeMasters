"use client";

import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  IndianRupee,
  Percent,
  Receipt,
  Tag,
  Check,
  SlidersHorizontal,
  Info,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ClickableRow } from "@/components/clickable-row";
import { StatCard } from "@/components/ui/stat-card";
import { formatINR, cn } from "@/lib/utils";
import { DateRangeFilter } from "@/components/date-range-filter";

interface OutletStats {
  id: string;
  name: string;
  billsCount: number;
  revenue: number;
  discount: number;
  gstTotal: number;
  walkawayCount: number;
  walkawayReasons: Record<string, number>;
  payments: {
    cash: number;
    upi: number;
    card: number;
    online: number;
  };
}

interface DashboardClientProps {
  initialData: OutletStats[];
}

type MetricView = "sales" | "bills" | "discount" | "gst" | "walkaways" | "all";

export function DashboardClient({ initialData }: DashboardClientProps) {
  const [selectedOutletIds, setSelectedOutletIds] = useState<string[]>(
    initialData.map((o) => o.id)
  );

  const [selectedMetricView, setSelectedMetricView] = useState<MetricView>("sales");

  const toggleOutlet = (id: string) => {
    setSelectedOutletIds((prev) =>
      prev.includes(id)
        ? prev.filter((oid) => oid !== id)
        : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedOutletIds(initialData.map((o) => o.id));
  };

  const deselectAll = () => {
    setSelectedOutletIds([]);
  };

  const searchParams = useSearchParams();
  const fromParam = searchParams.get("from") || "";
  const toParam = searchParams.get("to") || "";

  // Compute selected data aggregates
  const selectedData = initialData.filter((item) =>
    selectedOutletIds.includes(item.id)
  );

  const totalRevenue = selectedData.reduce((sum, item) => sum + item.revenue, 0);
  const totalBillsCount = selectedData.reduce((sum, item) => sum + item.billsCount, 0);
  const totalGst = selectedData.reduce((sum, item) => sum + item.gstTotal, 0);
  const totalDiscount = selectedData.reduce((sum, item) => sum + item.discount, 0);
  const totalWalkawaysCount = selectedData.reduce((sum, item) => sum + item.walkawayCount, 0);

  const combinedWalkawayReasons: Record<string, number> = {};
  for (const item of selectedData) {
    for (const [reason, count] of Object.entries(item.walkawayReasons)) {
      combinedWalkawayReasons[reason] = (combinedWalkawayReasons[reason] || 0) + count;
    }
  }

  const paymentBuckets = { cash: 0, upi: 0, card: 0, online: 0 };
  for (const item of selectedData) {
    paymentBuckets.cash += item.payments.cash;
    paymentBuckets.upi += item.payments.upi;
    paymentBuckets.card += item.payments.card;
    paymentBuckets.online += item.payments.online;
  }

  const isColVisible = (colKey: "sales" | "bills" | "discount" | "gst" | "walkaways") => {
    if (selectedMetricView === "all") return "";
    if (selectedMetricView === colKey) return "";
    return "hidden md:table-cell";
  };

  return (
    <>
      {/* Page Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-medium text-[var(--text-primary)]">
            Sales Dashboard
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">All outlets</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
          <DateRangeFilter />

          {/* Filter Outlets Popover Dropdown Menu */}
          <Popover>
            <PopoverTrigger
              className={`inline-flex items-center gap-2 h-9 px-3.5 text-sm font-medium rounded-lg border cursor-pointer select-none whitespace-nowrap shrink-0 transition-all ${
                selectedOutletIds.length < initialData.length
                  ? "bg-[var(--text-primary)] border-[var(--text-primary)] text-white hover:bg-[var(--text-primary)] shadow-xs"
                  : "bg-[var(--bg-surface)] border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] hover:border-[var(--border-strong)] shadow-xs"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              <span className="whitespace-nowrap">Filter Outlets</span>
              {selectedOutletIds.length < initialData.length && (
                <span className="flex items-center justify-center text-[10px] font-semibold min-w-[20px] h-5 px-1 rounded-full bg-white text-[var(--text-primary)]">
                  {selectedOutletIds.length}
                </span>
              )}
            </PopoverTrigger>

            <PopoverContent
              align="end"
              side="bottom"
              sideOffset={8}
              className="w-72 p-4 bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-2xl rounded-xl text-xs z-[9999]"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-2.5">
                  <div>
                    <h4 className="text-xs font-semibold text-[var(--text-primary)]">
                      Filter Outlets
                    </h4>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                      {selectedOutletIds.length} of {initialData.length} selected
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={selectAll}
                      className="text-[11px] font-medium text-[var(--accent-primary)] hover:underline cursor-pointer select-none"
                    >
                      Select All
                    </button>
                    <span className="text-[var(--border-default)]">|</span>
                    <button
                      type="button"
                      onClick={deselectAll}
                      className="text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:underline cursor-pointer select-none"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                  {initialData.map((outlet) => {
                    const isSelected = selectedOutletIds.includes(outlet.id);
                    return (
                      <label
                        key={outlet.id}
                        onClick={() => toggleOutlet(outlet.id)}
                        className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-[var(--bg-surface-raised)] cursor-pointer select-none transition-colors"
                      >
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                            isSelected
                              ? "bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white"
                              : "border-[var(--border-default)] bg-white"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <span
                          className={`text-xs ${
                            isSelected
                              ? "text-[var(--text-primary)] font-medium"
                              : "text-[var(--text-secondary)]"
                          }`}
                        >
                          {outlet.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Row 1 Grid 1: Total Sales with "i" Popover Action Button */}
        <StatCard
          icon={IndianRupee}
          label="Total Sales"
          value={`₹${formatINR(totalRevenue)}`}
          subtext="For selected outlets"
          actionNode={
            <Popover>
              <PopoverTrigger
                className="h-6 w-6 rounded-full flex items-center justify-center bg-[var(--bg-surface-raised)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all cursor-pointer select-none"
                title="View Payment Method Breakdown"
              >
                <Info className="h-3.5 w-3.5" strokeWidth={2} />
              </PopoverTrigger>
              <PopoverContent
                align="end"
                side="bottom"
                sideOffset={8}
                className="w-64 p-3.5 bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-2xl rounded-xl text-xs z-[9999]"
              >
                <div className="font-semibold text-[var(--text-primary)] border-b border-[var(--border-default)] pb-2 mb-2.5 flex justify-between items-center">
                  <span>Payment Breakdown</span>
                  <span className="text-[10px] text-[var(--text-muted)] font-normal">By Payment Mode</span>
                </div>
                <div className="space-y-2">
                  {[
                    { label: "Cash", value: paymentBuckets.cash },
                    { label: "Card", value: paymentBuckets.card },
                    { label: "UPI", value: paymentBuckets.upi },
                    { label: "Delivery", value: paymentBuckets.online },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center py-0.5">
                      <span className="text-[var(--text-secondary)] font-medium">{label}</span>
                      <span className="font-mono font-semibold text-[var(--text-primary)]">
                        ₹ {formatINR(value)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center pt-2 mt-2.5 border-t border-[var(--border-default)] font-semibold text-[var(--text-primary)]">
                  <span>Total Sales</span>
                  <span className="font-mono text-sm">
                    ₹ {formatINR(totalRevenue)}
                  </span>
                </div>
              </PopoverContent>
            </Popover>
          }
        />

        {/* Row 1 Grid 2: Total Bills */}
        <StatCard
          icon={Receipt}
          label="Total Bills"
          value={totalBillsCount}
          subtext="Printed bills only"
        />

        {/* Row 2 Grid 1: Total GST */}
        <StatCard
          icon={Percent}
          label="GST Collected"
          value={`₹${formatINR(totalGst)}`}
          subtext="CGST + SGST"
        />

        {/* Row 2 Grid 2: Total Discount */}
        <StatCard
          icon={Tag}
          label="Total Discount"
          value={`₹${formatINR(totalDiscount)}`}
          subtext="Total discounts given"
        />
      </div>

      {/* Sales by Outlet Table */}
      <div className="mb-8">
        <div className="flex flex-row items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-medium text-[var(--text-primary)]">
            Sales by Outlet
          </h2>

          {/* Metric Selector Dropdown Button Right Next to Header */}
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center h-8 gap-1.5 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-raised)] text-xs font-medium text-[var(--text-primary)] transition-colors cursor-pointer select-none">
              <SlidersHorizontal className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
              <span>
                {selectedMetricView === "sales" && "Metric: Total Sales"}
                {selectedMetricView === "bills" && "Metric: Total Bills"}
                {selectedMetricView === "discount" && "Metric: Discounts"}
                {selectedMetricView === "gst" && "Metric: GST Total"}
                {selectedMetricView === "walkaways" && "Metric: Walkaways"}
                {selectedMetricView === "all" && "Metric: All Columns"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 opacity-60 ml-0.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-xl rounded-xl z-[9999]">
              <DropdownMenuItem
                className="cursor-pointer text-xs"
                onClick={() => setSelectedMetricView("sales")}
              >
                Total Sales (Default)
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer text-xs"
                onClick={() => setSelectedMetricView("bills")}
              >
                Total Bills
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer text-xs"
                onClick={() => setSelectedMetricView("discount")}
              >
                Discounts
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer text-xs"
                onClick={() => setSelectedMetricView("gst")}
              >
                GST Total
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer text-xs"
                onClick={() => setSelectedMetricView("walkaways")}
              >
                Walkaways
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-xs font-medium"
                onClick={() => setSelectedMetricView("all")}
              >
                All Columns
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-[var(--border-default)]">
                <TableHead className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide h-10 text-left">
                  Outlet
                </TableHead>
                <TableHead className={cn("text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide h-10 text-right", isColVisible("bills"))}>
                  Bills
                </TableHead>
                <TableHead className={cn("text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide h-10 text-right", isColVisible("sales"))}>
                  Total Sales
                </TableHead>
                <TableHead className={cn("text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide h-10 text-right", isColVisible("discount"))}>
                  Discount
                </TableHead>
                <TableHead className={cn("text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide h-10 text-right", isColVisible("gst"))}>
                  GST Total
                </TableHead>
                <TableHead className={cn("text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide h-10 text-right", isColVisible("walkaways"))}>
                  Walkaways
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-[var(--text-muted)]"
                  >
                    No outlets selected or no data found.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {selectedData.map((stat) => (
                    <ClickableRow
                      key={stat.id}
                      href={`/outlets/${stat.id}`}
                      className="border-[var(--border-default)] group"
                    >
                      <TableCell className="text-sm font-medium text-[var(--text-primary)] group-hover:underline">
                        {stat.name}
                      </TableCell>
                      <TableCell className={cn("text-sm text-[var(--text-primary)] text-right", isColVisible("bills"))}>
                        {stat.billsCount}
                      </TableCell>
                      <TableCell className={cn("font-mono text-sm text-[var(--text-primary)] text-right", isColVisible("sales"))}>
                        ₹{formatINR(stat.revenue)}
                      </TableCell>
                      <TableCell className={cn("font-mono text-sm text-[var(--text-primary)] text-right", isColVisible("discount"))}>
                        ₹{formatINR(stat.discount)}
                      </TableCell>
                      <TableCell className={cn("font-mono text-sm text-[var(--text-primary)] text-right", isColVisible("gst"))}>
                        ₹{formatINR(stat.gstTotal)}
                      </TableCell>
                      <TableCell className={cn("font-mono text-sm text-[var(--text-primary)] text-right", isColVisible("walkaways"))}>
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <span>{stat.walkawayCount}</span>
                          <Popover>
                            <PopoverTrigger
                              className="h-5 w-5 rounded-full inline-flex items-center justify-center bg-[var(--bg-surface-raised)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all cursor-pointer select-none"
                              title="View Walkaway Details"
                            >
                              <Info className="h-3 w-3" strokeWidth={2} />
                            </PopoverTrigger>
                            <PopoverContent
                              align="end"
                              side="bottom"
                              sideOffset={8}
                              className="w-64 p-3.5 bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-2xl rounded-xl text-xs z-[9999]"
                            >
                              <div className="font-semibold text-[var(--text-primary)] border-b border-[var(--border-default)] pb-2 mb-2.5 flex justify-between items-center">
                                <span>Walkaway Details</span>
                                <span className="text-[10px] text-[var(--text-muted)] font-normal">{stat.name}</span>
                              </div>
                              <div className="space-y-2">
                                {Object.entries(stat.walkawayReasons).length > 0 ? (
                                  Object.entries(stat.walkawayReasons).map(([reason, count]) => (
                                    <div key={reason} className="flex justify-between items-center py-0.5">
                                      <span className="text-[var(--text-secondary)] font-medium">{reason}</span>
                                      <span className="font-mono font-semibold text-[var(--text-primary)]">{count}</span>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-[var(--text-muted)] text-center py-1">No walkaways recorded</div>
                                )}
                              </div>
                              <div className="flex justify-between items-center pt-2 mt-2.5 border-t border-[var(--border-default)] font-semibold text-[var(--text-primary)]">
                                <span>Total Walkaways</span>
                                <span className="font-mono text-sm">{stat.walkawayCount}</span>
                              </div>
                              <div className="pt-2 mt-2 border-t border-[var(--border-default)] text-right">
                                <a
                                  href={`/outlets/${stat.id}/walkaways${fromParam && toParam ? `?from=${fromParam}&to=${toParam}` : ""}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
                                  className="text-[11px] font-medium text-[var(--accent-primary)] hover:underline inline-flex items-center gap-1"
                                >
                                  View Full Logs &rarr;
                                </a>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </TableCell>
                    </ClickableRow>
                  ))}

                  {/* Totals Row */}
                  <TableRow className="border-0 bg-[var(--bg-surface-raised)] hover:bg-[var(--bg-surface-raised)]">
                    <TableCell className="text-sm font-medium text-[var(--text-primary)] font-bold">
                      Total
                    </TableCell>
                    <TableCell className={cn("text-sm font-medium text-[var(--text-primary)] text-right font-bold", isColVisible("bills"))}>
                      {selectedData.reduce((s, o) => s + o.billsCount, 0)}
                    </TableCell>
                    <TableCell className={cn("font-mono text-sm font-medium text-[var(--text-primary)] text-right font-bold", isColVisible("sales"))}>
                      ₹{formatINR(totalRevenue)}
                    </TableCell>
                    <TableCell className={cn("font-mono text-sm font-medium text-[var(--text-primary)] text-right font-bold", isColVisible("discount"))}>
                      ₹{formatINR(totalDiscount)}
                    </TableCell>
                    <TableCell className={cn("font-mono text-sm font-medium text-[var(--text-primary)] text-right font-bold", isColVisible("gst"))}>
                      ₹{formatINR(totalGst)}
                    </TableCell>
                    <TableCell className={cn("font-mono text-sm font-medium text-[var(--text-primary)] text-right font-bold", isColVisible("walkaways"))}>
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <span>{totalWalkawaysCount}</span>
                        <Popover>
                          <PopoverTrigger
                            className="h-5 w-5 rounded-full inline-flex items-center justify-center bg-[var(--bg-surface-raised)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all cursor-pointer select-none"
                            title="View Combined Walkaway Details"
                          >
                            <Info className="h-3 w-3" strokeWidth={2} />
                          </PopoverTrigger>
                          <PopoverContent
                            align="end"
                            side="bottom"
                            sideOffset={8}
                            className="w-64 p-3.5 bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-2xl rounded-xl text-xs z-[9999]"
                          >
                            <div className="font-semibold text-[var(--text-primary)] border-b border-[var(--border-default)] pb-2 mb-2.5 flex justify-between items-center">
                              <span>All Outlets Walkaway Details</span>
                              <span className="text-[10px] text-[var(--text-muted)] font-normal">Combined</span>
                            </div>
                            <div className="space-y-2">
                              {Object.entries(combinedWalkawayReasons).length > 0 ? (
                                Object.entries(combinedWalkawayReasons).map(([reason, count]) => (
                                  <div key={reason} className="flex justify-between items-center py-0.5">
                                    <span className="text-[var(--text-secondary)] font-medium">{reason}</span>
                                    <span className="font-mono font-semibold text-[var(--text-primary)]">{count}</span>
                                  </div>
                                ))
                              ) : (
                                <div className="text-[var(--text-muted)] text-center py-1">No walkaways recorded</div>
                              )}
                            </div>
                            <div className="flex justify-between items-center pt-2 mt-2.5 border-t border-[var(--border-default)] font-semibold text-[var(--text-primary)]">
                              <span>Total Walkaways</span>
                              <span className="font-mono text-sm">{totalWalkawaysCount}</span>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
