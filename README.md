# ASTRAVA Inventory Management System

An **ASTRAVA studio demonstration project** exploring multi-location inventory management with transaction safety, perpetual weighted average costing, and fluid UI animations.

---

## 1. Project Architecture

Modular Monolith with an npm workspace monorepo:
* **Frontend (`apps/client`):** React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Framer Motion.
* **Backend (`apps/server`):** Node.js, Express.js, TypeScript, Prisma ORM, Zod, JWT Session Auth.
* **Shared Types (`packages/types`):** Contract-first TypeScript interfaces for entities, DTOs, and state machine enums.
* **Database:** Cloud-hosted PostgreSQL (Aiven Cloud) with SSL.

---

## 2. Core Business Invariants & Guarantees

1. **Zero Negative Stock:** Rejected at the database transaction level with invariant checks and pessimistic row locking (`SELECT ... FOR UPDATE`).
2. **Perpetual Weighted Average Cost:** Recomputed atomically on inventory intake and preserved during inter-location transfers.
3. **Traceable Movement Ledger:** Every stock delta creates an immutable row in `stock_movements`. No silent quantity overwrites.
4. **Approval-Gated Transfers:** 5-state lifecycle (`Draft` ➔ `Pending Approval` ➔ `Approved` ➔ `Dispatched` ➔ `Received / Completed`). Self-approval is strictly prohibited.

---

## 3. UI Motion & Tactile Interactions (Framer Motion)

* **Animated Location Switcher:** Layout-preserving pill sliding (`layoutId="activeLocationPill"`) across warehouse hubs.
* **Interactive Transfer Stepper:** Hero animated 5-step lifecycle with liquid connecting lines, pulsating active badges, and role-based action transitions.
* **Dynamic Stock Level Gauges:** Color-coded threshold bars (Green ➔ Amber ➔ Red) with real-time buffer warnings.
* **Animated Metric Counters:** Smooth number tickers for valuation and unit counts.
* **Controlled Adjustment Modal:** Spring-animated dialog with live balance preview and invariant violation alerts.

---

## 4. Quickstart & Local Development

### Prerequisites
* Node.js v20+ / v24+
* Cloud PostgreSQL connection string configured in `.env`

### Installation & Build
```bash
# 1. Install all dependencies across workspaces
npm install

# 2. Push schema to PostgreSQL database
npx prisma db push --schema=apps/server/prisma/schema.prisma

# 3. Seed database with demo locations, users, and SKUs
npx tsx apps/server/prisma/seed.ts

# 4. Build entire monorepo
npm run build
```

### Running the Services
```bash
# Terminal 1 — Start Express API Server (Port 5000)
npm run dev --workspace=apps/server

# Terminal 2 — Start Vite React Frontend (Port 3000)
npm run dev --workspace=apps/client
```

---

## 5. Demo Credentials

The database is pre-seeded with multi-location users:
* **Admin:** `admin@astrava.io` / `password123`
* **Manager:** `manager@astrava.io` / `password123`
* **Staff:** `staff@astrava.io` / `password123`

---

## 6. Project Documentation & Specifications
* [ERD Specification](docs/specs/ERD.md)
* [Valuation Calculation Rules](docs/specs/VALUATION_RULES.md)
* [Transfer State Machine](docs/specs/TRANSFER_STATE_MACHINE.md)
* [Concurrency & Locking Strategy](docs/specs/CONCURRENCY_STRATEGY.md)
* [Studio Working Standard](docs/ASTRAVA_STUDIO_STANDARD.md)
