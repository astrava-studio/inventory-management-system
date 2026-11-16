import { Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from '../types/index.js';
import { AppError } from '../middleware/error.middleware.js';

const locationSchema = z.object({
  code: z.string().trim().min(2).toUpperCase(),
  name: z.string().trim().min(2),
  address: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const getLocations = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const tenantId = req.user.tenantId;

    const locations = await prisma.location.findMany({
      where: { tenantId },
      orderBy: { code: 'asc' },
      include: {
        _count: {
          select: { inventoryLevels: true },
        },
      },
    });

    res.json({ locations });
  } catch (error) {
    next(error);
  }
};

export const createLocation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const tenantId = req.user.tenantId;

    const validated = locationSchema.parse(req.body);

    const existing = await prisma.location.findUnique({
      where: {
        tenantId_code: {
          tenantId,
          code: validated.code,
        },
      },
    });

    if (existing) {
      throw new AppError(`Location with code '${validated.code}' already exists in your workspace.`, 409);
    }

    const location = await prisma.location.create({
      data: {
        ...validated,
        tenantId,
      },
    });

    res.status(201).json({ message: 'Location created successfully', location });
  } catch (error) {
    next(error);
  }
};

export const updateLocation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const tenantId = req.user.tenantId;
    const id = req.params.id as string;
    const validated = locationSchema.partial().parse(req.body);

    const existing = await prisma.location.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new AppError('Location not found in this workspace', 404);
    }

    if (validated.code && validated.code !== existing.code) {
      const duplicateCode = await prisma.location.findUnique({
        where: {
          tenantId_code: {
            tenantId,
            code: validated.code,
          },
        },
      });
      if (duplicateCode) {
        throw new AppError(`Location with code '${validated.code}' already exists in your workspace.`, 409);
      }
    }

    const updated = await prisma.location.update({
      where: { id },
      data: validated,
    });

    res.json({ message: 'Location updated successfully', location: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteLocation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const tenantId = req.user.tenantId;
    const id = req.params.id as string;

    const existing = await prisma.location.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new AppError('Location not found in this workspace', 404);
    }

    // Check if any inventory row at this location has onHand > 0 or reserved > 0
    const activeInventory = await prisma.inventoryLevel.findFirst({
      where: {
        tenantId,
        locationId: id,
        OR: [
          { onHand: { gt: 0 } },
          { reserved: { gt: 0 } },
        ],
      },
    });

    if (activeInventory) {
      throw new AppError('Cannot deactivate warehouse with on-hand or reserved stock. Transfer or adjust inventory first.', 400);
    }

    // Soft delete / archive
    await prisma.location.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ message: 'Location archived successfully' });
  } catch (error) {
    next(error);
  }
};

export const restoreLocation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const tenantId = req.user.tenantId;
    const id = req.params.id as string;

    const existing = await prisma.location.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new AppError('Location not found in this workspace', 404);
    }

    await prisma.location.update({
      where: { id },
      data: { isActive: true },
    });

    res.json({ message: 'Location restored successfully' });
  } catch (error) {
    next(error);
  }
};
