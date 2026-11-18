# Astrava Design System (DESIGN.md)

## 1. Atmosphere & Vibe
- **Design Philosophy:** Industrial Precision, Zero-Slop Enterprise Warehouse Intelligence.
- **Density:** Cockpit Dense (8/10) — High data density, tabular precision, instant responsiveness.
- **Variance:** Offset Asymmetric (6/10) — Clear hierarchy with KPI hero metrics followed by structured tables.
- **Motion:** Tactile Spring (6/10) — Spring physics on modals and buttons (`stiffness: 320, damping: 25`), 0ms keep-alive page transitions.

---

## 2. Color Palette & Calibration

| Name | Hex Code | Semantic Role |
| :--- | :--- | :--- |
| **Canvas Deep Neutral** | `#0B0F17` | Root background / viewport canvas |
| **Surface Card** | `#111827` | Primary card, table, and sidebar surface |
| **Surface Elevated** | `#1F2937` | Modal dialogues, flyouts, and dropdowns |
| **Surface Subtle** | `#0E131F` | Table headers, secondary panels |
| **Primary Cobalt** | `#2563EB` | Primary CTA, active navigation indicators |
| **Primary Hover** | `#1D4ED8` | Hover state for primary actions |
| **Border Subtle** | `#1E293B` | Standard card dividers, table borders |
| **Border Strong** | `#334155` | Focused inputs, prominent container boundaries |
| **Emerald Success** | `#10B981` | Healthy stock, fulfilled orders, received POs |
| **Amber Warning** | `#F59E0B` | Reorder threshold warnings, reserved stock |
| **Rose Danger** | `#F43F5E` | Out-of-stock items, cancelled orders, audit shrinkage |
| **Sky Info** | `#38BDF8` | In-transit stock transfers, ledger movement logs |

> **Banned Aesthetic:** Neon purple/pink glows, blurry saturated gradients, and pure black (`#000000`).

---

## 3. Typography Architecture

- **Sans Stack:** `Geist`, `-apple-system`, `BlinkMacSystemFont`, `sans-serif`
  - Body: 12px (`text-xs`) with `leading-relaxed`.
  - Section Headings: 14px–16px (`text-sm`–`text-base`) font-semibold.
  - Page Titles: 20px–24px (`text-xl`–`text-2xl`) font-bold tracking-tight.
- **Mono Stack:** `Geist Mono`, `ui-monospace`, `monospace`
  - High-Density Override: All numeric metrics, currency amounts (`₹`, `$`, `€`), quantities, SKU numbers, and timestamps use `font-mono` with `.tabular-nums`.

---

## 4. Component Behaviors & Styling

### Buttons
- **Tactile Feedback:** `active:scale-[0.98]` on click.
- **Focus Rings:** `focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0F17]`.
- **Variants:** Primary (Cobalt), Secondary (Slate-800), Outline (Border-Slate-700), Danger (Rose-600), Ghost (Hover-Slate-850).

### Cards & Surfaces
- Background: `#111827` with 1px border `#1E293B`.
- Rounded corners: `rounded-xl` (12px radius).
- Micro-interaction: Subtle border highlight on hover (`hover:border-slate-700/60 transition-colors`).

### Badges & Status Indicators
- Rounded pill shape (`rounded-full`).
- Includes a 6px glowing indicator dot (`dot={true}`) for live operational states.
- 12% opacity color fill with 30% opacity matching border.

### Modals & Dialogs
- Semantics: `role="dialog"`, `aria-modal="true"`.
- Animation: Spring entrance (`initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}`).
- Backdrop: `bg-black/75 backdrop-blur-sm`.

---

## 5. Layout & Responsive Principles

- **Max Layout Boundary:** `max-w-[1400px] mx-auto` with flexible fluid padding.
- **Mobile First Collapse:** Sidebars collapse into overlay drawers on viewports `< 1024px`.
- **Zero Layout Shift:** Visited tabs remain resident in DOM (`display: block / none`) to preserve state, scroll, and achieve 0ms navigation.
- **Touch Target Minimum:** All interactive targets at least 44px on mobile devices.

---

## 6. Motion Philosophy

- **Physics Engine:** Framer Motion spring curves (`stiffness: 320, damping: 25`).
- **Page Transitions:** Subtle fade-in (`duration-200`) without unmounting persistent DOM state.
- **Allowed Motion:** Tactile button compressions, modal spring reveals, tabular pulse indicators.
- **Banned Motion:** Disorienting large page slide animations, looping decorative spinners when cached data exists.
