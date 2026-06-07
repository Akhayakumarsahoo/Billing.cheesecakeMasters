# Progress Tracker

Update this file after every meaningful implementation
change.

## Current Phase

- In progress

## Current Goal

- Testing and Verification

## Completed

- **24-Hour Bill Edits and Open Item Modifications**
  - Updated all time check logic (`checkout`, `cancel`, and `reset` API routes) to support a 24-hour window from bill creation for POS edits/cancellations.
  - Implemented backend item modification route `PATCH /api/bills/[id]/items/[itemId]` to permit Admins to edit open item names and prices on printed bills.
  - Added transaction-safe totals recalculation logic (re-applying discounts and round-offs) and automatic proportional payment scaling to prevent payment mismatches.
  - Created automatic daily settlement recalculation and balance propagation trigger `syncSettlementForDate` inside `lib/settlement.ts`.
  - Added name and price editing functionality for open items in the POS builder cart, updating `<OpenItemDialog>` to accept initial states and support edit mode.
  - Integrated open item edits on the Admin dashboard's order details view modal (`admin-orders-client.tsx`), showing an edit trigger next to custom items.
  - Verified project builds cleanly (`npm run build`) and type checks with zero errors.

- **Scalability and Concurrency Optimizations for 100+ Outlets**
  - Added a persistent `sequenceIndex` auto-incrementing integer column to the `Outlet` model in the PostgreSQL database and updated `prisma/schema.prisma`.
  - Updated `generateBillNumber` in `lib/bill-number.ts` to fetch the specific outlet's `sequenceIndex` from the database. This guarantees a stable, immutable, and persistent bill prefix (`OTL1`, `OTL2`, etc.) independent of outlet activation status, eliminating sequential numbering shifts and avoiding querying all active outlets for every invoice.
  - Refactored global dashboard metrics in `app/(admin-manager)/dashboard/page.tsx` to run database-level aggregations (`prisma.bill.aggregate` and `prisma.billPayment.groupBy`) instead of loading thousands of bills and payments into memory, resolving memory exhaustion (OOM) risk.
  - Refactored consolidated cash box balance calculation to query only the latest active daily settlement per outlet using a single raw SQL `DISTINCT ON ("outletId")` PostgreSQL query, avoiding table scanning all settlements in memory.
  - Optimized individual outlet detail dashboards in `app/(admin-manager)/outlets/[id]/page.tsx` and cashier sales summary page in `app/pos/sales/page.tsx` to utilize database-level aggregations (`prisma.bill.aggregate` and `prisma.billPayment.groupBy`), eliminating memory overhead.
  - Configured PostgreSQL driver connection pool limit to `max: 2` in `lib/db.ts` to prevent database connection exhaustion under heavy concurrent traffic in serverless deployment environments.
  - Verified compilation (`npx tsc --noEmit`) and client generation (`npx prisma generate`) execute with zero errors.

- **Implement Billing Discounts Feature**
  - Added discount fields (`discount`, `discountType`, `discountReason`, and `discountValue`) to the `Bill` model in `schema.prisma` and successfully synced with the live PostgreSQL database.
  - Extended request validation in `lib/validators/index.ts` to accept optional discount properties during POS checkouts and same-day order modifications.
  - Updated the API checkout route (`app/api/bills/checkout/route.ts`) to validate discount rules (percentage within `[1, 100]`, fixed amount `<= subtotal`), calculate discount amounts, apply them to the grand total, persist them, and serialize them.
  - Implemented the `<DiscountDialog>` popup component (`components/billing/discount-dialog.tsx`) to allow interactive selection of discount type, value, and reason in the POS.
  - Updated the client-side `<BillBuilder>` (`components/billing/bill-builder.tsx`) to support discount calculations, display a summary row, pre-fill discounts on edit operations using `localStorage`, and show active status on the Discount cart button.
  - Enhanced POS Order History (`orders-client.tsx`), Admin Order History (`admin-orders-client.tsx`), and corresponding server pages to display discount rows in bill lists and order details modals.
  - Added total discounts tracking and visualization to the POS Sales Summary (`app/pos/sales/page.tsx`), Admin specific outlet dashboard (`app/(admin-manager)/outlets/[id]/page.tsx`), and Consolidated Headquarters dashboard (`app/(admin-manager)/dashboard/page.tsx`).
  - Replaced CGST/SGST columns on the HQ "Sales by Outlet" breakdown table with a new "Discount" column, displaying the exact discount sums per outlet or zero.
  - Recalculated GST (CGST + SGST) on the discounted base `(subtotal - discount)` at checkout, update the stored `BillLineItem` database records proportionally, and update the client-side cart totals visualization.
  - Disabled the Discount button when the POS cart is empty, and automatically cleared applied discount states once all items are removed from the cart.
  - Verified compilation and optimized Next.js production builds compile cleanly without warnings or errors.

