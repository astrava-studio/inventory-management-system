import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from '../types/index.js';
import { AppError } from '../middleware/error.middleware.js';

const updateWorkspaceSchema = z.object({
  name: z.string().trim().min(2, 'Workspace name must be at least 2 characters').optional(),
  currency: z.string().trim().length(3, 'Currency must be a 3-letter code (e.g. INR, USD, EUR)').optional().transform((v) => v?.toUpperCase()),
});

const inviteUserSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required'),
  email: z.string().email('Valid email is required').toLowerCase(),
  password: z.string().min(6, 'Temporary password must be at least 6 characters'),
  role: z.enum(['ADMIN', 'MANAGER', 'STAFF']).default('STAFF'),
});

const updateStatusSchema = z.object({
  isActive: z.boolean(),
});

export const getWorkspace = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);

    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user.tenantId },
      include: {
        _count: {
          select: {
            users: true,
            locations: true,
            products: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new AppError('Workspace not found', 404);
    }

    res.json({ workspace: tenant });
  } catch (error) {
    next(error);
  }
};

export const updateWorkspace = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    if (req.user.role !== 'ADMIN') {
      throw new AppError('Only workspace Admins can update workspace configuration', 403);
    }

    const validated = updateWorkspaceSchema.parse(req.body);

    const updated = await prisma.tenant.update({
      where: { id: req.user.tenantId },
      data: validated,
    });

    res.json({
      message: 'Workspace settings updated successfully',
      workspace: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const getTeamUsers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);

    const users = await prisma.user.findMany({
      where: { tenantId: req.user.tenantId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ users });
  } catch (error) {
    next(error);
  }
};

export const inviteTeamUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    if (req.user.role !== 'ADMIN') {
      throw new AppError('Only workspace Admins can add team members', 403);
    }

    const { fullName, email, password, role } = inviteUserSchema.parse(req.body);

    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new AppError('A user with this email address already exists.', 409);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        tenantId: req.user.tenantId,
        fullName,
        email,
        passwordHash,
        role,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      message: 'Team member added successfully',
      user,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleUserStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    if (req.user.role !== 'ADMIN') {
      throw new AppError('Only workspace Admins can change member status', 403);
    }

    const targetUserId = req.params.id as string;
    if (targetUserId === req.user.id) {
      throw new AppError('You cannot deactivate your own administrative account', 400);
    }

    const { isActive } = updateStatusSchema.parse(req.body);

    const targetUser = await prisma.user.findFirst({
      where: { id: targetUserId, tenantId: req.user.tenantId },
    });

    if (!targetUser) {
      throw new AppError('User not found in your workspace', 404);
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: { isActive },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
      },
    });

    res.json({
      message: `User account ${isActive ? 'activated' : 'deactivated'} successfully`,
      user: updated,
    });
  } catch (error) {
    next(error);
  }
};
