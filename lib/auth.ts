import { auth } from "@clerk/nextjs/server";
import { prisma } from "./db";
import type { User, Outlet } from "@prisma/client";

export type CurrentUser = User;

export async function getCurrentOutlet(): Promise<Outlet | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const outlet = await prisma.outlet.findUnique({
    where: { clerkUserId: userId },
  });

  return outlet;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const { userId } = await auth();
  if (!userId) return null;

  let user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
  });

  // Temporary auto-creation for development
  if (!user) {
    // Before auto-creating an admin, ensure this clerk user isn't an outlet
    const outlet = await prisma.outlet.findUnique({
      where: { clerkUserId: userId },
    });
    if (outlet) return null; // It's an outlet, not a user

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

export async function requireOutlet(): Promise<Outlet> {
  const outlet = await getCurrentOutlet();
  if (!outlet) {
    throw new Response(
      JSON.stringify({
        error: { code: "UNAUTHORIZED", message: "Not authenticated as outlet" },
      }),
      { status: 401 },
    );
  }
  return outlet;
}
