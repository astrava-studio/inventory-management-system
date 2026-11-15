import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from '../types/index.js';

export const getDashboardKpis = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Total Active SKUs
    const totalActiveSkus = await prisma.product.count({
      where: { isActive: true },
    });

    // 2. Open Purchase Orders (DRAFT or ORDERED)
    const openPosCount = await prisma.purchaseOrder.count({
      where: { status: { in: ['DRAFT', 'ORDERED'] } },
    });

    // 3. Pending Sales Orders (DRAFT or CONFIRMED)
    const pendingSosCount = await prisma.salesOrder.count({
      where: { status: { in: ['DRAFT', 'CONFIRMED'] } },
    });

    // 4. Inventory valuation & Low-Stock count
    // Fetch all active products with their inventory levels
    const productsWithInventory = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        inventoryLevels: {
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

    // 5. Recent 10 Stock Movements
    const recentMovements = await prisma.stockMovement.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { sku: true, name: true, unitOfMeasure: true } },
        location: { select: { code: true, name: true } },
        performedBy: { select: { fullName: true, email: true } },
      },
    });

    res.json({
      kpis: {
        totalValuation: Math.round(totalValuation * 100) / 100,
        totalActiveSkus,
        lowStockSkuCount: lowStockCount,
        openPosCount,
        pendingSosCount,
      },
      lowStockAlerts: lowStockItems,
      recentMovements,
    });
  } catch (error) {
    next(error);
  }
};
