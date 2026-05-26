import { getCurrentUser, getCurrentOutlet, requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UpdateMenuItemSchema } from "@/lib/validators";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const outlet = await getCurrentOutlet();
    if (!user && !outlet) return new Response(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }), { status: 401 });

    const item = await prisma.menuItem.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, sortOrder: true } },
        gstSlab: { select: { id: true, rate: true, label: true } },
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Menu item not found" } },
        { status: 404 }
      );
    }

    if (outlet && outlet.id !== item.outletId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Cannot access this item" } },
        { status: 403 }
      );
    }

    return NextResponse.json({
      data: {
        ...item,
        basePrice: item.basePrice.toString(),
        gstSlab: {
          ...item.gstSlab,
          rate: item.gstSlab.rate.toString(),
        },
      }
    }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch menu item" } },
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
    const user = await getCurrentUser();
    const outlet = await getCurrentOutlet();
    if (!user && !outlet) return new Response(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }), { status: 401 });
    if (outlet) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized" } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = UpdateMenuItemSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input" } },
        { status: 400 }
      );
    }

    const item = await prisma.menuItem.findUnique({ where: { id } });
    if (!item) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Menu item not found" } },
        { status: 404 }
      );
    }

    const { categoryId, sku } = result.data;

    if (categoryId && categoryId !== item.categoryId) {
      const category = await prisma.menuCategory.findUnique({ where: { id: categoryId } });
      if (!category || category.outletId !== item.outletId) {
        return NextResponse.json(
          { error: { code: "INVALID_CATEGORY", message: "Category must belong to outlet" } },
          { status: 400 }
        );
      }
    }

    if (sku && sku !== item.sku) {
      const existing = await prisma.menuItem.findUnique({
        where: { outletId_sku: { outletId: item.outletId, sku } },
      });
      if (existing) {
        return NextResponse.json(
          { error: { code: "DUPLICATE_SKU", message: "SKU must be unique per outlet" } },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.menuItem.update({
      where: { id },
      data: result.data,
    });

    return NextResponse.json({
      data: {
        ...updated,
        basePrice: updated.basePrice.toString(),
      }
    }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update menu item" } },
      { status: 500 }
    );
  }
}
