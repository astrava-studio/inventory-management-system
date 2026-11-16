import { PrismaClient, UserRole, MovementType, POStatus, SOStatus, TransferStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Multi-Tenant Database Seed ---');

  // 1. Clean existing records in reverse dependency order
  await prisma.stockMovement.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.salesOrderItem.deleteMany();
  await prisma.salesOrder.deleteMany();
  await prisma.stockTransferItem.deleteMany();
  await prisma.stockTransfer.deleteMany();
  await prisma.inventoryLevel.deleteMany();
  await prisma.product.deleteMany();
  await prisma.location.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  console.log('Cleared existing records.');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // =========================================================================
  // TENANT A: Astrava Industrial (Currency: INR)
  // =========================================================================
  const tenantA = await prisma.tenant.create({
    data: {
      name: 'Astrava Industrial Solutions',
      currency: 'INR',
    },
  });

  const adminA = await prisma.user.create({
    data: {
      tenantId: tenantA.id,
      email: 'admin@inventory.local',
      passwordHash,
      fullName: 'Vikram Mehta (Admin)',
      role: UserRole.ADMIN,
    },
  });

  const managerA = await prisma.user.create({
    data: {
      tenantId: tenantA.id,
      email: 'manager@inventory.local',
      passwordHash,
      fullName: 'Priya Sharma (Manager)',
      role: UserRole.MANAGER,
    },
  });

  const staffA = await prisma.user.create({
    data: {
      tenantId: tenantA.id,
      email: 'staff@inventory.local',
      passwordHash,
      fullName: 'Rahul Verma (Staff)',
      role: UserRole.STAFF,
    },
  });

  const locA1 = await prisma.location.create({
    data: {
      tenantId: tenantA.id,
      code: 'WH-BLR',
      name: 'Bangalore Central Logistics Hub',
      address: 'Plot 42, Electronic City Phase 1, Bangalore, KA - 560100',
    },
  });

  const locA2 = await prisma.location.create({
    data: {
      tenantId: tenantA.id,
      code: 'WH-MUM',
      name: 'Mumbai Regional Distribution Hub',
      address: 'Sector 19, Vashi Navi Mumbai, MH - 400705',
    },
  });

  // Products for Tenant A
  const pA1 = await prisma.product.create({
    data: {
      tenantId: tenantA.id,
      sku: 'SKU-IND-1001',
      name: 'Heavy Duty Industrial Drill 800W',
      description: 'High-torque corded industrial drill with ergonomic grip and variable speed.',
      category: 'Power Tools',
      unitOfMeasure: 'PCS',
      costPrice: 4200.0,
      sellingPrice: 5999.0,
      reorderPoint: 15,
    },
  });

  const pA2 = await prisma.product.create({
    data: {
      tenantId: tenantA.id,
      sku: 'SKU-IND-1002',
      name: 'Brushless Cordless Impact Driver 18V',
      description: 'Compact 18V lithium-ion impact driver with dual LED work lights.',
      category: 'Power Tools',
      unitOfMeasure: 'PCS',
      costPrice: 5800.0,
      sellingPrice: 8499.0,
      reorderPoint: 12,
    },
  });

  const pA3 = await prisma.product.create({
    data: {
      tenantId: tenantA.id,
      sku: 'SKU-SAF-2001',
      name: 'ANSI Certified Hard Hat with Ratchet',
      description: 'Vented high-density polyethylene protective helmet with 6-point suspension.',
      category: 'Safety & PPE',
      unitOfMeasure: 'PCS',
      costPrice: 450.0,
      sellingPrice: 799.0,
      reorderPoint: 30,
    },
  });

  const pA4 = await prisma.product.create({
    data: {
      tenantId: tenantA.id,
      sku: 'SKU-SAF-2002',
      name: 'Heavy-Duty Anti-Cut Work Gloves (L)',
      description: 'Level 5 cut-resistant polyurethane coated palm grip protective gloves.',
      category: 'Safety & PPE',
      unitOfMeasure: 'PAIRS',
      costPrice: 180.0,
      sellingPrice: 349.0,
      reorderPoint: 50,
    },
  });

  // Inventory Levels for Tenant A
  await prisma.inventoryLevel.createMany({
    data: [
      { tenantId: tenantA.id, productId: pA1.id, locationId: locA1.id, onHand: 45, reserved: 5 },
      { tenantId: tenantA.id, productId: pA1.id, locationId: locA2.id, onHand: 10, reserved: 0 },
      { tenantId: tenantA.id, productId: pA2.id, locationId: locA1.id, onHand: 30, reserved: 0 },
      { tenantId: tenantA.id, productId: pA2.id, locationId: locA2.id, onHand: 5, reserved: 0 },
      { tenantId: tenantA.id, productId: pA3.id, locationId: locA1.id, onHand: 80, reserved: 10 },
      { tenantId: tenantA.id, productId: pA3.id, locationId: locA2.id, onHand: 22, reserved: 0 },
      { tenantId: tenantA.id, productId: pA4.id, locationId: locA1.id, onHand: 150, reserved: 0 },
      { tenantId: tenantA.id, productId: pA4.id, locationId: locA2.id, onHand: 85, reserved: 0 },
    ],
  });

  // Stock Movement Ledger for Tenant A
  await prisma.stockMovement.create({
    data: {
      tenantId: tenantA.id,
      productId: pA1.id,
      locationId: locA1.id,
      type: MovementType.PURCHASE_RECEIPT,
      quantityDelta: 50,
      beforeOnHand: 0,
      afterOnHand: 50,
      referenceType: 'PO',
      referenceId: 'PO-INIT-001',
      notes: 'Initial warehouse intake receipt',
      performedById: adminA.id,
    },
  });

  // Sample Purchase Order for Tenant A
  const poA = await prisma.purchaseOrder.create({
    data: {
      tenantId: tenantA.id,
      poNumber: 'PO-ASTRAVA-1001',
      supplierName: 'Bosch Power Tools India Pvt Ltd',
      locationId: locA1.id,
      status: POStatus.ORDERED,
      orderedAt: new Date(),
      createdById: managerA.id,
      notes: 'Quarterly power tool procurement batch',
      items: {
        create: [
          { productId: pA1.id, quantity: 20, unitCost: 4100.0 },
          { productId: pA2.id, quantity: 15, unitCost: 5700.0 },
        ],
      },
    },
  });

  // Sample Sales Order for Tenant A
  await prisma.salesOrder.create({
    data: {
      tenantId: tenantA.id,
      soNumber: 'SO-ASTRAVA-2001',
      customerName: 'Larsen & Toubro Construction Ltd',
      locationId: locA1.id,
      status: SOStatus.CONFIRMED,
      confirmedAt: new Date(),
      createdById: managerA.id,
      notes: 'Site delivery for Metro line extension',
      items: {
        create: [
          { productId: pA1.id, quantity: 5, unitPrice: 5999.0 },
          { productId: pA3.id, quantity: 10, unitPrice: 799.0 },
        ],
      },
    },
  });

  console.log(`Tenant A created: ${tenantA.name} (${tenantA.id})`);

  // =========================================================================
  // TENANT B: Nexus Electronics (Currency: USD) - Proves Strict Multi-Tenant Isolation
  // =========================================================================
  const tenantB = await prisma.tenant.create({
    data: {
      name: 'Nexus Electronics Global',
      currency: 'USD',
    },
  });

  const adminB = await prisma.user.create({
    data: {
      tenantId: tenantB.id,
      email: 'admin@nexus.local',
      passwordHash,
      fullName: 'Sarah Jenkins (Admin)',
      role: UserRole.ADMIN,
    },
  });

  const managerB = await prisma.user.create({
    data: {
      tenantId: tenantB.id,
      email: 'manager@nexus.local',
      passwordHash,
      fullName: 'David Chen (Manager)',
      role: UserRole.MANAGER,
    },
  });

  // Notice: WH-BLR is identical code to Tenant A's location, demonstrating compound unique constraint @@unique([tenantId, code])!
  const locB1 = await prisma.location.create({
    data: {
      tenantId: tenantB.id,
      code: 'WH-BLR',
      name: 'Nexus Bangalore Tech Depot',
      address: '7th Cross, Koramangala, Bangalore, KA - 560034',
    },
  });

  const locB2 = await prisma.location.create({
    data: {
      tenantId: tenantB.id,
      code: 'WH-SFO',
      name: 'Nexus SFO Global Logistics Hub',
      address: '400 Oyster Point Blvd, South San Francisco, CA 94080',
    },
  });

  // Notice: SKU-IND-1001 is identical SKU to Tenant A, demonstrating compound unique constraint @@unique([tenantId, sku])!
  const pB1 = await prisma.product.create({
    data: {
      tenantId: tenantB.id,
      sku: 'SKU-IND-1001',
      name: 'Nexus Commercial PCB Soldering Kit',
      description: 'Precision temperature-controlled micro soldering rework station.',
      category: 'Electronics Equipment',
      unitOfMeasure: 'PCS',
      costPrice: 85.0,
      sellingPrice: 149.0,
      reorderPoint: 20,
    },
  });

  const pB2 = await prisma.product.create({
    data: {
      tenantId: tenantB.id,
      sku: 'SKU-NEX-5001',
      name: 'Nexus ARM Cortex-M4 IoT Controller',
      description: 'Ultra-low-power BLE & WiFi embedded gateway module with crypto engine.',
      category: 'Semiconductors',
      unitOfMeasure: 'PCS',
      costPrice: 12.5,
      sellingPrice: 28.0,
      reorderPoint: 100,
    },
  });

  await prisma.inventoryLevel.createMany({
    data: [
      { tenantId: tenantB.id, productId: pB1.id, locationId: locB1.id, onHand: 60, reserved: 0 },
      { tenantId: tenantB.id, productId: pB1.id, locationId: locB2.id, onHand: 120, reserved: 15 },
      { tenantId: tenantB.id, productId: pB2.id, locationId: locB1.id, onHand: 400, reserved: 50 },
      { tenantId: tenantB.id, productId: pB2.id, locationId: locB2.id, onHand: 850, reserved: 0 },
    ],
  });

  await prisma.stockMovement.create({
    data: {
      tenantId: tenantB.id,
      productId: pB2.id,
      locationId: locB2.id,
      type: MovementType.PURCHASE_RECEIPT,
      quantityDelta: 850,
      beforeOnHand: 0,
      afterOnHand: 850,
      referenceType: 'PO',
      referenceId: 'PO-NEXUS-001',
      notes: 'Initial SFO container shipment arrival',
      performedById: adminB.id,
    },
  });

  console.log(`Tenant B created: ${tenantB.name} (${tenantB.id})`);
  console.log('--- Multi-Tenant Database Seed Complete ---');
}

main()
  .catch((e) => {
    console.error('Seed Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
