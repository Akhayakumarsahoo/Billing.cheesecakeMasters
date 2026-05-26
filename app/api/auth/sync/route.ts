import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    const email = user.emailAddresses[0]?.emailAddress;
    const name = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User";

    await prisma.user.upsert({
      where: { clerkUserId: userId },
      update: {},
      create: {
        clerkUserId: userId,
        name,
        email,
        role: "cashier",
        isActive: true,
      },
    });

    return NextResponse.json({ data: { synced: true } }, { status: 200 });
  } catch (error) {
    console.error("Auth sync error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to sync user" } },
      { status: 500 }
    );
  }
}
