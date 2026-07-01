import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CreateInventorySchema } from "@/lib/validators";
import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await requireAuth();
    if (user.role !== "admin" && user.role !== "manager") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized" } },
        { status: 403 }
      );
    }

    const inventories = await prisma.inventory.findMany({
      include: {
        outlets: true,
        rawMaterials: {
          where: { isActive: true },
          select: { id: true }
        }
      },
      orderBy: { name: "asc" }
    });

    const serialized = inventories.map((inv) => ({
      id: inv.id,
      name: inv.name,
      address: inv.address,
      isActive: inv.isActive,
      createdAt: inv.createdAt.toISOString(),
      updatedAt: inv.updatedAt.toISOString(),
      linkedOutletsCount: inv.outlets.length,
      activeMaterialsCount: inv.rawMaterials.length,
    }));

    return NextResponse.json({ data: serialized }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("GET /api/inventory error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch inventories" } },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only admin can create inventories" } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = CreateInventorySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input values" } },
        { status: 400 }
      );
    }

    const { name, address, outletIds, email, password } = result.data;

    // Check unique name across company
    const existing = await prisma.inventory.findUnique({
      where: { name }
    });
    if (existing) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "An inventory with this name already exists." } },
        { status: 409 }
      );
    }

    const isStandalone = !outletIds || outletIds.length === 0;

    if (isStandalone) {
      if (!email || !password) {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "Email and password are required for standalone storerooms" } },
          { status: 400 }
        );
      }

      // Check if email already used locally in DB
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });
      if (existingUser) {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "Email already in use" } },
          { status: 400 }
        );
      }
    }

    let clerkUser: any = null;
    const client = await clerkClient();

    if (isStandalone && email && password) {
      try {
        clerkUser = await client.users.createUser({
          emailAddress: [email],
          password: password,
          firstName: name,
          lastName: "Storeroom",
        });
      } catch (clerkErr: any) {
        const firstError = clerkErr.errors?.[0];
        const message = firstError?.code === "form_identifier_exists"
          ? "This email is already in use by another user in Clerk."
          : firstError?.longMessage || firstError?.message || "Failed to create user in Clerk";

        return NextResponse.json(
          { error: { code: "CLERK_ERROR", message } },
          { status: 400 }
        );
      }
    }

    try {
      const newInventory = await prisma.$transaction(async (tx) => {
        const inv = await tx.inventory.create({
          data: {
            name,
            address,
            outlets: outletIds && outletIds.length > 0 ? {
              create: outletIds.map((oId) => ({
                outletId: oId
              }))
            } : undefined
          }
        });

        if (isStandalone && clerkUser && email) {
          await tx.user.create({
            data: {
              clerkUserId: clerkUser.id,
              name: `${name} Storeroom`,
              email,
              role: "storeroom",
              inventoryId: inv.id,
              isActive: true
            }
          });
        }

        return inv;
      });

      return NextResponse.json({ data: newInventory }, { status: 201 });
    } catch (dbErr) {
      if (clerkUser) {
        // Rollback clerk user if DB transaction fails
        await client.users.deleteUser(clerkUser.id);
      }
      throw dbErr;
    }
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("POST /api/inventory error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create inventory" } },
      { status: 500 }
    );
  }
}
