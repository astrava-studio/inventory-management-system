export type UserRole = 'ADMIN' | 'MANAGER' | 'STAFF';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  organizationId: string;
  organizationName: string;
  locations: Location[];
  defaultLocationId: string | null;
}

export interface Location {
  id: string;
  name: string;
  code: string;
  address?: string;
  isActive: boolean;
}

export interface StockBalance {
  id: string;
  locationId: string;
  locationName: string;
  locationCode: string;
  productId: string;
  productName: string;
  sku: string;
  category: string;
  unitOfMeasure: string;
  onHand: number;
  reserved: number;
  available: number;
  averageUnitCost: number;
  totalValue: number;
  minThreshold: number;
  isLowStock: boolean;
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

export interface TransferItem {
  id: string;
  productId: string;
  sku: string;
  name: string;
  unitOfMeasure: string;
  requestedQty: number;
  dispatchedQty: number | null;
  receivedQty: number | null;
}

export interface StockTransfer {
  id: string;
  transferNumber: string;
  status: TransferStatus;
  sourceLocation: Location;
  destinationLocation: Location;
  requestedBy: { id: string; name: string; email: string };
  approvedBy: { id: string; name: string; email: string } | null;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  items: TransferItem[];
  timeline: {
    id: string;
    fromStatus: TransferStatus | null;
    toStatus: TransferStatus;
    changedByName: string;
    notes?: string;
    timestamp: string;
  }[];
}

export interface StockMovement {
  id: string;
  timestamp: string;
  locationName: string;
  locationCode: string;
  productSku: string;
  productName: string;
  movementType: string;
  quantity: number;
  unitCost: number;
  balanceAfter: number;
  referenceType?: string;
  reason?: string;
}
