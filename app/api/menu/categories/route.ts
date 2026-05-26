import { getCurrentUser, getCurrentOutlet } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CreateCategorySchema } from "@/lib/validators";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    const posOutlet = await getCurrentOutlet();
    if (!user && !posOutlet) return new Response(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }), { status: 401 });
    
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId");

    if (!outletId) {
      return NextResponse.json(
        { error: { code: "MISSING_PARAM", message: "outletId is required" } },
        { status: 400 }
      );
    }

    // POS can only see its own categories. Admin can see any.
    if (posOutlet && posOutlet.id !== outletId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Cannot access other outlet categories" } },
        { status: 403 }
      );
    }

    const categories = await prisma.menuCategory.findMany({
      where: { outletId, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    const serialized = categories.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
    }));

    return NextResponse.json({ data: serialized }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch categories" } },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    // Only Admin can create categories
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized. Admin only." } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = CreateCategorySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input" } },
        { status: 400 }
      );
    }

    const { name, sortOrder, outletId } = result.data;

    const dbOutlet = await prisma.outlet.findUnique({ where: { id: outletId } });
    if (!dbOutlet || !dbOutlet.isActive) {
      return NextResponse.json(
        { error: { code: "INVALID_OUTLET", message: "Outlet not found or inactive" } },
        { status: 400 }
      );
    }
    
    // Ensure unique name per outlet
    const existing = await prisma.menuCategory.findFirst({
      where: { outletId, name }
    });
    if (existing) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "Category with this name already exists in this outlet" } },
        { status: 409 }
      );
    }

    const category = await prisma.menuCategory.create({
      data: {
        name,
        sortOrder: sortOrder || 0,
        outletId,
        isActive: true,
      },
    });

    return NextResponse.json({ data: category }, { status: 201 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create category" } },
      { status: 500 }
    );
  }
}
