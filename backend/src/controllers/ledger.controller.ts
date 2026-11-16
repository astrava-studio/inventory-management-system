import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from '../types/index.js';
import { MovementType } from '@prisma/client';
import { AppError } from '../middleware/error.middleware.js';

export const getLedger = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const tenantId = req.user.tenantId;

    const {
      page = '1',
      limit = '25',
      productId,
      locationId,
      type,
      startDate,
      endDate,
      search,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 25));
    const skip = (pageNum - 1) * take;

    const where: Record<string, unknown> = {
      tenantId,
    };

    if (productId && typeof productId === 'string' && productId !== 'ALL') {
      where.productId = productId;
    }

    if (locationId && typeof locationId === 'string' && locationId !== 'ALL') {
      where.locationId = locationId;
    }

    if (type && typeof type === 'string' && type !== 'ALL') {
      where.type = type as MovementType;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate && typeof startDate === 'string') {
        (where.createdAt as Record<string, unknown>).gte = new Date(startDate);
      }
      if (endDate && typeof endDate === 'string') {
        (where.createdAt as Record<string, unknown>).lte = new Date(endDate);
      }
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { referenceId: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { product: { sku: { contains: search, mode: 'insensitive' } } },
        { product: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, movements] = await Promise.all([
      prisma.stockMovement.count({ where }),
      prisma.stockMovement.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: { id: true, sku: true, name: true, unitOfMeasure: true, category: true },
          },
          location: {
            select: { id: true, code: true, name: true },
          },
          performedBy: {
            select: { id: true, fullName: true, email: true, role: true },
          },
        },
      }),
    ]);

    res.json({
      movements,
      pagination: {
        page: pageNum,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const exportLedgerCsv = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const tenantId = req.user.tenantId;

    const movements = await prisma.stockMovement.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { sku: true, name: true } },
        location: { select: { code: true, name: true } },
        performedBy: { select: { fullName: true } },
      },
    });

    const headers = [
      'Timestamp',
      'Movement Type',
      'SKU',
      'Product Name',
      'Warehouse Code',
      'Warehouse Name',
      'Delta',
      'Before On Hand',
      'After On Hand',
      'Reference Type',
      'Reference ID',
      'Reason Code',
      'Performed By',
      'Notes',
    ];

    const rows = movements.map((m) => [
      `"${m.createdAt.toISOString()}"`,
      `"${m.type}"`,
      `"${m.product.sku.replace(/"/g, '""')}"`,
      `"${m.product.name.replace(/"/g, '""')}"`,
      `"${m.location.code.replace(/"/g, '""')}"`,
      `"${m.location.name.replace(/"/g, '""')}"`,
      m.quantityDelta,
      m.beforeOnHand,
      m.afterOnHand,
      `"${m.referenceType || ''}"`,
      `"${m.referenceId || ''}"`,
      `"${m.reasonCode || ''}"`,
      `"${m.performedBy.fullName.replace(/"/g, '""')}"`,
      `"${(m.notes || '').replace(/"/g, '""')}"`,
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="stock-ledger-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};
