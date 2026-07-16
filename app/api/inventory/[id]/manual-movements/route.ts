import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseDateRange } from "@/lib/utils";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: inventoryId } = await params;

    // Scope check: storeroom user can only access their assigned inventory
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

    const { searchParams } = new URL(req.url);
    const fromStr = searchParams.get("from");
    const toStr = searchParams.get("to");
    const search = searchParams.get("search") || "";
    const direction = searchParams.get("direction") || "all";

    const { start: startDate, end: endDate } = parseDateRange(fromStr || undefined, toStr || undefined);

    // Build query conditions
    const where: any = {
      inventoryId,
      referenceType: "manual",
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      rawMaterial: {
        name: { contains: search, mode: "insensitive" }
      }
    };

    if (direction === "increase") {
      where.quantityChange = { gt: 0 };
    } else if (direction === "decrease") {
      where.quantityChange = { lt: 0 };
    }

    const movements = await prisma.stockMovement.findMany({
      where,
      include: {
        rawMaterial: true,
        createdBy: {
          select: {
            name: true,
            email: true,
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    const serialized = movements.map(m => ({
      id: m.id,
      createdAt: m.createdAt.toISOString(),
      materialName: m.rawMaterial.name,
      unit: m.rawMaterial.unit,
      quantityChange: Number(m.quantityChange),
      note: m.note,
      createdByName: m.createdBy.name,
      createdByEmail: m.createdBy.email,
    }));

    return NextResponse.json({ data: serialized });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("GET /api/inventory/[id]/manual-movements error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch manual stock movements" } },
      { status: 500 }
    );
  }
}
