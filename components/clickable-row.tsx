"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface ClickableRowProps extends React.ComponentProps<typeof TableRow> {
  href: string;
}

export function ClickableRow({
  href,
  className,
  children,
  ...props
}: ClickableRowProps) {
  const router = useRouter();

  return (
    <TableRow
      className={cn(
        "cursor-pointer transition-colors hover:bg-[var(--bg-hover)] active:bg-[var(--bg-active)] select-none",
        className
      )}
      onClick={() => router.push(href)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(href);
        }
      }}
      role="link"
      tabIndex={0}
      {...props}
    >
      {children}
    </TableRow>
  );
}
