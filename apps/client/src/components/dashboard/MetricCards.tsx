import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Package, ArrowLeftRight, AlertTriangle } from 'lucide-react';

interface MetricCardsProps {
  totalValue: number;
  totalUnits: number;
  activeTransfers: number;
  lowStockCount: number;
  locationName: string;
}

const AnimatedCounter: React.FC<{ value: number; prefix?: string; decimals?: number }> = ({
  value,
  prefix = '',
  decimals = 0,
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 800; // ms
    const stepTime = 16;
    const steps = duration / stepTime;
    const increment = value / steps;
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(start);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <span>
      {prefix}
      {displayValue.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
    </span>
  );
};

export const MetricCards: React.FC<MetricCardsProps> = ({
  totalValue,
  totalUnits,
  activeTransfers,
  lowStockCount,
  locationName,
}) => {
  const cards = [
    {
      title: 'Inventory Valuation',
      value: totalValue,
      prefix: '$',
      decimals: 2,
      subtitle: `Weighted avg cost (${locationName})`,
      icon: DollarSign,
      color: 'from-blue-500/20 to-blue-600/5',
      borderColor: 'border-blue-500/30',
      iconColor: 'text-blue-400',
    },
    {
      title: 'Units on Hand',
      value: totalUnits,
      prefix: '',
      decimals: 0,
      subtitle: 'Across all stocked SKUs',
      icon: Package,
      color: 'from-emerald-500/20 to-emerald-600/5',
      borderColor: 'border-emerald-500/30',
      iconColor: 'text-emerald-400',
    },
    {
      title: 'Active Transfers',
      value: activeTransfers,
      prefix: '',
      decimals: 0,
      subtitle: 'In-transit or pending approval',
      icon: ArrowLeftRight,
      color: 'from-indigo-500/20 to-indigo-600/5',
      borderColor: 'border-indigo-500/30',
      iconColor: 'text-indigo-400',
    },
    {
      title: 'Low-Stock Alerts',
      value: lowStockCount,
      prefix: '',
      decimals: 0,
      subtitle: 'Items below minimum buffer',
      icon: AlertTriangle,
      color: lowStockCount > 0 ? 'from-amber-500/25 to-amber-600/5' : 'from-slate-500/10 to-slate-600/5',
      borderColor: lowStockCount > 0 ? 'border-amber-500/40' : 'border-white/[0.08]',
      iconColor: lowStockCount > 0 ? 'text-amber-400' : 'text-slate-400',
      pulse: lowStockCount > 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -3, transition: { duration: 0.15 } }}
            className={`relative overflow-hidden rounded-2xl border ${card.borderColor} bg-gradient-to-b ${card.color} p-5 backdrop-blur-xl shadow-lg shadow-black/20`}
          >
            {card.pulse && (
              <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{card.title}</span>
              <div className={`p-2 rounded-xl bg-white/[0.05] border border-white/[0.08] ${card.iconColor}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3">
              <p className="text-2xl font-bold tracking-tight text-white font-mono">
                <AnimatedCounter value={card.value} prefix={card.prefix} decimals={card.decimals} />
              </p>
              <p className="mt-1 text-xs text-slate-400 truncate">{card.subtitle}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
