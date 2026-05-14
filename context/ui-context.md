# UI Context — Multi-Outlet Billing System (V1)

## Theme

Light mode only. The design language is clean, minimal, and professional — built for daily operational use by cashiers, managers, and admins. The palette is anchored in black and grey with warm off-white surfaces. No decorative color. Accent colors are used sparingly — only for interactive elements, status indicators, and data visualization. The UI should feel fast and uncluttered: high information density without visual noise.

**Responsive strategy:** Cashier views are mobile-first — they must work on phones (390px) and tablets (768px+). Admin and manager views are desktop-first (1024px+) with tablet support — no mobile optimization required for those roles.

---

## Colors

All components must use these CSS custom properties. No hardcoded hex values anywhere in the codebase.

### Base & Surface

| Role              | CSS Variable          | Value     | Usage                             |
| ----------------- | --------------------- | --------- | --------------------------------- |
| Page background   | `--bg-base`           | `#F5F5F4` | Outermost page background         |
| Surface primary   | `--bg-surface`        | `#FFFFFF` | Cards, panels, modals             |
| Surface secondary | `--bg-surface-raised` | `#FAFAF9` | Nested surfaces, table rows (alt) |
| Surface hover     | `--bg-hover`          | `#F0EFED` | Row hover, button hover states    |
| Surface active    | `--bg-active`         | `#E8E7E4` | Pressed states, active nav items  |

### Text

| Role           | CSS Variable       | Value     | Usage                                 |
| -------------- | ------------------ | --------- | ------------------------------------- |
| Primary text   | `--text-primary`   | `#111110` | Headings, body, labels                |
| Secondary text | `--text-secondary` | `#6B6B68` | Subtitles, descriptions, placeholders |
| Muted text     | `--text-muted`     | `#9C9C99` | Hints, timestamps, disabled labels    |
| Inverse text   | `--text-inverse`   | `#FFFFFF` | Text on dark/black backgrounds        |

### Borders

| Role           | CSS Variable       | Value     | Usage                          |
| -------------- | ------------------ | --------- | ------------------------------ |
| Default border | `--border-default` | `#E2E1DD` | Cards, inputs, dividers        |
| Strong border  | `--border-strong`  | `#C8C7C3` | Focused inputs, selected rows  |
| Subtle border  | `--border-subtle`  | `#EEEEDD` | Section separators, table rows |

### Primary (Black)

| Role          | CSS Variable             | Value     | Usage                             |
| ------------- | ------------------------ | --------- | --------------------------------- |
| Primary       | `--accent-primary`       | `#111110` | Primary buttons, active nav, CTAs |
| Primary hover | `--accent-primary-hover` | `#2C2C2A` | Primary button hover              |
| Primary muted | `--accent-primary-muted` | `#444441` | Secondary actions on dark         |

### Interactive (Grey scale)

| Role                | CSS Variable            | Value     | Usage                              |
| ------------------- | ----------------------- | --------- | ---------------------------------- |
| Interactive default | `--interactive-default` | `#888780` | Default icon color, ghost button   |
| Interactive hover   | `--interactive-hover`   | `#5F5E5A` | Icon hover, secondary button hover |
| Interactive active  | `--interactive-active`  | `#2C2C2A` | Pressed icon, active toggle        |

### Status — Semantic

| Role           | CSS Variable             | Value     | Usage                    |
| -------------- | ------------------------ | --------- | ------------------------ |
| Success bg     | `--state-success-bg`     | `#EAF3DE` | Success alert background |
| Success text   | `--state-success-text`   | `#27500A` | Success alert text       |
| Success border | `--state-success-border` | `#639922` | Success alert border     |
| Warning bg     | `--state-warning-bg`     | `#FAEEDA` | Warning alert background |
| Warning text   | `--state-warning-text`   | `#633806` | Warning alert text       |
| Warning border | `--state-warning-border` | `#BA7517` | Warning alert border     |
| Error bg       | `--state-error-bg`       | `#FCEBEB` | Error alert background   |
| Error text     | `--state-error-text`     | `#791F1F` | Error alert text         |
| Error border   | `--state-error-border`   | `#A32D2D` | Error alert border       |
| Info bg        | `--state-info-bg`        | `#E6F1FB` | Info alert background    |
| Info text      | `--state-info-text`      | `#0C447C` | Info alert text          |
| Info border    | `--state-info-border`    | `#185FA5` | Info alert border        |

