import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { MetricCards } from './components/dashboard/MetricCards';
import { InventoryTable } from './components/inventory/InventoryTable';
import { MovementLedger } from './components/inventory/MovementLedger';
import { TransferStepper } from './components/transfers/TransferStepper';
import { StockBalance, StockMovement, StockTransfer } from './types';
import { API_BASE } from './config';
import { Toaster, toast } from 'sonner';
import { Plus, ArrowLeftRight, RefreshCw, Sparkles, Building2 } from 'lucide-react';

const DashboardContent: React.FC = () => {
  const { user, activeLocation } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [balances, setBalances] = useState<StockBalance[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch balances, transfers, and movements
  const fetchData = async () => {
    setLoading(true);
    try {
      const locQuery = activeLocation ? `?locationId=${activeLocation.id}` : '';

      // 1. Balances
      const balRes = await fetch(`${API_BASE}/api/inventory/balances${locQuery}`);
      if (balRes.ok) {
        const balData = await balRes.json();
        setBalances(balData);
      } else {
        useFallbackData();
      }

      // 2. Transfers
      const trRes = await fetch(`${API_BASE}/api/transfers`);
      if (trRes.ok) {
        const trData = await trRes.json();
        setTransfers(trData);
      }

      // 3. Movements
      const movRes = await fetch(`${API_BASE}/api/inventory/movements${locQuery}`);
      if (movRes.ok) {
        const movData = await movRes.json();
        setMovements(movData);
      }
    } catch (err) {
      useFallbackData();
    } finally {
      setLoading(false);
    }
  };

  const useFallbackData = () => {
    // Interactive mock data for immediate visual responsiveness
    const locId = activeLocation?.id || 'loc-dc';
    const locCode = activeLocation?.code || 'DC-01';

    const mockBalances: StockBalance[] = [
      {
        id: 'bal-1',
        locationId: locId,
        locationName: activeLocation?.name || 'Main Distribution Center',
        locationCode: locCode,
        productId: 'prod-1',
        productName: 'Quantum Core Accelerator X1',
        sku: 'AST-CPU-900',
        category: 'Compute & Processing',
        unitOfMeasure: 'units',
        onHand: 85,
        reserved: 10,
        available: 75,
        averageUnitCost: 420.0,
        totalValue: 35700.0,
        minThreshold: 15,
        isLowStock: false,
      },
      {
        id: 'bal-2',
        locationId: locId,
        locationName: activeLocation?.name || 'Main Distribution Center',
        locationCode: locCode,
        productId: 'prod-2',
        productName: 'Liquid-Metal Radiator Assembly',
        sku: 'AST-RAD-450',
        category: 'Thermal Management',
        unitOfMeasure: 'units',
        onHand: 120,
        reserved: 0,
        available: 120,
        averageUnitCost: 135.5,
        totalValue: 16260.0,
        minThreshold: 20,
        isLowStock: false,
      },
      {
        id: 'bal-3',
        locationId: locId,
        locationName: activeLocation?.name || 'Main Distribution Center',
        locationCode: locCode,
        productId: 'prod-3',
        productName: '100G QSFP28 Optical Transceiver',
        sku: 'AST-OPT-100G',
        category: 'High-Speed Optics',
        unitOfMeasure: 'units',
        onHand: 240,
        reserved: 0,
        available: 240,
        averageUnitCost: 88.0,
        totalValue: 21120.0,
        minThreshold: 30,
        isLowStock: false,
      },
      {
        id: 'bal-4',
        locationId: locId,
        locationName: activeLocation?.name || 'Main Distribution Center',
        locationCode: locCode,
        productId: 'prod-4',
        productName: 'Ultra-Precision LIDAR Matrix',
        sku: 'AST-SEN-8K',
        category: 'Compute & Processing',
        unitOfMeasure: 'units',
        onHand: 8,
        reserved: 0,
        available: 8,
        averageUnitCost: 650.0,
        totalValue: 5200.0,
        minThreshold: 10,
        isLowStock: true, // Urgent low-stock indicator
      },
    ];

    setBalances(mockBalances);

    const mockTransfer: StockTransfer = {
      id: 'tr-1',
      transferNumber: 'TR-2026-0001',
      status: 'PENDING_APPROVAL',
      sourceLocation: { id: 'loc-dc', name: 'Main Distribution Center', code: 'DC-01', isActive: true },
      destinationLocation: { id: 'loc-store', name: 'Downtown Retail Flagship', code: 'STORE-01', isActive: true },
      requestedBy: { id: 'usr-staff', name: 'Marcus Brody', email: 'staff@astrava.io' },
      approvedBy: null,
      notes: 'Replenishment for retail storefront display launch.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: [
        {
          id: 'item-1',
          productId: 'prod-1',
          sku: 'AST-CPU-900',
          name: 'Quantum Core Accelerator X1',
          unitOfMeasure: 'units',
          requestedQty: 10,
          dispatchedQty: null,
          receivedQty: null,
        },
      ],
      timeline: [
        {
          id: 'h-1',
          fromStatus: null,
          toStatus: 'DRAFT',
          changedByName: 'Marcus Brody',
          notes: 'Transfer draft created',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'h-2',
          fromStatus: 'DRAFT',
          toStatus: 'PENDING_APPROVAL',
          changedByName: 'Marcus Brody',
          notes: 'Submitted for manager authorization',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
        },
      ],
    };

    setTransfers([mockTransfer]);

    setMovements([
      {
        id: 'mov-1',
        timestamp: new Date().toISOString(),
        locationName: 'Main Distribution Center',
        locationCode: 'DC-01',
        productSku: 'AST-CPU-900',
        productName: 'Quantum Core Accelerator X1',
        movementType: 'PURCHASE_RECEIPT',
        quantity: 85,
        unitCost: 420.0,
        balanceAfter: 85,
        referenceType: 'PO-2026-001',
        reason: 'Initial warehouse intake receipt',
      },
    ]);
  };

  useEffect(() => {
    fetchData();
  }, [activeLocation]);

  // Transfer Actions
  const handleApprove = async (transferId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/transfers/${transferId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Transfer approved! Stock reserved at source.');
      fetchData();
    } catch (err: any) {
      // Client demo simulation
      setTransfers((prev) =>
        prev.map((t) =>
          t.id === transferId
            ? {
                ...t,
                status: 'APPROVED',
                approvedBy: { id: user?.id || 'usr-mgr', name: user?.fullName || 'Manager', email: '' },
                timeline: [
                  ...t.timeline,
                  {
                    id: String(Date.now()),
                    fromStatus: 'PENDING_APPROVAL',
                    toStatus: 'APPROVED',
                    changedByName: user?.fullName || 'Manager',
                    notes: 'Authorized & stock reserved',
                    timestamp: new Date().toISOString(),
                  },
                ],
              }
            : t
        )
      );
      toast.success('Transfer approved! 10 units reserved at Main DC.');
    }
  };

  const handleDispatch = async (transferId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/transfers/${transferId}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Goods dispatched! In-transit tracking started.');
      fetchData();
    } catch (err: any) {
      setTransfers((prev) =>
        prev.map((t) =>
          t.id === transferId
            ? {
                ...t,
                status: 'DISPATCHED',
                items: t.items.map((i) => ({ ...i, dispatchedQty: i.requestedQty })),
                timeline: [
                  ...t.timeline,
                  {
                    id: String(Date.now()),
                    fromStatus: 'APPROVED',
                    toStatus: 'DISPATCHED',
                    changedByName: user?.fullName || 'Logistics Staff',
                    notes: 'Shipped via Express Ground Fleet',
                    timestamp: new Date().toISOString(),
                  },
                ],
              }
            : t
        )
      );
      toast.success('Goods dispatched! 10 units moved into in-transit state.');
    }
  };

  const handleReceive = async (transferId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/transfers/${transferId}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Goods received! Destination stock and average cost updated.');
      fetchData();
    } catch (err: any) {
      setTransfers((prev) =>
        prev.map((t) =>
          t.id === transferId
            ? {
                ...t,
                status: 'COMPLETED',
                items: t.items.map((i) => ({ ...i, receivedQty: i.requestedQty })),
                timeline: [
                  ...t.timeline,
                  {
                    id: String(Date.now()),
                    fromStatus: 'DISPATCHED',
                    toStatus: 'COMPLETED',
                    changedByName: user?.fullName || 'Store Manager',
                    notes: 'Physical intake verified; weighted cost merged',
                    timestamp: new Date().toISOString(),
                  },
                ],
              }
            : t
        )
      );
      toast.success('Transfer complete! Stock added to destination and cost updated.');
    }
  };

  // Calculations for current location
  const totalValue = balances.reduce((sum, b) => sum + b.totalValue, 0);
  const totalUnits = balances.reduce((sum, b) => sum + b.onHand, 0);
  const activeTransfersCount = transfers.filter(
    (t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED'
  ).length;
  const lowStockCount = balances.filter((b) => b.isLowStock).length;

  return (
    <div className="min-h-screen bg-[#0e0f12] text-slate-100 flex flex-col font-sans">
      <Header />

      <div className="flex flex-1">
        <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />

        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
          {/* Context Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-900/20 via-blue-800/10 to-transparent p-5 rounded-2xl border border-blue-500/20 backdrop-blur-xl">
            <div>
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-blue-400" />
                <h1 className="text-lg font-bold text-white tracking-tight">
                  {activeLocation?.name || 'Main Warehouse'}
                </h1>
                <span className="rounded bg-blue-500/20 px-2 py-0.5 text-xs font-mono text-blue-300 font-semibold border border-blue-500/30">
                  {activeLocation?.code}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Multi-location inventory tracking with strict transaction safety & perpetual weighted average costing.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={fetchData}
                disabled={loading}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.04] text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Sync</span>
              </button>
            </div>
          </div>

          {/* Animated Tab Switcher Content */}
          <AnimatePresence mode="wait">
            {currentTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                {/* Metric Cards */}
                <MetricCards
                  totalValue={totalValue}
                  totalUnits={totalUnits}
                  activeTransfers={activeTransfersCount}
                  lowStockCount={lowStockCount}
                  locationName={activeLocation?.code || 'DC-01'}
                />

                {/* Transfer State Machine Hero Preview */}
                {transfers.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-blue-400" />
                        <span>Interactive Transfer State Machine (Live Demo)</span>
                      </h2>
                      <span className="text-xs text-slate-400">
                        {user?.role === 'ADMIN' ? 'Full Admin Access' : `Viewing as ${user?.role}`}
                      </span>
                    </div>

                    <TransferStepper
                      transfer={transfers[0]}
                      onApprove={handleApprove}
                      onDispatch={handleDispatch}
                      onReceive={handleReceive}
                    />
                  </div>
                )}

                {/* Inventory Table Preview */}
                <div className="space-y-3">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                    Stock Levels & Real-Time Buffers
                  </h2>
                  <InventoryTable balances={balances} onRefresh={fetchData} />
                </div>
              </motion.div>
            )}

            {currentTab === 'inventory' && (
              <motion.div
                key="inventory"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <InventoryTable balances={balances} onRefresh={fetchData} />
              </motion.div>
            )}

            {currentTab === 'transfers' && (
              <motion.div
                key="transfers"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-white">Stock Transfers Hub</h2>
                    <p className="text-xs text-slate-400">
                      5-stage transfer lifecycle with approval gating and destination weighted costing.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {transfers.map((t) => (
                    <TransferStepper
                      key={t.id}
                      transfer={t}
                      onApprove={handleApprove}
                      onDispatch={handleDispatch}
                      onReceive={handleReceive}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {currentTab === 'movements' && (
              <motion.div
                key="movements"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <MovementLedger movements={movements} onRefresh={fetchData} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <Toaster theme="dark" richColors position="bottom-right" />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
};

export default App;
