import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UpdateMenuItemSchema } from "@/lib/validators";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    // Only Admin can update items
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized. Admin only." } },
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
        { error: { code: "NOT_FOUND", message: "Item not found" } },
        { status: 404 }
      );
    }

    // if categoryId changed, ensure it belongs to the same outlet
    if (result.data.categoryId) {
      const category = await prisma.menuCategory.findUnique({ where: { id: result.data.categoryId } });
      if (!category || category.outletId !== item.outletId) {
        return NextResponse.json(
          { error: { code: "INVALID_CATEGORY", message: "Category must belong to same outlet" } },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.menuItem.update({
      where: { id },
      data: result.data,
      include: {
        category: { select: { id: true, name: true, sortOrder: true } },
        gstSlab: { select: { id: true, rate: true, label: true } },
      }
    });

    return NextResponse.json({
      data: {
        ...updated,
        basePrice: updated.basePrice.toString(),
        gstSlab: {
          ...updated.gstSlab,
          rate: updated.gstSlab.rate.toString(),
        }
      }
    }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update item" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    // Only Admin can delete (deactivate) items
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized. Admin only." } },
        { status: 403 }
      );
    }

    const item = await prisma.menuItem.findUnique({ where: { id } });
    if (!item) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Item not found" } },
        { status: 404 }
      );
    }

    // Soft delete
    const deleted = await prisma.menuItem.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({
      data: {
        ...deleted,
        basePrice: deleted.basePrice.toString(),
      }
    }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to delete item" } },
      { status: 500 }
    );
  }
}
