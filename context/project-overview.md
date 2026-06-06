# Project Overview — Multi-Outlet Billing System (V1)

## Overview

This application is a centralized, web-based billing system for a single retail company operating across 2–5 physical outlets. There is no public signup — the system has one pre-seeded admin account, and all users/outlets are created by that admin. Outlets act as authenticated entities that log into the POS to create GST-compliant invoices for walk-in customers, optionally capture customer name and phone number, collect payments across multiple modes (cash, UPI, card) including split payments on a single bill, and close transactions at the counter. Admins and managers view consolidated and per-outlet sales data, GST summaries, and payment breakdowns from a shared dashboard. Each outlet has its own independent menu managed by admins or managers from within that outlet's context.

---

## Goals

1. Replace manual or disconnected billing processes at each outlet with a single, centralized web application.
2. Enable outlets to generate accurate, GST-compliant bills in under 2 minutes per transaction.
3. Support multi-mode and split payments (cash + UPI + card) on a single bill without manual reconciliation errors.
4. Optionally capture customer name and phone number on each bill and store it permanently in the database.
5. Give the admin and managers a consolidated and per-outlet view of sales, revenue, and GST collected across all outlets.
6. Enforce strict access — Outlets log into the POS to bill; only admin can create users and outlets.
7. Store a permanent, immutable audit trail of every bill and payment that satisfies GST filing requirements.
8. Build a clean, extensible data model in V1 that can support discounts, loyalty, and inventory in future versions without schema rewrites.

---

## Core User Flow (Outlet POS)

1. **Outlet logs in** via Clerk-authenticated email/password.
2. **Outlet opens a new bill** — the system assigns a unique bill number (e.g. `OTL2-2025-00043`) and sets status to `draft`.
3. **Outlet adds items** from its menu by searching by name or category. Each line item shows: item name, unit, base price (excl. GST), GST rate, and line total (incl. GST).
4. **Outlet optionally enters customer name and phone number.** These fields are not required — the bill can be completed without them.
5. **Bill summary updates in real time** showing subtotal, GST breakdown by slab (0%, 5%, 18%, 28%), CGST + SGST split, and grand total.
6. **Outlet selects payment mode(s).** For split payment, it enters the amount per mode (cash + UPI + card). The system validates that the sum equals the grand total before allowing completion.
7. **Outlet completes the bill.** Status changes from `draft` to `printed`, `completed_at` timestamp is recorded, and the bill becomes immutable.
8. **Bill is viewable** at the POS for reference. No physical print or digital delivery in V1.
9. **Outlet can cancel a printed bill.** Status changes from `printed` to `cancelled`, `cancelled_at` timestamp is recorded. No other field is modified. Cancelled bills remain in the database permanently.
10. **Outlet can view previous bills** filtered by date, customer name, phone number, bill status, payment mode, and bill number. A separate summary page shows total sales breakdown by payment mode and day.

## Core User Flow (Admin / Manager — Dashboard)

1. **Admin or manager logs in** via Clerk and lands on the dashboard showing all outlets combined.
2. **Outlet selector at the top** allows switching to a specific outlet to view that outlet's sales detail, bill list, GST breakdown, and payment mode summary.
3. **Admin navigates to a specific outlet** and goes to that outlet's Menu section to view, add, edit, or deactivate menu items and categories.
4. **Admin navigates to Users** (admin only) to create a new manager, assign them a role, and activate their account.
5. **Admin navigates to Outlets** (admin only) to create a new outlet with name, email, password, address, state code, and GSTIN.

---

## Features

### Authentication & Access Control

- Clerk-based login (email + password) — no signup page exists anywhere in the application
- Single pre-seeded admin account — cannot be created via the UI
- Two user roles: `manager`, `admin`. Outlets are separate authenticated entities.
- Outlets are authenticated directly via Clerk to access their own POS and create/view bills.
- Managers can view all outlets, manage menus per outlet, but cannot create users or outlets
- Admin has all manager permissions plus: create/manage users, create/manage outlets
- Only authenticated Outlets can generate bills via the POS
- All access rules enforced server-side

### User Management (Admin only)

- Admin creates all user accounts (managers only) and outlet accounts
- Each user is assigned a role
- Users can be deactivated but never deleted

### Outlet Management (Admin only)

- Create and manage outlets with name, email, password, address, state code, and GSTIN
- Each outlet has an independent bill number sequence (format: `OTL{N}-{YYYY}-{SEQ}`)
- Outlets can be deactivated but never deleted

### Menu Management (Admin only)

- Menu is managed per outlet — admin navigates to a specific outlet first, then manages that outlet's menu
- Menu items belong to one category within an outlet
- Categories are created per outlet (e.g. "Beverages", "Snacks", "Main Course")
- Each menu item stores: name, SKU, base price (excl. GST), GST slab (0%, 5%, 18%, 28%), unit, category, and active status
- Items and categories are deactivated, never deleted, to preserve bill history

### Billing (POS — Outlet only)

