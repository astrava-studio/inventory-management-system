import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { User } from '../types';
import { Boxes, ShieldCheck, UserCheck, User as UserIcon, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.post<{ token: string; user: User }>('/auth/login', {
        email,
        password,
      });
      login(data.token, data.user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Banner */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 rounded-xl bg-blue-600 items-center justify-center text-white shadow-xl shadow-blue-600/30 mb-2">
            <Boxes className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide">ASTRAVA Inventory System</h1>
          <p className="text-xs text-slate-400">
            Multi-Location Warehouse Inventory & Audit Ledger
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Work Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@inventory.local"
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs py-2.5 px-4 rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#111827] disabled:opacity-50"
            >
              {isLoading ? (
                <span className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Logins */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
              Quick 1-Click Demo Profiles:
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@inventory.local')}
                className="flex flex-col items-center p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-purple-500/50 hover:bg-purple-500/10 text-slate-300 transition-all text-center"
              >
                <ShieldCheck className="h-4 w-4 text-purple-400 mb-1" />
                <span className="text-[10px] font-semibold text-purple-300">Admin</span>
                <span className="text-[9px] text-slate-500">Full Access</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('manager@inventory.local')}
                className="flex flex-col items-center p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-blue-500/50 hover:bg-blue-500/10 text-slate-300 transition-all text-center"
              >
                <UserCheck className="h-4 w-4 text-blue-400 mb-1" />
                <span className="text-[10px] font-semibold text-blue-300">Manager</span>
                <span className="text-[9px] text-slate-500">Operations</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('staff@inventory.local')}
                className="flex flex-col items-center p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-500/10 text-slate-300 transition-all text-center"
              >
                <UserIcon className="h-4 w-4 text-emerald-400 mb-1" />
                <span className="text-[10px] font-semibold text-emerald-300">Staff</span>
                <span className="text-[9px] text-slate-500">Warehouse</span>
              </button>
            </div>
          </div>
        </div>

        {/* Security Invariant Note */}
        <p className="text-[11px] text-center text-slate-400">
          Astrava Studio Working Standard • Strict Zero-Race Condition Stock Engine
        </p>
      </div>
    </div>
  );
};
