# Code Standards — Multi-Outlet Billing System (V1)

These standards apply to every file in this codebase. They are not suggestions.
When in doubt, follow the pattern already established in the codebase — do not invent a new one.

---

## General

- **One purpose per module.** Every file does one thing. A component renders UI. A lib module encapsulates logic. An API route handles one endpoint. If you are unsure what a file does from its name alone, it is doing too much.
- **Fix root causes — never layer workarounds.** If something breaks, find why. Do not add a conditional, a try/catch, or a default value to paper over a bad assumption upstream.
- **Do not mix concerns in one file.** Business logic does not belong in components. Database queries do not belong in API routes — they belong in `lib/`. Styling does not belong in logic files.
- **Delete dead code immediately.** Commented-out code, unused imports, and unreachable branches are not kept "just in case". Use git history for that.
- **No premature abstraction.** Do not create a shared utility for something that exists in only one place. Abstract when the second real use case appears, not before.
- **Colocate what changes together.** Types, validators, and API routes for a feature live close to each other — not scattered across unrelated folders.

---

## TypeScript

- **Strict mode is required.** `tsconfig.json` must have `"strict": true`. No exceptions.
- **No `any`.** If the type is unknown, use `unknown` and narrow it explicitly. If a third-party library forces `any`, isolate it behind a typed wrapper and add a comment explaining why.
- **Name types clearly and specifically.** Use `Bill`, `BillLineItem`, `MenuCategory` — not `Data`, `Item`, `Obj`, or `Res`.
- **Use `type` for data shapes, `interface` for objects that may be extended.** Be consistent within a feature — do not mix arbitrarily.
- **Validate all external input with Zod at system boundaries.** Request bodies, query params, and webhook payloads are `unknown` until parsed by a Zod schema in `lib/validators/`. Never trust the shape of external data.
- **Derive types from Zod schemas.** Use `z.infer<typeof MySchema>` — do not write a duplicate `type` that mirrors a Zod schema by hand.
- **No type assertions (`as X`) except at validated boundaries.** If you find yourself writing `as Bill`, it is a sign something upstream is not typed correctly.
- **Enums are defined in the database and mirrored in TypeScript.** `bill_status`, `user_role`, and `payment_mode` are defined in the DB schema and re-exported from `types/index.ts`. Do not redefine them inline in components.
- **All monetary values are `string` when returned from the API.** Prisma returns `Decimal` — serialize to `string` before sending to the client. Never use `number` for money.

---

## Next.js

- **Default to Server Components.** Every component is a Server Component unless it explicitly needs browser interactivity (event handlers, `useState`, `useEffect`). Do not add `'use client'` out of habit.
- **Add `'use client'` only when required.** Valid reasons: onClick handlers, controlled inputs, client-side state, browser APIs. Fetching data is not a reason — use Server Components or Route Handlers for that.
- **Pages contain no logic.** Files inside `app/` import components and pass props. They do not contain `if` statements, data transformations, or business rules.
- **Data fetching in Server Components uses `fetch` or Prisma directly — not client-side hooks.** Client-side fetching (SWR / React Query) is reserved for data that must update without a page reload (e.g. live bill builder state).
- **Route groups enforce access.** `(cashier)/`, `(admin-manager)/`, and `(admin-only)/` each have a layout that checks the role server-side and redirects on mismatch. Role checks are never done only in the UI.
- **Keep route handlers small.** A route handler does four things in order: parse + validate input, resolve auth, call a `lib/` function, return a response. If the handler is longer than ~40 lines, the logic belongs in `lib/`.
- **Never call Prisma directly from a component.** All DB access goes through `app/api/` route handlers or Server Actions — never imported directly into a component file.
- **Loading and error states are explicit.** Every page that fetches data has a `loading.tsx` and an `error.tsx` sibling. Do not leave these implicit.

---

## Styling

