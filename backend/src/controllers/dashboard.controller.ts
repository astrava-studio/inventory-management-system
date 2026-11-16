import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from '../types/index.js';
import { AppError } from '../middleware/error.middleware.js';

export const getDashboardKpis = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const tenantId = req.user.tenantId;

    // 1. Total Active SKUs for this tenant
    const totalActiveSkus = await prisma.product.count({
      where: { tenantId, isActive: true },
    });

    // 2. Open Purchase Orders (DRAFT or ORDERED) for this tenant
    const openPosCount = await prisma.purchaseOrder.count({
      where: { tenantId, status: { in: ['DRAFT', 'ORDERED'] } },
    });

    // 3. Pending Sales Orders (DRAFT or CONFIRMED) for this tenant
    const pendingSosCount = await prisma.salesOrder.count({
      where: { tenantId, status: { in: ['DRAFT', 'CONFIRMED'] } },
    });

    // 4. Inventory valuation & Low-Stock count for this tenant
    const productsWithInventory = await prisma.product.findMany({
      where: { tenantId, isActive: true },
      include: {
        inventoryLevels: {
          where: { tenantId },
          include: { location: true },
        },
      },
    });

    let totalValuation = 0;
    let lowStockCount = 0;
    const lowStockItems: Array<{
      productId: string;
      sku: string;
      name: string;
      category: string;
      reorderPoint: number;
      totalOnHand: number;
      totalReserved: number;
      totalAvailable: number;
      costPrice: number;
      locations: Array<{
        locationId: string;
        locationCode: string;
        locationName: string;
        onHand: number;
        available: number;
      }>;
    }> = [];

    for (const prod of productsWithInventory) {
      let prodOnHand = 0;
      let prodReserved = 0;

      const locDetails = prod.inventoryLevels.map((lvl) => {
        prodOnHand += lvl.onHand;
        prodReserved += lvl.reserved;
        return {
          locationId: lvl.locationId,
          locationCode: lvl.location.code,
          locationName: lvl.location.name,
          onHand: lvl.onHand,
          available: lvl.onHand - lvl.reserved,
        };
      });

      const prodAvailable = prodOnHand - prodReserved;
      const cost = Number(prod.costPrice);
      totalValuation += prodOnHand * cost;

      if (prodAvailable <= prod.reorderPoint) {
        lowStockCount++;
        lowStockItems.push({
          productId: prod.id,
          sku: prod.sku,
          name: prod.name,
          category: prod.category,
          reorderPoint: prod.reorderPoint,
          totalOnHand: prodOnHand,
          totalReserved: prodReserved,
          totalAvailable: prodAvailable,
          costPrice: cost,
          locations: locDetails,
        });
      }
    }

    // 5. Recent 10 Stock Movements for this tenant
    const recentMovements = await prisma.stockMovement.findMany({
      where: { tenantId },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { sku: true, name: true, unitOfMeasure: true } },
        location: { select: { code: true, name: true } },
        performedBy: { select: { fullName: true, role: true } },
      },
    });

    // 6. Active locations count for this tenant
    const activeLocationsCount = await prisma.location.count({
      where: { tenantId, isActive: true },
    });

    res.json({
      kpis: {
        totalActiveSkus,
        totalValuation: Math.round(totalValuation * 100) / 100,
        lowStockCount,
        openPosCount,
        pendingSosCount,
        activeLocationsCount,
      },
      lowStockAlerts: lowStockItems,
      lowStockItems,
      recentMovements: recentMovements || [],
    });
  } catch (error) {
    next(error);
  }
};
