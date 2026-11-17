import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  Sliders,
  ChevronLeft,
  ChevronRight,
  User,
  Download,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { api } from '../lib/api';
import { useInventoryData } from '../context/InventoryDataContext';
import { StockMovement, MovementType } from '../types';

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const LedgerPage: React.FC = () => {
  const {
    ledgerMovements: storeMovements,
    ledgerTotal: storeTotal,
    locations,
    products,
  } = useInventoryData();

  const [movements, setMovements] = useState<StockMovement[]>(storeMovements);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 25,
    total: storeTotal || 0,
    totalPages: Math.max(1, Math.ceil((storeTotal || 0) / 25)),
  });

  const [loading, setLoading] = useState(() => storeMovements.length === 0);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [locationId, setLocationId] = useState<string>('ALL');
  const [movementType, setMovementType] = useState<string>('ALL');
  const [productId, setProductId] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Sync with background prefetch store
  useEffect(() => {
    if (storeMovements.length > 0 && locationId === 'ALL' && movementType === 'ALL' && productId === 'ALL' && !search && !startDate && !endDate) {
      setMovements(storeMovements);
      setPagination((prev) => ({
        ...prev,
        total: storeTotal,
        totalPages: Math.max(1, Math.ceil(storeTotal / prev.limit)),
      }));
      setLoading(false);
    }
  }, [storeMovements, storeTotal, locationId, movementType, productId, search, startDate, endDate]);

  const fetchLedger = async (pageToFetch = pagination.page, showSpinner = false) => {
    try {
      if (showSpinner) setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('page', pageToFetch.toString());
      params.append('limit', pagination.limit.toString());

      if (locationId !== 'ALL') params.append('locationId', locationId);
      if (movementType !== 'ALL') params.append('type', movementType);
      if (productId !== 'ALL') params.append('productId', productId);
      if (search.trim()) params.append('search', search.trim());
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await api.get<{
        movements: StockMovement[];
        pagination: PaginationMeta;
      }>(`/ledger?${params.toString()}`);

      setMovements(res.movements || []);
      setPagination(res.pagination || { page: 1, limit: 25, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stock ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const shouldShowSpinner = movements.length === 0 && storeMovements.length === 0;
    fetchLedger(1, shouldShowSpinner);
  }, [locationId, movementType, productId, startDate, endDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLedger(1);
  };

  const handleResetFilters = () => {
    setLocationId('ALL');
    setMovementType('ALL');
    setProductId('ALL');
    setSearch('');
    setStartDate('');
    setEndDate('');
  };

  const handleExportCsv = async () => {
    try {
      const csv = await api.get<string>('/ledger/export-csv');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `stock-ledger-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Failed to export ledger CSV: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const getTypeBadge = (type: MovementType) => {
    switch (type) {
      case 'PURCHASE_RECEIPT':
        return (
          <Badge variant="success" className="flex items-center gap-1 font-mono text-[11px]">
            <ArrowDownLeft className="w-3 h-3" /> PO RECEIPT
          </Badge>
        );
      case 'SALES_DISPATCH':
        return (
          <Badge variant="purple" className="flex items-center gap-1 font-mono text-[11px]">
            <ArrowUpRight className="w-3 h-3" /> SALES DISPATCH
          </Badge>
        );
      case 'TRANSFER_IN':
        return (
          <Badge variant="info" className="flex items-center gap-1 font-mono text-[11px]">
            <ArrowDownLeft className="w-3 h-3" /> TRANSFER IN
          </Badge>
        );
      case 'TRANSFER_OUT':
        return (
          <Badge variant="warning" className="flex items-center gap-1 font-mono text-[11px]">
            <ArrowUpRight className="w-3 h-3" /> TRANSFER OUT
          </Badge>
        );
      case 'ADJUSTMENT':
        return (
          <Badge variant="default" className="flex items-center gap-1 font-mono text-[11px] text-blue-300">
            <Sliders className="w-3 h-3" /> ADJUSTMENT
          </Badge>
        );
      default:
        return <Badge variant="default">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary-400" />
            Stock Ledger & Audit Trail
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Immutable, double-entry inventory transactions recorded with user identity, balance transitions, and references.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleExportCsv} icon={<Download className="w-3.5 h-3.5" />}>
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => fetchLedger(pagination.page)} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {(locationId !== 'ALL' || movementType !== 'ALL' || productId !== 'ALL' || search || startDate || endDate) && (
            <Button variant="ghost" size="sm" onClick={handleResetFilters} className="text-slate-400 hover:text-white">
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => fetchLedger(pagination.page)}>
            Retry
          </Button>
        </div>
      )}

      {/* Filter Controls Card */}
      <Card className="p-4 space-y-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Keyword Search */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search SKU, product, reference, notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
            />
          </div>

          {/* Movement Type */}
          <div>
            <select
              value={movementType}
              onChange={(e) => setMovementType(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
            >
              <option value="ALL">All Movement Types</option>
              <option value="PURCHASE_RECEIPT">Purchase Receipt</option>
              <option value="SALES_DISPATCH">Sales Dispatch</option>
              <option value="TRANSFER_IN">Transfer In</option>
              <option value="TRANSFER_OUT">Transfer Out</option>
              <option value="ADJUSTMENT">Stock Adjustment</option>
            </select>
          </div>

          {/* Location */}
          <div>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
            >
              <option value="ALL">All Warehouses</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.code} - {loc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Product Filter */}
          <div>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
            >
              <option value="ALL">All Products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.sku}] {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker Range */}
          <div>
            <input
              type="date"
              title="Filter by Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-primary-500"
            />
          </div>
        </form>
      </Card>

      {/* Ledger Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Date & Time</th>
                <th className="px-5 py-3.5 font-semibold">Type</th>
                <th className="px-5 py-3.5 font-semibold">Product / SKU</th>
                <th className="px-5 py-3.5 font-semibold">Warehouse</th>
                <th className="px-5 py-3.5 font-semibold text-right">Delta</th>
                <th className="px-5 py-3.5 font-semibold text-center">On-Hand Transition</th>
                <th className="px-5 py-3.5 font-semibold">Reference & Reason</th>
                <th className="px-5 py-3.5 font-semibold">Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary-500" />
                    Querying ledger entries...
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    No stock movement events match the selected filters.
                  </td>
                </tr>
              ) : (
                movements.map((m) => {
                  const isPositive = m.quantityDelta > 0;
                  const isZero = m.quantityDelta === 0;

                  return (
                    <tr key={m.id} className="hover:bg-slate-800/30 transition-colors">
                      {/* Timestamp */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-400">
                        <div className="font-mono text-slate-300">
                          {new Date(m.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-5 py-3.5 whitespace-nowrap">{getTypeBadge(m.type)}</td>

                      {/* Product */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="font-medium text-white">{m.product?.name || 'Unknown Product'}</div>
                        <div className="font-mono text-xs text-primary-400">{m.product?.sku}</div>
                      </td>

                      {/* Location */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-xs font-mono text-slate-300">
                          {m.location?.code}
                        </span>
                        <div className="text-xs text-slate-500 mt-0.5">{m.location?.name}</div>
                      </td>

                      {/* Delta */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-right font-mono font-semibold">
                        <span
                          className={
                            isPositive
                              ? 'text-emerald-400'
                              : isZero
                              ? 'text-slate-400'
                              : 'text-rose-400'
                          }
                        >
                          {isPositive ? `+${m.quantityDelta}` : m.quantityDelta}{' '}
                          <span className="text-xs text-slate-500 font-normal">
                            {m.product?.unitOfMeasure || 'units'}
                          </span>
                        </span>
                      </td>

                      {/* Balance Transition */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-center font-mono text-xs">
                        <span className="text-slate-400">{m.beforeOnHand}</span>
                        <span className="text-slate-600 mx-2">→</span>
                        <span className="text-white font-semibold">{m.afterOnHand}</span>
                      </td>

                      {/* Reference & Reason */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {m.referenceType && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-[11px] font-mono text-slate-300">
                              {m.referenceType}: {m.referenceId || 'N/A'}
                            </span>
                          )}
                          {m.reasonCode && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] font-semibold text-amber-400 uppercase">
                              {m.reasonCode}
                            </span>
                          )}
                        </div>
                        {m.notes && (
                          <div className="text-xs text-slate-500 mt-1 truncate max-w-xs" title={m.notes}>
                            {m.notes}
                          </div>
                        )}
                      </td>

                      {/* Operator */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-400">
                        <div className="text-slate-300 flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-500" />
                          {m.performedBy?.fullName || 'System User'}
                        </div>
                        <div className="text-[11px] text-slate-500 capitalize">
                          {m.performedBy?.role?.toLowerCase() || 'staff'}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between text-sm text-slate-400">
          <div>
            Showing <span className="font-semibold text-white">{movements.length}</span> of{' '}
            <span className="font-semibold text-white">{pagination.total}</span> movements
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              Page {pagination.page} of {Math.max(1, pagination.totalPages)}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1 || loading}
              onClick={() => fetchLedger(pagination.page - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => fetchLedger(pagination.page + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
export default LedgerPage;
