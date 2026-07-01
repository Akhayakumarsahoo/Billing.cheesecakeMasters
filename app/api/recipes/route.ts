import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SaveRecipeSchema } from "@/lib/validators";
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

    const recipes = await prisma.recipe.findMany({
      where: { inventoryId },
      include: {
        lines: {
          include: {
            rawMaterial: { select: { name: true, unit: true } }
          }
        }
      }
    });

    const serialized = recipes.map(recipe => ({
      id: recipe.id,
      menuItemId: recipe.menuItemId,
      inventoryId: recipe.inventoryId,
      isActive: recipe.isActive,
      createdAt: recipe.createdAt.toISOString(),
      lines: recipe.lines.map(line => ({
        id: line.id,
        rawMaterialId: line.rawMaterialId,
        materialName: line.rawMaterial.name,
        unit: line.rawMaterial.unit,
        quantityPerUnit: line.quantityPerUnit.toString()
      }))
    }));

    return NextResponse.json({ data: serialized }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("GET /api/recipes error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch recipes" } },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth();

    if (user.role !== "admin" && user.role !== "storeroom") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized to modify recipes" } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = SaveRecipeSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid recipe input values" } },
        { status: 400 }
      );
    }

    const { menuItemId, inventoryId, lines } = result.data;

    // Scope check: storeroom user can only modify their assigned inventory
    if (user.role === "storeroom" && user.inventoryId !== inventoryId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Access restricted to your assigned inventory" } },
        { status: 403 }
      );
    }

    // Verify all raw materials exist and belong to the correct inventory
    const savedRecipe = await prisma.$transaction(async (tx) => {
      for (const line of lines) {
        const mat = await tx.rawMaterial.findUnique({
          where: { id: line.rawMaterialId }
        });
        if (!mat) {
          throw new Error(`Raw material with ID ${line.rawMaterialId} not found`);
        }
        if (mat.inventoryId !== inventoryId) {
          throw new Error(`Raw material ${mat.name} does not belong to this inventory`);
        }
      }

      // Find if recipe already exists
      const existing = await tx.recipe.findUnique({
        where: {
          menuItemId_inventoryId: { menuItemId, inventoryId }
        }
      });

      if (existing) {
        // Delete existing lines
        await tx.recipeLine.deleteMany({
          where: { recipeId: existing.id }
        });

        // Re-create lines and update recipe
        const updated = await tx.recipe.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            lines: {
              create: lines.map(line => ({
                rawMaterialId: line.rawMaterialId,
                quantityPerUnit: new Prisma.Decimal(line.quantityPerUnit)
              }))
            }
          },
          include: {
            lines: true
          }
        });
        return updated;
      } else {
        // Create new recipe
        const created = await tx.recipe.create({
          data: {
            menuItemId,
            inventoryId,
            isActive: true,
            lines: {
              create: lines.map(line => ({
                rawMaterialId: line.rawMaterialId,
                quantityPerUnit: new Prisma.Decimal(line.quantityPerUnit)
              }))
            }
          },
          include: {
            lines: true
          }
        });
        return created;
      }
    }, { timeout: 10000 });

    return NextResponse.json({ data: savedRecipe }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("POST /api/recipes error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: error.message || "Failed to save recipe" } },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireAuth();

    if (user.role !== "admin" && user.role !== "storeroom") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized to delete recipes" } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const menuItemId = searchParams.get("menuItemId");
    const inventoryId = searchParams.get("inventoryId");

    if (!menuItemId || !inventoryId) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Missing menuItemId or inventoryId parameters" } },
        { status: 400 }
      );
    }

    // Scope check: storeroom user can only modify their assigned inventory
    if (user.role === "storeroom" && user.inventoryId !== inventoryId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Access restricted to your assigned inventory" } },
        { status: 403 }
      );
    }

    // Delete recipe (recipe lines will be deleted automatically due to onDelete: Cascade)
    const existing = await prisma.recipe.findUnique({
      where: {
        menuItemId_inventoryId: { menuItemId, inventoryId }
      }
    });

    if (!existing) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Recipe not found" } },
        { status: 404 }
      );
    }

    await prisma.recipe.delete({
      where: { id: existing.id }
    });

    return NextResponse.json({ message: "Recipe deleted successfully" }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("DELETE /api/recipes error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to delete recipe" } },
      { status: 500 }
    );
  }
}
