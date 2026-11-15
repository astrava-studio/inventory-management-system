import { PrismaClient, UserRole, MovementType, POStatus, SOStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Database Seed ---');

  // 1. Clean existing records (in reverse dependency order)
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

  console.log('Cleared existing records.');

  // 2. Create Users
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@inventory.local',
      passwordHash,
      fullName: 'Vikram Mehta (Admin)',
      role: UserRole.ADMIN,
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: 'manager@inventory.local',
      passwordHash,
      fullName: 'Priya Sharma (Manager)',
      role: UserRole.MANAGER,
    },
  });

  const staff = await prisma.user.create({
    data: {
      email: 'staff@inventory.local',
      passwordHash,
      fullName: 'Rahul Verma (Staff)',
      role: UserRole.STAFF,
    },
  });

  console.log(`Created 3 demo users (password: Password123!)`);

  // 3. Create Locations (Warehouses)
  const locBlr = await prisma.location.create({
    data: {
      code: 'WH-BLR',
      name: 'Bangalore Central Logistics Hub',
      address: 'Plot 42, Electronic City Phase 1, Bangalore, Karnataka',
      isActive: true,
    },
  });

  const locMum = await prisma.location.create({
    data: {
      code: 'WH-MUM',
      name: 'Mumbai Regional Distribution Hub',
      address: 'Bldg 7, Logistics Park, Bhiwandi, Mumbai, Maharashtra',
      isActive: true,
    },
  });

  console.log(`Created 2 warehouses: ${locBlr.code} and ${locMum.code}`);

  // 4. Create 8 Realistic Products
  const productsData = [
    {
      sku: 'SKU-IND-1001',
      name: 'Heavy Duty Industrial Drill 800W',
      description: 'High-torque corded industrial drill with ergonomic grip and variable speed.',
      category: 'Power Tools',
      unitOfMeasure: 'PCS',
      costPrice: 4200.0,
      sellingPrice: 5999.0,
      reorderPoint: 15,
    },
    {
      sku: 'SKU-IND-1002',
      name: 'Brushless Cordless Impact Driver 18V',
      description: 'Compact 18V lithium-ion impact driver with dual LED work lights.',
      category: 'Power Tools',
      unitOfMeasure: 'PCS',
      costPrice: 5800.0,
      sellingPrice: 8499.0,
      reorderPoint: 12,
    },
    {
      sku: 'SKU-SAF-2001',
      name: 'ANSI Certified Hard Hat with Ratchet',
      description: 'Vented high-density polyethylene protective helmet with 6-point suspension.',
      category: 'Safety & PPE',
      unitOfMeasure: 'PCS',
      costPrice: 450.0,
      sellingPrice: 799.0,
      reorderPoint: 30,
    },
    {
      sku: 'SKU-SAF-2002',
      name: 'Heavy-Duty Anti-Cut Work Gloves (L)',
      description: 'Level 5 cut-resistant polyurethane coated palm grip protective gloves.',
      category: 'Safety & PPE',
      unitOfMeasure: 'PAIRS',
      costPrice: 180.0,
      sellingPrice: 349.0,
      reorderPoint: 50,
    },
    {
      sku: 'SKU-MAT-3001',
      name: 'Precision Vernier Caliper 150mm',
      description: 'Stainless steel metric/inch digital measuring caliper with LCD display.',
      category: 'Measurement',
      unitOfMeasure: 'PCS',
      costPrice: 1250.0,
      sellingPrice: 1950.0,
      reorderPoint: 8,
    },
    {
      sku: 'SKU-ELC-4001',
      name: 'Industrial Grade Multi-Meter TRMS',
      description: 'True-RMS auto-ranging digital multimeter with temperature probe.',
      category: 'Electronics',
      unitOfMeasure: 'PCS',
      costPrice: 3100.0,
      sellingPrice: 4600.0,
      reorderPoint: 10,
    },
    {
      sku: 'SKU-CON-5001',
      name: 'M8 Stainless Steel Hex Bolts (Pack of 100)',
      description: 'Grade 304 corrosion-resistant metric hex head machine bolts.',
      category: 'Fasteners',
      unitOfMeasure: 'BOXES',
      costPrice: 320.0,
      sellingPrice: 550.0,
      reorderPoint: 25,
    },
    {
      sku: 'SKU-CON-5002',
      name: 'Heavy Duty Structural Silicone Sealant 310ml',
      description: 'High-performance neutral cure weatherproofing architectural sealant.',
      category: 'Consumables',
      unitOfMeasure: 'TUBES',
      costPrice: 210.0,
      sellingPrice: 380.0,
      reorderPoint: 40,
    },
  ];

  const products: Record<string, string> = {};

  for (const p of productsData) {
    const created = await prisma.product.create({ data: p });
    products[p.sku] = created.id;
  }

  console.log(`Created 8 industrial products.`);

  // 5. Initial Stock Levels & Movements (Opening Stock)
  const initialStockDist = [
    // BLR Warehouse
    { sku: 'SKU-IND-1001', loc: locBlr.id, onHand: 45, reserved: 0 },
    { sku: 'SKU-IND-1002', loc: locBlr.id, onHand: 30, reserved: 0 },
    { sku: 'SKU-SAF-2001', loc: locBlr.id, onHand: 80, reserved: 0 },
    { sku: 'SKU-SAF-2002', loc: locBlr.id, onHand: 150, reserved: 0 },
    { sku: 'SKU-MAT-3001', loc: locBlr.id, onHand: 20, reserved: 0 },
    { sku: 'SKU-ELC-4001', loc: locBlr.id, onHand: 18, reserved: 0 },
    { sku: 'SKU-CON-5001', loc: locBlr.id, onHand: 60, reserved: 0 },
    { sku: 'SKU-CON-5002', loc: locBlr.id, onHand: 95, reserved: 0 },

    // MUM Regional Warehouse (some intentionally low-stock to showcase alert system)
    { sku: 'SKU-IND-1001', loc: locMum.id, onHand: 10, reserved: 0 }, // <= reorderPoint 15!
    { sku: 'SKU-IND-1002', loc: locMum.id, onHand: 5, reserved: 0 },  // <= reorderPoint 12!
    { sku: 'SKU-SAF-2001', loc: locMum.id, onHand: 22, reserved: 0 }, // <= reorderPoint 30!
    { sku: 'SKU-SAF-2002', loc: locMum.id, onHand: 85, reserved: 0 },
    { sku: 'SKU-MAT-3001', loc: locMum.id, onHand: 4, reserved: 0 },  // <= reorderPoint 8!
    { sku: 'SKU-ELC-4001', loc: locMum.id, onHand: 7, reserved: 0 },  // <= reorderPoint 10!
    { sku: 'SKU-CON-5001', loc: locMum.id, onHand: 15, reserved: 0 }, // <= reorderPoint 25!
    { sku: 'SKU-CON-5002', loc: locMum.id, onHand: 50, reserved: 0 },
  ];

  for (const stock of initialStockDist) {
    const productId = products[stock.sku];
    await prisma.inventoryLevel.create({
      data: {
        productId,
        locationId: stock.loc,
        onHand: stock.onHand,
        reserved: stock.reserved,
      },
    });

    await prisma.stockMovement.create({
      data: {
        productId,
        locationId: stock.loc,
        type: MovementType.ADJUSTMENT,
        quantityDelta: stock.onHand,
        beforeOnHand: 0,
        afterOnHand: stock.onHand,
        referenceType: 'MANUAL',
        reasonCode: 'OPENING_STOCK',
        notes: 'Initial warehouse opening stock allocation',
        performedById: admin.id,
      },
    });
  }

  console.log(`Seeded opening inventory levels and movements.`);

  // 6. Create 1 Open PO (Status: ORDERED)
  const poNumber = `PO-20261115-1001`;
  await prisma.purchaseOrder.create({
    data: {
      poNumber,
      supplierName: 'Bosch Industrial Supplies Ltd.',
      locationId: locBlr.id,
      status: POStatus.ORDERED,
      orderedAt: new Date(),
      notes: 'Urgent restocking order for upcoming project phase.',
      createdById: manager.id,
      items: {
        create: [
          {
            productId: products['SKU-IND-1001'],
            quantity: 25,
            unitCost: 4150.0,
          },
          {
            productId: products['SKU-IND-1002'],
            quantity: 20,
            unitCost: 5750.0,
          },
        ],
      },
    },
  });

  console.log(`Created 1 open PO (${poNumber}, status: ORDERED).`);

  // 7. Create 1 Confirmed SO (Status: CONFIRMED with reserved inventory)
  const soNumber = `SO-20261115-2001`;
  const reservedQty1 = 5;
  const reservedQty2 = 10;

  // Reserve stock for SO items
  await prisma.inventoryLevel.update({
    where: {
      productId_locationId: {
        productId: products['SKU-IND-1001'],
        locationId: locBlr.id,
      },
    },
    data: { reserved: reservedQty1 },
  });

  await prisma.inventoryLevel.update({
    where: {
      productId_locationId: {
        productId: products['SKU-SAF-2001'],
        locationId: locBlr.id,
      },
    },
    data: { reserved: reservedQty2 },
  });

  await prisma.salesOrder.create({
    data: {
      soNumber,
      customerName: 'Apex Infrastructure & Heavy Civil Corp',
      locationId: locBlr.id,
      status: SOStatus.CONFIRMED,
      confirmedAt: new Date(),
      notes: 'Scheduled for dispatch tomorrow morning with site gate pass.',
      createdById: manager.id,
      items: {
        create: [
          {
            productId: products['SKU-IND-1001'],
            quantity: reservedQty1,
            unitPrice: 5999.0,
          },
          {
            productId: products['SKU-SAF-2001'],
            quantity: reservedQty2,
            unitPrice: 799.0,
          },
        ],
      },
    },
  });

  console.log(`Created 1 confirmed SO (${soNumber}, status: CONFIRMED with reserved stock).`);
  console.log('--- Seed Completed Successfully ---');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