- Outlet sees only its active menu items
- Create draft bills, add/remove line items, and complete bills at the counter
- Optionally capture customer name and phone number per bill
- Line item values (item name, price, GST rate) are snapshotted at time of billing — immune to future menu edits
- Real-time bill total: subtotal, per-slab GST, CGST + SGST split, grand total
- Bill status lifecycle: `draft` → `printed` → `cancelled`
- An Outlet can cancel a printed bill — status changes to `cancelled`, bill never deleted

### Payments

- Supports cash, UPI, card, and other modes
- Split payment: multiple payment rows per bill, each with mode and amount
- Sum of all payment rows must equal grand total — validated server-side before bill completion
- Payment rows are immutable once the bill is printed

### Bill History & POS Summary

- Outlet views all bills for itself filtered by: date range, customer name, customer phone, bill status, payment mode, and bill number
- Separate summary page: daily sales totals broken down by payment mode

### Dashboard (Admin + Manager)

- Default view: all outlets combined — total revenue, bill count, GST collected by slab, payment mode breakdown
- Outlet selector at the top to switch to a specific outlet's detail view
- Per-outlet view: same metrics scoped to that outlet, plus full bill list with all columns
- Filterable by date range

### GST Compliance

- GST rate stored per menu item, snapshotted per bill line item at billing time
- CGST + SGST split on all transactions (intra-state only in V1)
- Bill detail shows full GST breakdown by slab
- GST summary per outlet per day available for manual filing reference

---

## In Scope (V1)

- Single-company deployment with one pre-seeded admin account — no public signup
- Admin-managed user creation (managers only)
- Admin-managed outlet creation
- Multi-outlet setup (2–5 outlets) with per-outlet menus
- Per-outlet menu categories and items managed by admin
- Role-based access: `manager`, `admin`, plus authenticated `Outlet` entities
- Walk-in retail billing (Outlet only) with real-time GST computation
- Optional customer name and phone number capture per bill
- Multi-mode and split payment per bill (cash, UPI, card)
- GST-compliant bill records with CGST + SGST split (intra-state only)
- Bill-level discounts (percentage or fixed amount type, with reasons, stored and reported)
- Bill status lifecycle: `draft` → `printed` → `cancelled`
- Immutable bill records — no hard deletes on bills, line items, or payments
- Outlet POS bill history with filters and daily sales summary page
- Admin/manager dashboard with all-outlet and per-outlet views, outlet selector
- shadcn/ui component library
- Next.js full-stack application with Prisma ORM and Clerk auth
- PostgreSQL (Supabase or Neon)

---

## Out of Scope (V1)

- Public signup or self-registration of any kind
- Creating a second admin account via the UI
- Discounts of any kind except bill-level discounts (item-level, coupon codes, BOGO, manager overrides)
- Customer profiles and purchase history
- Loyalty/membership points
- Bill delivery via WhatsApp, SMS, or email
- Thermal receipt printing or PDF generation
- Returns and refunds tracked in the system (handled offline with cash at the POS)
- Inter-state transactions and IGST computation
- Inventory tracking and stock level management
- Purchase orders or supplier management
- Multi-currency or non-INR transactions
- GST return filing or e-invoicing (IRN / QR code generation)
- Mobile app (web only in V1)

---

## Success Criteria

V1 is complete and ready for use when all of the following are true:

1. **No signup page exists** — the only entry point is the login page; the admin account is pre-seeded in the database.
2. **Admin is the only user who can create users and outlets** — manager role and Outlets have no access to user or outlet creation endpoints.
3. **An Outlet can create, complete, and close a bill end-to-end** — from adding items to recording a split payment — in under 2 minutes without errors.
4. **Every completed bill stores a correct GST breakdown** — per-item slab applied, CGST + SGST computed accurately, totals matching the sum of line items to the paisa.
5. **Split payments are validated server-side** — the system rejects bill completion if the sum of payment rows does not equal the grand total.
6. **Customer name and phone number can be optionally captured** — fields save when provided; bills complete successfully without them.
7. **Role enforcement is airtight** — an Outlet cannot access another outlet's bills or the dashboard; admin/manager cannot create bills; enforced server-side.
8. **Menu is outlet-specific** — adding or editing a menu item in Outlet 1 has no effect on Outlet 2's menu.
9. **Bill history filters work correctly** — Outlet can filter by date, customer name, phone, status, payment mode, and bill number and get accurate results.
10. **Dashboard shows correct aggregates** — total revenue, bill count, GST by slab, and payment mode breakdown match the sum of `printed` bills in the database.
11. **Dashboard outlet selector works** — switching to a specific outlet scopes all metrics and bill list to that outlet only.
12. **Historical bills are immutable** — editing a menu item's price or GST rate after a bill is printed does not change any value on that bill.
13. **All bill numbers are unique and sequential per outlet** — no duplicates; format follows `OTL{N}-{YYYY}-{SEQ}`.
14. **Cancelled bills are permanently retained** — no bill, line item, or payment row can be hard-deleted from the database by any role.