### Bill Status — Fixed Mapping

Bill status badges use these tokens exclusively. Do not redefine per page.

| Status      | Background           | Text                   | Border                   |
| ----------- | -------------------- | ---------------------- | ------------------------ |
| `draft`     | `--state-info-bg`    | `--state-info-text`    | `--state-info-border`    |
| `printed`   | `--state-success-bg` | `--state-success-text` | `--state-success-border` |
| `cancelled` | `--state-error-bg`   | `--state-error-text`   | `--state-error-border`   |

### Data Visualization (Dashboard charts)

| Role          | CSS Variable    | Value     | Usage                   |
| ------------- | --------------- | --------- | ----------------------- |
| Chart — cash  | `--chart-cash`  | `#111110` | Cash payment mode bars  |
| Chart — UPI   | `--chart-upi`   | `#378ADD` | UPI payment mode bars   |
| Chart — card  | `--chart-card`  | `#1D9E75` | Card payment mode bars  |
| Chart — other | `--chart-other` | `#888780` | Other payment mode bars |
| Chart — GST   | `--chart-gst`   | `#BA7517` | GST collected highlight |
| Chart grid    | `--chart-grid`  | `#E2E1DD` | Chart gridlines         |

---

## Typography

| Role      | Font       | Variable      | Notes                               |
| --------- | ---------- | ------------- | ----------------------------------- |
| UI text   | Geist Sans | `--font-sans` | All interface text, labels, buttons |
| Monospace | Geist Mono | `--font-mono` | Bill numbers, SKUs, amounts         |

### Type Scale

| Token       | Size | Weight | Line Height | Usage                         |
| ----------- | ---- | ------ | ----------- | ----------------------------- |
| `text-xs`   | 12px | 400    | 1.5         | Timestamps, hints, badges     |
| `text-sm`   | 14px | 400    | 1.5         | Table cells, secondary labels |
| `text-base` | 16px | 400    | 1.6         | Body text, form inputs        |
| `text-lg`   | 18px | 500    | 1.4         | Section headings              |
| `text-xl`   | 22px | 500    | 1.3         | Page titles                   |
| `text-2xl`  | 28px | 500    | 1.2         | Dashboard metric numbers      |
| `text-3xl`  | 36px | 500    | 1.1         | Grand total on bill builder   |

**Rules:**

- Bill numbers and amounts always use `--font-mono` (Geist Mono)
- Dashboard metric values use `text-2xl` (28px / 500)
- Grand total on the POS bill builder uses `text-3xl` (36px / 500)
- Table headers are `text-sm` / 500 / `--text-secondary`
- No font weight above 500 anywhere in the UI

---

## Border Radius

| Context           | Tailwind Class | px Value | Usage                            |
| ----------------- | -------------- | -------- | -------------------------------- |
| Inline / small UI | `rounded`      | 4px      | Badges, status pills, small tags |
| Inputs / buttons  | `rounded-md`   | 6px      | All form inputs, all buttons     |
| Cards / panels    | `rounded-lg`   | 8px      | Surface cards, table wrappers    |
| Modals / dialogs  | `rounded-xl`   | 12px     | Modals, command palette, drawers |
| Avatar / initials | `rounded-full` | 9999px   | User avatar circles only         |

---

## Component Library

shadcn/ui on top of Tailwind CSS. All primitive components live in `components/ui/`. Use the shadcn CLI to add new components — never write them from scratch.

```bash
npx shadcn-ui@latest add [component-name]
```

**Do not modify files inside `components/ui/`** — customize only via `className` props at the call site. If a component needs consistent customization across the app, wrap it in a named component inside `components/billing/`, `components/dashboard/`, etc.

**Installed components (V1 baseline):**
`Button`, `Input`, `Label`, `Select`, `Table`, `Badge`, `Dialog`, `Sheet`, `DropdownMenu`, `Separator`, `Skeleton`, `Tabs`, `Tooltip`, `Card`, `Form`, `Command`, `Popover`, `Calendar`, `DatePicker`

**Mobile-specific usage:**

- `Sheet` with `side="bottom"` replaces `Dialog` on mobile for all modals and overlays
- `Tabs` used for category filter row in mobile POS — horizontal scroll variant
- `Skeleton` used on all loading states — never show a blank screen or spinner alone

