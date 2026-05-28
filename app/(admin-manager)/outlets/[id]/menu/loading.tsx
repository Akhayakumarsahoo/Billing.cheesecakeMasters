import { Skeleton } from "@/components/ui/skeleton";

export default function MenuLoading() {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-40 rounded-lg" />
      </div>

      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[var(--border-default)]">
          <Skeleton className="h-10 w-full max-w-md rounded-lg" />
        </div>
        <div className="p-0">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 border-b border-[var(--border-default)] last:border-0">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-8 w-24 rounded-md" />
              </div>
              <div className="space-y-3 pl-4 border-l-2 border-[var(--border-subtle)] ml-2">
                {[1, 2].map((j) => (
                  <div key={j} className="flex justify-between items-center py-2">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-8 w-16 rounded-md" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
