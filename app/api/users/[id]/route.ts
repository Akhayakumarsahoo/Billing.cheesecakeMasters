import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UpdateUserSchema } from "@/lib/validators";
import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized" } },
        { status: 403 }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { id },
      include: { outlet: { select: { id: true, name: true } } },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    const { clerkUserId, ...rest } = dbUser;
    return NextResponse.json({ data: rest }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch user" } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminUser = await requireAuth();
    if (adminUser.role !== "admin") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized" } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = UpdateUserSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input" } },
        { status: 400 }
      );
    }

    const dbUser = await prisma.user.findUnique({ where: { id } });
    if (!dbUser) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    // Do not allow updating role or email - filter them out if present in body
    const { name, isActive, outletId } = result.data;

    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (isActive !== undefined) dataToUpdate.isActive = isActive;
    if (outletId !== undefined) dataToUpdate.outletId = outletId;

    if (isActive === false && dbUser.isActive !== false) {
      // Also disable in Clerk
      try {
        const client = await clerkClient();
        // Clerk does not have a direct "isActive" toggle, but we can set banned or custom claims.
        // We will ban the user to prevent login.
        await client.users.banUser(dbUser.clerkUserId);
      } catch (e) {
        console.error("Failed to disable user in Clerk", e);
      }
    } else if (isActive === true && dbUser.isActive === false) {
      // Re-enable in Clerk
      try {
        const client = await clerkClient();
        await client.users.unbanUser(dbUser.clerkUserId);
      } catch (e) {
        console.error("Failed to enable user in Clerk", e);
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
    });

    const { clerkUserId, ...rest } = updated;
    return NextResponse.json({ data: rest }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update user" } },
      { status: 500 }
    );
  }
}
