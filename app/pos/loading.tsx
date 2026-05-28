import { Skeleton } from "@/components/ui/skeleton";

export default function POSLoading() {
  return (
    <div className="flex h-screen w-full animate-in fade-in duration-500 overflow-hidden bg-[var(--bg-base)]">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full p-4 lg:p-6 space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center bg-[var(--bg-surface)] p-3 lg:p-4 rounded-xl border border-[var(--border-default)]">
          <Skeleton className="h-10 w-full max-w-md rounded-lg" />
        </div>

        {/* Categories */}
        <div className="bg-[var(--bg-surface)] p-3 lg:p-4 rounded-xl border border-[var(--border-default)]">
          <div className="flex gap-2 overflow-hidden">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-10 w-24 rounded-full shrink-0" />
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 bg-[var(--bg-surface)] p-3 lg:p-4 rounded-xl border border-[var(--border-default)] overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4 h-full">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>

      {/* Cart Area */}
      <div className="hidden lg:flex w-full lg:w-[400px] xl:w-[450px] bg-[var(--bg-surface)] border-l border-[var(--border-default)] h-full flex-col z-20">
        <div className="p-4 border-b border-[var(--border-default)]">
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="flex-1 p-4 space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between items-center">
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-8 w-24 rounded-md" />
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-[var(--border-default)] space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-14 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
