"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  BarChart3,
  Calendar as CalendarIcon,
  Tag,
  Users,
  AlertCircle,
  Receipt,
  Eye,
  Search,
  ShoppingCart,
  TrendingUp,
  UserMinus
} from "lucide-react";
import { format } from "date-fns";
import { DateRangeFilter } from "@/components/date-range-filter";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatINR } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Define TypeScript interfaces for our reports client props

type SerializedPayment = {
  mode: string;
  amount: string;
};

type SerializedLineItem = {
  id: string;
  itemName: string;
  quantity: string;
  unit: string;
  basePrice: string;
  gstRate: string;
};

type SerializedBill = {
  id: string;
  billNumber: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  grandTotal: string;
  subtotal: string;
  totalCgst: string;
  totalSgst: string;
  totalGst: string;
  discount: string;
  discountType: string | null;
  discountReason: string | null;
  discountValue: string | null;
  payments: SerializedPayment[];
  lineItems: SerializedLineItem[];
  customerName?: string | null;
  customerPhone?: string | null;
  completedAt?: string | null;
};

interface ReportsClientProps {
  outletId: string; // "all" or specific outlet uuid
  outlets: { id: string; name: string }[];
  rangeError: boolean;
  menuItems?: { id: string; name: string; sku: string | null }[];
  selectedItemId?: string;
  itemSalesSummary?: {
    selectedItemName?: string;
    selectedItemSku?: string | null;
    totalQuantity: string;
    totalAmount: string;
    averagePrice: string;
    allPerformance?: {
      name: string;
      sku: string | null;
      quantity: string;
      amount: string;
      averagePrice: string;
    }[];
  };
  discountReport?: {
    totalDiscount: string;
    bills: SerializedBill[];
  };
  walkawayReport?: {
    totalWalkaways: number;
    walkaways: {
      id: string;
      reason: string;
      customReason: string | null;
      createdAt: string;
      createdByEmail: string;
    }[];
  };
  customerReport?: {
    totalCustomers: number;
    customers: SerializedBill[];
  };
  salesReportData?: {
    totalSales: string;
    rows: { date: string; [key: string]: string | number }[];
  };
}

