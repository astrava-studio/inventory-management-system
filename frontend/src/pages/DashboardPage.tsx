import React from 'react';
import { useInventoryData } from '../context/InventoryDataContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import {
  DollarSign,
  Package,
  AlertTriangle,
  FileDown,
  FileUp,
  PlusCircle,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
} from 'lucide-react';

interface DashboardPageProps {
  onNavigateToTab: (tab: string, initialSku?: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigateToTab }) => {
  const {
    dashboard: data,
    isDashboardLoading: isLoading,
    fetchDashboard,
    isPrefetching,
    isPrefetchDone,
  } = useInventoryData();

  const handleManualRefresh = () => {
    fetchDashboard(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Executive Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time warehouse valuation, low-stock alerts, and ledger activity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isPrefetching && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20 font-medium">
              <RefreshCw className="h-3 w-3 animate-spin text-blue-400" />
              Caching background tabs...
            </span>
          )}
          {isPrefetchDone && !isPrefetching && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 font-medium">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              Memory cache ready
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            isLoading={isLoading}
            icon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigateToTab('purchase-orders')}
            icon={<PlusCircle className="h-3.5 w-3.5" />}
          >
            New Purchase Order
          </Button>
        </div>
      </div>

      {/* 5 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Valuation */}
        <Card className="border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Valuation</span>
            <DollarSign className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-white mt-2 tabular-nums">
            ${data?.kpis.totalValuation.toLocaleString('en-US', { minimumFractionDigits: 2 }) ?? '0.00'}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Across active facilities
          </span>
        </Card>

        {/* Total Active SKUs */}
        <Card className="border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Active SKUs</span>
            <Package className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-white mt-2 tabular-nums">
            {data?.kpis.totalActiveSkus ?? 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Catalog inventory items</span>
        </Card>

        {/* Low-Stock Alert Count */}
        <Card className="border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Low-Stock SKUs</span>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-400 mt-2 tabular-nums">
            {data?.kpis.lowStockSkuCount ?? 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">At or below reorder point</span>
        </Card>

        {/* Open POs */}
        <Card className="border-l-4 border-l-indigo-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Open POs</span>
            <FileDown className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-xl font-bold text-white mt-2 tabular-nums">
            {data?.kpis.openPosCount ?? 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Draft & Ordered inbound</span>
        </Card>

        {/* Pending SOs */}
        <Card className="border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Pending SOs</span>
            <FileUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-white mt-2 tabular-nums">
            {data?.kpis.pendingSosCount ?? 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Awaiting fulfillment</span>
        </Card>
      </div>

      {/* Main Content Grid: Low-Stock Alerts & Recent Ledger Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 cols): Low Stock Alert Table */}
        <div className="lg:col-span-2 space-y-4">
          <Card
            title={
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span>Low-Stock Attention Required</span>
                <Badge variant="warning" size="sm">
                  {data?.lowStockAlerts.length ?? 0} Items
                </Badge>
              </div>
            }
            subtitle="Products where available quantity is at or below defined safety reorder points"
          >
            {data?.lowStockAlerts.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                All SKUs have sufficient buffer inventory above reorder points.
              </div>
            ) : (
              <div className="overflow-x-auto -mx-5 -mb-5">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/60 text-slate-400 border-y border-slate-800">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">SKU / Product</th>
                      <th className="py-2.5 px-4 font-semibold">Category</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Available</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Reorder Pt</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {data?.lowStockAlerts.map((item) => (
                      <tr key={item.productId} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-semibold text-white block tabular-nums">{item.sku}</span>
                          <span className="text-slate-400 text-[11px] block">{item.name}</span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="default" size="sm">
                            {item.category}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`font-bold tabular-nums ${
                              item.totalAvailable <= 0 ? 'text-rose-400' : 'text-amber-400'
                            }`}
                          >
                            {item.totalAvailable}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-400 tabular-nums">
                          {item.reorderPoint}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onNavigateToTab('purchase-orders', item.sku)}
                            className="text-[11px] py-1 px-2.5"
                          >
                            Create PO
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Right (1 col): Recent Ledger Activity Feed */}
        <div className="space-y-4">
          <Card
            title="Recent Stock Ledger Activity"
            subtitle="Latest 10 immutable stock movements"
            action={
              <button
                onClick={() => onNavigateToTab('ledger')}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium"
              >
                View Full Audit
              </button>
            }
          >
            {data?.recentMovements.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No stock movements logged yet.
              </div>
            ) : (
              <div className="space-y-3">
                {data?.recentMovements.map((mov) => {
                  const isPositive = mov.quantityDelta > 0;
                  return (
                    <div
                      key={mov.id}
                      className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-200 tabular-nums">
                            {mov.product?.sku}
                          </span>
                          <span className="text-[10px] text-slate-400">• {mov.location?.code}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate max-w-[180px]">
                          {mov.notes || mov.type}
                        </p>
                        <span className="text-[10px] text-slate-400 block tabular-nums">
                          {new Date(mov.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`inline-flex items-center font-bold tabular-nums text-xs px-2 py-0.5 rounded ${
                            isPositive
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {isPositive ? (
                            <ArrowUpRight className="h-3 w-3 mr-0.5" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3 mr-0.5" />
                          )}
                          {isPositive ? `+${mov.quantityDelta}` : mov.quantityDelta}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-1 tabular-nums">
                          Bal: {mov.afterOnHand}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
