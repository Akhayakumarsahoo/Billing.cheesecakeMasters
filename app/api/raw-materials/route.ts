import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CreateRawMaterialSchema } from "@/lib/validators";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const inventoryId = searchParams.get("inventoryId");

    if (!inventoryId) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Missing inventoryId query parameter" } },
        { status: 400 }
      );
    }

    // Role check: storeroom user can only query their assigned inventory
    if (user.role === "storeroom" && user.inventoryId !== inventoryId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Access restricted to your assigned inventory" } },
        { status: 403 }
      );
    } else if (user.role !== "admin" && user.role !== "manager" && user.role !== "storeroom") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized" } },
        { status: 403 }
      );
    }

    const rawMaterials = await prisma.rawMaterial.findMany({
      where: {
        inventoryId,
      },
      include: {
        gstSlab: true
      },
      orderBy: { name: "asc" }
    });

    const serialized = rawMaterials.map(m => ({
      id: m.id,
      name: m.name,
      unit: m.unit,
      purchasePrice: m.purchasePrice.toString(),
      transferPrice: m.transferPrice.toString(),
      currentStock: m.currentStock.toString(),
      lowStockAlert: m.lowStockAlert ? m.lowStockAlert.toString() : null,
      isActive: m.isActive,
      gstSlabId: m.gstSlabId,
      gstRate: m.gstSlab.rate.toString(),
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    }));

    return NextResponse.json({ data: serialized }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("GET /api/raw-materials error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch raw materials" } },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    // Only Admin can create raw materials
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only admin can create raw materials" } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = CreateRawMaterialSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input values" } },
        { status: 400 }
      );
    }

    const { inventoryId, name, unit, purchasePrice, transferPrice, gstSlabId, lowStockAlert } = result.data;

    // Check unique (inventory_id, name)
    const existing = await prisma.rawMaterial.findUnique({
      where: {
        inventoryId_name: {
          inventoryId,
          name
        }
      }
    });

    if (existing) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "A material with this name already exists in this inventory" } },
        { status: 409 }
      );
    }

    const created = await prisma.rawMaterial.create({
      data: {
        inventoryId,
        name,
        unit,
        purchasePrice,
        transferPrice,
        gstSlabId,
        lowStockAlert,
        currentStock: 0,
        isActive: true
      }
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("POST /api/raw-materials error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create raw material" } },
      { status: 500 }
    );
  }
}
