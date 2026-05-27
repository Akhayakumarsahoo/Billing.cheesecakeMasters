import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CreateOutletSchema } from "@/lib/validators";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await requireAuth();
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized" } },
        { status: 403 }
      );
    }

    const outlets = await prisma.outlet.findMany({
      orderBy: { createdAt: "asc" },
    });

    // Serialize dates to string
    const serialized = outlets.map((o) => ({
      ...o,
      createdAt: o.createdAt.toISOString(),
    }));

    return NextResponse.json({ data: serialized }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error; // from requireAuth
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch outlets" } },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized" } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = CreateOutletSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input", details: result.error.issues } },
        { status: 400 }
      );
    }

    // Check local db for email collision first
    const existingDbUser = await prisma.user.findUnique({
      where: { email: result.data.email }
    });
    if (existingDbUser) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "This email is already in use locally." } },
        { status: 400 }
      );
    }

    // Import clerkClient here or at top
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();

    let clerkUser;
    try {
      clerkUser = await client.users.createUser({
        emailAddress: [result.data.email],
        password: result.data.password,
        firstName: result.data.name,
      });
    } catch (clerkErr: any) {
      const firstError = clerkErr.errors?.[0];
      const message = firstError?.code === "form_identifier_exists" 
        ? "This email is already in use by another outlet or user." 
        : firstError?.longMessage || firstError?.message || "Failed to create outlet credentials";
        
      return NextResponse.json(
        { error: { code: "CLERK_ERROR", message } },
        { status: 400 }
      );
    }

    const currentYear = new Date().getFullYear();

    let outlet;
    try {
      outlet = await prisma.$transaction(async (tx) => {
        const newOutlet = await tx.outlet.create({
          data: {
            clerkUserId: clerkUser.id,
            name: result.data.name,
            address: result.data.address,
            stateCode: result.data.stateCode,
            gstin: result.data.gstin,
          },
        });

        await tx.user.create({
          data: {
            clerkUserId: clerkUser.id,
            name: result.data.name,
            email: result.data.email,
            role: "outlet",
            isActive: true,
          },
        });

        await tx.billSequence.create({
          data: {
            outletId: newOutlet.id,
            year: currentYear,
            lastSeq: 0,
          },
        });

        return newOutlet;
      });
    } catch (dbError) {
      if (clerkUser) {
        await client.users.deleteUser(clerkUser.id).catch(console.error);
      }
      throw dbError;
    }

    return NextResponse.json({ data: outlet }, { status: 201 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create outlet" } },
      { status: 500 }
    );
  }
}
