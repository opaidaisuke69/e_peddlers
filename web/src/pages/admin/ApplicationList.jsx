import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  Eye,
  FileText,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Plus,
  Trash2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import { SkeletonTable } from '../../components/Skeleton';
import { applicationApi } from '../../services/api';
import { formatDate } from '../../utils/formatters';
import { useToast } from '../../contexts/ToastContext';

export default function ApplicationList() {
  const { success, error } = useToast();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await applicationApi.list({
        search: search.trim() || undefined,
        status: status || undefined,
        type: type || undefined,
        page,
        per_page: 10,
      });
      if (res.success && res.data) {
        setApplications(res.data);
        setMeta(res.meta?.pagination || null);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [search, status, type, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchApplications();
    }, 300); // 300ms debounce search
    return () => clearTimeout(timer);
  }, [fetchApplications]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const res = await applicationApi.delete(deleteTarget.id);
      if (res.success) {
        success(res.message || `Application #${deleteTarget.application_number} permanently deleted.`);
        setDeleteTarget(null);
        fetchApplications();
      } else {
        error(res.message || 'Failed to delete application.');
      }
    } catch (err) {
      error(err.message || 'Failed to delete application.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Peddler Permit Applications</h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Comprehensive registry of all submitted new and renewal peddler business permit applications.
          </p>
        </div>
        <button
          onClick={fetchApplications}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by Application ID, Peddler Name, Nature of Business..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">All Statuses</option>
            <option value="PENDING_ADMIN_APPROVAL">Stage 1: Pending Admin</option>
            <option value="PENDING_INSPECTOR_APPROVAL">Stage 2: Pending Inspector</option>
            <option value="PENDING_SANITARY_APPROVAL">Stage 3: Pending Sanitary</option>
            <option value="PENDING_TREASURY_PAYMENT">Stage 4: Pending Payment</option>
            <option value="READY_FOR_PERMIT_RELEASE">Stage 5: Ready for Release</option>
            <option value="FINISHED">Stage 6: Permit Released</option>
            <option value="ADMIN_REJECTED">Admin Rejected</option>
            <option value="INSPECTOR_REJECTED">Inspector Rejected</option>
            <option value="SANITARY_REJECTED">Sanitary Rejected</option>
            <option value="PAYMENT_REJECTED">Payment Rejected</option>
          </select>

          {/* Type Filter */}
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">All Types</option>
            <option value="New">New Application</option>
            <option value="Renewal">Renewal Application</option>
          </select>
        </div>
      </div>

      {/* Applications Table */}
      {loading ? (
        <SkeletonTable rows={8} cols={6} />
      ) : applications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center shadow-sm">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No Applications Found</h3>
          <p className="text-xs text-slate-500 mt-1">
            Try adjusting your search filters or clearing your query.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                  <th className="py-3 px-4">Application ID</th>
                  <th className="py-3 px-4">Peddler Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Business Nature</th>
                  <th className="py-3 px-4">Units</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Filed Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-950">
                      {app.application_number}
                      {app.peddler_code && (
                        <div className="text-[10px] text-slate-400 font-sans font-normal">
                          {app.peddler_code}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {app.applicant_full_name}
                      <div className="text-[11px] text-slate-400 font-normal">{app.phone}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          app.application_type === 'Renewal'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-sky-100 text-sky-800'
                        }`}
                      >
                        {app.application_type}
                      </span>
                      {app.assigned_slot && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                          {app.assigned_slot}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate" title={app.nature_of_business}>
                      {app.nature_of_business}
                      <div className="text-[10px] text-slate-400 truncate">{app.business_address}</div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-600 whitespace-nowrap">
                      {(Number(app.num_papag || 0) + Number(app.num_lag_it || 0))} Papag / Lag-it
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {formatDate(app.date_of_application)}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <Link
                          to={`/admin/applications/${app.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                          title="Review Application"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Review</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(app)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                          title="Delete Application"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {meta && meta.last_page > 1 && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div>
                Showing page <strong className="text-slate-800">{meta.page}</strong> of{' '}
                <strong className="text-slate-800">{meta.last_page}</strong> ({meta.total} total)
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
                  disabled={page >= meta.last_page}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  Delete Application?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  You are about to permanently delete application{' '}
                  <strong className="font-mono text-slate-800 font-bold">
                    #{deleteTarget.application_number}
                  </strong>{' '}
                  for <strong className="text-slate-800">{deleteTarget.applicant_full_name}</strong>.
                </p>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-rose-800">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>This action cannot be undone</span>
              </div>
              <p className="text-[11px] text-rose-700 leading-relaxed">
                All uploaded documents, signatures, approvals, and payment records for this application will be removed. If an Agora Saturday Market stall was assigned, it will be automatically released back to Available.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {deleting ? (
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
