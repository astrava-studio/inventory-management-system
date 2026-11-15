import React from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, ArrowLeftRight, Boxes, History, Settings, ShieldCheck } from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventory Balances', icon: Boxes },
    { id: 'transfers', label: 'Stock Transfers', icon: ArrowLeftRight },
    { id: 'movements', label: 'Movement Ledger', icon: History },
  ];

  return (
    <aside className="w-64 border-r border-white/[0.08] bg-[#12141a]/60 backdrop-blur-md flex flex-col justify-between p-4 shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        <div>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Workflows
          </p>
          <nav className="mt-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`group relative flex w-full items-center space-x-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                    isActive ? 'text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 rounded-xl bg-blue-600/15 border border-blue-500/30"
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    />
                  )}
                  <Icon
                    className={`h-4 w-4 relative z-10 transition-transform duration-200 group-hover:scale-110 ${
                      isActive ? 'text-blue-400' : 'text-slate-400'
                    }`}
                  />
                  <span className="relative z-10">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* System Invariant Checklist */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs space-y-2">
          <div className="flex items-center space-x-1.5 text-emerald-400 font-medium text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Guaranteed Invariants</span>
          </div>
          <ul className="text-[11px] text-slate-400 space-y-1">
            <li className="flex items-center space-x-1">
              <span className="text-emerald-400">✓</span>
              <span>Zero negative stock balances</span>
            </li>
            <li className="flex items-center space-x-1">
              <span className="text-emerald-400">✓</span>
              <span>Perpetual weighted avg cost</span>
            </li>
            <li className="flex items-center space-x-1">
              <span className="text-emerald-400">✓</span>
              <span>Self-approval blocked</span>
            </li>
            <li className="flex items-center space-x-1">
              <span className="text-emerald-400">✓</span>
              <span>Immutable movement ledger</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Cloud DB Connection Status */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-slate-300">Aiven PostgreSQL</span>
          </div>
          <span className="text-[10px] text-slate-400">SSL</span>
        </div>
        <p className="mt-1 text-[10px] text-slate-400 font-mono truncate">pg-3e0355f2...aivencloud.com</p>
      </div>
    </aside>
  );
};
