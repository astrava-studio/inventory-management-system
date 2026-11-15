import { Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from '../types/index.js';
import { InventoryService } from '../services/inventory.service.js';
import { AppError } from '../middleware/error.middleware.js';

const adjustmentSchema = z.object({
  productId: z.string().uuid(),
  locationId: z.string().uuid(),
  quantityDelta: z.number().int().refine((val) => val !== 0, {
    message: 'Quantity delta cannot be zero',
  }),
  reasonCode: z.enum(['DAMAGED', 'EXPIRED', 'SHRINKAGE', 'AUDIT_CORRECTION', 'OPENING_STOCK']),
  notes: z.string().trim().min(3, 'Audit notes must be at least 3 characters'),
});

export const getInventoryMatrix = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { locationId, category, lowStockOnly, search } = req.query;

    const whereProduct: Record<string, unknown> = { isActive: true };

    if (category && typeof category === 'string' && category !== 'ALL') {
      whereProduct.category = category;
    }

    if (search && typeof search === 'string') {
      whereProduct.OR = [
        { sku: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const whereInventory: Record<string, unknown> = {};
    if (locationId && typeof locationId === 'string' && locationId !== 'ALL') {
      whereInventory.locationId = locationId;
    }

    const products = await prisma.product.findMany({
      where: whereProduct,
      include: {
        inventoryLevels: {
          where: whereInventory,
          include: { location: true },
        },
      },
      orderBy: { sku: 'asc' },
    });

    let matrix = products.map((prod) => {
      let totalOnHand = 0;
      let totalReserved = 0;

      const levels = prod.inventoryLevels.map((lvl) => {
        totalOnHand += lvl.onHand;
        totalReserved += lvl.reserved;
        const available = lvl.onHand - lvl.reserved;
        return {
          id: lvl.id,
          locationId: lvl.locationId,
          locationCode: lvl.location.code,
          locationName: lvl.location.name,
          onHand: lvl.onHand,
          reserved: lvl.reserved,
          available,
          isLowStock: available <= prod.reorderPoint,
          updatedAt: lvl.updatedAt,
        };
      });

      const totalAvailable = totalOnHand - totalReserved;
      return {
        product: {
          id: prod.id,
          sku: prod.sku,
          name: prod.name,
          category: prod.category,
          unitOfMeasure: prod.unitOfMeasure,
          costPrice: Number(prod.costPrice),
          sellingPrice: Number(prod.sellingPrice),
          reorderPoint: prod.reorderPoint,
        },
        totalOnHand,
        totalReserved,
        totalAvailable,
        isLowStock: totalAvailable <= prod.reorderPoint,
        levels,
      };
    });

    if (lowStockOnly === 'true') {
      matrix = matrix.filter((m) => m.isLowStock);
    }

    res.json({ inventory: matrix });
  } catch (error) {
    next(error);
  }
};

export const recordStockAdjustment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);

    const validated = adjustmentSchema.parse(req.body);

    const result = await InventoryService.recordAdjustment({
      ...validated,
      performedById: req.user.id,
    });

    res.status(201).json({
      message: 'Stock adjustment recorded successfully',
      ...result,
    });
  } catch (error) {
    next(error);
  }
};
