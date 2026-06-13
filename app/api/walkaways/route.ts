import { requireOutlet, getLoggedInUser, getCurrentUser, getCurrentOutlet } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CreateWalkawaySchema } from "@/lib/validators";
import { parseDateRange } from "@/lib/utils";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    const outlet = await getCurrentOutlet();

    if (!user && !outlet) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;
    const { start, end } = parseDateRange(from, to);

    let targetOutletId: string;

    if (outlet) {
      targetOutletId = outlet.id;
    } else {
      // User must be manager or admin
      if (user?.role !== "admin" && user?.role !== "manager") {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "Not authorized" } },
          { status: 403 }
        );
      }

      const qOutletId = searchParams.get("outletId");
      if (!qOutletId) {
        return NextResponse.json(
          { error: { code: "BAD_REQUEST", message: "Missing outletId parameter" } },
          { status: 400 }
        );
      }
      targetOutletId = qOutletId;
    }

    const walkaways = await prisma.walkaway.findMany({
      where: {
        outletId: targetOutletId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ data: walkaways });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: error.message || "Failed to fetch walkaways" } },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const outlet = await requireOutlet();
    if (!outlet) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only outlets can log walkaways" } },
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

    const loggedInUser = await getLoggedInUser();
    const createdByEmail = loggedInUser?.email ?? null;

    const walkaway = await prisma.walkaway.create({
      data: {
        outletId: outlet.id,
        reason,
        customReason: reason === "Other" ? customReason : null,
        createdByEmail,
      },
    });

    return NextResponse.json(
      { data: walkaway },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof Response) return error;

    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: error.message || "Failed to log walkaway" } },
      { status: 500 }
    );
  }
}
