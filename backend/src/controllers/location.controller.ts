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
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const locations = await prisma.location.findMany({
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
    const validated = locationSchema.parse(req.body);

    const existing = await prisma.location.findUnique({
      where: { code: validated.code },
    });

    if (existing) {
      throw new AppError(`Location with code '${validated.code}' already exists.`, 409);
    }

    const location = await prisma.location.create({
      data: validated,
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
    const id = req.params.id as string;
    const validated = locationSchema.partial().parse(req.body);

    const existing = await prisma.location.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Location not found', 404);
    }

    if (validated.code && validated.code !== existing.code) {
      const duplicateCode = await prisma.location.findUnique({
        where: { code: validated.code },
      });
      if (duplicateCode) {
        throw new AppError(`Location with code '${validated.code}' already exists.`, 409);
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
