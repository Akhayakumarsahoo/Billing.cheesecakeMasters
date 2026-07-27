import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  /** Lucide icon component to display */
  icon: LucideIcon;
  /** Card label / title */
  label: string;
  /** Primary value (string or number) */
  value: string | number;
  /** Optional smaller text below the value */
  subtext?: string;
  /** Icon stroke width (default 1.5) */
  iconStrokeWidth?: number;
  /** Optional action element rendered in card header (e.g. info button) */
  actionNode?: React.ReactNode;
  /** Optional container class name */
  className?: string;
}

/**
 * Reusable metric card used across dashboard and sales summary pages.
 * Renders an icon, a label, a large value, and optional sub-text.
 * Automatically scales typography and enforces strict container bounds to prevent number overflow.
 */
export function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  iconStrokeWidth = 1.5,
  actionNode,
  className,
}: StatCardProps) {
  const valueStr = String(value);
  
  // Auto-tune font size based on text length to prevent overflow on narrow grid cards
  const isVeryLongValue = valueStr.length > 12;
  const isLongValue = valueStr.length > 9;

  const valueFontSize = isVeryLongValue
    ? "text-base sm:text-lg md:text-xl font-semibold"
    : isLongValue
    ? "text-lg sm:text-xl md:text-2xl font-medium"
    : "text-xl sm:text-2xl md:text-3xl font-medium";

  return (
    <Card className={cn("bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] shadow-sm min-w-0 overflow-hidden", className)}>
      <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
        <div className="flex items-center justify-between gap-1.5 mb-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0 truncate">
            <Icon
              className="h-4.5 w-4.5 shrink-0 text-[var(--text-secondary)]"
              strokeWidth={iconStrokeWidth}
            />
            <span className="text-xs sm:text-sm text-[var(--text-secondary)] truncate">{label}</span>
          </div>
          {actionNode && <div className="shrink-0">{actionNode}</div>}
        </div>
        <div
          className={cn(
            "font-mono text-[var(--text-primary)] mb-1 truncate tracking-tight min-w-0 leading-tight",
            valueFontSize
          )}
          title={valueStr}
        >
          {value}
        </div>
        {subtext && (
          <div className="text-xs text-[var(--text-muted)] truncate">{subtext}</div>
        )}
      </CardContent>
    </Card>
  );
}
