import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  QrCode,
  RefreshCw,
  Coins,
  Receipt,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  Clock,
  Lock,
  Eye,
  Download,
} from 'lucide-react';
import StatsCard from '../../components/StatsCard';
import StatusBadge from '../../components/StatusBadge';
import { dashboardApi, workflowApi } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function PeddlerDashboard() {
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

  const p = metrics?.peddler || {};
  const latestApp = metrics?.latest_application || null;
  const arkabalaStatus = metrics?.arkabala_status || 'UNPAID';
  const outstanding = metrics?.outstanding_arkabala_balance || 0;
  const activeViolations = metrics?.active_violations || [];
  const canRenew = metrics?.can_renew ?? false;
  const isExpired = metrics?.is_expired ?? false;
  const permitStatus = metrics?.permit_status?.toLowerCase();
  const totalViolationFee = activeViolations.reduce((sum, v) => sum + Number(v.penalty_amount || 0), 0);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-sky-800 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white/20 text-sky-200 backdrop-blur-sm">
              Peddler Account Portal
            </span>
            <span className="text-xs font-mono font-bold text-amber-300">
              {metrics?.peddler_code || 'UNREGISTERED'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Maayong Adlaw, {p.first_name || 'Peddler'}!
          </h1>
          <p className="text-xs text-sky-200 mt-1 max-w-xl font-medium">
            {metrics?.business_name || 'City of La Carlota Ambulant & Peddler Business Permit'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {canRenew ? (
            <Link
              to="/peddler/renew"
              className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-xs shadow-lg shadow-amber-400/25 flex items-center gap-2 transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Renew Permit (Expired)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <div className="flex flex-col items-start sm:items-end">
              <button
                type="button"
                disabled
                className="px-5 py-2.5 rounded-xl bg-white/10 text-white/50 font-bold text-xs backdrop-blur-sm border border-white/15 flex items-center gap-2 cursor-not-allowed opacity-60 select-none"
                title={metrics?.renewal_message || "Permit is currently active. Renewal opens Jan 1."}
              >
                <Lock className="w-3.5 h-3.5 text-white/40" />
                <span>Renew Permit</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 font-mono text-white/70">
                  {permitStatus === 'active' ? 'Active' : 'Locked'}
                </span>
              </button>
              <span className="text-[10px] text-sky-200/80 mt-1 max-w-xs text-left sm:text-right">
                {metrics?.renewal_message || (permitStatus === 'active' ? 'Valid until Dec 31. Renewal opens Jan 1.' : 'Not eligible for renewal')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Active Violations Alert if any */}
      {activeViolations.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-rose-900 text-xs shadow-xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-sm">Notice of Active Violation ({activeViolations.length} Unsettled)</strong>
              <p className="mt-0.5 text-rose-800">
                You have an outstanding penalty total of <strong>{formatCurrency(totalViolationFee)}</strong>. Please settle via our online portal (PayMongo QRPh, GCash, or Maya) to avoid permit suspension.
              </p>
            </div>
          </div>
          <Link
            to="/peddler/violations"
            className="px-4 py-2 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 whitespace-nowrap shadow-md shadow-rose-600/20 flex items-center gap-1.5 transition-all self-end sm:self-auto cursor-pointer"
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Pay Violations Online &rarr;</span>
          </Link>
        </div>
      )}

      {/* Status KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Permit Status */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-400">Permit Status</span>
              {canRenew && (
                <span className="text-[10px] font-bold uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Eligible for Renewal
                </span>
              )}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                  permitStatus === 'active'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : isExpired
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {permitStatus === 'active'
                  ? 'ACTIVE PERMIT'
                  : isExpired
                  ? 'PERMIT EXPIRED'
                  : 'NO ACTIVE PERMIT'}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-2 font-mono font-medium">
              {metrics?.permit_number ? `No: ${metrics.permit_number}` : 'No issued permit found'}
            </p>
            {metrics?.valid_until && (
              <p className="text-[11px] text-slate-400 mt-0.5">
                Valid until: <strong className="text-slate-700">{formatDate(metrics.valid_until)}</strong>
              </p>
            )}
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            {canRenew ? (
              <Link
                to="/peddler/renew"
                className="text-amber-700 font-bold hover:underline flex items-center gap-1"
              >
                <span>File Annual Renewal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : permitStatus === 'active' ? (
              <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Renewal opens Jan 1</span>
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">Permit not active</span>
            )}
          </div>
        </div>

        {/* Weekly Arkabala Status */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <span className="text-[10px] font-bold uppercase text-slate-400">Weekly Arkabala</span>
          <div className="mt-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                arkabalaStatus === 'PAID'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : arkabalaStatus === 'OVERDUE'
                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}
            >
              {arkabalaStatus}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Current week compliance</p>
        </div>

        {/* Arkabala Outstanding Balance */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <span className="text-[10px] font-bold uppercase text-slate-400">Outstanding Balance</span>
          <h3 className="text-xl font-bold text-slate-900 mt-1 font-mono">
            {formatCurrency(outstanding)}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Total Paid: {formatCurrency(metrics?.total_arkabala_paid || 0)}
          </p>
        </div>

        {/* Arkabala QR Pass */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400">Arkabala QR Pass</span>
            <div className="flex items-center gap-2 mt-1">
              <QrCode className="w-5 h-5 text-emerald-700" />
              <span className="text-xs font-bold text-slate-800">
                {metrics?.is_qr_active ? 'QR Code Active' : 'QR Pending Release'}
              </span>
            </div>
          </div>
          <Link
            to="/peddler/arkabala"
            className="text-xs font-bold text-emerald-700 hover:underline mt-2 inline-flex items-center gap-1"
          >
            <span>View QR Pass</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Latest Application Tracker */}
      {latestApp && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Latest Permit Application
              </span>
              <h3 className="text-base font-bold text-slate-900 font-mono mt-0.5">
                {latestApp.application_number}
              </h3>
            </div>
            <StatusBadge status={latestApp.status} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs mb-4">
            <div>
              <span className="text-slate-400 uppercase text-[10px] font-bold">Vending Nature</span>
              <p className="font-semibold text-slate-800 mt-0.5">{latestApp.nature_of_business}</p>
            </div>
            <div>
              <span className="text-slate-400 uppercase text-[10px] font-bold">Location</span>
              <p className="font-semibold text-slate-800 mt-0.5">{latestApp.business_address}</p>
            </div>
            <div>
              <span className="text-slate-400 uppercase text-[10px] font-bold">Units Declared</span>
              <p className="font-semibold text-slate-800 mt-0.5">
                {(Number(latestApp.num_papag || 0) + Number(latestApp.num_lag_it || 0))} Papag / Lag-it
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Stage {latestApp.current_stage || 1} of 5 in approval workflow
            </span>
            <Link
              to="/peddler/applications"
              className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
            >
              <span>View Tracking &amp; History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
