import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseDateRange, getLocalDateString } from "@/lib/utils";
import { notFound, redirect } from "next/navigation";
import { WalkawaysClient } from "./walkaways-client";

export default async function OutletWalkawaysPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { id } = await params;

  // Auth check — admin and manager only
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "manager")) {
    redirect("/");
  }

  const outlet = await prisma.outlet.findUnique({ where: { id } });
  if (!outlet) notFound();

  const { from, to } = await searchParams;
  
  // Default to today if parameters are missing
  if (!from || !to) {
    const todayStr = getLocalDateString(new Date());
    redirect(`/outlets/${id}/walkaways?from=${todayStr}&to=${todayStr}`);
  }

  const { start, end } = parseDateRange(from, to);

  const walkaways = await prisma.walkaway.findMany({
    where: {
      outletId: id,
      createdAt: {
        gte: start,
        lte: end,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const serializedWalkaways = walkaways.map(w => ({
    id: w.id,
    outletId: w.outletId,
    reason: w.reason,
    customReason: w.customReason,
    createdAt: w.createdAt.toISOString(),
    createdByEmail: w.createdByEmail,
  }));

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <WalkawaysClient
        initialWalkaways={serializedWalkaways}
        outletName={outlet.name}
        outletId={id}
        fromDate={from}
        toDate={to}
      />
    </div>
  );
}