- **shadcn/ui is the component baseline.** Use shadcn primitives (`Button`, `Input`, `Table`, `Badge`, `Select`, `Dialog`, etc.) before writing any custom component. Customize via Tailwind variants — do not override shadcn internals.
- **Tailwind utility classes only — no inline `style` props.** The only exception is dynamic values that cannot be expressed as Tailwind classes (e.g. a calculated pixel width). Document why when you do this.
- **No hardcoded color values.** Use Tailwind semantic tokens (`bg-primary`, `text-muted-foreground`, `border-destructive`) from the shadcn/ui theme. Do not write `text-[#e74c3c]` or `bg-gray-500`.
- **No custom CSS files except `globals.css`.** All spacing, color, radius, and typography comes from Tailwind. If you are reaching for a `.css` file, you are solving the wrong problem.
- **Responsive design is mobile-first.** Write base styles for small screens, add `md:` and `lg:` breakpoints on top. Do not write desktop-first styles and override down.
- **Status badges use consistent colors across the app.** `draft` = gray, `printed` = green, `cancelled` = red. These are defined once in `components/ui/BillStatusBadge.tsx` and used everywhere — not re-implemented per page.

---

## API Routes

- **Every route follows the same four-step order:**
  1. Parse and validate request input (Zod)
  2. Resolve auth — get role and outlet from the DB via `clerk_user_id`
  3. Check permissions — return 403 if the role is not allowed
  4. Execute business logic via a `lib/` function and return the response

- **Auth and ownership are checked before any mutation.** A route must not touch the database for writes until it has confirmed the caller has permission.

- **Return consistent response shapes.** All success responses follow:

  ```ts
  {
    data: T;
  }
  ```

  All error responses follow:

  ```ts
  {
    error: {
      code: string;
      message: string;
    }
  }
  ```

  Never return a raw string, a bare array, or an inconsistent shape.

- **Use correct HTTP status codes.**
  - `200` — success (GET, PATCH, DELETE)
  - `201` — created (POST)
  - `400` — bad request / validation failure
  - `401` — not authenticated
  - `403` — authenticated but not authorized
  - `404` — resource not found
  - `409` — conflict (e.g. mutating a printed bill)
  - `422` — business rule violation (e.g. payment total mismatch)

- **No business logic in route handlers.** Calculations, GST computation, bill number generation, and total validation live in `lib/`. Route handlers call `lib/` functions — they do not inline logic.

- **Outlet ID is never read from the request for scoping.** For cashier routes, `outlet_id` is always resolved from `users.outlet_id` via the authenticated session. Reading it from `req.body` or query params for access control purposes is forbidden.

- **All monetary values sent to the client are serialized as strings.** Prisma `Decimal` → `.toString()` before inclusion in any response.

---

## Data and Storage

- **All persistent data lives in PostgreSQL.** There is no file storage, no blob store, and no external data service in V1.
- **Monetary values are stored as `NUMERIC(12,2)`.** Never `FLOAT`, never `DOUBLE PRECISION`, never `INTEGER` with implicit paise scaling.
- **Bill line items snapshot at write time.** `item_name`, `base_price`, `gst_rate`, and all computed totals are written once when the item is added to the bill. No subsequent read of `menu_items` may be used to reconstruct or update these values.
- **No hard deletes on transactional records.** `bills`, `bill_line_items`, and `bill_payments` are never deleted. Catalog records (`outlets`, `users`, `menu_items`, `menu_categories`) are deactivated via `is_active = false`.
- **Totals are always recomputed server-side.** Totals submitted in request bodies are discarded. The server computes `subtotal`, `total_cgst`, `total_sgst`, `total_gst`, and `grand_total` from `bill_line_items` via `lib/gst.ts` before writing to the DB.
- **GST logic lives exclusively in `lib/gst.ts`.** No component, route handler, or Prisma query may inline GST arithmetic. Import from `lib/gst.ts` or do not compute it at all.
- **Use Prisma for all database access.** Raw SQL is allowed only in `lib/db.ts` for cases Prisma cannot express (e.g. `SELECT FOR UPDATE` on bill sequences). Document raw SQL with a comment explaining why.

