import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { adjustStock } from "@/lib/inventory";
import { CreateStockTransferSchema } from "@/lib/validators";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const inventoryId = searchParams.get("inventoryId");

    if (!inventoryId) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Missing inventoryId parameter",
          },
        },
        { status: 400 },
      );
    }

    // Role check: storeroom user can only query their assigned inventory
    if (user.role === "storeroom" && user.inventoryId !== inventoryId) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Access restricted to your assigned inventory",
          },
        },
        { status: 403 },
      );
    } else if (
      user.role !== "admin" &&
      user.role !== "manager" &&
      user.role !== "storeroom"
    ) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized" } },
        { status: 403 },
      );
    }

    // Fetch transfers where current inventory is either sender or receiver
    const transfers = await prisma.stockTransfer.findMany({
      where: {
        OR: [{ fromInventoryId: inventoryId }, { toInventoryId: inventoryId }],
      },
      include: {
        fromInventory: { select: { name: true } },
        toInventory: { select: { name: true } },
        lines: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const serialized = transfers.map((t) => ({
      id: t.id,
      fromInventoryId: t.fromInventoryId,
      fromInventoryName: t.fromInventory.name,
      toInventoryId: t.toInventoryId,
      toInventoryName: t.toInventory.name,
      status: t.status,
      subtotal: t.subtotal.toString(),
      totalGst: t.totalGst.toString(),
      otherCharges: t.otherCharges.toString(),
      otherChargesGst: t.otherChargesGst.toString(),
      grandTotal: t.grandTotal.toString(),
      notes: t.notes,
      itemsCount: t.lines.length,
      createdAt: t.createdAt.toISOString(),
    }));

    return NextResponse.json({ data: serialized }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("GET /api/transfers error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch stock transfers",
        },
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth();

    if (user.role !== "admin" && user.role !== "storeroom") {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Not authorized to create stock transfers",
          },
        },
        { status: 403 },
      );
    }

    const body = await req.json();
    const result = CreateStockTransferSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          error: { code: "VALIDATION_ERROR", message: "Invalid input values" },
        },
        { status: 400 },
      );
    }

    const {
      fromInventoryId,
      toInventoryId,
      notes,
      otherCharges = 0,
      otherChargesGst = 0,
      lines,
      status = "draft",
      date,
    } = result.data;

    let createdAt = new Date();
    if (date) {
      const d = new Date(date);
      const now = new Date();
      d.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
      createdAt = d;
    }

    // Scope check: storeroom user can only transfer FROM their assigned inventory
    if (user.role === "storeroom" && user.inventoryId !== fromInventoryId) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Access restricted to your assigned inventory",
          },
        },
        { status: 403 },
      );
    }

    if (fromInventoryId === toInventoryId) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Source and destination inventories must differ",
          },
        },
        { status: 400 },
      );
    }

    // Run transaction
    const savedTransfer = await prisma.$transaction(
      async (tx) => {
        let subtotalSum = new Prisma.Decimal(0);
        let gstSum = new Prisma.Decimal(0);

        const computedLines = [];

        // Batch fetch raw materials
        const materialIds = lines.map((line) => line.rawMaterialId);
        const materials = await tx.rawMaterial.findMany({
          where: { id: { in: materialIds } },
          include: { gstSlab: true },
        });
        const materialMap = new Map(materials.map((m) => [m.id, m]));

        for (const line of lines) {
          const material = materialMap.get(line.rawMaterialId);

          if (!material) {
            throw new Error(`Raw material ${line.rawMaterialId} not found`);
          }

          if (material.inventoryId !== fromInventoryId) {
            throw new Error(
              `Material ${material.name} does not belong to source inventory`,
            );
          }

          const quantity = new Prisma.Decimal(line.quantity);
          const unitPrice = new Prisma.Decimal(line.unitPrice);
          const gstRate = material.gstSlab.rate;

          const lineBaseTotal = quantity.mul(unitPrice);
          const lineGstAmount = lineBaseTotal.mul(gstRate).div(100);
          const lineTotal = lineBaseTotal.add(lineGstAmount);

          subtotalSum = subtotalSum.add(lineBaseTotal);
          gstSum = gstSum.add(lineGstAmount);

          computedLines.push({
            rawMaterialId: line.rawMaterialId,
            materialName: material.name,
            unit: material.unit,
            quantity,
            unitPrice,
            gstRate,
            lineBaseTotal,
            lineGstAmount,
            lineTotal,
          });
        }

        const grandTotal = subtotalSum
          .add(gstSum)
          .add(new Prisma.Decimal(otherCharges))
          .add(new Prisma.Decimal(otherChargesGst));

        const transfer = await tx.stockTransfer.create({
          data: {
            fromInventoryId,
            toInventoryId,
            status,
            subtotal: subtotalSum,
            totalGst: gstSum,
            otherCharges,
            otherChargesGst,
            grandTotal,
            notes,
            createdById: user.id,
            sentAt: status === "pending" ? createdAt : null,
            createdAt,
            lines: {
              create: computedLines.map((cl) => ({
                rawMaterialId: cl.rawMaterialId,
                materialName: cl.materialName,
                unit: cl.unit,
                quantity: cl.quantity,
                unitPrice: cl.unitPrice,
                gstRate: cl.gstRate,
                lineBaseTotal: cl.lineBaseTotal,
                lineGstAmount: cl.lineGstAmount,
                lineTotal: cl.lineTotal,
              })),
            },
          },
          include: {
            lines: true,
          },
        });

        // Stock impact if sending immediately
        if (status === "pending") {
          for (const line of transfer.lines) {
            await tx.stockMovement.create({
              data: {
                inventoryId: fromInventoryId,
                rawMaterialId: line.rawMaterialId,
                movementType: "transfer_out",
                referenceType: "stock_transfer",
                referenceId: transfer.id,
                quantityChange: line.quantity.negated(),
                createdById: user.id,
                createdAt,
              },
            });

            await adjustStock(line.rawMaterialId, line.quantity.negated(), tx);
          }
        }

        return transfer;
      },
      { timeout: 15000 },
    );

    return NextResponse.json({ data: savedTransfer }, { status: 201 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("POST /api/transfers error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: error.message || "Failed to create transfer",
        },
      },
      { status: 500 },
    );
  }
}