---

## Breakpoints

| Name    | Width            | Target            |
| ------- | ---------------- | ----------------- |
| Mobile  | `< 640px`        | Cashier on phone  |
| Tablet  | `640px – 1023px` | Cashier on tablet |
| Desktop | `≥ 1024px`       | Admin, manager    |

Cashier views are **mobile-first**: base styles target 390px, tablet and desktop styles layer on top with `sm:` and `lg:` prefixes. Admin and manager views are **desktop-first**: base styles target 1024px+, with `sm:` adjustments for tablet only.

---

## Layout Patterns

### App Shell

**Desktop / Tablet (≥ 640px):**

- Fixed left sidebar, 240px wide, `--bg-surface` background, `--border-default` right border
- Top nav bar, 56px tall, `--bg-surface` background, `--border-default` bottom border
- Main content area fills remaining viewport, `max-width: 1280px`, centered, `padding: 2rem`

**Mobile (< 640px) — Cashier only:**

- Sidebar is hidden entirely
- Top nav bar reduced to 48px — shows outlet name (left) and user avatar (right) only
- Bottom navigation bar, 64px tall, fixed to bottom of viewport, `--bg-surface` background, `--border-default` top border
- Bottom nav has 4 items: New Bill, Bills, Summary, Account — icons + labels, `h-5 w-5` icons
- Main content fills viewport between top nav and bottom nav, `padding: 1rem`
- Bottom nav must account for iOS safe area: `padding-bottom: env(safe-area-inset-bottom)`

### Navigation

**Sidebar (desktop/tablet):**

- Each nav item: `h-10`, `px-3`, `rounded-lg`, icon (`h-5 w-5`) + label
- Active state: `--bg-active` background, `--text-primary` text
- Inactive state: `--text-secondary` text, hover `--bg-hover`

**Bottom nav (mobile):**

- 4 fixed items — no overflow, no scrolling nav
- Active item: `--text-primary` icon + label, `--accent-primary` 2px top border indicator
- Inactive item: `--text-muted` icon + label
- Touch target minimum: 44px × 44px per item

### Top Nav

- Contains outlet badge (cashier) or outlet `Select` dropdown (admin/manager) on the left
- User avatar + dropdown menu on the right
- On mobile: outlet name as plain text badge — no selector dropdown for cashiers
- Outlet selector (admin/manager): `Select` component, default "All Outlets", scopes all data when changed

### POS Bill Builder

**Desktop / Tablet (≥ 640px):**

- Two-column layout: left 60% (item search + line items list), right 40% (bill summary, customer fields, payment split, complete button)
- Right column is sticky on scroll

**Mobile (< 640px):**

- Single column — full width
- Top section: search bar + category filter tabs (horizontally scrollable, `overflow-x: auto`, no scrollbar visible)
- Middle section: line items list, each item as a card row (name, qty controls, line total)
- Floating summary bar: fixed above bottom nav, shows item count + grand total + "View Bill" button
- Tapping "View Bill" opens a **bottom sheet** (shadcn `Sheet` from bottom) containing: customer fields, GST breakdown, payment split form, complete button
- Bottom sheet height: 85vh max, scrollable internally, drag handle at top
- Complete button in bottom sheet: full width, `h-14`, `text-base`, black background

### Item Search (Mobile)

- Full-width search input at top, `h-12`, large touch target
- Category filter: horizontally scrollable pill row below search (`overflow-x: auto`, `gap: 8px`, `pb-2` for scroll affordance)
- Each category pill: `rounded-full`, `px-4 py-2`, `text-sm` — active pill uses `--accent-primary` background + `--text-inverse` text
- Menu items displayed as a 2-column grid on mobile (`grid-cols-2`), single tap to add to bill
- Each item card: item name (`text-sm` / 500), price (`text-xs` / mono), `+` button (full card tap area)

### Quantity Controls (Mobile)

- Inline on line item row: `−` button, quantity display, `+` button
- Minimum touch target per button: 44px × 44px
- Quantity display: `font-mono`, centered, `w-8`
- Long press on `−` at quantity 1 prompts removal confirmation — do not auto-remove on single tap

### Dashboard (Admin / Manager)

- Desktop: 3-column metric grid → full-width chart → full-width bill table
- Tablet: 2-column metric grid → full-width chart → full-width bill table
- No mobile layout for dashboard — redirect mobile users to a "Dashboard is available on larger screens" message

