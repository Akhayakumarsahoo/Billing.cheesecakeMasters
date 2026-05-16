# Unit 01 — Dashboard Page (Static UI)

## What You Are Building

A static `/` (root) dashboard page for the admin/manager role.
This page shows a sales summary across all outlets with the ability to filter by outlet and date range.
No real data. No API calls. No auth checks. Static UI only — hardcode all values.

---

## Scope

**In scope for this unit:**

- Top navbar
- Left sidebar with navigation
- Outlet selector (dropdown)
- Date range selector
- Sales summary metric cards (static numbers)
- Sales breakdown table (static rows)
- Payment mode summary (static)

**Out of scope for this unit:**

- Real data fetching
- Clerk auth
- Route protection
- Chart/graph components
- Mobile layout (desktop only for this role)
- Any API route

---

## File to Create

```
app/(admin-manager)/page.tsx
```

This is the only file to create. Do not create layout files, API routes, or lib functions in this unit.

---

## Tech Stack for This Unit

- Next.js 14 App Router
- shadcn/ui components
- Tailwind CSS
- Lucide React icons
- All values hardcoded — no `useState`, no `useEffect`, no data fetching

---

## Page Structure

The page has three regions:

```
┌─────────────────────────────────────────────────────────┐
│  TOP NAVBAR                                             │
├───────────────┬─────────────────────────────────────────┤
│               │  OUTLET SELECTOR + DATE RANGE           │
│   SIDEBAR     ├─────────────────────────────────────────┤
│               │  METRIC CARDS (3 columns)               │
│               ├─────────────────────────────────────────┤
│               │  SALES BY OUTLET TABLE                  │
│               ├─────────────────────────────────────────┤
│               │  PAYMENT MODE SUMMARY                   │
└───────────────┴─────────────────────────────────────────┘
```

---

## Top Navbar

**Height:** 56px
**Background:** `--bg-surface` (`#FFFFFF`)
**Border:** `--border-default` (`#E2E1DD`) bottom border

**Left side:**

- Company logo area: a plain text logotype — render the text **"BillFlow"** in `font-mono`, `font-semibold`, `text-lg`, color `--text-primary`
- Add a small filled square `■` in black before the text as a logo mark

**Right side:**

- A placeholder button that looks like a Clerk `<UserButton />` — render a circular avatar `div`, 32px, background `#E8E7E4`, with initials **"AD"** in `text-xs font-medium`
- Label next to it: `"Admin"` in `text-sm text-muted-foreground`

---

## Sidebar

**Width:** 240px fixed
**Background:** `--bg-surface` (`#FFFFFF`)
**Border:** `--border-default` (`#E2E1DD`) right border
**Height:** Full viewport height minus navbar (use `calc(100vh - 56px)`)

**Navigation items** — use Lucide icons, `h-4 w-4`, `strokeWidth={1.5}`:

| Label     | Icon              | State                 |
| --------- | ----------------- | --------------------- |
| Dashboard | `LayoutDashboard` | Active (current page) |
| Menu      | `UtensilsCrossed` | Default               |
| Bills     | `Receipt`         | Default               |
| Outlets   | `Store`           | Default               |
| Users     | `Users`           | Default               |

**Nav item styles:**

- Each item: `h-10 px-3 rounded-lg flex items-center gap-3 text-sm cursor-pointer mx-2`
- Active: `bg-[#E8E7E4] text-[#111110] font-medium`
- Default: `text-[#6B6B68] hover:bg-[#F0EFED]`

**Bottom of sidebar:**

- A `Separator` from shadcn/ui
- A nav item with `Settings` icon (Lucide) and label "Settings"

---

## Main Content Area

Background: `--bg-base` (`#F5F5F4`)
Padding: `p-8`

### Section 1 — Page Header + Filters

**Page title:** `"Sales Dashboard"` — `text-xl font-medium text-[#111110]`
**Subtitle:** `"All outlets · All time"` — `text-sm text-[#6B6B68]`

Below the title, render a horizontal filter bar with two controls side by side (`flex gap-3`):

**Outlet Selector:**

- Use shadcn `Select` component
- Label: none (placeholder inside select)
- Placeholder: `"All Outlets"`
- Options (hardcoded):
  - All Outlets
  - Outlet 1 — MG Road
  - Outlet 2 — Bhubaneswar
  - Outlet 3 — Cuttack
- Width: `w-[200px]`

**Date Range Selector:**

- Use two shadcn `Input` components of `type="date"` side by side with a `"→"` separator
- Wrap in a `flex items-center gap-2` div
- Default values: from `2025-01-01` to `2025-12-31`
- Width per input: `w-[160px]`

---

### Section 2 — Metric Cards

Three cards in a `grid grid-cols-3 gap-4` layout.

Use shadcn `Card` with `CardContent`. Each card: white background, `rounded-lg`, `border border-[#E2E1DD]`, `p-6`.

**Card 1 — Total Revenue**

