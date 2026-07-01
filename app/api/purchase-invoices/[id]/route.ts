import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { recomputeStock } from "@/lib/inventory";
import { CreatePurchaseInvoiceSchema } from "@/lib/validators";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const invoice = await prisma.purchaseInvoice.findUnique({
      where: { id },
      include: {
        supplier: { select: { name: true, phone: true, address: true, gstin: true } },
        lines: {
          include: {
            rawMaterial: { select: { name: true, unit: true } }
          }
        }
      }
    });

    if (!invoice) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Purchase invoice not found" } },
        { status: 404 }
      );
    }

    // Scope check: storeroom user can only query their assigned inventory
    if (user.role === "storeroom" && user.inventoryId !== invoice.inventoryId) {
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
      id: invoice.id,
      inventoryId: invoice.inventoryId,
      supplierId: invoice.supplierId,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate.toISOString().split("T")[0],
      status: invoice.status,
      subtotal: invoice.subtotal.toString(),
      totalGst: invoice.totalGst.toString(),
      otherCharges: invoice.otherCharges.toString(),
      otherChargesGst: invoice.otherChargesGst.toString(),
      grandTotal: invoice.grandTotal.toString(),
      notes: invoice.notes,
      supplierName: invoice.supplier.name,
      supplierPhone: invoice.supplier.phone,
      supplierAddress: invoice.supplier.address,
      supplierGstin: invoice.supplier.gstin,
      confirmedAt: invoice.confirmedAt?.toISOString() || null,
      cancelledAt: invoice.cancelledAt?.toISOString() || null,
      lines: invoice.lines.map(line => ({
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
    console.error("GET /api/purchase-invoices/[id] error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch purchase invoice details" } },
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

    const invoice = await prisma.purchaseInvoice.findUnique({
      where: { id },
      include: { lines: true }
    });

    if (!invoice) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Purchase invoice not found" } },
        { status: 404 }
      );
    }

    // Scope check: storeroom user can only modify their assigned inventory
    if (user.role === "storeroom" && user.inventoryId !== invoice.inventoryId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Access restricted to your assigned inventory" } },
        { status: 403 }
      );
    }

    // Case 1: Simple status transition (e.g. Confirm or Cancel via buttons)
    if (body.status && Object.keys(body).length === 1) {
      const newStatus = body.status;

      if (newStatus === "confirmed") {
        if (invoice.status !== "draft") {
          return NextResponse.json(
            { error: { code: "CONFLICT", message: "Only draft invoices can be confirmed" } },
            { status: 409 }
          );
        }

        const confirmedInvoice = await prisma.$transaction(async (tx) => {
          // Update status
          const updated = await tx.purchaseInvoice.update({
            where: { id },
            data: {
              status: "confirmed",
              confirmedAt: new Date()
            }
          });

          // Insert stock movements
          for (const line of invoice.lines) {
            await tx.stockMovement.create({
              data: {
                inventoryId: invoice.inventoryId,
                rawMaterialId: line.rawMaterialId,
                movementType: "purchase",
                referenceType: "purchase_invoice",
                referenceId: id,
                quantityChange: line.quantity,
                createdById: user.id
              }
            });

            await recomputeStock(line.rawMaterialId, tx);
          }

          return updated;
        }, { timeout: 10000 });

        return NextResponse.json({ data: confirmedInvoice }, { status: 200 });
      }

      if (newStatus === "cancelled") {
        if (invoice.status !== "confirmed") {
          return NextResponse.json(
            { error: { code: "CONFLICT", message: "Only confirmed invoices can be cancelled" } },
            { status: 409 }
          );
        }

        const cancelledInvoice = await prisma.$transaction(async (tx) => {
          // Update status
          const updated = await tx.purchaseInvoice.update({
            where: { id },
            data: {
              status: "cancelled",
              cancelledAt: new Date()
            }
          });

          // Insert negative reversal movements
          for (const line of invoice.lines) {
            await tx.stockMovement.create({
              data: {
                inventoryId: invoice.inventoryId,
                rawMaterialId: line.rawMaterialId,
                movementType: "purchase",
                referenceType: "purchase_invoice",
                referenceId: id,
                quantityChange: line.quantity.negated(),
                createdById: user.id,
                note: "Purchase invoice cancelled"
              }
            });

            await recomputeStock(line.rawMaterialId, tx);
          }

          return updated;
        }, { timeout: 10000 });

        return NextResponse.json({ data: cancelledInvoice }, { status: 200 });
      }

      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid status transition" } },
        { status: 400 }
      );
    }

    // Case 2: Edit invoice details / line items
    if (invoice.status === "cancelled") {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "Cancelled invoices cannot be edited" } },
        { status: 409 }
      );
    }

    const result = CreatePurchaseInvoiceSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input values" } },
        { status: 400 }
      );
    }

    const {
      supplierId,
      invoiceNumber,
      invoiceDate,
      notes,
      otherCharges = 0,
      otherChargesGst = 0,
      lines,
      status = invoice.status // keep current status unless specified
    } = result.data;

    const parsedDate = new Date(invoiceDate);

    const updatedInvoice = await prisma.$transaction(async (tx) => {
      // Step A: If currently confirmed, insert reversal movements for old lines first
      if (invoice.status === "confirmed") {
        for (const oldLine of invoice.lines) {
          await tx.stockMovement.create({
            data: {
              inventoryId: invoice.inventoryId,
              rawMaterialId: oldLine.rawMaterialId,
              movementType: "purchase",
              referenceType: "purchase_invoice",
              referenceId: id,
              quantityChange: oldLine.quantity.negated(),
              createdById: user.id,
              note: "Reversal due to purchase invoice edit"
            }
          });
        }
      }

      // Step B: Recompute new lines and totals
      let subtotalSum = new Prisma.Decimal(0);
      let gstSum = new Prisma.Decimal(0);

      const computedLines = [];

      for (const line of lines) {
        const material = await tx.rawMaterial.findUnique({
          where: { id: line.rawMaterialId },
          include: { gstSlab: true }
        });

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

      // Step C: Delete old invoice lines and recreate
      await tx.purchaseInvoiceLine.deleteMany({
        where: { purchaseInvoiceId: id }
      });

      const updated = await tx.purchaseInvoice.update({
        where: { id },
        data: {
          supplierId,
          invoiceNumber,
          invoiceDate: parsedDate,
          status,
          subtotal: subtotalSum,
          totalGst: gstSum,
          otherCharges,
          otherChargesGst,
          grandTotal,
          notes,
          confirmedAt: status === "confirmed" && invoice.status !== "confirmed" ? new Date() : undefined,
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

      // Step D: Apply new movements if status is now confirmed
      if (status === "confirmed") {
        for (const line of updated.lines) {
          await tx.stockMovement.create({
            data: {
              inventoryId: invoice.inventoryId,
              rawMaterialId: line.rawMaterialId,
              movementType: "purchase",
              referenceType: "purchase_invoice",
              referenceId: id,
              quantityChange: line.quantity,
              createdById: user.id
            }
          });
        }
      }

      // Step E: Recompute stock for all affected materials (both old and new unique materials)
      const affectedMaterialIds = Array.from(
        new Set([
          ...invoice.lines.map(l => l.rawMaterialId),
          ...updated.lines.map(l => l.rawMaterialId)
        ])
      );

      for (const matId of affectedMaterialIds) {
        await recomputeStock(matId, tx);
      }

      return updated;
    }, { timeout: 10000 });

    return NextResponse.json({ data: updatedInvoice }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("PATCH /api/purchase-invoices/[id] error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: error.message || "Failed to update purchase invoice" } },
      { status: 500 }
    );
  }
}