### Bill History (Cashier)

**Desktop / Tablet:** Standard `Table` component with all columns visible.

**Mobile:** Replace table with a card list. Each bill is a card:

- Line 1: bill number (mono, `text-sm`) + status badge (right)
- Line 2: customer name or "Walk-in" + date (right, `text-xs`, muted)
- Line 3: grand total (mono, `text-base`, 500) + payment mode badge (right)
- Tapping a card opens bill detail in a bottom sheet or new page

### Filters (Bill History — Mobile)

- Filter bar collapsed by default — single "Filters" button with active filter count badge
- Tapping opens a bottom sheet with all filter fields stacked vertically
- Apply button at bottom of sheet: full width, black, `h-12`

### Modals / Dialogs

- Desktop/Tablet: centered overlay, `backdrop-blur-sm`, max-width `560px` (forms) / `800px` (data)
- Mobile: use bottom sheet (`Sheet` from shadcn, `side="bottom"`) instead of centered dialog — never show a centered modal on mobile
- All sheets have a visible drag handle (`w-12 h-1.5 rounded-full bg-border mx-auto mt-3 mb-1`)

### Tables

- Always use `Table` from shadcn/ui on desktop/tablet
- Sticky header on scroll for tables taller than viewport
- Alternating row backgrounds: `--bg-surface-raised` on even rows
- On mobile: replace with card list pattern (see Bill History above) — never show a multi-column table on < 640px

### Empty States

- Centered, no illustration, short message (one sentence max), one primary action button
- Same pattern on all breakpoints — stack vertically on mobile

---

## Icons

Lucide React. Stroke-based icons only. Import individually — never import the full library.

```tsx
import { Plus, Search, ChevronDown } from "lucide-react";
```

| Context                  | Size class | px   |
| ------------------------ | ---------- | ---- |
| Inline text / table cell | `h-4 w-4`  | 16px |
| Buttons                  | `h-4 w-4`  | 16px |
| Nav items (sidebar)      | `h-5 w-5`  | 20px |
| Bottom nav (mobile)      | `h-5 w-5`  | 20px |
| Empty states             | `h-8 w-8`  | 32px |
| Dashboard metric icons   | `h-5 w-5`  | 20px |

**Stroke width:** Always `strokeWidth={1.5}` — never the default 2. Matches the minimal aesthetic.
**Color:** Always inherit from parent via `currentColor` — never hardcode a color on an icon directly.
**Touch targets:** Any icon used as a tap target on mobile must be wrapped in a element with minimum `44px × 44px` clickable area — use `p-3` or a sized wrapper, not the icon size itself.

---

## Spacing Scale

Use Tailwind's default spacing scale. The following values are used most frequently:

| Token     | Value | Common Usage                            |
| --------- | ----- | --------------------------------------- |
| `space-1` | 4px   | Icon-to-label gap, tight inline spacing |
| `space-2` | 8px   | Input padding, badge padding            |
| `space-3` | 12px  | Between form fields, table cell padding |
| `space-4` | 16px  | Card internal padding, section gaps     |
| `space-6` | 24px  | Between cards, form section gaps        |
| `space-8` | 32px  | Page section separation                 |

---

## Tailwind Config Extensions

Add to `tailwind.config.ts` to wire up the CSS variables:

```ts
theme: {
  extend: {
    colors: {
      bg: {
        base:         'var(--bg-base)',
        surface:      'var(--bg-surface)',
        raised:       'var(--bg-surface-raised)',
        hover:        'var(--bg-hover)',
        active:       'var(--bg-active)',
      },
      text: {
        primary:      'var(--text-primary)',
        secondary:    'var(--text-secondary)',
        muted:        'var(--text-muted)',
        inverse:      'var(--text-inverse)',
      },
      border: {
        default:      'var(--border-default)',
        strong:       'var(--border-strong)',
        subtle:       'var(--border-subtle)',
      },
      accent: {
        primary:      'var(--accent-primary)',
        'primary-hover': 'var(--accent-primary-hover)',
      },
    },
    fontFamily: {
      sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      mono: ['var(--font-mono)', 'monospace'],
    },
    borderRadius: {
      sm:   '4px',
      md:   '6px',
      lg:   '8px',
      xl:   '12px',
      full: '9999px',
    },
  },
},
```
