import React, { useState, useEffect } from 'react';
import {
  Store,
  Layers,
  Users,
  Award,
  MapPin,
  RefreshCw,
  Edit3,
  CheckCircle2,
  Clock,
  Ban,
  Filter,
  Search,
  X,
  UserCheck,
  Save,
  Sliders,
  Check,
  AlertCircle,
  FileSpreadsheet,
  Printer,
  ChevronRight,
  UserX,
} from 'lucide-react';
import VendorMap from '../../components/VendorMap';
import { vendorMapApi } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

export default function AdminVendorMap() {
  const { success, error } = useToast();

  const [viewMode, setViewMode] = useState('map'); // 'map' or 'table'
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [rawSlots, setRawSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [peddlersList, setPeddlersList] = useState([]);

  // Slot Management Modal State
  const [manageSlot, setManageSlot] = useState(null);
  const [editStatus, setEditStatus] = useState('AVAILABLE');
  const [editNotes, setEditNotes] = useState('');
  const [editPeddlerId, setEditPeddlerId] = useState('');
  const [savingSlot, setSavingSlot] = useState(false);

  // Batch Update Modal State
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchSection, setBatchSection] = useState('A');
  const [batchStatus, setBatchStatus] = useState('AVAILABLE');
  const [batchNotes, setBatchNotes] = useState('');
  const [batchLoading, setBatchLoading] = useState(false);

  // Table View Search & Filters
  const [tableSearch, setTableSearch] = useState('');
  const [tableSection, setTableSection] = useState('ALL');
  const [tableStatus, setTableStatus] = useState('ALL');

  // Load all slots data for table view and stats
  const fetchSlotsData = async () => {
    try {
      setLoading(true);
      const res = await vendorMapApi.getSlots();
      if (res.success && res.data) {
        setRawSlots(res.data.slots || []);
      }
    } catch {
      // Handled silently
    } finally {
      setLoading(false);
    }
  };

  // Load peddlers list for assignment dropdown
  const fetchPeddlers = async () => {
    try {
      const res = await vendorMapApi.getPeddlers();
      if (res.success && res.data) {
        setPeddlersList(res.data);
      }
    } catch {
      // Handled silently
    }
  };

  useEffect(() => {
    fetchSlotsData();
    fetchPeddlers();
  }, [refreshTrigger]);

  // Open slot editor
  const handleOpenManageSlot = (slot) => {
    setManageSlot(slot);
    setEditStatus(slot.status || 'AVAILABLE');
    setEditNotes(slot.notes || '');
    setEditPeddlerId(slot.occupant?.peddler_id || slot.assigned_peddler_id || '');
  };

  // Save single slot changes
  const handleSaveSlot = async () => {
    if (!manageSlot) return;

    try {
      setSavingSlot(true);
      const payload = {
        status: editStatus,
        notes: editNotes,
        assigned_peddler_id: editStatus === 'OCCUPIED' && editPeddlerId ? parseInt(editPeddlerId) : null,
        vacate_occupant: editStatus === 'AVAILABLE',
      };

      const res = await vendorMapApi.updateSlot(manageSlot.id, payload);
      if (res.success) {
        success(res.message || `Stall slot ${manageSlot.slot_code} updated successfully.`);
        setManageSlot(null);
        setRefreshTrigger((prev) => prev + 1);
      } else {
        error(res.message || 'Failed to update stall slot.');
      }
    } catch (err) {
      error(err.message || 'Failed to update stall slot.');
    } finally {
      setSavingSlot(false);
    }
  };

  // Quick vacate action
  const handleQuickVacate = async () => {
    if (!manageSlot) return;
    if (!window.confirm(`Vacate stall ${manageSlot.slot_code} and set status to AVAILABLE? Any linked occupant will be cleared.`)) {
      return;
    }

    try {
      setSavingSlot(true);
      const res = await vendorMapApi.updateSlot(manageSlot.id, {
        status: 'AVAILABLE',
        vacate_occupant: true,
        notes: '',
      });
      if (res.success) {
        success(`Stall ${manageSlot.slot_code} has been vacated and reset to AVAILABLE.`);
        setManageSlot(null);
        setRefreshTrigger((prev) => prev + 1);
      }
    } catch (err) {
      error(err.message || 'Failed to vacate stall.');
    } finally {
      setSavingSlot(false);
    }
  };

  // Execute batch update
  const handleBatchUpdate = async (e) => {
    e.preventDefault();

    // Collect slot codes in selected section
    const targetSlots = rawSlots
      .filter((s) => batchSection === 'ALL' || s.section_code === batchSection)
      .map((s) => s.slot_code);

    if (targetSlots.length === 0) {
      error('No slots matched the selected criteria.');
      return;
    }

    if (!window.confirm(`Are you sure you want to update all ${targetSlots.length} slots in Section ${batchSection} to ${batchStatus}?`)) {
      return;
    }

    try {
      setBatchLoading(true);
      const res = await vendorMapApi.batchUpdate({
        slot_codes: targetSlots,
        status: batchStatus,
        notes: batchNotes.trim() || undefined,
      });

      if (res.success) {
        success(res.message || `Updated ${targetSlots.length} slots successfully.`);
        setShowBatchModal(false);
        setBatchNotes('');
        setRefreshTrigger((prev) => prev + 1);
      } else {
        error(res.message || 'Batch update failed.');
      }
    } catch (err) {
      error(err.message || 'Failed to execute batch update.');
    } finally {
      setBatchLoading(false);
    }
  };

  // Filtered slots for table view
  const filteredSlots = rawSlots.filter((slot) => {
    const matchesSearch =
      !tableSearch.trim() ||
      slot.slot_code.toLowerCase().includes(tableSearch.trim().toLowerCase()) ||
      slot.occupant?.name?.toLowerCase().includes(tableSearch.trim().toLowerCase()) ||
      slot.occupant?.peddler_code?.toLowerCase().includes(tableSearch.trim().toLowerCase()) ||
      slot.occupant?.business?.toLowerCase().includes(tableSearch.trim().toLowerCase()) ||
      slot.notes?.toLowerCase().includes(tableSearch.trim().toLowerCase());

    const matchesSection = tableSection === 'ALL' || slot.section_code === tableSection;
    const matchesStatus = tableStatus === 'ALL' || slot.status === tableStatus;

    return matchesSearch && matchesSection && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* 1. Page Header & Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-widest">
              Agora Public Market Administration
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 font-serif tracking-tight mt-1">
            Saturday Market Stall Management
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Full administrative control over stall availability, peddler assignments, zoning restrictions, and real-time Saturday mapping.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Mode Toggle */}
          <div className="p-1 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center">
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'map'
                  ? 'bg-white text-emerald-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Map View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'table'
                  ? 'bg-white text-emerald-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Directory Table</span>
            </button>
          </div>

          {/* Bulk Update Modal Button */}
          <button
            type="button"
            onClick={() => setShowBatchModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span>Batch Update</span>
          </button>

          {/* Refresh Map */}
          <button
            type="button"
            onClick={() => setRefreshTrigger((prev) => prev + 1)}
            disabled={loading}
            className="p-2 rounded-xl text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs transition-colors cursor-pointer"
            title="Refresh Map &amp; Stalls Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. MAIN VIEW: MAP VIEW OR DIRECTORY TABLE VIEW */}
      {viewMode === 'map' ? (
        <div className="rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl">
          <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
            <span className="font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
              <span>Admin Interactive Mode Active: Click any stall slot (A-01 to F-50) on the map below to manage status, assign peddlers, or add restrictions.</span>
            </span>
          </div>
          <VendorMap
            adminMode={true}
            onAdminManageSlot={handleOpenManageSlot}
            refreshTrigger={refreshTrigger}
          />
        </div>
      ) : (
        /* 3. DIRECTORY TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-4">
          {/* Table Search & Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Search slot code, peddler name, ID, or business..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <div className="flex items-center gap-2.5">
              <select
                value={tableSection}
                onChange={(e) => setTableSection(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="ALL">All Sections (A–F)</option>
                <option value="A">Section A: Vegetables</option>
                <option value="B">Section B: Fruits</option>
                <option value="C">Section C: Accessories &amp; RTW</option>
                <option value="D">Section D: Thrift Clothes</option>
                <option value="E">Section E: Furniture</option>
                <option value="F">Section F: Flowers</option>
              </select>

              <select
                value={tableStatus}
                onChange={(e) => setTableStatus(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="ALL">All Statuses</option>
                <option value="AVAILABLE">Available</option>
                <option value="OCCUPIED">Occupied</option>
                <option value="RESERVED">Reserved</option>
                <option value="RESTRICTED">Restricted</option>
              </select>
            </div>
          </div>

          {/* Stalls Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                  <th className="py-3 px-4">Slot</th>
                  <th className="py-3 px-4">Section</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Occupant / Peddler</th>
                  <th className="py-3 px-4">Business</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredSlots.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400">
                      No stall slots found matching filters.
                    </td>
                  </tr>
                ) : (
                  filteredSlots.map((slot) => (
                    <tr key={slot.slot_code} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-100 text-slate-900 font-mono text-xs border border-slate-200">
                          {slot.slot_code}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-600">
                        Section {slot.section_code} • {slot.section_name}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            slot.status === 'AVAILABLE'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : slot.status === 'OCCUPIED'
                              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                              : slot.status === 'RESERVED'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {slot.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {slot.occupant ? (
                          <div>
                            <span className="font-semibold text-slate-900 block">
                              {slot.occupant.name || slot.occupant.applicant}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {slot.occupant.peddler_code || slot.occupant.application_number}
                              {slot.occupant.permit_number ? ` • ${slot.occupant.permit_number}` : ''}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">None (Vacant)</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {slot.occupant?.business || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate" title={slot.notes}>
                        {slot.notes || <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenManageSlot(slot)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Manage</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. MODAL: ADMIN SINGLE SLOT MANAGEMENT */}
      {manageSlot && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => !savingSlot && setManageSlot(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-black font-mono text-base shadow-sm shrink-0">
                  {manageSlot.slot_code}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    Manage Stall Slot {manageSlot.slot_code}
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">
                    Section {manageSlot.section_code} • {manageSlot.section_name}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setManageSlot(null)}
                disabled={savingSlot}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Occupant Preview (if any) */}
            {manageSlot.occupant && (
              <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Current Occupant Information
                  </span>
                  <button
                    type="button"
                    onClick={handleQuickVacate}
                    disabled={savingSlot}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-800 underline flex items-center gap-1 cursor-pointer"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>Vacate Slot</span>
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">
                    {manageSlot.occupant.name || manageSlot.occupant.applicant}
                  </span>
                  <span className="font-mono text-[11px] text-slate-600 font-bold">
                    {manageSlot.occupant.peddler_code || manageSlot.occupant.application_number}
                  </span>
                </div>
                {manageSlot.occupant.business && (
                  <p className="text-slate-600 font-medium">
                    Business Nature: <strong>{manageSlot.occupant.business}</strong>
                  </p>
                )}
                {manageSlot.occupant.permit_number && (
                  <p className="text-emerald-700 font-medium">
                    Active Permit: <strong>{manageSlot.occupant.permit_number}</strong>
                  </p>
                )}
              </div>
            )}

            {/* Status Selector */}
            <div className="mt-5 space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Stall Slot Status
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'AVAILABLE', label: 'Available', desc: 'Open for registration', color: 'emerald' },
                  { id: 'OCCUPIED', label: 'Occupied', desc: 'Permit holder assigned', color: 'teal' },
                  { id: 'RESERVED', label: 'Reserved', desc: 'Application in review', color: 'blue' },
                  { id: 'RESTRICTED', label: 'Restricted', desc: 'Expired / Maintenance', color: 'rose' },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setEditStatus(st.id)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      editStatus === st.id
                        ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{st.label}</span>
                      {editStatus === st.id && <Check className="w-3.5 h-3.5 text-emerald-700 stroke-[3]" />}
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-0.5">{st.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Assign Registered Peddler Dropdown (when Occupied or selecting) */}
            <div className="mt-4 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Assign Registered Peddler <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <select
                value={editPeddlerId}
                onChange={(e) => {
                  setEditPeddlerId(e.target.value);
                  if (e.target.value) setEditStatus('OCCUPIED');
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              >
                <option value="">-- No direct peddler assigned (Keep vacant/general) --</option>
                {peddlersList.map((ped) => (
                  <option key={ped.id} value={ped.id}>
                    {ped.peddler_code} – {ped.last_name}, {ped.first_name} ({ped.nature_of_business || 'General'})
                    {ped.assigned_slot ? ` [Current: ${ped.assigned_slot}]` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes / Remarks */}
            <div className="mt-4 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Administrative Notes &amp; Remarks
              </label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                placeholder="e.g. Corner slot with high foot traffic; canopy replacement scheduled."
                className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setManageSlot(null)}
                disabled={savingSlot}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSlot}
                disabled={savingSlot}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {savingSlot ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Stall Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL: BATCH UPDATE SLOTS */}
      {showBatchModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => !batchLoading && setShowBatchModal(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">Batch Update Stalls</h3>
                  <span className="text-xs text-slate-500 font-medium">Bulk set stall availability or restrictions</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                disabled={batchLoading}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBatchUpdate} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Section</label>
                <select
                  value={batchSection}
                  onChange={(e) => setBatchSection(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="A">Section A: Vegetables &amp; Spices (A-01 to A-50)</option>
                  <option value="B">Section B: Fruits (B-01 to B-50)</option>
                  <option value="C">Section C: Accessories &amp; RTW (C-01 to C-50)</option>
                  <option value="D">Section D: Thrift Clothes (D-01 to D-50)</option>
                  <option value="E">Section E: Furniture (E-01 to E-50)</option>
                  <option value="F">Section F: Flowers (F-01 to F-50)</option>
                  <option value="ALL">ALL SECTIONS (All 300 Slots)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Set New Status</label>
                <select
                  value={batchStatus}
                  onChange={(e) => setBatchStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="AVAILABLE">AVAILABLE (Open all slots in target section)</option>
                  <option value="RESTRICTED">RESTRICTED (Mark as No-Vending / Closed for repairs)</option>
                  <option value="OCCUPIED">OCCUPIED</option>
                  <option value="RESERVED">RESERVED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Batch Note (Optional)</label>
                <input
                  type="text"
                  value={batchNotes}
                  onChange={(e) => setBatchNotes(e.target.value)}
                  placeholder="e.g. Cleared for upcoming Agro-Industrial Fair"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  disabled={batchLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={batchLoading}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {batchLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Applying...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Apply Batch Update</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