---

## File Organization

- `app/(auth)/` — Login page only. No signup. No registration flow.
- `app/(cashier)/` — All cashier-facing pages: new bill, bill history, daily summary. Scoped to one outlet.
- `app/(admin-manager)/` — Pages shared by admin and manager: dashboard, outlet detail view, menu CRUD.
- `app/(admin-only)/` — Admin-exclusive pages: user management, outlet creation. Middleware redirects non-admins.
- `app/api/` — All Route Handlers. One folder per resource (`bills/`, `menu/`, `users/`, `outlets/`, `dashboard/`). No business logic — delegates to `lib/`.
- `lib/` — All business logic, utilities, and shared server-side code. Every export is a pure function where possible.
- `lib/validators/` — Zod schemas for every API request body and query param. Named exports only. Schema name matches route: `CreateBillSchema`, `CompleteBillSchema`, `CreateMenuItemSchema`.
- `lib/gst.ts` — Single source of truth for all GST computation. Exports: `computeLineItem()`, `computeBillTotals()`.
- `lib/bill-number.ts` — Bill number generation logic. Handles `SELECT FOR UPDATE` on `bill_sequences`.
- `lib/auth.ts` — `getCurrentUser()` helper that resolves Clerk session → DB user row with role and outlet.
- `components/ui/` — shadcn/ui primitives only. No feature-specific logic.
- `components/billing/` — Components used in the POS flow: `BillBuilder`, `LineItemRow`, `PaymentSplitForm`, `BillSummary`, `BillStatusBadge`.
- `components/menu/` — Menu management components: `MenuItemForm`, `CategoryList`, `MenuItemTable`.
- `components/dashboard/` — Dashboard components: `SalesCard`, `GSTBreakdownTable`, `PaymentModeChart`, `OutletSelector`.
- `components/layout/` — App shell: `Sidebar`, `TopNav`, `OutletBadge`, `RoleGuard`.
- `prisma/schema.prisma` — Single source of truth for the DB schema. Never edited to match the app — the app is edited to match the schema.
- `prisma/seed.ts` — Seeds the admin account. Idempotent. Uses `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` env vars.
- `types/index.ts` — Shared TypeScript types. Derived from Prisma's generated types where possible. No duplication.

---

## Naming Conventions

| Thing              | Convention                   | Example                                  |
| ------------------ | ---------------------------- | ---------------------------------------- |
| Components         | PascalCase                   | `BillBuilder.tsx`, `OutletSelector.tsx`  |
| Hooks              | camelCase with `use` prefix  | `useBillBuilder.ts`, `useCurrentUser.ts` |
| Lib functions      | camelCase                    | `computeLineItem()`, `getBillNumber()`   |
| API route files    | Next.js convention           | `app/api/bills/[id]/route.ts`            |
| Zod schemas        | PascalCase + `Schema` suffix | `CreateBillSchema`, `CompleteBillSchema` |
| Inferred Zod types | PascalCase + `Input` suffix  | `CreateBillInput`, `CompleteBillInput`   |
| DB column names    | snake_case                   | `outlet_id`, `grand_total`, `created_at` |
| TypeScript types   | PascalCase                   | `Bill`, `BillLineItem`, `MenuCategory`   |
| Env variables      | SCREAMING_SNAKE_CASE         | `SEED_ADMIN_EMAIL`, `DATABASE_URL`       |

---

## Environment Variables

- All environment variables are declared in `.env.example` with placeholder values and a one-line comment explaining each.
- `.env.local` is never committed to version control.
- Server-only secrets (database URL, Clerk secret key, seed credentials) are never prefixed with `NEXT_PUBLIC_`.
- Client-accessible variables (Clerk publishable key) use the `NEXT_PUBLIC_` prefix and contain no secrets.
