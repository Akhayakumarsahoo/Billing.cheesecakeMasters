"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Check, X } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { Drawer, DrawerContent } from "@/components/ui/drawer";

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

function isSameDayStr(d1?: Date, d2?: Date) {
  if (!d1 || !d2) return false;
  return toLocalDateString(d1) === toLocalDateString(d2);
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

  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1023px)");
    setIsMobileOrTablet(mql.matches);
    const onChange = (e: MediaQueryListEvent) => {
      setIsMobileOrTablet(e.matches);
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);

  // Reset draft to the applied values each time the picker opens
  const handleOpen = () => {
    setDraft({
      from: parseLocalDate(appliedFrom),
      to: parseLocalDate(appliedTo),
    });
    setOpen(true);
  };

  // Close on outside click (only for desktop) — but NOT when clicking inside the calendar
  useEffect(() => {
    if (!open || isMobileOrTablet) return;
    const onMouseDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown, true);
    return () => document.removeEventListener("mousedown", onMouseDown, true);
  }, [open, isMobileOrTablet]);

  // Close on Escape (only for desktop)
  useEffect(() => {
    if (!open || isMobileOrTablet) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, isMobileOrTablet]);

  // Predefined shortcuts calculations
  const getShortcutList = (isMobile: boolean) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Yesterday
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    // Last 7 Days
    const last7 = new Date(today);
    last7.setDate(today.getDate() - 6);

    // Last 30 Days
    const last30 = new Date(today);
    last30.setDate(today.getDate() - 29);

    // This Month
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Last Month
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    return [
      { key: "today", label: "Today", from: today, to: today },
      { key: "yesterday", label: "Yesterday", from: yesterday, to: yesterday },
      { key: "last7", label: isMobile ? "Last 7 days" : "Last 7 Days", from: last7, to: today },
      { key: "last30", label: isMobile ? "Last 30 days" : "Last 30 Days", from: last30, to: today },
      { key: "thisMonth", label: "This Month", from: thisMonthStart, to: today },
      { key: "lastMonth", label: "Last Month", from: lastMonthStart, to: lastMonthEnd },
    ];
  };

  const activeShortcutKey = (() => {
    if (!draft?.from || !draft?.to) return null;
    const shortcuts = getShortcutList(false);
    for (const s of shortcuts) {
      if (isSameDayStr(draft.from, s.from) && isSameDayStr(draft.to, s.to)) {
        return s.key;
      }
    }
    return null;
  })();

  const handleShortcutClick = (key: string, from: Date, to: Date) => {
    setDraft({ from, to });
  };

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

  /* Preview label inside the footer for desktop */
  const previewLabelDesktop = () => {
    if (draft?.from) {
      const fromStr = format(draft.from, "dd/MM/yyyy");
      const toStr = draft.to ? format(draft.to, "dd/MM/yyyy") : fromStr;
      return `${fromStr} to ${toStr}`;
    }
    return "Select date range";
  };

  const displayYear = () => {
    if (draft?.from) {
      return draft.from.getFullYear();
    }
    return new Date().getFullYear();
  };

  const displaySelectedDateMobile = () => {
    if (draft?.from) {
      if (!draft.to || toLocalDateString(draft.from) === toLocalDateString(draft.to)) {
        return format(draft.from, "d MMM");
      }
      if (draft.from.getFullYear() === draft.to.getFullYear()) {
        return `${format(draft.from, "d MMM")} - ${format(draft.to, "d MMM")}`;
      }
      return `${format(draft.from, "d MMM yyyy")} - ${format(draft.to, "d MMM yyyy")}`;
    }
    return "Select Range";
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

      {/* ── Desktop Calendar dropdown ─────────────────────── */}
      {open && !isMobileOrTablet && (
        <div
          className={cn(
            "absolute right-0 top-full mt-1.5 z-50",
            "bg-[var(--bg-surface)] border border-[var(--border-default)]",
            "shadow-xl rounded-xl overflow-hidden flex flex-col"
          )}
          // Stop mousedown from bubbling to the document listener
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Main Body */}
          <div className="flex">
            {/* Sidebar */}
            <div className="w-44 flex flex-col border-r border-[var(--border-default)] py-2 bg-[var(--bg-surface)]">
              {getShortcutList(false).map((s) => {
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

            {/* Calendar */}
            <div className="p-3">
              <Calendar
                mode="range"
                selected={draft}
                onSelect={(val) => val && setDraft(val)}
                numberOfMonths={2}
                disabled={{ after: new Date() }}
                defaultMonth={draft?.from}
                className="relative p-0"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-[var(--border-default)] bg-[var(--bg-surface-raised)]">
            <span className="text-xs text-[var(--text-primary)] font-mono">
              {previewLabelDesktop()}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={cn(
                  "px-4 py-1.5 rounded-md text-xs font-medium border transition-colors",
                  "border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                )}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                className={cn(
                  "px-4 py-1.5 rounded-md text-xs font-medium transition-colors",
                  "bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--text-inverse)]"
                )}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile/Tablet Drawer ───────────────────────────── */}
      {isMobileOrTablet && (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="bg-[var(--bg-surface)] p-0 max-h-[95vh] flex flex-col">
            {/* Header */}
            <div className="relative flex items-center justify-between px-6 pt-4 pb-2 border-b border-[var(--border-default)]">
              <div className="w-6" />
              <h3 className="text-base font-medium text-[var(--text-primary)] text-center flex-1">
                Select Date
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>

            {/* Selected Date Summary */}
            <div className="flex flex-col px-6 py-3 border-b border-[var(--border-default)] bg-[var(--bg-surface-raised)]">
              <span className="text-xs text-[var(--text-secondary)] font-mono">
                {displayYear()}
              </span>
              <span className="text-xl font-medium text-[var(--text-primary)] font-mono mt-0.5">
                {displaySelectedDateMobile()}
              </span>
            </div>

            {/* Calendar */}
            <div className="flex justify-center p-4 border-b border-[var(--border-default)] overflow-y-auto">
              <Calendar
                mode="range"
                selected={draft}
                onSelect={(val) => val && setDraft(val)}
                numberOfMonths={1}
                disabled={{ after: new Date() }}
                defaultMonth={draft?.from}
                className="relative w-full max-w-sm sm:max-w-md"
                classNames={{
                  root: "w-full",
                  months: "w-full",
                  month: "w-full",
                }}
              />
            </div>

            {/* Shortcuts Grid */}
            <div className="p-6">
              <div className="grid grid-cols-3 gap-2">
                {getShortcutList(true).map((s) => {
                  const isActive = activeShortcutKey === s.key;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => handleShortcutClick(s.key, s.from, s.to)}
                      className={cn(
                        "py-2 px-1 rounded-full text-center text-xs transition-colors border select-none font-medium truncate",
                        isActive
                          ? "border-[var(--accent-primary)] text-[var(--text-inverse)] bg-[var(--accent-primary)]"
                          : "border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                      )}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer buttons */}
            <div className="flex items-center gap-3 p-6 border-t border-[var(--border-default)] bg-[var(--bg-surface-raised)] mt-auto pb-8">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={cn(
                  "flex-1 py-3 px-4 rounded-md text-sm font-medium text-center border transition-colors",
                  "border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                )}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                className={cn(
                  "flex-1 py-3 px-4 rounded-md text-sm font-medium text-center transition-colors",
                  "bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--text-inverse)]"
                )}
              >
                Confirm
              </button>
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}
