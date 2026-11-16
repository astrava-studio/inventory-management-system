export type UserRole = 'ADMIN' | 'MANAGER' | 'STAFF';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive?: boolean;
  tenantId: string;
  workspaceName?: string;
  currency?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Workspace {
  id: string;
  name: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    users: number;
    locations: number;
    products: number;
  };
}

export interface Location {
  id: string;
  code: string;
  name: string;
  address?: string | null;
  isActive: boolean;
  _count?: {
    inventoryLevels: number;
  };
}

export interface ProductLocationStock {
  locationId: string;
  locationCode: string;
  locationName: string;
  onHand: number;
  reserved: number;
  available: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  category: string;
  unitOfMeasure: string;
  costPrice: number;
  sellingPrice: number;
  reorderPoint: number;
  isActive: boolean;
  totalOnHand?: number;
  totalReserved?: number;
  totalAvailable?: number;
  locations?: ProductLocationStock[];
}

export interface InventoryItemLevel {
  id: string;
  locationId: string;
  locationCode: string;
  locationName: string;
  onHand: number;
  reserved: number;
  available: number;
  isLowStock: boolean;
  updatedAt: string;
}

export interface InventoryMatrixRow {
  product: Product;
  totalOnHand: number;
  totalReserved: number;
  totalAvailable: number;
  isLowStock: boolean;
  levels: InventoryItemLevel[];
}

export type POStatus = 'DRAFT' | 'ORDERED' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseOrderItem {
  id?: string;
  productId: string;
  quantity: number;
  unitCost: number;
  lineTotal?: number;
  product?: Product;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierName: string;
  locationId: string;
  status: POStatus;
  notes?: string | null;
  orderedAt?: string | null;
  receivedAt?: string | null;
  createdAt: string;
  totalAmount?: number;
  totalUnits?: number;
  location?: Location;
  createdBy?: { id: string; fullName: string; email: string };
  items: PurchaseOrderItem[];
}

export type SOStatus = 'DRAFT' | 'CONFIRMED' | 'FULFILLED' | 'CANCELLED';

export interface SalesOrderItem {
  id?: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  lineTotal?: number;
  availableAtLocation?: number;
  product?: Product;
}

export interface SalesOrder {
  id: string;
  soNumber: string;
  customerName: string;
  locationId: string;
  status: SOStatus;
  notes?: string | null;
  confirmedAt?: string | null;
  fulfilledAt?: string | null;
  createdAt: string;
  totalAmount?: number;
  totalUnits?: number;
  location?: Location;
  createdBy?: { id: string; fullName: string; email: string };
  items: SalesOrderItem[];
}

export type TransferStatus = 'PENDING' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';

export interface StockTransferItem {
  id?: string;
  productId: string;
  quantity: number;
  product?: Product;
}

export interface StockTransfer {
  id: string;
  transferNumber: string;
  sourceLocationId: string;
  destinationLocationId: string;
  status: TransferStatus;
  notes?: string | null;
  createdAt: string;
  completedAt?: string | null;
  totalUnits?: number;
  sourceLocation?: Location;
  destinationLocation?: Location;
  createdBy?: { id: string; fullName: string; email: string };
  items: StockTransferItem[];
}

export type MovementType =
  | 'PURCHASE_RECEIPT'
  | 'SALES_DISPATCH'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'ADJUSTMENT';

export interface StockMovement {
  id: string;
  productId: string;
  locationId: string;
  type: MovementType;
  quantityDelta: number;
  beforeOnHand: number;
  afterOnHand: number;
  referenceType?: string | null;
  referenceId?: string | null;
  reasonCode?: string | null;
  notes?: string | null;
  createdAt: string;
  product?: { sku: string; name: string; unitOfMeasure: string; category?: string };
  location?: { code: string; name: string };
  performedBy?: { fullName: string; email: string; role?: string };
}

export interface DashboardData {
  kpis: {
    totalValuation: number;
    totalActiveSkus: number;
    lowStockSkuCount: number;
    openPosCount: number;
    pendingSosCount: number;
    activeLocationsCount?: number;
  };
  lowStockAlerts: Array<{
    productId: string;
    sku: string;
    name: string;
    category: string;
    reorderPoint: number;
    totalOnHand: number;
    totalReserved: number;
    totalAvailable: number;
    costPrice: number;
    locations: Array<{
      locationId: string;
      locationCode: string;
      locationName: string;
      onHand: number;
      available: number;
    }>;
  }>;
  recentMovements: StockMovement[];
}
