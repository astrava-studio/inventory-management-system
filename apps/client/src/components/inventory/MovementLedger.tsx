import React from 'react';
import { motion } from 'framer-motion';
import { StockMovement } from '../../types';
import { ShieldCheck, ArrowDownRight, ArrowUpRight, RefreshCw, AlertCircle } from 'lucide-react';

interface MovementLedgerProps {
  movements: StockMovement[];
  onRefresh: () => void;
}

export const MovementLedger: React.FC<MovementLedgerProps> = ({ movements, onRefresh }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>Immutable Movement Ledger</span>
          </h2>
          <p className="text-xs text-slate-400">
            Every inventory change is cryptographically verifiable, traceable, and linked to a reference ID.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#12141a]/80 backdrop-blur-xl shadow-xl">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-white/[0.08] bg-white/[0.02] text-slate-400 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3.5 pl-6 pr-4">Timestamp</th>
              <th className="py-3.5 px-4">Location</th>
              <th className="py-3.5 px-4">Type</th>
              <th className="py-3.5 px-4">Product / SKU</th>
              <th className="py-3.5 px-4">Delta Qty</th>
              <th className="py-3.5 px-4">Unit Cost</th>
              <th className="py-3.5 px-4">Balance After</th>
              <th className="py-3.5 pr-6">Reason / Ref</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {movements.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  No stock movements recorded yet.
                </td>
              </tr>
            ) : (
              movements.map((m, idx) => {
                const isIncoming =
                  m.movementType === 'PURCHASE_RECEIPT' ||
                  m.movementType === 'TRANSFER_IN' ||
                  m.movementType === 'ADJUSTMENT_IN';

                return (
                  <motion.tr
                    key={m.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.02 }}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-3.5 pl-6 pr-4 font-mono text-[11px] text-slate-400">
                      {new Date(m.timestamp).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      <span className="rounded bg-white/[0.04] px-1.5 py-0.5 text-[11px] border border-white/[0.06]">
                        {m.locationCode}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider ${
                          isIncoming
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {isIncoming ? (
                          <ArrowDownRight className="w-3 h-3" />
                        ) : (
                          <ArrowUpRight className="w-3 h-3" />
                        )}
                        <span>{m.movementType.replace('_', ' ')}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-white">{m.productName}</p>
                      <p className="font-mono text-[10px] text-blue-400">{m.productSku}</p>
                    </td>

                    <td
                      className={`py-3.5 px-4 font-mono font-bold ${
                        isIncoming ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isIncoming ? `+${m.quantity}` : `-${m.quantity}`}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      ${m.unitCost.toFixed(2)}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-white font-medium">
                      {m.balanceAfter}
                    </td>

                    <td className="py-3.5 pr-6 text-slate-400 text-[11px] max-w-xs truncate">
                      {m.reason || m.referenceType || 'System movement'}
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
