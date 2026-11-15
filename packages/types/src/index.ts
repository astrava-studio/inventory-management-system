export type UserRole = 'ADMIN' | 'MANAGER' | 'STAFF';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  organizationId: string;
  assignedLocationIds: string[];
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface Location {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  address?: string;
  isActive: boolean;
}

export interface Category {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
}

export interface Product {
  id: string;
  organizationId: string;
  categoryId: string;
  sku: string;
  name: string;
  description?: string;
  unitOfMeasure: string;
  minThreshold: number;
  isActive: boolean;
  category?: Category;
}

export interface StockBalance {
  id: string;
  organizationId: string;
  locationId: string;
  productId: string;
  onHand: number;
  reserved: number;
  available: number;
  averageUnitCost: number;
  totalValue: number;
  product?: Product;
  location?: Location;
}

export type MovementType =
  | 'PURCHASE_RECEIPT'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT';

export interface StockMovement {
  id: string;
  organizationId: string;
  locationId: string;
  productId: string;
  movementType: MovementType;
  quantity: number;
  unitCost: number;
  balanceAfter: number;
  referenceType?: string;
  referenceId?: string;
  reason?: string;
  createdAt: string;
  product?: Product;
  location?: Location;
}

export type TransferStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'DISPATCHED'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED';

export interface StockTransferItem {
  id: string;
  transferId: string;
  productId: string;
  requestedQty: number;
  dispatchedQty?: number;
  receivedQty?: number;
  product?: Product;
}

export interface StockTransfer {
  id: string;
  organizationId: string;
  transferNumber: string;
  sourceLocationId: string;
  destinationLocationId: string;
  status: TransferStatus;
  requestedById: string;
  approvedById?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  sourceLocation?: Location;
  destinationLocation?: Location;
  items: StockTransferItem[];
}
