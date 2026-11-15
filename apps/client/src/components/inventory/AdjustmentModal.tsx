import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StockBalance } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../config';
import { X, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface AdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  balance: StockBalance | null;
  onAdjustmentComplete: () => void;
}

export const AdjustmentModal: React.FC<AdjustmentModalProps> = ({
  isOpen,
  onClose,
  balance,
  onAdjustmentComplete,
}) => {
  const { user } = useAuth();
  const [delta, setDelta] = useState<string>('');
  const [reason, setReason] = useState<string>('DAMAGED');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || !balance) return null;

  const currentOnHand = balance.onHand;
  const currentReserved = balance.reserved;
  const numDelta = parseFloat(delta) || 0;
  const previewOnHand = currentOnHand + numDelta;
  const isNegative = previewOnHand < 0;
  const isBelowReserved = previewOnHand < currentReserved;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numDelta === 0) {
      setError('Adjustment amount cannot be zero');
      return;
    }
    if (isNegative) {
      setError(`Cannot reduce below zero. Available stock is strictly protected.`);
      return;
    }
    if (isBelowReserved) {
      setError(`Stock cannot fall below ${currentReserved} (currently reserved for active transfers)`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/inventory/adjustments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId: balance.locationId,
          productId: balance.productId,
          deltaQuantity: numDelta,
          reason,
          notes,
          userId: user?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Adjustment failed');
      }

      onAdjustmentComplete();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', stiffness: 450, damping: 30 }}
          className="relative w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#16181d] p-6 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div>
              <h3 className="text-base font-bold text-white">Controlled Stock Adjustment</h3>
              <p className="text-xs text-slate-400">
                {balance.productName} ({balance.sku})
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Balance Overview */}
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-white/[0.02] p-3 border border-white/[0.06] text-xs">
              <div>
                <span className="text-slate-400">Current On Hand:</span>
                <p className="text-sm font-bold font-mono text-white mt-0.5">{currentOnHand} {balance.unitOfMeasure}</p>
              </div>
              <div>
                <span className="text-slate-400">Reserved:</span>
                <p className="text-sm font-bold font-mono text-indigo-400 mt-0.5">{currentReserved} {balance.unitOfMeasure}</p>
              </div>
            </div>

            {/* Delta Input */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Adjustment Delta (+ to add, - to deduct)
              </label>
              <input
                type="number"
                step="1"
                required
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                placeholder="e.g. -5 or +10"
                className="w-full rounded-xl border border-white/[0.1] bg-black/40 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none font-mono"
              />
            </div>

            {/* Reason Selector */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Reason</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-xl border border-white/[0.1] bg-black/40 px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="DAMAGED">Damaged Goods</option>
                <option value="FOUND">Found Stock / Surplus</option>
                <option value="CYCLE_COUNT">Cycle Count Discrepancy</option>
                <option value="EXPIRED">Expired / Obsolete</option>
                <option value="THEFT">Shrinkage / Loss</option>
                <option value="OTHER">Other Reason</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Audit Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional explanation for audit trail..."
                className="w-full rounded-xl border border-white/[0.1] bg-black/40 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Calculation Preview */}
            <div
              className={`rounded-xl p-3 border text-xs flex items-center justify-between ${
                isNegative || isBelowReserved
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
              }`}
            >
              <span>Projected Balance:</span>
              <span className="font-bold font-mono text-sm">
                {previewOnHand} {balance.unitOfMeasure}
              </span>
            </div>

            {error && (
              <div className="flex items-center space-x-2 text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.05]"
              >
                Cancel
              </button>
              <motion.button
                whileTap={{ scale: 0.96 }}
                type="submit"
                disabled={isSubmitting || isNegative || isBelowReserved}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md shadow-blue-500/20 disabled:opacity-50"
              >
                {isSubmitting ? 'Recording...' : 'Commit Adjustment'}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
