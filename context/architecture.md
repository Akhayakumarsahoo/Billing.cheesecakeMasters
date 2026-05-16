# Architecture — Multi-Outlet Billing System (V1)

---

## Stack Table

| Layer           | Technology                          | Role                                               |
| --------------- | ----------------------------------- | -------------------------------------------------- |
| Frontend        | Next.js 14 (App Router)             | UI rendering, routing, server components           |
| Backend         | Next.js API Routes (Route Handlers) | All business logic, validation, data access        |
| Auth            | Clerk                               | Authentication, session management, JWT issuance   |
| Database        | PostgreSQL (Supabase or Neon)       | All persistent application data                    |
| ORM             | Prisma                              | Type-safe DB queries, schema migrations            |
| UI Components   | shadcn/ui + Tailwind CSS            | Accessible component primitives, utility styling   |
| State (client)  | React state + SWR or React Query    | Local UI state, server data fetching and caching   |
| Hosting         | Vercel                              | Next.js deployment, serverless functions           |
| Background jobs | None (V1)                           | Dashboard aggregates computed via DB views on read |

---

## System Boundaries

Every folder owns exactly one concern. No folder reaches into another folder's data layer directly.

```
/
├── app/                          # Next.js App Router — pages and layouts only
│   ├── (auth)/                   # Login page only — no signup exists
│   ├── (cashier)/                # Cashier pages: new bill, bill history, daily summary
│   ├── (admin-manager)/          # Shared pages: dashboard, outlet detail, menu CRUD
│   └── (admin-only)/             # Admin-only pages: user management, outlet management
│
├── app/api/                      # Route Handlers — all server-side business logic
│   ├── auth/                     # Clerk webhook sync → upsert users table
│   ├── outlets/                  # CRUD for outlets (admin only)
│   ├── users/                    # CRUD for users (admin only)
│   ├── menu/
│   │   ├── categories/           # CRUD for menu categories per outlet
│   │   └── items/                # CRUD for menu items per outlet
│   ├── bills/                    # Create, add items, complete, cancel bills (cashier only)
│   ├── payments/                 # Add payment rows to a draft bill
│   └── dashboard/                # Aggregate queries for dashboard and cashier summary
│
├── lib/
│   ├── db.ts                     # Prisma client singleton
│   ├── auth.ts                   # Clerk currentUser() helper + role/outlet resolver
│   ├── gst.ts                    # GST computation: slab lookup, CGST/SGST split, line totals
│   ├── bill-number.ts            # Bill number generation (OTL{N}-{YYYY}-{SEQ})
│   └── validators/               # Zod schemas for all API request bodies
│
├── components/
│   ├── ui/                       # shadcn/ui primitives (Button, Input, Table, Badge, Select…)
│   ├── billing/                  # BillBuilder, LineItemRow, PaymentSplitForm, BillSummary
│   ├── menu/                     # MenuItemForm, CategoryList, MenuItemTable
│   ├── dashboard/                # SalesCard, GSTBreakdownTable, PaymentModeChart, OutletSelector
│   └── layout/                   # Sidebar, TopNav, OutletBadge, RoleGuard
│
├── prisma/
│   ├── schema.prisma             # Single source of truth for DB schema
│   ├── seed.ts                   # Seeds the one admin account — run once on deploy
│   └── migrations/               # Auto-generated migration files — never hand-edit
│
└── types/
    └── index.ts                  # Shared TypeScript types (Bill, LineItem, PaymentRow, etc.)
```

**Rule:** Pages (`app/`) contain zero business logic. They render components and call API routes. All logic lives in `app/api/` and `lib/`.

---

## Storage Model

### PostgreSQL — all persistent data

| Table             | What it stores                                                                            |
| ----------------- | ----------------------------------------------------------------------------------------- |
| `outlets`         | Name, address, state code, GSTIN, active status                                           |
| `users`           | Clerk user ID, name, email, role, assigned outlet (cashiers only)                         |
| `gst_slabs`       | Static lookup: 0%, 5%, 18%, 28%                                                           |
| `menu_categories` | Category name, outlet ID, active status                                                   |
| `menu_items`      | Name, SKU, base price, GST slab, unit, category, outlet, active status                    |
| `bills`           | Bill number, outlet, cashier, customer name/phone, status, snapshotted totals, timestamps |
| `bill_line_items` | Snapshotted item name/price/GST, quantity, computed line totals (CGST, SGST)              |
| `bill_payments`   | Payment mode, amount — multiple rows per bill for split payment                           |

### Seed Data

One admin account is created via `prisma/seed.ts` on first deploy. Credentials are set via environment variables (`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`). This script is idempotent — re-running it does not create duplicate records.

### File Storage — none in V1

No file uploads, images, or PDFs. If bill PDF export is added in a future version, use Supabase Storage or Vercel Blob.

### Client-side Cache — SWR / React Query

Short-lived cache for menu item search, bill history lists, and dashboard aggregates. Cache is treated as stale-on-focus. No sensitive data persisted to `localStorage` or `sessionStorage`.