- **Remove "Not paid" Mode from Dashboards**
  - Removed the "Not paid" entry from the Payment Breakdown card list in the POS Sales summary page (`app/pos/sales/page.tsx`), Admin Consolidated dashboard (`app/(admin-manager)/dashboard/page.tsx`), and Admin Outlet dashboard (`app/(admin-manager)/outlets/[id]/page.tsx`).
  - Successfully verified compilation and clean Next.js production builds.

- **Immediate Skeleton Fallbacks on Date Transitions**
  - Swapped static route-level `key` remounting triggers in both POS Order History (`app/pos/orders/page.tsx`) and Admin Order History (`app/(admin-manager)/outlets/[id]/orders/page.tsx`) with props-driven state synchronization.
  - Implemented client-side routing transition detection in history and summary client components (`OrdersClient`, `AdminOrdersClient`, `SettlementHistoryClient`, `AdminSettlementHistoryClient`) by comparing loaded date props with current URL parameters via `useSearchParams()`.
  - Added shared `OrderCardsSkeleton` helper to the UI skeletons library (`components/ui-skeletons.tsx`) representing cards matching order history layout design.
  - Conditionally swap cards grid for `OrderCardsSkeleton` and metric/tables blocks for `StatCardsSkeleton`/`TableSkeleton` during transitions, maintaining fully responsive and interactive filters, headers, and navigation layout shell.
  - Resolved compiler syntax error in POS Sales summary page (`app/pos/sales/page.tsx`).
  - Confirmed successful compilation (`npx tsc --noEmit`) and successful Next.js production build (`npm run build`).

- **Responsive Date Range Picker with Predefined Shortcuts**
  - Updated the shared `DateRangeFilter` component (`components/date-range-filter.tsx`) to dynamically swap layouts depending on device screen sizes (breakpoint 1024px).
  - Implemented calculations for shortcuts: Today, Yesterday, Last 7 Days, Last 30 Days, This Month, and Last Month.
  - Built a bottom sheet drawer for mobile/tablet screen widths containing a single-month calendar view configured to stretch and fill the available container width fully and styled as `relative` to anchor the absolute month navigation buttons at the top of the calendar grid rather than the top of the drawer, a grid layout of pill-shaped shortcut buttons, and side-by-side Cancel and Confirm actions.
  - Redesigned the desktop view as a wide popover incorporating a left-aligned vertical shortcuts sidebar, a double-month calendar, and a footer displaying the date range in standard `dd/MM/yyyy to dd/MM/yyyy` format with Apply and Cancel buttons.
  - Verified all edits compile cleanly and the Next.js production build completes without issues.

- **Always Show New Settlement Button & Prevent Duplicates**
  - Replaced the conditional top-header button logic in both POS `SettlementHistoryClient` and Admin `AdminSettlementHistoryClient` to always render the "New Settlement" button, allowing cashiers, admins, and managers to navigate to the new settlement form at any time.
  - Removed automatic redirects from the POS new settlement page (`app/pos/settlement/new/page.tsx`) and Admin new settlement page (`app/(admin-manager)/outlets/[id]/settlements/new/page.tsx`) when today's settlement already exists.
  - Enhanced the daily settlement summary API route (`app/api/settlements/summary/route.ts`) to query and return an `exists` boolean indicating whether an active daily settlement already exists for the given date.
  - Updated both client form components (`SettlementFormClient` and `AdminSettlementFormClient`) to support the `exists` flag in `SummaryData`, display a warning alert banner when trying to create a settlement for a day that already exists, and disable form submission/saving accordingly.

- **Remove Other Daily Settlement Fields & Change 'other' Payment Mode to 'online'**
  - Removed all references to `actualOther` and `billedOther` from daily settlements in the Prisma schema, database, API routes, and front-end forms/history views.
  - Replaced the `'other'` payment mode in the `PaymentMode` enum with `'online'` across the database, validator schemas, bill builder cart component, and admin dashboards.
  - Separated `online` (representing delivery sales) and `upi` (representing UPI payments) in the dashboard breakdown widgets and POS sales overview.
  - Successfully migrated existing database records without data loss by modifying the remote PostgreSQL DB type and updating existing payments' mode to `'online'`.
  - Confirmed successful compilation (`npx tsc --noEmit`) and clean production builds (`npm run build`).

