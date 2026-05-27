"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function DateRangeFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Helper to format date as YYYY-MM-DD local time
  const getLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalDateString(new Date());
  
  const initialFrom = searchParams.get("from") || todayStr;
  const initialTo = searchParams.get("to") || todayStr;

  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);

  const handleDateChange = (type: "from" | "to", value: string) => {
    if (!value) return; // Ignore empty

    let newFrom = type === "from" ? value : from;
    let newTo = type === "to" ? value : to;

    const fromDate = new Date(newFrom);
    const toDate = new Date(newTo);

    if (toDate < fromDate) {
      toast.error("End date cannot be before start date");
      return;
    }

    const diffTime = toDate.getTime() - fromDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 62) {
      toast.error("Date range cannot exceed 2 months");
      return;
    }

    if (type === "from") setFrom(value);
    if (type === "to") setTo(value);

    // Update URL
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", newFrom);
    params.set("to", newTo);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2 bg-[var(--bg-surface)] p-2 rounded-lg border border-[var(--border-default)] w-full sm:w-auto">
      <div className="flex items-center gap-2 flex-1 sm:flex-none">
        <span className="text-sm text-[var(--text-secondary)] hidden sm:inline">From</span>
        <Input 
          type="date" 
          value={from} 
          max={todayStr}
          onChange={(e) => handleDateChange("from", e.target.value)}
          className="h-9 bg-transparent border-none shadow-none focus-visible:ring-0 px-2 w-full sm:w-auto"
        />
      </div>
      <div className="text-[var(--text-muted)]">-</div>
      <div className="flex items-center gap-2 flex-1 sm:flex-none">
        <span className="text-sm text-[var(--text-secondary)] hidden sm:inline">To</span>
        <Input 
          type="date" 
          value={to} 
          max={todayStr}
          onChange={(e) => handleDateChange("to", e.target.value)}
          className="h-9 bg-transparent border-none shadow-none focus-visible:ring-0 px-2 w-full sm:w-auto"
        />
      </div>
    </div>
  );
}
