import React, { useState, useEffect } from 'react';
import {
  Receipt,
  CheckCircle2,
  Clock,
  RefreshCw,
  Loader2,
  Check,
  CheckSquare,
  Square,
  Filter,
} from 'lucide-react';
import { arkabalaApi } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useToast } from '../../contexts/ToastContext';

export default function ArkabalaReconciliation() {
  const [collections, setCollections] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const { success, error } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [colRes, weekRes] = await Promise.all([
        arkabalaApi.listCollections({ week_id: selectedWeek || undefined }),
        arkabalaApi.listWeeks(),
      ]);

      if (colRes.success) setCollections(colRes.data || []);
      if (weekRes.success) setWeeks(weekRes.data || []);
    } catch (err) {
      error(err.message || 'Failed to load Arkabala collections.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedWeek]);

  const handleSelectAll = () => {
    const unreconciled = collections.filter((c) => !c.reconciled_by_treasury).map((c) => c.id);
    if (selectedIds.length === unreconciled.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(unreconciled);
    }
  };

  const handleToggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleReconcileSelected = async () => {
    if (selectedIds.length === 0) return;

    try {
      setReconciling(true);
      const res = await arkabalaApi.reconcile(selectedIds);
      if (res.success) {
        success(`${res.data.reconciled_count} collection record(s) reconciled successfully.`);
        setSelectedIds([]);
        fetchData();
      }
    } catch (err) {
      error(err.message || 'Reconciliation failed.');
    } finally {
      setReconciling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Arkabala Reconciliation</h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Audit and reconcile weekly cash and online Arkabala collections recorded by field inspectors.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleReconcileSelected}
            disabled={selectedIds.length === 0 || reconciling}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
          >
            {reconciling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            <span>Reconcile Selected ({selectedIds.length})</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <label className="text-xs font-bold text-slate-700">Filter Collection Week:</label>
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">All Weeks</option>
            {weeks.map((w) => (
              <option key={w.id} value={w.id}>
                Week {w.week_number} ({w.year}) - {formatDate(w.start_date)} to {formatDate(w.end_date)}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs font-semibold text-slate-500">
          Total Collections Displayed: <strong className="text-slate-900">{collections.length}</strong>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-700" />
          </div>
        ) : collections.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No Arkabala collections recorded for this filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200">
                  <th className="py-3 px-4 w-10 text-center">
                    <button onClick={handleSelectAll} className="p-1 hover:text-emerald-700">
                      {selectedIds.length > 0 && selectedIds.length === collections.filter((c) => !c.reconciled_by_treasury).length ? (
                        <CheckSquare className="w-4 h-4 text-emerald-700" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-4">Receipt • Tx Code</th>
                  <th className="py-3 px-4">Peddler Name</th>
                  <th className="py-3 px-4">Week</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Collected By</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Reconciled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {collections.map((col) => {
                  const isReconciled = Boolean(col.reconciled_by_treasury);
                  const isChecked = selectedIds.includes(col.id);

                  return (
                    <tr key={col.id} className={`hover:bg-slate-50/50 ${isChecked ? 'bg-emerald-50/30' : ''}`}>
                      <td className="py-3 px-4 text-center">
                        {!isReconciled ? (
                          <button onClick={() => handleToggleSelect(col.id)} className="p-1 text-slate-400 hover:text-emerald-700">
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-emerald-700" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        ) : (
                          <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {col.receipt_number}
                        <div className="text-[10px] text-slate-400 font-normal">{col.transaction_code}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">
                          {col.first_name} {col.last_name}
                        </div>
                        <span className="font-mono text-[10px] text-emerald-700">{col.peddler_code}</span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">Week {col.week_number}</td>
                      <td className="py-3 px-4 font-medium text-slate-600">{col.payment_method}</td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-700 text-sm">
                        {formatCurrency(col.amount)}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {col.inspector_first_name} {col.inspector_last_name}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{formatDate(col.collection_date)}</td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isReconciled
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isReconciled ? 'Reconciled' : 'Pending Audit'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
