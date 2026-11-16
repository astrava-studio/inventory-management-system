import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { PurchaseOrder, Location, Product, POStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { useInventoryData } from '../context/InventoryDataContext';
import { formatCurrency } from '../lib/currency';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { Plus, CheckCircle2, FileDown, Trash2 } from 'lucide-react';

interface PurchaseOrdersPageProps {
  initialPreselectedSku?: string;
}

export const PurchaseOrdersPage: React.FC<PurchaseOrdersPageProps> = ({
  initialPreselectedSku,
}) => {
  const { user } = useAuth();
  const {
    purchaseOrders: storePOs,
    locations: storeLocations,
    products: storeProducts,
    invalidate,
  } = useInventoryData();
  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(storePOs);
  const [locations, setLocations] = useState<Location[]>(storeLocations);
  const [products, setProducts] = useState<Product[]>(storeProducts);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(() => storePOs.length === 0);

  // Sync with background prefetch store
  useEffect(() => {
    if (storePOs.length > 0 && statusFilter === 'ALL') {
      setPurchaseOrders(storePOs);
      setIsLoading(false);
    }
  }, [storePOs, statusFilter]);

  useEffect(() => {
    if (storeLocations.length > 0) {
      setLocations(storeLocations);
      if (!locationId) setLocationId(storeLocations[0].id);
    }
  }, [storeLocations]);

  useEffect(() => {
    if (storeProducts.length > 0) {
      setProducts(storeProducts);
    }
  }, [storeProducts]);

  // Create PO Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [supplierName, setSupplierName] = useState('');
  const [locationId, setLocationId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<Array<{ productId: string; quantity: number; unitCost: number }>>([
    { productId: '', quantity: 1, unitCost: 0 },
  ]);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Receive Confirmation Modal
  const [receivingPo, setReceivingPo] = useState<PurchaseOrder | null>(null);
  const [isReceiving, setIsReceiving] = useState(false);

  const fetchAuxiliaryData = async () => {
    try {
      const [locRes, prodRes] = await Promise.all([
        api.get<{ locations: Location[] }>('/locations'),
        api.get<{ products: Product[] }>('/products'),
      ]);
      setLocations(locRes.locations);
      setProducts(prodRes.products);
      if (locRes.locations.length > 0 && !locationId) {
        setLocationId(locRes.locations[0].id);
      }
    } catch (err) {
      console.error('Failed to load auxiliary PO data:', err);
    }
  };

  const fetchPurchaseOrders = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      const res = await api.get<{ purchaseOrders: PurchaseOrder[] }>(
        `/purchase-orders?${params.toString()}`
      );
      setPurchaseOrders(res.purchaseOrders);
    } catch (err) {
      console.error('Failed to load purchase orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuxiliaryData();
  }, []);

  useEffect(() => {
    fetchPurchaseOrders();
  }, [statusFilter]);

  // Handle auto-open if navigated with preselected SKU from dashboard
  useEffect(() => {
    if (initialPreselectedSku && products.length > 0) {
      const targetProd = products.find((p) => p.sku === initialPreselectedSku);
      if (targetProd) {
        setItems([{ productId: targetProd.id, quantity: 20, unitCost: targetProd.costPrice }]);
        setIsCreateModalOpen(true);
      }
    }
  }, [initialPreselectedSku, products]);

  const handleAddItem = () => {
    const firstProd = products[0];
    setItems([
      ...items,
      { productId: firstProd?.id || '', quantity: 10, unitCost: firstProd?.costPrice || 0 },
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
        unitCost: prod?.costPrice || 0,
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setItems(updated);
  };

  const handleCreatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setCreateError(null);

    try {
      await api.post('/purchase-orders', {
        supplierName,
        locationId,
        notes,
        items,
      });
      setIsCreateModalOpen(false);
      // Reset form
      setSupplierName('');
      setNotes('');
      setItems([{ productId: products[0]?.id || '', quantity: 10, unitCost: products[0]?.costPrice || 0 }]);
      await invalidate('purchaseOrders');
      fetchPurchaseOrders();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create purchase order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkOrdered = async (id: string) => {
    try {
      await api.post(`/purchase-orders/${id}/order`);
      await invalidate('purchaseOrders');
      fetchPurchaseOrders();
    } catch (err) {
      alert('Error updating PO: ' + (err instanceof Error ? err.message : 'Unknown'));
    }
  };

  const handleReceiveStock = async () => {
    if (!receivingPo) return;
    setIsReceiving(true);
    try {
      await api.post(`/purchase-orders/${receivingPo.id}/receive`);
      setReceivingPo(null);
      await invalidate('purchaseOrders');
      fetchPurchaseOrders();
    } catch (err) {
      alert('Error receiving PO: ' + (err instanceof Error ? err.message : 'Unknown'));
    } finally {
      setIsReceiving(false);
    }
  };

  const handleCancelPo = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this purchase order?')) return;
    try {
      await api.post(`/purchase-orders/${id}/cancel`);
      await invalidate('purchaseOrders');
      fetchPurchaseOrders();
    } catch (err) {
      alert('Error cancelling PO: ' + (err instanceof Error ? err.message : 'Unknown'));
    }
  };

  const totalCalculatedCost = items.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.unitCost || 0),
    0
  );

  const getStatusBadge = (status: POStatus) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="default">DRAFT</Badge>;
      case 'ORDERED':
        return <Badge variant="info">ORDERED (Inbound)</Badge>;
      case 'RECEIVED':
        return <Badge variant="success">RECEIVED (Stock Added)</Badge>;
      case 'CANCELLED':
        return <Badge variant="danger">CANCELLED</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Purchase Orders</h1>
          <p className="text-xs text-slate-400 mt-1">
            Supplier procurement, inbound tracking, and atomic stock-in receipts.
          </p>
        </div>

        {isManagerOrAdmin && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              if (items[0]?.productId === '' && products.length > 0) {
                setItems([{ productId: products[0].id, quantity: 10, unitCost: products[0].costPrice }]);
              }
              setIsCreateModalOpen(true);
            }}
            icon={<Plus className="h-3.5 w-3.5" />}
          >
            Create Purchase Order
          </Button>
        )}
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
        {(['ALL', 'DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED'] as const).map((status) => (
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

      {/* PO Table / Cards */}
      <Card>
        {isLoading ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            Loading purchase orders...
          </div>
        ) : purchaseOrders.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            <FileDown className="h-8 w-8 mx-auto text-slate-400 mb-2" />
            No purchase orders found matching this filter.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5 -my-5">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">PO Number</th>
                  <th className="py-3 px-4 font-semibold">Supplier</th>
                  <th className="py-3 px-4 font-semibold">Destination Facility</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Items / Units</th>
                  <th className="py-3 px-4 font-semibold text-right">Total Amount</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {purchaseOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-white block tabular-nums">{po.poNumber}</span>
                      <span className="text-[10px] text-slate-400 block tabular-nums">
                        {new Date(po.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-slate-200 font-medium block">{po.supplierName}</span>
                      {po.notes && (
                        <span className="text-[10px] text-slate-400 block truncate max-w-[160px]">
                          {po.notes}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="purple" size="sm">
                        {po.location?.code}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">{getStatusBadge(po.status)}</td>
                    <td className="py-3 px-4 text-right tabular-nums text-slate-300">
                      {po.items.length} lines ({po.totalUnits} units)
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-semibold text-white">
                      {formatCurrency(po.totalAmount, user?.currency)}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      {po.status === 'DRAFT' && isManagerOrAdmin && (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleMarkOrdered(po.id)}
                            className="text-[11px] py-1 px-2"
                          >
                            Mark Ordered
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelPo(po.id)}
                            className="text-[11px] py-1 px-2 text-rose-400 hover:text-rose-300"
                          >
                            Cancel
                          </Button>
                        </>
                      )}

                      {po.status === 'ORDERED' && (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setReceivingPo(po)}
                            className="text-[11px] py-1 px-2 bg-emerald-600 hover:bg-emerald-700"
                            icon={<CheckCircle2 className="h-3 w-3" />}
                          >
                            Receive Stock
                          </Button>
                          {isManagerOrAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelPo(po.id)}
                              className="text-[11px] py-1 px-2 text-rose-400 hover:text-rose-300"
                            >
                              Cancel
                            </Button>
                          )}
                        </>
                      )}

                      {po.status === 'RECEIVED' && (
                        <span className="text-[11px] text-emerald-400 font-medium inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Received
                        </span>
                      )}

                      {po.status === 'CANCELLED' && (
                        <span className="text-[11px] text-slate-400">Archived</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create Purchase Order Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Purchase Order (PO)"
        description="Draft an inbound procurement order with unit cost and quantity specifications."
        maxWidth="xl"
      >
        <form onSubmit={handleCreatePo} className="space-y-4">
          {createError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {createError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Supplier / Vendor Name *
              </label>
              <input
                type="text"
                required
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="e.g. Bosch Industrial Tools Ltd."
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Receiving Warehouse *
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
            <label className="block text-xs font-medium text-slate-300 mb-1">Order Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Urgent project replenishment - Gate 2 delivery"
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Dynamic Line Items */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">Line Items & Quantities</span>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                + Add SKU
              </Button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {items.map((item, idx) => (
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
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 tabular-nums focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={item.unitCost}
                      onChange={(e) =>
                        handleItemChange(idx, 'unitCost', parseFloat(e.target.value) || 0)
                      }
                      placeholder="Unit Cost"
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
              ))}
            </div>

            <div className="flex justify-between items-center text-xs font-semibold text-slate-200 pt-2 border-t border-slate-800/80">
              <span>Total Estimated Cost:</span>
              <span className="text-sm font-bold text-blue-400 tabular-nums">
                {formatCurrency(totalCalculatedCost, user?.currency)}
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
              Create Draft PO
            </Button>
          </div>
        </form>
      </Modal>

      {/* Receive Stock Confirmation Dialog */}
      <Modal
        isOpen={!!receivingPo}
        onClose={() => setReceivingPo(null)}
        title={`Receive Stock for PO #${receivingPo?.poNumber}`}
        description="Executing this confirmation will atomically increment on-hand inventory levels and log immutable PURCHASE_RECEIPT ledger records."
      >
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Supplier:</span>
              <span className="text-white font-medium">{receivingPo?.supplierName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Receiving Facility:</span>
              <span className="text-white font-medium">{receivingPo?.location?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Total Units to Receive:</span>
              <span className="text-emerald-400 font-bold tabular-nums">
                +{receivingPo?.totalUnits} units
              </span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
            ✅ Invariant Verified: Transaction will execute with row-level locks and write audit entries.
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReceivingPo(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleReceiveStock}
              isLoading={isReceiving}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Confirm Physical Receipt
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
