# Astrava Design System Rules & MCP Integration Guide

This document establishes the official design system architecture, token taxonomy, and component conventions for **Astrava Inventory Management System**, serving as the single source of truth for Model Context Protocol (MCP) integrations with **Figma** and **Google Stitch**.

---

## 1. Token Definitions

### Location & Architecture
- **Primary Tailwind Config:** [`frontend/tailwind.config.js`](file:///c:/Users/karan/Desktop/project/frontend/tailwind.config.js)
- **CSS Custom Properties (Root Styles):** [`frontend/src/index.css`](file:///c:/Users/karan/Desktop/project/frontend/src/index.css)
- **Format:** HSL channel tokens paired with Hex semantic constants, supporting CSS variable interpolation (`color-scheme: dark`).

### Color Palette Taxonomy

| Token Key | CSS Variable / Hex | Functional Role | Figma / Stitch Variable Path |
| :--- | :--- | :--- | :--- |
| `surface.canvas` | `#0B0F17` | Root background / viewport canvas | `Color/Surface/Canvas` |
| `surface.DEFAULT` | `#111827` | Primary card & sidebar background | `Color/Surface/Default` |
| `surface.elevated` | `#1F2937` | Modal dialogues, tooltips, flyouts | `Color/Surface/Elevated` |
| `surface.subtle` | `#0E131F` | Subtle nested panels and table headers | `Color/Surface/Subtle` |
| `primary.DEFAULT` | `#2563EB` | Core primary actions, active tabs | `Color/Brand/Primary` |
| `primary.hover` | `#1D4ED8` | Action hover & focused states | `Color/Brand/Primary-Hover` |
| `primary.subtle` | `rgba(37, 99, 235, 0.15)` | Active badge & row highlight fills | `Color/Brand/Primary-Subtle` |
| `border.subtle` | `#1E293B` | Standard card, divider, and row borders | `Color/Border/Subtle` |
| `border.strong` | `#334155` | Input borders, elevated dividers | `Color/Border/Strong` |
| `status.success` | `#10B981` | Positive inventory, received orders | `Color/Status/Success` |
| `status.warning` | `#F59E0B` | Low-stock alerts, reserved inventory | `Color/Status/Warning` |
| `status.danger` | `#F43F5E` | Negative adjustments, cancelled orders | `Color/Status/Danger` |
| `status.info` | `#38BDF8` | In-transit stock transfers, ledger notes | `Color/Status/Info` |

### Typography Tokens
- **Display & UI Sans:** `Geist`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, `sans-serif`
  - Used for all interface headings, navigation items, buttons, and form labels.
- **Data & Metric Mono:** `Geist Mono`, `ui-monospace`, `SFMono-Regular`, `Menlo`, `monospace`
  - Applied with `.tabular-nums` (`font-variant-numeric: tabular-nums`) for currency values (`₹5,22,200.00`), SKU codes, quantities, and audit timestamps.

### Spacing & Grid System
- **Scale:** 4px base increment (`4px`, `8px`, `12px`, `16px`, `20px`, `24px`, `32px`, `48px`).
- **Container Maximum Width:** 1400px centered canvas (`max-w-[1400px] mx-auto`).
- **Card Padding:** `p-5` (20px) standard; `p-6` (24px) for modals and high-impact dashboards.

---

## 2. Component Library

### Directory Structure
```
frontend/src/components/
├── layout/
│   ├── Layout.tsx       # Viewport shell with responsive sidebar & top header
│   ├── Navbar.tsx       # Top search, user status, quick actions
│   └── Sidebar.tsx      # Navigation tabs, active state indicators
└── ui/
    ├── Badge.tsx        # Status tags with dot indicators
    ├── Button.tsx       # High-tactile buttons with spring active states
    ├── Card.tsx         # Semantic card containers with glass borders
    └── Modal.tsx        # Accessible dialog with Framer Motion spring physics
```

### Component Architecture & Implementation Patterns

#### A. Button Component ([Button.tsx](file:///c:/Users/karan/Desktop/project/frontend/src/components/ui/Button.tsx))
Supports `primary`, `secondary`, `danger`, `outline`, and `ghost` variants with micro-interaction press scaling (`active:scale-[0.98]`):
```tsx
import { Button } from '../components/ui/Button';

<Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />}>
  Create Order
</Button>
```

#### B. Badge Component ([Badge.tsx](file:///c:/Users/karan/Desktop/project/frontend/src/components/ui/Badge.tsx))
Supports semantic status variants (`success`, `warning`, `danger`, `info`, `purple`) with optional glowing status dots:
```tsx
import { Badge } from '../components/ui/Badge';

<Badge variant="success" dot size="sm">
  CONFIRMED (Stock Reserved)
</Badge>
```

#### C. Card Component ([Card.tsx](file:///c:/Users/karan/Desktop/project/frontend/src/components/ui/Card.tsx))
Standard surface container with header action slot and subtle border transition:
```tsx
import { Card } from '../components/ui/Card';

<Card title="Warehouse Valuation" subtitle="Real-time multi-facility valuation" action={<Button variant="outline" size="sm">Export</Button>}>
  {/* Content */}
</Card>
```

#### D. Accessible Modal ([Modal.tsx](file:///c:/Users/karan/Desktop/project/frontend/src/components/ui/Modal.tsx))
Built compliant with modern web accessibility guidelines (`role="dialog"`, `aria-modal="true"`, `useId()` labelled-by attributes, keyboard `Escape` trap, and Framer Motion spring entrance):
```tsx
<Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Stock Adjustment" maxWidth="md">
  {/* Form fields */}
</Modal>
```

---

## 3. Frameworks & Libraries

- **UI Framework:** React 18.3.1 (Strict Mode enabled).
- **Language:** TypeScript 5.7+ with strict null checks.
- **Styling Pipeline:** Tailwind CSS 3.4 + PostCSS with Autoprefixer.
- **Motion & Physics Engine:** Framer Motion 12.4+ (`type: 'spring', damping: 25, stiffness: 320`).
- **Icons:** `lucide-react` (SVG tree-shaken icons).
- **Bundler:** Vite 6.2 with esbuild transforms (< 4s production build).

---

## 4. Asset Management

- **Web Fonts:** Preconnected to Google Fonts for `Geist` and `Geist Mono` in [`frontend/index.html`](file:///c:/Users/karan/Desktop/project/frontend/index.html).
- **SVGs:** Inlined or imported directly as React components from `lucide-react` to prevent additional network requests.
- **External Client SDKs:** Async defer loading for Google Identity Services (`https://accounts.google.com/gsi/client`).

---

## 5. Icon System

- **Library:** Lucide React (`lucide-react`).
- **Standard Sizing Rules:**
  - Standard action buttons: `w-4 h-4` (16px).
  - Navigation sidebar tabs: `w-5 h-5` (20px).
  - Stat KPI cards / Hero badges: `w-6 h-6` (24px) or `w-7 h-7` (28px).
- **Coloring:** Inherits semantic text color (`currentColor`) or matches status token (e.g. `text-emerald-400`, `text-amber-400`).

---

## 6. Styling Approach

- **Utility-First + CSS Variables:** Core layout and typography leverage Tailwind utilities; theme tokens map to `:root` CSS variables.
- **Dark-Mode First:** `class="dark"` on root HTML document with explicit `color-scheme: dark`.
- **Zero-Layout-Shift Persistent DOM:** Main navigation uses persistent keep-alive (`style={{ display: currentTab === id ? 'block' : 'none' }}`) to preserve component memory and deliver 0ms transitions.
- **Data Densities:**
  - Table Rows: `py-3 px-4` for high-density inventory views.
  - KPI Cards: Grid columns with responsive breakpoints (`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`).

---

## 7. Project Structure & Architecture

```
project/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Multi-tenant PostgreSQL schema
│   │   └── seed.ts             # Tenant A & B seed script
│   └── src/
│       ├── controllers/        # Tenant-filtered controller logic
│       ├── middleware/         # JWT auth & error handling
│       └── services/           # Inventory atomic transaction locking
├── frontend/
│   ├── src/
│   │   ├── components/         # Layout & atomic UI primitives
│   │   ├── context/            # AuthContext & InventoryDataContext (cache store)
│   │   ├── lib/                # API client, currency formatter
│   │   ├── pages/              # Domain screens (Dashboard, Products, Orders, etc.)
│   │   └── types/              # Unified TypeScript definitions
│   └── tailwind.config.js      # Design tokens
├── DESIGN_SYSTEM_RULES.md      # This file (Figma MCP reference)
└── DESIGN.md                   # Semantic design system for Google Stitch
```

---

## 8. Figma & Stitch MCP Guidelines

When using Figma Code Connect or Google Stitch MCP:
1. **Never hardcode hex values in UI code**; use semantic Tailwind classes (`bg-surface-elevated`, `text-status-success`, `border-border-subtle`).
2. **Align Figma auto-layouts** with flexbox/grid gap tokens (`gap-2` = 8px, `gap-4` = 16px, `gap-6` = 24px).
3. **Number rendering** in Stitch designs or Figma components MUST always adopt monospace tabular digits (`.tabular-nums` / `Geist Mono`).
4. **All interactive components** must implement focus-visible rings and active press feedback.