### No Redis / external cache in V1

Dashboard aggregates served from PostgreSQL views at read time. At 2–5 outlets and retail-scale transaction volume, view query latency is acceptable without an additional cache layer.

---

## Auth and Access Model

### Authentication — Clerk

Clerk owns identity entirely: login, session tokens, password reset, JWT issuance. No signup flow exists — the login page is the only auth entry point. The application never stores passwords.

On first login, Clerk fires a webhook to `/api/auth/sync`. This endpoint upserts a row in `users` using `clerk_user_id` as the stable identifier.

### Per-Request Authorization — application layer

Every API route resolves identity and enforces access before touching the database:

```
Request → Clerk session verified → clerk_user_id extracted
       → users table lookup → role + outlet_id resolved
       → access check: does this role + outlet_id permit this operation?
       → proceed or return 403
```

Clerk tells the system **who** the user is. The `users` table tells the system **what they can do**.

### Role Permissions Matrix

| Permission                       | cashier         | manager          | admin                         |
| -------------------------------- | --------------- | ---------------- | ----------------------------- |
| Create / complete / cancel bills | Own outlet only | can cancel bills | can cancel bills              |
| View bill history                | Own outlet only | All outlets      | All outlets                   |
| View dashboard                   | Own outlet only | All outlets      | All outlets                   |
| CRUD menu items + categories     | ✗               | Per outlet       | Per outlet                    |
| Create / manage users            | ✗               | ✗                | ✓                             |
| Create / manage outlets          | ✗               | ✗                | ✓                             |
| Create second admin              | ✗               | ✗                | ✗ (UI blocked + API enforced) |

### Outlet Scoping

`outlet_id` is read from `users.outlet_id` using the authenticated `clerk_user_id`. No API route uses an `outlet_id` from the request body, query param, or URL to determine a cashier's outlet. A cashier cannot bill to a different outlet by crafting a request.

### Admin Uniqueness

There is exactly one admin. The seed script creates it. The user creation API enforces `role !== 'admin'` — no UI or API call can create a second admin account.

---

## AI and Background Tasks

### AI — None in V1

No AI or LLM features are in scope.

### Background Tasks — None in V1

No job queue, cron, or async worker. All operations are synchronous request/response.

Dashboard aggregates are computed from PostgreSQL views at read time. If outlet count or transaction volume grows significantly in future versions, pre-aggregated summary tables updated via a scheduled job (e.g. `pg_cron` or a Vercel cron route) should be evaluated.

---

## Invariants

Rules the codebase must never violate. These are hard constraints enforced at the API layer and schema level — not guidelines.

**1. No signup — ever.**
There is no signup endpoint, no signup page, and no code path that creates a user outside of the admin user-creation flow or the seed script. The Clerk dashboard must also be configured to disable public signups.

**2. Exactly one admin exists.**
The user creation API rejects any request where `role === 'admin'`. The seed script is the only mechanism that creates the admin account, and it is idempotent. No existing user's role may be elevated to `admin` via the API.

**3. Only cashiers can create and complete bills.**
The `POST /api/bills` and `POST /api/bills/[id]/complete` routes return 403 for any role other than `cashier`. This is enforced server-side regardless of what the UI shows.

**4. Completed bills are immutable.**
Once a bill's status is `printed`, no field on `bills`, `bill_line_items`, or `bill_payments` may be updated. Cancellation sets `status = 'cancelled'` and `cancelled_at` — nothing else changes. The API rejects any mutation on a non-draft bill with a 409 error.

**5. Line items snapshot at billing time — never recompute from menu_items.**
`item_name`, `base_price`, `gst_rate`, and all computed totals on `bill_line_items` are written once when the item is added. No query may JOIN `bill_line_items` to `menu_items` to derive a price. Historical bills are immune to menu changes.

**6. Bill totals are computed server-side — never trusted from the client.**
`subtotal`, `total_cgst`, `total_sgst`, `total_gst`, and `grand_total` on `bills` are computed in `lib/gst.ts` by summing `bill_line_items` at completion time. Any totals in the request body are ignored.

**7. Payment total must equal grand total before a bill can be printed.**
`POST /api/bills/[id]/complete` verifies `SUM(bill_payments.amount) = bills.grand_total` server-side before changing status. Mismatch returns 422.

**8. Bills, line items, and payments are never hard-deleted.**
No `DELETE` on `bills`, `bill_line_items`, or `bill_payments` — not even by admin. Cancellation is the only supported terminal state. This preserves the GST audit trail.

**9. A user's outlet scope comes from the database — never from the request.**
No API route reads `outlet_id` from a request body, query param, or URL segment to determine which outlet a cashier belongs to. It is always resolved from `users.outlet_id` via the authenticated `clerk_user_id`.

**10. GST computation lives in exactly one place.**
All GST calculations (slab lookup, CGST/SGST split, line total derivation) are performed exclusively in `lib/gst.ts`. No component, route, or query may inline GST arithmetic.
