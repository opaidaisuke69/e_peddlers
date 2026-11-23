import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  CheckCircle,
  XCircle,
  Mail,
  Phone,
  Lock,
  RefreshCw,
  Loader2,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
  UserCheck,
  ShieldCheck,
} from 'lucide-react';
import { authApi } from '../../services/api';
import { formatDate } from '../../utils/formatters';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';

const ROLES = [
  { id: 1, name: 'admin', display_name: 'System Administrator', color: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
  { id: 2, name: 'treasury', display_name: 'Treasury Officer', color: 'bg-amber-100 text-amber-900 border-amber-200' },
  { id: 3, name: 'sanitary', display_name: 'Sanitary Inspector', color: 'bg-purple-100 text-purple-900 border-purple-200' },
  { id: 4, name: 'inspector', display_name: 'Field Inspector', color: 'bg-indigo-100 text-indigo-900 border-indigo-200' },
  { id: 5, name: 'peddler', display_name: 'Registered Peddler', color: 'bg-teal-100 text-teal-900 border-teal-200' },
];

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const { success, error } = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [meta, setMeta] = useState(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Add Form
  const [createForm, setCreateForm] = useState({
    role_id: 2, // default Treasury
    email: '',
    password: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    phone: '',
  });

  // Edit Form
  const [editForm, setEditForm] = useState({
    id: null,
    role_id: 2,
    email: '',
    password: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    phone: '',
    status: 'active',
  });

  // 300ms Debounce Search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch Users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authApi.getUsers({
        search: debouncedSearch || undefined,
        role_id: roleFilter || undefined,
        status: statusFilter || undefined,
        page,
        per_page: perPage,
      });

      if (res.success && res.data) {
        setUsers(res.data);
        setMeta(res.meta?.pagination || null);
      } else {
        setUsers([]);
        setMeta(null);
      }
    } catch (err) {
      error(err.message || 'Failed to load user accounts.');
      setUsers([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, roleFilter, statusFilter, page, perPage, error]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handle Create User
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const res = await authApi.createUser(createForm);
      if (res.success) {
        success('Staff personnel account created successfully.');
        setShowAddModal(false);
        setCreateForm({
          role_id: 2,
          email: '',
          password: '',
          first_name: '',
          middle_name: '',
          last_name: '',
          phone: '',
        });
        fetchUsers();
      } else {
        error(res.message || 'Failed to create user account.');
      }
    } catch (err) {
      error(err.message || 'Failed to create user account.');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (u) => {
    setEditTarget(u);
    setEditForm({
      id: u.id,
      role_id: u.role_id,
      email: u.email || '',
      password: '',
      first_name: u.first_name || '',
      middle_name: u.middle_name || '',
      last_name: u.last_name || '',
      phone: u.phone || '',
      status: u.status || 'active',
    });
    setShowPassword(false);
  };

  // Handle Update User
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editTarget) return;

    try {
      setActionLoading(true);
      const res = await authApi.updateUser(editTarget.id, editForm);
      if (res.success) {
        success(`User account for ${editForm.first_name} ${editForm.last_name} updated successfully.`);
        setEditTarget(null);
        fetchUsers();
      } else {
        error(res.message || 'Failed to update user account.');
      }
    } catch (err) {
      error(err.message || 'Failed to update user account.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete User
  const handleDeleteUser = async () => {
    if (!deleteTarget) return;

    try {
      setActionLoading(true);
      const res = await authApi.deleteUser(deleteTarget.id);
      if (res.success) {
        success(`Staff user ${deleteTarget.first_name} ${deleteTarget.last_name} permanently deleted.`);
        setDeleteTarget(null);
        fetchUsers();
      } else {
        error(res.message || 'Failed to delete user account.');
      }
    } catch (err) {
      error(err.message || 'Failed to delete user account.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Quick Toggle Status
  const handleToggleStatus = async (u) => {
    if (u.id === 1) {
      error('Primary Administrator account cannot be deactivated.');
      return;
    }
    const newStatus = u.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await authApi.updateUserStatus(u.id, newStatus);
      if (res.success) {
        success(`Account for ${u.first_name} ${u.last_name} marked as ${newStatus}.`);
        fetchUsers();
      } else {
        error(res.message || 'Failed to update user status.');
      }
    } catch (err) {
      error(err.message || 'Failed to update user status.');
    }
  };

  // Generate pagination numbers
  const pageNumbers = useMemo(() => {
    if (!meta || !meta.last_page) return [];
    const totalPages = meta.last_page;
    const current = meta.page;
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= current - delta && i <= current + delta)) {
        range.push(i);
      }
    }

    for (const i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  }, [meta]);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              User Account Management
            </h1>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
              Staff &amp; Access
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Administer government staff personnel roles, credentials, and access credentials.
          </p>
        </div>
        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={fetchUsers}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Staff Account</span>
          </button>
        </div>
      </div>

      {/* 2. Main Container with Filter Bar, Table, and Pagination */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Search & Filter Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Debounced Search */}
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, username, phone, or role..."
              className="w-full pl-9.5 pr-8 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Role Filter, Status Filter & Per-Page Controls */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
            >
              <option value="">All Roles</option>
              <option value="1">Admin</option>
              <option value="2">Treasury</option>
              <option value="3">Sanitary</option>
              <option value="4">Inspector</option>
              <option value="5">Peddler</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>

            {/* Items Per Page */}
            <div className="flex items-center gap-1.5 text-slate-500 ml-auto lg:ml-2">
              <span className="text-[11px] font-medium hidden sm:inline">Per page:</span>
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* User Table */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-700" />
            <span className="text-xs font-medium text-slate-500">Loading user accounts...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No user accounts found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              {debouncedSearch || roleFilter || statusFilter
                ? 'No staff accounts match your search or filter criteria. Try adjusting your query.'
                : 'No registered staff user accounts in the database.'}
            </p>
            {(debouncedSearch || roleFilter || statusFilter) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setRoleFilter('');
                  setStatusFilter('');
                }}
                className="mt-3 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200">
                  <th className="py-3 px-4">User &amp; Identity</th>
                  <th className="py-3 px-4">Role &amp; Permissions</th>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const roleObj = ROLES.find((r) => r.id === u.role_id) || {
                    color: 'bg-slate-100 text-slate-800 border-slate-200',
                    scope: 'Web Only',
                  };

                  const isPrimaryAdmin = u.id === 1;
                  const isSelf = currentUser?.id === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* User & Identity */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-700 to-teal-800 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs uppercase">
                            {u.first_name?.[0] || 'U'}
                            {u.last_name?.[0] || ''}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                              <span>
                                {u.first_name} {u.middle_name ? `${u.middle_name} ` : ''}
                                {u.last_name}
                              </span>
                              {isSelf && (
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  YOU
                                </span>
                              )}
                              {isPrimaryAdmin && (
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                                  PRIMARY
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-normal flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{u.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role & Permissions */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-2xs ${roleObj.color}`}
                        >
                          {u.role_display_name || u.role_name}
                        </span>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          User ID: #{u.id}
                        </div>
                      </td>

                      {/* Contact Phone */}
                      <td className="py-3.5 px-4 text-slate-600 font-mono">
                        {u.phone ? (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{u.phone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">&mdash;</span>
                        )}
                      </td>

                      {/* Account Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            u.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : u.status === 'suspended'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-slate-100 text-slate-600 border border-slate-300'
                          }`}
                        >
                          {u.status === 'active' ? (
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <XCircle className="w-3 h-3 text-slate-400" />
                          )}
                          <span>{u.status}</span>
                        </span>
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {formatDate(u.created_at)}
                      </td>

                      {/* Action Buttons: Update, Toggle, Delete */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 1. Update / Edit Action */}
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-emerald-700 transition-colors shadow-2xs cursor-pointer"
                            title="Edit User Account"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* 2. Quick Status Toggle */}
                          {!isPrimaryAdmin && (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(u)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer border ${
                                u.status === 'active'
                                  ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200'
                                  : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                              }`}
                              title={u.status === 'active' ? 'Deactivate account' : 'Activate account'}
                            >
                              {u.status === 'active' ? 'Deactivate' : 'Activate'}
                            </button>
                          )}

                          {/* 3. Delete Action */}
                          {!isPrimaryAdmin && !isSelf && (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(u)}
                              className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors shadow-2xs cursor-pointer"
                              title="Delete Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. Page Pagination Controls */}
        {meta && meta.total > 0 && (
          <div className="p-4 sm:px-6 border-t border-slate-100 bg-slate-50/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            {/* Range info */}
            <div>
              Showing <strong className="text-slate-800 font-mono">{(meta.page - 1) * meta.per_page + 1}</strong> to{' '}
              <strong className="text-slate-800 font-mono">
                {Math.min(meta.page * meta.per_page, meta.total)}
              </strong>{' '}
              of <strong className="text-slate-800 font-mono">{meta.total}</strong> accounts
            </div>

            {/* Page buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {pageNumbers.map((pNum, idx) =>
                pNum === '...' ? (
                  <span key={`dots-${idx}`} className="px-2 text-slate-400 select-none">
                    &hellip;
                  </span>
                ) : (
                  <button
                    key={`page-${pNum}`}
                    type="button"
                    onClick={() => setPage(pNum)}
                    className={`min-w-[32px] h-8 px-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      page === pNum
                        ? 'bg-emerald-600 text-white shadow-xs font-black'
                        : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {pNum}
                  </button>
                )
              )}

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
                disabled={page >= meta.last_page}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Create Staff Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => !actionLoading && setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <UserPlus className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    Create Staff Account
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Assign municipal role credentials and user permissions.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.first_name}
                    onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })}
                    placeholder="e.g. Juan"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.last_name}
                    onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })}
                    placeholder="e.g. Dela Cruz"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Role &amp; Permissions
                </label>
                <select
                  value={createForm.role_id}
                  onChange={(e) => setCreateForm({ ...createForm, role_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                >
                  <option value={1}>Admin (System Administrator)</option>
                  <option value={2}>Treasury (Treasury Officer)</option>
                  <option value={3}>Sanitary (Sanitary Inspector)</option>
                  <option value={4}>Inspector (Field Inspector)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Official Email Address
                </label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="name@lacarlota.gov.ph"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Temporary Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  placeholder="0917XXXXXXX"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Staff User</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Update / Edit Staff Modal */}
      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => !actionLoading && setEditTarget(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <Edit2 className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    Update Staff Personnel Account
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Editing credentials for <strong className="text-slate-800">#{editTarget.id} &bull; {editTarget.first_name} {editTarget.last_name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.first_name}
                    onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.last_name}
                    onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Role &amp; Permissions
                  </label>
                  <select
                    value={editForm.role_id}
                    disabled={editTarget.id === 1}
                    onChange={(e) => setEditForm({ ...editForm, role_id: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                  >
                    <option value={1}>Admin (System Administrator)</option>
                    <option value={2}>Treasury (Treasury Officer)</option>
                    <option value={3}>Sanitary (Sanitary Inspector)</option>
                    <option value={4}>Inspector (Field Inspector)</option>
                    <option value={5}>Peddler (Registered Peddler)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Account Status
                  </label>
                  <select
                    value={editForm.status}
                    disabled={editTarget.id === 1}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Official Email
                </label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Reset Password <span className="text-slate-400 font-normal lowercase">(Leave empty to keep current password)</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    minLength={6}
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    placeholder="Enter new password (optional)"
                    className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="0917XXXXXXX"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => !actionLoading && setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  Delete Staff Account?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  You are about to permanently delete user account{' '}
                  <strong className="text-slate-800">
                    {deleteTarget.first_name} {deleteTarget.last_name}
                  </strong>{' '}
                  (<span className="font-mono text-slate-600">{deleteTarget.email}</span>).
                </p>
              </div>
            </div>

            <div className="mt-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-rose-800">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>Permanent Deletion Warning</span>
              </div>
              <p className="text-[11px] text-rose-700 leading-relaxed">
                This staff member will immediately lose all system and mobile access. Any past historical audit logs and issued compliance records will be safely retained under the municipal administrative archive.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
