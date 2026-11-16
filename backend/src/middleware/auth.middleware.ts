import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { AuthenticatedRequest, AuthUser } from '../types/index.js';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('CRITICAL SECURITY CONFIGURATION ERROR: JWT_SECRET environment variable is missing in production.');
}

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-inventory-jwt-key-2026-phase1';

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Authentication required. No token provided.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    if (!decoded.tenantId) {
      res.status(401).json({ message: 'Invalid session token: missing workspace tenant identifier.' });
      return;
    }
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        message: `Forbidden: role '${req.user.role}' lacks permission for this action. Required: ${allowedRoles.join(', ')}`,
      });
      return;
    }

    next();
  };
};
