import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StockBalance } from '../../types';
import { AdjustmentModal } from './AdjustmentModal';
import { Search, SlidersHorizontal, AlertTriangle, ArrowUpDown, Plus } from 'lucide-react';

interface InventoryTableProps {
  balances: StockBalance[];
  onRefresh: () => void;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({ balances, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeAdjustBalance, setActiveAdjustBalance] = useState<StockBalance | null>(null);

  const categories = ['ALL', ...Array.from(new Set(balances.map((b) => b.category)))];

  const filtered = balances.filter((b) => {
    const matchesSearch =
      b.productName.toLowerCase().includes(search.toLowerCase()) ||
      b.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || b.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by SKU or Product Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none backdrop-blur-md"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'bg-white/[0.03] text-slate-400 hover:text-white border border-white/[0.06]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#12141a]/80 backdrop-blur-xl shadow-xl">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-white/[0.08] bg-white/[0.02] text-slate-400 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3.5 pl-6 pr-4">Product Details</th>
              <th className="py-3.5 px-4">Location</th>
              <th className="py-3.5 px-4">Available / Buffer</th>
              <th className="py-3.5 px-4">On Hand</th>
              <th className="py-3.5 px-4">Reserved</th>
              <th className="py-3.5 px-4">Weighted Avg Cost</th>
              <th className="py-3.5 px-4">Total Value</th>
              <th className="py-3.5 pr-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  No stock items match your search filters.
                </td>
              </tr>
            ) : (
              filtered.map((b, idx) => {
                const stockRatio = Math.min(1, b.onHand / (b.minThreshold * 3));
                const isCriticallyLow = b.onHand <= b.minThreshold;

                return (
                  <motion.tr
                    key={b.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: idx * 0.03 }}
                    className="group hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-3.5 pl-6 pr-4">
                      <div className="flex items-center space-x-2.5">
                        {isCriticallyLow && (
                          <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                        )}
                        <div>
                          <p className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                            {b.productName}
                          </p>
                          <div className="flex items-center space-x-2 mt-0.5">
                            <span className="font-mono text-[10px] text-blue-400 bg-blue-500/10 px-1 rounded">
                              {b.sku}
                            </span>
                            <span className="text-[10px] text-slate-400">{b.category}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-300">
                      <span className="rounded bg-white/[0.04] px-2 py-1 text-[11px] font-mono border border-white/[0.06]">
                        {b.locationCode}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-1 w-28">
                        <div className="flex justify-between text-[11px]">
                          <span className={`font-mono font-bold ${isCriticallyLow ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {b.available}
                          </span>
                          <span className="text-slate-400">min {b.minThreshold}</span>
                        </div>
                        {/* Animated stock level indicator */}
                        <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${stockRatio * 100}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            className={`h-full rounded-full ${
                              isCriticallyLow
                                ? 'bg-gradient-to-r from-amber-500 to-red-500'
                                : 'bg-gradient-to-r from-blue-500 to-emerald-400'
                            }`}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-medium text-white">
                      {b.onHand} <span className="text-slate-400 text-[10px]">{b.unitOfMeasure}</span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-indigo-400">
                      {b.reserved > 0 ? (
                        <span className="bg-indigo-500/10 px-1.5 py-0.5 rounded text-[11px] border border-indigo-500/20">
                          {b.reserved}
                        </span>
                      ) : (
                        '0'
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      ${b.averageUnitCost.toFixed(2)}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-semibold text-white">
                      ${b.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3.5 pr-6 text-right">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setActiveAdjustBalance(b)}
                        className="rounded-lg border border-white/[0.1] bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:border-blue-500/50 hover:bg-blue-600/20 hover:text-white transition-all shadow-sm"
                      >
                        Adjust
                      </motion.button>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Controlled Adjustment Modal */}
      <AdjustmentModal
        isOpen={!!activeAdjustBalance}
        balance={activeAdjustBalance}
        onClose={() => setActiveAdjustBalance(null)}
        onAdjustmentComplete={onRefresh}
      />
    </div>
  );
};
