import { auth } from "@clerk/nextjs/server";
import { prisma } from "./db";
import type { User, Outlet } from "@prisma/client";

export type CurrentUser = User;

const authCache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function invalidateAuthCache(clerkUserId: string) {
  authCache.delete(`outlet:${clerkUserId}`);
  authCache.delete(`user:${clerkUserId}`);
}

function getCached<T>(key: string): T | undefined {
  const cached = authCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data as T;
  }
  authCache.delete(key);
  return undefined;
}

function setCached(key: string, data: any) {
  authCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

export async function getCurrentOutlet(): Promise<Outlet | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const cacheKey = `outlet:${userId}`;
  const cached = getCached<Outlet | null>(cacheKey);
  if (cached !== undefined) return cached;

  const outlet = await prisma.outlet.findUnique({
    where: { clerkUserId: userId },
  });

  setCached(cacheKey, outlet);
  return outlet;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const cacheKey = `user:${userId}`;
  const cached = getCached<CurrentUser | null>(cacheKey);
  if (cached !== undefined) return cached;

  let user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
  });

  // Dev-only fallback: auto-create an admin row if a Clerk user exists but
  // has no DB record yet. This must never run in production.
  if (!user && process.env.NODE_ENV !== "production") {
    // Ensure this Clerk user is not an outlet before creating an admin account.
    const outlet = await getCurrentOutlet();
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

  setCached(cacheKey, user);
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

export async function getLoggedInUser(): Promise<User | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const cacheKey = `user:${userId}`;
  const cached = getCached<User | null>(cacheKey);
  if (cached !== undefined) return cached;

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
  });

  setCached(cacheKey, user);
  return user;
}