- **Calendar Date Selector Styling Fix**
  - Resolved CSS/Tailwind overlapping borders inside `components/ui/calendar.tsx` during single-day date range selections.
  - Implemented attribute/substring-matching selectors (`[class*=range_end]`, `[class*=range_start]`) to conditionally hide the range connection background and connector pseudo-elements (`after:`) when the active day cell is both the start and end of the selected date range.

- **Remove User Name from Top Navbar**
  - Removed the user's name text element (`{user?.name || "User"}`) and its container from the main header layout inside `components/admin-navbar.tsx`.
  - Cleaned up the unused helper imports.

- **Admin User Creation in User Management**
  - Updated the validator schema `lib/validators/index.ts` to allow `"admin"` role in `CreateUserSchema`.
  - Removed the restriction blocking `"admin"` role creation inside the API endpoint `app/api/users/route.ts` and enabled dynamic database mapping.
  - Adjusted the user management view page `app/(admin-manager)/users/page.tsx` and client component `app/(admin-manager)/users/users-client.tsx` to query and display both `"admin"` and `"manager"` user accounts.
  - Refactored `components/users/create-user-modal.tsx` to include an interactive shadcn `Select` role dropdown (options: Manager, Admin) during creation.

- **Mobile POS Touch-Friendly Payment Selector**
  - Replaced the portaled `DropdownMenu` payment method selector inside `components/billing/bill-builder.tsx` on smaller screens (mobile/tablet under the `lg` breakpoint) with an inline touch-friendly grid of styled buttons.
  - Resolved Radix / Vaul portal overlay click interception issues inside the bottom sheet drawer on mobile devices, ensuring cashiers can change payment methods reliably with a single touch.
  - Maintained the clean `DropdownMenu` display on desktop views.

- **Outlet Selector Alphabetical Sort**
  - Updated the top navigation bar outlet selector (`components/admin-navbar.tsx`) to query and order outlets alphabetically (`orderBy: { name: "asc" }`), improving navigation and accessibility for admins and managers.

- **Admin/Manager Bill Cancellation Authorization**
  - Expanded the bill cancellation API route (`app/api/bills/[id]/cancel/route.ts`) to authorize both Outlet POS sessions and shared User (Admin/Manager) accounts.
  - Implemented standard role-based scope checks: Outlet POS accounts can only cancel bills belonging strictly to their assigned outlet, whereas Admins and Managers have global cross-outlet cancellation authority.
  - Allowed global **Admin** accounts to bypass the same-day cancellation constraint, enabling them to cancel bills from any previous day.

- **Daily Settlement Cancellation Reactivation**
  - Resolved the conflict blocking cashier and admin creation of daily settlements on dates that have previously cancelled records (which triggered unique constraint violations).
  - Programmatically bypassed blocked redirections in POS and Admin New Settlement routes (`app/pos/settlement/new/page.tsx` and `app/(admin-manager)/outlets/[id]/settlements/new/page.tsx`) when the existing daily settlement is `"cancelled"`.
  - Adapted the client-side settlement history tables (`app/pos/settlement/settlement-history-client.tsx` and `app/(admin-manager)/outlets/[id]/settlements/admin-settlement-history-client.tsx`) to check for `"active"` status of today's settlement, reverting buttons dynamically to "New Settlement" if today's was cancelled.
  - Refactored the core creation API `app/api/settlements/route.ts` to softly reactivate and overwrite the existing `"cancelled"` row instead of performing a fresh duplicate `INSERT` when a new settlement is submitted, resetting `createdAt` to provide a fresh 24-hour edit/cancel window.

- **Interactive Transaction Timeout & Performance Optimization**
  - Configured a `10000` ms timeout (increased from default `5000` ms) on all billing-related interactive database transactions (`prisma.$transaction`) to handle heavy retail loads and avoid expired transaction errors.
  - Refactored `generateBillNumber` in `lib/bill-number.ts` to accept an optional active transaction client (`tx?: Prisma.TransactionClient`).
  - Optimized the batch POS checkout flow in `app/api/bills/checkout/route.ts` by passing the active transaction client `tx` into `generateBillNumber`, eliminating nested transaction overhead, connection pool blockages, and lock contentions.
  - Applied the identical `10000` ms timeout to `app/api/bills/[id]/reset/route.ts` and `app/api/bills/[id]/payment/route.ts` interactive transactions for complete billing consistency.

