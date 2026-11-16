import React from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  Layers,
  FileDown,
  FileUp,
  ArrowLeftRight,
  History,
  Boxes,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Products Catalog', icon: Package },
    { id: 'inventory', label: 'Stock Levels', icon: Layers },
    { id: 'purchase-orders', label: 'Purchase Orders', icon: FileDown },
    { id: 'sales-orders', label: 'Sales Orders', icon: FileUp },
    { id: 'transfers', label: 'Stock Transfers', icon: ArrowLeftRight },
    { id: 'ledger', label: 'Stock Ledger', icon: History },
  ];

  return (
    <aside className="w-64 bg-[#111827] border-r border-slate-800 flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
        <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
          <Boxes className="h-5 w-5" />
        </div>
        <div>
          <span className="font-bold text-white tracking-wide text-sm block">ASTRAVA WMS</span>
          <span className="text-[10px] text-blue-400 font-medium tracking-wider uppercase">Multi-Location Core</span>
        </div>
      </div>

      {/* Nav List */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Operations
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'text-blue-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeNavPill"
                  className="absolute inset-0 bg-blue-600/15 border border-blue-500/30 rounded-lg -z-0"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <Icon className={`relative z-10 h-4 w-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
              <span className="relative z-10">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* System Invariant Footer Tag */}
      <div className="p-4 m-3 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Zero-Race Engine</span>
        </div>
        <p className="text-slate-400 text-[10px] leading-relaxed">
          Row-level locks & check constraints actively prevent negative balances.
        </p>
      </div>
    </aside>
  );
};
