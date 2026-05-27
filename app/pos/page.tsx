import { getCurrentOutlet } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BillBuilder } from "@/components/billing/bill-builder";

export default async function PosPage() {
  const outlet = await getCurrentOutlet();
  if (!outlet) return null;

  const categories = await prisma.menuCategory.findMany({
    where: { outletId: outlet.id, isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  const menuItems = await prisma.menuItem.findMany({
    where: { outletId: outlet.id, isActive: true },
    include: { gstSlab: true },
  });

  // Serialize Decimal to string for client component
  const serializedItems = menuItems.map(item => ({
    ...item,
    basePrice: item.basePrice.toString(),
    gstSlab: {
      ...item.gstSlab,
      rate: item.gstSlab.rate.toString()
    }
  }));

  return (
    <div className="flex h-full flex-col">
      <BillBuilder categories={categories} menuItems={serializedItems as any} />
    </div>
  );
}
