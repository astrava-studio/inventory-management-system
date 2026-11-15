import React, { useState, useEffect } from 'react';
import {
  ArrowLeftRight,
  Plus,
  RefreshCw,
  Search,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  Warehouse,
  AlertTriangle,
  ArrowRight,
  Eye,
  Trash2,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { StockTransfer, Location, Product, TransferStatus } from '../types';

interface TransferItemInput {
  productId: string;
  quantity: number;
}

export const TransfersPage: React.FC = () => {
  const { user } = useAuth();
  const isStaff = user?.role === 'STAFF';

  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedSource, setSelectedSource] = useState<string>('ALL');
  const [selectedDestination, setSelectedDestination] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [sourceId, setSourceId] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [items, setItems] = useState<TransferItemInput[]>([
    { productId: '', quantity: 1 },
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (selectedStatus !== 'ALL') params.append('status', selectedStatus);
      if (selectedSource !== 'ALL') params.append('sourceId', selectedSource);
      if (selectedDestination !== 'ALL') params.append('destinationId', selectedDestination);

      const res = await api.get<{ transfers: StockTransfer[] }>(`/transfers?${params.toString()}`);
      setTransfers(res.transfers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stock transfers');
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const [locRes, prodRes] = await Promise.all([
        api.get<{ locations: Location[] }>('/locations'),
        api.get<{ products: Product[] }>('/products'),
      ]);
      setLocations(locRes.locations || []);
      setProducts(prodRes.products || []);

      if (locRes.locations && locRes.locations.length >= 2) {
        setSourceId(locRes.locations[0].id);
        setDestinationId(locRes.locations[1].id);
      }
    } catch (err) {
      console.error('Failed to load locations or products for transfers', err);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, [selectedStatus, selectedSource, selectedDestination]);

  useEffect(() => {
    fetchDropdownData();
  }, []);

  const handleAddItem = () => {
    setItems([...items, { productId: '', quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof TransferItemInput, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const openCreateModal = () => {
    setItems([{ productId: products[0]?.id || '', quantity: 1 }]);
    setTransferNotes('');
    setFormError(null);
    if (locations.length >= 2) {
      setSourceId(locations[0].id);
      setDestinationId(locations[1].id);
    }
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (sourceId === destinationId) {
      setFormError('Source and Destination warehouses must be different.');
      return;
    }

    if (items.length === 0 || items.some((i) => !i.productId || i.quantity <= 0)) {
      setFormError('Please select valid products and positive quantities for all items.');
      return;
    }

    // Check duplicate products in line items
    const productIds = items.map((i) => i.productId);
    if (new Set(productIds).size !== productIds.length) {
      setFormError('Please combine duplicate products into a single line item.');
      return;
    }

    try {
      setActionLoading(true);
      await api.post('/transfers', {
        sourceLocationId: sourceId,
        destinationLocationId: destinationId,
        notes: transferNotes || null,
        items,
      });

      setIsCreateOpen(false);
      fetchTransfers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create transfer');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDispatch = async (transferId: string) => {
    if (!confirm('Are you sure you want to dispatch this transfer? Status will change to IN_TRANSIT.')) {
      return;
    }

    try {
      setActionLoading(true);
      await api.post(`/transfers/${transferId}/dispatch`);
      fetchTransfers();
      if (selectedTransfer?.id === transferId) {
        setSelectedTransfer(null);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to dispatch transfer');
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async (transferId: string) => {
    if (
      !confirm(
        'Confirm receipt of transferred items at destination warehouse? This will atomically debit the source warehouse and credit the destination warehouse with an immutable audit ledger entry.'
      )
    ) {
      return;
    }

    try {
      setActionLoading(true);
      await api.post(`/transfers/${transferId}/complete`);
      fetchTransfers();
      if (selectedTransfer?.id === transferId) {
        setSelectedTransfer(null);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to complete transfer');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (transferId: string) => {
    if (!confirm('Are you sure you want to cancel this transfer order?')) {
      return;
    }

    try {
      setActionLoading(true);
      await api.post(`/transfers/${transferId}/cancel`);
      fetchTransfers();
      if (selectedTransfer?.id === transferId) {
        setSelectedTransfer(null);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to cancel transfer');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: TransferStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge variant="warning" className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> PENDING
          </Badge>
        );
      case 'IN_TRANSIT':
        return (
          <Badge variant="info" className="flex items-center gap-1">
            <Truck className="w-3 h-3" /> IN TRANSIT
          </Badge>
        );
      case 'COMPLETED':
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> COMPLETED
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge variant="default" className="flex items-center gap-1 text-slate-400">
            <XCircle className="w-3 h-3" /> CANCELLED
          </Badge>
        );
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const filteredTransfers = transfers.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const matchNumber = t.transferNumber.toLowerCase().includes(q);
    const matchSource = t.sourceLocation?.name.toLowerCase().includes(q) || t.sourceLocation?.code.toLowerCase().includes(q);
    const matchDest = t.destinationLocation?.name.toLowerCase().includes(q) || t.destinationLocation?.code.toLowerCase().includes(q);
    const matchItems = t.items.some((i) => i.product?.name.toLowerCase().includes(q) || i.product?.sku.toLowerCase().includes(q));
    return matchNumber || matchSource || matchDest || matchItems;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-primary-400" />
            Inter-Warehouse Transfers
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Coordinate and audit stock movement between regional fulfillment centers and storage hubs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchTransfers} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {!isStaff && (
            <Button variant="primary" size="sm" onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-2" />
              New Transfer
            </Button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={fetchTransfers}>
            Retry
          </Button>
        </div>
      )}

      {/* Filters and Controls */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search transfer #, product, or warehouse..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
            />
          </div>

          {/* Status Tabs */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Dispatch</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Source Location */}
          <div>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
            >
              <option value="ALL">From Any Warehouse</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  From: {loc.code} - {loc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Destination Location */}
          <div>
            <select
              value={selectedDestination}
              onChange={(e) => setSelectedDestination(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
            >
              <option value="ALL">To Any Warehouse</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  To: {loc.code} - {loc.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Transfer List Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-semibold">Transfer #</th>
                <th className="px-6 py-4 font-semibold">Route (Origin → Destination)</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Items & Volume</th>
                <th className="px-6 py-4 font-semibold">Created</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary-500" />
                    Loading transfer manifests...
                  </td>
                </tr>
              ) : filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <ArrowLeftRight className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    No stock transfers match the current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTransfers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-mono font-medium text-white">{t.transferNumber}</div>
                      {t.notes && <div className="text-xs text-slate-500 truncate max-w-xs">{t.notes}</div>}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-xs text-slate-300 font-mono">
                          {t.sourceLocation?.code || 'SRC'}
                        </span>
                        <ArrowRight className="w-4 h-4 text-slate-500" />
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-xs text-slate-300 font-mono">
                          {t.destinationLocation?.code || 'DST'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {t.sourceLocation?.name} → {t.destinationLocation?.name}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(t.status)}</td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-white font-medium">
                        {t.totalUnits || t.items.reduce((s, i) => s + i.quantity, 0)} units
                      </div>
                      <div className="text-xs text-slate-500">
                        {t.items.length} {t.items.length === 1 ? 'SKU' : 'SKUs'}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400">
                      <div>{new Date(t.createdAt).toLocaleDateString()}</div>
                      <div className="text-slate-500">{t.createdBy?.fullName || 'Staff'}</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedTransfer(t)}
                          title="View Manifest Details"
                        >
                          <Eye className="w-4 h-4 text-slate-400 hover:text-white" />
                        </Button>

                        {t.status === 'PENDING' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                              onClick={() => handleDispatch(t.id)}
                              disabled={actionLoading}
                            >
                              <Truck className="w-3.5 h-3.5 mr-1" />
                              Dispatch
                            </Button>
                            {!isStaff && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-rose-400 hover:bg-rose-500/10"
                                onClick={() => handleCancel(t.id)}
                                disabled={actionLoading}
                              >
                                Cancel
                              </Button>
                            )}
                          </>
                        )}

                        {t.status === 'IN_TRANSIT' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                              onClick={() => handleComplete(t.id)}
                              disabled={actionLoading}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              Receive
                            </Button>
                            {!isStaff && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-rose-400 hover:bg-rose-500/10"
                                onClick={() => handleCancel(t.id)}
                                disabled={actionLoading}
                              >
                                Cancel
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Transfer Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Inter-Warehouse Stock Transfer"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-5">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Locations Routing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg bg-slate-900/60 border border-slate-800">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Warehouse className="w-3.5 h-3.5 text-primary-400" />
                Source Warehouse (Debit Origin)
              </label>
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id} disabled={loc.id === destinationId}>
                    {loc.code} - {loc.name} {loc.id === destinationId ? '(Selected as Destination)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Warehouse className="w-3.5 h-3.5 text-emerald-400" />
                Destination Warehouse (Credit Target)
              </label>
              <select
                value={destinationId}
                onChange={(e) => setDestinationId(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id} disabled={loc.id === sourceId}>
                    {loc.code} - {loc.name} {loc.id === sourceId ? '(Selected as Source)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {sourceId === destinationId && (
              <div className="col-span-2 text-xs text-rose-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Database check constraint requires source and destination warehouses to be distinct.
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Transfer Notes / Reason</label>
            <input
              type="text"
              placeholder="e.g. Rebalance regional inventory ahead of festive demand spike"
              value={transferNotes}
              onChange={(e) => setTransferNotes(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
            />
          </div>

          {/* Line Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Transfer Manifest Line Items
              </label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Product
              </Button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {items.map((item, index) => {
                const prod = products.find((p) => p.id === item.productId);
                const sourceLocStock = prod?.locations?.find((l) => l.locationId === sourceId);

                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/40 border border-slate-800"
                  >
                    <div className="flex-1">
                      <select
                        value={item.productId}
                        onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                        required
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
                      >
                        <option value="">Select a product...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            [{p.sku}] {p.name}
                          </option>
                        ))}
                      </select>
                      {sourceLocStock && (
                        <div className="text-[11px] text-slate-400 mt-1">
                          Available at source: <span className="text-white font-medium">{sourceLocStock.available}</span> (On-hand: {sourceLocStock.onHand}, Reserved: {sourceLocStock.reserved})
                        </div>
                      )}
                    </div>

                    <div className="w-32">
                      <input
                        type="number"
                        min="1"
                        placeholder="Quantity"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(index, 'quantity', parseInt(e.target.value, 10) || 1)
                        }
                        required
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500 font-mono"
                      />
                    </div>

                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(index)}
                        className="text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={actionLoading || sourceId === destinationId}
            >
              {actionLoading ? 'Creating Manifest...' : 'Create Transfer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Transfer Details Modal */}
      {selectedTransfer && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedTransfer(null)}
          title={`Transfer Manifest: ${selectedTransfer.transferNumber}`}
          maxWidth="2xl"
        >
          <div className="space-y-6">
            {/* Manifest Overview */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-slate-900 border border-slate-800 text-sm">
              <div>
                <span className="text-xs text-slate-500 block">Status</span>
                <div className="mt-1">{getStatusBadge(selectedTransfer.status)}</div>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Date Created</span>
                <span className="text-white mt-1 block">
                  {new Date(selectedTransfer.createdAt).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Source Warehouse</span>
                <span className="text-white font-medium mt-1 block">
                  {selectedTransfer.sourceLocation?.code} - {selectedTransfer.sourceLocation?.name}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Destination Warehouse</span>
                <span className="text-white font-medium mt-1 block">
                  {selectedTransfer.destinationLocation?.code} - {selectedTransfer.destinationLocation?.name}
                </span>
              </div>
              {selectedTransfer.notes && (
                <div className="col-span-2">
                  <span className="text-xs text-slate-500 block">Notes</span>
                  <span className="text-slate-300 mt-1 block">{selectedTransfer.notes}</span>
                </div>
              )}
            </div>

            {/* Line Items Table */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Manifest Items ({selectedTransfer.items.length})
              </h4>
              <div className="rounded-lg border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-900 text-xs uppercase text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-2.5">SKU</th>
                      <th className="px-4 py-2.5">Product</th>
                      <th className="px-4 py-2.5 text-right">Transfer Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {selectedTransfer.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/20">
                        <td className="px-4 py-2.5 font-mono text-xs text-primary-400">
                          {item.product?.sku || 'SKU'}
                        </td>
                        <td className="px-4 py-2.5 text-white">{item.product?.name || 'Product'}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-white font-semibold">
                          {item.quantity} {item.product?.unitOfMeasure || 'units'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <Button variant="outline" onClick={() => setSelectedTransfer(null)}>
                Close
              </Button>

              <div className="flex gap-2">
                {selectedTransfer.status === 'PENDING' && (
                  <>
                    {!isStaff && (
                      <Button
                        variant="ghost"
                        className="text-rose-400 hover:bg-rose-500/10"
                        onClick={() => handleCancel(selectedTransfer.id)}
                        disabled={actionLoading}
                      >
                        Cancel Transfer
                      </Button>
                    )}
                    <Button
                      variant="primary"
                      onClick={() => handleDispatch(selectedTransfer.id)}
                      disabled={actionLoading}
                    >
                      <Truck className="w-4 h-4 mr-1.5" />
                      Dispatch In-Transit
                    </Button>
                  </>
                )}

                {selectedTransfer.status === 'IN_TRANSIT' && (
                  <>
                    {!isStaff && (
                      <Button
                        variant="ghost"
                        className="text-rose-400 hover:bg-rose-500/10"
                        onClick={() => handleCancel(selectedTransfer.id)}
                        disabled={actionLoading}
                      >
                        Cancel Transfer
                      </Button>
                    )}
                    <Button
                      variant="primary"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white"
                      onClick={() => handleComplete(selectedTransfer.id)}
                      disabled={actionLoading}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1.5" />
                      Receive & Settle Stock
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
export default TransfersPage;
