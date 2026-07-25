"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronLeft, Check, X } from "lucide-react";
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

export interface DateRangeFilterProps {
  from?: string;
  to?: string;
  onSelect?: (from: string, to: string) => void;
  maxDays?: number;
}

/* ─── component ───────────────────────────────────────── */

export function DateRangeFilter({
  from: customFrom,
  to: customTo,
  onSelect,
  maxDays = 62,
}: DateRangeFilterProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const todayStr = toLocalDateString(new Date());

  // What's currently applied
  const appliedFrom = customFrom || searchParams.get("from") || todayStr;
  const appliedTo = customTo || searchParams.get("to") || todayStr;

  // Draft range the user is picking inside the open calendar
  const [open, setOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
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

  // Predefined shortcuts calculations
  const getShortcutList = (isMobile: boolean) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const last7 = new Date(today);
    last7.setDate(today.getDate() - 6);

    const last30 = new Date(today);
    last30.setDate(today.getDate() - 29);

    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

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
    return "custom";
  })();

  // Reset draft each time the picker opens
  const handleOpen = () => {
    const fromDate = parseLocalDate(appliedFrom);
    const toDate = parseLocalDate(appliedTo);
    setDraft({ from: fromDate, to: toDate });

    // Check if applied range matches any shortcut
    const shortcuts = getShortcutList(false);
    const isShortcutMatched = shortcuts.some(
      (s) => isSameDayStr(fromDate, s.from) && isSameDayStr(toDate, s.to)
    );

    // Show calendar only if custom range is active by default
    setShowCalendar(!isShortcutMatched);
    setOpen(true);
  };

  // Close on outside click (only for desktop)
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

  const handleShortcutClick = (key: string, from: Date, to: Date) => {
    setDraft({ from, to });

    const diffDays = Math.ceil(
      (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays > maxDays) {
      toast.error(`Date range cannot exceed ${maxDays === 93 ? "3 months (93 days)" : `${maxDays} days`}`);
      return;
    }

    setOpen(false);

    const fromStr = toLocalDateString(from);
    const toStr = toLocalDateString(to);

    if (onSelect) {
      onSelect(fromStr, toStr);
    } else {
      const params = new URLSearchParams(searchParams.toString());
      params.set("from", fromStr);
      params.set("to", toStr);
      router.push(`${pathname}?${params.toString()}`);
      router.refresh();
    }
  };

  /* Apply the draft range and navigate or trigger onSelect */
  const handleApply = () => {
    if (!draft?.from) {
      toast.error("Please select a start date");
      return;
    }

    const to = draft.to ?? draft.from;
    const diffDays = Math.ceil(
      (to.getTime() - draft.from.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays > maxDays) {
      toast.error(`Date range cannot exceed ${maxDays === 93 ? "3 months (93 days)" : `${maxDays} days`}`);
      return;
    }

    setOpen(false);

    const fromStr = toLocalDateString(draft.from);
    const toStr = toLocalDateString(to);

    if (onSelect) {
      onSelect(fromStr, toStr);
    } else {
      const params = new URLSearchParams(searchParams.toString());
      params.set("from", fromStr);
      params.set("to", toStr);
      router.push(`${pathname}?${params.toString()}`);
      router.refresh();
    }
  };

  /* Primary title label (e.g. "This Month", "Today", or "Custom Range") */
  const getPrimaryTitle = () => {
    const fromDate = parseLocalDate(appliedFrom);
    const toDate = parseLocalDate(appliedTo);

    const shortcuts = getShortcutList(false);
    for (const s of shortcuts) {
      if (isSameDayStr(fromDate, s.from) && isSameDayStr(toDate, s.to)) {
        return s.label;
      }
    }
    return "Custom Range";
  };

  /* Secondary date subtext formatted like "01,Jul 26 - 25,Jul 26" */
  const getDateSubtext = () => {
    const fromDate = parseLocalDate(appliedFrom);
    const toDate = parseLocalDate(appliedTo);
    return `${format(fromDate, "dd,MMM yy")} - ${format(toDate, "dd,MMM yy")}`;
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
          "inline-flex items-center justify-between gap-3 h-9 px-3.5 rounded-lg text-sm",
          "bg-[var(--bg-surface)] border border-[var(--border-default)]",
          "text-[var(--text-primary)] transition-all shadow-xs",
          "hover:bg-[var(--bg-hover)] hover:border-[var(--border-strong)]",
          "cursor-pointer select-none whitespace-nowrap min-w-[240px]",
          open && "border-[var(--border-strong)] bg-[var(--bg-hover)]"
        )}
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[var(--text-primary)]">
            {getPrimaryTitle()}
          </span>
          <span className="text-xs text-[var(--text-muted)] font-mono">
            {getDateSubtext()}
          </span>
        </div>
        <ChevronDown className="h-4 w-4 text-[var(--text-secondary)] shrink-0 transition-transform" />
      </button>

      {/* ── Desktop Calendar dropdown ─────────────────────── */}
      {open && !isMobileOrTablet && (
        <div
          className={cn(
            "absolute right-0 top-full mt-1.5 z-50",
            "bg-[var(--bg-surface)] border border-[var(--border-default)]",
            "shadow-xl rounded-xl overflow-hidden flex flex-col"
          )}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Main Body */}
          <div className="flex">
            {/* Sidebar Shortcuts List */}
            <div className="w-48 flex flex-col border-r border-[var(--border-default)] py-2 bg-[var(--bg-surface)]">
              {getShortcutList(false).map((s) => {
                const isActive = activeShortcutKey === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => handleShortcutClick(s.key, s.from, s.to)}
                    className={cn(
                      "w-full text-left py-2.5 px-4 text-xs font-medium transition-colors select-none cursor-pointer",
                      isActive
                        ? "bg-[var(--bg-active)] text-[var(--text-primary)] border-r-2 border-[var(--accent-primary)] font-semibold"
                        : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                    )}
                  >
                    {s.label}
                  </button>
                );
              })}

              {/* Custom Range Button */}
              <button
                type="button"
                onClick={() => setShowCalendar(true)}
                className={cn(
                  "w-full text-left py-2.5 px-4 text-xs font-medium transition-colors select-none cursor-pointer border-t border-[var(--border-subtle)] mt-1",
                  showCalendar || activeShortcutKey === "custom"
                    ? "bg-[var(--bg-active)] text-[var(--text-primary)] border-r-2 border-[var(--accent-primary)] font-semibold"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                )}
              >
                Custom Range
              </button>
            </div>

            {/* Calendar Grid (Visible only when Custom Range is selected) */}
            {showCalendar && (
              <div className="p-3 border-l border-[var(--border-subtle)]">
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
            )}
          </div>

          {/* Footer (Visible when Calendar is shown) */}
          {showCalendar && (
            <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-[var(--border-default)] bg-[var(--bg-surface-raised)]">
              <span className="text-xs text-[var(--text-primary)] font-mono">
                {previewLabelDesktop()}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className={cn(
                    "px-4 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer",
                    "border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                  )}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className={cn(
                    "px-4 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer",
                    "bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--text-inverse)]"
                  )}
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Mobile/Tablet Drawer ───────────────────────────── */}
      {isMobileOrTablet && (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="bg-[var(--bg-surface)] p-0 max-h-[95vh] flex flex-col">
            {/* Header */}
            <div className="relative flex items-center justify-between px-6 pt-4 pb-2 border-b border-[var(--border-default)]">
              {showCalendar ? (
                <button
                  type="button"
                  onClick={() => setShowCalendar(false)}
                  className="p-1 -ml-1 rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors cursor-pointer"
                  title="Back to shortcuts"
                >
                  <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
                </button>
              ) : (
                <div className="w-6" />
              )}
              <h3 className="text-base font-medium text-[var(--text-primary)] text-center flex-1">
                {showCalendar ? "Custom Date Range" : "Select Date"}
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 -mr-1 rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors cursor-pointer"
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

            {/* Shortcuts Grid (Shown ONLY when Custom Range is NOT active) */}
            {!showCalendar && (
              <div className="p-6">
                <div className="grid grid-cols-2 gap-2">
                  {getShortcutList(true).map((s) => {
                    const isActive = activeShortcutKey === s.key;
                    return (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => handleShortcutClick(s.key, s.from, s.to)}
                        className={cn(
                          "py-2.5 px-3 rounded-lg text-center text-xs transition-colors border select-none font-medium truncate cursor-pointer",
                          isActive
                            ? "border-[var(--accent-primary)] text-[var(--text-inverse)] bg-[var(--accent-primary)]"
                            : "border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                        )}
                      >
                        {s.label}
                      </button>
                    );
                  })}

                  {/* Custom Range Button for Mobile */}
                  <button
                    type="button"
                    onClick={() => setShowCalendar(true)}
                    className={cn(
                      "py-2.5 px-3 rounded-lg text-center text-xs transition-colors border select-none font-medium truncate cursor-pointer col-span-2",
                      activeShortcutKey === "custom"
                        ? "border-[var(--accent-primary)] text-[var(--text-inverse)] bg-[var(--accent-primary)]"
                        : "border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                    )}
                  >
                    Custom Range
                  </button>
                </div>
              </div>
            )}

            {/* Calendar Grid (Shown ONLY when Custom Range is active, hiding shortcuts) */}
            {showCalendar && (
              <div className="flex justify-center p-4 border-t border-[var(--border-default)] overflow-y-auto">
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
            )}

            {/* Footer buttons (Shown when Custom Range is active) */}
            {showCalendar && (
              <div className="flex items-center gap-3 p-6 border-t border-[var(--border-default)] bg-[var(--bg-surface-raised)] mt-auto pb-8">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex-1 py-3 px-4 rounded-md text-sm font-medium text-center border transition-colors cursor-pointer",
                    "border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                  )}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className={cn(
                    "flex-1 py-3 px-4 rounded-md text-sm font-medium text-center transition-colors cursor-pointer",
                    "bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--text-inverse)]"
                  )}
                >
                  Confirm
                </button>
              </div>
            )}
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}
