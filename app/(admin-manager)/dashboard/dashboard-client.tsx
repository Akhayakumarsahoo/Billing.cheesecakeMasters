"use client";

import React, { useState } from "react";
import {
  IndianRupee,
  Percent,
  Receipt,
  Tag,
  Wallet,
  UserX,
  Check,
  SlidersHorizontal,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClickableRow } from "@/components/clickable-row";
import { StatCard } from "@/components/ui/stat-card";
import { formatINR } from "@/lib/utils";
import { DateRangeFilter } from "@/components/date-range-filter";

interface OutletStats {
  id: string;
  name: string;
  billsCount: number;
  revenue: number;
  discount: number;
  gstTotal: number;
  cashboxBalance: number;
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

export function DashboardClient({ initialData }: DashboardClientProps) {
  const [selectedOutletIds, setSelectedOutletIds] = useState<string[]>(
    initialData.map((o) => o.id)
  );
  const [isFilterVisible, setIsFilterVisible] = useState(false);

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
  const totalCashboxBalance = selectedData.reduce((sum, item) => sum + item.cashboxBalance, 0);
  const totalWalkawayCount = selectedData.reduce((sum, item) => sum + item.walkawayCount, 0);

  const paymentBuckets = { cash: 0, upi: 0, card: 0, online: 0 };
  for (const item of selectedData) {
    paymentBuckets.cash += item.payments.cash;
    paymentBuckets.upi += item.payments.upi;
    paymentBuckets.card += item.payments.card;
    paymentBuckets.online += item.payments.online;
  }

  const reasonStats = {
    "Price too high": 0,
    "Desired item/flavor out of stock": 0,
    "Long waiting time": 0,
    "Will return later": 0,
    "Just exploring/browsing": 0,
    "Other": 0,
  };
  for (const item of selectedData) {
    for (const [reason, count] of Object.entries(item.walkawayReasons)) {
      if (reason in reasonStats) {
        reasonStats[reason as keyof typeof reasonStats] += count;
      } else {
        reasonStats["Other"] += count;
      }
    }
  }

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
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <DateRangeFilter />
          <Button
            variant="outline"
            onClick={() => setIsFilterVisible(!isFilterVisible)}
            className={`flex items-center gap-2 h-9 px-3 text-sm font-medium border cursor-pointer select-none transition-all ${
              isFilterVisible
                ? "bg-[var(--text-primary)] border-[var(--text-primary)] text-white hover:bg-[var(--text-primary)]"
                : "bg-[var(--bg-surface)] border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            <span>Filter Outlets</span>
            {selectedOutletIds.length < initialData.length && (
              <span className={`flex items-center justify-center text-[10px] font-semibold w-5 h-5 rounded-full ${
                isFilterVisible ? "bg-white text-[var(--text-primary)]" : "bg-[var(--text-primary)] text-white"
              }`}>
                {selectedOutletIds.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Outlet Selection Filter Card */}
      {isFilterVisible && (
        <Card className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] shadow-sm p-4 mb-8">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Filter Outlets
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Toggle outlets below to update metrics and tables
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAll}
                  className="text-xs h-8 border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)] cursor-pointer select-none"
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deselectAll}
                  className="text-xs h-8 border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)] cursor-pointer select-none"
                >
                  Clear All
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {initialData.map((outlet) => {
                const isSelected = selectedOutletIds.includes(outlet.id);
                return (
                  <button
                    key={outlet.id}
                    onClick={() => toggleOutlet(outlet.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 flex items-center gap-1.5 cursor-pointer select-none ${
                      isSelected
                        ? "bg-[var(--text-primary)] border-[var(--text-primary)] text-white shadow-sm font-semibold"
                        : "bg-white border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-subtle)] hover:bg-[var(--bg-surface-raised)]"
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3 inline-block stroke-[2.5]" />}
                    {outlet.name}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={IndianRupee}
          label="Total Revenue"
          value={`₹${formatINR(totalRevenue)}`}
          subtext="For selected outlets"
        />
        <StatCard
          icon={Receipt}
          label="Total Bills"
          value={totalBillsCount}
          subtext="Printed bills only"
        />
        <StatCard
          icon={Percent}
          label="GST Collected"
          value={`₹${formatINR(totalGst)}`}
          subtext="CGST + SGST"
        />
        <StatCard
          icon={Tag}
          label="Total Discount"
          value={`₹${formatINR(totalDiscount)}`}
          subtext="Total discounts given"
        />
        <StatCard
          icon={Wallet}
          label="Cash Drawer Balance"
          value={`₹${formatINR(totalCashboxBalance)}`}
          subtext="Consolidated cash in hand"
        />
        <StatCard
          icon={UserX}
          label="Total Walkaways"
          value={totalWalkawayCount}
          subtext="No purchase customers"
        />
      </div>

      {/* Breakdown grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div>
          <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">
            Payment Breakdown
          </h2>
          <Card className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] shadow-sm">
            <CardContent className="p-6">
              <div className="space-y-4">
                {[
                  { label: "Cash", value: paymentBuckets.cash },
                  { label: "Card", value: paymentBuckets.card },
                  { label: "UPI", value: paymentBuckets.upi },
                  { label: "Delivery", value: paymentBuckets.online },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-[var(--text-secondary)] font-medium">
                      {label}
                    </span>
                    <span className="font-mono text-[var(--text-primary)]">
                      ₹ {value.toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">
            Customer Walkaways Breakdown
          </h2>
          <Card className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] shadow-sm">
            <CardContent className="p-6">
              <div className="space-y-4">
                {Object.entries(reasonStats).map(([label, value]) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-[var(--text-secondary)] font-medium">
                      {label}
                    </span>
                    <span className="font-mono text-[var(--text-primary)]">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
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
                  "Cash Box",
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
                    colSpan={7}
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
                        ₹{formatINR(stat.cashboxBalance)}
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
                      ₹{formatINR(totalCashboxBalance)}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-medium text-[var(--text-primary)] text-right font-bold">
                      {totalWalkawayCount}
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
