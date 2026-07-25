import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { adjustStock } from "@/lib/inventory";
import { CreatePurchaseInvoiceSchema } from "@/lib/validators";
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

    const invoices = await prisma.purchaseInvoice.findMany({
      where: { inventoryId },
      include: {
        supplier: { select: { name: true } },
        lines: true
      },
      orderBy: { invoiceDate: "desc" }
    });

    const serialized = invoices.map(inv => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate.toISOString().split("T")[0],
      status: inv.status,
      subtotal: inv.subtotal.toString(),
      totalGst: inv.totalGst.toString(),
      otherCharges: inv.otherCharges.toString(),
      otherChargesGst: inv.otherChargesGst.toString(),
      grandTotal: inv.grandTotal.toString(),
      notes: inv.notes,
      supplierName: inv.supplier.name,
      itemsCount: inv.lines.length,
      createdAt: inv.createdAt.toISOString()
    }));

    return NextResponse.json({ data: serialized }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("GET /api/purchase-invoices error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch purchase invoices" } },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth();

    if (user.role !== "admin" && user.role !== "storeroom") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized to create purchase invoices" } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = CreatePurchaseInvoiceSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input values" } },
        { status: 400 }
      );
    }

    const {
      inventoryId,
      supplierId,
      invoiceNumber,
      invoiceDate,
      notes,
      otherCharges = 0,
      otherChargesGst = 0,
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

    const parsedDate = new Date(invoiceDate);

    // Compute line items and totals inside transaction
    const savedInvoice = await prisma.$transaction(async (tx) => {
      let subtotalSum = new Prisma.Decimal(0);
      let gstSum = new Prisma.Decimal(0);

      const computedLines = [];

      // Batch fetch raw materials
      const materialIds = lines.map(line => line.rawMaterialId);
      const materials = await tx.rawMaterial.findMany({
        where: { id: { in: materialIds } },
        include: { gstSlab: true }
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

      const invoice = await tx.purchaseInvoice.create({
        data: {
          inventoryId,
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
          createdById: user.id,
          confirmedAt: status === "confirmed" ? new Date() : null,
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

      // Stock impact if confirmed
      if (status === "confirmed") {
        for (const line of invoice.lines) {
          await tx.stockMovement.create({
            data: {
              inventoryId,
              rawMaterialId: line.rawMaterialId,
              movementType: "purchase",
              referenceType: "purchase_invoice",
              referenceId: invoice.id,
              quantityChange: line.quantity,
              createdById: user.id,
              createdAt: invoice.invoiceDate
            }
          });

          await adjustStock(line.rawMaterialId, line.quantity, tx);
        }
      }

      return invoice;
    }, {
      timeout: 15000
    });

    return NextResponse.json({ data: savedInvoice }, { status: 201 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("POST /api/purchase-invoices error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: error.message || "Failed to create purchase invoice" } },
      { status: 500 }
    );
  }
}