- Icon: `IndianRupee` (Lucide), `h-5 w-5`, color `#6B6B68`
- Label: `"Total Revenue"` — `text-sm text-[#6B6B68]`
- Value: `"₹4,28,500.00"` — `text-2xl font-medium font-mono text-[#111110]`
- Sub-label: `"Across all outlets"` — `text-xs text-[#9C9C99]`

**Card 2 — Total Bills**

- Icon: `Receipt` (Lucide), `h-5 w-5`, color `#6B6B68`
- Label: `"Total Bills"` — `text-sm text-[#6B6B68]`
- Value: `"1,284"` — `text-2xl font-medium font-mono text-[#111110]`
- Sub-label: `"Printed bills only"` — `text-xs text-[#9C9C99]`

**Card 3 — GST Collected**

- Icon: `Percent` (Lucide), `h-5 w-5`, color `#6B6B68`
- Label: `"GST Collected"` — `text-sm text-[#6B6B68]`
- Value: `"₹38,520.00"` — `text-2xl font-medium font-mono text-[#111110]`
- Sub-label: `"CGST + SGST"` — `text-xs text-[#9C9C99]`

---

### Section 3 — Sales by Outlet Table

**Section heading:** `"Sales by Outlet"` — `text-lg font-medium text-[#111110]`, `mb-4`

Use shadcn `Table` component. White card wrapper: `bg-white rounded-lg border border-[#E2E1DD] overflow-hidden`.

**Columns:**
| Column | Alignment |
|---|---|
| Outlet | Left |
| Bills | Right |
| Revenue | Right |
| CGST | Right |
| SGST | Right |
| GST Total | Right |

**Hardcoded rows:**

| Outlet                 | Bills | Revenue      | CGST      | SGST      | GST Total  |
| ---------------------- | ----- | ------------ | --------- | --------- | ---------- |
| Outlet 1 — MG Road     | 524   | ₹1,82,400.00 | ₹8,208.00 | ₹8,208.00 | ₹16,416.00 |
| Outlet 2 — Bhubaneswar | 418   | ₹1,40,200.00 | ₹6,309.00 | ₹6,309.00 | ₹12,618.00 |
| Outlet 3 — Cuttack     | 342   | ₹1,05,900.00 | ₹4,765.50 | ₹4,765.50 | ₹9,531.00  |

**Totals row** (last row, `font-medium`, `bg-[#FAFAF9]`):

| | 1,284 | ₹4,28,500.00 | ₹19,282.50 | ₹19,282.50 | ₹38,565.00 |

**Table cell styles:**

- Revenue, CGST, SGST, GST Total: `font-mono text-sm`
- Outlet name: `text-sm font-medium text-[#111110]`
- Numbers: `text-sm text-[#111110]`
- Table header: `text-xs font-medium text-[#6B6B68] uppercase tracking-wide`
- Alternating row bg: even rows `bg-[#FAFAF9]`

---

### Section 4 — Payment Mode Summary

**Section heading:** `"Payment Breakdown"` — `text-lg font-medium text-[#111110]`, `mb-4`

Three cards in a `grid grid-cols-3 gap-4` layout. Same card style as metric cards.

**Card 1 — Cash**

- Icon: `Banknote` (Lucide), `h-5 w-5 text-[#111110]`
- Label: `"Cash"`
- Value: `"₹2,14,250.00"` — `font-mono`
- Sub: `"640 transactions"`

**Card 2 — UPI**

- Icon: `Smartphone` (Lucide), `h-5 w-5 text-[#378ADD]`
- Label: `"UPI"`
- Value: `"₹1,71,400.00"` — `font-mono`
- Sub: `"512 transactions"`

**Card 3 — Card**

- Icon: `CreditCard` (Lucide), `h-5 w-5 text-[#1D9E75]`
- Label: `"Card"`
- Value: `"₹42,850.00"` — `font-mono`
- Sub: `"132 transactions"`

---

## Styling Rules for This Unit

- Use only Tailwind utility classes — no inline `style` props
- Use only colors from `ui-context.md` — no new hex values except those already defined there
- All monetary values use `font-mono`
- Icon `strokeWidth` is always `1.5`
- No animations or transitions in this unit
- No `'use client'` directive — this is a static Server Component

---

## Verification Checklist

Before marking this unit complete:

- [ ] Page renders at `/` without errors
- [ ] Navbar shows logotype left, avatar right
- [ ] Sidebar shows 5 nav items + Settings, Dashboard is active state
- [ ] Outlet selector renders with 4 options (All + 3 outlets)
- [ ] Date range inputs render with default values
- [ ] 3 metric cards render with correct labels and hardcoded values
- [ ] Outlet table renders with 3 data rows + totals row
- [ ] Payment mode cards render with correct icons and values
- [ ] No `useClient`, no `useState`, no `fetch` calls anywhere in the file
- [ ] All monetary values use `font-mono`
- [ ] No hardcoded hex values outside of those defined in `ui-context.md`
