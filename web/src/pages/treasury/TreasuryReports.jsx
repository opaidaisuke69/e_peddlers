import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  Filter,
  RefreshCw,
  Coins,
  QrCode,
  Receipt,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react';
import StatsCard from '../../components/StatsCard';
import { reportApi } from '../../services/api';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { useToast } from '../../contexts/ToastContext';

export default function TreasuryReports() {
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportType, setReportType] = useState('all'); // all, permit, arkabala
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { error } = useToast();

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await reportApi.getCollections({
        start_date: startDate,
        end_date: endDate,
        type: reportType,
      });
      if (res.success && res.data) {
        setReportData(res.data);
      }
    } catch (err) {
      error(err.message || 'Failed to generate report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType]);

  const handlePrint = () => {
    const url = reportApi.getExportUrl('collections', 'pdf', {
      start_date: startDate,
      end_date: endDate,
      type: reportType,
      autoprint: 1,
    });
    window.open(url, '_blank');
  };

  const handleDownloadCsv = () => {
    const url = reportApi.getExportUrl('collections', 'csv', {
      start_date: startDate,
      end_date: endDate,
      type: reportType,
    });
    window.open(url, '_blank');
  };

  const s = reportData?.summary || {};
  const transactions = reportData?.transactions || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Treasury Revenue &amp; Collection Reports</h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Official government revenue statements, Cash vs PayMongo QRPh breakdown, and transaction ledger.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadCsv}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Date & Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>Date Range:</span>
          </div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-mono font-medium"
          />
          <span className="text-slate-400 text-xs">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-mono font-medium"
          />
          <button
            onClick={fetchReport}
            className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
          >
            Filter
          </button>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <label className="text-xs font-bold text-slate-700">Stream:</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white"
          >
            <option value="all">All Collections (Permits + Arkabala)</option>
            <option value="permit">Permit Fees Only</option>
            <option value="arkabala">Arkabala Collections Only</option>
          </select>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Period Grand Total"
          value={formatCurrency(s.grand_total || 0)}
          subtitle={`${s.total_transactions || 0} Total Transactions`}
          color="green"
        />
        <StatsCard
          title="Total Cash Revenue"
          value={formatCurrency(s.cash_total || 0)}
          subtitle="Issued at Treasury Window"
          color="blue"
        />
        <StatsCard
          title="Total Online (QRPh)"
          value={formatCurrency(s.online_total || 0)}
          subtitle="PayMongo QRPh Gateway"
          color="indigo"
        />
        <StatsCard
          title="Arkabala Share"
          value={formatCurrency(s.total_arkabala_revenue || 0)}
          subtitle={`Permits: ${formatCurrency(s.total_permit_revenue || 0)}`}
          color="amber"
        />
      </div>

      {/* Printable Report Ledger */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden p-6">
        {/* Printable Letterhead Header */}
        <div className="text-center pb-6 border-b border-slate-200 mb-6">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Republic of the Philippines</p>
          <h2 className="text-lg font-black text-slate-900">CITY GOVERNMENT OF LA CARLOTA</h2>
          <p className="text-xs font-semibold text-slate-600">Office of the City Treasurer • Revenue Assessment Section</p>
          <h3 className="text-sm font-bold text-emerald-950 uppercase tracking-widest mt-3">
            Official Collection &amp; Revenue Ledger
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Coverage Period: {formatDate(startDate)} to {formatDate(endDate)}
          </p>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-700" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No transactions found for the selected period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200 text-[10px] font-bold uppercase text-slate-600">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">OR / Receipt No.</th>
                  <th className="py-2.5 px-3">Reference / App</th>
                  <th className="py-2.5 px-3">Payor / Registrant</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3 text-right">Amount (PHP)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                      {formatDate(tx.verified_at)}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      {tx.or_number || 'N/A'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-emerald-700">
                      {tx.application_number}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      {tx.payor_name}
                      <div className="text-[10px] text-slate-400 font-normal">{tx.nature_of_business}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          tx.transaction_type === 'ARKABALA'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {tx.transaction_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-600">{tx.payment_method}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 text-sm">
                      {formatCurrency(tx.amount_paid)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
                  <td colSpan={6} className="py-3 px-3 text-right uppercase text-slate-700 text-xs">
                    Grand Total Revenue:
                  </td>
                  <td className="py-3 px-3 text-right text-base text-emerald-800 font-mono font-black">
                    {formatCurrency(s.grand_total || 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
