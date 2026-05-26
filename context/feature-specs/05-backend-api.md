# Project API — Backend Routes Implementation

## Overview

This document defines every API route in the billing system V1.
Implement all routes exactly as specified. No extra endpoints. No shortcuts.

Read `architecture.md`, `code-standards.md`, and `ai-workflow-rules.md` before writing any code.

---

## Ground Rules (Apply to Every Route)

**Every route follows this exact four-step order — no exceptions:**

1. Parse and validate request input with Zod
2. Resolve the caller's identity via `lib/auth.ts`
3. Check role permission — return 403 if unauthorized
4. Execute business logic via a `lib/` function — return response

**Response shape is always:**

```ts
// Success
{
  data: T;
}

// Error
{
  error: {
    code: string;
    message: string;
  }
}
```

**HTTP status codes:**
| Code | When |
|---|---|
| `200` | Successful GET, PATCH, DELETE |
| `201` | Successful POST (resource created) |
| `400` | Validation failure (bad input) |
| `401` | Not authenticated (no valid Clerk session) |
| `403` | Authenticated but not authorized for this action |
| `404` | Resource not found |
| `409` | Conflict — e.g. mutating a printed bill |
| `422` | Business rule violation — e.g. payment total mismatch |

**Monetary values:** All `Decimal` fields from Prisma must be serialized to `string` before being included in any response. Never send `number` for money.

---

## Lib Files to Create First

Before writing any route, create these shared lib files. Routes depend on them.

---

### `lib/db.ts`

