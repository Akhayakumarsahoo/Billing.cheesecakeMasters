"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  UtensilsCrossed,
  Warehouse,
  Store,
  Users,
  ChevronRight,
  PhoneCall,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface MoreClientProps {
  role: string;
}

export function MoreClient({ role }: MoreClientProps) {
  const [mounted, setMounted] = useState(false);
  const [persistedOutletId, setPersistedOutletId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const handleStorageChange = () => {
      setPersistedOutletId(localStorage.getItem("selectedOutletId"));
    };
    handleStorageChange();

    window.addEventListener("local-storage", handleStorageChange);
    return () => window.removeEventListener("local-storage", handleStorageChange);
  }, []);

  const hasSpecificOutlet = Boolean(mounted && persistedOutletId && persistedOutletId !== "all");

  const menuHref = hasSpecificOutlet
    ? `/outlets/${persistedOutletId}/menu`
    : "/outlets";

  // Options that are NOT in the bottom bar for the given outlet state
  const options = [
    {
      title: "Menu Management",
      description: "Manage menu items and categories for this outlet",
      href: menuHref,
      icon: UtensilsCrossed,
      show: role !== "storeroom" && hasSpecificOutlet,
    },
    {
      title: "Inventory",
      description: "Manage central store, stocks, transfers, & wastage",
      href: "/inventory",
      icon: Warehouse,
      // Inventory is in the bottom bar when "All Outlets" is selected, so only show on More page when a specific outlet is selected
      show: hasSpecificOutlet,
    },
    {
      title: "Outlet Management",
      description: "Create and manage company retail outlets",
      href: "/outlets",
      icon: Store,
      show: role === "admin",
    },
    {
      title: "User Management",
      description: "Manage system users and access roles",
      href: "/users",
      icon: Users,
      show: role === "admin",
    },
  ];

  const visibleOptions = options.filter((o) => o.show);

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">More Options</h1>
        <p className="text-xs text-text-secondary mt-0.5">
          Access all management tools and features
        </p>
      </div>

      <div className="space-y-2.5">
        {visibleOptions.map((opt) => {
          const Icon = opt.icon;
          return (
            <Link key={opt.title} href={opt.href} className="block group">
              <Card className="bg-bg-surface hover:bg-bg-surface-raised border border-border-default transition-all duration-150 shadow-xs">
                <CardContent className="p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-lg bg-bg-surface-raised border border-border-default flex items-center justify-center text-text-primary shrink-0 group-hover:bg-accent-primary group-hover:text-white transition-colors">
                      <Icon className="h-5 w-5 stroke-[1.5]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary group-hover:underline">
                        {opt.title}
                      </h3>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {opt.description}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-text-muted shrink-0 group-hover:text-text-primary transition-colors" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Support Phone Number Banner at Bottom of More Page */}
      <div className="mt-8 p-4 rounded-xl bg-bg-surface border border-border-default text-center shadow-xs">
        <div className="flex items-center justify-center gap-2 text-text-secondary">
          <PhoneCall className="h-4 w-4 stroke-[1.5]" />
          <span className="text-xs font-medium uppercase tracking-wide">
            Need help? Give us a call
          </span>
        </div>
        <a
          href="tel:+917609083736"
          className="text-lg font-bold font-mono text-text-primary hover:underline mt-1 inline-block"
        >
          +91-7609083736
        </a>
      </div>
    </div>
  );
}
