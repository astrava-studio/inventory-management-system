import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StockTransfer, TransferStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  FileText,
  Clock,
  ShieldCheck,
  Truck,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  CornerDownRight,
} from 'lucide-react';

interface TransferStepperProps {
  transfer: StockTransfer;
  onApprove?: (id: string) => Promise<void>;
  onDispatch?: (id: string) => Promise<void>;
  onReceive?: (id: string) => Promise<void>;
}

const STAGES: { status: TransferStatus; label: string; icon: any }[] = [
  { status: 'DRAFT', label: 'Draft', icon: FileText },
  { status: 'PENDING_APPROVAL', label: 'Pending Approval', icon: Clock },
  { status: 'APPROVED', label: 'Approved (Reserved)', icon: ShieldCheck },
  { status: 'DISPATCHED', label: 'Dispatched (In-Transit)', icon: Truck },
  { status: 'COMPLETED', label: 'Received & Logged', icon: CheckCircle2 },
];

export const TransferStepper: React.FC<TransferStepperProps> = ({
  transfer,
  onApprove,
  onDispatch,
  onReceive,
}) => {
  const { user } = useAuth();

  const getStageIndex = (status: TransferStatus) => {
    switch (status) {
      case 'DRAFT':
        return 0;
      case 'PENDING_APPROVAL':
        return 1;
      case 'APPROVED':
        return 2;
      case 'DISPATCHED':
        return 3;
      case 'PARTIALLY_RECEIVED':
      case 'RECEIVED':
      case 'COMPLETED':
        return 4;
      default:
        return 0;
    }
  };

  const currentIndex = getStageIndex(transfer.status);
  const isRequester = user?.id === transfer.requestedBy.id;
  const canApprove = (user?.role === 'ADMIN' || user?.role === 'MANAGER') && !isRequester;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#16181d]/80 p-6 backdrop-blur-xl space-y-6">
      {/* Transfer Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <div className="flex items-center space-x-3">
            <h3 className="text-base font-bold text-white font-mono">{transfer.transferNumber}</h3>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                transfer.status === 'COMPLETED'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : transfer.status === 'PENDING_APPROVAL'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                  : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              }`}
            >
              {transfer.status.replace('_', ' ')}
            </span>
          </div>
          <div className="mt-1 flex items-center space-x-2 text-xs text-slate-400">
            <span className="text-slate-300 font-medium">{transfer.sourceLocation.name}</span>
            <ArrowRight className="w-3 h-3 text-blue-400" />
            <span className="text-slate-300 font-medium">{transfer.destinationLocation.name}</span>
            <span>• Requested by {transfer.requestedBy.name}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {transfer.status === 'PENDING_APPROVAL' && (
            <>
              {isRequester ? (
                <div className="flex items-center space-x-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span>Self-approval blocked: Switch role to Manager or Admin</span>
                </div>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => onApprove && onApprove(transfer.id)}
                  disabled={!canApprove}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-500 transition-colors"
                >
                  Approve & Reserve Stock
                </motion.button>
              )}
            </>
          )}

          {transfer.status === 'APPROVED' && (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => onDispatch && onDispatch(transfer.id)}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-500 transition-colors flex items-center space-x-1.5"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Dispatch Goods</span>
            </motion.button>
          )}

          {transfer.status === 'DISPATCHED' && (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => onReceive && onReceive(transfer.id)}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-500 transition-colors flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Confirm Receipt & Update Cost</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* Animated Liquid Progress Stepper */}
      <div className="relative py-4">
        {/* Background Track Line */}
        <div className="absolute top-1/2 left-6 right-6 h-1 -translate-y-1/2 bg-white/[0.08] rounded-full" />

        {/* Animated Active Liquid Line */}
        <motion.div
          className="absolute top-1/2 left-6 h-1 -translate-y-1/2 bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full"
          initial={{ width: 0 }}
          animate={{
            width: `${(currentIndex / (STAGES.length - 1)) * 100}%`,
          }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* Step Nodes */}
        <div className="relative flex justify-between">
          {STAGES.map((stage, idx) => {
            const Icon = stage.icon;
            const isCompleted = idx < currentIndex;
            const isCurrent = idx === currentIndex;
            const isFuture = idx > currentIndex;

            return (
              <div key={stage.status} className="flex flex-col items-center">
                <motion.div
                  initial={false}
                  animate={{
                    scale: isCurrent ? 1.15 : 1,
                    backgroundColor: isCurrent
                      ? '#2563eb'
                      : isCompleted
                      ? '#1e293b'
                      : '#13151b',
                    borderColor: isCurrent
                      ? '#60a5fa'
                      : isCompleted
                      ? '#3b82f6'
                      : 'rgba(255, 255, 255, 0.1)',
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 text-white shadow-lg ${
                    isCurrent ? 'shadow-blue-500/40 ring-4 ring-blue-500/20' : ''
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-blue-400" />
                  ) : (
                    <Icon className={`w-4 h-4 ${isCurrent ? 'text-white' : 'text-slate-500'}`} />
                  )}

                  {isCurrent && (
                    <span className="absolute -inset-1 rounded-full border border-blue-400 animate-ping opacity-30" />
                  )}
                </motion.div>

                <div className="mt-3 text-center">
                  <span
                    className={`block text-xs font-semibold ${
                      isCurrent ? 'text-white' : isCompleted ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {stage.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Items in Transfer */}
      <div className="rounded-xl border border-white/[0.06] bg-black/30 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          Transfer Manifest Items
        </p>
        <div className="space-y-2">
          {transfer.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between text-xs py-1.5 border-b border-white/[0.04] last:border-0"
            >
              <div className="flex items-center space-x-2">
                <span className="font-mono text-blue-400 font-medium">{item.sku}</span>
                <span className="text-slate-200">{item.name}</span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-slate-400">
                  Requested: <strong className="text-white font-mono">{item.requestedQty}</strong> {item.unitOfMeasure}
                </span>
                {item.dispatchedQty !== null && (
                  <span className="text-indigo-400">
                    Dispatched: <strong className="font-mono">{item.dispatchedQty}</strong>
                  </span>
                )}
                {item.receivedQty !== null && (
                  <span className="text-emerald-400">
                    Received: <strong className="font-mono">{item.receivedQty}</strong>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Audit History Log */}
      {transfer.timeline?.length > 0 && (
        <div className="pt-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center space-x-1">
            <CornerDownRight className="w-3 h-3 text-blue-400" />
            <span>Audit Trail & State Transitions</span>
          </p>
          <div className="space-y-1.5 text-xs">
            {transfer.timeline.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between text-slate-400 text-[11px]">
                <div className="flex items-center space-x-2">
                  <span className="text-slate-500 font-mono">
                    {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-slate-300 font-medium">{entry.changedByName}</span>
                  <span>➔</span>
                  <span className="text-blue-300 font-mono font-semibold">{entry.toStatus}</span>
                  {entry.notes && <span className="text-slate-400 italic">({entry.notes})</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
