import { Router, Request, Response } from 'express';
import { prisma } from '../../prisma';
import { MovementType, AdjustmentReason } from '@prisma/client';
import { Prisma } from '@prisma/client';

const router = Router();

// 1. Get stock balances with filters
router.get('/balances', async (req: Request, res: Response) => {
  try {
    const { locationId, search } = req.query;

    const where: any = {};
    if (locationId && typeof locationId === 'string') {
      where.locationId = locationId;
    }
    if (search && typeof search === 'string') {
      where.product = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const balances = await prisma.stockBalance.findMany({
      where,
      include: {
        product: {
          include: { category: true },
        },
        location: true,
      },
      orderBy: { product: { sku: 'asc' } },
    });

    const formatted = balances.map((b) => {
      const onHand = Number(b.onHand);
      const reserved = Number(b.reserved);
      const available = onHand - reserved;
      const unitCost = Number(b.averageUnitCost);
      const totalValue = Number((onHand * unitCost).toFixed(2));
      const minThreshold = Number(b.product.minThreshold);

      return {
        id: b.id,
        locationId: b.locationId,
        locationName: b.location.name,
        locationCode: b.location.code,
        productId: b.productId,
        productName: b.product.name,
        sku: b.product.sku,
        category: b.product.category.name,
        unitOfMeasure: b.product.unitOfMeasure,
        onHand,
        reserved,
        available,
        averageUnitCost: unitCost,
        totalValue,
        minThreshold,
        isLowStock: onHand <= minThreshold,
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching stock balances:', error);
    res.status(500).json({ error: 'Failed to fetch inventory balances' });
  }
});

// 2. Get immutable stock movement audit ledger
router.get('/movements', async (req: Request, res: Response) => {
  try {
    const { locationId, productId, limit } = req.query;

    const where: any = {};
    if (locationId && typeof locationId === 'string') where.locationId = locationId;
    if (productId && typeof productId === 'string') where.productId = productId;

    const movements = await prisma.stockMovement.findMany({
      where,
      include: {
        product: true,
        location: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit ? Number(limit) : 50,
    });

    const formatted = movements.map((m) => ({
      id: m.id,
      timestamp: m.createdAt,
      locationName: m.location.name,
      locationCode: m.location.code,
      productSku: m.product.sku,
      productName: m.product.name,
      movementType: m.movementType,
      quantity: Number(m.quantity),
      unitCost: Number(m.unitCost),
      balanceAfter: Number(m.balanceAfter),
      referenceType: m.referenceType,
      reason: m.reason,
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    res.status(500).json({ error: 'Failed to load stock movements' });
  }
});

// 3. Controlled Inventory Adjustment with strict non-negative check
router.post('/adjustments', async (req: Request, res: Response): Promise<void> => {
  try {
    const { locationId, productId, deltaQuantity, reason, notes, userId } = req.body;

    if (!locationId || !productId || deltaQuantity === undefined || !reason) {
      res.status(400).json({ error: 'Missing required adjustment fields' });
      return;
    }

    const delta = new Prisma.Decimal(deltaQuantity);
    if (delta.equals(0)) {
      res.status(400).json({ error: 'Adjustment delta cannot be zero' });
      return;
    }

    // Execute within transaction
    const result = await prisma.$transaction(async (tx) => {
      const balance = await tx.stockBalance.findFirst({
        where: { locationId, productId },
      });

      if (!balance) {
        throw new Error('Stock balance record does not exist for this location and product');
      }

      const currentOnHand = balance.onHand;
      const currentReserved = balance.reserved;
      const newOnHand = currentOnHand.add(delta);

      // INVARIANT: Negative stock strictly blocked!
      if (newOnHand.lessThan(0)) {
        throw new Error(`Negative stock violation: current on-hand (${currentOnHand}) cannot be reduced by ${delta.abs()}`);
      }

      // INVARIANT: On hand cannot fall below reserved!
      if (newOnHand.lessThan(currentReserved)) {
        throw new Error(`Available stock violation: new on-hand (${newOnHand}) would be lower than reserved stock (${currentReserved})`);
      }

      // Update balance
      const updatedBalance = await tx.stockBalance.update({
        where: { id: balance.id },
        data: {
          onHand: newOnHand,
          updatedAt: new Date(),
        },
      });

      // Record adjustment audit log
      const isPositive = delta.greaterThan(0);
      await tx.inventoryAdjustment.create({
        data: {
          organizationId: balance.organizationId,
          locationId,
          productId,
          deltaQuantity: delta,
          reason: reason as AdjustmentReason,
          notes,
          createdById: userId,
        },
      });

      // Record immutable stock movement
      const movement = await tx.stockMovement.create({
        data: {
          organizationId: balance.organizationId,
          locationId,
          productId,
          movementType: isPositive ? MovementType.ADJUSTMENT_IN : MovementType.ADJUSTMENT_OUT,
          quantity: delta.abs(),
          unitCost: balance.averageUnitCost,
          balanceAfter: newOnHand,
          referenceType: 'MANUAL_ADJUSTMENT',
          reason: `${reason}: ${notes || 'Manual stock correction'}`,
        },
      });

      return { updatedBalance, movement };
    });

    res.json({
      success: true,
      message: 'Adjustment recorded successfully',
      newOnHand: Number(result.updatedBalance.onHand),
      movementId: result.movement.id,
    });
  } catch (error: any) {
    console.error('Adjustment error:', error.message);
    res.status(400).json({ error: error.message || 'Failed to process adjustment' });
  }
});

export default router;
