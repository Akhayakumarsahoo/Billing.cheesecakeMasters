"use client";

import React, { useState, useEffect } from "react";
import {
  IndianRupee,
  Percent,
  Receipt,
  Tag,
  UserX,
  Check,
  SlidersHorizontal,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ClickableRow } from "@/components/clickable-row";
import { StatCard } from "@/components/ui/stat-card";
import { formatINR } from "@/lib/utils";
import { DateRangeFilter } from "@/components/date-range-filter";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

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

function toLocalDateString(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function DashboardClient({ initialData }: DashboardClientProps) {
  const [selectedOutletIds, setSelectedOutletIds] = useState<string[]>(
    initialData.map((o) => o.id)
  );

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

  // Compute selected data aggregates
  const selectedData = initialData.filter((item) =>
    selectedOutletIds.includes(item.id)
  );

  const totalRevenue = selectedData.reduce((sum, item) => sum + item.revenue, 0);
  const totalBillsCount = selectedData.reduce((sum, item) => sum + item.billsCount, 0);
  const totalGst = selectedData.reduce((sum, item) => sum + item.gstTotal, 0);
  const totalDiscount = selectedData.reduce((sum, item) => sum + item.discount, 0);

  const paymentBuckets = { cash: 0, upi: 0, card: 0, online: 0 };
  for (const item of selectedData) {
    paymentBuckets.cash += item.payments.cash;
    paymentBuckets.upi += item.payments.upi;
    paymentBuckets.card += item.payments.card;
    paymentBuckets.online += item.payments.online;
  }

  // Walkaways Section State
  const todayStr = toLocalDateString(new Date());
  const [walkawayFrom, setWalkawayFrom] = useState(todayStr);
  const [walkawayTo, setWalkawayTo] = useState(todayStr);
  const [walkawayStats, setWalkawayStats] = useState<{
    totalWalkaways: number;
    reasonStats: Record<string, number>;
  }>({
    totalWalkaways: selectedData.reduce((sum, item) => sum + item.walkawayCount, 0),
    reasonStats: {
      "Price too high": 0,
      "Desired item/flavor out of stock": 0,
      "Long waiting time": 0,
      "Will return later": 0,
      "Just exploring/browsing": 0,
      "Other": 0,
    },
  });
  const [loadingWalkaways, setLoadingWalkaways] = useState(false);

  // Fetch walkaways dynamically when walkaway date range or selected outlets change
  useEffect(() => {
    async function fetchWalkawayMetrics() {
      setLoadingWalkaways(true);
      try {
        const outletParam = selectedOutletIds.length > 0 ? selectedOutletIds.join(",") : "";
        const res = await fetch(
          `/api/dashboard/walkaways?from=${walkawayFrom}&to=${walkawayTo}&outletIds=${outletParam}`
        );
        if (res.ok) {
          const json = await res.json();
          setWalkawayStats(json.data);
        }
      } catch (err) {
        console.error("Failed to fetch walkaway metrics:", err);
      } finally {
        setLoadingWalkaways(false);
      }
    }
    fetchWalkawayMetrics();
  }, [walkawayFrom, walkawayTo, selectedOutletIds]);

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
                {/* Header with Title and Select All / Clear All */}
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

                {/* Outlet Checkbox List */}
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

      {/* Summary Metric Cards: 2 grids per row on mobile (grid-cols-2), 4 grids in a row on desktop (lg:grid-cols-4) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Row 1 Grid 1: Total Revenue with "i" Popover Action Button */}
        <StatCard
          icon={IndianRupee}
          label="Total Revenue"
          value={`₹${formatINR(totalRevenue)}`}
          subtext="For selected outlets"
          className="overflow-visible"
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
                  <span>Total Revenue</span>
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
        <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">
          Sales by Outlet
        </h2>
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-[var(--border-default)]">
                {[
                  "Outlet",
                  "Bills",
                  "Revenue",
                  "Discount",
                  "GST Total",
                  "Walkaways",
                ].map((heading, i) => (
                  <TableHead
                    key={heading}
                    className={`text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide h-10 ${
                      i === 0 ? "text-left" : "text-right"
                    }`}
                  >
                    {heading}
                  </TableHead>
                ))}
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
                      <TableCell className="text-sm text-[var(--text-primary)] text-right">
                        {stat.billsCount}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-[var(--text-primary)] text-right">
                        ₹{formatINR(stat.revenue)}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-[var(--text-primary)] text-right">
                        ₹{formatINR(stat.discount)}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-[var(--text-primary)] text-right">
                        ₹{formatINR(stat.gstTotal)}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-[var(--text-primary)] text-right">
                        {stat.walkawayCount}
                      </TableCell>
                    </ClickableRow>
                  ))}

                  {/* Totals Row */}
                  <TableRow className="border-0 bg-[var(--bg-surface-raised)] hover:bg-[var(--bg-surface-raised)]">
                    <TableCell className="text-sm font-medium text-[var(--text-primary)] font-bold">
                      Total
                    </TableCell>
                    <TableCell className="text-sm font-medium text-[var(--text-primary)] text-right font-bold">
                      {selectedData.reduce((s, o) => s + o.billsCount, 0)}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-medium text-[var(--text-primary)] text-right font-bold">
                      ₹{formatINR(totalRevenue)}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-medium text-[var(--text-primary)] text-right font-bold">
                      ₹{formatINR(totalDiscount)}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-medium text-[var(--text-primary)] text-right font-bold">
                      ₹{formatINR(totalGst)}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-medium text-[var(--text-primary)] text-right font-bold">
                      {selectedData.reduce((s, o) => s + o.walkawayCount, 0)}
                    </TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Customer Walkaways Breakdown Section (Positioned After Sales by Outlet Table) */}
      <div className="mb-8">
        <Card className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-default)] pb-4">
            <div>
              <CardTitle className="text-lg font-medium text-[var(--text-primary)] flex items-center gap-2">
                <UserX className="h-5 w-5 text-[var(--text-secondary)]" strokeWidth={1.5} />
                Customer Walkaways Breakdown
              </CardTitle>
            </div>

            {/* Independent Date Range Selector for Walkaways (Same component as top date picker, capped at max 3 months) */}
            <DateRangeFilter
              from={walkawayFrom}
              to={walkawayTo}
              onSelect={(fromStr, toStr) => {
                setWalkawayFrom(fromStr);
                setWalkawayTo(toStr);
              }}
              maxDays={93}
            />
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Total Walkaways Highlight Metric */}
            <div className="flex items-center justify-between p-4 bg-[var(--bg-surface-raised)] border border-[var(--border-default)] rounded-lg">
              <div>
                <span className="text-xs text-[var(--text-secondary)] font-medium uppercase tracking-wide">
                  Total Walkaways
                </span>
                <div className="text-2xl font-semibold font-mono text-[var(--text-primary)] mt-0.5">
                  {loadingWalkaways ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    walkawayStats.totalWalkaways
                  )}
                </div>
              </div>
              <UserX className="h-6 w-6 text-[var(--text-secondary)]" strokeWidth={1.5} />
            </div>

            {/* Reasons Distribution List */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                Reason Distribution
              </h4>
              {loadingWalkaways ? (
                <div className="space-y-2">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(walkawayStats.reasonStats).map(([label, value]) => {
                    const percentage =
                      walkawayStats.totalWalkaways > 0
                        ? Math.round((value / walkawayStats.totalWalkaways) * 100)
                        : 0;

                    return (
                      <div key={label} className="flex flex-col gap-1">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-[var(--text-secondary)] font-medium">
                            {label}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[var(--text-muted)] font-mono">
                              ({percentage}%)
                            </span>
                            <span className="font-mono font-semibold text-[var(--text-primary)] min-w-[24px] text-right">
                              {value}
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 w-full bg-[var(--bg-surface-raised)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[var(--accent-primary)] transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