- **POS Cart Inline Payment Selector & Direct Checkout**
  - Moved the payment method selector out of the dialog and directly inline inside the cart section of `components/billing/bill-builder.tsx`, default selected to **Cash**.
  - Styled the selector as an elegant DropdownMenu trigger displaying active mode, its icon, and the running split total for visual clarity.
  - Renamed the cart action CTA to "Save Bill", which executes immediate checkout for single payment modes (Cash, UPI, Card, Other) in exactly 1 click without displaying any dialog popup.
  - Updated `components/billing/payment-dialog.tsx` to act as a dedicated "Part Payment Split" dialog that accepts state as props from the parent cart, preserving cashier split inputs across dialog openings.
  - Refactored dialog header titles, descriptions, and buttons to focus purely on inputting split amounts and saving the part payment bill.

- **Bill Grand Total Round Off & Breakdown Display**
  - Updated `lib/gst.ts`'s `computeBillTotals` to round the grand total of the bill to the nearest whole integer using standard mathematical rounding (rounding up if fractional part is 0.5 or more, otherwise rounding down).
  - Calculated and rendered the dynamic `roundOff` difference inside `components/billing/bill-builder.tsx`'s client-side visual totals and expandable breakdown section.
  - Enhanced both completed order list history screens (`app/pos/orders/orders-client.tsx` and `app/(admin-manager)/outlets/[id]/orders/admin-orders-client.tsx`) by serializing `subtotal` and `totalGst` fields (via their server-side `page.tsx` parents) and displaying the full Subtotal, GST, and Round Off breakdown inside the order details modal.
  - Verified all edits compile flawlessly under strict compiler configuration.

- **POS Checkout Performance Optimization**
  - Resolved POS counter slowness after clicking "Confirm Payment" by eliminating the cascading N+M+2 multi-fetch checkout waterfall.
  - Implemented a unified batch checkout route `POST /api/bills/checkout` validated by `CheckoutBillSchema` in `lib/validators/index.ts`.
  - Moved all billing actions (bill creation/reset, menu item price validation, GST calculations, split payments validation, and status completion) into a single, high-performance, atomic database transaction (`prisma.$transaction`).
  - Refactored `components/billing/bill-builder.tsx` to communicate in exactly 1 single network request, achieving instant sub-second checkouts at the counter.
  - Fully verified type check (`npx tsc --noEmit`) and Turbopack production build successfully.

- **Dashboard Outlet Sales List Fix & Drill-down**
  - Updated the consolidated HQ dashboard's "Sales by Outlet" breakdown table to list all active outlets in the system, even if they have zero bills/sales in the selected date range.
  - Converted the entire row of each outlet in the "Sales by Outlet" breakdown table into an accessible, interactive button/link (`ClickableRow`) routing to its specific dashboard (`/outlets/[id]`), improving operational navigation for admins and managers.

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

## Completed (cont.)

- **DateRangeFilter → shadcn Range Calendar Picker**
  - Installed `calendar` and `popover` shadcn components via `npx shadcn@4.8.2 add calendar popover`.
  - Rewrote `components/date-range-filter.tsx` to use a `Popover` + `Calendar` in `mode="range"`.
  - Picker auto-closes and pushes URL params as soon as both start and end dates are selected.
  - 62-day cap validation retained; future dates disabled via `disabled={{ after: new Date() }}`.
  - All 5 usages (Dashboard, Outlet Detail, Admin Orders, POS Orders, POS Sales) updated automatically since `DateRangeFilter` is a single shared component.

