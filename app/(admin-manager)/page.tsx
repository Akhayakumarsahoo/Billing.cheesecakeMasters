import {
  IndianRupee,
  Percent,
  Banknote,
  Smartphone,
  CreditCard,
  Receipt,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function SalesDashboard() {
  return (
    <>
      {/* Section 1 — Page Header + Filters */}
      <div className="mb-8">
        <h1 className="text-xl font-medium text-[#111110]">
          Sales Dashboard
        </h1>
        <p className="text-sm text-[#6B6B68] mt-1">
          All outlets · All time
        </p>

        <div className="mt-6">
          <div className="flex items-center gap-2 inline-flex">
            <Input
              type="date"
              defaultValue="2025-01-01"
              className="w-[160px]"
            />
            <span className="text-text-secondary">→</span>
            <Input
              type="date"
              defaultValue="2025-12-31"
              className="w-[160px]"
            />
          </div>
        </div>
      </div>

      {/* Section 2 — Metric Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card className="bg-white rounded-lg border border-[#E2E1DD] shadow-none">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <IndianRupee
                className="h-5 w-5 text-[#6B6B68]"
                strokeWidth={1.5}
              />
              <span className="text-sm text-[#6B6B68]">Total Revenue</span>
            </div>
            <div className="text-2xl font-medium font-mono text-[#111110] mb-1">
              ₹4,28,500.00
            </div>
            <div className="text-xs text-[#9C9C99]">Across all outlets</div>
          </CardContent>
        </Card>

        <Card className="bg-white rounded-lg border border-[#E2E1DD] shadow-none">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Receipt
                className="h-5 w-5 text-[#6B6B68]"
                strokeWidth={1.5}
              />
              <span className="text-sm text-[#6B6B68]">Total Bills</span>
            </div>
            <div className="text-2xl font-medium font-mono text-[#111110] mb-1">
              1,284
            </div>
            <div className="text-xs text-[#9C9C99]">Printed bills only</div>
          </CardContent>
        </Card>

        <Card className="bg-white rounded-lg border border-[#E2E1DD] shadow-none">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Percent
                className="h-5 w-5 text-[#6B6B68]"
                strokeWidth={1.5}
              />
              <span className="text-sm text-[#6B6B68]">GST Collected</span>
            </div>
            <div className="text-2xl font-medium font-mono text-[#111110] mb-1">
              ₹38,520.00
            </div>
            <div className="text-xs text-[#9C9C99]">CGST + SGST</div>
          </CardContent>
        </Card>
      </div>

      {/* Section 3 — Sales by Outlet Table */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-[#111110] mb-4">
          Sales by Outlet
        </h2>
        <div className="bg-white rounded-lg border border-[#E2E1DD] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-[#E2E1DD]">
                <TableHead className="text-xs font-medium text-[#6B6B68] uppercase tracking-wide text-left h-10">
                  Outlet
                </TableHead>
                <TableHead className="text-xs font-medium text-[#6B6B68] uppercase tracking-wide text-right h-10">
                  Bills
                </TableHead>
                <TableHead className="text-xs font-medium text-[#6B6B68] uppercase tracking-wide text-right h-10">
                  Revenue
                </TableHead>
                <TableHead className="text-xs font-medium text-[#6B6B68] uppercase tracking-wide text-right h-10">
                  CGST
                </TableHead>
                <TableHead className="text-xs font-medium text-[#6B6B68] uppercase tracking-wide text-right h-10">
                  SGST
                </TableHead>
                <TableHead className="text-xs font-medium text-[#6B6B68] uppercase tracking-wide text-right h-10">
                  GST Total
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="border-[#E2E1DD] hover:bg-[#F0EFED]">
                <TableCell className="text-sm font-medium text-[#111110]">
                  Outlet 1 — MG Road
                </TableCell>
                <TableCell className="text-sm text-[#111110] text-right">
                  524
                </TableCell>
                <TableCell className="font-mono text-sm text-[#111110] text-right">
                  ₹1,82,400.00
                </TableCell>
                <TableCell className="font-mono text-sm text-[#111110] text-right">
                  ₹8,208.00
                </TableCell>
                <TableCell className="font-mono text-sm text-[#111110] text-right">
                  ₹8,208.00
                </TableCell>
                <TableCell className="font-mono text-sm text-[#111110] text-right">
                  ₹16,416.00
                </TableCell>
              </TableRow>
              <TableRow className="border-[#E2E1DD] bg-[#FAFAF9] hover:bg-[#F0EFED]">
                <TableCell className="text-sm font-medium text-[#111110]">
                  Outlet 2 — Bhubaneswar
                </TableCell>
                <TableCell className="text-sm text-[#111110] text-right">
                  418
                </TableCell>
                <TableCell className="font-mono text-sm text-[#111110] text-right">
                  ₹1,40,200.00
                </TableCell>
                <TableCell className="font-mono text-sm text-[#111110] text-right">
                  ₹6,309.00
                </TableCell>
                <TableCell className="font-mono text-sm text-[#111110] text-right">
                  ₹6,309.00
                </TableCell>
                <TableCell className="font-mono text-sm text-[#111110] text-right">
                  ₹12,618.00
                </TableCell>
              </TableRow>
              <TableRow className="border-[#E2E1DD] hover:bg-[#F0EFED]">
                <TableCell className="text-sm font-medium text-[#111110]">
                  Outlet 3 — Cuttack
                </TableCell>
                <TableCell className="text-sm text-[#111110] text-right">
                  342
                </TableCell>
                <TableCell className="font-mono text-sm text-[#111110] text-right">
                  ₹1,05,900.00
                </TableCell>
                <TableCell className="font-mono text-sm text-[#111110] text-right">
                  ₹4,765.50
                </TableCell>
                <TableCell className="font-mono text-sm text-[#111110] text-right">
                  ₹4,765.50
                </TableCell>
                <TableCell className="font-mono text-sm text-[#111110] text-right">
                  ₹9,531.00
                </TableCell>
              </TableRow>
              <TableRow className="border-0 bg-[#FAFAF9] hover:bg-[#FAFAF9]">
                <TableCell className="text-sm font-medium text-[#111110]"></TableCell>
                <TableCell className="text-sm font-medium text-[#111110] text-right">
                  1,284
                </TableCell>
                <TableCell className="font-mono text-sm font-medium text-[#111110] text-right">
                  ₹4,28,500.00
                </TableCell>
                <TableCell className="font-mono text-sm font-medium text-[#111110] text-right">
                  ₹19,282.50
                </TableCell>
                <TableCell className="font-mono text-sm font-medium text-[#111110] text-right">
                  ₹19,282.50
                </TableCell>
                <TableCell className="font-mono text-sm font-medium text-[#111110] text-right">
                  ₹38,565.00
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Section 4 — Payment Mode Summary */}
      <div>
        <h2 className="text-lg font-medium text-[#111110] mb-4">
          Payment Breakdown
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-white rounded-lg border border-[#E2E1DD] shadow-none">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Banknote
                  className="h-5 w-5 text-[#111110]"
                  strokeWidth={1.5}
                />
                <span className="text-sm text-[#6B6B68]">Cash</span>
              </div>
              <div className="text-2xl font-medium font-mono text-[#111110] mb-1">
                ₹2,14,250.00
              </div>
              <div className="text-xs text-[#9C9C99]">640 transactions</div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-lg border border-[#E2E1DD] shadow-none">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Smartphone
                  className="h-5 w-5 text-[#378ADD]"
                  strokeWidth={1.5}
                />
                <span className="text-sm text-[#6B6B68]">UPI</span>
              </div>
              <div className="text-2xl font-medium font-mono text-[#111110] mb-1">
                ₹1,71,400.00
              </div>
              <div className="text-xs text-[#9C9C99]">512 transactions</div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-lg border border-[#E2E1DD] shadow-none">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard
                  className="h-5 w-5 text-[#1D9E75]"
                  strokeWidth={1.5}
                />
                <span className="text-sm text-[#6B6B68]">Card</span>
              </div>
              <div className="text-2xl font-medium font-mono text-[#111110] mb-1">
                ₹42,850.00
              </div>
              <div className="text-xs text-[#9C9C99]">132 transactions</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

