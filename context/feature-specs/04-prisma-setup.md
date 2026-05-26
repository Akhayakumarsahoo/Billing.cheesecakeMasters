# Unit 02 — Prisma Schema & Database Setup

## What You Are Building

The complete Prisma schema for the billing system V1.
This unit creates the single source of truth for all data models,
runs the initial migration, and seeds the admin account.

No application logic. No API routes. No UI changes.
Database layer only.

---

## Scope

**In scope for this unit:**

- `prisma/schema.prisma` — complete data model
- Initial migration via `prisma migrate dev`
- `prisma/seed.ts` — seeds the one admin account
- `package.json` — add seed script
- `.env.example` — document all required env vars

**Out of scope for this unit:**

- Any API route
- Any UI component
- Any lib function
- Clerk integration (clerk_user_id column exists but sync happens in a later unit)

---

## Prerequisites

Confirm these are already true before proceeding:

- [ ] `prisma` and `@prisma/client` are installed
- [ ] `DATABASE_URL` is set in `.env` and points to a live PostgreSQL database (Supabase or Neon)
- [ ] Database is reachable (`npx prisma db pull` should not throw a connection error)

If any of these fail, stop and report the error. Do not proceed.

---

## Files to Create or Modify

```
prisma/schema.prisma        ← create / fully replace
prisma/seed.ts              ← create
.env.example                ← create
package.json                ← add prisma seed script only
```

---

## Step 1 — Configure `prisma/schema.prisma`

Replace the entire file with the schema below. Do not keep any existing content.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────

enum UserRole {
  Outlet
  manager
  admin
}

enum BillStatus {
  draft
  printed
  cancelled
}

enum PaymentMode {
  cash
  upi
  card
  other
}

// ─────────────────────────────────────────
// OUTLETS
// ─────────────────────────────────────────

model Outlet {
  id         String   @id @default(uuid())
  name       String
  address    String?
  stateCode  String   @db.Char(2)   // e.g. "OD" for Odisha
  gstin      String?
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())

  // Relations
  users          User[]
  menuCategories MenuCategory[]
  menuItems      MenuItem[]
  bills          Bill[]
  billSequence   BillSequence?

  @@map("outlets")
}

// ─────────────────────────────────────────
// USERS
// Clerk owns auth. We store clerk_user_id
// and add role + outlet assignment on top.
// ─────────────────────────────────────────

model User {
  id           String   @id @default(uuid())
  clerkUserId  String   @unique          // Clerk's user.id — set after Clerk user is created
  name         String
  email        String   @unique
  role         UserRole
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())

  // Outlet assignment
  // NULL for admin and manager (cross-outlet access)
  // REQUIRED for Outlet (scoped to one outlet)
  outletId     String?
  outlet       Outlet?  @relation(fields: [outletId], references: [id])

  // Relations
  bills        Bill[]

  @@map("users")
}

// ─────────────────────────────────────────
// GST SLABS
// Static lookup — seeded once, never changed.
// Slabs: 0, 5, 18, 28 (12% excluded per business decision)
// ─────────────────────────────────────────

model GstSlab {
  id    Int     @id                   // 0, 5, 18, 28
  rate  Decimal @db.Decimal(5, 2)     // e.g. 18.00
  label String                        // e.g. "18%"

  // Relations
  menuItems MenuItem[]

  @@map("gst_slabs")
}

// ─────────────────────────────────────────
// MENU CATEGORIES
// Each category belongs to one outlet.
// Completely independent per outlet.
// ─────────────────────────────────────────

model MenuCategory {
  id        String   @id @default(uuid())
  name      String
  sortOrder Int      @default(0)        // controls display order in POS
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())

  // Outlet relation
  outletId  String
  outlet    Outlet   @relation(fields: [outletId], references: [id])

  // Relations
  menuItems MenuItem[]

  @@unique([outletId, name])            // no duplicate category names per outlet
  @@map("menu_categories")
}

// ─────────────────────────────────────────
// MENU ITEMS
// Each item belongs to one outlet and one category.
// Base price is EXCLUSIVE of GST.
// Items are never deleted — only deactivated.
// ─────────────────────────────────────────

