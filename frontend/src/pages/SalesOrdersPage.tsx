import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { SalesOrder, SOStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { useInventoryData } from '../context/InventoryDataContext';
import { formatCurrency } from '../lib/currency';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import {
  Plus,
  CheckCircle2,
  PackageCheck,
  FileUp,
  Trash2,
  Lock,
} from 'lucide-react';

export const SalesOrdersPage: React.FC = () => {
  const { user } = useAuth();
  const {
    salesOrders: storeSOs,
    locations,
    products,
    invalidate,
  } = useInventoryData();
  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>(storeSOs);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(() => storeSOs.length === 0);

  // Sync with background prefetch store
  useEffect(() => {
    if (statusFilter === 'ALL') {
      setSalesOrders(storeSOs);
      if (storeSOs.length > 0) {
        setIsLoading(false);
      }
    }
  }, [storeSOs, statusFilter]);

  // Create SO Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [locationId, setLocationId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<Array<{ productId: string; quantity: number; unitPrice: number }>>([
    { productId: '', quantity: 1, unitPrice: 0 },
  ]);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set default location once locations are available
  useEffect(() => {
    if (locations.length > 0 && !locationId) {
      setLocationId(locations[0].id);
    }
  }, [locations, locationId]);

  const fetchSalesOrders = async (showSpinner = false) => {
    if (showSpinner) setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      const res = await api.get<{ salesOrders: SalesOrder[] }>(`/sales-orders?${params.toString()}`);
      setSalesOrders(res.salesOrders);
    } catch (err) {
      console.error('Failed to load sales orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Only show full loading spinner if we have literally zero cached data
    const shouldShowSpinner = salesOrders.length === 0 && storeSOs.length === 0;
    fetchSalesOrders(shouldShowSpinner);
  }, [statusFilter]);

  const handleAddItem = () => {
    const firstProd = products[0];
    setItems([
      ...items,
      { productId: firstProd?.id || '', quantity: 1, unitPrice: firstProd?.sellingPrice || 0 },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const updated = [...items];
    if (field === 'productId') {
      const prod = products.find((p) => p.id === value);
      updated[index] = {
        ...updated[index],
        productId: value as string,
        unitPrice: prod?.sellingPrice || 0,
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setItems(updated);
  };

  const handleCreateSo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setCreateError(null);

    try {
      await api.post('/sales-orders', {
        customerName,
        locationId,
        notes,
        items,
      });
      setIsCreateModalOpen(false);
      setCustomerName('');
      setNotes('');
      setItems([{ productId: products[0]?.id || '', quantity: 1, unitPrice: products[0]?.sellingPrice || 0 }]);
      await invalidate('salesOrders');
      fetchSalesOrders();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create sales order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmOrder = async (id: string) => {
    try {
      await api.post(`/sales-orders/${id}/confirm`);
      await invalidate('salesOrders');
      fetchSalesOrders();
    } catch (err) {
      alert('Confirmation failed: ' + (err instanceof Error ? err.message : 'Insufficient stock available'));
    }
  };

  const handleFulfillOrder = async (id: string) => {
    try {
      await api.post(`/sales-orders/${id}/fulfill`);
      await invalidate('salesOrders');
      fetchSalesOrders();
    } catch (err) {
      alert('Fulfillment failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleCancelOrder = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this order? Reserved stock will be released.')) return;
    try {
      await api.post(`/sales-orders/${id}/cancel`);
      await invalidate('salesOrders');
      fetchSalesOrders();
    } catch (err) {
      alert('Cancellation failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const getStatusBadge = (status: SOStatus) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="default">DRAFT</Badge>;
      case 'CONFIRMED':
        return <Badge variant="warning">CONFIRMED (Stock Reserved)</Badge>;
      case 'FULFILLED':
        return <Badge variant="success">FULFILLED (Dispatched)</Badge>;
      case 'CANCELLED':
        return <Badge variant="danger">CANCELLED</Badge>;
    }
  };

  const totalCalculatedRevenue = items.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Sales Orders</h1>
          <p className="text-xs text-slate-400 mt-1">
            Customer order fulfillment with atomic inventory reservations and dispatch logging.
          </p>
        </div>

        {isManagerOrAdmin && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              if (items[0]?.productId === '' && products.length > 0) {
                setItems([{ productId: products[0].id, quantity: 1, unitPrice: products[0].sellingPrice }]);
              }
              setIsCreateModalOpen(true);
            }}
            icon={<Plus className="h-3.5 w-3.5" />}
          >
            Create Sales Order
          </Button>
        )}
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
        {(['ALL', 'DRAFT', 'CONFIRMED', 'FULFILLED', 'CANCELLED'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              statusFilter === status
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {status === 'ALL' ? 'All Orders' : status}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <Card>
        {isLoading ? (
          <div className="text-center py-12 text-slate-400 text-xs">Loading sales orders...</div>
        ) : salesOrders.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            <FileUp className="h-8 w-8 mx-auto text-slate-400 mb-2" />
            No sales orders found matching this filter.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5 -my-5">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">SO Number</th>
                  <th className="py-3 px-4 font-semibold">Customer</th>
                  <th className="py-3 px-4 font-semibold">Fulfillment Hub</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Items / Units</th>
                  <th className="py-3 px-4 font-semibold text-right">Total Price</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {salesOrders.map((so) => (
                  <tr key={so.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-white block tabular-nums">{so.soNumber}</span>
                      <span className="text-[10px] text-slate-400 block tabular-nums">
                        {new Date(so.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-slate-200 font-medium block">{so.customerName}</span>
                      {so.notes && (
                        <span className="text-[10px] text-slate-400 block truncate max-w-[160px]">
                          {so.notes}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="purple" size="sm">
                        {so.location?.code}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">{getStatusBadge(so.status)}</td>
                    <td className="py-3 px-4 text-right tabular-nums text-slate-300">
                      {so.items.length} lines ({so.totalUnits} units)
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-semibold text-white">
                      {formatCurrency(so.totalAmount, user?.currency)}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      {so.status === 'DRAFT' && isManagerOrAdmin && (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleConfirmOrder(so.id)}
                            className="text-[11px] py-1 px-2 bg-amber-600 hover:bg-amber-700"
                            icon={<Lock className="h-3 w-3" />}
                          >
                            Confirm & Reserve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelOrder(so.id)}
                            className="text-[11px] py-1 px-2 text-rose-400 hover:text-rose-300"
                          >
                            Cancel
                          </Button>
                        </>
                      )}

                      {so.status === 'CONFIRMED' && (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleFulfillOrder(so.id)}
                            className="text-[11px] py-1 px-2 bg-emerald-600 hover:bg-emerald-700"
                            icon={<PackageCheck className="h-3 w-3" />}
                          >
                            Fulfill & Ship
                          </Button>
                          {isManagerOrAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelOrder(so.id)}
                              className="text-[11px] py-1 px-2 text-rose-400 hover:text-rose-300"
                            >
                              Release
                            </Button>
                          )}
                        </>
                      )}

                      {so.status === 'FULFILLED' && (
                        <span className="text-[11px] text-emerald-400 font-medium inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Dispatched
                        </span>
                      )}

                      {so.status === 'CANCELLED' && (
                        <span className="text-[11px] text-slate-400">Cancelled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create Sales Order Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Sales Order (SO)"
        description="Draft a customer fulfillment order. Line items show real-time available stock at the chosen warehouse."
        maxWidth="xl"
      >
        <form onSubmit={handleCreateSo} className="space-y-4">
          {createError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {createError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Customer / Client Name *
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Apex Construction Corp."
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Fulfillment Warehouse *
              </label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.code} - {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Customer Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Dispatch to site gate #3 by Thursday"
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Dynamic Line Items */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">Line Items & Prices</span>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                + Add Item
              </Button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {items.map((item, idx) => {
                const prod = products.find((p) => p.id === item.productId);
                const locStock = prod?.locations?.find((l) => l.locationId === locationId);
                const available = locStock?.available ?? 0;
                const isOver = item.quantity > available;

                return (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-2 items-center bg-slate-900/80 p-2.5 rounded-lg border border-slate-800"
                  >
                    <div className="col-span-5">
                      <select
                        value={item.productId}
                        onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.sku} - {p.name}
                          </option>
                        ))}
                      </select>
                      <span className="text-[10px] text-slate-400 block mt-0.5 tabular-nums">
                        Available at site: {available} units
                      </span>
                    </div>

                    <div className="col-span-3">
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(idx, 'quantity', parseInt(e.target.value, 10) || 1)
                        }
                        placeholder="Qty"
                        className={`w-full bg-slate-800 border rounded px-2 py-1 text-xs text-slate-100 tabular-nums focus:outline-none ${
                          isOver ? 'border-amber-500 text-amber-300' : 'border-slate-700'
                        }`}
                      />
                      {isOver && (
                        <span className="text-[9px] text-amber-400 block mt-0.5">
                          Exceeds available!
                        </span>
                      )}
                    </div>

                    <div className="col-span-3">
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={item.unitPrice}
                        onChange={(e) =>
                          handleItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)
                        }
                        placeholder="Unit Price"
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 tabular-nums focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="col-span-1 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length === 1}
                        className="p-1 rounded text-slate-400 hover:text-rose-400 disabled:opacity-30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center text-xs font-semibold text-slate-200 pt-2 border-t border-slate-800/80">
              <span>Total Order Value:</span>
              <span className="text-sm font-bold text-emerald-400 tabular-nums">
                {formatCurrency(totalCalculatedRevenue, user?.currency)}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Create Draft SO
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
