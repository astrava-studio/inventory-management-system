-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'STAFF');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('PURCHASE_RECEIPT', 'SALES_DISPATCH', 'TRANSFER_OUT', 'TRANSFER_IN', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "POStatus" AS ENUM ('DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SOStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'FULFILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STAFF',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "unit_of_measure" TEXT NOT NULL DEFAULT 'PCS',
    "cost_price" DECIMAL(12,2) NOT NULL,
    "selling_price" DECIMAL(12,2) NOT NULL,
    "reorder_point" INTEGER NOT NULL DEFAULT 10,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_levels" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "on_hand" INTEGER NOT NULL DEFAULT 0,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "type" "MovementType" NOT NULL,
    "quantity_delta" INTEGER NOT NULL,
    "before_on_hand" INTEGER NOT NULL,
    "after_on_hand" INTEGER NOT NULL,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "reason_code" TEXT,
    "notes" TEXT,
    "performed_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "po_number" TEXT NOT NULL,
    "supplier_name" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "status" "POStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "ordered_at" TIMESTAMP(3),
    "received_at" TIMESTAMP(3),
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_cost" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_orders" (
    "id" TEXT NOT NULL,
    "so_number" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "status" "SOStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "fulfilled_at" TIMESTAMP(3),
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_order_items" (
    "id" TEXT NOT NULL,
    "sales_order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "sales_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transfers" (
    "id" TEXT NOT NULL,
    "transfer_number" TEXT NOT NULL,
    "source_location_id" TEXT NOT NULL,
    "destination_location_id" TEXT NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transfer_items" (
    "id" TEXT NOT NULL,
    "stock_transfer_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "stock_transfer_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "locations_code_key" ON "locations"("code");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE INDEX "products_category_idx" ON "products"("category");

-- CreateIndex
CREATE INDEX "inventory_levels_location_id_idx" ON "inventory_levels"("location_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_levels_product_id_location_id_key" ON "inventory_levels"("product_id", "location_id");

-- CreateIndex
CREATE INDEX "stock_movements_product_id_location_id_created_at_idx" ON "stock_movements"("product_id", "location_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "stock_movements_reference_type_reference_id_idx" ON "stock_movements"("reference_type", "reference_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_po_number_key" ON "purchase_orders"("po_number");

-- CreateIndex
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders"("status");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_order_items_purchase_order_id_product_id_key" ON "purchase_order_items"("purchase_order_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_orders_so_number_key" ON "sales_orders"("so_number");

-- CreateIndex
CREATE INDEX "sales_orders_status_idx" ON "sales_orders"("status");

-- CreateIndex
CREATE UNIQUE INDEX "sales_order_items_sales_order_id_product_id_key" ON "sales_order_items"("sales_order_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_transfers_transfer_number_key" ON "stock_transfers"("transfer_number");

-- CreateIndex
CREATE INDEX "stock_transfers_status_idx" ON "stock_transfers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "stock_transfer_items_stock_transfer_id_product_id_key" ON "stock_transfer_items"("stock_transfer_id", "product_id");

-- AddForeignKey
ALTER TABLE "inventory_levels" ADD CONSTRAINT "inventory_levels_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_levels" ADD CONSTRAINT "inventory_levels_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_performed_by_id_fkey" FOREIGN KEY ("performed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_items" ADD CONSTRAINT "sales_order_items_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_items" ADD CONSTRAINT "sales_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_source_location_id_fkey" FOREIGN KEY ("source_location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_destination_location_id_fkey" FOREIGN KEY ("destination_location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_stock_transfer_id_fkey" FOREIGN KEY ("stock_transfer_id") REFERENCES "stock_transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =============================================================================
-- PART 2: MANDATORY POSTGRESQL CHECK CONSTRAINTS
-- =============================================================================

ALTER TABLE "inventory_levels"
  ADD CONSTRAINT "chk_inventory_on_hand_non_negative" CHECK ("on_hand" >= 0),
  ADD CONSTRAINT "chk_inventory_reserved_non_negative" CHECK ("reserved" >= 0),
  ADD CONSTRAINT "chk_inventory_reserved_lte_on_hand" CHECK ("reserved" <= "on_hand");

ALTER TABLE "stock_transfers"
  ADD CONSTRAINT "chk_transfer_distinct_locations" CHECK ("source_location_id" <> "destination_location_id");
