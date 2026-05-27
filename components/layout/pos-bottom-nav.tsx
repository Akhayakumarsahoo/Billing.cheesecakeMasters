"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Receipt, BarChart, User } from "lucide-react";
import { UserButton } from "@clerk/nextjs";

const bottomNavItems = [
  { name: "New Bill", href: "/pos", icon: ShoppingBag },
  { name: "Bills", href: "/pos/orders", icon: Receipt },
  { name: "Summary", href: "/pos/sales", icon: BarChart },
];

export function PosBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around bg-[var(--bg-surface)] border-t border-[var(--border-default)] pb-[env(safe-area-inset-bottom)]">
      {bottomNavItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] h-full flex-1 gap-1 relative ${
              isActive ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"
            }`}
          >
            {isActive && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-[var(--accent-primary)]" />
            )}
            <Icon className="h-5 w-5" strokeWidth={1.5} />
            <span className="text-[10px] font-medium leading-none">{item.name}</span>
          </Link>
        );
      })}
      
      {/* For account/settings on mobile, we can use clerk UserButton wrapper or just link to settlement */}
      <div className="flex flex-col items-center justify-center min-w-[44px] min-h-[44px] h-full flex-1 gap-1 text-[var(--text-muted)]">
        <UserButton 
          appearance={{
            elements: {
              userButtonAvatarBox: "w-5 h-5",
            }
          }}
        />
        <span className="text-[10px] font-medium leading-none mt-1">Account</span>
      </div>
    </nav>
  );
}
