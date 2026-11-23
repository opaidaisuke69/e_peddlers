import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Download,
  Printer,
  Receipt,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import QrCodeDisplay from '../../components/QrCodeDisplay';
import { dashboardApi, arkabalaApi } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useToast } from '../../contexts/ToastContext';

export default function PeddlerArkabala() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { error } = useToast();

  const fetchArkabalaData = async () => {
    try {
      setLoading(true);
      const res = await dashboardApi.getMetrics();
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      error(err.message || 'Failed to load Arkabala details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArkabalaData();
  }, []);

  if (loading || !data) {
    return (
      <div className="py-20 flex justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-700" />
      </div>
    );
  }

  const p = data.peddler || {};
  const history = data.recent_transactions || [];
  const status = data.arkabala_status || 'UNPAID';

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Arkabala Identification &amp; Receipts</h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Present your unique Arkabala QR Pass to the City Field Inspector for weekly collection scanning.
          </p>
        </div>
        <button
          onClick={fetchArkabalaData}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Status</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* QR Pass Card */}
        <div className="md:col-span-1">
          <QrCodeDisplay
            peddlerCode={data.peddler_code}
            peddlerName={`${p.first_name || ''} ${p.last_name || ''}`}
            businessNature={data.business_name}
            qrToken={data.qr_token}
            isActive={data.is_qr_active}
          />
        </div>

        {/* Weekly Status & Ledger */}
        <div className="md:col-span-2 space-y-6">
          {/* Status Alert */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Current Weekly Status
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    status === 'PAID'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : status === 'OVERDUE'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}
                >
                  {status === 'PAID' ? 'SETTLED • PAID' : status}
                </span>
                <p className="text-xs text-slate-500 mt-2">
                  Standard Weekly Rate: <strong>₱50.00</strong>
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Settled</span>
                <div className="text-xl font-black text-slate-900 font-mono">
                  {formatCurrency(data.total_arkabala_paid || 0)}
                </div>
              </div>
            </div>
          </div>

          {/* Previous Weekly Receipts Ledger */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Official Collection History
              </h3>
              <span className="text-xs text-slate-400">{history.length} settled receipt(s)</span>
            </div>

            {history.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center border-2 border-dashed border-slate-100 rounded-xl">
                No Arkabala collection history recorded yet. Present your QR code to the inspector every week.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200">
                      <th className="py-2.5 px-3">Receipt No.</th>
                      <th className="py-2.5 px-3">Period</th>
                      <th className="py-2.5 px-3">Method</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history.map((col) => (
                      <tr key={col.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">
                          {col.receipt_number}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-700">Week {col.week_number}</td>
                        <td className="py-3 px-3">{col.payment_method}</td>
                        <td className="py-3 px-3 font-mono font-bold text-emerald-700">
                          {formatCurrency(col.amount)}
                        </td>
                        <td className="py-3 px-3 text-slate-500">{formatDate(col.collection_date)}</td>
                        <td className="py-3 px-3 text-right">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                            PAID
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
