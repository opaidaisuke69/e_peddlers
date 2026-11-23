import React, { useState, useEffect, useCallback } from 'react';
import { History, Search, Filter, RefreshCw, ChevronLeft, ChevronRight, Loader2, Shield } from 'lucide-react';
import { activityLogApi } from '../../services/api';
import { formatDateTime } from '../../utils/formatters';

const formatLogDetails = (raw) => {
  if (!raw || raw === '—') return '—';
  if (typeof raw === 'object') {
    return Object.entries(raw)
      .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
      .join(' • ');
  }
  if (typeof raw === 'string') {
    const unescaped = raw.replace(/&quot;/g, '"');
    try {
      const parsed = JSON.parse(unescaped);
      if (typeof parsed === 'object' && parsed !== null) {
        return Object.entries(parsed)
          .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
          .join(' • ');
      }
    } catch {
      return unescaped;
    }
  }
  return String(raw);
};

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await activityLogApi.list({
        action: action.trim() || undefined,
        role: role || undefined,
        page,
        per_page: 15,
      });
      if (res.success && res.data) {
        setLogs(res.data);
        setMeta(res.meta?.pagination || null);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [action, role, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchLogs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Activity Logs &amp; Audit Trail</h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Immutable log of all user logins, application approvals, payments, permit releases, violations, and rate modifications.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
            placeholder="Search by action keyword (e.g. PERMIT_RELEASED, LOGIN, APPROVED)..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-full sm:w-auto"
        >
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="treasury">Treasury</option>
          <option value="inspector">Inspector</option>
          <option value="sanitary">Sanitary</option>
          <option value="peddler">Peddler</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-700" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No audit logs found matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Record</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4">Platform • IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900">
                        {log.first_name ? `${log.first_name} ${log.last_name}` : 'System'}
                      </div>
                      <span className="text-[10px] font-bold uppercase text-emerald-700 font-mono">
                        {log.role_name || 'SYSTEM'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-600 text-xs font-medium" title={typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}>
                      {formatLogDetails(log.details)}
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      <span className="capitalize font-semibold">{log.platform}</span> • {log.ip_address}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

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
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
                disabled={page >= meta.last_page}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
