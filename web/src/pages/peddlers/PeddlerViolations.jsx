import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Coins,
  RefreshCw,
  Loader2,
  Receipt,
  QrCode,
  ShieldAlert,
  ArrowRight,
  Filter,
} from 'lucide-react';
import PayViolationModal from '../../components/PayViolationModal';
import { violationApi } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useToast } from '../../contexts/ToastContext';

export default function PeddlerViolations() {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [filter, setFilter] = useState('ALL'); // ALL, UNPAID, PAID
  const { error } = useToast();

  const fetchViolations = async () => {
    try {
      setLoading(true);
      const res = await violationApi.list();
      if (res.success && res.data) {
        setViolations(res.data);
      }
    } catch (err) {
      error(err.message || 'Failed to load violations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchViolations();
  }, []);

  const unpaidViolations = violations.filter((v) => v.status === 'UNPAID');
  const paidViolations = violations.filter((v) => v.status === 'PAID');
  const totalUnpaidAmount = unpaidViolations.reduce((sum, v) => sum + Number(v.penalty_amount || 0), 0);

  const displayedViolations = violations.filter((v) => {
    if (filter === 'UNPAID') return v.status === 'UNPAID';
    if (filter === 'PAID') return v.status === 'PAID';
    return true;
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Violations &amp; Penalties</h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Official citations issued by City Field Inspectors regarding price tagging, sanitary compliance, and vending guidelines.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchViolations}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs cursor-pointer transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Unpaid Penalty Warning Banner */}
      {unpaidViolations.length > 0 && (
        <div className="p-5 rounded-3xl bg-rose-50 border border-rose-200 text-rose-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-100 text-rose-700 mt-0.5 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-rose-950">
                You have {unpaidViolations.length} outstanding violation citation(s)
              </h3>
              <p className="text-xs text-rose-800 mt-0.5 leading-relaxed">
                Total outstanding penalty: <strong className="font-mono text-rose-950 text-sm">{formatCurrency(totalUnpaidAmount)}</strong>. Settle online via website to keep your peddler permit active and avoid cancellation.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedViolation(unpaidViolations[0])}
            className="px-4 py-2.5 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 flex items-center gap-2 whitespace-nowrap self-end sm:self-auto cursor-pointer transition-all"
          >
            <Coins className="w-4 h-4" />
            <span>Pay Penalties Online &rarr;</span>
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 text-xs font-bold">
        <button
          type="button"
          onClick={() => setFilter('ALL')}
          className={`px-3.5 py-1.5 rounded-xl border transition-colors cursor-pointer ${
            filter === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Records ({violations.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('UNPAID')}
          className={`px-3.5 py-1.5 rounded-xl border transition-colors cursor-pointer flex items-center gap-1.5 ${
            filter === 'UNPAID'
              ? 'bg-rose-600 text-white border-rose-600'
              : 'bg-white text-rose-700 border-slate-200 hover:bg-rose-50'
          }`}
        >
          <span>Unsettled</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-800 font-mono">
            {unpaidViolations.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setFilter('PAID')}
          className={`px-3.5 py-1.5 rounded-xl border transition-colors cursor-pointer flex items-center gap-1.5 ${
            filter === 'PAID'
              ? 'bg-emerald-700 text-white border-emerald-700'
              : 'bg-white text-emerald-800 border-slate-200 hover:bg-emerald-50'
          }`}
        >
          <span>Settled</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-mono">
            {paidViolations.length}
          </span>
        </button>
      </div>

      {/* Violations List Container */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden p-6">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-700" />
            <p className="text-xs font-semibold">Retrieving violation records...</p>
          </div>
        ) : displayedViolations.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2 opacity-80" />
            <h3 className="font-extrabold text-slate-800 text-sm">
              {filter === 'UNPAID' ? 'No Unpaid Violations' : 'Clean Citation Record'}
            </h3>
            <p className="mt-1 text-slate-500">
              {filter === 'UNPAID'
                ? 'All violation citations on your peddler account are fully settled.'
                : 'No citations found matching this criteria.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedViolations.map((v) => {
              const isPaid = v.status === 'PAID';
              return (
                <div
                  key={v.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    isPaid ? 'border-slate-200/80 bg-slate-50/50' : 'border-rose-200 bg-rose-50/25 shadow-xs'
                  }`}
                >
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-900">{v.violation_number}</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {isPaid ? 'PAID & RESOLVED' : 'UNSETTLED CITATION'}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm mt-1">{v.violation_name}</h4>
                    </div>

                    <div className="text-right flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Penalty Assessment
                      </span>
                      <span className="text-lg font-black text-rose-700 font-mono">
                        {formatCurrency(v.penalty_amount)}
                      </span>
                    </div>
                  </div>

                  {/* Violation Description */}
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">{v.description}</p>

                  {/* Bottom Metadata & Payment Action */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-slate-400 pt-3 border-t border-slate-100">
                    <div>
                      <span>
                        Issued: <strong className="text-slate-600">{formatDate(v.violation_date)}</strong> by Field Inspector {v.issued_by_first_name} {v.issued_by_last_name}
                      </span>
                      {isPaid && v.receipt_number && (
                        <span className="block mt-0.5 text-emerald-800 font-medium">
                          Settlement OR: <strong className="font-mono">{v.receipt_number}</strong>
                        </span>
                      )}
                    </div>

                    <div>
                      {isPaid ? (
                        <button
                          type="button"
                          onClick={() => setSelectedViolation(v)}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>View Official Receipt</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSelectedViolation(v)}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer transition-all"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>Pay Online (GCash / Maya / QRPh)</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pay / Receipt Violation Modal */}
      {selectedViolation && (
        <PayViolationModal
          isOpen={!!selectedViolation}
          onClose={() => setSelectedViolation(null)}
          violation={selectedViolation}
          onPaymentSuccess={() => {
            fetchViolations();
          }}
        />
      )}
    </div>
  );
}
