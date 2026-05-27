"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface OutletSelectorProps {
  outlets: { id: string; name: string }[];
}

export function OutletSelector({ outlets }: OutletSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [currentOutletId, setCurrentOutletId] = useState<string>("all");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Sync with URL if we are in an outlet specific page
    if (pathname?.startsWith("/outlets/") && pathname !== "/outlets") {
      const parts = pathname.split("/");
      if (parts.length > 2) {
        setCurrentOutletId(parts[2]);
        localStorage.setItem("selectedOutletId", parts[2]);
      }
    } else {
      // Restore from local storage if available
      const stored = localStorage.getItem("selectedOutletId");
      if (stored && outlets.find((o) => o.id === stored)) {
        setCurrentOutletId(stored);
      } else {
        setCurrentOutletId("all");
      }
    }
  }, [pathname, outlets]);

  const selectedOutletName =
    currentOutletId === "all"
      ? "All Outlets"
      : outlets.find((o) => o.id === currentOutletId)?.name || "All Outlets";

  const handleChange = (val: string | null) => {
    if (!val) return;
    setCurrentOutletId(val);
    if (val === "all") {
      localStorage.removeItem("selectedOutletId");
      window.dispatchEvent(new Event("local-storage"));
      if (pathname?.startsWith("/outlets/") && pathname !== "/outlets") {
        router.push("/");
      }
    } else {
      localStorage.setItem("selectedOutletId", val);
      window.dispatchEvent(new Event("local-storage"));
      if (pathname?.startsWith("/outlets/") && pathname !== "/outlets") {
        const parts = pathname.split("/");
        parts[2] = val;
        router.push(parts.join("/"));
      }
    }
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return (
      <Select value="all">
        <SelectTrigger className="w-[200px] h-9">
          <SelectValue placeholder="All Outlets" />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select value={currentOutletId} onValueChange={handleChange}>
      <SelectTrigger className="w-[200px] h-9">
        <SelectValue placeholder="All Outlets">
          {selectedOutletName}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Outlets</SelectItem>
        {outlets.map((outlet) => (
          <SelectItem key={outlet.id} value={outlet.id}>
            {outlet.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
