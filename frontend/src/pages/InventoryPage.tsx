import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Location, InventoryMatrixRow } from '../types';
import { useAuth } from '../context/AuthContext';
import { useInventoryData } from '../context/InventoryDataContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import {
  SlidersHorizontal,
  AlertTriangle,
  Layers,
  ArrowUpDown,
  Download,
  Building2,
  Plus,
  Archive,
  RotateCcw,
  ShoppingCart,
} from 'lucide-react';

interface InventoryPageProps {
  onNavigateToTab?: (tab: string, initialSku?: string) => void;
}

export const InventoryPage: React.FC<InventoryPageProps> = ({ onNavigateToTab }) => {
  const { user } = useAuth();
  const {
    inventory: storeInventory,
    locations: storeLocations,
    invalidate,
  } = useInventoryData();
  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const isAdmin = user?.role === 'ADMIN';

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

  // Adjustment Modal state
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

  // Warehouse Management Modal state
  const [isLocationsModalOpen, setIsLocationsModalOpen] = useState(false);
  const [locationForm, setLocationForm] = useState({ code: '', name: '', address: '' });
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isSavingLocation, setIsSavingLocation] = useState(false);

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
    if (adjustDelta === 0) {
      setAdjustError('Quantity delta cannot be zero');
      return;
    }

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

  const handleExportCsv = async () => {
    try {
      const csv = await api.get<string>('/inventory/export-csv');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `inventory-levels-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Failed to export inventory CSV: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingLocation(true);
    setLocationError(null);

    try {
      await api.post('/locations', {
        code: locationForm.code.toUpperCase().trim(),
        name: locationForm.name.trim(),
        address: locationForm.address.trim() || undefined,
      });
      setLocationForm({ code: '', name: '', address: '' });
      await fetchLocations();
      await invalidate('all');
    } catch (err: unknown) {
      setLocationError(err instanceof Error ? err.message : 'Failed to create warehouse');
    } finally {
      setIsSavingLocation(false);
    }
  };

  const handleArchiveLocation = async (loc: Location) => {
    if (!window.confirm(`Are you sure you want to deactivate warehouse "${loc.name}" (${loc.code})? It must have zero active stock.`)) {
      return;
    }
    try {
      await api.delete(`/locations/${loc.id}`);
      await fetchLocations();
      await invalidate('all');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to archive location');
    }
  };

  const handleRestoreLocation = async (loc: Location) => {
    try {
      await api.patch(`/locations/${loc.id}/restore`);
      await fetchLocations();
      await invalidate('all');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to restore location');
    }
  };

  // Derive current stock details for live invariant verification in adjustment modal
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
          <h1 className="text-xl font-bold text-white tracking-tight">Multi-Location Inventory</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time stock matrix with pessimistic row locking and atomic reservation tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            icon={<Download className="h-3.5 w-3.5" />}
          >
            Export CSV
          </Button>

          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setLocationError(null);
                setIsLocationsModalOpen(true);
              }}
              icon={<Building2 className="h-3.5 w-3.5" />}
            >
              Warehouses
            </Button>
          )}

          {isManagerOrAdmin && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => openAdjustModal(inventory[0]?.product.id || '')}
              disabled={inventory.length === 0}
              icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
            >
              Adjust Stock
            </Button>
          )}
        </div>
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
                  {isManagerOrAdmin && <th className="py-3 px-4 font-semibold text-right">Actions</th>}
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
                            <div className="flex items-center justify-end gap-1.5">
                              {isLow && onNavigateToTab && (
                                <button
                                  type="button"
                                  onClick={() => onNavigateToTab('purchase-orders', row.product.sku)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[11px] font-medium transition-colors"
                                  title="Create Restock Purchase Order"
                                >
                                  <ShoppingCart className="h-3 w-3" />
                                  <span>Reorder</span>
                                </button>
                              )}
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => openAdjustModal(row.product.id, lvl.locationId)}
                                className="text-[11px] py-1 px-2.5"
                              >
                                Adjust
                              </Button>
                            </div>
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

      {/* Warehouse Locations Management Modal */}
      <Modal
        isOpen={isLocationsModalOpen}
        onClose={() => setIsLocationsModalOpen(false)}
        title="Warehouse Facilities & Depots"
        description="Manage your physical warehouses, distribution hubs, and storage facilities."
        maxWidth="xl"
      >
        <div className="space-y-5">
          {locationError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {locationError}
            </div>
          )}

          {/* Create new location */}
          <form onSubmit={handleCreateLocation} className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <span className="text-xs font-semibold text-white block">Add New Facility</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                required
                value={locationForm.code}
                onChange={(e) => setLocationForm({ ...locationForm, code: e.target.value })}
                placeholder="Code (e.g. WH-NORTH)"
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 uppercase placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <input
                type="text"
                required
                value={locationForm.name}
                onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                placeholder="Name (e.g. Northern Depot)"
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <input
                type="text"
                value={locationForm.address}
                onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })}
                placeholder="Address / City (optional)"
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSavingLocation}
                icon={<Plus className="h-3.5 w-3.5" />}
              >
                Create Facility
              </Button>
            </div>
          </form>

          {/* List of current facilities */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Active & Configured Facilities ({locations.length})
            </span>
            <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden">
              {locations.map((loc) => (
                <div key={loc.id} className="p-3 bg-slate-900/40 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white tabular-nums">{loc.code}</span>
                      <span className="text-slate-300 font-medium">{loc.name}</span>
                      {!loc.isActive && (
                        <Badge variant="default" size="sm">
                          Deactivated
                        </Badge>
                      )}
                    </div>
                    {loc.address && (
                      <span className="text-[11px] text-slate-400 block mt-0.5">{loc.address}</span>
                    )}
                  </div>

                  {isAdmin && (
                    <div>
                      {loc.isActive ? (
                        <button
                          type="button"
                          onClick={() => handleArchiveLocation(loc)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                          title="Deactivate Warehouse"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRestoreLocation(loc)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
                          title="Restore Warehouse"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsLocationsModalOpen(false)}
            >
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
