'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Shield,
  ShieldCheck,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  UserPlus,
  Eye,
  Activity,
  Key,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ADMIN_ROLES } from '../../lib/server/permissions';

export const AdminUsersView: React.FC = () => {
  const { user: currentUser, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showPermissions, setShowPermissions] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'staff',
    status: 'active',
    password: '',
  });

  const fetchUsers = () => {
    setIsLoading(true);
    fetch('/api/admin?type=admin_users')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setUsers(data?.users || []);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  };

  const fetchRoles = () => {
    fetch('/api/admin?type=admin_users')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setRoles(data?.roles || []);
      });
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    if (form.password && form.password.length < 8) {
      alert('Password must be at least 8 characters long.');
      return;
    }
    try {
      const res = await fetch('/api/admin?type=admin_users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', ...form }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setShowModal(false);
        setForm({ name: '', email: '', phone: '', role: 'staff', status: 'active', password: '' });
        fetchUsers();
      } else {
        alert(data?.error || 'Could not create staff member.');
      }
    } catch (e) {
      console.error('Failed to invite user:', e);
      alert('Failed to create staff member.');
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      const res = await fetch('/api/admin?type=admin_users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', id: userId, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(data?.error || 'Could not update role.');
        return;
      }
      fetchUsers();
    } catch (e) {
      console.error('Failed to update role:', e);
      alert('Failed to update role.');
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const allPermissions = [
    'view_dashboard', 'manage_products', 'manage_categories', 'manage_seo',
    'manage_orders', 'manage_customers', 'manage_payments', 'manage_media',
    'manage_campaigns', 'manage_festivals', 'manage_coupons', 'manage_hampers',
    'manage_inventory', 'manage_delivery', 'manage_users', 'manage_permissions',
    'manage_settings', 'view_audit_logs', 'export_data', 'import_data',
  ];

  const assignableRoles = ADMIN_ROLES.filter((r) => r !== 'super_admin');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-display text-[var(--text-main)]">Staff & Permissions</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Manage admin users, roles, and permissions</p>
        </div>
        {isSuperAdmin && (
          <button
            id="admin-invite-btn"
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white text-xs font-semibold rounded-xl hover:opacity-90 transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Invite Staff
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4">
          <div className="text-2xl font-bold text-[var(--text-main)]">{users.length}</div>
          <div className="text-xs text-[var(--text-muted)] mt-0.5">Total Staff</div>
        </div>
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4">
          <div className="text-2xl font-bold text-[var(--success)]">
            {users.filter((u) => u.status === 'active').length}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-0.5">Active</div>
        </div>
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4">
          <div className="text-2xl font-bold text-[var(--primary)]">
            {roles.length}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-0.5">Roles</div>
        </div>
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4">
          <div className="text-2xl font-bold text-[var(--danger)]">
            {users.filter((u) => u.status === 'inactive').length}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-0.5">Inactive</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
        <input
          id="admin-users-search"
          type="text"
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
        />
      </div>

      {/* Users Table */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-[var(--text-muted)]">Loading staff...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--text-muted)]">No staff members found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Staff Member</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Role</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Status</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Permissions</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <React.Fragment key={u.id}>
                    <tr className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-subtle)]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center text-xs font-bold">
                            {u.name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-[var(--text-main)]">{u.name}</div>
                            <div className="text-xs text-[var(--text-muted)]">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="text-xs px-2 py-1 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-lg focus:outline-none"
                        >
                          {assignableRoles.map((r) => (
                            <option key={r} value={r}>
                              {r.replace(/_/g, ' ')}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.status === 'active'
                              ? 'bg-[var(--success-light)] text-[var(--success)]'
                              : 'bg-[var(--danger-light)] text-[var(--danger)]'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setShowPermissions(showPermissions === String(u.id) ? null : String(u.id))}
                          className="flex items-center gap-1 text-xs text-[var(--primary)] hover:underline cursor-pointer"
                        >
                          <Shield className="w-3 h-3" />
                          {showPermissions === String(u.id) ? 'Hide' : 'View'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button type="button" className="p-1 hover:bg-[var(--bg-subtle)] rounded-lg cursor-pointer" title="View">
                            <Eye className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {showPermissions === String(u.id) && (
                      <tr>
                        <td colSpan={5} className="px-4 py-3 bg-[var(--bg-subtle)]">
                          <div className="flex flex-wrap gap-1.5">
                            {allPermissions.map((p) => (
                              <span key={p} className="px-2 py-0.5 bg-[var(--bg-surface)] border border-[var(--border)] rounded text-[10px] text-[var(--text-muted)]">
                                {p.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" id="admin-invite-modal">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold font-display text-[var(--text-main)]">Invite Staff</h2>
              <button type="button" onClick={() => setShowModal(false)} className="p-1 hover:bg-[var(--bg-subtle)] rounded-lg cursor-pointer">
                <X className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            </div>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">Name *</label>
                <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">Email *</label>
                <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">Phone</label>
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">Role</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full px-3 py-2 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-sm focus:outline-none">
                  {assignableRoles.map((r) => (
                    <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">Password</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-[var(--primary)] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition">Send Invite</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};