Prisma client singleton. Prevents multiple instances in development.

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ["error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

---

### `lib/auth.ts`

Resolves the current user's DB record (role + outlet) from the Clerk session.
Every route calls this. It never reads outlet from the request.

```ts
import { auth } from "@clerk/nextjs/server";
import { prisma } from "./db";
import type { User } from "@prisma/client";

export type CurrentUser = User;

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
  });

  return user;
}

// Convenience: throws 401 response if not authenticated
export async function requireAuth(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Response(
      JSON.stringify({
        error: { code: "UNAUTHORIZED", message: "Not authenticated" },
      }),
      { status: 401 },
    );
  }
  return user;
}
```

---

### `lib/gst.ts`

Single source of truth for all GST computation. No other file may compute GST.

```ts
import { Decimal } from "@prisma/client/runtime/library";

export interface LineItemInput {
  basePrice: Decimal;
  quantity: Decimal;
  gstRate: Decimal;
}

export interface LineItemTotals {
  lineBaseTotal: Decimal;
  lineGstAmount: Decimal;
  lineCgst: Decimal;
  lineSgst: Decimal;
  lineTotal: Decimal;
}

export interface BillTotals {
  subtotal: Decimal;
  totalCgst: Decimal;
  totalSgst: Decimal;
  totalGst: Decimal;
  grandTotal: Decimal;
}

export function computeLineItem(input: LineItemInput): LineItemTotals {
  const lineBaseTotal = input.basePrice.mul(input.quantity);
  const lineGstAmount = lineBaseTotal.mul(input.gstRate).div(100);
  const lineCgst = lineGstAmount.div(2);
  const lineSgst = lineGstAmount.div(2);
  const lineTotal = lineBaseTotal.add(lineGstAmount);

  return {
    lineBaseTotal,
    lineGstAmount,
    lineCgst,
    lineSgst,
    lineTotal,
  };
}

export function computeBillTotals(lineItems: LineItemTotals[]): BillTotals {
  const zero = new Decimal(0);

  const subtotal = lineItems.reduce(
    (sum, li) => sum.add(li.lineBaseTotal),
    zero,
  );
  const totalCgst = lineItems.reduce((sum, li) => sum.add(li.lineCgst), zero);
  const totalSgst = lineItems.reduce((sum, li) => sum.add(li.lineSgst), zero);
  const totalGst = totalCgst.add(totalSgst);
  const grandTotal = subtotal.add(totalGst);

  return { subtotal, totalCgst, totalSgst, totalGst, grandTotal };
}
```

---

### `lib/bill-number.ts`

Generates sequential per-outlet bill numbers.
Uses `$executeRawUnsafe` with `SELECT FOR UPDATE` to prevent race conditions.

```ts
import { prisma } from "./db";

export async function generateBillNumber(outletId: string): Promise<string> {
  const year = new Date().getFullYear();

  // Get outlet index (1-based) for the prefix
  const outlets = await prisma.outlet.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  const outletIndex = outlets.findIndex((o) => o.id === outletId) + 1;

  // Upsert sequence row and increment atomically
  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `INSERT INTO bill_sequences ("outletId", year, "lastSeq")
       VALUES ($1, $2, 0)
       ON CONFLICT ("outletId") DO NOTHING`,
      outletId,
      year,
    );

    // Reset sequence if year has changed
    await tx.$executeRawUnsafe(
      `UPDATE bill_sequences SET "lastSeq" = 0, year = $1
       WHERE "outletId" = $2 AND year != $1`,
      year,
      outletId,
    );

    const rows = await tx.$queryRawUnsafe<{ lastSeq: number }[]>(
      `UPDATE bill_sequences SET "lastSeq" = "lastSeq" + 1
       WHERE "outletId" = $1
       RETURNING "lastSeq"`,
      outletId,
    );

    return rows[0].lastSeq;
  });

  const seq = String(result).padStart(5, "0");
  return `OTL${outletIndex}-${year}-${seq}`;
}
```

---

### `lib/validators/index.ts`

All Zod schemas. Import from here in routes — never define schemas inline in route files.

```ts
import { z } from "zod";

// ── Outlets ───────────────────────────────────────────────
export const CreateOutletSchema = z.object({
  name: z.string().min(1).max(100),
  address: z.string().max(300).optional(),
  stateCode: z.string().length(2),
  gstin: z.string().max(15).optional(),
});

export const UpdateOutletSchema = CreateOutletSchema.partial();

// ── Users ─────────────────────────────────────────────────
export const CreateUserSchema = z
  .object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(["Outlet", "manager"]), // admin is never allowed here
    outletId: z.string().uuid().optional(), // required when role = Outlet
  })
  .refine((data) => data.role !== "Outlet" || !!data.outletId, {
    message: "outletId is required when role is Outlet",
    path: ["outletId"],
  });

export const UpdateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
  outletId: z.string().uuid().nullable().optional(),
});

// ── Menu Categories ───────────────────────────────────────
export const CreateCategorySchema = z.object({
  name: z.string().min(1).max(100),
  sortOrder: z.number().int().min(0).optional(),
});

export const UpdateCategorySchema = CreateCategorySchema.partial().extend({
  isActive: z.boolean().optional(),
});

// ── Menu Items ────────────────────────────────────────────
export const CreateMenuItemSchema = z.object({
  name: z.string().min(1).max(150),
  sku: z.string().max(50).optional(),
  basePrice: z.number().positive(),
  gstSlabId: z.number().refine((v) => [0, 5, 18, 28].includes(v), {
    message: "gstSlabId must be one of 0, 5, 18, 28",
  }),
  unit: z.string().max(20).optional(),
  categoryId: z.string().uuid(),
});

export const UpdateMenuItemSchema = CreateMenuItemSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// ── Bills ─────────────────────────────────────────────────
export const CreateBillSchema = z.object({
  customerName: z.string().max(100).optional(),
  customerPhone: z.string().max(15).optional(),
  notes: z.string().max(300).optional(),
});

export const AddLineItemSchema = z.object({
  menuItemId: z.string().uuid(),
  quantity: z.number().positive(),
});

export const UpdateLineItemSchema = z.object({
  quantity: z.number().positive(),
});

export const CompleteBillSchema = z.object({
  customerName: z.string().max(100).optional(),
  customerPhone: z.string().max(15).optional(),
  notes: z.string().max(300).optional(),
});

// ── Payments ──────────────────────────────────────────────
export const AddPaymentSchema = z.object({
  mode: z.enum(["cash", "upi", "card", "other"]),
  amount: z.number().positive(),
});

// ── Dashboard ─────────────────────────────────────────────
export const DashboardQuerySchema = z.object({
  outletId: z.string().uuid().optional(),
  dateFrom: z.string().optional(), // ISO date string YYYY-MM-DD
  dateTo: z.string().optional(),
});

export const BillHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(["draft", "printed", "cancelled"]).optional(),
  paymentMode: z.enum(["cash", "upi", "card", "other"]).optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  billNumber: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});
```

---

## API Routes

---

### GROUP 1 — Auth Sync

#### `POST /api/auth/sync`

Syncs the Clerk user into the local `users` table on first login.
Called automatically after login via Clerk webhook or a client-side effect.

**Auth:** Requires valid Clerk session. No role check needed.
**Body:** None — identity resolved from Clerk session only.

**Logic:**

1. Get `userId` from Clerk session via `auth()`
2. Get user details from Clerk via `clerkClient.users.getUser(userId)`
3. Upsert into `users` table:
   - `where: { clerkUserId: userId }`
   - `update: {}` (no-op if already exists)
   - `create: { clerkUserId, name, email, role: 'Outlet', isActive: true }` — role will be corrected by admin later; this is just a safety fallback. In practice, admin creates users first via `/api/users`, so the row already exists with the correct role. The upsert only creates a row if somehow a Clerk user exists without a DB row.
4. Return `{ data: { synced: true } }`

**File:** `app/api/auth/sync/route.ts`

---

### GROUP 2 — Outlets

#### `GET /api/outlets`

Returns all outlets.

**Auth:** `admin` or `manager`
**Query params:** None

**Logic:**

1. Validate auth — role must be `admin` or `manager`
2. Return all outlets ordered by `createdAt asc`
3. Serialize response

**Response:**

```ts
{
  data: {
    id: string;
    name: string;
    address: string | null;
    stateCode: string;
    gstin: string | null;
    isActive: boolean;
    createdAt: string;
  }
  [];
}
```

**File:** `app/api/outlets/route.ts`

---

#### `POST /api/outlets`

Creates a new outlet.

**Auth:** `admin` only
**Body:** `CreateOutletSchema`

**Logic:**

1. Validate body
2. Resolve auth — return 403 if not admin
3. Create outlet in DB
4. Create a `BillSequence` row for the new outlet: `{ outletId, year: currentYear, lastSeq: 0 }`
5. Return `201` with created outlet

**File:** `app/api/outlets/route.ts`

---

#### `GET /api/outlets/[id]`

Returns a single outlet by ID.

**Auth:** `admin` or `manager`

**File:** `app/api/outlets/[id]/route.ts`

---

#### `PATCH /api/outlets/[id]`

Updates outlet fields.

**Auth:** `admin` only
**Body:** `UpdateOutletSchema` (all fields optional)

**Logic:**

1. Validate body
2. Resolve auth — return 403 if not admin
3. Confirm outlet exists — return 404 if not
4. Update and return updated outlet

**File:** `app/api/outlets/[id]/route.ts`

---

### GROUP 3 — Users

#### `GET /api/users`

Returns all users (excluding the admin themselves from the list is optional).

**Auth:** `admin` only
**Query params:** `?outletId=` (optional filter), `?role=` (optional filter)

**Logic:**

1. Resolve auth — return 403 if not admin
2. Query users with optional filters, include outlet name
3. Return users ordered by `createdAt desc`
4. Never return the `clerkUserId` field in the response

**Response:**

```ts
{
  data: {
    id: string
    name: string
    email: string
    role: 'Outlet' | 'manager' | 'admin'
    isActive: boolean
    outlet: { id: string; name: string } | null
    createdAt: string
  }[]
}
```

**File:** `app/api/users/route.ts`

---

#### `POST /api/users`

Creates a new user (Outlet or manager only — never admin).

**Auth:** `admin` only
**Body:** `CreateUserSchema`

**Logic:**

1. Validate body
2. Resolve auth — return 403 if not admin
3. Reject if `role === 'admin'` — return 403 with code `ADMIN_CREATION_FORBIDDEN`
4. If `role === 'Outlet'`, confirm `outletId` exists and is active — return 400 if not
5. Create Clerk user via `clerkClient.users.createUser({ emailAddress: [email], password })`
6. On Clerk success, create DB user with `clerkUserId` from Clerk response
7. If DB insert fails, attempt to delete the Clerk user to avoid orphaned accounts
8. Return `201` with created user (no password, no clerkUserId in response)

**File:** `app/api/users/route.ts`

---

#### `GET /api/users/[id]`

Returns a single user by DB ID.

**Auth:** `admin` only

**File:** `app/api/users/[id]/route.ts`

---

#### `PATCH /api/users/[id]`

Updates user name, isActive status, or outlet assignment.
Does not allow changing role or email.

**Auth:** `admin` only
**Body:** `UpdateUserSchema`

**Logic:**

1. Validate body
2. Resolve auth — return 403 if not admin
3. Confirm user exists — return 404 if not
4. Do not allow updating `role` or `email` — ignore those fields even if sent
5. If deactivating (`isActive: false`), also disable in Clerk via `clerkClient.users.updateUser`
6. Update and return updated user

**File:** `app/api/users/[id]/route.ts`

---

### GROUP 4 — Menu Categories

#### `GET /api/menu/categories`

Returns all categories for a specific outlet.

**Auth:** `admin`, `manager`, or `Outlet` (Outlet needs categories for POS)
**Query params:** `?outletId=` (required)

**Logic:**

1. Validate `outletId` is present — return 400 if missing
2. Resolve auth
3. If Outlet: confirm `outletId` matches their assigned outlet — return 403 if not
4. Return active categories for the outlet ordered by `sortOrder asc`, then `name asc`

**File:** `app/api/menu/categories/route.ts`

---

#### `POST /api/menu/categories`

Creates a new category for an outlet.

**Auth:** `admin` or `manager`
**Body:** `CreateCategorySchema`
**Query params:** `?outletId=` (required)

**Logic:**

1. Validate body and `outletId` query param
2. Resolve auth — return 403 if Outlet
3. Confirm outlet exists and is active
4. Create category
5. Return `201`

**File:** `app/api/menu/categories/route.ts`

---

#### `PATCH /api/menu/categories/[id]`

Updates a category (name, sortOrder, isActive).

**Auth:** `admin` or `manager`
**Body:** `UpdateCategorySchema`

**Logic:**

1. Resolve auth — return 403 if Outlet
2. Confirm category exists — return 404 if not
3. Update and return updated category

**File:** `app/api/menu/categories/[id]/route.ts`

---

### GROUP 5 — Menu Items

#### `GET /api/menu/items`

Returns menu items for a specific outlet.

**Auth:** `admin`, `manager`, or `Outlet`
**Query params:**

- `outletId` (required)
- `categoryId` (optional filter)
- `search` (optional — searches `name` and `sku`)
- `isActive` (optional, default `true`)

**Logic:**

1. Validate `outletId`
2. Resolve auth
3. If Outlet: confirm `outletId` matches their outlet — return 403 if not
4. Return items with their category name and GST slab
5. Order: `category.sortOrder asc`, `name asc`

**Response:**

```ts
{
  data: {
    id: string;
    name: string;
    sku: string | null;
    basePrice: string; // Decimal serialized as string
    unit: string;
    isActive: boolean;
    gstSlab: {
      id: number;
      rate: string;
      label: string;
    }
    category: {
      id: string;
      name: string;
    }
  }
  [];
}
```

**File:** `app/api/menu/items/route.ts`

---

#### `POST /api/menu/items`

Creates a new menu item for an outlet.

**Auth:** `admin` or `manager`
**Body:** `CreateMenuItemSchema`
**Query params:** `?outletId=` (required)

**Logic:**

1. Validate body and `outletId`
2. Resolve auth — return 403 if Outlet
3. Confirm outlet exists and is active
4. Confirm `categoryId` belongs to the same outlet — return 400 if not
5. Confirm `gstSlabId` exists (0, 5, 18, or 28) — return 400 if not
6. If `sku` provided, confirm it is unique for this outlet — return 409 if duplicate
7. Create item and return `201`

**File:** `app/api/menu/items/route.ts`

---

#### `GET /api/menu/items/[id]`

Returns a single menu item.

**Auth:** `admin`, `manager`, or `Outlet`

**File:** `app/api/menu/items/[id]/route.ts`

---

#### `PATCH /api/menu/items/[id]`

Updates a menu item.

**Auth:** `admin` or `manager`
**Body:** `UpdateMenuItemSchema`

**Logic:**

1. Validate body
2. Resolve auth — return 403 if Outlet
3. Confirm item exists — return 404 if not
4. If `categoryId` is being changed, confirm new category belongs to same outlet
5. Update and return updated item

**File:** `app/api/menu/items/[id]/route.ts`

---

### GROUP 6 — Bills

#### `GET /api/bills`

Returns bills with filters. Outlets see their outlet only. Managers and admins see all.

**Auth:** `Outlet`, `manager`, `admin`
**Query params:** `BillHistoryQuerySchema`
— `page`, `limit`, `status`, `paymentMode`, `customerName`, `customerPhone`, `billNumber`, `dateFrom`, `dateTo`

**Logic:**

1. Validate query params with `BillHistoryQuerySchema`
2. Resolve auth
3. Build `where` clause:
   - If Outlet: force `outletId = user.outletId` (ignore any outletId in query)
   - If manager/admin: use `outletId` from query if provided, else all outlets
   - Apply all other filters with `contains` (case-insensitive) for string fields
   - `dateFrom`/`dateTo` filter on `completedAt` (not `createdAt`)
4. Return paginated results with total count

**Response:**

```ts
{
  data: {
    bills: {
      id: string;
      billNumber: string;
      status: string;
      customerName: string | null;
      customerPhone: string | null;
      grandTotal: string;
      subtotal: string;
      totalGst: string;
      completedAt: string | null;
      cancelledAt: string | null;
      createdAt: string;
      outlet: {
        id: string;
        name: string;
      }
      createdBy: {
        id: string;
        name: string;
      }
      payments: {
        mode: string;
        amount: string;
      }
      [];
    }
    [];
    total: number;
    page: number;
    limit: number;
  }
}
```

**File:** `app/api/bills/route.ts`

---

#### `POST /api/bills`

Creates a new draft bill.

**Auth:** `Outlet` only — return 403 for any other role

**Body:** `CreateBillSchema` (all fields optional)

**Logic:**

1. Validate body
2. Resolve auth — return 403 if not Outlet
3. Confirm Outlet's outlet exists and is active
4. Generate bill number via `lib/bill-number.ts`
5. Create bill with `status: 'draft'`
6. Return `201` with created bill

**File:** `app/api/bills/route.ts`

---

#### `GET /api/bills/[id]`

Returns a single bill with full detail — line items and payments included.

**Auth:** `Outlet` (own outlet only), `manager`, `admin`

**Logic:**

1. Resolve auth
2. Fetch bill with `lineItems` and `payments` included
3. If Outlet: confirm bill's `outletId` matches their outlet — return 403 if not
4. Return full bill detail

**File:** `app/api/bills/[id]/route.ts`

---

#### `PATCH /api/bills/[id]`

Updates optional fields on a draft bill (customer name, phone, notes).

**Auth:** `Outlet` only (own outlet)

**Logic:**

1. Resolve auth — return 403 if not Outlet
2. Fetch bill — return 404 if not found
3. Confirm bill belongs to Outlet's outlet — return 403 if not
4. Confirm bill status is `draft` — return 409 if `printed` or `cancelled`
5. Update only: `customerName`, `customerPhone`, `notes`
6. Return updated bill

**File:** `app/api/bills/[id]/route.ts`

---

#### `POST /api/bills/[id]/complete`

Marks a draft bill as printed. Validates payment total. Computes and locks all totals.

**Auth:** `Outlet` only (own outlet)
**Body:** `CompleteBillSchema` (optional customer fields, notes)

**Logic:**

1. Validate body
2. Resolve auth — return 403 if not Outlet
3. Fetch bill with `lineItems` and `payments`
4. Confirm bill belongs to Outlet's outlet — return 403 if not
5. Confirm bill status is `draft` — return 409 if not
6. Confirm bill has at least one line item — return 422 with code `EMPTY_BILL` if not
7. Confirm bill has at least one payment row — return 422 with code `NO_PAYMENT` if not
8. Recompute all totals from line items via `lib/gst.ts` (`computeBillTotals`)
9. Sum all payment amounts
10. Confirm payment total equals computed `grandTotal` — return 422 with code `PAYMENT_MISMATCH` if not
11. Update bill in a single transaction:
    - Set `status = 'printed'`
    - Set `completedAt = now()`
    - Update all total fields from computed values
    - Apply any `customerName`, `customerPhone`, `notes` from body
12. Return updated bill

**File:** `app/api/bills/[id]/complete/route.ts`

---

#### `POST /api/bills/[id]/cancel`

Cancels a printed bill. Sets status to cancelled. No other field changes.

**Auth:** `Outlet`, `manager`, `admin`

**Logic:**

1. Resolve auth
2. Fetch bill — return 404 if not found
3. If Outlet: confirm bill's outlet matches their outlet — return 403 if not
4. Confirm bill status is `printed` — return 409 if `draft` or already `cancelled`
5. Update bill:
   - `status = 'cancelled'`
   - `cancelledAt = now()`
   - No other field changes
6. Return updated bill

**File:** `app/api/bills/[id]/cancel/route.ts`

---

### GROUP 7 — Bill Line Items

#### `POST /api/bills/[id]/items`

Adds a line item to a draft bill. Snapshots all values from the menu item.

**Auth:** `Outlet` only (own outlet)
**Body:** `AddLineItemSchema` — `{ menuItemId, quantity }`

**Logic:**

1. Validate body
2. Resolve auth — return 403 if not Outlet
3. Fetch bill — return 404 if not found
4. Confirm bill belongs to Outlet's outlet — return 403 if not
5. Confirm bill status is `draft` — return 409 if not
6. Fetch menu item — return 404 if not found or not active
7. Confirm menu item belongs to Outlet's outlet — return 403 if not
8. Compute line totals via `lib/gst.ts` (`computeLineItem`)
9. Create `BillLineItem` with ALL values snapshotted:
   - `itemName`, `sku`, `unit` from menu item
   - `basePrice`, `gstRate` from menu item (not from request)
   - All computed totals from step 8
10. Return `201` with created line item

**File:** `app/api/bills/[id]/items/route.ts`

---

#### `PATCH /api/bills/[id]/items/[itemId]`

Updates the quantity of a line item on a draft bill. Recomputes line totals.

**Auth:** `Outlet` only (own outlet)
**Body:** `UpdateLineItemSchema` — `{ quantity }`

**Logic:**

1. Validate body
2. Resolve auth — return 403 if not Outlet
3. Fetch bill — confirm draft status and outlet ownership
4. Fetch line item — return 404 if not found
5. Recompute line totals with new quantity via `lib/gst.ts`
6. Update line item with new quantity and recomputed totals
7. Return updated line item

**File:** `app/api/bills/[id]/items/[itemId]/route.ts`

---

#### `DELETE /api/bills/[id]/items/[itemId]`

Removes a line item from a draft bill.

**Auth:** `Outlet` only (own outlet)

**Logic:**

1. Resolve auth — return 403 if not Outlet
2. Fetch bill — confirm draft status and outlet ownership
3. Fetch line item — return 404 if not found
4. Delete line item (this is a line item delete — not a bill delete — permitted)
5. Return `200 { data: { deleted: true } }`

**File:** `app/api/bills/[id]/items/[itemId]/route.ts`

---

### GROUP 8 — Bill Payments

#### `GET /api/bills/[id]/payments`

Returns all payment rows for a bill.

**Auth:** `Outlet` (own outlet), `manager`, `admin`

**File:** `app/api/bills/[id]/payments/route.ts`

---

#### `POST /api/bills/[id]/payments`

Adds a payment row to a draft bill.

**Auth:** `Outlet` only (own outlet)
**Body:** `AddPaymentSchema` — `{ mode, amount }`

**Logic:**

1. Validate body
2. Resolve auth — return 403 if not Outlet
3. Fetch bill — return 404 if not found
4. Confirm bill belongs to Outlet's outlet — return 403 if not
5. Confirm bill status is `draft` — return 409 if not
6. Create payment row
7. Return `201` with created payment

**File:** `app/api/bills/[id]/payments/route.ts`

---

#### `DELETE /api/bills/[id]/payments/[paymentId]`

Removes a payment row from a draft bill.

**Auth:** `Outlet` only (own outlet)

**Logic:**

1. Resolve auth — return 403 if not Outlet
2. Fetch bill — confirm draft status and outlet ownership
3. Fetch payment — return 404 if not found
4. Delete payment row
5. Return `200 { data: { deleted: true } }`

**File:** `app/api/bills/[id]/payments/[paymentId]/route.ts`

---

### GROUP 9 — Dashboard

#### `GET /api/dashboard/summary`

Returns aggregated sales metrics — total revenue, bill count, GST collected.
Used by admin/manager dashboard.

**Auth:** `admin` or `manager`
**Query params:** `DashboardQuerySchema` — `outletId` (optional), `dateFrom`, `dateTo`

**Logic:**

1. Validate query params
2. Resolve auth — return 403 if Outlet
3. Build `where` clause scoped to `status = 'printed'` and date range on `completedAt`
4. Run the following aggregations in a single Prisma query or raw SQL:
   - `COUNT(bills.id)` → `billCount`
   - `SUM(bills.grandTotal)` → `totalRevenue`
   - `SUM(bills.totalCgst)` → `totalCgst`
   - `SUM(bills.totalSgst)` → `totalSgst`
   - `SUM(bills.totalGst)` → `totalGst`
5. Return aggregated values serialized as strings

**File:** `app/api/dashboard/summary/route.ts`

---

#### `GET /api/dashboard/by-outlet`

Returns per-outlet sales breakdown. One row per outlet.

**Auth:** `admin` or `manager`
**Query params:** `dateFrom`, `dateTo`

**Logic:**

1. Resolve auth — return 403 if Outlet
2. Group bills by `outletId` where `status = 'printed'`
3. For each outlet return: `outletId`, `outletName`, `billCount`, `totalRevenue`, `totalCgst`, `totalSgst`, `totalGst`
4. Order by `totalRevenue desc`

**File:** `app/api/dashboard/by-outlet/route.ts`

---

#### `GET /api/dashboard/payment-modes`

Returns payment mode breakdown — total amount per mode.

**Auth:** `admin` or `manager`
**Query params:** `outletId` (optional), `dateFrom`, `dateTo`

**Logic:**

1. Resolve auth — return 403 if Outlet
2. Join `bill_payments` to `bills` where `bills.status = 'printed'`
3. Apply outlet and date filters
4. Group by `mode`
5. Return: `mode`, `totalAmount`, `transactionCount` per mode

**File:** `app/api/dashboard/payment-modes/route.ts`

---

#### `GET /api/dashboard/gst-by-slab`

Returns GST collected grouped by slab. Used for filing reference.

**Auth:** `admin` or `manager`
**Query params:** `outletId` (optional), `dateFrom`, `dateTo`

**Logic:**

1. Resolve auth — return 403 if Outlet
2. Join `bill_line_items` to `bills` where `bills.status = 'printed'`
3. Apply outlet and date filters
4. Group by `gstRate`
5. Return per slab: `gstRate`, `taxableValue`, `cgst`, `sgst`, `totalGst`

**File:** `app/api/dashboard/gst-by-slab/route.ts`

---

#### `GET /api/dashboard/Outlet-summary`

Returns a Outlet's daily sales summary broken down by payment mode.
Used on the Outlet's summary page.

**Auth:** `Outlet` only

**Query params:** `dateFrom`, `dateTo`

**Logic:**

1. Resolve auth — return 403 if not Outlet
2. Scope all queries to `user.outletId` — ignore any outlet param in query
3. Group `bill_payments` by `DATE(completedAt)` and `mode`
4. Return daily breakdown: `date`, `mode`, `totalAmount`, `transactionCount`

**File:** `app/api/dashboard/Outlet-summary/route.ts`

---

## Complete Route File Map

```
app/api/
â”œ── auth/
â”‚   â””── sync/route.ts                           POST
â”œ── outlets/
â”‚   â”œ── route.ts                                GET, POST
â”‚   â””── [id]/route.ts                           GET, PATCH
â”œ── users/
â”‚   â”œ── route.ts                                GET, POST
â”‚   â””── [id]/route.ts                           GET, PATCH
â”œ── menu/
â”‚   â”œ── categories/
â”‚   â”‚   â”œ── route.ts                            GET, POST
â”‚   â”‚   â””── [id]/route.ts                       PATCH
â”‚   â””── items/
â”‚       â”œ── route.ts                            GET, POST
â”‚       â””── [id]/route.ts                       GET, PATCH
â”œ── bills/
â”‚   â”œ── route.ts                                GET, POST
â”‚   â””── [id]/
â”‚       â”œ── route.ts                            GET, PATCH
â”‚       â”œ── complete/route.ts                   POST
â”‚       â”œ── cancel/route.ts                     POST
â”‚       â”œ── items/
â”‚       â”‚   â”œ── route.ts                        POST
â”‚       â”‚   â””── [itemId]/route.ts               PATCH, DELETE
â”‚       â””── payments/
â”‚           â”œ── route.ts                        GET, POST
â”‚           â””── [paymentId]/route.ts            DELETE
â””── dashboard/
    â”œ── summary/route.ts                        GET
    â”œ── by-outlet/route.ts                      GET
    â”œ── payment-modes/route.ts                  GET
    â”œ── gst-by-slab/route.ts                    GET
    â””── Outlet-summary/route.ts                GET
```

---

## Verification Checklist

Before marking this unit complete:

**Lib files**

- [ ] `lib/db.ts` — Prisma singleton created
- [ ] `lib/auth.ts` — `getCurrentUser` and `requireAuth` implemented
- [ ] `lib/gst.ts` — `computeLineItem` and `computeBillTotals` implemented
- [ ] `lib/bill-number.ts` — sequential generator with `SELECT FOR UPDATE` implemented
- [ ] `lib/validators/index.ts` — all Zod schemas present

**Route coverage**

- [ ] All 9 route groups implemented
- [ ] Every route follows: validate → auth → permission → logic
- [ ] No business logic in route files — all logic in `lib/`

**Auth & security**

- [ ] No route reads `outletId` from request to scope a Outlet
- [ ] `POST /api/users` rejects `role === 'admin'` with 403
- [ ] `POST /api/bills` and `POST /api/bills/[id]/complete` return 403 for non-Outlets
- [ ] `POST /api/bills/[id]/cancel` allows Outlet, manager, admin

**Billing invariants**

- [ ] Line items snapshot all values at write time — no JOIN to `menu_items` for prices
- [ ] `POST /api/bills/[id]/complete` recomputes totals server-side and discards client totals
- [ ] `POST /api/bills/[id]/complete` validates payment total === grand total (422 on mismatch)
- [ ] `PATCH /api/bills/[id]` returns 409 if bill is not draft
- [ ] No `DELETE` on `bills`, `bill_line_items`, or `bill_payments` tables

**Response shape**

- [ ] All success responses return `{ data: T }`
- [ ] All error responses return `{ error: { code: string; message: string } }`
- [ ] All Decimal fields serialized to `string` in responses
- [ ] Correct HTTP status codes on all outcomes

**GST**

- [ ] No GST arithmetic exists outside `lib/gst.ts`
- [ ] `computeLineItem` called on every line item creation and quantity update
- [ ] `computeBillTotals` called on bill completion
