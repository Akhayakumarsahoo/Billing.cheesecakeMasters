import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UpdateCategorySchema } from "@/lib/validators";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    // Only Admin can update categories
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized. Admin only." } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = UpdateCategorySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input" } },
        { status: 400 }
      );
    }

    const category = await prisma.menuCategory.findUnique({ where: { id } });
    if (!category) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Category not found" } },
        { status: 404 }
      );
    }

    const updated = await prisma.menuCategory.update({
      where: { id },
      data: result.data,
    });

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update category" } },
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
    // Only Admin can delete (deactivate) categories
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized. Admin only." } },
        { status: 403 }
      );
    }

    const category = await prisma.menuCategory.findUnique({
      where: { id },
      include: {
        menuItems: {
          where: { isActive: true },
          select: { id: true }
        }
      }
    });

    if (!category) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Category not found" } },
        { status: 404 }
      );
    }

    if (category.menuItems.length > 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Cannot delete category because it has active items." } },
        { status: 400 }
      );
    }

    // Soft delete
    const deleted = await prisma.menuCategory.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ data: deleted }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to delete category" } },
      { status: 500 }
    );
  }
}
