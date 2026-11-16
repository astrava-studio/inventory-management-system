import { Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from '../types/index.js';
import { InventoryService } from '../services/inventory.service.js';
import { AppError } from '../middleware/error.middleware.js';
import { TransferStatus, Prisma } from '@prisma/client';

const transferItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive('Quantity must be greater than 0'),
});

const createTransferSchema = z
  .object({
    sourceLocationId: z.string().uuid('Valid source location is required'),
    destinationLocationId: z.string().uuid('Valid destination location is required'),
    notes: z.string().optional().nullable(),
    items: z.array(transferItemSchema).min(1, 'At least one item is required'),
  })
  .refine((data) => data.sourceLocationId !== data.destinationLocationId, {
    message: 'Source and destination locations must be different',
    path: ['destinationLocationId'],
  });

type TransferItemWithProduct = Prisma.StockTransferItemGetPayload<{
  include: { product: true };
}>;

export const getTransfers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const tenantId = req.user.tenantId;

    const { status, sourceId, destinationId } = req.query;

    const where: Record<string, unknown> = {
      tenantId,
    };

    if (status && typeof status === 'string' && status !== 'ALL') {
      where.status = status as TransferStatus;
    }

    if (sourceId && typeof sourceId === 'string' && sourceId !== 'ALL') {
      where.sourceLocationId = sourceId;
    }

    if (destinationId && typeof destinationId === 'string' && destinationId !== 'ALL') {
      where.destinationLocationId = destinationId;
    }

    const transfers = await prisma.stockTransfer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        sourceLocation: true,
        destinationLocation: true,
        createdBy: { select: { id: true, fullName: true, email: true } },
        items: {
          include: { product: true },
        },
      },
    });

    const enriched = transfers.map((t) => {
      const totalUnits = t.items.reduce(
        (sum: number, item: TransferItemWithProduct) => sum + item.quantity,
        0
      );
      return {
        ...t,
        totalUnits,
      };
    });

    res.json({ transfers: enriched });
  } catch (error) {
    next(error);
  }
};

export const getTransferById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const tenantId = req.user.tenantId;
    const id = req.params.id as string;

    const transfer = await prisma.stockTransfer.findFirst({
      where: { id, tenantId },
      include: {
        sourceLocation: true,
        destinationLocation: true,
        createdBy: { select: { id: true, fullName: true, email: true } },
        items: {
          include: { product: true },
        },
      },
    });

    if (!transfer) throw new AppError('Stock transfer not found', 404);

    const totalUnits = transfer.items.reduce(
      (sum: number, item: TransferItemWithProduct) => sum + item.quantity,
      0
    );

    res.json({ transfer: { ...transfer, totalUnits } });
  } catch (error) {
    next(error);
  }
};

export const createTransfer = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const tenantId = req.user.tenantId;

    const validated = createTransferSchema.parse(req.body);

    const [source, dest] = await Promise.all([
      prisma.location.findFirst({ where: { id: validated.sourceLocationId, tenantId } }),
      prisma.location.findFirst({ where: { id: validated.destinationLocationId, tenantId } }),
    ]);

    if (!source) throw new AppError('Source location not found in your workspace', 404);
    if (!dest) throw new AppError('Destination location not found in your workspace', 404);

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
    const transferNumber = `TR-${dateStr}-${randomSuffix}`;

    const transfer = await prisma.stockTransfer.create({
      data: {
        tenantId,
        transferNumber,
        sourceLocationId: validated.sourceLocationId,
        destinationLocationId: validated.destinationLocationId,
        notes: validated.notes,
        status: TransferStatus.PENDING,
        createdById: req.user.id,
        items: {
          create: validated.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        items: { include: { product: true } },
        sourceLocation: true,
        destinationLocation: true,
      },
    });

    res.status(201).json({ message: 'Stock transfer created', transfer });
  } catch (error) {
    next(error);
  }
};

export const dispatchTransfer = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const tenantId = req.user.tenantId;
    const id = req.params.id as string;

    const transfer = await prisma.stockTransfer.findFirst({ where: { id, tenantId } });
    if (!transfer) throw new AppError('Stock transfer not found', 404);

    if (transfer.status !== TransferStatus.PENDING) {
      throw new AppError(`Cannot dispatch transfer with status '${transfer.status}'. Must be PENDING.`, 400);
    }

    const updated = await prisma.stockTransfer.update({
      where: { id },
      data: { status: TransferStatus.IN_TRANSIT },
      include: {
        sourceLocation: true,
        destinationLocation: true,
        items: { include: { product: true } },
      },
    });

    res.json({ message: 'Stock transfer dispatched and marked IN_TRANSIT', transfer: updated });
  } catch (error) {
    next(error);
  }
};

export const completeTransfer = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const tenantId = req.user.tenantId;
    const id = req.params.id as string;

    const completed = await InventoryService.completeTransfer(id, req.user.id, tenantId);

    res.json({
      message: 'Stock transfer completed and quantities updated in both locations',
      transfer: completed,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelTransfer = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const tenantId = req.user.tenantId;
    const id = req.params.id as string;

    const transfer = await prisma.stockTransfer.findFirst({ where: { id, tenantId } });
    if (!transfer) throw new AppError('Stock transfer not found', 404);

    if (transfer.status === TransferStatus.COMPLETED) {
      throw new AppError('Cannot cancel a completed stock transfer', 400);
    }

    const updated = await prisma.stockTransfer.update({
      where: { id },
      data: { status: TransferStatus.CANCELLED },
    });

    res.json({ message: 'Stock transfer cancelled', transfer: updated });
  } catch (error) {
    next(error);
  }
};
