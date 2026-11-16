import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';
import {
  DashboardData,
  Product,
  Location,
  InventoryMatrixRow,
  PurchaseOrder,
  SalesOrder,
  StockTransfer,
  StockMovement,
} from '../types';

export type InvalidationScope =
  | 'dashboard'
  | 'products'
  | 'inventory'
  | 'purchaseOrders'
  | 'salesOrders'
  | 'transfers'
  | 'ledger'
  | 'all';

interface LedgerFetchParams {
  page?: number;
  limit?: number;
  locationId?: string;
  productId?: string;
  movementType?: string;
  search?: string;
}

interface InventoryDataContextType {
  // In-memory Cached Data
  dashboard: DashboardData | null;
  products: Product[];
  locations: Location[];
  inventory: InventoryMatrixRow[];
  purchaseOrders: PurchaseOrder[];
  salesOrders: SalesOrder[];
  transfers: StockTransfer[];
  ledgerMovements: StockMovement[];
  ledgerTotal: number;

  // Status flags
  isDashboardLoading: boolean;
  isPrefetching: boolean;
  isPrefetchDone: boolean;

  // Targeted Fetch / Refreshers
  fetchDashboard: (force?: boolean) => Promise<DashboardData | null>;
  fetchProducts: (force?: boolean) => Promise<Product[]>;
  fetchLocations: (force?: boolean) => Promise<Location[]>;
  fetchInventory: (force?: boolean) => Promise<InventoryMatrixRow[]>;
  fetchPurchaseOrders: (force?: boolean) => Promise<PurchaseOrder[]>;
  fetchSalesOrders: (force?: boolean) => Promise<SalesOrder[]>;
  fetchTransfers: (force?: boolean) => Promise<StockTransfer[]>;
  fetchLedger: (params?: LedgerFetchParams) => Promise<{ movements: StockMovement[]; total: number }>;

  // Smart Invalidation
  invalidate: (scope: InvalidationScope) => Promise<void>;
  prefetchAllBackground: () => Promise<void>;
}

const InventoryDataContext = createContext<InventoryDataContextType | undefined>(undefined);

// Helper for safe sessionStorage read
const readSessionCache = <T,>(key: string, fallback: T): T => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

// Helper for safe sessionStorage write
const writeSessionCache = (key: string, data: unknown) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch {
    // SessionStorage full or unavailable
  }
};

