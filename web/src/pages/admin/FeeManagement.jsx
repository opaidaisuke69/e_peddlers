import React, { useState, useEffect } from 'react';
import { Coins, Plus, Edit2, CheckCircle2, XCircle, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { feeApi } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import { useToast } from '../../contexts/ToastContext';

export default function FeeManagement() {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editFee, setEditFee] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const { success, error } = useToast();

  const [addForm, setAddForm] = useState({
    code: '',
    name: '',
    amount: '',
    fee_type: 'fixed',
    unit_name: '',
    description: '',
  });

  const fetchFees = async () => {
    try {
      setLoading(true);
      const res = await feeApi.list();
      if (res.success && res.data) {
        setFees(res.data);
      }
    } catch (err) {
      error(err.message || 'Failed to load fee schedule.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFees();
  }, []);

  const handleToggle = async (fee) => {
    try {
      const res = await feeApi.toggle(fee.id);
      if (res.success) {
        success(`Fee status updated.`);
        fetchFees();
      }
    } catch (err) {
      error(err.message || 'Failed to update fee.');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const res = await feeApi.update(editFee.id, editFee);
      if (res.success) {
        success('Fee schedule updated successfully.');
        setEditFee(null);
        fetchFees();
      }
    } catch (err) {
      error(err.message || 'Failed to update fee.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const res = await feeApi.create(addForm);
      if (res.success) {
        success('New fee added.');
        setShowAddModal(false);
        setAddForm({ code: '', name: '', amount: '', fee_type: 'fixed', unit_name: '', description: '' });
        fetchFees();
      }
    } catch (err) {
      error(err.message || 'Failed to add fee.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Tax &amp; Fee Schedule</h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Administer statutory city permit fees. Note: Fee updates automatically apply to future calculations while preserving historical receipts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchFees}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Fee Item</span>
          </button>
        </div>
      </div>

      {/* Fees Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-700" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Fee Name &amp; Description</th>
                  <th className="py-3 px-4">Rate Type</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fees.map((fee) => (
                  <tr key={fee.id} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{fee.code}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{fee.name}</div>
                      <div className="text-[11px] text-slate-500">{fee.description || 'Standard municipal fee'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                        {fee.fee_type === 'per_unit' ? `Per Unit (${fee.unit_name || 'Unit'})` : 'Fixed Fee'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-700 text-sm font-mono">
                      {formatCurrency(fee.amount)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          fee.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {fee.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditFee({ ...fee })}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50"
                          title="Edit Fee"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggle(fee)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                            fee.is_active
                              ? 'text-rose-700 bg-rose-50 hover:bg-rose-100'
                              : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                          }`}
                        >
                          {fee.is_active ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editFee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Edit Fee Schedule</h3>
            <p className="text-xs text-slate-500 mb-4">{editFee.code}</p>

            <form onSubmit={handleUpdate} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Fee Description</label>
                <input
                  type="text"
                  required
                  value={editFee.name}
                  onChange={(e) => setEditFee({ ...editFee, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Amount (PHP)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editFee.amount}
                  onChange={(e) => setEditFee({ ...editFee, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Internal Remarks</label>
                <textarea
                  value={editFee.description || ''}
                  onChange={(e) => setEditFee({ ...editFee, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditFee(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm"
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Add New Fee Item</h3>
            <p className="text-xs text-slate-500 mb-4">Create a new statutory permit fee line item.</p>

            <form onSubmit={handleAdd} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Unique Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SPECIAL_SANITATION_FEE"
                  value={addForm.code}
                  onChange={(e) => setAddForm({ ...addForm, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Fee Name</label>
                <input
                  type="text"
                  required
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Rate Type</label>
                  <select
                    value={addForm.fee_type}
                    onChange={(e) => setAddForm({ ...addForm, fee_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                  >
                    <option value="fixed">Fixed</option>
                    <option value="per_unit">Per Unit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Amount (PHP)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={addForm.amount}
                    onChange={(e) => setAddForm({ ...addForm, amount: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm"
                >
                  {actionLoading ? 'Adding...' : 'Add Fee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