export function ReportsClient({
  outletId,
  outlets,
  rangeError,
  menuItems = [],
  selectedItemId = "all",
  itemSalesSummary,
  discountReport,
  walkawayReport,
  customerReport,
  salesReportData,
}: ReportsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Active tab selection from query params (default is item-wise)
  const activeTab = searchParams.get("tab") || "item-wise";

  // Selected item selection local state (for Item-wise Sales tab)
  const [localItemId, setLocalItemId] = useState(selectedItemId);

  // Readonly modal view state for displaying a bill detail
  const [selectedBill, setSelectedBill] = useState<SerializedBill | null>(null);

  // Sync state if selectedItemId prop changes
  useEffect(() => {
    setLocalItemId(selectedItemId);
  }, [selectedItemId]);

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleApplyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("itemId", localItemId);
    router.push(`${pathname}?${params.toString()}`);
    router.refresh();
  };

  const formatPrice = (val: string | number) => {
    const parsed = typeof val === "string" ? parseFloat(val) : val;
    return `₹${formatINR(parsed)}`;
  };

  const formatDateTime = (dateStr: string) => {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(dateStr));
  };

  const formatLocalDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(y, m - 1, d));
  };

  // ────────────────────────────────────────────────────────────────────────
  // REPORT 1: All Outlets Sales Report
  // ────────────────────────────────────────────────────────────────────────
  if (outletId === "all") {
    // Generate totals per outlet for footer
    const columnTotals: Record<string, number> = {};
    outlets.forEach((o) => {
      columnTotals[o.id] = 0;
    });

    salesReportData?.rows.forEach((row) => {
      outlets.forEach((o) => {
        const val = parseFloat(row[o.id] as string) || 0;
        columnTotals[o.id] += val;
      });
    });

    const sumDailyTotal = (row: { [key: string]: string | number }) => {
      return outlets.reduce((sum, o) => sum + (parseFloat(row[o.id] as string) || 0), 0);
    };

    const grandTotalSales = Object.values(columnTotals).reduce((sum, val) => sum + val, 0);

    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-medium text-[var(--text-primary)]">All Outlets Sales Report</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Consolidated day-by-day sales data across all active outlets
            </p>
          </div>
          <div>
            <DateRangeFilter />
          </div>
        </div>

        {rangeError ? (
          <Alert variant="destructive" className="bg-[var(--state-error-bg)] border-[var(--state-error-border)] text-[var(--state-error-text)]">
            <AlertCircle className="h-4 w-4 text-[var(--state-error-text)]" />
            <AlertTitle className="font-medium">Date Range Limit Exceeded</AlertTitle>
            <AlertDescription className="text-sm mt-1">
              The All Outlets Sales Report is limited to a maximum date range of 31 days (1 month). Please adjust the selected dates using the date picker above.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard
                icon={BarChart3}
                label="Total Sales (All Outlets)"
                value={formatPrice(grandTotalSales)}
              />
            </div>

            <Card className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] shadow-sm">
              <CardHeader className="p-6 pb-4">
                <CardTitle className="text-lg font-medium text-[var(--text-primary)]">Sales by Outlet and Date</CardTitle>
                <CardDescription className="text-sm text-[var(--text-secondary)]">
                  Rows represent days and columns show sales performance per outlet.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-[var(--border-default)] hover:bg-transparent">
                      <TableHead className="w-[180px] font-medium text-[var(--text-secondary)]">Date</TableHead>
                      {outlets.map((o) => (
                        <TableHead key={o.id} className="text-right font-medium text-[var(--text-secondary)]">
                          {o.name}
                        </TableHead>
                      ))}
                      <TableHead className="text-right font-medium text-[var(--text-secondary)]">Day Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesReportData?.rows.map((row, idx) => {
                      const dayTotal = sumDailyTotal(row);
                      return (
                        <TableRow key={row.date} className={idx % 2 === 1 ? "bg-[var(--bg-surface-raised)]" : "bg-[var(--bg-surface)]"}>
                          <TableCell className="font-medium text-[var(--text-primary)]">
                            {formatLocalDate(row.date)}
                          </TableCell>
                          {outlets.map((o) => (
                            <TableCell key={o.id} className="text-right font-mono text-[var(--text-primary)]">
                              {formatPrice(row[o.id] as string)}
                            </TableCell>
                          ))}
                          <TableCell className="text-right font-mono font-medium text-[var(--text-primary)]">
                            {formatPrice(dayTotal)}
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {salesReportData?.rows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={outlets.length + 2} className="h-32 text-center text-[var(--text-muted)]">
                          No sales recorded in this date range.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                  {salesReportData?.rows.length ? (
                    <tfoot>
                      <TableRow className="border-t border-[var(--border-default)] bg-[var(--bg-surface-raised)] font-medium">
                        <TableCell className="text-[var(--text-primary)]">Total</TableCell>
                        {outlets.map((o) => (
                          <TableCell key={o.id} className="text-right font-mono text-[var(--text-primary)]">
                            {formatPrice(columnTotals[o.id])}
                          </TableCell>
                        ))}
                        <TableCell className="text-right font-mono font-medium text-[var(--text-primary)]">
                          {formatPrice(grandTotalSales)}
                        </TableCell>
                      </TableRow>
                    </tfoot>
                  ) : null}
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────
  // REPORTS FOR A SPECIFIC OUTLET
  // ────────────────────────────────────────────────────────────────────────
  const currentOutletName = outlets.find((o) => o.id === outletId)?.name || "Specific Outlet";

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-medium text-[var(--text-primary)]">Outlet Performance Reports</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Analyze sales, discounts, walkaways, and customers for {currentOutletName}
          </p>
        </div>
        <div>
          <DateRangeFilter />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="bg-[var(--bg-surface-raised)] border border-[var(--border-default)] p-1 rounded-lg">
          <TabsTrigger value="item-wise" className="rounded-md px-4 py-2 text-sm font-medium">
            Item-wise Sales
          </TabsTrigger>
          <TabsTrigger value="discount" className="rounded-md px-4 py-2 text-sm font-medium">
            Discount Report
          </TabsTrigger>
          <TabsTrigger value="walkaway" className="rounded-md px-4 py-2 text-sm font-medium">
            Walk Away Report
          </TabsTrigger>
          <TabsTrigger value="customer" className="rounded-md px-4 py-2 text-sm font-medium">
            Customer Directory
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: Item-wise Sales ─────────────────────────────────── */}
        <TabsContent value="item-wise" className="space-y-6 focus-visible:outline-none">
          <Card className="bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm rounded-xl">
            <CardHeader className="p-6 pb-4">
              <CardTitle className="text-base font-medium text-[var(--text-primary)]">Filter Items</CardTitle>
              <CardDescription className="text-sm text-[var(--text-secondary)]">
                Select a particular menu item or leave blank to see all items performance.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0 flex flex-col sm:flex-row items-end gap-3">
              <div className="flex-1 space-y-2">
                <span className="text-sm font-medium text-[var(--text-secondary)]">Select Menu Item</span>
                {(() => {
                  const selectedItem = menuItems.find((i) => i.id === localItemId);
                  const selectedItemLabel = localItemId === "all"
                    ? "All Items Performance"
                    : selectedItem
                      ? `${selectedItem.sku ? `[${selectedItem.sku}] ` : ""}${selectedItem.name}`
                      : "All Items Performance";
                  return (
                    <Select value={localItemId} onValueChange={(val) => setLocalItemId(val || "all")}>
                      <SelectTrigger className="w-full bg-[var(--bg-surface)] border-[var(--border-default)] text-sm">
                        <SelectValue placeholder="All Items">
                          {selectedItemLabel}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        <SelectItem value="all">All Items Performance</SelectItem>
                        {menuItems.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.sku ? `[${item.sku}] ` : ""}{item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                })()}
              </div>
              <Button
                onClick={handleApplyFilters}
                className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--text-inverse)] px-6 h-10 font-medium text-sm rounded-md"
              >
                Search/Apply
              </Button>
            </CardContent>
          </Card>

          {itemSalesSummary && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                  icon={ShoppingCart}
                  label="Total Quantity Sold"
                  value={parseFloat(itemSalesSummary.totalQuantity).toString()}
                />
                <StatCard
                  icon={BarChart3}
                  label="Total Sales Amount"
                  value={formatPrice(itemSalesSummary.totalAmount)}
                />
                <StatCard
                  icon={TrendingUp}
                  label="Average Selling Price"
                  value={formatPrice(itemSalesSummary.averagePrice)}
                />
              </div>

              {selectedItemId !== "all" ? (
                <Card className="bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm rounded-xl">
                  <CardHeader className="p-6 pb-4">
                    <CardTitle className="text-lg font-medium text-[var(--text-primary)]">
                      Performance Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <div className="bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-lg p-4 space-y-3">
                      <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2 text-sm">
                        <span className="text-[var(--text-secondary)] font-medium">Item Name</span>
                        <span className="font-medium text-[var(--text-primary)]">{itemSalesSummary.selectedItemName}</span>
                      </div>
                      <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2 text-sm">
                        <span className="text-[var(--text-secondary)] font-medium">SKU Reference</span>
                        <span className="font-mono text-[var(--text-primary)]">{itemSalesSummary.selectedItemSku || "N/A"}</span>
                      </div>
                      <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2 text-sm">
                        <span className="text-[var(--text-secondary)] font-medium">Quantity Sold</span>
                        <span className="font-mono font-medium text-[var(--text-primary)]">{parseFloat(itemSalesSummary.totalQuantity)}</span>
                      </div>
                      <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2 text-sm">
                        <span className="text-[var(--text-secondary)] font-medium">Total Billed</span>
                        <span className="font-mono font-medium text-[var(--text-primary)]">{formatPrice(itemSalesSummary.totalAmount)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-[var(--text-secondary)] font-medium">Avg Rate</span>
                        <span className="font-mono font-medium text-[var(--text-primary)]">{formatPrice(itemSalesSummary.averagePrice)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm rounded-xl">
                  <CardHeader className="p-6 pb-4">
                    <CardTitle className="text-lg font-medium text-[var(--text-primary)]">All Items Performance Ranking</CardTitle>
                    <CardDescription className="text-sm text-[var(--text-secondary)]">
                      Ranked performance metrics of all menu items sold, ordered from highest to lowest quantity.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-[var(--border-default)] hover:bg-transparent">
                          <TableHead className="w-[80px] font-medium text-[var(--text-secondary)] text-center">Rank</TableHead>
                          <TableHead className="font-medium text-[var(--text-secondary)]">Item Name</TableHead>
                          <TableHead className="font-medium text-[var(--text-secondary)]">SKU</TableHead>
                          <TableHead className="text-right font-medium text-[var(--text-secondary)]">Qty Sold</TableHead>
                          <TableHead className="text-right font-medium text-[var(--text-secondary)]">Total Amount</TableHead>
                          <TableHead className="text-right font-medium text-[var(--text-secondary)]">Avg Price</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itemSalesSummary.allPerformance?.map((perf, index) => (
                          <TableRow key={perf.name} className={index % 2 === 1 ? "bg-[var(--bg-surface-raised)]" : "bg-[var(--bg-surface)]"}>
                            <TableCell className="text-center font-medium text-[var(--text-primary)]">{index + 1}</TableCell>
                            <TableCell className="font-medium text-[var(--text-primary)]">{perf.name}</TableCell>
                            <TableCell className="font-mono text-sm text-[var(--text-secondary)]">{perf.sku || "N/A"}</TableCell>
                            <TableCell className="text-right font-mono font-medium text-[var(--text-primary)]">
                              {parseFloat(perf.quantity)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-[var(--text-primary)]">
                              {formatPrice(perf.amount)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-[var(--text-primary)]">
                              {formatPrice(perf.averagePrice)}
                            </TableCell>
                          </TableRow>
                        ))}

                        {(!itemSalesSummary.allPerformance || itemSalesSummary.allPerformance.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={6} className="h-32 text-center text-[var(--text-muted)]">
                              No performance data found for the selected range.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* ─── TAB 2: Discount Report ─────────────────────────────────── */}
        <TabsContent value="discount" className="space-y-6 focus-visible:outline-none">
          {discountReport && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                  icon={Tag}
                  label="Total Discount Value Granted"
                  value={formatPrice(discountReport.totalDiscount)}
                />
              </div>

              <Card className="bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm rounded-xl">
                <CardHeader className="p-6 pb-4">
                  <CardTitle className="text-lg font-medium text-[var(--text-primary)]">Discounted Bills Registry</CardTitle>
                  <CardDescription className="text-sm text-[var(--text-secondary)]">
                    List of all bills generated with a discount applied in the selected date range. Click the bill number to view details.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-[var(--border-default)] hover:bg-transparent">
                        <TableHead className="font-medium text-[var(--text-secondary)]">Bill Number</TableHead>
                        <TableHead className="text-right font-medium text-[var(--text-secondary)]">Billed Amount</TableHead>
                        <TableHead className="font-medium text-[var(--text-secondary)]">Discount Type</TableHead>
                        <TableHead className="text-right font-medium text-[var(--text-secondary)]">Discount Value</TableHead>
                        <TableHead className="text-right font-medium text-[var(--text-secondary)]">Discount Amount</TableHead>
                        <TableHead className="text-right font-medium text-[var(--text-secondary)]">Grand Total</TableHead>
                        <TableHead className="font-medium text-[var(--text-secondary)]">Discount Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {discountReport.bills.map((bill, index) => (
                        <TableRow key={bill.id} className={index % 2 === 1 ? "bg-[var(--bg-surface-raised)]" : "bg-[var(--bg-surface)]"}>
                          <TableCell>
                            <button
                              onClick={() => setSelectedBill(bill)}
                              className="font-mono text-sm font-medium text-[var(--text-primary)] hover:underline flex items-center gap-1.5"
                            >
                              {bill.billNumber}
                              <Eye className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" strokeWidth={1.5} />
                            </button>
                          </TableCell>
                          <TableCell className="text-right font-mono text-[var(--text-primary)]">
                            {formatPrice(bill.subtotal)}
                          </TableCell>
                          <TableCell className="capitalize text-[var(--text-primary)]">
                            <Badge variant="outline" className="rounded font-medium px-2 py-0.5 text-xs">
                              {bill.discountType === "percentage" ? "Percentage" : "Fixed Amount"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-[var(--text-primary)]">
                            {bill.discountType === "percentage" ? `${parseFloat(bill.discountValue || "0")}%` : formatPrice(bill.discountValue || "0")}
                          </TableCell>
                          <TableCell className="text-right font-mono text-[var(--state-error-text)] font-medium">
                            {formatPrice(bill.discount)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium text-[var(--text-primary)]">
                            {formatPrice(bill.grandTotal)}
                          </TableCell>
                          <TableCell className="text-sm text-[var(--text-secondary)] max-w-[200px] truncate" title={bill.discountReason || "No reason specified"}>
                            {bill.discountReason || "N/A"}
                          </TableCell>
                        </TableRow>
                      ))}

                      {discountReport.bills.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="h-32 text-center text-[var(--text-muted)]">
                            No discounted bills logged in this date range.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ─── TAB 3: Walk Away Report ────────────────────────────────── */}
        <TabsContent value="walkaway" className="space-y-6 focus-visible:outline-none">
          {walkawayReport && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                  icon={UserMinus}
                  label="Total Walk Away Customers"
                  value={walkawayReport.totalWalkaways}
                />
              </div>

              <Card className="bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm rounded-xl">
                <CardHeader className="p-6 pb-4">
                  <CardTitle className="text-lg font-medium text-[var(--text-primary)]">Walk Away Customers Log</CardTitle>
                  <CardDescription className="text-sm text-[var(--text-secondary)]">
                    Audit log of customers who left the outlet without completing a billing purchase.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-[var(--border-default)] hover:bg-transparent">
                        <TableHead className="font-medium text-[var(--text-secondary)] w-[200px]">Date & Time</TableHead>
                        <TableHead className="font-medium text-[var(--text-secondary)]">Selected Reason</TableHead>
                        <TableHead className="font-medium text-[var(--text-secondary)]">Custom Specify Details</TableHead>
                        <TableHead className="font-medium text-[var(--text-secondary)]">Cashier Email</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {walkawayReport.walkaways.map((w, index) => (
                        <TableRow key={w.id} className={index % 2 === 1 ? "bg-[var(--bg-surface-raised)]" : "bg-[var(--bg-surface)]"}>
                          <TableCell className="font-medium text-[var(--text-primary)]">
                            {formatDateTime(w.createdAt)}
                          </TableCell>
                          <TableCell className="text-[var(--text-primary)] font-medium">
                            {w.reason}
                          </TableCell>
                          <TableCell className="text-sm text-[var(--text-secondary)]">
                            {w.customReason || "—"}
                          </TableCell>
                          <TableCell className="text-sm text-[var(--text-secondary)]">
                            {w.createdByEmail}
                          </TableCell>
                        </TableRow>
                      ))}

                      {walkawayReport.walkaways.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="h-32 text-center text-[var(--text-muted)]">
                            No customer walkaways logged in this date range.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ─── TAB 4: Customer Directory ──────────────────────────────── */}
        <TabsContent value="customer" className="space-y-6 focus-visible:outline-none">
          {customerReport && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                  icon={Users}
                  label="Total Registered Contacts"
                  value={customerReport.totalCustomers}
                />
              </div>

              <Card className="bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm rounded-xl">
                <CardHeader className="p-6 pb-4">
                  <CardTitle className="text-lg font-medium text-[var(--text-primary)]">Customer Contacts Directory</CardTitle>
                  <CardDescription className="text-sm text-[var(--text-secondary)]">
                    Permanent contact directory entries collected from billed transactions in the selected date range. Click the bill number to view details.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-[var(--border-default)] hover:bg-transparent">
                        <TableHead className="font-medium text-[var(--text-secondary)]">Customer Name</TableHead>
                        <TableHead className="font-medium text-[var(--text-secondary)]">Phone Number</TableHead>
                        <TableHead className="font-medium text-[var(--text-secondary)]">Linked Bill Number</TableHead>
                        <TableHead className="font-medium text-[var(--text-secondary)]">Date & Time</TableHead>
                        <TableHead className="text-right font-medium text-[var(--text-secondary)]">Grand Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerReport.customers.map((c, index) => (
                        <TableRow key={c.id} className={index % 2 === 1 ? "bg-[var(--bg-surface-raised)]" : "bg-[var(--bg-surface)]"}>
                          <TableCell className="font-medium text-[var(--text-primary)]">
                            {c.customerName || "N/A"}
                          </TableCell>
                          <TableCell className="font-mono text-sm text-[var(--text-primary)]">
                            {c.customerPhone || "N/A"}
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() => setSelectedBill(c)}
                              className="font-mono text-sm font-medium text-[var(--text-primary)] hover:underline flex items-center gap-1.5"
                            >
                              {c.billNumber}
                              <Eye className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" strokeWidth={1.5} />
                            </button>
                          </TableCell>
                          <TableCell className="text-sm text-[var(--text-secondary)]">
                            {formatDateTime(c.completedAt || new Date().toISOString())}
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium text-[var(--text-primary)]">
                            {formatPrice(c.grandTotal)}
                          </TableCell>
                        </TableRow>
                      ))}

                      {customerReport.customers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="h-32 text-center text-[var(--text-muted)]">
                            No customer contacts collected in this date range.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── READONLY BILL DETAIL DIALOG ──────────────────────────────── */}
      {selectedBill && (
        <Dialog open={!!selectedBill} onOpenChange={(open) => !open && setSelectedBill(null)}>
          <DialogContent className="max-w-md bg-[var(--bg-surface)] p-0 gap-0 overflow-hidden rounded-xl border-[var(--border-default)]">
            <DialogHeader className="p-4 border-b border-[var(--border-default)]">
              <div className="flex justify-between items-center pr-6">
                <DialogTitle className="text-xl font-mono text-[var(--text-primary)]">
                  {selectedBill.billNumber}
                </DialogTitle>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  selectedBill.status === 'printed' ? 'bg-[var(--state-success-bg)] text-[var(--state-success-text)] border border-[var(--state-success-border)]' :
                  selectedBill.status === 'cancelled' ? 'bg-[var(--state-error-bg)] text-[var(--state-error-text)] border border-[var(--state-error-border)]' :
                  'bg-[var(--state-info-bg)] text-[var(--state-info-text)] border border-[var(--state-info-border)]'
                }`}>
                  {selectedBill.status.toUpperCase()}
                </span>
              </div>
              <div className="text-sm text-[var(--text-secondary)] mt-1">
                {formatDateTime(selectedBill.createdAt)}
              </div>
            </DialogHeader>

            <div className="p-4 overflow-y-auto max-h-[50vh] space-y-4 bg-[var(--bg-base)]">
              {/* Customer Info */}
              {(selectedBill.customerName || selectedBill.customerPhone) && (
                <div>
                  <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wide">Customer Details</h3>
                  <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] p-3 text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Name:</span>
                      <span className="font-medium text-[var(--text-primary)]">{selectedBill.customerName || "Walk-in"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Phone:</span>
                      <span className="font-mono text-[var(--text-primary)]">{selectedBill.customerPhone || "N/A"}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Items List */}
              <div>
                <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wide">Items</h3>
                <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] overflow-hidden">
                  {selectedBill.lineItems.map((item) => (
                    <div key={item.id} className="p-3 border-b border-[var(--border-subtle)] last:border-0 flex justify-between">
                      <div>
                        <div className="text-sm font-medium text-[var(--text-primary)]">
                          {item.itemName}
                        </div>
                        <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                          {item.quantity} {item.unit} × {formatPrice(item.basePrice)}
                        </div>
                      </div>
                      <div className="text-sm font-mono text-[var(--text-primary)]">
                        {formatPrice(parseFloat(item.basePrice) * parseFloat(item.quantity))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wide">Payments</h3>
                <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] overflow-hidden">
                  {selectedBill.payments.map((p, i) => (
                    <div key={i} className="p-3 border-b border-[var(--border-subtle)] last:border-0 flex justify-between">
                      <div className="text-sm text-[var(--text-primary)] capitalize">{p.mode}</div>
                      <div className="text-sm font-mono text-[var(--text-primary)]">{formatPrice(p.amount)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Discount Reason */}
              {parseFloat(selectedBill.discount) > 0 && selectedBill.discountReason && (
                <div className="p-3 bg-red-50/50 rounded-lg border border-red-100/50 text-xs text-[var(--text-primary)] space-y-1">
                  <div className="font-semibold text-red-800">Discount Reason</div>
                  <div className="text-[var(--text-secondary)]">{selectedBill.discountReason}</div>
                </div>
              )}
            </div>

            {/* Calculations breakdown */}
            <div className="p-4 border-t border-[var(--border-default)] bg-[var(--bg-surface)] flex flex-col gap-3">
              <div className="space-y-1.5 text-sm text-[var(--text-secondary)] border-b border-[var(--border-subtle)] pb-3">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono">{formatPrice(selectedBill.subtotal)}</span>
                </div>
                {parseFloat(selectedBill.discount) > 0 && (
                  <div className="flex justify-between text-[var(--state-error-text)] font-medium">
                    <span>Discount</span>
                    <span className="font-mono">-{formatPrice(selectedBill.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>GST (CGST + SGST)</span>
                  <span className="font-mono">{formatPrice(selectedBill.totalGst)}</span>
                </div>
                {(() => {
                  const sub = parseFloat(selectedBill.subtotal);
                  const gst = parseFloat(selectedBill.totalGst);
                  const disc = parseFloat(selectedBill.discount);
                  const grand = parseFloat(selectedBill.grandTotal);
                  const roundOff = grand - (sub + gst - disc);
                  return (
                    <div className="flex justify-between">
                      <span>Round Off</span>
                      <span className="font-mono">{roundOff >= 0 ? "+" : ""}{formatPrice(roundOff)}</span>
                    </div>
                  );
                })()}
              </div>

              <div className="flex justify-between items-center text-lg font-medium">
                <span className="text-[var(--text-primary)]">Grand Total</span>
                <span className="font-mono font-medium text-[var(--text-primary)]">
                  {formatPrice(selectedBill.grandTotal)}
                </span>
              </div>

              <div className="flex justify-end pt-2 border-t border-[var(--border-subtle)]">
                <Button
                  onClick={() => setSelectedBill(null)}
                  className="bg-[var(--text-primary)] text-[var(--bg-surface)] hover:bg-[var(--text-secondary)] px-6"
                >
                  Okay
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