model MenuItem {
  id         String   @id @default(uuid())
  name       String
  sku        String?
  basePrice  Decimal  @db.Decimal(12, 2)
  unit       String   @default("pcs")   // pcs, kg, litre, plate, etc.
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())

  // Outlet relation
  outletId   String
  outlet     Outlet   @relation(fields: [outletId], references: [id])

  // Category relation
  categoryId String
  category   MenuCategory @relation(fields: [categoryId], references: [id])

  // GST slab relation
  gstSlabId  Int
  gstSlab    GstSlab  @relation(fields: [gstSlabId], references: [id])

  // Relations
  billLineItems BillLineItem[]

  @@unique([outletId, sku])             // SKU unique per outlet
  @@map("menu_items")
}

// ─────────────────────────────────────────
// BILL NUMBER SEQUENCES
// Per-outlet counter for sequential bill numbers.
// Reset lastSeq to 0 at start of each new year.
// Use SELECT FOR UPDATE in application logic
// to prevent race conditions.
// ─────────────────────────────────────────

model BillSequence {
  outletId  String   @id
  outlet    Outlet   @relation(fields: [outletId], references: [id])
  year      Int
  lastSeq   Int      @default(0)

  @@map("bill_sequences")
}

// ─────────────────────────────────────────
// BILLS
// One row per transaction.
// Status lifecycle: draft → printed → cancelled
// Printed bills are immutable — no field changes
// except status → cancelled and setting cancelledAt.
// Totals are always computed server-side from
// line items. Never trust client-submitted totals.
// ─────────────────────────────────────────

model Bill {
  id           String     @id @default(uuid())
  billNumber   String                           // e.g. OTL1-2025-00042
  status       BillStatus @default(draft)

  // Optional customer details
  customerName  String?
  customerPhone String?

  // Snapshotted totals — computed via lib/gst.ts at completion
  subtotal     Decimal    @default(0) @db.Decimal(12, 2)
  totalCgst    Decimal    @default(0) @db.Decimal(12, 2)
  totalSgst    Decimal    @default(0) @db.Decimal(12, 2)
  totalGst     Decimal    @default(0) @db.Decimal(12, 2)
  grandTotal   Decimal    @default(0) @db.Decimal(12, 2)

  notes        String?
  completedAt  DateTime?                        // set when status → printed
  cancelledAt  DateTime?                        // set when status → cancelled
  createdAt    DateTime   @default(now())

  // Outlet relation
  outletId     String
  outlet       Outlet     @relation(fields: [outletId], references: [id])

  // Outlet POS who created the bill
  createdById  String
  createdBy    User       @relation(fields: [createdById], references: [id])

  // Relations
  lineItems    BillLineItem[]
  payments     BillPayment[]

  @@unique([outletId, billNumber])              // bill number unique per outlet
  @@map("bills")
}

// ─────────────────────────────────────────
// BILL LINE ITEMS
// All values are SNAPSHOTTED at billing time.
// Never recompute from menu_items after creation.
// No JOIN to MenuItem for prices — ever.
// ─────────────────────────────────────────

model BillLineItem {
  id            String   @id @default(uuid())
  createdAt     DateTime @default(now())

  // Bill relation
  billId        String
  bill          Bill     @relation(fields: [billId], references: [id])

  // Menu item reference (for audit only — never used for price lookup)
  menuItemId    String
  menuItem      MenuItem @relation(fields: [menuItemId], references: [id])

  // Snapshotted values at time of billing
  itemName      String
  sku           String?
  unit          String
  quantity      Decimal  @db.Decimal(10, 3)
  basePrice     Decimal  @db.Decimal(12, 2)   // per unit, excl. GST
  gstRate       Decimal  @db.Decimal(5, 2)    // e.g. 18.00

  // Computed line totals — all via lib/gst.ts
  lineBaseTotal Decimal  @db.Decimal(12, 2)   // basePrice × quantity
  lineGstAmount Decimal  @db.Decimal(12, 2)   // lineBaseTotal × gstRate / 100
  lineCgst      Decimal  @db.Decimal(12, 2)   // lineGstAmount / 2
  lineSgst      Decimal  @db.Decimal(12, 2)   // lineGstAmount / 2
  lineTotal     Decimal  @db.Decimal(12, 2)   // lineBaseTotal + lineGstAmount

  @@map("bill_line_items")
}

