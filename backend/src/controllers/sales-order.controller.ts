import { Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from '../types/index.js';
import { InventoryService } from '../services/inventory.service.js';
import { AppError } from '../middleware/error.middleware.js';
import { SOStatus, Prisma } from '@prisma/client';

const soItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive('Quantity must be greater than 0'),
  unitPrice: z.number().positive('Unit price must be greater than 0'),
});

const createSoSchema = z.object({
  customerName: z.string().trim().min(2, 'Customer name is required'),
  locationId: z.string().uuid('Valid location is required'),
  notes: z.string().optional().nullable(),
  items: z.array(soItemSchema).min(1, 'At least one item is required'),
});

type SalesOrderItemWithProduct = Prisma.SalesOrderItemGetPayload<{
  include: {
    product: {
      include: { inventoryLevels: true };
    };
  };
}>;

export const getSalesOrders = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const tenantId = req.user.tenantId;

    const { status, locationId } = req.query;

    const where: Record<string, unknown> = {
      tenantId,
    };

    if (status && typeof status === 'string' && status !== 'ALL') {
      where.status = status as SOStatus;
    }

    if (locationId && typeof locationId === 'string' && locationId !== 'ALL') {
      where.locationId = locationId;
    }

    const salesOrders = await prisma.salesOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        location: true,
        createdBy: { select: { id: true, fullName: true, email: true } },
        items: {
          include: {
            product: {
              include: {
                inventoryLevels: {
                  where: { tenantId },
                },
              },
            },
          },
        },
      },
    });

    const enriched = salesOrders.map((so) => {
      const totalAmount = so.items.reduce(
        (sum: number, item: SalesOrderItemWithProduct) => sum + item.quantity * Number(item.unitPrice),
        0
      );
      const totalUnits = so.items.reduce((sum: number, item: SalesOrderItemWithProduct) => sum + item.quantity, 0);

      return {
        ...so,
        totalAmount: Math.round(totalAmount * 100) / 100,
        totalUnits,
        items: so.items.map((i: SalesOrderItemWithProduct) => {
          const locLevel = i.product.inventoryLevels.find((l) => l.locationId === so.locationId);
          const onHand = locLevel?.onHand ?? 0;
          const reserved = locLevel?.reserved ?? 0;
          return {
            ...i,
            unitPrice: Number(i.unitPrice),
            lineTotal: Math.round(i.quantity * Number(i.unitPrice) * 100) / 100,
            availableAtLocation: onHand - reserved,
          };
        }),
      };
    });

    res.json({ salesOrders: enriched });
  } catch (error) {
    next(error);
  }
};

export const getSalesOrderById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const tenantId = req.user.tenantId;
    const id = req.params.id as string;

    const so = await prisma.salesOrder.findFirst({
      where: { id, tenantId },
      include: {
        location: true,
        createdBy: { select: { id: true, fullName: true, email: true } },
        items: {
          include: {
            product: {
              include: {
                inventoryLevels: {
                  where: { tenantId },
                },
              },
            },
          },
        },
      },
    });

    if (!so) throw new AppError('Sales order not found', 404);

    const totalAmount = so.items.reduce(
      (sum: number, item: SalesOrderItemWithProduct) => sum + item.quantity * Number(item.unitPrice),
      0
    );

    res.json({
      salesOrder: {
        ...so,
        totalAmount: Math.round(totalAmount * 100) / 100,
        items: so.items.map((i: SalesOrderItemWithProduct) => {
          const locLevel = i.product.inventoryLevels.find((l) => l.locationId === so.locationId);
          const onHand = locLevel?.onHand ?? 0;
          const reserved = locLevel?.reserved ?? 0;
          return {
            ...i,
            unitPrice: Number(i.unitPrice),
            lineTotal: Math.round(i.quantity * Number(i.unitPrice) * 100) / 100,
            availableAtLocation: onHand - reserved,
          };
        }),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createSalesOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const tenantId = req.user.tenantId;

    const validated = createSoSchema.parse(req.body);

    const location = await prisma.location.findFirst({
      where: { id: validated.locationId, tenantId },
    });
    if (!location) throw new AppError('Location not found in your workspace', 404);

    // Validate products belong to tenant
    const productIds = validated.items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, tenantId },
    });
    if (products.length !== productIds.length) {
      throw new AppError('One or more selected products were not found in your workspace', 400);
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const soNumber = `SO-${dateStr}-${randomSuffix}`;

    const so = await prisma.salesOrder.create({
      data: {
        tenantId,
        soNumber,
        customerName: validated.customerName,
        locationId: validated.locationId,
        notes: validated.notes,
        status: SOStatus.DRAFT,
        createdById: req.user.id,
        items: {
          create: validated.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        },
      },
      include: {
        items: { include: { product: true } },
        location: true,
      },
    });

    res.status(201).json({ message: 'Sales order created in DRAFT status', salesOrder: so });
  } catch (error) {
    next(error);
  }
};

export const confirmSalesOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const tenantId = req.user.tenantId;
    const id = req.params.id as string;

    const confirmed = await InventoryService.confirmSalesOrder(id, req.user.id, tenantId);

    res.json({
      message: 'Sales order confirmed and stock reserved successfully',
      salesOrder: confirmed,
    });
  } catch (error) {
    next(error);
  }
};

export const fulfillSalesOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const tenantId = req.user.tenantId;
    const id = req.params.id as string;

    const fulfilled = await InventoryService.fulfillSalesOrder(id, req.user.id, tenantId);

    res.json({
      message: 'Sales order fulfilled and inventory dispatched',
      salesOrder: fulfilled,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelSalesOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const tenantId = req.user.tenantId;
    const id = req.params.id as string;

    const cancelled = await InventoryService.cancelSalesOrder(id, req.user.id, tenantId);

    res.json({
      message: 'Sales order cancelled',
      salesOrder: cancelled,
    });
  } catch (error) {
    next(error);
  }
};
