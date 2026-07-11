import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { recomputeStock, adjustStock } from "@/lib/inventory";
import { CreateWastageRecordSchema } from "@/lib/validators";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const inventoryId = searchParams.get("inventoryId");

    if (!inventoryId) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Missing inventoryId parameter" } },
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

    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const dateParam = searchParams.get("date");
    const whereClause: Prisma.WastageRecordWhereInput = { inventoryId };

    if (fromParam || toParam) {
      const dateFilter: any = {};
      if (fromParam) dateFilter.gte = new Date(fromParam);
      if (toParam) dateFilter.lte = new Date(toParam);
      whereClause.wastageDate = dateFilter;
    } else if (dateParam) {
      whereClause.wastageDate = new Date(dateParam);
    }
 
    const records = await prisma.wastageRecord.findMany({
      where: whereClause,
      include: {
        createdBy: { select: { name: true } },
        lines: true
      },
      orderBy: { wastageDate: "desc" }
    });

    const serialized = records.map(record => ({
      id: record.id,
      wastageDate: record.wastageDate.toISOString().split("T")[0],
      status: record.status,
      reason: record.reason,
      notes: record.notes,
      creatorName: record.createdBy.name,
      itemsCount: record.lines.length,
      createdAt: record.createdAt.toISOString(),
      lines: record.lines.map(line => ({
        id: line.id,
        rawMaterialId: line.rawMaterialId,
        materialName: line.materialName,
        unit: line.unit,
        quantity: line.quantity.toString()
      }))
    }));

    return NextResponse.json({ data: serialized }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("GET /api/wastage error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch wastage records" } },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth();

    if (user.role !== "admin" && user.role !== "storeroom") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized to create wastage logs" } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = CreateWastageRecordSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input values" } },
        { status: 400 }
      );
    }

    const {
      inventoryId,
      wastageDate,
      reason,
      notes,
      lines,
      status = "draft"
    } = result.data;

    // Scope check for storeroom users
    if (user.role === "storeroom" && user.inventoryId !== inventoryId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Access restricted to your assigned inventory" } },
        { status: 403 }
      );
    }

    const parsedDate = new Date(wastageDate);

    // Save and compute if confirmed immediately
    const savedRecord = await prisma.$transaction(async (tx) => {
      const computedLines = [];

      // Batch fetch all raw materials in a single query to eliminate N+1 queries
      const materialIds = lines.map(line => line.rawMaterialId);
      const materials = await tx.rawMaterial.findMany({
        where: { id: { in: materialIds } }
      });
      const materialMap = new Map(materials.map(m => [m.id, m]));

      for (const line of lines) {
        const material = materialMap.get(line.rawMaterialId);

        if (!material) {
          throw new Error(`Raw material with ID ${line.rawMaterialId} not found`);
        }

        if (material.inventoryId !== inventoryId) {
          throw new Error(`Raw material ${material.name} does not belong to this inventory`);
        }



        computedLines.push({
          rawMaterialId: line.rawMaterialId,
          materialName: material.name,
          unit: material.unit,
          quantity: new Prisma.Decimal(line.quantity)
        });
      }

      const record = await tx.wastageRecord.create({
        data: {
          inventoryId,
          wastageDate: parsedDate,
          status,
          reason,
          notes,
          createdById: user.id,
          confirmedAt: status === "confirmed" ? new Date() : null,
          lines: {
            create: computedLines.map(cl => ({
              rawMaterialId: cl.rawMaterialId,
              materialName: cl.materialName,
              unit: cl.unit,
              quantity: cl.quantity
            }))
          }
        },
        include: {
          lines: true
        }
      });

      // Stock impact if confirmed
      if (status === "confirmed") {
        for (const line of record.lines) {
          await tx.stockMovement.create({
            data: {
              inventoryId,
              rawMaterialId: line.rawMaterialId,
              movementType: "wastage",
              referenceType: "wastage_record",
              referenceId: record.id,
              quantityChange: line.quantity.negated(),
              createdById: user.id
            }
          });

          await adjustStock(line.rawMaterialId, line.quantity.negated(), tx);
        }
      }

      return record;
    }, {
      timeout: 10000
    });

    return NextResponse.json({ data: savedRecord }, { status: 201 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("POST /api/wastage error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: error.message || "Failed to create wastage log" } },
      { status: 500 }
    );
  }
}
