import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { User } from '../types';
import { Boxes, ShieldCheck, UserCheck, ArrowRight, Building2, Sparkles, Key, Check } from 'lucide-react';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (res: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [mode, setMode] = useState<'signin' | 'register'>('signin');

  // Sign in fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register fields
  const [fullName, setFullName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [currency, setCurrency] = useState('INR');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google OAuth Client ID state
  const [googleClientId, setGoogleClientId] = useState<string>(() => {
    return (
      (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) ||
      localStorage.getItem('astrava_google_client_id') ||
      ''
    );
  });
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [clientIdInput, setClientIdInput] = useState('');
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  const handleGoogleCredentialResponse = useCallback(
    async (response: { credential: string }) => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await api.post<{ token: string; user: User }>('/auth/google', {
          credential: response.credential,
          workspaceName: mode === 'register' ? workspaceName || undefined : undefined,
          currency: mode === 'register' ? currency || undefined : undefined,
        });

        login(data.token, data.user);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Google authentication failed');
      } finally {
        setIsLoading(false);
      }
    },
    [mode, workspaceName, currency, login]
  );

  // Initialize and render Google Identity Services button
  useEffect(() => {
    if (!googleClientId) return;

    const interval = setInterval(() => {
      if (window.google?.accounts?.id && googleBtnContainerRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleCredentialResponse,
          });

          // Clear previous button render if any
          googleBtnContainerRef.current.innerHTML = '';

          window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
            type: 'standard',
            theme: 'filled_black',
            size: 'large',
            text: mode === 'signin' ? 'signin_with' : 'signup_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: 380,
          });

          clearInterval(interval);
        } catch (e) {
          console.error('Error rendering Google button:', e);
        }
      }
    }, 200);

    return () => clearInterval(interval);
  }, [googleClientId, mode, handleGoogleCredentialResponse]);

  const handleGoogleButtonClick = () => {
    if (!googleClientId) {
      setIsConfigModalOpen(true);
      return;
    }

    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    } else {
      setIsConfigModalOpen(true);
    }
  };

  const handleSaveClientId = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = clientIdInput.trim();
    if (!cleanId) return;

    localStorage.setItem('astrava_google_client_id', cleanId);
    setGoogleClientId(cleanId);
    setIsConfigModalOpen(false);
    setError(null);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
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

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.post<{ token: string; user: User }>('/auth/register', {
        fullName,
        email: registerEmail,
        password: registerPassword,
        workspaceName,
        currency,
      });
      login(data.token, data.user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string) => {
    setMode('signin');
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
            Multi-Tenant Warehouse Inventory & Audit Ledger SaaS
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'signin'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'register'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Create Workspace
          </button>
        </div>

        {/* Form Card */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {error}
            </div>
          )}

          {/* Google Sign In / Sign Up Option */}
          <div className="space-y-3">
            <div ref={googleBtnContainerRef} className="flex justify-center w-full min-h-[40px]">
              <button
                type="button"
                onClick={handleGoogleButtonClick}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 text-slate-100 border border-slate-700/80 hover:border-slate-600 rounded-lg py-2.5 px-4 text-xs font-medium transition-all shadow-sm group disabled:opacity-50"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{mode === 'signin' ? 'Sign in with Google' : 'Sign up with Google'}</span>
              </button>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-3 text-[10px] uppercase tracking-wider text-slate-500 font-medium">
                Or continue with email
              </span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>
          </div>

          {mode === 'signin' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Work Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@inventory.local"
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
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Company / Workspace Name</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder="e.g. Acme Logistics Global"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <Building2 className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Your Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Base Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="INR">INR (₹ Indian Rupee)</option>
                    <option value="USD">USD ($ US Dollar)</option>
                    <option value="EUR">EUR (€ Euro)</option>
                    <option value="GBP">GBP (£ British Pound)</option>
                    <option value="CAD">CAD (CA$ Canadian Dollar)</option>
                    <option value="AUD">AUD (AU$ Australian Dollar)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Work Email</label>
                <input
                  type="email"
                  required
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  placeholder="admin@mycompany.com"
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium text-xs py-2.5 px-4 rounded-lg transition-all focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 text-blue-200" />
                    <span>Create Workspace & Start Free</span>
                  </>
                )}
              </button>
            </form>
          )}

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
                <span className="text-[10px] font-semibold text-purple-300">Tenant A (INR)</span>
                <span className="text-[9px] text-slate-500">Astrava Admin</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('admin@nexus.local')}
                className="flex flex-col items-center p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-500/10 text-slate-300 transition-all text-center"
              >
                <ShieldCheck className="h-4 w-4 text-emerald-400 mb-1" />
                <span className="text-[10px] font-semibold text-emerald-300">Tenant B (USD)</span>
                <span className="text-[9px] text-slate-500">Nexus Admin</span>
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
            </div>
          </div>
        </div>

        {/* Security Invariant Note */}
        <p className="text-[11px] text-center text-slate-400">
          Astrava Studio Working Standard • Strict Zero-Race Condition Multi-Tenant Engine
        </p>
      </div>

      {/* Google OAuth Client ID Configuration Modal */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Key className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Connect Google OAuth Client ID</h3>
                <p className="text-xs text-slate-400">
                  Paste your Web Client ID from Google Cloud Console
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveClientId} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Google Client ID
                </label>
                <input
                  type="text"
                  required
                  value={clientIdInput}
                  onChange={(e) => setClientIdInput(e.target.value)}
                  placeholder="e.g. 123456789-abcdef.apps.googleusercontent.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  This connects your Google Cloud OAuth app directly with Astrava.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-md inline-flex items-center gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Save & Connect</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
