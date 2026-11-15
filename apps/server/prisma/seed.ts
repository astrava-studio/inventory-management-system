import { PrismaClient, Role, MovementType, TransferStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting ASTRAVA inventory seed...');

  // 1. Organization
  const org = await prisma.organization.upsert({
    where: { slug: 'astrava-global' },
    update: {},
    create: {
      name: 'ASTRAVA Global Logistics',
      slug: 'astrava-global',
    },
  });

  // 2. Locations
  const locDC = await prisma.location.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'DC-01' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Main Distribution Center',
      code: 'DC-01',
      address: '742 Evergreen Logistics Blvd, Sector 4',
      isActive: true,
    },
  });

  const locStore = await prisma.location.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'STORE-01' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Downtown Retail Flagship',
      code: 'STORE-01',
      address: '104 Metro Commercial Hub',
      isActive: true,
    },
  });

  const locWest = await prisma.location.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'WH-WEST' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'West Coast Transit Hub',
      code: 'WH-WEST',
      address: '88 Portside Way, Dock 12',
      isActive: true,
    },
  });

  // 3. Users
  const passwordHash = await bcrypt.hash('password123', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@astrava.io' },
    update: {},
    create: {
      organizationId: org.id,
      email: 'admin@astrava.io',
      fullName: 'Karan Patel (Lead Admin)',
      passwordHash,
      role: Role.ADMIN,
    },
  });

  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@astrava.io' },
    update: {},
    create: {
      organizationId: org.id,
      email: 'manager@astrava.io',
      fullName: 'Elena Vance (DC Operations Manager)',
      passwordHash,
      role: Role.MANAGER,
    },
  });

  const staffUser = await prisma.user.upsert({
    where: { email: 'staff@astrava.io' },
    update: {},
    create: {
      organizationId: org.id,
      email: 'staff@astrava.io',
      fullName: 'Marcus Brody (Warehouse Associate)',
      passwordHash,
      role: Role.STAFF,
    },
  });

  // Location Access
  await prisma.userLocationAccess.deleteMany({ where: { userId: adminUser.id } });
  await prisma.userLocationAccess.createMany({
    data: [
      { userId: adminUser.id, locationId: locDC.id },
      { userId: adminUser.id, locationId: locStore.id },
      { userId: adminUser.id, locationId: locWest.id },
      { userId: managerUser.id, locationId: locDC.id },
      { userId: managerUser.id, locationId: locWest.id },
      { userId: staffUser.id, locationId: locDC.id },
    ],
  });

  // 4. Categories
  const catCompute = await prisma.category.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Compute & Processing' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Compute & Processing',
      description: 'Microprocessors, logic boards, and computing units',
    },
  });

  const catThermal = await prisma.category.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Thermal Management' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Thermal Management',
      description: 'Heat exchangers, radiators, and cooling manifolds',
    },
  });

  const catOptics = await prisma.category.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'High-Speed Optics' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'High-Speed Optics',
      description: 'Laser diodes, fiber transceivers, and optical couplers',
    },
  });

  // 5. Products
  const productsData = [
    {
      sku: 'AST-CPU-900',
      name: 'Quantum Core Accelerator X1',
      categoryId: catCompute.id,
      unitOfMeasure: 'units',
      minThreshold: 15,
      costDC: 420.0,
      qtyDC: 85,
      costStore: 425.0,
      qtyStore: 12,
    },
    {
      sku: 'AST-RAD-450',
      name: 'Liquid-Metal Radiator Assembly',
      categoryId: catThermal.id,
      unitOfMeasure: 'units',
      minThreshold: 20,
      costDC: 135.5,
      qtyDC: 120,
      costStore: 140.0,
      qtyStore: 8,
    },
    {
      sku: 'AST-OPT-100G',
      name: '100G QSFP28 Optical Transceiver',
      categoryId: catOptics.id,
      unitOfMeasure: 'units',
      minThreshold: 30,
      costDC: 88.0,
      qtyDC: 240,
      costStore: 92.5,
      qtyStore: 45,
    },
    {
      sku: 'AST-SEN-8K',
      name: 'Ultra-Precision LIDAR Matrix',
      categoryId: catCompute.id,
      unitOfMeasure: 'units',
      minThreshold: 10,
      costDC: 650.0,
      qtyDC: 25,
      costStore: 650.0,
      qtyStore: 4, // Low stock alert!
    },
  ];

  for (const item of productsData) {
    const prod = await prisma.product.upsert({
      where: { organizationId_sku: { organizationId: org.id, sku: item.sku } },
      update: {},
      create: {
        organizationId: org.id,
        categoryId: item.categoryId,
        sku: item.sku,
        name: item.name,
        unitOfMeasure: item.unitOfMeasure,
        minThreshold: item.minThreshold,
        isActive: true,
      },
    });

    // DC balance
    await prisma.stockBalance.upsert({
      where: {
        organizationId_locationId_productId: {
          organizationId: org.id,
          locationId: locDC.id,
          productId: prod.id,
        },
      },
      update: {},
      create: {
        organizationId: org.id,
        locationId: locDC.id,
        productId: prod.id,
        onHand: item.qtyDC,
        reserved: item.sku === 'AST-CPU-900' ? 10 : 0,
        averageUnitCost: item.costDC,
      },
    });

    // Initial movement log for traceability
    await prisma.stockMovement.create({
      data: {
        organizationId: org.id,
        locationId: locDC.id,
        productId: prod.id,
        movementType: MovementType.PURCHASE_RECEIPT,
        quantity: item.qtyDC,
        unitCost: item.costDC,
        balanceAfter: item.qtyDC,
        referenceType: 'INITIAL_STOCK_SEED',
        reason: 'Initial warehouse intake balance',
      },
    });

    // Store balance
    await prisma.stockBalance.upsert({
      where: {
        organizationId_locationId_productId: {
          organizationId: org.id,
          locationId: locStore.id,
          productId: prod.id,
        },
      },
      update: {},
      create: {
        organizationId: org.id,
        locationId: locStore.id,
        productId: prod.id,
        onHand: item.qtyStore,
        reserved: 0,
        averageUnitCost: item.costStore,
      },
    });
  }

  // 6. Active Sample Transfer for State Machine Demo
  const sampleProduct = await prisma.product.findFirst({
    where: { sku: 'AST-CPU-900', organizationId: org.id },
  });

  if (sampleProduct) {
    const transfer = await prisma.stockTransfer.upsert({
      where: { transferNumber: 'TR-2026-0001' },
      update: {},
      create: {
        organizationId: org.id,
        transferNumber: 'TR-2026-0001',
        sourceLocationId: locDC.id,
        destinationLocationId: locStore.id,
        status: TransferStatus.PENDING_APPROVAL,
        requestedById: staffUser.id,
        notes: 'Replenishment for upcoming tech expo launch.',
        items: {
          create: [
            {
              productId: sampleProduct.id,
              requestedQty: 10,
            },
          ],
        },
        statusHistory: {
          create: [
            {
              fromStatus: null,
              toStatus: TransferStatus.DRAFT,
              changedById: staffUser.id,
              notes: 'Draft transfer created',
            },
            {
              fromStatus: TransferStatus.DRAFT,
              toStatus: TransferStatus.PENDING_APPROVAL,
              changedById: staffUser.id,
              notes: 'Submitted for manager authorization',
            },
          ],
        },
      },
    });
  }

  console.log('✅ ASTRAVA inventory seeded successfully!');
  console.log(`Demo Credentials:
  - Admin:   admin@astrava.io   / password123
  - Manager: manager@astrava.io / password123
  - Staff:   staff@astrava.io   / password123`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
