# Unit 03 — Outlet-Specific Dashboard Page (Static UI)

## Reference

This page is accessed when a specific outlet is selected from the `"/"` dashboard page.
The UI must match the `"/"` page exactly in: navbar, sidebar structure, color tokens, typography, spacing, and card styles.
Read `03-DashboardDesign.md` before starting — do not deviate from those patterns.

The inspiration layout is a PetPooja-style outlet dashboard (provided as screenshot).
Adapt the concept — do not copy colors, fonts, or structure from PetPooja.
Use only the design tokens defined in `ui-context.md`.

---

## What You Are Building

A static outlet-specific sales dashboard page at `/outlets/[id]`.
This page shows the sales summary for one specific outlet — **Outlet 1 — MG Road** (hardcoded for now).
Includes: metric cards, a bar chart placeholder, payment mode breakdown, and a recent bills table.
No real data. No API calls. No auth checks. Static UI only.

---

## Scope

**In scope for this unit:**

- Shared layout: same top navbar and sidebar as `"/"` page
- Outlet name + date in the page header
- 4 metric cards (Total Revenue, Total Bills, GST Collected, Avg Bill Value)
- Bar chart placeholder (static SVG bars — no chart library)
- Payment mode breakdown cards (Cash, UPI, Card, Other)
- GST slab breakdown table (static rows)
- Recent bills table (static rows, last 5 bills)

**Out of scope for this unit:**

- Real data fetching or API calls
- Clerk auth or route protection
- Interactive outlet selector navigation
- Actual chart library (Recharts etc.) — use static SVG bars only
- Mobile layout
- Any `useState`, `useEffect`, or client interactivity

---

## Files to Create

```
app/(admin-manager)/outlets/[id]/page.tsx     â† create
```

Do not create layout files, API routes, or lib functions in this unit.
Do not modify `app/(admin-manager)/page.tsx`.

If a shared layout file (`app/(admin-manager)/layout.tsx`) does not yet exist, create it now with the navbar and sidebar — then import it in both `page.tsx` files.
If it already exists, do not touch it.

---

## Tech Stack for This Unit

- Next.js 14 App Router
- shadcn/ui components
- Tailwind CSS
- Lucide React icons
- Static SVG for bar chart
- All values hardcoded — no `useState`, no `useEffect`, no data fetching

---

## Page Structure

```
â”Œ─────────────────────────────────────────────────────────────â”
â”‚  TOP NAVBAR  (identical to "/" page)                        â”‚
â”œ───────────────â”¬─────────────────────────────────────────────â”¤
â”‚               â”‚  PAGE HEADER — outlet name + date picker    â”‚
â”‚               â”œ─────────────────────────────────────────────â”¤
â”‚   SIDEBAR     â”‚  METRIC CARDS  (4 columns)                  â”‚
â”‚               â”œ──────────────────â”¬──────────────────────────â”¤
â”‚               â”‚  BAR CHART       â”‚  PAYMENT MODE BREAKDOWN  â”‚
â”‚               â”œ──────────────────â”´──────────────────────────â”¤
â”‚               â”‚  GST SLAB BREAKDOWN TABLE                   â”‚
â”‚               â”œ─────────────────────────────────────────────â”¤
â”‚               â”‚  RECENT BILLS TABLE                         â”‚
â””───────────────â”´─────────────────────────────────────────────â”˜
```

---

## Top Navbar

Identical to `"/"` page. Do not rebuild — reuse from the shared layout if it exists.

- Left: `â–  BillFlow` logotype — `font-mono font-semibold text-lg text-[#111110]`
- Right: circular avatar `div` 32px `bg-[#E8E7E4]` initials `"AD"` + label `"Admin"` `text-sm text-[#6B6B68]`
- Height: 56px, `bg-white border-b border-[#E2E1DD]`

---

## Sidebar

Identical structure to `"/"` page. Nav items and styles are the same.

**Navigation items** — Lucide icons `h-4 w-4 strokeWidth={1.5}`:

| Label      | Icon              | State                    |
| ---------- | ----------------- | ------------------------ |
| Dashboard  | `LayoutDashboard` | Default (link to `/`)    |
| All Orders | `ClipboardList`   | Default                  |
| Menu       | `UtensilsCrossed` | Default                  |
| Bills      | `Receipt`         | Default                  |
| Outlets    | `Store`           | Active (current section) |
| Users      | `Users`           | Default                  |

**Active item:** `Outlets` — `bg-[#E8E7E4] text-[#111110] font-medium`
**Default items:** `text-[#6B6B68] hover:bg-[#F0EFED]`
**Each item:** `h-10 px-3 rounded-lg flex items-center gap-3 text-sm cursor-pointer mx-2`

