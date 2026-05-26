import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UpdateOutletSchema } from "@/lib/validators";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized" } },
        { status: 403 }
      );
    }

    const outlet = await prisma.outlet.findUnique({
      where: { id },
    });

    if (!outlet) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Outlet not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: outlet }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch outlet" } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized" } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = UpdateOutletSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input" } },
        { status: 400 }
      );
    }

    const outlet = await prisma.outlet.findUnique({ where: { id } });
    if (!outlet) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Outlet not found" } },
        { status: 404 }
      );
    }

    const { email, password, ...dbFields } = result.data as any;

    const updated = await prisma.outlet.update({
      where: { id },
      data: dbFields,
    });

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update outlet" } },
      { status: 500 }
    );
  }
}
