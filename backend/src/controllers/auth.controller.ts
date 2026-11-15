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

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
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

export const getMe = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user || !user.isActive) {
      throw new AppError('User not found or inactive', 401);
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
};
