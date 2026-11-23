import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Award,
  CheckCircle2,
  Eye,
  RefreshCw,
  Loader2,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Store,
  Receipt,
  FileCheck2,
  AlertTriangle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { applicationApi, workflowApi } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useToast } from '../../contexts/ToastContext';

export default function PermitRelease() {
  const [activeTab, setActiveTab] = useState('READY_FOR_PERMIT_RELEASE'); // 'READY_FOR_PERMIT_RELEASE' or 'FINISHED'
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [meta, setMeta] = useState(null);

  // Badge counts
  const [readyCount, setReadyCount] = useState(0);
  const [releasedCount, setReleasedCount] = useState(0);

  // Release confirmation modal
  const [releaseModalTarget, setReleaseModalTarget] = useState(null);
  const [releasing, setReleasing] = useState(false);

  const { success, error } = useToast();

  // 300ms debounce on search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch summary badge counts (unfiltered totals)
  const fetchCounts = async () => {
    try {
      const [resReady, resFinished] = await Promise.all([
        applicationApi.list({ status: 'READY_FOR_PERMIT_RELEASE', per_page: 1 }),
        applicationApi.list({ status: 'FINISHED', per_page: 1 }),
      ]);
      if (resReady.success && resReady.meta?.pagination) {
        setReadyCount(resReady.meta.pagination.total);
      }
      if (resFinished.success && resFinished.meta?.pagination) {
        setReleasedCount(resFinished.meta.pagination.total);
      }
    } catch {
      // ignore
    }
  };

  // Fetch data for the active tab with debounced search & pagination
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await applicationApi.list({
        status: activeTab,
        search: debouncedSearch || undefined,
        page,
        per_page: perPage,
      });

      if (res.success && res.data) {
        setApplications(res.data);
        setMeta(res.meta?.pagination || null);
      } else {
        setApplications([]);
        setMeta(null);
      }
    } catch (err) {
      error(err.message || 'Failed to fetch verification release queue.');
      setApplications([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [activeTab, debouncedSearch, page, perPage, error]);

  useEffect(() => {
    fetchCounts();
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Confirm and execute permit release
  const handleConfirmRelease = async () => {
    if (!releaseModalTarget) return;

    try {
      setReleasing(true);
      const res = await workflowApi.releasePermit(releaseModalTarget.id);
      if (res.success) {
        success(
          `Permit ${res.data?.permit_number || 'Official Permit'} released! Arkabala QR Code is now ACTIVE.`
        );
        setReleaseModalTarget(null);
        fetchCounts();
        fetchData();
      } else {
        error(res.message || 'Permit release failed.');
      }
    } catch (err) {
      error(err.message || 'Permit release failed.');
    } finally {
      setReleasing(false);
    }
  };

  // Generate pagination page numbers
  const pageNumbers = useMemo(() => {
    if (!meta || !meta.last_page) return [];
    const totalPages = meta.last_page;
    const current = meta.page;
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= current - delta && i <= current + delta)) {
        range.push(i);
      }
    }

    for (const i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  }, [meta]);

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Permit Verification Release
            </h1>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
              Stage 5
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Stage 5: Final review of verified payments and authorization of Official Digital Peddler Business Permits.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            fetchCounts();
            fetchData();
          }}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* 2. Overview Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Pending Card */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('READY_FOR_PERMIT_RELEASE');
            setPage(1);
          }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === 'READY_FOR_PERMIT_RELEASE'
              ? 'bg-gradient-to-r from-emerald-800 to-teal-900 text-white border-emerald-700 shadow-md ring-2 ring-emerald-500/30'
              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${
              activeTab === 'READY_FOR_PERMIT_RELEASE' ? 'text-emerald-200' : 'text-slate-500'
            }`}>
              Awaiting Verification Release
            </span>
            <div className={`w-2.5 h-2.5 rounded-full ${
              activeTab === 'READY_FOR_PERMIT_RELEASE' ? 'bg-amber-300 animate-pulse' : 'bg-amber-500'
            }`} />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black font-mono">
              {readyCount}
            </span>
            <Clock className={`w-5 h-5 ${
              activeTab === 'READY_FOR_PERMIT_RELEASE' ? 'text-emerald-300' : 'text-slate-400'
            }`} />
          </div>
          <p className={`text-[11px] mt-1 ${
            activeTab === 'READY_FOR_PERMIT_RELEASE' ? 'text-emerald-100/90' : 'text-slate-500'
          }`}>
            Treasury payments verified &amp; ready for permit signing
          </p>
        </button>

        {/* Released Card */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('FINISHED');
            setPage(1);
          }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === 'FINISHED'
              ? 'bg-gradient-to-r from-emerald-800 to-teal-900 text-white border-emerald-700 shadow-md ring-2 ring-emerald-500/30'
              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${
              activeTab === 'FINISHED' ? 'text-emerald-200' : 'text-slate-500'
            }`}>
              Released Official Permits
            </span>
            <CheckCircle2 className={`w-3.5 h-3.5 ${
              activeTab === 'FINISHED' ? 'text-emerald-300' : 'text-emerald-600'
            }`} />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black font-mono">
              {releasedCount}
            </span>
            <Award className={`w-5 h-5 ${
              activeTab === 'FINISHED' ? 'text-emerald-300' : 'text-slate-400'
            }`} />
          </div>
          <p className={`text-[11px] mt-1 ${
            activeTab === 'FINISHED' ? 'text-emerald-100/90' : 'text-slate-500'
          }`}>
            Permits authorized with active Arkabala QR verification
          </p>
        </button>

        {/* System Total Overview */}
        <div className="p-4 rounded-2xl border border-slate-200 bg-white text-slate-800 sm:col-span-2 lg:col-span-1 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Queue Processed
            </span>
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900">
              {readyCount + releasedCount}
            </span>
            <FileCheck2 className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Complete municipal peddler workflow audit trail
          </p>
        </div>
      </div>

      {/* 3. Main Card with Tabs, Search, Table, and Pagination */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Navigation Tabs */}
        <div className="px-4 sm:px-6 pt-4 border-b border-slate-200 bg-slate-50/60">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => {
                setActiveTab('READY_FOR_PERMIT_RELEASE');
                setPage(1);
              }}
              className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'READY_FOR_PERMIT_RELEASE'
                  ? 'border-emerald-600 text-emerald-900 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  activeTab === 'READY_FOR_PERMIT_RELEASE'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-slate-300'
                }`}
              />
              <span>Ready for Verification Release</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === 'READY_FOR_PERMIT_RELEASE'
                    ? 'bg-emerald-100 text-emerald-900'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {readyCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('FINISHED');
                setPage(1);
              }}
              className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'FINISHED'
                  ? 'border-emerald-600 text-emerald-900 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <CheckCircle2
                className={`w-3.5 h-3.5 ${
                  activeTab === 'FINISHED' ? 'text-emerald-600' : 'text-slate-400'
                }`}
              />
              <span>Released Official Permits</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === 'FINISHED'
                    ? 'bg-emerald-100 text-emerald-900'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {releasedCount}
              </span>
            </button>
          </div>
        </div>

        {/* Search & Control Filter Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Debounced Search Input */}
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Application ID, Peddler Name, Peddler Code, OR Number, Vending Line..."
              className="w-full pl-9.5 pr-8 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all bg-slate-50/50 hover:bg-white"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Per-Page & Status Info */}
          <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-slate-500">
              <span className="font-medium text-[11px]">Per page:</span>
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            {debouncedSearch && (
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                Searching: &ldquo;{debouncedSearch}&rdquo;
              </span>
            )}
          </div>
        </div>

        {/* Data Table */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-700" />
            <span className="text-xs font-medium text-slate-500">
              Loading verification release records...
            </span>
          </div>
        ) : applications.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No applications found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              {debouncedSearch
                ? `No records found matching "${debouncedSearch}". Try checking your spelling or clear the search filter.`
                : activeTab === 'READY_FOR_PERMIT_RELEASE'
                ? 'No applications currently awaiting permit release. All verified applications have been authorized.'
                : 'No official permits have been released yet.'}
            </p>
            {debouncedSearch && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="mt-3.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Clear Search Filter
              </button>
            )}
          </div>
        ) : activeTab === 'READY_FOR_PERMIT_RELEASE' ? (
          /* TAB 1: READY FOR PERMIT RELEASE */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200">
                  <th className="py-3 px-4">Application ID</th>
                  <th className="py-3 px-4">Peddler ID &amp; Name</th>
                  <th className="py-3 px-4">Business Nature &amp; Stall</th>
                  <th className="py-3 px-4">OR Number</th>
                  <th className="py-3 px-4">Amount Paid</th>
                  <th className="py-3 px-4 text-right">Verification Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Application ID */}
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-950">
                      <div>#{app.application_number}</div>
                      <span className="text-[10px] font-sans font-medium text-slate-400 block mt-0.5">
                        {formatDate(app.created_at || app.date_of_application)}
                      </span>
                    </td>

                    {/* Peddler ID & Name */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-xs">
                        {app.applicant_full_name}
                      </div>
                      <span className="font-mono text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/80 mt-0.5 inline-block">
                        {app.peddler_code || 'Pending ID'}
                      </span>
                    </td>

                    {/* Business Nature & Stall */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-medium text-slate-800 truncate">
                        {app.nature_of_business}
                      </div>
                      {app.assigned_slot ? (
                        <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-800 mt-0.5">
                          <Store className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>Stall Slot {app.assigned_slot}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">Regular Peddler Zone</span>
                      )}
                    </td>

                    {/* OR Number */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-mono font-bold text-slate-800">
                        <Receipt className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{app.or_number || 'OR-PENDING'}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Treasury Verified</span>
                      </span>
                    </td>

                    {/* Amount Paid */}
                    <td className="py-3.5 px-4 font-bold text-emerald-700 text-xs font-mono">
                      {formatCurrency(app.total_amount || app.amount_paid || 0)}
                    </td>

                    {/* Action Button */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setReleaseModalTarget(app)}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-sm shadow-emerald-600/20 active:scale-95 transition-all inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <Award className="w-3.5 h-3.5 text-amber-200" />
                        <span>VERIFY &amp; RELEASE</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* TAB 2: RELEASED OFFICIAL PERMITS LOG */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200">
                  <th className="py-3 px-4">Permit Number</th>
                  <th className="py-3 px-4">Application &amp; Peddler</th>
                  <th className="py-3 px-4">Vending Zone / Line</th>
                  <th className="py-3 px-4">Validity Period</th>
                  <th className="py-3 px-4">QR Status</th>
                  <th className="py-3 px-4 text-right">Official Document</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Permit Number */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>{app.permit_number || `PERMIT-${app.application_number}`}</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-block mt-1">
                        OFFICIAL PERMIT
                      </span>
                    </td>

                    {/* Application & Peddler */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{app.applicant_full_name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-[10px] text-emerald-700 font-semibold">
                          {app.peddler_code}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="font-mono text-[10px] text-slate-400">
                          #{app.application_number}
                        </span>
                      </div>
                    </td>

                    {/* Vending Line & Zone */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800 truncate max-w-xs">
                        {app.nature_of_business}
                      </div>
                      {app.assigned_slot ? (
                        <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-800 mt-0.5">
                          <Store className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>Agora Market: {app.assigned_slot}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">Public Market Zones</span>
                      )}
                    </td>

                    {/* Validity Period */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                      <div>
                        {app.valid_from && app.valid_until ? (
                          <>
                            <span className="font-semibold text-slate-800">{formatDate(app.valid_from)}</span>
                            <span className="text-slate-400 mx-1">–</span>
                            <span className="font-semibold text-slate-800">{formatDate(app.valid_until)}</span>
                          </>
                        ) : (
                          <span className="font-semibold text-slate-700">Annual Valid Calendar Year</span>
                        )}
                      </div>
                    </td>

                    {/* QR Status */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>QR CODE ACTIVE</span>
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right">
                      <a
                        href={workflowApi.getPermitViewUrl(app.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Permit PDF</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. Page Pagination Controls */}
        {meta && meta.total > 0 && (
          <div className="p-4 sm:px-6 border-t border-slate-100 bg-slate-50/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            {/* Range info */}
            <div>
              Showing <strong className="text-slate-800 font-mono">{(meta.page - 1) * meta.per_page + 1}</strong> to{' '}
              <strong className="text-slate-800 font-mono">
                {Math.min(meta.page * meta.per_page, meta.total)}
              </strong>{' '}
              of <strong className="text-slate-800 font-mono">{meta.total}</strong> permits
            </div>

            {/* Page navigation buttons */}
            <div className="flex items-center gap-1">
              {/* Previous Button */}
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Page Number Buttons */}
              {pageNumbers.map((pNum, idx) =>
                pNum === '...' ? (
                  <span key={`dots-${idx}`} className="px-2 text-slate-400 select-none">
                    &hellip;
                  </span>
                ) : (
                  <button
                    key={`page-${pNum}`}
                    type="button"
                    onClick={() => setPage(pNum)}
                    className={`min-w-[32px] h-8 px-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      page === pNum
                        ? 'bg-emerald-600 text-white shadow-xs font-black'
                        : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {pNum}
                  </button>
                )
              )}

              {/* Next Button */}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
                disabled={page >= meta.last_page}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Confirmation Modal for Permit Release */}
      {releaseModalTarget && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => !releasing && setReleaseModalTarget(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Award className="w-6 h-6 text-emerald-700" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  Authorize &amp; Release Permit
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  You are authorizing the official business permit for application{' '}
                  <strong className="font-mono text-slate-800">#{releaseModalTarget.application_number}</strong>.
                </p>
              </div>
            </div>

            {/* Applicant Details Box */}
            <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-1.5 font-medium">
              <div className="flex justify-between">
                <span className="text-slate-500">Applicant:</span>
                <span className="font-bold text-slate-900">{releaseModalTarget.applicant_full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Peddler Code:</span>
                <span className="font-mono font-bold text-emerald-800">{releaseModalTarget.peddler_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Official Receipt:</span>
                <span className="font-mono text-slate-800 font-semibold">{releaseModalTarget.or_number || 'VERIFIED'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Vending Line:</span>
                <span className="text-slate-800 font-semibold truncate max-w-[200px]">{releaseModalTarget.nature_of_business}</span>
              </div>
              {releaseModalTarget.assigned_slot && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Market Stall:</span>
                  <span className="font-mono font-bold text-emerald-700">Slot {releaseModalTarget.assigned_slot}</span>
                </div>
              )}
            </div>

            {/* Activation Notice */}
            <div className="mt-4 p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                <Sparkles className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>Immediate QR Code Activation</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Confirming this authorization will generate the official PDF permit certificate and immediately activate the peddler&apos;s Arkabala QR code for market fee collection and inspection.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setReleaseModalTarget(null)}
                disabled={releasing}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRelease}
                disabled={releasing}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {releasing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Authorizing &amp; Generating...</span>
                  </>
                ) : (
                  <>
                    <Award className="w-3.5 h-3.5 text-amber-200" />
                    <span>Authorize &amp; Release</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
