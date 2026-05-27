import { getCurrentUser, getCurrentOutlet } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CreateMenuItemSchema } from "@/lib/validators";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    const posOutlet = await getCurrentOutlet();
    if (!user && !posOutlet) return new Response(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }), { status: 401 });
    
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId");
    const categoryId = searchParams.get("categoryId");
    const search = searchParams.get("search");
    const isActive = searchParams.get("isActive") !== "false"; // default true

    if (!outletId) {
      return NextResponse.json(
        { error: { code: "MISSING_PARAM", message: "outletId is required" } },
        { status: 400 }
      );
    }

    if (posOutlet && posOutlet.id !== outletId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Cannot access other outlet items" } },
        { status: 403 }
      );
    }

    const where: any = { outletId, isActive };
    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ];
    }

    const items = await prisma.menuItem.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, sortOrder: true } },
        gstSlab: { select: { id: true, rate: true, label: true } },
      },
      orderBy: [
        { category: { sortOrder: "asc" } },
        { name: "asc" },
      ],
    });

    const serialized = items.map((item) => ({
      ...item,
      basePrice: item.basePrice.toString(),
      createdAt: item.createdAt.toISOString(),
      gstSlab: {
        ...item.gstSlab,
        rate: item.gstSlab.rate.toString(),
      },
    }));

    return NextResponse.json({ data: serialized }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch menu items" } },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    // Only Admin can create items
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized. Admin only." } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = CreateMenuItemSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input" } },
        { status: 400 }
      );
    }

    const { categoryId, gstSlabId, sku, outletId } = result.data;

    const dbOutlet = await prisma.outlet.findUnique({ where: { id: outletId } });
    if (!dbOutlet || !dbOutlet.isActive) {
      return NextResponse.json(
        { error: { code: "INVALID_OUTLET", message: "Outlet not found or inactive" } },
        { status: 400 }
      );
    }

    const category = await prisma.menuCategory.findUnique({ where: { id: categoryId } });
    if (!category || category.outletId !== outletId) {
      return NextResponse.json(
        { error: { code: "INVALID_CATEGORY", message: "Category must belong to outlet" } },
        { status: 400 }
      );
    }

    if (sku) {
      const existing = await prisma.menuItem.findUnique({
        where: { outletId_sku: { outletId, sku } },
      });
      if (existing) {
        return NextResponse.json(
          { error: { code: "DUPLICATE_SKU", message: "SKU must be unique per outlet" } },
          { status: 409 }
        );
      }
    }

    const item = await prisma.menuItem.create({
      data: result.data,
      include: {
        category: { select: { id: true, name: true, sortOrder: true } },
        gstSlab: { select: { id: true, rate: true, label: true } },
      }
    });

    return NextResponse.json({
      data: {
        ...item,
        basePrice: item.basePrice.toString(),
        gstSlab: {
          ...item.gstSlab,
          rate: item.gstSlab.rate.toString(),
        }
      }
    }, { status: 201 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create menu item" } },
      { status: 500 }
    );
  }
}
