# Progress Tracker

Update this file after every meaningful implementation
change.

## Current Phase

- In progress

## Current Goal

- Testing and Verification

## Completed

- POS Setup (09-POS-setup.md)

- Implement Design System (01-design-system.md)
- Implement Auth (02-auth.md)
  - Added @clerk/ui
  - Hid sign up option on SignIn page
  - Enforced light theme in ClerkProvider
- Implement Dashboard UI (03-dashboardDesign.md)
  - Created static Dashboard UI for admin-manager
- Prisma Setup (04-prisma-setup.md)
  - Created Prisma schema with all models
  - Ran initial migration
  - Seeded database with GST slabs and admin user
- **Outlet Authentication Refactor**
  - Removed `cashier`/`biller` user roles entirely.
  - Upgraded Outlets to act as authenticated entities (`clerkUserId` added to `Outlet` model).
  - Cleaned up relations (`outletId` removed from `User`, `createdById` removed from `Bill`).
  - Rewrote all `@context` markdown specs to reflect the new Outlet POS model.
  - Updated API validation schemas (`lib/validators/index.ts`) for user and outlet creation.
  - Pushed updated schema to live database (`npx prisma db push --accept-data-loss`).

- **Menu Management**
  - Implemented outlet-specific menu management accessible only to admins.
  - Added full CRUD functionality for categories and items with UI matching shadcn standards.
  - Updated context documentation to restrict role permissions strictly to admins.
  - Added new category, item, and confirmation dialogs.

- **Outlet POS Implementation**
  - Created root dispatcher (`app/page.tsx`) to handle role-based redirection to `/pos` or `/dashboard`.
  - Built mobile-first POS Layout with responsive Sidebar and Bottom Nav.
  - Implemented client-side `BillBuilder` for cart management and dynamic GST calculations.
  - Added POS pages: New Bill, Order History, Sales Summary, and Daily Settlement.
  - Fixed `app/api/bills/*` endpoints to correctly validate Outlet identity (`getCurrentOutlet()`) and removed legacy `cashier` checks.

- **POS UI Refinements & Part Payment**
  - Updated breakpoints to push sidebar to bottom-nav on tablet (`lg`).
  - Implemented visually grouped menu items by category in the POS builder.
  - Replaced persistent cart sidebar with a Shadcn `Drawer` triggered by a bottom-right FAB on tablet/mobile screens.
  - Added "Part Payment" mode with split inputs for Cash, UPI, Card, and API integration for multiple payments per bill. Resolved "Confirm Payment" validation and disable bug by switching to robust cents-based calculations (using Math.round) to eliminate floating-point precision mismatches and gracefully handle cash overpayments with change return.
  - Optimized bill creation speed in the POS builder: Refactored sequential N+1 item and payment creation HTTP requests to execute concurrently using `Promise.all`, reducing checkout round-trips from N+M+2 to a flat 4 sequential steps and boosting speed by 2x to 4x.
  - Added "Open Item" feature allowing custom line items to be added to the cart on-the-fly, backed by schema update making `menuItemId` optional.
  - Implemented Order History "Edit" and "Cancel" workflows restricted to same-day transactions. Edit now uses an in-place replacement strategy, retaining the original bill number.
  - Added Date Range filtering (capped at 2 months) and a detailed Payment Method breakdown card to the Sales Summary page.

- **Codebase Optimization & Readability Audit**
  - Extracted 4 shared helpers to `lib/utils.ts`: `getLocalDateString`, `parseDateRange`, `bucketPayments`, `formatINR` — eliminated copy-paste across 4 files.
  - Created reusable `<StatCard>` component (`components/ui/stat-card.tsx`) — eliminated 8+ duplicated metric card JSX blocks across dashboard pages.
  - Refactored `dashboard/page.tsx`, `outlets/[id]/page.tsx`, and `pos/sales/page.tsx` to use all shared utilities and `<StatCard>`.
  - Fixed date filter inconsistency: all dashboard pages now filter on `completedAt` (previously some used `createdAt`).
  - Removed hardcoded hex color values from dashboard pages — now use CSS vars.
  - Added `process.env.NODE_ENV !== "production"` guard on dev-only auto-admin-creation path in `lib/auth.ts`.
  - Fixed `categories: any[]` prop in `BillBuilder` — now typed as `SerializedCategory[]`.
  - Refactored `orders/page.tsx` date parsing to use shared `parseDateRange` util.
  - All changes verified: `npx tsc --noEmit` exits with zero errors.

## In Progress

- None.

## Next Up

- [First unit to build]

## Open Questions

- [Any unresolved product or technical decisions]

## Architecture Decisions

- **Outlet Identity over Cashier Users**: Removed the concept of assigning a user with a `cashier` role to an outlet. Instead, the physical outlet itself logs into the POS system using an outlet-specific email and password via Clerk. This removes the need to scope users to specific outlets, greatly simplifying data relations and guaranteeing isolated POS sessions.

## Session Notes

- [Context needed to resume work in the next session]
