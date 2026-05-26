"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CreateOutletModal } from "@/components/outlets/create-outlet-modal";
import { EditOutletModal } from "@/components/outlets/edit-outlet-modal";

interface OutletsClientProps {
  initialData: any[];
}

export function OutletsClient({ initialData }: OutletsClientProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">All Outlets</h2>
        <CreateOutletModal />
      </div>

      <div className="border border-border-default rounded-lg bg-bg-surface overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Outlet Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>GSTIN</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-text-muted h-24">
                  No outlets found.
                </TableCell>
              </TableRow>
            ) : (
              initialData.map((outlet) => (
                <TableRow key={outlet.id}>
                  <TableCell className="font-medium">{outlet.name}</TableCell>
                  <TableCell>
                    {outlet.address ? `${outlet.address} (State: ${outlet.stateCode})` : `State: ${outlet.stateCode}`}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-text-muted">
                    {outlet.gstin || "N/A"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={outlet.isActive ? "default" : "secondary"} className={outlet.isActive ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : ""}>
                      {outlet.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <EditOutletModal outlet={outlet} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
