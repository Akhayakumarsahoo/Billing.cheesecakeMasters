import { getCurrentOutlet } from "@/lib/auth";
import { Wallet } from "lucide-react";

export default async function SettlementPage() {
  const outlet = await getCurrentOutlet();
  if (!outlet) return null;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-medium text-[var(--text-primary)]">Daily Settlement</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">End of day procedures for {outlet.name}</p>
      </div>

      <div className="bg-[var(--bg-surface-raised)] border border-[var(--border-default)] border-dashed rounded-xl p-12 text-center space-y-4">
        <Wallet className="h-12 w-12 mx-auto text-[var(--text-muted)]" strokeWidth={1} />
        <h2 className="text-lg font-medium text-[var(--text-primary)]">Settlement Module</h2>
        <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
          This feature is currently under development. In the future, you will be able to perform cash drawer reconciliation and generate end-of-day Z-reports here.
        </p>
      </div>
    </div>
  );
}
