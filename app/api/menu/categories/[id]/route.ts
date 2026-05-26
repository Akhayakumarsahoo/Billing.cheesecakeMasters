import { getCurrentUser, getCurrentOutlet, requireAuth } from "@/lib/auth";
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
    const outlet = await getCurrentOutlet();
    if (!user && !outlet) return new Response(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }), { status: 401 });
    if (outlet) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized" } },
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
