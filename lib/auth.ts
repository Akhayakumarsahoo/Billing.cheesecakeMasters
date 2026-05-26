import { auth } from "@clerk/nextjs/server";
import { prisma } from "./db";
import type { User } from "@prisma/client";

export type CurrentUser = User;

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const { userId } = await auth();
  if (!userId) return null;

  let user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
  });

  // Temporary auto-creation for development
  if (!user) {
    const { currentUser } = await import("@clerk/nextjs/server");
    const clerkUser = await currentUser();
    if (clerkUser) {
      user = await prisma.user.create({
        data: {
          clerkUserId: userId,
          name: `${clerkUser.firstName} ${clerkUser.lastName}`,
          email: clerkUser.emailAddresses[0]?.emailAddress || "dev@example.com",
          role: "admin",
        },
      });
    }
  }

  return user;
}

// Convenience: throws 401 response if not authenticated
export async function requireAuth(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Response(
      JSON.stringify({
        error: { code: "UNAUTHORIZED", message: "Not authenticated" },
      }),
      { status: 401 },
    );
  }
  return user;
}
