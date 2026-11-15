import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { Building2, Shield, UserCircle, Bell, ChevronDown } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, activeLocation, setActiveLocation, loginAs } = useAuth();

  return (
    <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-white/[0.08] bg-[#0e0f12]/90 px-6 backdrop-blur-xl">
      {/* Brand & Organization */}
      <div className="flex items-center space-x-3 shrink-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 shadow-md shadow-blue-500/20">
          <span className="text-base font-black tracking-tight text-white">A</span>
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-white tracking-wide text-sm">ASTRAVA</span>
            <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium tracking-wider text-blue-400 border border-blue-500/20">
              CORE
            </span>
          </div>
          <span className="text-xs text-slate-400">{user?.organizationName || 'Logistics Cloud'}</span>
        </div>
      </div>

      {/* Location Switcher (Animated Pill) */}
      <div className="hidden md:flex items-center bg-white/[0.04] p-1 rounded-xl border border-white/[0.06] shrink-0">
        {user?.locations.map((loc) => {
          const isActive = activeLocation?.id === loc.id;
          return (
            <button
              key={loc.id}
              onClick={() => setActiveLocation(loc)}
              className="relative px-3 py-1.5 text-xs font-medium transition-colors duration-200"
            >
              {isActive && (
                <motion.div
                  layoutId="activeLocationPill"
                  className="absolute inset-0 rounded-lg bg-blue-600 shadow-sm shadow-blue-500/30"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
              <span className={`relative z-10 flex items-center space-x-1.5 ${isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                <Building2 className="w-3.5 h-3.5" />
                <span>{loc.code}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Role Testing Switcher & User Profile */}
      <div className="flex items-center space-x-3 shrink-0">
        {/* Quick Role Toggle for Testing Permissions */}
        <div className="flex items-center space-x-1 bg-white/[0.03] p-1 rounded-lg border border-white/[0.06]">
          <span className="hidden sm:inline px-1.5 text-[11px] text-slate-400">Role:</span>
          {(['ADMIN', 'MANAGER', 'STAFF'] as const).map((r) => (
            <button
              key={r}
              onClick={() => loginAs(r)}
              className={`px-2 py-0.5 text-[11px] font-medium rounded transition-all ${
                user?.role === r
                  ? 'bg-blue-600/40 text-blue-300 border border-blue-500/40 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* User Card */}
        <div className="flex items-center space-x-2.5 pl-3 border-l border-white/[0.08]">
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center text-xs font-semibold text-white shrink-0">
            {user?.fullName?.charAt(0) || 'U'}
          </div>
          <div className="hidden lg:block text-left max-w-[120px]">
            <p className="text-xs font-medium text-white truncate">{user?.fullName?.split(' ')[0]}</p>
            <p className="text-[10px] text-blue-400 font-mono">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
};
