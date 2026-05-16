import { PrismaClient, UserRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // ── GST Slabs ──────────────────────────────────────────
  // Idempotent: upsert so re-running seed does not duplicate
  const gstSlabs = [
    { id: 0, rate: 0.0, label: "0%" },
    { id: 5, rate: 5.0, label: "5%" },
    { id: 18, rate: 18.0, label: "18%" },
    { id: 28, rate: 28.0, label: "28%" },
  ];

  for (const slab of gstSlabs) {
    await prisma.gstSlab.upsert({
      where: { id: slab.id },
      update: {},
      create: slab,
    });
  }

  console.log("✓ GST slabs seeded");

  // ── Admin User ─────────────────────────────────────────
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminName = process.env.SEED_ADMIN_NAME;

  if (!adminEmail || !adminName) {
    throw new Error(
      "Missing required env vars: SEED_ADMIN_EMAIL and SEED_ADMIN_NAME must be set in .env",
    );
  }

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      clerkUserId: "pending_clerk_sync", // updated when admin logs in for first time
      name: adminName,
      email: adminEmail,
      role: UserRole.admin,
      outletId: null,
      isActive: true,
    },
  });

  console.log(`✓ Admin user seeded: ${adminEmail}`);
  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
