"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Check } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";

/* ─── helpers ─────────────────────────────────────────── */

function toLocalDateString(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(str: string): Date {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/* ─── component ───────────────────────────────────────── */

export function DateRangeFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const todayStr = toLocalDateString(new Date());

  // What's currently applied (shown on button label)
  const appliedFrom = searchParams.get("from") || todayStr;
  const appliedTo = searchParams.get("to") || todayStr;

  // Draft range the user is picking inside the open calendar
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange>({
    from: parseLocalDate(appliedFrom),
    to: parseLocalDate(appliedTo),
  });

  const containerRef = useRef<HTMLDivElement>(null);

  // Reset draft to the applied values each time the picker opens
  const handleOpen = () => {
    setDraft({
      from: parseLocalDate(appliedFrom),
      to: parseLocalDate(appliedTo),
    });
    setOpen(true);
  };

  // Close on outside click — but NOT when clicking inside the calendar
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    // Use capture phase so we see it before anything else
    document.addEventListener("mousedown", onMouseDown, true);
    return () => document.removeEventListener("mousedown", onMouseDown, true);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  /* Apply the draft range and navigate */
  const handleApply = () => {
    if (!draft?.from) {
      toast.error("Please select a start date");
      return;
    }

    const to = draft.to ?? draft.from; // single day if only from picked
    const diffDays = Math.ceil(
      (to.getTime() - draft.from.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays > 62) {
      toast.error("Date range cannot exceed 62 days");
      return;
    }

    setOpen(false);

    const params = new URLSearchParams(searchParams.toString());
    params.set("from", toLocalDateString(draft.from));
    params.set("to", toLocalDateString(to));
    router.push(`${pathname}?${params.toString()}`);
    router.refresh();
  };

  /* Label always reflects the APPLIED (URL) dates, not the draft */
  const displayLabel = () => {
    const from = parseLocalDate(appliedFrom);
    const to = parseLocalDate(appliedTo);
    if (appliedFrom === appliedTo) return format(from, "MMM d, yyyy");
    return `${format(from, "MMM d")} – ${format(to, "MMM d, yyyy")}`;
  };

  /* Preview label inside the footer */
  const previewLabel = () => {
    if (draft?.from && draft?.to) {
      if (toLocalDateString(draft.from) === toLocalDateString(draft.to))
        return format(draft.from, "MMM d, yyyy");
      return `${format(draft.from, "MMM d")} – ${format(draft.to, "MMM d, yyyy")}`;
    }
    if (draft?.from) return `From ${format(draft.from, "MMM d, yyyy")}…`;
    return "Select a start date";
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* ── Trigger button ───────────────────────────────── */}
      <button
        type="button"
        id="date-range-filter-trigger"
        onClick={open ? () => setOpen(false) : handleOpen}
        className={cn(
          "inline-flex items-center gap-2 h-9 px-3 rounded-md text-sm",
          "bg-[var(--bg-surface)] border border-[var(--border-default)]",
          "text-[var(--text-primary)] transition-colors",
          "hover:bg-[var(--bg-hover)] hover:border-[var(--border-strong)]",
          "min-w-[200px] whitespace-nowrap",
          open && "border-[var(--border-strong)] bg-[var(--bg-hover)]"
        )}
      >
        <CalendarIcon
          className="h-4 w-4 text-[var(--text-secondary)] shrink-0"
          strokeWidth={1.5}
        />
        <span className="flex-1 text-left">{displayLabel()}</span>
      </button>

      {/* ── Calendar dropdown ─────────────────────────────── */}
      {open && (
        <div
          className={cn(
            "absolute right-0 top-full mt-1.5 z-50",
            "bg-[var(--bg-surface)] border border-[var(--border-default)]",
            "shadow-xl rounded-xl overflow-hidden"
          )}
          // Stop mousedown from bubbling to the document listener
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Calendar
            mode="range"
            selected={draft}
            onSelect={(val) => val && setDraft(val)}
            numberOfMonths={2}
            disabled={{ after: new Date() }}
            defaultMonth={draft?.from}
            className="p-3"
          />

          {/* ── Footer ─────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-[var(--border-default)] bg-[var(--bg-surface-raised)]">
            <span className="text-xs text-[var(--text-secondary)] truncate">
              {previewLabel()}
            </span>
            <button
              type="button"
              onClick={handleApply}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium",
                "bg-[var(--accent-primary)] text-[var(--text-inverse)]",
                "hover:bg-[var(--accent-primary-hover)] transition-colors"
              )}
            >
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
