import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { recomputeStock, adjustStock } from "@/lib/inventory";
import { CreateStockTransferSchema } from "@/lib/validators";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const transfer = await prisma.stockTransfer.findUnique({
      where: { id },
      include: {
        fromInventory: { select: { name: true } },
        toInventory: { select: { name: true } },
        lines: {
          include: {
            rawMaterial: { select: { name: true, unit: true, gstSlabId: true } }
          }
        }
      }
    });

    if (!transfer) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Stock transfer not found" } },
        { status: 404 }
      );
    }

    // Scope check: storeroom user can only access if they are sender or receiver
    const isSender = transfer.fromInventoryId === user.inventoryId;
    const isReceiver = transfer.toInventoryId === user.inventoryId;
    if (user.role === "storeroom" && !isSender && !isReceiver) {
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
      id: transfer.id,
      fromInventoryId: transfer.fromInventoryId,
      fromInventoryName: transfer.fromInventory.name,
      toInventoryId: transfer.toInventoryId,
      toInventoryName: transfer.toInventory.name,
      status: transfer.status,
      subtotal: transfer.subtotal.toString(),
      totalGst: transfer.totalGst.toString(),
      otherCharges: transfer.otherCharges.toString(),
      otherChargesGst: transfer.otherChargesGst.toString(),
      grandTotal: transfer.grandTotal.toString(),
      notes: transfer.notes,
      sentAt: transfer.sentAt?.toISOString() || null,
      acceptedAt: transfer.acceptedAt?.toISOString() || null,
      rejectedAt: transfer.rejectedAt?.toISOString() || null,
      cancelledAt: transfer.cancelledAt?.toISOString() || null,
      lines: transfer.lines.map(line => ({
        id: line.id,
        rawMaterialId: line.rawMaterialId,
        materialName: line.materialName,
        unit: line.unit,
        quantity: line.quantity.toString(),
        unitPrice: line.unitPrice.toString(),
        gstRate: line.gstRate.toString(),
        lineBaseTotal: line.lineBaseTotal.toString(),
        lineGstAmount: line.lineGstAmount.toString(),
        lineTotal: line.lineTotal.toString()
      }))
    };

    return NextResponse.json({ data: serialized }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("GET /api/transfers/[id] error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch stock transfer details" } },
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

    const transfer = await prisma.stockTransfer.findUnique({
      where: { id },
      include: {
        lines: true,
        fromInventory: { select: { name: true, address: true } }
      }
    });

    if (!transfer) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Stock transfer not found" } },
        { status: 404 }
      );
    }

    // Role check: storeroom user must belong to from or to inventories
    const isSender = transfer.fromInventoryId === user.inventoryId;
    const isReceiver = transfer.toInventoryId === user.inventoryId;
    if (user.role === "storeroom" && !isSender && !isReceiver) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Access restricted to your assigned inventory" } },
        { status: 403 }
      );
    }

    // Case 1: Simple status transition
    if (body.status && Object.keys(body).length === 1) {
      const newStatus = body.status;

      // 1. Send Draft (draft -> pending)
      if (newStatus === "pending") {
        if (transfer.status !== "draft") {
          return NextResponse.json(
            { error: { code: "CONFLICT", message: "Only draft transfers can be sent" } },
            { status: 409 }
          );
        }
        if (user.role === "storeroom" && !isSender) {
          return NextResponse.json(
            { error: { code: "FORBIDDEN", message: "Only sender can send the transfer" } },
            { status: 403 }
          );
        }

        const pendingTransfer = await prisma.$transaction(async (tx) => {
          // Batch fetch all raw materials in a single query to eliminate N+1 queries
          const materialIds = transfer.lines.map(line => line.rawMaterialId);
          const materials = await tx.rawMaterial.findMany({
            where: { id: { in: materialIds } }
          });
          const materialMap = new Map(materials.map(m => [m.id, m]));

          // Verify stock exists in source before sending
          for (const line of transfer.lines) {
            const material = materialMap.get(line.rawMaterialId);
            if (!material) throw new Error(`Material ${line.materialName} not found`);

            // Deduct stock
            await tx.stockMovement.create({
              data: {
                inventoryId: transfer.fromInventoryId,
                rawMaterialId: line.rawMaterialId,
                movementType: "transfer_out",
                referenceType: "stock_transfer",
                referenceId: id,
                quantityChange: line.quantity.negated(),
                createdById: user.id,
                createdAt: transfer.createdAt
              }
            });

            await adjustStock(line.rawMaterialId, line.quantity.negated(), tx);
          }

          // Update status
          return tx.stockTransfer.update({
            where: { id },
            data: {
              status: "pending",
              sentAt: transfer.createdAt
            }
          });
        }, { timeout: 10000 });

        return NextResponse.json({ data: pendingTransfer }, { status: 200 });
      }

      // 2. Accept (pending -> accepted)
      if (newStatus === "accepted") {
        if (transfer.status !== "pending") {
          return NextResponse.json(
            { error: { code: "CONFLICT", message: "Only pending transfers can be accepted" } },
            { status: 409 }
          );
        }
        if (user.role === "storeroom" && !isReceiver) {
          return NextResponse.json(
            { error: { code: "FORBIDDEN", message: "Only receiver can accept the transfer" } },
            { status: 403 }
          );
        }

        const acceptedTransfer = await prisma.$transaction(async (tx) => {
          // 1. Batch fetch source and destination raw materials to eliminate N+1 loop queries
          const sourceMaterialIds = transfer.lines.map(line => line.rawMaterialId);
          const sourceMaterials = await tx.rawMaterial.findMany({
            where: { id: { in: sourceMaterialIds } }
          });
          const sourceMaterialMap = new Map(sourceMaterials.map(m => [m.id, m]));

          const materialNames = transfer.lines.map(line => line.materialName);
          const destMaterials = await tx.rawMaterial.findMany({
            where: {
              inventoryId: transfer.toInventoryId,
              name: { in: materialNames }
            }
          });
          const destMaterialMap = new Map(destMaterials.map(m => [`${m.name}_${m.unit}`, m]));

          // Resolve/create all destination raw materials first
          const resolvedLines = [];
          for (const line of transfer.lines) {
            const sourceMat = sourceMaterialMap.get(line.rawMaterialId);
            if (!sourceMat) throw new Error(`Source material not found`);

            const destKey = `${line.materialName}_${line.unit}`;
            let destMat = destMaterialMap.get(destKey);

            if (!destMat) {
              destMat = await tx.rawMaterial.create({
                data: {
                  inventoryId: transfer.toInventoryId,
                  name: line.materialName,
                  unit: line.unit,
                  purchasePrice: line.unitPrice,
                  transferPrice: line.unitPrice,
                  gstSlabId: sourceMat.gstSlabId,
                  currentStock: 0,
                  isActive: true
                }
              });
              // Cache it locally in case other lines reference the same new material
              destMaterialMap.set(destKey, destMat);
            }

            resolvedLines.push({
              line,
              destMat
            });
          }

          // Find/create supplier
          const supplierName = `${transfer.fromInventory.name} (Transfer)`;
          let supplier = await tx.supplier.findFirst({
            where: { name: supplierName }
          });
          if (!supplier) {
            supplier = await tx.supplier.create({
              data: {
                name: supplierName,
                address: transfer.fromInventory.address || "Internal Stock Transfer",
                isActive: true
              }
            });
          }

          // Create PurchaseInvoice
          const invoice = await tx.purchaseInvoice.create({
            data: {
              inventoryId: transfer.toInventoryId,
              supplierId: supplier.id,
              invoiceNumber: `TRF-${transfer.id.slice(0, 8).toUpperCase()}`,
              invoiceDate: transfer.createdAt,
              status: "confirmed",
              subtotal: transfer.subtotal,
              totalGst: transfer.totalGst,
              otherCharges: transfer.otherCharges,
              otherChargesGst: transfer.otherChargesGst,
              grandTotal: transfer.grandTotal,
              notes: transfer.notes || `Generated from Stock Transfer ${transfer.id.slice(0, 8)}`,
              createdById: user.id,
              confirmedAt: new Date(),
              lines: {
                create: resolvedLines.map(({ line, destMat }) => ({
                  rawMaterialId: destMat.id,
                  materialName: line.materialName,
                  unit: line.unit,
                  quantity: line.quantity,
                  unitPrice: line.unitPrice,
                  gstRate: line.gstRate,
                  lineBaseTotal: line.lineBaseTotal,
                  lineGstAmount: line.lineGstAmount,
                  lineTotal: line.lineTotal
                }))
              }
            },
            include: {
              lines: true
            }
          });

          // Create purchase stock movements and update stock atomically
          for (const invLine of invoice.lines) {
            await tx.stockMovement.create({
              data: {
                inventoryId: transfer.toInventoryId,
                rawMaterialId: invLine.rawMaterialId,
                movementType: "purchase",
                referenceType: "purchase_invoice",
                referenceId: invoice.id,
                quantityChange: invLine.quantity,
                createdById: user.id,
                createdAt: transfer.createdAt
              }
            });

            await adjustStock(invLine.rawMaterialId, invLine.quantity, tx);
          }

          // Update stock transfer status to accepted
          return tx.stockTransfer.update({
            where: { id: transfer.id },
            data: {
              status: "accepted",
              acceptedAt: new Date(),
              acceptedById: user.id
            }
          });
        }, { timeout: 15000 });

        return NextResponse.json({ data: acceptedTransfer }, { status: 200 });
      }

      // 3. Reject (pending -> rejected)
      if (newStatus === "rejected") {
        if (transfer.status !== "pending") {
          return NextResponse.json(
            { error: { code: "CONFLICT", message: "Only pending transfers can be rejected" } },
            { status: 409 }
          );
        }
        if (user.role === "storeroom" && !isReceiver) {
          return NextResponse.json(
            { error: { code: "FORBIDDEN", message: "Only receiver can reject the transfer" } },
            { status: 403 }
          );
        }

        const rejectedTransfer = await prisma.$transaction(async (tx) => {
          // Restore stock in source
          for (const line of transfer.lines) {
            await tx.stockMovement.create({
              data: {
                inventoryId: transfer.fromInventoryId,
                rawMaterialId: line.rawMaterialId,
                movementType: "transfer_in", // or transfer_out positive
                referenceType: "stock_transfer",
                referenceId: id,
                quantityChange: line.quantity,
                createdById: user.id,
                note: "Transfer rejected: stock restored",
                createdAt: transfer.createdAt
              }
            });

            await adjustStock(line.rawMaterialId, line.quantity, tx);
          }

          // Update status
          return tx.stockTransfer.update({
            where: { id },
            data: {
              status: "rejected",
              rejectedAt: new Date(),
              rejectedById: user.id
            }
          });
        }, { timeout: 10000 });

        return NextResponse.json({ data: rejectedTransfer }, { status: 200 });
      }

      // 4. Cancel (draft/pending -> cancelled)
      if (newStatus === "cancelled") {
        if (transfer.status !== "draft" && transfer.status !== "pending") {
          return NextResponse.json(
            { error: { code: "CONFLICT", message: "Only draft or pending transfers can be cancelled" } },
            { status: 409 }
          );
        }
        if (user.role === "storeroom" && !isSender) {
          return NextResponse.json(
            { error: { code: "FORBIDDEN", message: "Only sender can cancel the transfer" } },
            { status: 403 }
          );
        }

        const cancelledTransfer = await prisma.$transaction(async (tx) => {
          // If pending, restore stock in source
          if (transfer.status === "pending") {
            for (const line of transfer.lines) {
              await tx.stockMovement.create({
                data: {
                  inventoryId: transfer.fromInventoryId,
                  rawMaterialId: line.rawMaterialId,
                  movementType: "transfer_in",
                  referenceType: "stock_transfer",
                  referenceId: id,
                  quantityChange: line.quantity,
                  createdById: user.id,
                  note: "Transfer cancelled: stock restored",
                  createdAt: transfer.createdAt
                }
              });

              await adjustStock(line.rawMaterialId, line.quantity, tx);
            }
          }

          // Update status
          return tx.stockTransfer.update({
            where: { id },
            data: {
              status: "cancelled",
              cancelledAt: new Date()
            }
          });
        }, { timeout: 10000 });

        return NextResponse.json({ data: cancelledTransfer }, { status: 200 });
      }

      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid status transition requested" } },
        { status: 400 }
      );
    }

    // Case 2: Full Edit (allowed for draft outbound transfers only)
    if (transfer.status !== "draft") {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "Only draft transfers can be edited" } },
        { status: 409 }
      );
    }
    if (user.role === "storeroom" && !isSender) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only the sending inventory can edit the transfer draft" } },
        { status: 403 }
      );
    }

    const result = CreateStockTransferSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input values" } },
        { status: 400 }
      );
    }

    const {
      toInventoryId,
      notes,
      otherCharges = 0,
      otherChargesGst = 0,
      lines,
      status = "draft"
    } = result.data;

    if (transfer.fromInventoryId === toInventoryId) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Source and destination inventories must differ" } },
        { status: 400 }
      );
    }

    const updatedTransfer = await prisma.$transaction(async (tx) => {
      let subtotalSum = new Prisma.Decimal(0);
      let gstSum = new Prisma.Decimal(0);

      const computedLines = [];

      // Batch fetch all raw materials to eliminate N+1 loop queries
      const materialIds = lines.map(line => line.rawMaterialId);
      const materials = await tx.rawMaterial.findMany({
        where: { id: { in: materialIds } },
        include: { gstSlab: true }
      });
      const materialMap = new Map(materials.map(m => [m.id, m]));

      for (const line of lines) {
        const material = materialMap.get(line.rawMaterialId);

        if (!material) {
          throw new Error(`Material with ID ${line.rawMaterialId} not found`);
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
          lineTotal
        });
      }

      const grandTotal = subtotalSum
        .add(gstSum)
        .add(new Prisma.Decimal(otherCharges))
        .add(new Prisma.Decimal(otherChargesGst));

      // Delete old lines
      await tx.stockTransferLine.deleteMany({
        where: { stockTransferId: id }
      });

      // Update transfer details
      const updated = await tx.stockTransfer.update({
        where: { id },
        data: {
          toInventoryId,
          status,
          subtotal: subtotalSum,
          totalGst: gstSum,
          otherCharges,
          otherChargesGst,
          grandTotal,
          notes,
          sentAt: status === "pending" ? new Date() : undefined,
          lines: {
            create: computedLines.map(cl => ({
              rawMaterialId: cl.rawMaterialId,
              materialName: cl.materialName,
              unit: cl.unit,
              quantity: cl.quantity,
              unitPrice: cl.unitPrice,
              gstRate: cl.gstRate,
              lineBaseTotal: cl.lineBaseTotal,
              lineGstAmount: cl.lineGstAmount,
              lineTotal: cl.lineTotal
            }))
          }
        },
        include: {
          lines: true
        }
      });

      // Stock impact if sending immediately
      if (status === "pending") {
        for (const line of updated.lines) {
          await tx.stockMovement.create({
            data: {
              inventoryId: transfer.fromInventoryId,
              rawMaterialId: line.rawMaterialId,
              movementType: "transfer_out",
              referenceType: "stock_transfer",
              referenceId: id,
              quantityChange: line.quantity.negated(),
              createdById: user.id
            }
          });

          await adjustStock(line.rawMaterialId, line.quantity.negated(), tx);
        }
      }

      return updated;
    }, { timeout: 10000 });

    return NextResponse.json({ data: updatedTransfer }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("PATCH /api/transfers/[id] error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: error.message || "Failed to update stock transfer" } },
      { status: 500 }
    );
  }
}