Bottom of sidebar:

- `Separator` from shadcn/ui
- `Settings` nav item — default state

---

## Main Content Area

**Background:** `#F5F5F4`
**Padding:** `p-8`
**Max width:** `1280px` centered

---

### Section 1 — Page Header

**Layout:** `flex items-start justify-between` — title block on left, date controls on right.

**Left side:**

Breadcrumb line above title:

- `"Dashboard"` → `"Outlets"` → `"Outlet 1 — MG Road"`
- Style: `text-xs text-[#9C9C99]`, chevrons use `ChevronRight` icon `h-3 w-3`
- Entire breadcrumb: `flex items-center gap-1 mb-2`

Title:

- `"Outlet 1 — MG Road"` — `text-xl font-medium text-[#111110]`

Subtitle:

- `"MG Road, Bhubaneswar Â· GSTIN: 21AABCU9603R1ZX"` — `text-sm text-[#6B6B68]`

Below subtitle — status pill row (`flex gap-2 mt-2`):

- Green pill: `â— Active` — `bg-[#EAF3DE] text-[#27500A] text-xs px-2 py-0.5 rounded`
- Grey pill: `State: OD` — `bg-[#F0EFED] text-[#6B6B68] text-xs px-2 py-0.5 rounded`

**Right side:**

Date range controls — same as `"/"` page:

- Two `Input type="date"` side by side with `"→"` separator
- Default: `2025-01-01` to `2025-12-31`
- Width per input: `w-[160px]`
- Below the date inputs, a `text-xs text-[#9C9C99]` label: `"Showing data for selected period"`

---

### Section 2 — Metric Cards

Four cards in a `grid grid-cols-4 gap-4` layout.
Card style: `bg-white rounded-lg border border-[#E2E1DD] p-6`

**Card 1 — Total Revenue**

- Icon: `IndianRupee` `h-5 w-5 text-[#6B6B68]` `strokeWidth={1.5}`
- Label: `"Total Revenue"` — `text-sm text-[#6B6B68]`
- Value: `"â‚¹1,82,400.00"` — `text-2xl font-medium font-mono text-[#111110]`
- Sub: `"This outlet only"` — `text-xs text-[#9C9C99]`

**Card 2 — Total Bills**

- Icon: `Receipt` `h-5 w-5 text-[#6B6B68]` `strokeWidth={1.5}`
- Label: `"Total Bills"` — `text-sm text-[#6B6B68]`
- Value: `"524"` — `text-2xl font-medium font-mono text-[#111110]`
- Sub: `"Printed bills only"` — `text-xs text-[#9C9C99]`

**Card 3 — GST Collected**

- Icon: `Percent` `h-5 w-5 text-[#6B6B68]` `strokeWidth={1.5}`
- Label: `"GST Collected"` — `text-sm text-[#6B6B68]`
- Value: `"â‚¹16,416.00"` — `text-2xl font-medium font-mono text-[#111110]`
- Sub: `"CGST + SGST"` — `text-xs text-[#9C9C99]`

**Card 4 — Avg Bill Value**

- Icon: `TrendingUp` `h-5 w-5 text-[#6B6B68]` `strokeWidth={1.5}`
- Label: `"Avg Bill Value"` — `text-sm text-[#6B6B68]`
- Value: `"â‚¹348.09"` — `text-2xl font-medium font-mono text-[#111110]`
- Sub: `"Per printed bill"` — `text-xs text-[#9C9C99]`

---

### Section 3 — Two Column Row: Bar Chart + Payment Mode

Layout: `grid grid-cols-5 gap-4` — chart takes `col-span-3`, payment modes take `col-span-2`

#### 3A — Bar Chart (left, col-span-3)

Card wrapper: `bg-white rounded-lg border border-[#E2E1DD] p-6`

**Header:**

- Left: `"Daily Revenue"` — `text-base font-medium text-[#111110]`
- Right: `"Jan 2025 – Dec 2025"` — `text-xs text-[#9C9C99]`
- Layout: `flex justify-between items-center mb-6`

**Static SVG bar chart:**

Render a static `<svg>` element. Do not use any chart library.

SVG dimensions: `width="100%" height="180"`

Render 7 vertical bars representing days of the week (Mon–Sun) with hardcoded heights:

| Day | Label | Bar height (px) | Bar color |
| --- | ----- | --------------- | --------- |
| Mon | Mon   | 60              | `#111110` |
| Tue | Tue   | 90              | `#111110` |
| Wed | Wed   | 45              | `#111110` |
| Thu | Thu   | 120             | `#111110` |
| Fri | Fri   | 150             | `#111110` |
| Sat | Sat   | 135             | `#111110` |
| Sun | Sun   | 75              | `#111110` |

