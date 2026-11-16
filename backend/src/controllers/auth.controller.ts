import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest, AuthUser } from '../types/index.js';
import { AppError } from '../middleware/error.middleware.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-inventory-jwt-key-2026-phase1';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'];

const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Valid email is required').toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  workspaceName: z.string().trim().min(2, 'Workspace name must be at least 2 characters'),
  currency: z.string().trim().length(3, 'Currency must be a 3-letter code (e.g. INR, USD, EUR)').default('INR').transform((v) => v.toUpperCase()),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { tenant: true },
    });

    if (!user || !user.isActive) {
      throw new AppError('Invalid email or password', 401);
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    const payload: AuthUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      tenantId: user.tenantId,
      workspaceName: user.tenant.name,
      currency: user.tenant.currency,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.json({
      message: 'Login successful',
      token,
      user: payload,
    });
  } catch (error) {
    next(error);
  }
};

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { fullName, email, password, workspaceName, currency } = registerSchema.parse(req.body);

    // Check if email already registered
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new AppError('An account with this email already exists', 409);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Execute atomic creation of Tenant, Admin User, and Default Primary Warehouse
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Workspace Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: workspaceName,
          currency: currency || 'INR',
        },
      });

      // 2. Create Admin User
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: email.toLowerCase(),
          fullName,
          passwordHash,
          role: 'ADMIN',
          isActive: true,
        },
      });

      // 3. Create Default Primary Warehouse
      await tx.location.create({
        data: {
          tenantId: tenant.id,
          code: 'WH-MAIN',
          name: 'Main Distribution Center',
          address: 'Primary Facility',
          isActive: true,
        },
      });

      return { user, tenant };
    });

    const payload: AuthUser = {
      id: result.user.id,
      email: result.user.email,
      fullName: result.user.fullName,
      role: result.user.role,
      tenantId: result.tenant.id,
      workspaceName: result.tenant.name,
      currency: result.tenant.currency,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.status(201).json({
      message: 'Workspace created successfully',
      token,
      user: payload,
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized', 401);
    }

    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Incorrect current password', 400);
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { tenant: true },
    });

    if (!user || !user.isActive) {
      throw new AppError('User not found or inactive', 401);
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isActive: user.isActive,
        tenantId: user.tenantId,
        workspaceName: user.tenant.name,
        currency: user.tenant.currency,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};
