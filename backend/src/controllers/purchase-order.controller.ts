import { Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from '../types/index.js';
import { InventoryService } from '../services/inventory.service.js';
import { AppError } from '../middleware/error.middleware.js';
import { POStatus, Prisma } from '@prisma/client';

const poItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive('Quantity must be greater than 0'),
  unitCost: z.number().positive('Unit cost must be greater than 0'),
});

const createPoSchema = z.object({
  supplierName: z.string().trim().min(2, 'Supplier name is required'),
  locationId: z.string().uuid('Valid location is required'),
  notes: z.string().optional().nullable(),
  items: z.array(poItemSchema).min(1, 'At least one item is required'),
});

type PurchaseOrderItemWithProduct = Prisma.PurchaseOrderItemGetPayload<{
  include: { product: true };
}>;

export const getPurchaseOrders = async (
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
      where.status = status as POStatus;
    }

    if (locationId && typeof locationId === 'string' && locationId !== 'ALL') {
      where.locationId = locationId;
    }

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        location: true,
        createdBy: { select: { id: true, fullName: true, email: true } },
        items: {
          include: { product: true },
        },
      },
    });

    const enriched = purchaseOrders.map((po) => {
      const totalAmount = po.items.reduce(
        (sum: number, item: PurchaseOrderItemWithProduct) => sum + item.quantity * Number(item.unitCost),
        0
      );
      const totalUnits = po.items.reduce((sum: number, item: PurchaseOrderItemWithProduct) => sum + item.quantity, 0);

      return {
        ...po,
        totalAmount: Math.round(totalAmount * 100) / 100,
        totalUnits,
        items: po.items.map((i: PurchaseOrderItemWithProduct) => ({
          ...i,
          unitCost: Number(i.unitCost),
          lineTotal: Math.round(i.quantity * Number(i.unitCost) * 100) / 100,
        })),
      };
    });

    res.json({ purchaseOrders: enriched });
  } catch (error) {
    next(error);
  }
};

export const getPurchaseOrderById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const tenantId = req.user.tenantId;
    const id = req.params.id as string;

    const po = await prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
      include: {
        location: true,
        createdBy: { select: { id: true, fullName: true, email: true } },
        items: {
          include: { product: true },
        },
      },
    });

    if (!po) throw new AppError('Purchase order not found', 404);

    const totalAmount = po.items.reduce(
      (sum: number, item: PurchaseOrderItemWithProduct) => sum + item.quantity * Number(item.unitCost),
      0
    );

    res.json({
      purchaseOrder: {
        ...po,
        totalAmount: Math.round(totalAmount * 100) / 100,
        items: po.items.map((i: PurchaseOrderItemWithProduct) => ({
          ...i,
          unitCost: Number(i.unitCost),
          lineTotal: Math.round(i.quantity * Number(i.unitCost) * 100) / 100,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createPurchaseOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const tenantId = req.user.tenantId;

    const validated = createPoSchema.parse(req.body);

    const location = await prisma.location.findFirst({
      where: { id: validated.locationId, tenantId },
    });
    if (!location) throw new AppError('Location not found in your workspace', 404);

    // Validate all products belong to tenant
    const productIds = validated.items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, tenantId },
    });
    if (products.length !== productIds.length) {
      throw new AppError('One or more selected products were not found in your workspace', 400);
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const poNumber = `PO-${dateStr}-${randomSuffix}`;

    const po = await prisma.purchaseOrder.create({
      data: {
        tenantId,
        poNumber,
        supplierName: validated.supplierName,
        locationId: validated.locationId,
        notes: validated.notes,
        status: POStatus.DRAFT,
        createdById: req.user.id,
        items: {
          create: validated.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitCost: item.unitCost,
          })),
        },
      },
      include: {
        items: { include: { product: true } },
        location: true,
      },
    });

    res.status(201).json({ message: 'Purchase order created in DRAFT status', purchaseOrder: po });
  } catch (error) {
    next(error);
  }
};

export const markPoOrdered = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const tenantId = req.user.tenantId;
    const id = req.params.id as string;

    const po = await prisma.purchaseOrder.findFirst({ where: { id, tenantId } });
    if (!po) throw new AppError('Purchase order not found', 404);

    if (po.status !== POStatus.DRAFT) {
      throw new AppError(`Cannot mark PO ordered when in status '${po.status}'. Must be DRAFT.`, 400);
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: POStatus.ORDERED,
        orderedAt: new Date(),
      },
      include: { items: { include: { product: true } }, location: true },
    });

    res.json({ message: 'Purchase order marked as ORDERED', purchaseOrder: updated });
  } catch (error) {
    next(error);
  }
};

export const receivePurchaseOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const tenantId = req.user.tenantId;
    const id = req.params.id as string;

    const po = await prisma.purchaseOrder.findFirst({ where: { id, tenantId } });
    if (!po) throw new AppError('Purchase order not found in your workspace', 404);

    const receivedPo = await InventoryService.receivePurchaseOrder(id, req.user.id, tenantId);

    res.json({
      message: 'Purchase order received and stock quantities added to inventory',
      purchaseOrder: receivedPo,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelPurchaseOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const tenantId = req.user.tenantId;
    const id = req.params.id as string;

    const po = await prisma.purchaseOrder.findFirst({ where: { id, tenantId } });
    if (!po) throw new AppError('Purchase order not found', 404);

    if (po.status === POStatus.RECEIVED) {
      throw new AppError('Cannot cancel a received purchase order', 400);
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: POStatus.CANCELLED },
    });

    res.json({ message: 'Purchase order cancelled', purchaseOrder: updated });
  } catch (error) {
    next(error);
  }
};