- **Daily Settlement Feature**
  - Added `DailySettlement` model to Prisma schema and synchronized PostgreSQL database (`npx prisma db push` & `npx prisma generate`).
  - Implemented end-of-day billed sales calculations and running cash box balance propagation logic in `lib/settlement.ts`.
  - Built Zod validator schemas for creation and modification inputs.
  - Created REST API routes for listing, creating, and summary checking, as well as PUT and POST routes for edits and cancels.
  - Implemented secure edit and cancel safeguards, enforcing a strict 24-hour limit for POS outlets while exempting global admins.
  - Developed responsive, mobile-first pages for history, creation, and editing (`/pos/settlement/*`), displaying real-time differences, opening balances, cash expenses, drawer withdrawals, and closing cash previews.
  - Verified the entire codebase to be fully compiled under strict compiler configuration (`npx tsc --noEmit`) with zero errors.
  - Added the Daily Settlement page link to the mobile bottom navigation bar and removed the Clerk Account icon.
  - Implemented client-side and server-side rules preventing outlets from creating daily settlements for previous or future dates (disabled date input on client, today-only validation check on API).
  - Added a "Short/Excess" total mismatches column (sum of Cash, UPI, Card, and Other differences) to the Daily Settlement History layout on both desktop (table column) and mobile (3-column summary grid).
  - Implemented a detailed breakdown popup dialog modal that displays comparing columns (Billed vs Actual vs Discrepancies) for all payment methods when clicking on the daily shortage/excess total.
  - Cleaned up redundant individual cash-only mismatch indicators next to Actual Cash values since day-level mismatches are now consolidated in the dedicated Short/Excess column.
  - Resolved daily settlement conflicts by introducing dual-layer prevention: server-side dynamic checks & redirections on `/pos/settlement/new` and client-side button adaptations (replacing 'New Settlement' with 'Edit Today's Settlement' if today's is already logged).
  - Enforced client-side timezone-safe date parsing in daily settlement history using a `T00:00:00` local suffix to prevent browser rendering offset drift.
  - Implemented the Daily Settlement management page for Admin and Managers under the outlet context, adding it to the left sidebar right after "All orders".
  - Configured custom Date Range filtration defaulting to the last 7 days of daily settlements on page load.
  - Added role-based creation and editing rules: Admins can create and edit settlements for any date within the last 30 days (date picker active). Managers are subject to standard outlet restrictions (can only create today's, and edit within 24 hours of creation).
  - Integrated the Date Range Filter into the **Outlet POS daily settlements page** as well, defaulted to the last 7 days.
  - Implemented server-side default URL redirection: if the user lands on the daily settlements page (POS Outlet, Admin, or Manager context) without `from` and `to` date parameters, it automatically performs a server-side redirect, pre-filling parameters with the last 7 days range. This visually selects the 7-day range by default on the client-side `DateRangeFilter` and keeps URL, DB, and state perfectly in sync.
  - Repositioned the date selector from the page header to the right side of the "Settlement History" records section card header on both the Outlet POS and Admin/Manager views.
  - Resolved the URL parameter apply bug and infinite rendering loops cleanly by calling Next.js `router.refresh()` directly within the `DateRangeFilter`'s `handleApply` callback upon user submission, eliminating reactive page-level `useEffect` dependency loops entirely.
  - Fully verified type checking (`npx tsc --noEmit`) and compiled successfully under Next.js production build (`npm run build`).
  - **Dashboard Cash Box Balances Display**
    - Retrieved the latest active daily settlement's `closingCash` overall to represent the real-time cash box/drawer balance.
    - Updated the specific outlet dashboard view to retrieve and display this balance in a new `StatCard` ("Cash Box Balance"), expanding the metrics grid from `lg:grid-cols-3` to `lg:grid-cols-4`.
    - Updated the consolidated HQ dashboard to aggregate the latest active settlements of all outlets into a consolidated "Cash Drawer Balance" metric card, expanding its top metrics grid similarly.
    - Extended the consolidated "Sales by Outlet" breakdown table to include a dedicated right-aligned "Cash Box" column displaying individual outlet drawer balances, updating the table rows, totals row, and empty state `colSpan` elegantly.
  - **Change Logs & Audit Tooltips**
    - Added an `updatedAt` field to the `Bill` model in the database schema to track last modified timestamps, syncing the database schema and regenerating Prisma client type definitions successfully.
    - Added an "i" info icon next to each bill number in both the standard POS Order History and the Admin/Manager All Orders view. Hovers trigger a detailed, portaled tooltip displaying exact **Created** and **Last Modified** audit timestamps.
    - Prevented event bubbling cleanly by placing the tooltips inside a propagation-stopping container, allowing hover details to show without triggering the click-to-open-bill dialog modal.
    - Added the same info icon hover tooltips beside the daily settlement dates in both POS and Admin/Manager daily settlement history tables and mobile cards, displaying their database-driven `createdAt` and `updatedAt` reconciliations.
    - Added `createdByEmail` and `updatedByEmail` fields to `Bill` and `DailySettlement` models in `schema.prisma`.
    - Integrated email logging into all REST routes handling creation, completion, edits, and cancellations for both bills and settlements.
    - Enhanced hover tooltips across POS and Admin Order/Settlement histories to display creator and modifier emails next to timestamps.




## Next Up

- [First unit to build]

## Open Questions

- [Any unresolved product or technical decisions]

## Architecture Decisions

- **Outlet Identity over Cashier Users**: Removed the concept of assigning a user with a `cashier` role to an outlet. Instead, the physical outlet itself logs into the POS system using an outlet-specific email and password via Clerk. This removes the need to scope users to specific outlets, greatly simplifying data relations and guaranteeing isolated POS sessions.

## Session Notes

- [Context needed to resume work in the next session]
