"use client";

import { UserButton } from "@clerk/nextjs";

export function PosTopNav({ outletName }: { outletName: string }) {
  return (
    <header className="flex h-14 sm:h-14 items-center justify-between px-4 bg-[var(--bg-surface)] border-b border-[var(--border-default)] shrink-0">
      <div className="flex items-center gap-3">
        <div className="sm:hidden text-lg font-medium text-[var(--text-primary)]">
          {outletName}
        </div>
        <div className="hidden sm:inline-flex items-center px-2.5 py-1 rounded bg-[var(--bg-surface-raised)] border border-[var(--border-default)] text-sm font-medium text-[var(--text-primary)]">
          {outletName}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <UserButton 
          appearance={{
            elements: {
              userButtonAvatarBox: "w-8 h-8",
            }
          }}
        />
      </div>
    </header>
  );
}
