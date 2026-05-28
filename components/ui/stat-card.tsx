import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

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
}

/**
 * Reusable metric card used across dashboard and sales summary pages.
 * Renders an icon, a label, a large value, and optional sub-text.
 */
export function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  iconStrokeWidth = 1.5,
}: StatCardProps) {
  return (
    <Card className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-2">
          <Icon
            className="h-5 w-5 text-[var(--text-secondary)]"
            strokeWidth={iconStrokeWidth}
          />
          <span className="text-sm text-[var(--text-secondary)]">{label}</span>
        </div>
        <div className="text-2xl font-medium font-mono text-[var(--text-primary)] mb-1">
          {value}
        </div>
        {subtext && (
          <div className="text-xs text-[var(--text-muted)]">{subtext}</div>
        )}
      </CardContent>
    </Card>
  );
}
