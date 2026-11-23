import React, { useState, useEffect } from 'react';
import {
  Users,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Coins,
  Receipt,
  AlertTriangle,
  Award,
  TrendingUp,
  RefreshCw,
  Landmark,
} from 'lucide-react';
import StatsCard from '../../components/StatsCard';
import { SkeletonCard } from '../../components/Skeleton';
import { dashboardApi } from '../../services/api';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const res = await dashboardApi.getMetrics();
      if (res.success && res.data) {
        setMetrics(res.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading && !metrics) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  const s = metrics?.summary || {};
  const charts = metrics?.charts || {};
  const recent = metrics?.recent_activities || [];

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Admin Executive Dashboard</h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Real-time management overview of Peddler Permits, Inspections, Revenue, and Arkabala collections.
          </p>
        </div>
        <button
          onClick={fetchMetrics}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Top 4 Primary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatsCard
          title="Total Registered Peddlers"
          value={s.total_peddlers || 0}
          subtitle={`${s.active_peddlers || 0} active • ${s.inactive_peddlers || 0} inactive`}
          icon={Users}
          color="blue"
        />
        <StatsCard
          title="Total Combined Revenue"
          value={formatCurrency(s.total_revenue || 0)}
          subtitle={`Permits: ${formatCurrency(s.total_permit_revenue || 0)}`}
          icon={Coins}
          color="green"
        />
        <StatsCard
          title="Weekly Arkabala Revenue"
          value={formatCurrency(s.total_arkabala_collections || 0)}
          subtitle="Total settled collections"
          icon={Receipt}
          color="indigo"
        />
        <StatsCard
          title="Total Permits Released"
          value={s.released_permits || 0}
          subtitle={`${s.ready_for_release || 0} ready for release`}
          icon={Award}
          color="purple"
        />
      </div>

      {/* Workflow Queue Status Grid */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
          Application Approval Pipeline
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 text-center">
            <span className="text-[10px] font-bold uppercase text-emerald-700">Stage 1: Admin</span>
            <div className="text-2xl font-black text-emerald-950 mt-1">{s.pending_applications || 0}</div>
            <span className="text-[11px] text-emerald-700 font-medium">Pending Review</span>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 text-center">
            <span className="text-[10px] font-bold uppercase text-amber-700">Stage 2: Inspector</span>
            <div className="text-2xl font-black text-amber-900 mt-1">{s.pending_inspector || 0}</div>
            <span className="text-[11px] text-amber-600 font-medium">Pending Field</span>
          </div>

          <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200 text-center">
            <span className="text-[10px] font-bold uppercase text-purple-700">Stage 3: Sanitary</span>
            <div className="text-2xl font-black text-purple-900 mt-1">{s.pending_sanitary || 0}</div>
            <span className="text-[11px] text-purple-600 font-medium">Pending Health</span>
          </div>

          <div className="p-4 rounded-xl bg-pink-50/60 border border-pink-200 text-center">
            <span className="text-[10px] font-bold uppercase text-pink-700">Stage 4: Payment</span>
            <div className="text-2xl font-black text-pink-900 mt-1">{s.pending_payment || 0}</div>
            <span className="text-[11px] text-pink-600 font-medium">Treasury Assessment</span>
          </div>

          <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-200 text-center">
            <span className="text-[10px] font-bold uppercase text-teal-700">Stage 5: Release</span>
            <div className="text-2xl font-black text-teal-900 mt-1">{s.ready_for_release || 0}</div>
            <span className="text-[11px] text-teal-600 font-medium">Ready to Issue</span>
          </div>

          <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200 text-center">
            <span className="text-[10px] font-bold uppercase text-rose-700">Corrections</span>
            <div className="text-2xl font-black text-rose-900 mt-1">{s.rejected_applications || 0}</div>
            <span className="text-[11px] text-rose-600 font-medium">Returned</span>
          </div>
        </div>
      </div>

      {/* Analytics & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
              Status Distribution
            </h3>
            <div className="space-y-3">
              {(charts.status_distribution || []).map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-semibold text-slate-700">{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-900 px-2 py-0.5 rounded bg-slate-100">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Recorded Violations:</span>
            <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              {s.total_violations || 0} Active
            </span>
          </div>
        </div>

        {/* Recent Audit Trail Stream */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
            Recent System Activity Logs
          </h3>
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {recent.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No recent activities recorded.</p>
            ) : (
              recent.map((log) => (
                <div key={log.id} className="py-2.5 flex items-start justify-between gap-4 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="font-bold text-slate-900">
                        {log.first_name ? `${log.first_name} ${log.last_name}` : 'System'}
                      </strong>
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {log.role_name}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-0.5 font-mono text-[11px]">{log.action}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 flex-shrink-0">
                    {formatDateTime(log.created_at)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
