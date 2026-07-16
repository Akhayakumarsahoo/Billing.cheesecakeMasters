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
    const unit = searchParams.get("unit") || "";

    const { start: startDate, end: endDate } = parseDateRange(fromStr || undefined, toStr || undefined);

    // Fetch active raw materials in this inventory
    const rawMaterials = await prisma.rawMaterial.findMany({
      where: {
        inventoryId,
        isActive: true,
        name: { contains: search, mode: "insensitive" },
        unit: unit ? { equals: unit } : undefined
      },
      include: {
        gstSlab: true
      },
      orderBy: { name: "asc" }
    });

    // Fetch movements for these materials created after startDate in one query to optimize
    const materialIds = rawMaterials.map(m => m.id);
    const movements = await prisma.stockMovement.findMany({
      where: {
        rawMaterialId: { in: materialIds },
        createdAt: { gte: startDate }
      }
    });

    // Group movements by raw material
    const movementsByMaterial: Record<string, typeof movements> = {};
    for (const m of movements) {
      if (!movementsByMaterial[m.rawMaterialId]) {
        movementsByMaterial[m.rawMaterialId] = [];
      }
      movementsByMaterial[m.rawMaterialId].push(m);
    }

    const reportLines = rawMaterials.map(material => {
      const matMovements = movementsByMaterial[material.id] || [];
      const currentStock = Number(material.currentStock);

      // Compute total changes that happened after startDate to back-calculate opening stock
      const totalChangeAfterStart = matMovements.reduce((sum, m) => sum + Number(m.quantityChange), 0);
      const openingStock = currentStock - totalChangeAfterStart;

      // Movements within date range (startDate <= createdAt <= endDate)
      const rangeMovements = matMovements.filter(m => m.createdAt <= endDate);
      
      // Calculate net changes within range by movementType
      const netByType: Record<string, number> = {};
      for (const m of rangeMovements) {
        const qty = Number(m.quantityChange);
        netByType[m.movementType] = (netByType[m.movementType] || 0) + qty;
      }

      // Additions (allow signed values for net updates)
      const purchase = netByType["purchase"] || 0;
      const excess = (netByType["transfer_in"] || 0) + (netByType["adjustment"] || 0);

      // Deductions (negate negative changes to show as positive deductions in the table)
      const consumed = -(netByType["consumption"] || 0);
      const wastage = -(netByType["wastage"] || 0);
      const normalLoss = 0;
      const transfer = -(netByType["transfer_out"] || 0);

      const totalAdditions = openingStock + purchase + excess;
      const totalDeductions = consumed + wastage + normalLoss + transfer;
      const closingSummary = totalAdditions - totalDeductions;
      const difference = currentStock - closingSummary;

      return {
        materialId: material.id,
        materialName: material.name,
        unit: material.unit,
        gstRate: material.gstSlab.rate.toString(),
        hsn: "21069099",
        opening: openingStock,
        purchase,
        excess,
        totalAdditions,
        consumed,
        wastage,
        normalLoss,
        transfer,
        totalDeductions,
        closingStock: currentStock, // Actual current live stock
        closingSummary, // Calculated closing stock at To Date
        difference
      };
    });

    return NextResponse.json({ data: reportLines }, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/inventory/[id]/stock-summary error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch stock summary" } },
      { status: 500 }
    );
  }
}
