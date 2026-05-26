import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UsersClient } from "./users-client";
import { prisma } from "@/lib/db";

export default async function UsersPage() {
  const user = await getCurrentUser();
  
  if (!user || user.role !== "admin") {
    redirect("/");
  }

  const users = await prisma.user.findMany({
    where: {
      role: "manager", // Only show managers, not outlets
    },
    orderBy: { createdAt: "desc" },
  });

  // Serialize before passing to Client Component
  const serialized = users.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
  }));

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-text-muted mt-1">
          Manage your managers.
        </p>
      </div>

      <UsersClient initialData={serialized} />
    </div>
  );
}
