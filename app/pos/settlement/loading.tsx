import { Skeleton } from "@/components/ui/skeleton";

export default function SettlementLoading() {
  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="text-center space-y-2 mb-8">
        <Skeleton className="h-8 w-48 mx-auto" />
        <Skeleton className="h-4 w-64 mx-auto" />
      </div>

      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl shadow-sm overflow-hidden p-6 space-y-6">
        <Skeleton className="h-6 w-32" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
        <div className="border-t border-[var(--border-subtle)] my-4"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
             <div key={i} className="flex justify-between items-center">
               <Skeleton className="h-5 w-24" />
               <Skeleton className="h-10 w-32 rounded-md" />
             </div>
          ))}
        </div>
        <div className="border-t border-[var(--border-subtle)] my-4"></div>
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className="h-12 w-full rounded-lg mt-6" />
      </div>
    </div>
  );
}
