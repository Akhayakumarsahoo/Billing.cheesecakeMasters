import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UpdateRawMaterialSchema } from "@/lib/validators";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only admin can edit raw materials" } },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const result = UpdateRawMaterialSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input values" } },
        { status: 400 }
      );
    }

    const material = await prisma.rawMaterial.findUnique({
      where: { id }
    });

    if (!material) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Raw material not found" } },
        { status: 404 }
      );
    }

    const { name, unit, purchasePrice, transferPrice, gstSlabId, lowStockAlert, isActive } = result.data;

    // Check unique constraint (inventoryId, name) if name changes
    if (name && name !== material.name) {
      const existing = await prisma.rawMaterial.findFirst({
        where: {
          inventoryId: material.inventoryId,
          name,
          NOT: { id }
        }
      });
      if (existing) {
        return NextResponse.json(
          { error: { code: "CONFLICT", message: "A material with this name already exists in this inventory" } },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.rawMaterial.update({
      where: { id },
      data: {
        name: name ?? undefined,
        unit: unit ?? undefined,
        purchasePrice: purchasePrice !== undefined ? purchasePrice : undefined,
        transferPrice: transferPrice !== undefined ? transferPrice : undefined,
        gstSlabId: gstSlabId ?? undefined,
        lowStockAlert: lowStockAlert !== undefined ? lowStockAlert : undefined,
        isActive: isActive !== undefined ? isActive : undefined
      }
    });

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("PATCH /api/raw-materials/[id] error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update raw material" } },
      { status: 500 }
    );
  }
}
