import { Skeleton } from "@/components/ui/skeleton";

export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${count} gap-4 mb-8`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] p-6 shadow-sm flex flex-col gap-2 h-[106px]"
        >
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-5 rounded-full" />
          </div>
          <Skeleton className="h-8 w-32 mt-1" />
          <Skeleton className="h-3.5 w-40 mt-1" />
        </div>
      ))}
    </div>
  );
}

export function PaymentBreakdownSkeleton() {
  return (
    <div className="mb-8">
      <Skeleton className="h-6 w-48 mb-4" />
      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] p-6 shadow-sm max-w-md h-[220px] flex flex-col gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex justify-between items-center">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] overflow-hidden">
      <div className="p-4 border-b border-[var(--border-default)] flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className={`h-4 flex-1 ${i === 0 ? "max-w-[150px]" : ""}`} />
        ))}
      </div>
      <div className="divide-y divide-[var(--border-default)]">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-4 flex gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div>
      <StatCardsSkeleton count={4} />
      <PaymentBreakdownSkeleton />
      <div className="mb-8">
        <Skeleton className="h-6 w-40 mb-4" />
        <TableSkeleton rows={4} cols={7} />
      </div>
    </div>
  );
}

export function OutletDashboardSkeleton() {
  return (
    <div>
      <StatCardsSkeleton count={4} />
      <PaymentBreakdownSkeleton />
    </div>
  );
}

export function POSSalesSkeleton() {
  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64 mt-1" />
        </div>
        <Skeleton className="h-9 w-[200px]" />
      </div>
      <POSSalesSkeletonBody />
    </div>
  );
}

export function POSSalesSkeletonBody() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] p-6 shadow-sm col-span-1 h-[320px] flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-10 w-44" />
        <div className="border-t border-[var(--border-subtle)] my-2" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex justify-between items-center">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
      <div className="col-span-1 md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] p-6 shadow-sm h-[106px] flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] p-6 shadow-sm h-[106px] flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
    </div>
  );
}

export function OrderCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-4 shadow-sm flex flex-col justify-between h-[180px]"
        >
          <div>
            <div className="flex justify-between items-start mb-3">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32 animate-pulse" />
                <Skeleton className="h-3.5 w-24 animate-pulse" />
              </div>
              <Skeleton className="h-6 w-16 rounded animate-pulse" />
            </div>
            
            <div className="py-3 border-y border-[var(--border-subtle)] my-3 space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-12 animate-pulse" />
                <Skeleton className="h-4 w-8 animate-pulse" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16 animate-pulse" />
                <Skeleton className="h-4 w-12 animate-pulse" />
              </div>
            </div>

            <div className="flex justify-between items-center mt-3">
              <Skeleton className="h-4 w-10 animate-pulse" />
              <Skeleton className="h-5 w-16 animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

