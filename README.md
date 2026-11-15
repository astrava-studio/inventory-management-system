# ASTRAVA Multi-Location Inventory Management System (Phase 1 MVP)

A production-grade, multi-location inventory management platform engineered for operational resilience, zero-race concurrency safety, and strict audit compliance.

---

## 1. Architecture Overview

This project is structured as a TypeScript monorepo containing two core applications:

```text
├── backend/
│   ├── prisma/
│   │   ├── migrations/          # PostgreSQL schema migrations with CHECK constraints
│   │   ├── schema.prisma        # Prisma data models & relations
│   │   └── seed.ts              # Idempotent seed data (users, locations, products, orders)
│   ├── src/
│   │   ├── controllers/         # HTTP request handlers & Zod input validation
│   │   ├── middleware/          # JWT authentication, RBAC, and centralized error handler
│   │   ├── routes/              # Express API route declarations
│   │   ├── services/            # Zero-race InventoryService with row locking & atomic transactions
│   │   ├── lib/                 # Global PrismaClient singleton
│   │   ├── types/               # Strong typing & DTOs
│   │   ├── app.ts               # Express application configuration & CORS
│   │   └── server.ts            # HTTP server entrypoint
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/          # Sidebar, TopBar, and responsive dark-mode Layout
│   │   │   └── ui/              # Badges, Buttons, Cards, Modals
│   │   ├── context/             # AuthContext (JWT session management & role persistence)
│   │   ├── lib/                 # Fetch-based API client with automatic auth headers & error handling
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx     # Executive KPIs, low-stock radar, and recent ledger feed
│   │   │   ├── ProductsPage.tsx      # Product catalog, CSV bulk import/export, modal forms
│   │   │   ├── InventoryPage.tsx     # Multi-warehouse stock matrix & audited adjustment modal
│   │   │   ├── PurchaseOrdersPage.tsx# Procurement lifecycle (Draft ➔ Ordered ➔ Received)
│   │   │   ├── SalesOrdersPage.tsx   # Sales lifecycle (Draft ➔ Confirmed/Reserved ➔ Fulfilled)
│   │   │   ├── TransfersPage.tsx     # Inter-warehouse logistics (Pending ➔ In Transit ➔ Received)
│   │   │   ├── LedgerPage.tsx        # Immutable filterable double-entry stock audit trail
│   │   │   └── LoginPage.tsx         # Dark-themed login with 1-click role switcher
│   │   ├── types/               # Frontend TypeScript interfaces matching backend DTOs
│   │   ├── App.tsx              # Tab router & state orchestration
│   │   └── main.tsx             # React DOM root
│   ├── tailwind.config.js       # Slate/Indigo warehouse operational palette
│   └── vite.config.ts           # Vite bundler with proxy to backend port 4000
│
├── package.json                 # Monorepo root scripts
└── README.md
```

---

## 2. Core Business Invariants & Zero-Race Guarantees

1. **Negative Inventory Prevention at the Database Level:**
   - Enforced by PostgreSQL `CHECK` constraints in `migration.sql`:
     - `CHECK (on_hand >= 0)`
     - `CHECK (reserved >= 0)`
     - `CHECK (reserved <= on_hand)`
     - `CHECK (source_location_id <> destination_location_id)`
2. **Transaction-Scoped Row Locking (`SELECT ... FOR UPDATE`):**
   - Stock adjustments, order reservations, order fulfillments, and inter-location transfers lock the specific `inventory_levels` rows within an atomic Prisma transaction.
   - Product IDs are strictly sorted before locking to eliminate circular wait conditions and prevent database deadlocks.
3. **No Direct Quantity on Products:**
   - Products do not have a quantity column.
   - All stock quantities live in `inventory_levels (productId, locationId)`.
   - `available = on_hand - reserved` is computed deterministically in code and query projections.
4. **Immutable Audit Ledger (`stock_movements`):**
   - Every change to physical `on_hand` stock creates an immutable audit row recording `quantityDelta`, `beforeOnHand`, `afterOnHand`, `type`, `referenceType`, `referenceId`, `reasonCode`, and the `performedById` operator.
   - There are zero silent balance overwrites.
5. **Connection Resilience for Cloud PostgreSQL (Aiven Free Tier):**
   - Aiven Free Tier enforces a hard ceiling of 20 concurrent connections with no connection pooling proxy.
   - The backend uses a global singleton Prisma instance with connection limits:
     `DATABASE_URL="postgres://...?sslmode=require&connection_limit=5&pool_timeout=15"`

---

## 3. Seed Data & Demo Accounts

