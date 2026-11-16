import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Workspace, User, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { useInventoryData } from '../context/InventoryDataContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import {
  Building2,
  UserPlus,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

export const WorkspacePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { invalidate } = useInventoryData();
  const isAdmin = user?.role === 'ADMIN';

  // Workspace profile
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [workspaceName, setWorkspaceName] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [isUpdatingWorkspace, setIsUpdatingWorkspace] = useState(false);
  const [workspaceSuccess, setWorkspaceSuccess] = useState<string | null>(null);

  // Team users
  const [team, setTeam] = useState<User[]>([]);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);

  // Invite modal
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('STAFF');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);

  // Change password modal
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const fetchWorkspace = async () => {
    try {
      const res = await api.get<{ workspace: Workspace }>('/workspace');
      setWorkspace(res.workspace);
      setWorkspaceName(res.workspace.name);
      setCurrency(res.workspace.currency);
    } catch (err) {
      console.error('Failed to load workspace:', err);
    }
  };

  const fetchTeam = async () => {
    setIsLoadingTeam(true);
    try {
      const res = await api.get<{ users: User[] }>('/users');
      setTeam(res.users);
    } catch (err) {
      console.error('Failed to load team users:', err);
    } finally {
      setIsLoadingTeam(false);
    }
  };

  useEffect(() => {
    fetchWorkspace();
    fetchTeam();
  }, []);

  const handleUpdateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingWorkspace(true);
    setWorkspaceSuccess(null);

    try {
      const res = await api.put<{ workspace: Workspace }>('/workspace', {
        name: workspaceName,
        currency,
      });
      setWorkspace(res.workspace);
      updateUser({ workspaceName: res.workspace.name, currency: res.workspace.currency });
      setWorkspaceSuccess('Workspace configuration saved successfully');
      await invalidate('all');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update workspace');
    } finally {
      setIsUpdatingWorkspace(false);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    setInviteError(null);

    try {
      await api.post('/users', {
        fullName: inviteFullName,
        email: inviteEmail,
        password: invitePassword,
        role: inviteRole,
      });

      setIsInviteModalOpen(false);
      setInviteFullName('');
      setInviteEmail('');
      setInvitePassword('');
      setInviteRole('STAFF');
      fetchTeam();
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : 'Failed to invite user');
    } finally {
      setIsInviting(false);
    }
  };

  const handleToggleStatus = async (targetUser: User) => {
    if (targetUser.id === user?.id) {
      alert('You cannot deactivate your own account.');
      return;
    }

    try {
      await api.patch(`/users/${targetUser.id}/status`, {
        isActive: !targetUser.isActive,
      });
      fetchTeam();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update user status');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChangingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      setPasswordSuccess('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPasswordSuccess(null);
      }, 1500);
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Workspace & Team Settings</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your company details, base currency, team access, and authentication security.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPasswordError(null);
              setPasswordSuccess(null);
              setIsPasswordModalOpen(true);
            }}
            icon={<KeyRound className="h-3.5 w-3.5" />}
          >
            Change Password
          </Button>

          {isAdmin && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setInviteError(null);
                setIsInviteModalOpen(true);
              }}
              icon={<UserPlus className="h-3.5 w-3.5" />}
            >
              Add Team Member
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Workspace Profile */}
        <div className="lg:col-span-1 space-y-4">
          <Card title="Workspace Profile" subtitle="Global organization settings">
            {workspaceSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{workspaceSuccess}</span>
              </div>
            )}

            <form onSubmit={handleUpdateWorkspace} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Workspace Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    disabled={!isAdmin}
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-60"
                  />
                  <Building2 className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Operating Currency
                </label>
                <select
                  disabled={!isAdmin}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500 disabled:opacity-60"
                >
                  <option value="INR">INR (₹ Indian Rupee)</option>
                  <option value="USD">USD ($ US Dollar)</option>
                  <option value="EUR">EUR (€ Euro)</option>
                  <option value="GBP">GBP (£ British Pound)</option>
                  <option value="CAD">CAD (CA$ Canadian Dollar)</option>
                  <option value="AUD">AUD (AU$ Australian Dollar)</option>
                </select>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  All inventory valuations and orders format in this currency.
                </span>
              </div>

              {workspace && (
                <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Active Team Members:</span>
                    <span className="font-semibold text-white">{workspace._count?.users ?? team.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Registered Facilities:</span>
                    <span className="font-semibold text-white">{workspace._count?.locations ?? '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Catalog SKUs:</span>
                    <span className="font-semibold text-white">{workspace._count?.products ?? '—'}</span>
                  </div>
                </div>
              )}

              {isAdmin && (
                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    className="w-full"
                    isLoading={isUpdatingWorkspace}
                  >
                    Save Workspace Settings
                  </Button>
                </div>
              )}
            </form>
          </Card>
        </div>

        {/* Right Column: Team Management */}
        <div className="lg:col-span-2 space-y-4">
          <Card
            title="Team & Access Control"
            subtitle={`Members with authorized login credentials to ${workspace?.name || 'this workspace'}`}
          >
            {isLoadingTeam ? (
              <div className="text-center py-8 text-slate-400 text-xs">Loading team roster...</div>
            ) : team.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">No team members found.</div>
            ) : (
              <div className="overflow-x-auto -mx-5 -my-5">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4 font-semibold">User</th>
                      <th className="py-3 px-4 font-semibold">Role</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">Created</th>
                      {isAdmin && <th className="py-3 px-4 font-semibold text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {team.map((u) => {
                      const isCurrentUser = u.id === user?.id;
                      return (
                        <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 text-xs">
                                {u.fullName.slice(0, 1).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-semibold text-white block">
                                  {u.fullName} {isCurrentUser && <span className="text-blue-400 font-normal">(You)</span>}
                                </span>
                                <span className="text-slate-400 text-[11px] block">{u.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {u.role === 'ADMIN' && (
                              <Badge variant="purple" size="sm">
                                ADMIN
                              </Badge>
                            )}
                            {u.role === 'MANAGER' && (
                              <Badge variant="info" size="sm">
                                MANAGER
                              </Badge>
                            )}
                            {u.role === 'STAFF' && (
                              <Badge variant="default" size="sm">
                                STAFF
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {u.isActive !== false ? (
                              <Badge variant="success" size="sm">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="danger" size="sm">
                                Suspended
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-400 tabular-nums">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                          </td>
                          {isAdmin && (
                            <td className="py-3 px-4 text-right">
                              {!isCurrentUser ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(u)}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                                    u.isActive !== false
                                      ? 'text-rose-400 hover:bg-rose-500/10'
                                      : 'text-emerald-400 hover:bg-emerald-500/10'
                                  }`}
                                >
                                  {u.isActive !== false ? (
                                    <>
                                      <ToggleRight className="h-3.5 w-3.5" />
                                      <span>Suspend</span>
                                    </>
                                  ) : (
                                    <>
                                      <ToggleLeft className="h-3.5 w-3.5" />
                                      <span>Activate</span>
                                    </>
                                  )}
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-500 italic">Self</span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Invite Team Member Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Invite New Team Member"
        description="Create credentials for an operator or manager to join your workspace."
      >
        <form onSubmit={handleInviteUser} className="space-y-4">
          {inviteError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{inviteError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={inviteFullName}
              onChange={(e) => setInviteFullName(e.target.value)}
              placeholder="e.g. Sarah Connor"
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Work Email *</label>
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="sarah@company.com"
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Initial Password *</label>
            <input
              type="password"
              required
              minLength={6}
              value={invitePassword}
              onChange={(e) => setInvitePassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Access Role *</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as UserRole)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            >
              <option value="STAFF">STAFF — Warehouse floor operations, views, receipts</option>
              <option value="MANAGER">MANAGER — Order approvals, adjustments, catalog</option>
              <option value="ADMIN">ADMIN — Full workspace configuration & team control</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsInviteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isInviting}
            >
              Add Member
            </Button>
          </div>
        </form>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Update Account Password"
        description="Verify your current password to set a new one."
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          {passwordError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          {passwordSuccess && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Current Password *</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">New Password *</label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPasswordModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isChangingPassword}
            >
              Update Password
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
