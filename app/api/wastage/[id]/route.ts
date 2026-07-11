import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { recomputeStock } from "@/lib/inventory";
import { CreateWastageRecordSchema } from "@/lib/validators";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const record = await prisma.wastageRecord.findUnique({
      where: { id },
      include: {
        createdBy: { select: { name: true } },
        lines: {
          include: {
            rawMaterial: { select: { name: true, unit: true } }
          }
        }
      }
    });

    if (!record) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Wastage record not found" } },
        { status: 404 }
      );
    }

    // Scope check: storeroom user can only query their assigned inventory
    if (user.role === "storeroom" && user.inventoryId !== record.inventoryId) {
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

    const serialized = {
      id: record.id,
      inventoryId: record.inventoryId,
      wastageDate: record.wastageDate.toISOString().split("T")[0],
      status: record.status,
      reason: record.reason,
      notes: record.notes,
      creatorName: record.createdBy.name,
      confirmedAt: record.confirmedAt?.toISOString() || null,
      cancelledAt: record.cancelledAt?.toISOString() || null,
      createdAt: record.createdAt.toISOString(),
      lines: record.lines.map(line => ({
        id: line.id,
        rawMaterialId: line.rawMaterialId,
        materialName: line.materialName,
        unit: line.unit,
        quantity: line.quantity.toString()
      }))
    };

    return NextResponse.json({ data: serialized }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("GET /api/wastage/[id] error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch wastage record details" } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (user.role !== "admin" && user.role !== "storeroom") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized" } },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();

    const record = await prisma.wastageRecord.findUnique({
      where: { id },
      include: { lines: true }
    });

    if (!record) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Wastage record not found" } },
        { status: 404 }
      );
    }

    // Scope check: storeroom user can only modify their assigned inventory
    if (user.role === "storeroom" && user.inventoryId !== record.inventoryId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Access restricted to your assigned inventory" } },
        { status: 403 }
      );
    }

    // Case 1: Simple status transition (Confirm or Cancel via buttons)
    if (body.status && Object.keys(body).length === 1) {
      const newStatus = body.status;

      if (newStatus === "confirmed") {
        if (record.status !== "draft") {
          return NextResponse.json(
            { error: { code: "CONFLICT", message: "Only draft wastage logs can be confirmed" } },
            { status: 409 }
          );
        }

        const confirmedRecord = await prisma.$transaction(async (tx) => {
          // Verify stock exists before confirming
          for (const line of record.lines) {
            const material = await tx.rawMaterial.findUnique({
              where: { id: line.rawMaterialId }
            });
            if (!material) throw new Error(`Material ${line.materialName} not found`);



            // Deduct stock
            await tx.stockMovement.create({
              data: {
                inventoryId: record.inventoryId,
                rawMaterialId: line.rawMaterialId,
                movementType: "wastage",
                referenceType: "wastage_record",
                referenceId: id,
                quantityChange: line.quantity.negated(),
                createdById: user.id
              }
            });

            await recomputeStock(line.rawMaterialId, tx);
          }

          // Update status
          return tx.wastageRecord.update({
            where: { id },
            data: {
              status: "confirmed",
              confirmedAt: new Date()
            }
          });
        }, { timeout: 10000 });

        return NextResponse.json({ data: confirmedRecord }, { status: 200 });
      }

      if (newStatus === "cancelled") {
        if (record.status !== "confirmed") {
          return NextResponse.json(
            { error: { code: "CONFLICT", message: "Only confirmed wastage logs can be cancelled" } },
            { status: 409 }
          );
        }

        const cancelledRecord = await prisma.$transaction(async (tx) => {
          // Revert stock (add back the negated quantity)
          for (const line of record.lines) {
            await tx.stockMovement.create({
              data: {
                inventoryId: record.inventoryId,
                rawMaterialId: line.rawMaterialId,
                movementType: "wastage",
                referenceType: "wastage_record",
                referenceId: id,
                quantityChange: line.quantity, // Positive change to reverse the negative wastage
                createdById: user.id,
                note: "Wastage log cancelled"
              }
            });

            await recomputeStock(line.rawMaterialId, tx);
          }

          // Update status
          return tx.wastageRecord.update({
            where: { id },
            data: {
              status: "cancelled",
              cancelledAt: new Date()
            }
          });
        }, { timeout: 10000 });

        return NextResponse.json({ data: cancelledRecord }, { status: 200 });
      }

      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid status transition" } },
        { status: 400 }
      );
    }

    // Case 2: Edit wastage details / line items (allowed for drafts only)
    if (record.status !== "draft") {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "Only draft wastage logs can be edited" } },
        { status: 409 }
      );
    }

    const result = CreateWastageRecordSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input values" } },
        { status: 400 }
      );
    }

    const {
      wastageDate,
      reason,
      notes,
      lines,
      status = "draft"
    } = result.data;

    const parsedDate = new Date(wastageDate);

    const updatedRecord = await prisma.$transaction(async (tx) => {
      const computedLines = [];

      for (const line of lines) {
        const material = await tx.rawMaterial.findUnique({
          where: { id: line.rawMaterialId }
        });

        if (!material) {
          throw new Error(`Material with ID ${line.rawMaterialId} not found`);
        }



        computedLines.push({
          rawMaterialId: line.rawMaterialId,
          materialName: material.name,
          unit: material.unit,
          quantity: new Prisma.Decimal(line.quantity)
        });
      }

      // Delete old lines
      await tx.wastageLine.deleteMany({
        where: { wastageRecordId: id }
      });

      // Update record
      const updated = await tx.wastageRecord.update({
        where: { id },
        data: {
          wastageDate: parsedDate,
          status,
          reason,
          notes,
          confirmedAt: status === "confirmed" ? new Date() : undefined,
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

      // Stock impact if now confirmed
      if (status === "confirmed") {
        for (const line of updated.lines) {
          await tx.stockMovement.create({
            data: {
              inventoryId: record.inventoryId,
              rawMaterialId: line.rawMaterialId,
              movementType: "wastage",
              referenceType: "wastage_record",
              referenceId: id,
              quantityChange: line.quantity.negated(),
              createdById: user.id
            }
          });

          await recomputeStock(line.rawMaterialId, tx);
        }
      }

      return updated;
    }, { timeout: 10000 });

    return NextResponse.json({ data: updatedRecord }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("PATCH /api/wastage/[id] error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: error.message || "Failed to update wastage record" } },
      { status: 500 }
    );
  }
}
