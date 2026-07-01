import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CreateSupplierSchema } from "@/lib/validators";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await requireAuth();
    if (user.role !== "admin" && user.role !== "manager" && user.role !== "storeroom") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized" } },
        { status: 403 }
      );
    }

    const suppliers = await prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" }
    });

    const serialized = suppliers.map(s => ({
      id: s.id,
      name: s.name,
      phone: s.phone,
      address: s.address,
      gstin: s.gstin,
      isActive: s.isActive,
      createdAt: s.createdAt.toISOString()
    }));

    return NextResponse.json({ data: serialized }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("GET /api/suppliers error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch suppliers" } },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    if (user.role !== "admin" && user.role !== "storeroom") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized to create suppliers" } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = CreateSupplierSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input values" } },
        { status: 400 }
      );
    }

    const { name, phone, address, gstin } = result.data;

    // Check unique supplier name
    const existing = await prisma.supplier.findUnique({
      where: { name }
    });
    if (existing) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "A supplier with this name already exists" } },
        { status: 409 }
      );
    }

    const created = await prisma.supplier.create({
      data: {
        name,
        phone,
        address,
        gstin,
        isActive: true
      }
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("POST /api/suppliers error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create supplier" } },
      { status: 500 }
    );
  }
}
