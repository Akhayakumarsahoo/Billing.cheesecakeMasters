import { getCurrentOutlet } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { CACHE_STRATEGIES } from "@/lib/cache";
import {
  BillBuilder,
  SerializedMenuItem,
  SerializedCategory,
} from "@/components/billing/bill-builder";

export default async function PosPage() {
  const outlet = await getCurrentOutlet();
  if (!outlet) return null;

  const categories = await (prisma.menuCategory.findMany as any)({
    where: { outletId: outlet.id, isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, sortOrder: true },
    cacheStrategy: CACHE_STRATEGIES.standard,
  });

  const menuItems = (await (prisma.menuItem.findMany as any)({
    where: { outletId: outlet.id, isActive: true },
    select: {
      id: true,
      name: true,
      sku: true,
      basePrice: true,
      unit: true,
      categoryId: true,
      gstSlab: {
        select: {
          rate: true
        }
      }
    },
    cacheStrategy: CACHE_STRATEGIES.standard,
  })) as Array<{
    id: string;
    name: string;
    sku: string | null;
    basePrice: any;
    unit: string;
    categoryId: string;
    gstSlab: { rate: any };
  }>;

  // Serialize Decimal values to strings before passing to the client component
  const serializedCategories: SerializedCategory[] = categories.map((c: any) => ({
    id: c.id,
    name: c.name,
    sortOrder: c.sortOrder,
  }));

  const serializedItems: SerializedMenuItem[] = menuItems.map((item) => ({
    id: item.id,
    name: item.name,
    sku: item.sku,
    basePrice: item.basePrice.toString(),
    unit: item.unit,
    categoryId: item.categoryId,
    gstSlab: { rate: item.gstSlab.rate.toString() },
  }));

  return (
    <div className="flex h-full flex-col">
      <BillBuilder categories={serializedCategories} menuItems={serializedItems} />
    </div>
  );
}
