import React from "react";
import { getCurrentUser } from "@/lib/auth";
import { MoreClient } from "./more-client";

export default async function MorePage() {
  const user = await getCurrentUser();
  const role = user?.role || "manager";

  return <MoreClient role={role} />;
}
