import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from '../types/index.js';
import { MovementType } from '@prisma/client';

export const getLedger = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
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

    const where: Record<string, unknown> = {};

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
