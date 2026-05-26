"use client";

import { useRouter, useParams } from "next/navigation";
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
  const params = useParams();
  
  // If we are on /outlets/[id], params.id will be defined.
  // We use "all" for the "All Outlets" value.
  const currentOutletId = (params?.id as string) || "all";

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
        <SelectValue placeholder="All Outlets" />
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
