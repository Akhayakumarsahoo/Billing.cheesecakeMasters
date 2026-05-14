# Project Overview — Multi-Outlet Billing System (V1)

## Overview

This application is a centralized, web-based billing system for a retail business operating across 2–5 physical outlets. It enables cashiers to create GST-compliant invoices for walk-in customers, collect payments across multiple modes (cash, UPI, card) including split payments on a single bill, capture customer detail like name and phone number and close transactions at the counter. Managers can oversee outlet-level activity, and accountants and admins can view consolidated sales data, GST summaries, and payment breakdowns across all outlets from a single HQ dashboard — updated within minutes of each transaction.

---

## Goals

1. Replace manual or disconnected billing processes at each outlet with a single, centralized web application.
2. Enable cashiers to generate accurate, GST-compliant bills in under 2 minutes per transaction.
3. Support multi-mode and split payments (cash + UPI + card) on a single bill without manual reconciliation errors.
4. Capture customer detail like name and phone number and store it with the bill in database.
5. Give the business owner and accountants a real-time consolidated view of sales, revenue, and GST collected across all outlets.
6. Enforce role-based access so cashiers can only operate within their assigned outlet, while admins and accountants have cross-outlet visibility.
7. Store a permanent, immutable audit trail of every bill and payment that satisfies GST filing requirements.
8. Build a clean, extensible data model in Phase 1 that can support discounts, loyalty, and inventory in future phases without schema rewrites.

---

## Core User Flow (Cashier at Outlet)

1. **Cashier logs in** via Clerk-authenticated email/password and is automatically scoped to their assigned outlet.
2. **Cashier opens a new bill** — the system assigns a unique bill number (e.g. `OTL2-2025-00043`) and sets status to `draft`.
3. **Cashier adds products** by searching by name or SKU. Each line item shows: product name, unit, base price (excl. GST), GST rate, and line total (incl. GST).
4. **Bill summary updates in real time** showing subtotal, GST breakdown by slab (0%, 5%, 18%, 28%), CGST + SGST split (or IGST for inter-state), and grand total. Optionally customer details like name and phone number are captured.
5. **Cashier selects payment mode(s).** For split payment, they enter the amount per mode (cash + UPI + card). The system validates that the sum equals the grand total before allowing completion.
6. **Cashier completes the bill.** Status changes from `draft` to `printed`, `completed_at` timestamp is recorded, and the bill becomes immutable.
7. **Bill is viewable** by the cashier for reference. No physical print or digital delivery in version 1.
8. cashier can cancel the bill after bill is printed. In that case, the bill status changes from `printed` to `cancelled`, `cancelled_at` timestamp is recorded, and the bill becomes immutable.
9. cashier can see their previous bills by filtering on date, customer name, phone number, bill status, payment mode, and bill number. There will be a page where they can see the total sales breakdown by payment mode and day.
10. **HQ dashboard updates** within a few minutes to reflect the new transaction in outlet-level and consolidated totals.

---

## Features

### Authentication & Access Control
- Clerk-based login (email + password)
- Three roles: `cashier`, `manager`, `admin`
- Cashiers are assigned to a single outlet; manager and admins have cross-outlet read access
- All API routes enforce role + outlet scope server-side

### Management
- Only admins can create and manage outlets with name, address, state code, and GSTIN
- Each outlet has an independent bill number sequence

### Product Catalog
- Only admins can add, edit, and deactivate products per outlet (or shared across outlets)
- Each product stores: name, SKU, base price (excl. GST), GST slab (0/5/18/28%), and unit
- Products are not deleted — only deactivated to preserve bill history

### Billing (POS)
- Create draft bills, add/remove line items, and complete bills at the counter
- Line item values (price, GST rate, name) are snapshotted at time of billing — immune to future product edits
- Real-time bill total computation: subtotal, per-slab GST, CGST/SGST, grand total
- Bill cancellation allowed for every one. but it can not be deleted from database, only status changes from `printed` to `cancelled`.
- Cashier can see previous bills by filtering on date, customer name, phone number, bill status, payment mode, and bill number. There  will be also a page where they can see the total sales breakdown by payment mode and day.

### Payments
- Supports cash, UPI, card, and other modes
- Split payment: multiple payment rows per bill, each with mode, amount
- System validates payment total equals grand total before bill completion

### GST Compliance
- Per-item GST rate applied at billing time
- CGST + SGST split for intra-state transactions;
- Bill detail view shows full GST breakdown by slab
- GST summary view per outlet per day for filing

### HQ Dashboard
- Consolidated view across all outlets, updated within ~5 minutes
- Metrics: total revenue today, bill count, GST collected (by slab), payment mode breakdown
- Filterable by outlet and date range
- Can also see bill list with all the columns for each outlets.

## In Scope (V1)

- Multi-outlet setup with outlet-level product catalogs
- Role-based user management via Clerk (cashier, manager, accountant, admin)
- Walk-in retail billing with line items and real-time GST computation
- Multi-mode and split payment per bill
- GST-compliant bill records with CGST/SGST 
- Draft bill cancellation
- HQ consolidated dashboard (total sales, per-outlet breakdown, GST by slab, payment mode summary)
- PostgreSQL schema with views for all dashboard queries
- Next.js full-stack application with API routes for all billing operations

---

## Out of Scope (Phase 1)

- Discounts of any kind (item-level, bill-level, coupon codes, BOGO, manager overrides)
- Customer profiles, purchase history, and loyalty/membership points
- Bill delivery via WhatsApp, SMS, or email
- Thermal receipt printing
- Returns and refunds tracked in the system (cashier handles offline with cash)
- Inventory tracking and stock level management
- Purchase orders or supplier management
- Multi-currency or non-INR transactions
- GST return filing or e-invoicing (IRN/QR code generation)
- Mobile app (web only in Phase 1)

---

## Success Criteria

Phase 1 is complete and ready for use when all of the following are true:

1. **A cashier can create, complete, and close a bill end-to-end** — from adding products to recording a split payment — in under 2 minutes without errors.
2. **Every completed bill stores a correct GST breakdown** — per-item slab applied, CGST + SGST computed accurately, totals matching the sum of line items.
3. **Split payments are validated** — the system rejects bill completion if the sum of payment rows does not equal the grand total.
4. **Optional fields for customer details like name and phone number are captured** — the system allows to add these fields for each bill.
4. **Role enforcement is airtight** — a cashier logged into Outlet 2 cannot read, create, or modify bills for Outlet 1; all access control is enforced server-side.
5. **HQ dashboard shows correct aggregates** — total revenue, bill count, GST by slab, and payment mode breakdown match the sum of completed bills in the database.
6. **Dashboard lag is under 5 minutes** — a bill completed at an outlet appears in the HQ consolidated view within 5 minutes.
7. **Historical bills are immutable** — editing a product's price or GST rate after a bill is completed does not change any value on that bill.
8. **All bill numbers are unique and sequential** — no duplicates across the same outlet; format follows `OTL{N}-{YYYY}-{SEQ}`.