SVG construction rules:

- Chart area height: 160px. Chart baseline Y = 160.
- Bar width: 28px. Gap between bars: distribute evenly across SVG width.
- Each bar: `<rect>` with `fill="#111110"` `rx="4"` — top of bar at `(160 - barHeight)`, height = `barHeight`
- Y-axis gridlines: 3 horizontal `<line>` elements at Y=40, Y=80, Y=120 — `stroke="#E2E1DD"` `strokeWidth="1"`
- Y-axis labels: `"3k"`, `"2k"`, `"1k"` at left — `font-size="11"` `fill="#9C9C99"`
- X-axis day labels centered below each bar — `font-size="11"` `fill="#6B6B68"`
- Highlight Friday bar (highest) with `fill="#111110"` — same color, no change needed since all bars are black

Below the chart, a legend row (`flex gap-6 mt-4`):

- `â— Total Revenue` — `text-xs text-[#6B6B68]`, dot is `inline-block w-2 h-2 rounded-full bg-[#111110] mr-1`

#### 3B — Payment Mode Breakdown (right, col-span-2)

Card wrapper: `bg-white rounded-lg border border-[#E2E1DD] p-6`

**Header:**

- `"Payment Modes"` — `text-base font-medium text-[#111110]`
- Sub: `"This outlet Â· selected period"` — `text-xs text-[#9C9C99] mt-0.5`

**Four payment rows** — stacked vertically with `space-y-4`:

Each row layout: `flex items-center justify-between`

Left side of row: icon + label (`flex items-center gap-3`)

- Icon in a `w-8 h-8 rounded-lg flex items-center justify-center` wrapper
  Right side: amount + transaction count (right-aligned)

| Mode  | Icon               | Icon bg        | Amount       | Transactions |
| ----- | ------------------ | -------------- | ------------ | ------------ |
| Cash  | `Banknote`         | `bg-[#F0EFED]` | `â‚¹91,200.00` | `272 txns`   |
| UPI   | `Smartphone`       | `bg-[#E6F1FB]` | `â‚¹72,960.00` | `198 txns`   |
| Card  | `CreditCard`       | `bg-[#EAF3DE]` | `â‚¹12,768.00` | `37 txns`    |
| Other | `CircleDollarSign` | `bg-[#FAEEDA]` | `â‚¹5,472.00`  | `17 txns`    |

Row styles:

- Mode label: `text-sm font-medium text-[#111110]`
- Amount: `text-sm font-mono font-medium text-[#111110]`
- Transaction count: `text-xs text-[#9C9C99]`

Below the four rows, a `Separator` then a totals row:

- Label: `"Total"` — `text-sm font-medium text-[#111110]`
- Value: `"â‚¹1,82,400.00"` — `text-sm font-mono font-medium text-[#111110]`
- Layout: `flex justify-between items-center pt-4`

---

### Section 4 — GST Slab Breakdown Table

**Section heading:** `"GST Breakdown"` — `text-lg font-medium text-[#111110] mb-4`

Card wrapper: `bg-white rounded-lg border border-[#E2E1DD] overflow-hidden`

Use shadcn `Table`.

**Columns:**
| Column | Alignment |
|---|---|
| GST Slab | Left |
| Taxable Value | Right |
| CGST | Right |
| SGST | Right |
| Total GST | Right |
| Bills | Right |

**Hardcoded rows:**

| GST Slab | Taxable Value | CGST      | SGST      | Total GST  | Bills |
| -------- | ------------- | --------- | --------- | ---------- | ----- |
| 0%       | â‚¹22,800.00    | â‚¹0.00     | â‚¹0.00     | â‚¹0.00      | 76    |
| 5%       | â‚¹54,600.00    | â‚¹1,365.00 | â‚¹1,365.00 | â‚¹2,730.00  | 182   |
| 18%      | â‚¹82,800.00    | â‚¹7,452.00 | â‚¹7,452.00 | â‚¹14,904.00 | 214   |
| 28%      | â‚¹6,000.00     | â‚¹840.00   | â‚¹840.00   | â‚¹1,680.00  | 52    |

**Totals row** (`font-medium bg-[#FAFAF9]`):
| | â‚¹1,66,200.00 | â‚¹9,657.00 | â‚¹9,657.00 | â‚¹19,314.00 | 524 |

**GST Slab column:** render as a `Badge` from shadcn with `variant="outline"` — e.g. `0%`, `5%`, `18%`, `28%`

