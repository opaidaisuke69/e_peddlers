import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Coins,
  CheckCircle2,
  Clock,
  XCircle,
  Receipt,
  QrCode,
  ArrowRight,
  RefreshCw,
  Landmark,
  Scale,
} from 'lucide-react';
import StatsCard from '../../components/StatsCard';
import { dashboardApi } from '../../services/api';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

export default function TreasuryDashboard() {
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

  const s = metrics?.summary || {};
  const recentPayments = metrics?.recent_payments || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">City Treasury Dashboard</h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Validation of permit fee assessments, Official Receipt issuance, Cash &amp; PayMongo QRPh reconciliation.
          </p>
        </div>
        <button
          onClick={fetchMetrics}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatsCard
          title="Total Grand Revenue"
          value={formatCurrency(s.grand_total_revenue || 0)}
          subtitle="Permits + Arkabala Collections"
          icon={Landmark}
          color="green"
        />
        <StatsCard
          title="Pending Payment Queue"
          value={s.pending_validation || 0}
          subtitle="Applications awaiting Treasury validation"
          icon={Clock}
          color="amber"
        />
        <StatsCard
          title="Cash Collections"
          value={formatCurrency(s.cash_revenue || 0)}
          subtitle={`${s.cash_count || 0} Official Receipts issued`}
          icon={Coins}
          color="blue"
        />
        <StatsCard
          title="PayMongo QRPh Collections"
          value={formatCurrency(s.online_revenue || 0)}
          subtitle={`${s.online_count || 0} online QRPh transactions`}
          icon={QrCode}
          color="indigo"
        />
      </div>

      {/* Action Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-sky-800 to-indigo-900 rounded-3xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div>
          <h3 className="text-lg font-bold">Applications Awaiting Payment Validation</h3>
          <p className="text-xs text-sky-200 mt-1 max-w-xl">
            Peddler applications approved by Sanitary Inspector require Treasury review and Official Receipt verification before permit release.
          </p>
        </div>
        <Link
          to="/treasury/payments"
          className="px-5 py-2.5 rounded-xl bg-white text-emerald-950 hover:bg-sky-50 font-bold text-xs shadow-md flex items-center gap-2 whitespace-nowrap transition-colors"
        >
          <span>Go to Payment Queue</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Recent Payments Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Recent Permit Payments &amp; Official Receipts
          </h3>
          <Link
            to="/treasury/reports"
            className="text-xs font-bold text-emerald-700 hover:underline"
          >
            View Full Revenue Reports &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200">
                <th className="py-3 px-4">OR Number</th>
                <th className="py-3 px-4">Application</th>
                <th className="py-3 px-4">Payor Name</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Amount Paid</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Verified Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    No payment records found.
                  </td>
                </tr>
              ) : (
                recentPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{p.or_number || 'PENDING'}</td>
                    <td className="py-3 px-4 font-mono text-emerald-700">{p.application_number}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {p.first_name} {p.last_name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                        {p.payment_method}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                      {formatCurrency(p.amount_paid)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          p.status === 'VERIFIED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{formatDateTime(p.verified_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
