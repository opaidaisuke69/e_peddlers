import React, { useState, useEffect } from 'react';
import {
  Store,
  CheckCircle2,
  Clock,
  Ban,
  Calendar,
  Layers,
  Search,
  Check,
  Sparkles,
  MapPin,
  RefreshCw,
  X,
  Filter,
} from 'lucide-react';
import { vendorMapApi } from '../services/api';
import logo from '../assets/logo.png';

export default function VendorMap({
  selectionMode = false,
  selectedSlot = null,
  onSelectSlot = () => {},
  className = '',
  embedded = false,
  adminMode = false,
  onAdminManageSlot = null,
  refreshTrigger = 0,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSlotModal, setActiveSlotModal] = useState(null);
  const [tempSelected, setTempSelected] = useState(selectedSlot);

  // Sync external selectedSlot with internal state
  useEffect(() => {
    setTempSelected(selectedSlot);
  }, [selectedSlot]);

  // Load slots data
  const loadSlots = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await vendorMapApi.getSlots();
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.message || 'Unable to load market slots.');
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch market vendor mapping data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSlots();
  }, [refreshTrigger]);

  const stats = data?.stats || {
    total: 300,
    occupied: 256,
    reserved: 14,
    available: 18,
    restricted: 12,
  };

  const sections = data?.sections || {};

  const handleSlotClick = (slot) => {
    if (adminMode && onAdminManageSlot) {
      onAdminManageSlot(slot);
      return;
    }
    if (selectionMode) {
      if (slot.status === 'AVAILABLE') {
        setTempSelected(slot.slot_code);
        onSelectSlot(slot);
        setActiveSlotModal(null);
      } else {
        setActiveSlotModal(slot);
      }
    } else {
      setActiveSlotModal(slot);
    }
  };

  const getSlotClasses = (slot) => {
    const isSelected = (selectionMode && tempSelected === slot.slot_code) || selectedSlot === slot.slot_code;

    // Search query matching
    const isSearchMatch = searchQuery.trim() && slot.slot_code.toLowerCase().includes(searchQuery.trim().toLowerCase());

    // Status filter matching
    const isDimmed =
      (statusFilter !== 'ALL' && slot.status !== statusFilter) ||
      (searchQuery.trim() && !isSearchMatch);

    if (isSelected) {
      return 'bg-emerald-600 text-white font-black border-2 border-emerald-700 ring-2 sm:ring-4 ring-emerald-400/40 shadow-lg scale-105 z-20 animate-pulse';
    }

    if (isDimmed) {
      return 'opacity-25 grayscale cursor-not-allowed bg-slate-100 text-slate-400 border border-slate-200';
    }

    switch (slot.status) {
      case 'OCCUPIED':
        return 'bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200 cursor-pointer shadow-2xs';
      case 'RESERVED':
        return 'bg-blue-100 text-blue-900 border border-blue-300 hover:bg-blue-200 cursor-pointer shadow-2xs';
      case 'RESTRICTED':
        return 'bg-rose-100 text-rose-900 border border-rose-300 hover:bg-rose-200 cursor-pointer shadow-2xs';
      case 'AVAILABLE':
      default:
        return 'bg-white text-slate-900 font-bold border-2 border-slate-300 hover:border-emerald-600 hover:bg-emerald-50 hover:text-emerald-950 hover:shadow-md hover:scale-105 cursor-pointer transition-all shadow-xs';
    }
  };

  // Render a single section card (shared for both desktop and mobile view)
  const renderSectionCard = (secKey, title, category, badgeColor, borderColor, bgTint) => {
    const secData = sections[secKey];
    if (!secData || (sectionFilter !== 'ALL' && sectionFilter !== secKey)) {
      return null;
    }

    return (
      <div key={secKey} className={`rounded-2xl border ${borderColor} ${bgTint} p-3 sm:p-4 shadow-xs hover:shadow-sm transition-shadow`}>
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200/60">
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg ${badgeColor} text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0`}>
              {secKey}
            </span>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                SECTION {secKey} • {title}
              </h4>
              <span className="text-[10px] text-slate-500 font-medium">Slots {secKey}-01 – {secKey}-50 (50 Stalls)</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/80 border border-slate-200 text-slate-700 shrink-0">
            {category}
          </span>
        </div>

        {/* 50 Slots Grid: 10 columns by 5 rows */}
        <div className="grid grid-cols-10 gap-1 sm:gap-1.5 text-[9px] sm:text-[10px] md:text-xs font-mono">
          {secData.slots?.map((slot) => (
            <button
              key={slot.slot_code}
              type="button"
              onClick={() => handleSlotClick(slot)}
              title={`Slot ${slot.slot_code}: ${slot.status}${adminMode ? ' • Click to Manage' : ''}`}
              className={`h-7 sm:h-8 rounded-md flex items-center justify-center font-bold transition-all active:scale-95 ${getSlotClasses(slot)}`}
            >
              {slot.slot_code.replace(/^[A-F]-/, '')}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`w-full bg-white text-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xl overflow-hidden font-sans ${className}`}>
      {/* 1. HEADER BANNER */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-950 text-white p-4 sm:p-6 lg:p-7 relative overflow-hidden">
        {/* Soft Ambient Radial Accents */}
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-64 h-64 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-5">
          {/* Identity */}
          <div className="flex items-center gap-3 sm:gap-4">
            <img
              src={logo}
              alt="City Seal"
              className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-white p-1 object-contain shadow-md shrink-0 border border-emerald-300/40"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-300 truncate">
                  City of La Carlota • Negros Occidental
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-700/80 text-emerald-200 uppercase tracking-widest hidden sm:inline-block shrink-0">
                  Agora Public Market
                </span>
              </div>
              <h2 className="text-lg sm:text-2xl font-black font-serif tracking-tight text-white mt-0.5 truncate">
                Saturday Market Vendor Mapping
              </h2>
              <p className="text-[11px] sm:text-xs text-emerald-100/90 font-normal truncate">
                Interactive Stall Occupancy & Real-time Availability Directory
              </p>
            </div>
          </div>

          {/* Schedule & Reload */}
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md">
              <Calendar className="w-4 h-4 text-amber-300 shrink-0" />
              <div>
                <span className="text-[9px] text-emerald-200 uppercase font-semibold block leading-none">Schedule</span>
                <span className="text-xs font-bold text-amber-300 tracking-wide">Saturday Market Day</span>
              </div>
            </div>

            <button
              type="button"
              onClick={loadSlots}
              disabled={loading}
              className="p-2 sm:p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all cursor-pointer"
              title="Refresh live map"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 2. STATS OVERVIEW CARDS (CLICKABLE FOR FILTERING) */}
        <div className="relative z-10 mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
          {/* Total Slots */}
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-left transition-all cursor-pointer col-span-2 sm:col-span-1 ${
              statusFilter === 'ALL'
                ? 'bg-white text-slate-900 border-white shadow-md'
                : 'bg-white/10 text-white border-white/15 hover:bg-white/15'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">Total Slots</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg sm:text-2xl font-black font-mono">{stats.total}</span>
              <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-60" />
            </div>
          </button>

          {/* Occupied */}
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'OCCUPIED' ? 'ALL' : 'OCCUPIED')}
            className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-left transition-all cursor-pointer ${
              statusFilter === 'OCCUPIED'
                ? 'bg-emerald-500 text-emerald-950 border-emerald-400 ring-2 ring-emerald-300 shadow-md font-bold'
                : 'bg-emerald-900/40 text-emerald-100 border-emerald-700/50 hover:bg-emerald-900/60'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider block">Occupied</span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg sm:text-2xl font-black font-mono">{stats.occupied}</span>
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
            </div>
          </button>

          {/* Reserved */}
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'RESERVED' ? 'ALL' : 'RESERVED')}
            className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-left transition-all cursor-pointer ${
              statusFilter === 'RESERVED'
                ? 'bg-blue-500 text-blue-950 border-blue-400 ring-2 ring-blue-300 shadow-md font-bold'
                : 'bg-blue-900/40 text-blue-100 border-blue-700/50 hover:bg-blue-900/60'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider block">Reserved</span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg sm:text-2xl font-black font-mono">{stats.reserved}</span>
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
            </div>
          </button>

          {/* Available (Highlighted for Applicants) */}
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'AVAILABLE' ? 'ALL' : 'AVAILABLE')}
            className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border-2 text-left transition-all cursor-pointer ${
              statusFilter === 'AVAILABLE'
                ? 'bg-white text-emerald-950 border-emerald-400 ring-2 sm:ring-4 ring-emerald-300 shadow-lg'
                : 'bg-emerald-500/20 text-emerald-200 border-emerald-400/60 hover:bg-emerald-500/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
                <span className="text-[10px] font-bold uppercase tracking-wider block text-amber-300">Available</span>
              </div>
              <span className="text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-600 text-white">Open</span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg sm:text-2xl font-black font-mono text-white">{stats.available}</span>
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" />
            </div>
          </button>

          {/* Restricted */}
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'RESTRICTED' ? 'ALL' : 'RESTRICTED')}
            className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-left transition-all cursor-pointer ${
              statusFilter === 'RESTRICTED'
                ? 'bg-rose-500 text-white border-rose-400 ring-2 ring-rose-300 shadow-md font-bold'
                : 'bg-rose-950/40 text-rose-200 border-rose-800/50 hover:bg-rose-950/60'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider block">Restricted</span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg sm:text-2xl font-black font-mono">{stats.restricted}</span>
              <Ban className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" />
            </div>
          </button>
        </div>

        {/* Selection Mode Prompt */}
        {selectionMode && (
          <div className="relative z-10 mt-4 p-3 rounded-xl sm:rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
              <span>
                <strong>Selection Mode:</strong> Pick an <strong className="text-amber-300 underline font-bold">Available (White)</strong> stall slot for your application.
              </span>
            </div>
            {tempSelected && (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500 text-emerald-950 font-black text-xs shrink-0 self-start sm:self-auto">
                Selected: {tempSelected}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 3. RESPONSIVE SECTION TABS & QUICK CONTROLS BAR */}
      <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Horizontally scrollable section tabs on mobile */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span>Section:</span>
          </span>
          <button
            type="button"
            onClick={() => setSectionFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer shrink-0 ${
              sectionFilter === 'ALL'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Sections
          </button>
          {[
            { id: 'A', name: 'A: Veg', fullName: 'Vegetables' },
            { id: 'B', name: 'B: Fruit', fullName: 'Fruits' },
            { id: 'C', name: 'C: RTW', fullName: 'Accessories & RTW' },
            { id: 'D', name: 'D: Thrift', fullName: 'Thrift Clothes' },
            { id: 'E', name: 'E: Furn', fullName: 'Furniture' },
            { id: 'F', name: 'F: Flow', fullName: 'Flowers' },
          ].map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => setSectionFilter(sec.id)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer shrink-0 ${
                sectionFilter === sec.id
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="sm:hidden">{sec.name}</span>
              <span className="hidden sm:inline">{sec.id}: {sec.fullName}</span>
            </button>
          ))}
        </div>

        {/* Quick Search */}
        <div className="relative w-full sm:w-48 lg:w-56 shrink-0">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search slot (e.g. A-45)..."
            className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 uppercase"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 4. MAIN MAP CANVAS (RESPONSIVE ARCHITECTURAL LAYOUT) */}
      <div className="p-3 sm:p-5 lg:p-6 bg-slate-100/70">
        {/* Mobile Central Landmark Banner (< lg screens) */}
        <div className="lg:hidden p-3 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 shadow-2xs mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-700 text-amber-300 flex items-center justify-center shadow-xs shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block leading-tight">
                Agora Public Plaza • Saturday Market
              </span>
              <span className="text-[10px] text-slate-500 block">
                Central Walkway & Peddler Directory
              </span>
            </div>
          </div>
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider shrink-0">
            Agora Core
          </span>
        </div>

        {/* Responsive Grid: Stacks naturally on mobile, 12-columns on large desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-stretch">
          {/* LEFT COLUMN: Section A, Section C, Section E */}
          <div className="lg:col-span-5 space-y-4">
            {renderSectionCard('A', 'Vegetable & Spices', 'Produce', 'bg-emerald-600', 'border-emerald-200', 'bg-emerald-50/20')}
            {renderSectionCard('C', 'Accessories & RTW', 'Dry Goods', 'bg-blue-600', 'border-blue-200', 'bg-blue-50/20')}
            {renderSectionCard('E', 'Furniture', 'Crafts & Wood', 'bg-teal-600', 'border-teal-200', 'bg-teal-50/20')}
          </div>

          {/* CENTER SPINE: MINIMALIST PLAZA & CORRIDOR (Desktop only: lg:flex) */}
          <div className="hidden lg:flex lg:col-span-2 flex-col items-center justify-between py-3 px-1 rounded-2xl bg-slate-50 border border-slate-200/80">
            {/* North Promenade */}
            <div className="w-full py-2 px-1 text-center border-b border-slate-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                North Walkway
              </span>
              <span className="text-[9px] text-slate-500">Market Access</span>
            </div>

            {/* Plaza Monument */}
            <div className="my-auto py-6 flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-700 via-teal-600 to-emerald-600 text-white p-2 flex flex-col items-center justify-center shadow-md border-4 border-white ring-2 ring-emerald-200">
                <MapPin className="w-5 h-5 text-amber-300 mb-1" />
                <span className="text-[10px] font-black uppercase tracking-tight leading-none text-white">
                  PUBLIC PLAZA
                </span>
                <span className="text-[8px] text-emerald-100 uppercase tracking-widest mt-0.5">
                  Agora Core
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold mt-2">Central Landmark</span>
            </div>

            {/* South Main Road */}
            <div className="w-full py-3 px-2 rounded-xl bg-slate-800 text-white text-center shadow-xs">
              <span className="text-[10px] font-black tracking-widest uppercase text-slate-200 block">
                MAIN ROAD
              </span>
              <span className="text-[8px] text-slate-400 block mt-0.5">Vehicle Access</span>
            </div>
          </div>

          {/* RIGHT COLUMN: Section B, Section D, Section F */}
          <div className="lg:col-span-5 space-y-4">
            {renderSectionCard('B', 'Fruits', 'Fresh Produce', 'bg-amber-600', 'border-amber-200', 'bg-amber-50/20')}
            {renderSectionCard('D', 'Thrift Clothes', 'Apparel', 'bg-purple-600', 'border-purple-200', 'bg-purple-50/20')}
            {renderSectionCard('F', 'Flowers', 'Ornamental', 'bg-rose-600', 'border-rose-200', 'bg-rose-50/20')}
          </div>
        </div>
      </div>

      {/* 5. RESPONSIVE LEGEND & GUIDELINES FOOTER */}
      <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          {/* Legend Items (Wraps or Grids cleanly on mobile) */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5 sm:gap-4 font-medium text-slate-700">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-emerald-100 border border-emerald-300 shrink-0" />
              <span>Occupied</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-blue-100 border border-blue-300 shrink-0" />
              <span>Reserved</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-white border-2 border-slate-400 shrink-0" />
              <span className="font-bold text-emerald-950">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-rose-100 border border-rose-300 shrink-0" />
              <span>Restricted</span>
            </div>
          </div>

          {/* Slogan */}
          <div className="text-left sm:text-right">
            <span className="text-[11px] font-serif italic text-emerald-900 font-semibold block">
              &ldquo;Organized Market, A Cleaner and More Orderly La Carlota City!&rdquo;
            </span>
          </div>
        </div>
      </div>

      {/* 6. POLITE SLOT DETAIL POPUP MODAL */}
      {activeSlotModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setActiveSlotModal(null)}
        >
          <div
            className="bg-white text-slate-900 rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-black font-mono shadow-xs shrink-0 ${
                    activeSlotModal.status === 'AVAILABLE'
                      ? 'bg-emerald-600 text-white'
                      : activeSlotModal.status === 'OCCUPIED'
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : activeSlotModal.status === 'RESERVED'
                      ? 'bg-blue-100 text-blue-900 border border-blue-300'
                      : 'bg-rose-100 text-rose-900 border border-rose-300'
                  }`}
                >
                  {activeSlotModal.slot_code}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-tight truncate">
                    Slot {activeSlotModal.slot_code}
                  </h4>
                  <span className="text-xs text-slate-500 font-medium truncate block">
                    Section {activeSlotModal.section_code} – {activeSlotModal.section_name}
                  </span>
                </div>
              </div>

              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                  activeSlotModal.status === 'AVAILABLE'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : activeSlotModal.status === 'OCCUPIED'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : activeSlotModal.status === 'RESERVED'
                    ? 'bg-blue-50 text-blue-800 border border-blue-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {activeSlotModal.status}
              </span>
            </div>

            {/* Modal Body */}
            <div className="py-3.5 space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Availability Note
                </span>
                <p className="text-slate-700 font-medium leading-relaxed">
                  {activeSlotModal.notes || (
                    activeSlotModal.status === 'AVAILABLE'
                      ? 'This stall slot is currently vacant and open for new applicants.'
                      : activeSlotModal.status === 'OCCUPIED'
                      ? 'This stall is currently occupied by a registered peddler with a valid municipal permit.'
                      : activeSlotModal.status === 'RESERVED'
                      ? 'This stall has an application currently undergoing municipal department review.'
                      : 'This stall is restricted or corresponds to an expired permit pending renewal.'
                  )}
                </p>
              </div>

              {activeSlotModal.occupant && (
                <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block mb-1">
                    Permit / Application Details
                  </span>
                  <p className="text-emerald-950 font-bold truncate">
                    {activeSlotModal.occupant.name || activeSlotModal.occupant.applicant}
                  </p>
                  <p className="text-[11px] text-emerald-700 mt-0.5 font-medium truncate">
                    {activeSlotModal.occupant.business} • {activeSlotModal.occupant.permit_number || activeSlotModal.occupant.application_number}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveSlotModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
              {selectionMode && activeSlotModal.status === 'AVAILABLE' && (
                <button
                  type="button"
                  onClick={() => {
                    setTempSelected(activeSlotModal.slot_code);
                    onSelectSlot(activeSlotModal);
                    setActiveSlotModal(null);
                  }}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-700/20 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Select Slot {activeSlotModal.slot_code}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
