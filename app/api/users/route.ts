import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CreateUserSchema } from "@/lib/validators";
import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized" } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");

    const where: any = {};
    if (role) where.role = role;

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const serialized = users.map((u) => {
      const { clerkUserId, ...rest } = u;
      return {
        ...rest,
        createdAt: rest.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ data: serialized }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch users" } },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const adminUser = await requireAuth();
    if (adminUser.role !== "admin") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized" } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = CreateUserSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input" } },
        { status: 400 }
      );
    }

    const { name, email, password, role } = result.data;

    // Check local db for email collision first
    const existingDbUser = await prisma.user.findUnique({
      where: { email }
    });
    if (existingDbUser) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "This email is already in use locally." } },
        { status: 400 }
      );
    }

    const client = await clerkClient();

    // Create Clerk user
    let clerkUser;
    try {
      clerkUser = await client.users.createUser({
        emailAddress: [email],
        password: password,
        firstName: name.split(" ")[0] || name,
        lastName: name.split(" ").slice(1).join(" "),
      });
    } catch (e: any) {
      const firstError = e.errors?.[0];
      const message = firstError?.code === "form_identifier_exists" 
        ? "This email is already in use by another outlet or user." 
        : firstError?.longMessage || firstError?.message || "Failed to create user in Clerk";
        
      return NextResponse.json(
        { error: { code: "CLERK_ERROR", message } },
        { status: 400 }
      );
    }

    // Create DB user
    try {
      const dbUser = await prisma.user.create({
        data: {
          clerkUserId: clerkUser.id,
          name,
          email,
          role: role as any,
          isActive: true,
        },
      });

      const { clerkUserId, ...rest } = dbUser;
      return NextResponse.json({ data: rest }, { status: 201 });
    } catch (dbError) {
      // Rollback Clerk user
      await client.users.deleteUser(clerkUser.id);
      throw dbError;
    }
  } catch (error: any) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create user" } },
      { status: 500 }
    );
  }
}
