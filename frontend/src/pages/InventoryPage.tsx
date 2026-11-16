import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Location, InventoryMatrixRow } from '../types';
import { useAuth } from '../context/AuthContext';
import { useInventoryData } from '../context/InventoryDataContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { SlidersHorizontal, AlertTriangle, Layers, ArrowUpDown } from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const { user } = useAuth();
  const {
    inventory: storeInventory,
    locations: storeLocations,
    invalidate,
  } = useInventoryData();
  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [locations, setLocations] = useState<Location[]>(storeLocations);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('ALL');
  const [inventory, setInventory] = useState<InventoryMatrixRow[]>(storeInventory);
  const [isLoading, setIsLoading] = useState(() => storeInventory.length === 0);
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Sync with store cache when no active local filter
  useEffect(() => {
    if (storeLocations.length > 0) {
      setLocations(storeLocations);
    }
  }, [storeLocations]);

  useEffect(() => {
    if (selectedLocationId === 'ALL' && !lowStockOnly && storeInventory.length > 0) {
      setInventory(storeInventory);
      setIsLoading(false);
    }
  }, [storeInventory, selectedLocationId, lowStockOnly]);

  // Adjustment Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustProductId, setAdjustProductId] = useState('');
  const [adjustLocationId, setAdjustLocationId] = useState('');
  const [adjustDelta, setAdjustDelta] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<
    'DAMAGED' | 'EXPIRED' | 'SHRINKAGE' | 'AUDIT_CORRECTION' | 'OPENING_STOCK'
  >('AUDIT_CORRECTION');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState(false);

  const fetchLocations = async () => {
    try {
      const res = await api.get<{ locations: Location[] }>('/locations');
      setLocations(res.locations);
      sessionStorage.setItem('astrava_cache_locations', JSON.stringify(res.locations));
    } catch (err) {
      console.error('Failed to load locations:', err);
    }
  };

  const fetchInventory = async () => {
    if (inventory.length === 0) setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedLocationId !== 'ALL') params.append('locationId', selectedLocationId);
      if (lowStockOnly) params.append('lowStockOnly', 'true');

      const res = await api.get<{ inventory: InventoryMatrixRow[] }>(
        `/inventory?${params.toString()}`
      );
      setInventory(res.inventory);
      if (selectedLocationId === 'ALL' && !lowStockOnly) {
        sessionStorage.setItem('astrava_cache_inventory', JSON.stringify(res.inventory));
      }
    } catch (err) {
      console.error('Failed to load inventory matrix:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [selectedLocationId, lowStockOnly]);

  const openAdjustModal = (productId: string, locationId?: string) => {
    setAdjustProductId(productId);
    setAdjustLocationId(locationId || (locations[0]?.id ?? ''));
    setAdjustDelta(0);
    setAdjustReason('AUDIT_CORRECTION');
    setAdjustNotes('');
    setAdjustError(null);
    setIsAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingAdjustment(true);
    setAdjustError(null);

    try {
      await api.post('/inventory/adjustments', {
        productId: adjustProductId,
        locationId: adjustLocationId,
        quantityDelta: adjustDelta,
        reasonCode: adjustReason,
        notes: adjustNotes,
      });
      setIsAdjustModalOpen(false);
      await invalidate('inventory');
      fetchInventory();
    } catch (err: unknown) {
      setAdjustError(err instanceof Error ? err.message : 'Adjustment failed');
    } finally {
      setIsSubmittingAdjustment(false);
    }
  };

  // Find currently selected item for live preview in adjustment modal
  const selectedProductRow = inventory.find((i) => i.product.id === adjustProductId);
  const selectedLevel = selectedProductRow?.levels.find((l) => l.locationId === adjustLocationId);
  const currentOnHand = selectedLevel?.onHand ?? 0;
  const currentReserved = selectedLevel?.reserved ?? 0;
  const projectedOnHand = currentOnHand + adjustDelta;
  const projectedAvailable = projectedOnHand - currentReserved;
  const isProjectedInvalid = projectedOnHand < 0 || projectedOnHand < currentReserved;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Multi-Location Stock Levels</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time On-Hand, Reserved, and Available balances with strict non-negative invariants.
          </p>
        </div>

        {isManagerOrAdmin && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => openAdjustModal(inventory[0]?.product.id || '')}
            icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
          >
            Adjust Stock
          </Button>
        )}
      </div>

      {/* Location Filter Tabs & Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedLocationId('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedLocationId === 'ALL'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            All Warehouses
          </button>
          {locations.map((loc) => (
            <button
              key={loc.id}
              onClick={() => setSelectedLocationId(loc.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedLocationId === loc.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {loc.code} - {loc.name}
            </button>
          ))}
        </div>

        <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
            className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
          />
          <span className="flex items-center gap-1 text-amber-400 font-medium">
            <AlertTriangle className="h-3.5 w-3.5" />
            Show Low Stock Only
          </span>
        </label>
      </div>

      {/* Inventory Matrix Table */}
      <Card>
        {isLoading ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            Loading warehouse stock levels...
          </div>
        ) : inventory.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            <Layers className="h-8 w-8 mx-auto text-slate-400 mb-2" />
            No inventory levels found for this filter.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5 -my-5">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">SKU / Product</th>
                  <th className="py-3 px-4 font-semibold">Location</th>
                  <th className="py-3 px-4 font-semibold text-right">On Hand</th>
                  <th className="py-3 px-4 font-semibold text-right">Reserved</th>
                  <th className="py-3 px-4 font-semibold text-right">Available</th>
                  <th className="py-3 px-4 font-semibold text-right">Reorder Pt</th>
                  <th className="py-3 px-4 font-semibold text-center">Buffer Status</th>
                  {isManagerOrAdmin && <th className="py-3 px-4 font-semibold text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {inventory.flatMap((row) =>
                  row.levels.map((lvl) => {
                    const isLow = lvl.available <= row.product.reorderPoint;
                    return (
                      <tr key={lvl.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-semibold text-white block tabular-nums">
                            {row.product.sku}
                          </span>
                          <span className="text-slate-400 text-[11px] block">
                            {row.product.name} ({row.product.category})
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="purple" size="sm">
                            {lvl.locationCode}
                          </Badge>
                          <span className="text-[10px] text-slate-400 block mt-0.5 truncate max-w-[140px]">
                            {lvl.locationName}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums text-slate-200 font-medium">
                          {lvl.onHand}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums text-amber-400">
                          {lvl.reserved}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums font-bold text-white">
                          <span className={lvl.available <= 0 ? 'text-rose-400' : 'text-emerald-400'}>
                            {lvl.available}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums text-slate-400">
                          {row.product.reorderPoint}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {lvl.available <= 0 ? (
                            <Badge variant="danger" size="sm">
                              Depleted
                            </Badge>
                          ) : isLow ? (
                            <Badge variant="warning" size="sm">
                              Low Stock ({lvl.available} left)
                            </Badge>
                          ) : (
                            <Badge variant="success" size="sm">
                              Healthy Buffer
                            </Badge>
                          )}
                        </td>
                        {isManagerOrAdmin && (
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => openAdjustModal(row.product.id, lvl.locationId)}
                              className="text-[11px] py-1 px-2.5"
                            >
                              Adjust
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Adjust Stock Modal with Live Invariant Verification */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title="Record Stock Adjustment"
        description="Controlled inventory variance adjustment with mandatory audit justification."
        maxWidth="lg"
      >
        <form onSubmit={handleAdjustSubmit} className="space-y-4">
          {adjustError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {adjustError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Target Product</label>
            <select
              value={adjustProductId}
              onChange={(e) => setAdjustProductId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            >
              {inventory.map((i) => (
                <option key={i.product.id} value={i.product.id}>
                  {i.product.sku} — {i.product.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Target Warehouse</label>
            <select
              value={adjustLocationId}
              onChange={(e) => setAdjustLocationId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.code} ({loc.name})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Quantity Delta (+ or -) *
              </label>
              <input
                type="number"
                required
                value={adjustDelta || ''}
                onChange={(e) => setAdjustDelta(parseInt(e.target.value, 10) || 0)}
                placeholder="e.g. -5 or +10"
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 tabular-nums focus:outline-none focus:border-blue-500 font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Enter negative for loss/scrap, positive for surplus.
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Audit Reason Code *
              </label>
              <select
                value={adjustReason}
                onChange={(e) =>
                  setAdjustReason(
                    e.target.value as
                      | 'DAMAGED'
                      | 'EXPIRED'
                      | 'SHRINKAGE'
                      | 'AUDIT_CORRECTION'
                      | 'OPENING_STOCK'
                  )
                }
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="AUDIT_CORRECTION">AUDIT_CORRECTION (Cycle Count)</option>
                <option value="DAMAGED">DAMAGED (Scrap / Transit Damage)</option>
                <option value="EXPIRED">EXPIRED (Shelf Life Exceeded)</option>
                <option value="SHRINKAGE">SHRINKAGE (Discrepancy / Loss)</option>
                <option value="OPENING_STOCK">OPENING_STOCK (Initial Allocation)</option>
              </select>
            </div>
          </div>

          {/* Live Invariant Calculation Box */}
          <div
            className={`p-3 rounded-lg border text-xs space-y-1 ${
              isProjectedInvalid
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-slate-900 border-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between font-semibold">
              <span className="flex items-center gap-1.5">
                <ArrowUpDown className="h-3.5 w-3.5" />
                Live Invariant Verification:
              </span>
              <span className="tabular-nums">
                Current On-Hand: {currentOnHand} (Reserved: {currentReserved})
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80">
              <span>Projected Balance After Delta ({adjustDelta > 0 ? `+${adjustDelta}` : adjustDelta}):</span>
              <span
                className={`font-bold tabular-nums ${
                  isProjectedInvalid ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {projectedOnHand} On-Hand ({projectedAvailable} Available)
              </span>
            </div>
            {isProjectedInvalid && (
              <span className="text-[10px] text-rose-400 block pt-1 font-semibold">
                ⚠️ INVARIANT VIOLATION: Resulting stock cannot be negative or less than reserved.
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Audit Justification Notes *
            </label>
            <textarea
              rows={2}
              required
              value={adjustNotes}
              onChange={(e) => setAdjustNotes(e.target.value)}
              placeholder="e.g. Scrapped 5 broken drill casings during quarterly warehouse cycle count..."
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAdjustModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isProjectedInvalid || adjustDelta === 0}
              isLoading={isSubmittingAdjustment}
            >
              Confirm Adjustment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