The database seed script populates 3 users with bcrypt-hashed passwords:

| Email | Role | Password | Access Capabilities |
| :--- | :--- | :--- | :--- |
| `admin@inventory.local` | `ADMIN` | `Password123!` | Full system access: catalog, adjustments, all orders, transfers, audit logs |
| `manager@inventory.local` | `MANAGER` | `Password123!` | Operational access: catalog, adjustments, orders, transfers, audit logs |
| `staff@inventory.local` | `STAFF` | `Password123!` | Execution access: receive POs, dispatch/receive transfers, view inventory & catalog |

### Locations Created:
- **`WH-BLR`**: Bangalore Central Logistics Hub (Karnataka)
- **`WH-MUM`**: Mumbai Port Distribution Hub (Maharashtra)

### Initial Catalog (8 Commercial SKUs):
- `ELEC-IP15-128`: Apple iPhone 15 (128GB, Midnight Black)
- `ELEC-S24U-256`: Samsung Galaxy S24 Ultra (256GB, Titanium Gray)
- `ELEC-MBP-M3`: MacBook Pro 14" M3 Pro (18GB, 512GB SSD)
- `ELEC-SONY-XM5`: Sony WH-1000XM5 Wireless Headphones
- `ACC-USB-C-2M`: Anker PowerLine III USB-C Cable (2m, Braided)
- `ACC-GAN-65W`: Baseus 65W GaN Fast Wall Charger
- `OFF-ERGO-CHAIR`: ErgoPro Mesh Office Task Chair
- `OFF-STAND-DESK`: Apex Dual-Motor Height Adjustable Standing Desk

---

## 4. Quickstart Setup Guide

### Prerequisites
- **Node.js** v20+ or v22+
- **PostgreSQL** (Aiven Cloud, Neon, Supabase, or local PostgreSQL 15+)

### 1. Configure Backend Environment
Navigate to `backend/` and configure `.env`:
```bash
cd backend
cp .env.example .env
```

Ensure your `.env` contains your valid PostgreSQL connection string:
```ini
PORT=4000
NODE_ENV=development
DATABASE_URL="postgres://avnadmin:YOUR_PASSWORD@your-aiven-host:port/defaultdb?sslmode=require&connection_limit=5&pool_timeout=15"
JWT_SECRET="astrava-phase1-super-secret-jwt-key-2026-production"
JWT_EXPIRES_IN="7d"
CORS_ORIGIN="http://localhost:3000"
```

### 2. Generate Prisma Client & Run Migrations
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
```
*(Or use `npx prisma db push` if initializing without migration history on cloud DB)*

### 3. Seed Database
```bash
npx prisma db seed
```
This seeds the initial 3 users, 2 warehouses, 8 products, distributed inventory levels, 1 open PO, and 1 confirmed SO with active stock reservation.

### 4. Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

### 5. Run the Application
Open two terminals (or run from the monorepo root):

**Terminal 1 (Backend API on http://localhost:4000):**
```bash
npm run dev:backend
# or: cd backend && npm run dev
```

**Terminal 2 (Frontend on http://localhost:3000):**
```bash
npm run dev:frontend
# or: cd frontend && npm run dev
```

Visit **`http://localhost:3000`** in your browser. Use the 1-click demo buttons on the login page to sign in as Admin, Manager, or Staff.

---

## 5. Available Scripts

From the repository root:
- `npm run dev:backend` — Starts the backend Express server with `tsx watch`
- `npm run dev:frontend` — Starts the Vite frontend dev server with hot reload
- `npm run typecheck` — Runs `tsc --noEmit` on both backend and frontend to verify zero TypeScript errors
- `npm run build:backend` — Compiles TypeScript backend to `backend/dist`
- `npm run build:frontend` — Builds production Vite bundle to `frontend/dist`
- `npm run prisma:generate` — Re-generates Prisma Client types
- `npm run prisma:seed` — Runs the idempotent database seed script

---

## 6. Verification Checklist

- [x] Backend compilation passes with zero errors: `cd backend && npm run typecheck`
- [x] Frontend compilation passes with zero errors: `cd frontend && npm run typecheck`
- [x] Database check constraints prevent negative inventory and self-referencing transfers
- [x] Transaction-scoped pessimistic row locks (`SELECT ... FOR UPDATE`) prevent concurrency race conditions
- [x] Full operational UI covering Catalog, Stock Levels, Procurement, Sales, Inter-Warehouse Transfers, and Ledger Audit Trail
- [x] 1-Click Role Switcher for instant testing of RBAC permissions