export const InventoryDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  // In-memory data states initialized immediately from sessionStorage (0ms startup)
  const [dashboard, setDashboard] = useState<DashboardData | null>(() =>
    readSessionCache<DashboardData | null>('astrava_cache_dashboard', null)
  );
  const [products, setProducts] = useState<Product[]>(() =>
    readSessionCache<Product[]>('astrava_cache_products', [])
  );
  const [locations, setLocations] = useState<Location[]>(() =>
    readSessionCache<Location[]>('astrava_cache_locations', [])
  );
  const [inventory, setInventory] = useState<InventoryMatrixRow[]>(() =>
    readSessionCache<InventoryMatrixRow[]>('astrava_cache_inventory', [])
  );
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() =>
    readSessionCache<PurchaseOrder[]>('astrava_cache_pos', [])
  );
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>(() =>
    readSessionCache<SalesOrder[]>('astrava_cache_sos', [])
  );
  const [transfers, setTransfers] = useState<StockTransfer[]>(() =>
    readSessionCache<StockTransfer[]>('astrava_cache_transfers', [])
  );
  const [ledgerMovements, setLedgerMovements] = useState<StockMovement[]>(() =>
    readSessionCache<StockMovement[]>('astrava_cache_ledger_movements', [])
  );
  const [ledgerTotal, setLedgerTotal] = useState<number>(() =>
    readSessionCache<number>('astrava_cache_ledger_total', 0)
  );

  const [isDashboardLoading, setIsDashboardLoading] = useState<boolean>(!dashboard);
  const [isPrefetching, setIsPrefetching] = useState<boolean>(false);
  const [isPrefetchDone, setIsPrefetchDone] = useState<boolean>(false);

  // Guards against concurrent duplicate fetches
  const inFlightRef = useRef<Record<string, Promise<unknown> | undefined>>({});
  const prefetchStartedRef = useRef<boolean>(false);

  // 1. Fetch Dashboard (High Priority on Login)
  const fetchDashboard = useCallback(async (force = false): Promise<DashboardData | null> => {
    if (!force && inFlightRef.current['dashboard'] !== undefined) {
      return inFlightRef.current['dashboard'] as Promise<DashboardData | null>;
    }

    if (!dashboard) setIsDashboardLoading(true);

    const promise = (async () => {
      try {
        const res = await api.get<DashboardData>('/dashboard/kpis');
        setDashboard(res);
        writeSessionCache('astrava_cache_dashboard', res);
        return res;
      } catch (err) {
        console.error('[InventoryData] Failed to fetch dashboard:', err);
        return null;
      } finally {
        setIsDashboardLoading(false);
        delete inFlightRef.current['dashboard'];
      }
    })();

    inFlightRef.current['dashboard'] = promise;
    return promise;
  }, [dashboard]);

  // 2. Fetch Products
  const fetchProducts = useCallback(async (force = false): Promise<Product[]> => {
    if (!force && inFlightRef.current['products'] !== undefined) {
      return inFlightRef.current['products'] as Promise<Product[]>;
    }

    const promise = (async () => {
      try {
        const res = await api.get<{ products: Product[] }>('/products');
        setProducts(res.products);
        writeSessionCache('astrava_cache_products', res.products);
        return res.products;
      } catch (err) {
        console.error('[InventoryData] Failed to fetch products:', err);
        return [];
      } finally {
        delete inFlightRef.current['products'];
      }
    })();

    inFlightRef.current['products'] = promise;
    return promise;
  }, []);

  // 3. Fetch Locations
  const fetchLocations = useCallback(async (force = false): Promise<Location[]> => {
    if (!force && inFlightRef.current['locations'] !== undefined) {
      return inFlightRef.current['locations'] as Promise<Location[]>;
    }

    const promise = (async () => {
      try {
        const res = await api.get<{ locations: Location[] }>('/locations');
        setLocations(res.locations);
        writeSessionCache('astrava_cache_locations', res.locations);
        return res.locations;
      } catch (err) {
        console.error('[InventoryData] Failed to fetch locations:', err);
        return [];
      } finally {
        delete inFlightRef.current['locations'];
      }
    })();

    inFlightRef.current['locations'] = promise;
    return promise;
  }, []);

  // 4. Fetch Inventory Matrix
  const fetchInventory = useCallback(async (force = false): Promise<InventoryMatrixRow[]> => {
    if (!force && inFlightRef.current['inventory'] !== undefined) {
      return inFlightRef.current['inventory'] as Promise<InventoryMatrixRow[]>;
    }

    const promise = (async () => {
      try {
        const res = await api.get<{ inventory: InventoryMatrixRow[] }>('/inventory');
        setInventory(res.inventory);
        writeSessionCache('astrava_cache_inventory', res.inventory);
        return res.inventory;
      } catch (err) {
        console.error('[InventoryData] Failed to fetch inventory:', err);
        return [];
      } finally {
        delete inFlightRef.current['inventory'];
      }
    })();

    inFlightRef.current['inventory'] = promise;
    return promise;
  }, []);

  // 5. Fetch Purchase Orders
  const fetchPurchaseOrders = useCallback(async (force = false): Promise<PurchaseOrder[]> => {
    if (!force && inFlightRef.current['purchaseOrders'] !== undefined) {
      return inFlightRef.current['purchaseOrders'] as Promise<PurchaseOrder[]>;
    }

    const promise = (async () => {
      try {
        const res = await api.get<{ purchaseOrders: PurchaseOrder[] }>('/purchase-orders');
        setPurchaseOrders(res.purchaseOrders);
        writeSessionCache('astrava_cache_pos', res.purchaseOrders);
        return res.purchaseOrders;
      } catch (err) {
        console.error('[InventoryData] Failed to fetch purchase orders:', err);
        return [];
      } finally {
        delete inFlightRef.current['purchaseOrders'];
      }
    })();

    inFlightRef.current['purchaseOrders'] = promise;
    return promise;
  }, []);

  // 6. Fetch Sales Orders
  const fetchSalesOrders = useCallback(async (force = false): Promise<SalesOrder[]> => {
    if (!force && inFlightRef.current['salesOrders'] !== undefined) {
      return inFlightRef.current['salesOrders'] as Promise<SalesOrder[]>;
    }

    const promise = (async () => {
      try {
        const res = await api.get<{ salesOrders: SalesOrder[] }>('/sales-orders');
        setSalesOrders(res.salesOrders);
        writeSessionCache('astrava_cache_sos', res.salesOrders);
        return res.salesOrders;
      } catch (err) {
        console.error('[InventoryData] Failed to fetch sales orders:', err);
        return [];
      } finally {
        delete inFlightRef.current['salesOrders'];
      }
    })();

    inFlightRef.current['salesOrders'] = promise;
    return promise;
  }, []);

  // 7. Fetch Transfers
  const fetchTransfers = useCallback(async (force = false): Promise<StockTransfer[]> => {
    if (!force && inFlightRef.current['transfers'] !== undefined) {
      return inFlightRef.current['transfers'] as Promise<StockTransfer[]>;
    }

    const promise = (async () => {
      try {
        const res = await api.get<{ transfers: StockTransfer[] }>('/transfers');
        setTransfers(res.transfers);
        writeSessionCache('astrava_cache_transfers', res.transfers);
        return res.transfers;
      } catch (err) {
        console.error('[InventoryData] Failed to fetch transfers:', err);
        return [];
      } finally {
        delete inFlightRef.current['transfers'];
      }
    })();

    inFlightRef.current['transfers'] = promise;
    return promise;
  }, []);

  // 8. Fetch Ledger
  const fetchLedger = useCallback(
    async (params: LedgerFetchParams = {}): Promise<{ movements: StockMovement[]; total: number }> => {
      try {
        const queryParams = new URLSearchParams();
        queryParams.set('page', String(params.page || 1));
        queryParams.set('limit', String(params.limit || 25));
        if (params.locationId && params.locationId !== 'ALL') queryParams.set('locationId', params.locationId);
        if (params.productId && params.productId !== 'ALL') queryParams.set('productId', params.productId);
        if (params.movementType && params.movementType !== 'ALL') queryParams.set('type', params.movementType);
        if (params.search) queryParams.set('search', params.search);

        const res = await api.get<{
          movements: StockMovement[];
          pagination: { total: number };
        }>(`/ledger?${queryParams.toString()}`);

        // Cache initial page 1 default view
        if (!params.search && (!params.page || params.page === 1) && (!params.locationId || params.locationId === 'ALL')) {
          setLedgerMovements(res.movements);
          setLedgerTotal(res.pagination.total);
          writeSessionCache('astrava_cache_ledger_movements', res.movements);
          writeSessionCache('astrava_cache_ledger_total', res.pagination.total);
        }

        return { movements: res.movements, total: res.pagination.total };
      } catch (err) {
        console.error('[InventoryData] Failed to fetch ledger:', err);
        return { movements: [], total: 0 };
      }
    },
    []
  );

  // Background Prefetcher: Once dashboard is fetched, quietly load all other pages
  const prefetchAllBackground = useCallback(async () => {
    if (isPrefetching) return;
    setIsPrefetching(true);

    try {
      // Step A: Load core taxonomies (locations + products)
      await Promise.allSettled([fetchLocations(), fetchProducts()]);

      // Step B: Load inventory matrix & stock transfers
      await Promise.allSettled([fetchInventory(), fetchTransfers()]);

      // Step C: Load orders (purchase orders + sales orders)
      await Promise.allSettled([fetchPurchaseOrders(), fetchSalesOrders()]);

      // Step D: Load default ledger history
      await fetchLedger({ page: 1, limit: 25 });

      setIsPrefetchDone(true);
      console.log('[InventoryData] Background prefetch completed. All pages cached in memory & storage.');
    } catch (err) {
      console.warn('[InventoryData] Error during background prefetch:', err);
    } finally {
      setIsPrefetching(false);
    }
  }, [
    isPrefetching,
    fetchLocations,
    fetchProducts,
    fetchInventory,
    fetchTransfers,
    fetchPurchaseOrders,
    fetchSalesOrders,
    fetchLedger,
  ]);

  // Initial Load Flow: On login, fetch Dashboard first, then launch background prefetch
  useEffect(() => {
    if (!user) {
      // Clean up cache on logout
      setDashboard(null);
      setProducts([]);
      setLocations([]);
      setInventory([]);
      setPurchaseOrders([]);
      setSalesOrders([]);
      setTransfers([]);
      setLedgerMovements([]);
      setLedgerTotal(0);
      prefetchStartedRef.current = false;
      return;
    }

    if (prefetchStartedRef.current) return;
    prefetchStartedRef.current = true;

    // Fetch dashboard first, then defer prefetching slightly so dashboard render stays 60fps
    fetchDashboard().then(() => {
      const timer = setTimeout(() => {
        prefetchAllBackground();
      }, 150);
      return () => clearTimeout(timer);
    });
  }, [user, fetchDashboard, prefetchAllBackground]);

  // Smart Invalidation: Only reload data related to the changed domain
  const invalidate = useCallback(
    async (scope: InvalidationScope) => {
      console.log(`[InventoryData] Smart invalidation triggered for scope: '${scope}'`);
      switch (scope) {
        case 'products':
          // Product updated/added -> affects products catalog, inventory matrix, and dashboard KPIs
          await Promise.allSettled([
            fetchProducts(true),
            fetchInventory(true),
            fetchDashboard(true),
          ]);
          break;

        case 'inventory':
          // Stock adjustment / count correction -> affects inventory matrix, ledger, dashboard, and products available count
          await Promise.allSettled([
            fetchInventory(true),
            fetchDashboard(true),
            fetchLedger({ page: 1, limit: 25 }),
            fetchProducts(true),
          ]);
          break;

        case 'purchaseOrders':
          // PO created/received -> affects PO list, inventory matrix, ledger, products, and dashboard
          await Promise.allSettled([
            fetchPurchaseOrders(true),
            fetchInventory(true),
            fetchLedger({ page: 1, limit: 25 }),
            fetchDashboard(true),
            fetchProducts(true),
          ]);
          break;

        case 'salesOrders':
          // SO created/confirmed/fulfilled -> affects SO list, inventory reservations/on-hand, ledger, and dashboard
          await Promise.allSettled([
            fetchSalesOrders(true),
            fetchInventory(true),
            fetchLedger({ page: 1, limit: 25 }),
            fetchDashboard(true),
            fetchProducts(true),
          ]);
          break;

        case 'transfers':
          // Transfer dispatched/completed -> affects transfers list, inventory matrix, ledger, and dashboard
          await Promise.allSettled([
            fetchTransfers(true),
            fetchInventory(true),
            fetchLedger({ page: 1, limit: 25 }),
            fetchDashboard(true),
          ]);
          break;

        case 'dashboard':
          await fetchDashboard(true);
          break;

        case 'ledger':
          await fetchLedger({ page: 1, limit: 25 });
          break;

        case 'all':
        default:
          await Promise.allSettled([
            fetchDashboard(true),
            fetchProducts(true),
            fetchLocations(true),
            fetchInventory(true),
            fetchPurchaseOrders(true),
            fetchSalesOrders(true),
            fetchTransfers(true),
            fetchLedger({ page: 1, limit: 25 }),
          ]);
          break;
      }
    },
    [
      fetchProducts,
      fetchInventory,
      fetchDashboard,
      fetchLedger,
      fetchPurchaseOrders,
      fetchSalesOrders,
      fetchTransfers,
      fetchLocations,
    ]
  );

  return (
    <InventoryDataContext.Provider
      value={{
        dashboard,
        products,
        locations,
        inventory,
        purchaseOrders,
        salesOrders,
        transfers,
        ledgerMovements,
        ledgerTotal,
        isDashboardLoading,
        isPrefetching,
        isPrefetchDone,
        fetchDashboard,
        fetchProducts,
        fetchLocations,
        fetchInventory,
        fetchPurchaseOrders,
        fetchSalesOrders,
        fetchTransfers,
        fetchLedger,
        invalidate,
        prefetchAllBackground,
      }}
    >
      {children}
    </InventoryDataContext.Provider>
  );
};

export const useInventoryData = (): InventoryDataContextType => {
  const context = useContext(InventoryDataContext);
  if (!context) {
    throw new Error('useInventoryData must be used within an InventoryDataProvider');
  }
  return context;
};
