"use client";

import { useRouter, usePathname } from "next/navigation";
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

  // Extract outlet ID from /outlets/[id] or its sub-routes.
  // We use "all" for the "All Outlets" value.
  let currentOutletId = "all";
  if (pathname?.startsWith("/outlets/")) {
    const parts = pathname.split("/");
    if (parts.length > 2) {
      currentOutletId = parts[2];
    }
  }

  const selectedOutletName =
    currentOutletId === "all"
      ? "All Outlets"
      : outlets.find((o) => o.id === currentOutletId)?.name || "All Outlets";

  const handleChange = (val: string) => {
    if (val === "all") {
      router.push("/");
    } else {
      router.push(`/outlets/${val}`);
    }
  };

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