// ─────────────────────────────────────────
// BILL PAYMENTS
// Multiple rows per bill for split payment.
// SUM(amount) must equal bills.grandTotal
// before bill status can change to printed.
// Validated server-side — never trust client.
// ─────────────────────────────────────────

model BillPayment {
  id      String      @id @default(uuid())
  mode    PaymentMode
  amount  Decimal     @db.Decimal(12, 2)
  paidAt  DateTime    @default(now())

  // Bill relation
  billId  String
  bill    Bill        @relation(fields: [billId], references: [id])

  @@map("bill_payments")
}
```

---

## Step 2 — Run the Initial Migration

Run the following command. Use the migration name exactly as shown:

```bash
npx prisma migrate dev --name init_billing_schema
```

Expected output:

- Migration file created under `prisma/migrations/`
- All tables created in the database
- Prisma Client regenerated

If the migration fails, report the full error. Do not attempt to fix the schema by guessing — stop and report.

---

## Step 3 — Create `prisma/seed.ts`

This file creates:

1. All four GST slabs (0, 5, 18, 28)
2. The one admin user record in the `users` table

The admin's Clerk account is created separately via the Clerk dashboard or API.
The seed sets `clerkUserId` to a placeholder — it will be updated when Clerk sync runs for the first time.

```ts
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

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
```

---

## Step 4 — Add Seed Script to `package.json`

Add the following `prisma` key to `package.json`. Do not modify any other key:

```json
"prisma": {
  "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
}
```

If `ts-node` is not installed, install it:

```bash
npm install --save-dev ts-node
```

---

## Step 5 — Create `.env.example`

Create this file at the project root. Never commit `.env` — only `.env.example`:

```env
# ── Database ───────────────────────────────────────────────
# PostgreSQL connection string (Supabase or Neon)
DATABASE_URL="postgresql://user:password@host:5432/dbname"

# ── Clerk ──────────────────────────────────────────────────
# From Clerk dashboard → API Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# Clerk redirect URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/"

# ── Seed ───────────────────────────────────────────────────
# Used by prisma/seed.ts to create the admin account
SEED_ADMIN_EMAIL="admin@yourcompany.com"
SEED_ADMIN_NAME="Admin"
```

---

## Step 6 — Run the Seed

```bash
npx prisma db seed
```

Expected output:

```
Seeding database...
✓ GST slabs seeded
✓ Admin user seeded: admin@yourcompany.com
Seeding complete.
```

If seed fails, report the full error. Do not modify seed logic without explicit instruction.

---

## Step 7 — Verify in Prisma Studio

Open Prisma Studio to visually confirm the tables and seed data:

```bash
npx prisma studio
```

Confirm:

- All 9 tables exist: `outlets`, `users`, `gst_slabs`, `menu_categories`, `menu_items`, `bill_sequences`, `bills`, `bill_line_items`, `bill_payments`
- `gst_slabs` has exactly 4 rows: 0%, 5%, 18%, 28%
- `users` has exactly 1 row with `role = admin`

---

## Verification Checklist

Before marking this unit complete:

- [ ] `prisma/schema.prisma` contains all 9 models exactly as specified
- [ ] Migration ran successfully with name `init_billing_schema`
- [ ] Migration file exists under `prisma/migrations/`
- [ ] `prisma/seed.ts` exists and is idempotent (safe to run multiple times)
- [ ] `package.json` has the `prisma.seed` script
- [ ] `ts-node` is installed as a dev dependency
- [ ] `.env.example` exists with all 6 variables documented
- [ ] Seed ran successfully — no errors
- [ ] Prisma Studio shows all 9 tables
- [ ] `gst_slabs` has 4 rows (0, 5, 18, 28)
- [ ] `users` has 1 row with `role = admin` and `clerkUserId = 'pending_clerk_sync'`
- [ ] No API routes created in this unit
- [ ] No UI files created or modified in this unit
- [ ] `prisma/migrations/` files were NOT hand-edited