**Table header:** `text-xs font-medium text-[#6B6B68] uppercase tracking-wide`
**Monetary cells:** `font-mono text-sm text-[#111110]`
**Alternating rows:** even rows `bg-[#FAFAF9]`

---

### Section 5 — Recent Bills Table

**Section heading row** (`flex justify-between items-center mb-4`):

- Left: `"Recent Bills"` — `text-lg font-medium text-[#111110]`
- Right: a plain text link `"View all bills →"` — `text-sm text-[#6B6B68] hover:text-[#111110] cursor-pointer`

Card wrapper: `bg-white rounded-lg border border-[#E2E1DD] overflow-hidden`

Use shadcn `Table`.

**Columns:**
| Column | Alignment |
|---|---|
| Bill No. | Left |
| Customer | Left |
| Items | Right |
| Payment | Left |
| Amount | Right |
| Status | Left |
| Time | Right |

**Hardcoded rows (5 rows):**

| Bill No.        | Customer     | Items   | Payment     | Amount    | Status    | Time     |
| --------------- | ------------ | ------- | ----------- | --------- | --------- | -------- |
| OTL1-2025-00524 | Rahul Sharma | 4 items | Cash        | â‚¹620.00   | printed   | 11:42 AM |
| OTL1-2025-00523 | Walk-in      | 2 items | UPI         | â‚¹240.00   | printed   | 11:28 AM |
| OTL1-2025-00522 | Priya Nanda  | 6 items | Card + Cash | â‚¹1,140.00 | printed   | 11:05 AM |
| OTL1-2025-00521 | Walk-in      | 1 item  | UPI         | â‚¹80.00    | cancelled | 10:54 AM |
| OTL1-2025-00520 | Amit Das     | 3 items | Cash        | â‚¹460.00   | printed   | 10:33 AM |

**Bill No.:** `font-mono text-sm text-[#111110] font-medium`
**Customer:** `text-sm text-[#111110]` — "Walk-in" rendered as `text-[#9C9C99]`
**Items:** `text-sm text-[#6B6B68]`
**Payment:** `text-sm text-[#6B6B68]`
**Amount:** `font-mono text-sm font-medium text-[#111110]`
**Time:** `text-xs text-[#9C9C99]`

**Status badge** — use shadcn `Badge` with custom className (no variant prop — use className directly):

- `printed`: `bg-[#EAF3DE] text-[#27500A] border-[#639922]` + text `"printed"`
- `cancelled`: `bg-[#FCEBEB] text-[#791F1F] border-[#A32D2D]` + text `"cancelled"`
- Badge size: `text-xs px-2 py-0.5`

**Table header:** `text-xs font-medium text-[#6B6B68] uppercase tracking-wide`
**Alternating rows:** even rows `bg-[#FAFAF9]`

---

## Styling Rules for This Unit

- Match `"/"` page exactly: same navbar, same sidebar dimensions, same card styles, same color tokens
- Use only colors defined in `ui-context.md` — no new hex values
- All monetary values use `font-mono`
- All icon `strokeWidth={1.5}`
- No `'use client'` directive — this is a static Server Component
- No animations, no transitions
- No chart library — bar chart is a hand-written static `<svg>` only
- No inline `style` props — Tailwind classes only

---

## Verification Checklist

Before marking this unit complete:

- [ ] Page renders at `/outlets/[id]` without errors
- [ ] Navbar is visually identical to `"/"` page
- [ ] Sidebar shows 6 nav items with `Outlets` in active state
- [ ] Breadcrumb renders: `Dashboard → Outlets → Outlet 1 — MG Road`
- [ ] Page title shows `"Outlet 1 — MG Road"` with subtitle and status pills
- [ ] Date range inputs render with default values
- [ ] 4 metric cards render in a 4-column grid with correct labels and values
- [ ] Bar chart SVG renders 7 bars (Mon–Sun) with gridlines and axis labels
- [ ] Payment mode breakdown shows 4 rows + totals row
- [ ] GST slab table renders 4 data rows + totals row with slab Badges
- [ ] Recent bills table renders 5 rows with correct status badges
- [ ] `cancelled` bill row shows red badge
- [ ] `"Walk-in"` customer names render in muted color `text-[#9C9C99]`
- [ ] `"View all bills →"` link renders in the section header
- [ ] No `useState`, no `useEffect`, no `fetch` anywhere in the file
- [ ] No `'use client'` directive
- [ ] All monetary values use `font-mono`
- [ ] No hardcoded hex values outside those defined in `ui-context.md`
- [ ] No chart library imported — SVG only
