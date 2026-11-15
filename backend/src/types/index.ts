import { Request } from 'express';
import { UserRole } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export interface InventoryLevelDTO {
  id: string;
  productId: string;
  locationId: string;
  onHand: number;
  reserved: number;
  available: number;
  updatedAt: Date;
  product?: {
    id: string;
    sku: string;
    name: string;
    category: string;
    unitOfMeasure: string;
    costPrice: number;
    sellingPrice: number;
    reorderPoint: number;
  };
  location?: {
    id: string;
    code: string;
    name: string;
  };
}
