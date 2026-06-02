"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Receipt, BarChart, Wallet, LogOut } from "lucide-react";
import { useClerk } from "@clerk/nextjs";

const navItems = [
  { name: "New Bill", href: "/pos", icon: ShoppingBag },
  { name: "Order History", href: "/pos/orders", icon: Receipt },
  { name: "Sales Summary", href: "/pos/sales", icon: BarChart },
  { name: "Daily Settlement", href: "/pos/settlement", icon: Wallet },
];

export function PosSidebar() {
  const pathname = usePathname();
  const { signOut } = useClerk();

  return (
    <aside className="hidden lg:flex flex-col w-52 bg-[var(--bg-surface)] border-r border-[var(--border-default)] h-full">
      <div className="p-4 border-b border-[var(--border-default)]">
        <div className="flex items-center gap-2.5">
          <img src="/favicon.svg" alt="Cheesecake Masters" width={32} height={32} className="shrink-0" />
          <div>
            <div className="font-semibold text-sm text-[var(--text-primary)] leading-tight">Cheesecake Masters</div>
            <div className="text-xs text-[var(--text-secondary)] mt-0.5">POS System</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 h-10 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[var(--bg-active)] text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={1.5} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-[var(--border-default)]">
        <button
          onClick={() => signOut({ redirectUrl: '/sign-in' })}
          className="flex w-full items-center gap-3 px-3 h-10 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
        >
          <LogOut className="h-5 w-5" strokeWidth={1.5} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
