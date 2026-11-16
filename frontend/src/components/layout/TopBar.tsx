import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useInventoryData } from '../../context/InventoryDataContext';
import { Search, LogOut, ShieldCheck, UserCheck, User, Zap, RefreshCw } from 'lucide-react';

interface TopBarProps {
  onSearchSku?: (sku: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onSearchSku }) => {
  const { user, logout } = useAuth();
  const { isPrefetching, isPrefetchDone } = useInventoryData();

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <ShieldCheck className="h-3 w-3" />
            ADMIN
          </span>
        );
      case 'MANAGER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
            <UserCheck className="h-3 w-3" />
            MANAGER
          </span>
        );
      case 'STAFF':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <User className="h-3 w-3" />
            STAFF
          </span>
        );
    }
  };

  return (
    <header className="h-16 bg-[#111827] border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
      {/* Search Input */}
      <div className="relative w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Quick search SKU, product..."
          onChange={(e) => onSearchSku?.(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
        />
      </div>

      {/* User Info & Actions */}
      <div className="flex items-center gap-4">
        {isPrefetching && (
          <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20 font-medium">
            <RefreshCw className="h-3 w-3 animate-spin text-blue-400" />
            Prefetching pages...
          </span>
        )}
        {isPrefetchDone && !isPrefetching && (
          <span
            className="hidden md:inline-flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 font-medium"
            title="All pages cached in memory for instant switching"
          >
            <Zap className="h-3 w-3 text-emerald-400 fill-emerald-400/20" />
            Instant Cache Ready
          </span>
        )}

        {getRoleBadge(user?.role)}

        <div className="text-right hidden sm:block">
          <span className="text-xs font-medium text-slate-200 block">{user?.fullName || 'User'}</span>
          <span className="text-[11px] text-slate-400 block">{user?.email}</span>
        </div>

        <button
          onClick={logout}
          title="Sign out"
          className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-colors"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};
