import { getCurrentUser, getCurrentOutlet, getLoggedInUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CreateWalkawaySchema } from "@/lib/validators";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const outlet = await getCurrentOutlet();

    if (!user && !outlet) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const walkaway = await prisma.walkaway.findUnique({
      where: { id },
    });

    if (!walkaway) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Walkaway log not found" } },
        { status: 404 }
      );
    }

    // Scoped check for outlet
    if (outlet && walkaway.outletId !== outlet.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized to access this log" } },
        { status: 403 }
      );
    }

    // Scoped check for admin/manager user
    if (user && user.role !== "admin" && user.role !== "manager") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized" } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = CreateWalkawaySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input" } },
        { status: 400 }
      );
    }

    const { reason, customReason } = result.data;
    const updatedBy = await getLoggedInUser();
    
    const updated = await prisma.walkaway.update({
      where: { id },
      data: {
        reason,
        customReason: reason === "Other" ? customReason : null,
        createdByEmail: updatedBy?.email || walkaway.createdByEmail,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: error.message || "Failed to update walkaway" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const outlet = await getCurrentOutlet();

    if (!user && !outlet) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const walkaway = await prisma.walkaway.findUnique({
      where: { id },
    });

    if (!walkaway) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Walkaway log not found" } },
        { status: 404 }
      );
    }

    // Scoped check for outlet
    if (outlet && walkaway.outletId !== outlet.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized to access this log" } },
        { status: 403 }
      );
    }

    // Scoped check for admin/manager user
    if (user && user.role !== "admin" && user.role !== "manager") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized" } },
        { status: 403 }
      );
    }

    await prisma.walkaway.delete({
      where: { id },
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: error.message || "Failed to delete walkaway" } },
      { status: 500 }
    );
  }
}
