import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart3,
  FileSpreadsheet,
  Printer,
  Calendar,
  Filter,
  RefreshCw,
  Search,
  Coins,
  FileText,
  Store,
  Users,
  History,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  MapPin,
  TrendingUp,
} from 'lucide-react';
import StatsCard from '../../components/StatsCard';
import { reportApi } from '../../services/api';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { useToast } from '../../contexts/ToastContext';

const formatLogDetails = (raw) => {
  if (!raw || raw === '—') return '—';
  if (typeof raw === 'object') {
    return Object.entries(raw)
      .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
      .join(' • ');
  }
  if (typeof raw === 'string') {
    const unescaped = raw.replace(/&quot;/g, '"');
    try {
      const parsed = JSON.parse(unescaped);
      if (typeof parsed === 'object' && parsed !== null) {
        return Object.entries(parsed)
          .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
          .join(' • ');
      }
    } catch {
      return unescaped;
    }
  }
  return String(raw);
};

const REPORT_TABS = [
  {
    id: 'revenue',
    endpoint: 'revenue',
    title: 'Revenue & Collections',
    subtitle: 'Permit fees and weekly arkabala dues',
    icon: Coins,
    color: 'emerald',
  },
  {
    id: 'applications',
    endpoint: 'applications',
    title: 'Applications Registry',
    subtitle: 'Permit applications and review audit',
    icon: FileText,
    color: 'blue',
  },
  {
    id: 'market-stalls',
    endpoint: 'market-stalls',
    title: 'Saturday Market Stalls',
    subtitle: 'Occupancy across 300 market slots',
    icon: Store,
    color: 'teal',
  },
  {
    id: 'peddlers',
    endpoint: 'peddlers',
    title: 'Peddler Directory',
    subtitle: 'Registered peddlers & permit compliance',
    icon: Users,
    color: 'indigo',
  },
  {
    id: 'activity-logs',
    endpoint: 'activity-logs',
    title: 'System Audit Logs',
    subtitle: 'Staff operations and security trail',
    icon: History,
    color: 'amber',
  },
];

export default function AdminReports() {
  const [activeTab, setActiveTab] = useState('revenue');
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const { error, success } = useToast();

  // Common filters
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchInput, setSearchInput] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');

  // Tab-specific filters
  const [revenueType, setRevenueType] = useState('all'); // all, permit, arkabala
  const [paymentMethod, setPaymentMethod] = useState('all'); // all, CASH, PAYMONGO_QRPH
  const [appStatus, setAppStatus] = useState('all');
  const [appType, setAppType] = useState('all');
  const [stallSection, setStallSection] = useState('all'); // all, A, B, C, D, E, F
  const [stallStatus, setStallStatus] = useState('all');
  const [peddlerStatus, setPeddlerStatus] = useState('all');
  const [logRole, setLogRole] = useState('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(searchInput);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset page when tab changes
  useEffect(() => {
    setCurrentPage(1);
    setSearchInput('');
    setSearchDebounced('');
  }, [activeTab]);

  // Fetch report data
  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      let res = null;

      if (activeTab === 'revenue') {
        res = await reportApi.getRevenue({
          start_date: startDate,
          end_date: endDate,
          type: revenueType,
          method: paymentMethod,
        });
      } else if (activeTab === 'applications') {
        res = await reportApi.getApplications({
          start_date: startDate,
          end_date: endDate,
          status: appStatus,
          type: appType,
          search: searchDebounced,
        });
      } else if (activeTab === 'market-stalls') {
        res = await reportApi.getMarketStalls({
          section: stallSection,
          status: stallStatus,
          search: searchDebounced,
        });
      } else if (activeTab === 'peddlers') {
        res = await reportApi.getPeddlers({
          status: peddlerStatus,
          search: searchDebounced,
        });
      } else if (activeTab === 'activity-logs') {
        res = await reportApi.getActivityLogs({
          start_date: startDate,
          end_date: endDate,
          role: logRole,
          search: searchDebounced,
        });
      }

      if (res && res.data) {
        setReportData(res.data);
      }
    } catch (err) {
      error(err.message || 'Failed to generate report.');
    } finally {
      setLoading(false);
    }
  }, [
    activeTab,
    startDate,
    endDate,
    revenueType,
    paymentMethod,
    appStatus,
    appType,
    stallSection,
    stallStatus,
    peddlerStatus,
    logRole,
    searchDebounced,
  ]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Build current query params for export URLs
  const currentParams = useMemo(() => {
    const params = {};
    if (activeTab === 'revenue') {
      params.start_date = startDate;
      params.end_date = endDate;
      params.type = revenueType;
      params.method = paymentMethod;
    } else if (activeTab === 'applications') {
      params.start_date = startDate;
      params.end_date = endDate;
      params.status = appStatus;
      params.type = appType;
      params.search = searchDebounced;
    } else if (activeTab === 'market-stalls') {
      params.section = stallSection;
      params.status = stallStatus;
      params.search = searchDebounced;
    } else if (activeTab === 'peddlers') {
      params.status = peddlerStatus;
      params.search = searchDebounced;
    } else if (activeTab === 'activity-logs') {
      params.start_date = startDate;
      params.end_date = endDate;
      params.role = logRole;
      params.search = searchDebounced;
    }
    return params;
  }, [
    activeTab,
    startDate,
    endDate,
    revenueType,
    paymentMethod,
    appStatus,
    appType,
    stallSection,
    stallStatus,
    peddlerStatus,
    logRole,
    searchDebounced,
  ]);

  // Action: Open PDF View / Print
  const handleOpenPdf = () => {
    const url = reportApi.getExportUrl(activeTab, 'pdf', currentParams);
    window.open(url, '_blank');
  };

  // Action: Direct Download CSV
  const handleDownloadCsv = () => {
    const url = reportApi.getExportUrl(activeTab, 'csv', currentParams);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('CSV download started.');
  };

  // Quick Date Presets
  const applyPreset = (preset) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'this-week') {
      const first = today.getDate() - today.getDay();
      const firstDay = new Date(today.setDate(first)).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(new Date().toISOString().split('T')[0]);
    } else if (preset === 'this-month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
        .toISOString()
        .split('T')[0];
      setStartDate(firstDay);
      setEndDate(todayStr);
    } else if (preset === 'ytd') {
      const firstDay = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(todayStr);
    }
  };

  // Determine rows array based on tab
  const rows = useMemo(() => {
    if (!reportData) return [];
    if (activeTab === 'revenue') return reportData.transactions || [];
    if (activeTab === 'applications') return reportData.applications || [];
    if (activeTab === 'market-stalls') return reportData.stalls || [];
    if (activeTab === 'peddlers') return reportData.peddlers || [];
    if (activeTab === 'activity-logs') return reportData.logs || [];
    return [];
  }, [reportData, activeTab]);

  // Pagination slice
  const totalPages = Math.ceil(rows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, currentPage]);

  const summary = reportData?.summary || {};

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              City Government of La Carlota &bull; Official Registry & Ledgers
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Official Reports &amp; Regulatory Exports
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-0.5 max-w-3xl">
            Export official government-templated PDF reports with municipal letterhead and formal signatories,
            or download Excel-compatible CSV data sheets.
          </p>
        </div>

        {/* Global Export Actions */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={fetchReport}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>

          <button
            onClick={handleDownloadCsv}
            disabled={loading || rows.length === 0}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs flex items-center gap-2 cursor-pointer transition-all hover:border-slate-300 disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Download CSV</span>
          </button>

          <button
            onClick={handleOpenPdf}
            disabled={loading || rows.length === 0}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>Export / Print PDF</span>
            <ExternalLink className="w-3 h-3 text-emerald-200" />
          </button>
        </div>
      </div>

      {/* Report Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {REPORT_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`p-3.5 rounded-2xl text-left border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                isActive
                  ? 'bg-emerald-950 text-white border-emerald-900 shadow-md ring-2 ring-emerald-500/30'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-emerald-800 text-emerald-200' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                {isActive && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                )}
              </div>
              <div>
                <span className="text-xs font-bold block leading-snug">{tab.title}</span>
                <span
                  className={`text-[10px] block mt-0.5 leading-tight ${
                    isActive ? 'text-emerald-300/80' : 'text-slate-400'
                  }`}
                >
                  {tab.subtitle}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Dynamic Summary Metric Cards */}
      {activeTab === 'revenue' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Settled Revenue"
            value={formatCurrency(summary.grand_total || 0)}
            subtitle={`${summary.total_transactions || 0} total transactions`}
            icon={Coins}
            color="emerald"
          />
          <StatsCard
            title="Permit Fees"
            value={formatCurrency(summary.total_permit_revenue || 0)}
            subtitle="Ambulant vendor registrations"
            icon={FileText}
            color="blue"
          />
          <StatsCard
            title="Arkabala Market Fees"
            value={formatCurrency(summary.total_arkabala_revenue || 0)}
            subtitle="Weekly Saturday stall collections"
            icon={Store}
            color="amber"
          />
          <StatsCard
            title="Cash vs Online QRPh"
            value={formatCurrency(summary.cash_total || 0)}
            subtitle={`Online QRPh: ${formatCurrency(summary.online_total || 0)}`}
            icon={TrendingUp}
            color="indigo"
          />
        </div>
      )}

      {activeTab === 'applications' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Applications"
            value={summary.total_applications || 0}
            subtitle="Within selected date range"
            icon={FileText}
            color="blue"
          />
          <StatsCard
            title="New vs Renewal"
            value={`${summary.new_applications || 0} / ${summary.renewal_applications || 0}`}
            subtitle={`${summary.new_applications || 0} New • ${summary.renewal_applications || 0} Renewal`}
            icon={Users}
            color="indigo"
          />
          <StatsCard
            title="Permit Authorized"
            value={summary.approved_applications || 0}
            subtitle="Ready or Released"
            icon={CheckCircle2}
            color="emerald"
          />
          <StatsCard
            title="Pending vs Rejected"
            value={`${summary.pending_applications || 0} / ${summary.rejected_applications || 0}`}
            subtitle={`${summary.pending_applications || 0} In-Review • ${summary.rejected_applications || 0} Rejected`}
            icon={Clock}
            color="amber"
          />
        </div>
      )}

      {activeTab === 'market-stalls' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Market Stalls"
            value={summary.total_stalls || 0}
            subtitle="Capacity across Sections A to F"
            icon={Store}
            color="emerald"
          />
          <StatsCard
            title="Occupied Stalls"
            value={summary.occupied_stalls || 0}
            subtitle={`${summary.occupancy_rate || 0}% overall occupancy`}
            icon={CheckCircle2}
            color="blue"
          />
          <StatsCard
            title="Available Slots"
            value={summary.available_stalls || 0}
            subtitle="Open for new peddler assignment"
            icon={Store}
            color="teal"
          />
          <StatsCard
            title="Reserved / Restricted"
            value={(summary.reserved_stalls || 0) + (summary.restricted_stalls || 0)}
            subtitle={`${summary.reserved_stalls || 0} Reserved • ${summary.restricted_stalls || 0} Restricted`}
            icon={AlertCircle}
            color="amber"
          />
        </div>
      )}

      {activeTab === 'peddlers' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Registered Peddlers"
            value={summary.total_peddlers || 0}
            subtitle="Accredited city ambulant vendors"
            icon={Users}
            color="emerald"
          />
          <StatsCard
            title="Active Permittees"
            value={summary.active_peddlers || 0}
            subtitle="Compliant with active permits"
            icon={CheckCircle2}
            color="blue"
          />
          <StatsCard
            title="Arkabala QR Active"
            value={summary.qr_active_peddlers || 0}
            subtitle="Enabled for Saturday field collection"
            icon={TrendingUp}
            color="indigo"
          />
          <StatsCard
            title="Pending / Suspended"
            value={(summary.pending_peddlers || 0) + (summary.suspended_peddlers || 0)}
            subtitle={`${summary.pending_peddlers || 0} Pending • ${summary.suspended_peddlers || 0} Suspended`}
            icon={AlertCircle}
            color="amber"
          />
        </div>
      )}

      {activeTab === 'activity-logs' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Audit Events"
            value={summary.total_logs || 0}
            subtitle="Logged administrative actions"
            icon={History}
            color="indigo"
          />
          <StatsCard
            title="Reporting Period"
            value={`${formatDate(startDate)}`}
            subtitle={`to ${formatDate(endDate)}`}
            icon={Calendar}
            color="blue"
          />
          <StatsCard
            title="Security Scope"
            value="Web &amp; Mobile"
            subtitle="Multi-platform audit capture"
            icon={ShieldCheck}
            color="emerald"
          />
          <StatsCard
            title="Audit Status"
            value="Encrypted"
            subtitle="Tamper-proof system ledger"
            icon={CheckCircle2}
            color="teal"
          />
        </div>
      )}

      {/* Filter & Search Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Date range pickers (for date-based reports) */}
          {(activeTab === 'revenue' || activeTab === 'applications' || activeTab === 'activity-logs') && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] font-bold text-slate-500 uppercase">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-700 outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <span className="text-[11px] font-bold text-slate-500 uppercase">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-700 outline-none"
                />
              </div>

              {/* Quick Presets */}
              <div className="hidden sm:flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => applyPreset('today')}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('this-week')}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                >
                  This Week
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('this-month')}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                >
                  This Month
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('ytd')}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                >
                  YTD
                </button>
              </div>
            </div>
          )}

          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={
                activeTab === 'revenue'
                  ? 'Filter by OR, payor, or app ref...'
                  : activeTab === 'applications'
                  ? 'Search applicant, app #, or business...'
                  : activeTab === 'market-stalls'
                  ? 'Search stall code (e.g. A-01), occupant...'
                  : activeTab === 'peddlers'
                  ? 'Search peddler name or code...'
                  : 'Search activity logs...'
              }
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
            />
          </div>
        </div>

        {/* Secondary Filter Chips Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3" /> Filters:
          </span>

          {activeTab === 'revenue' && (
            <>
              <select
                value={revenueType}
                onChange={(e) => setRevenueType(e.target.value)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 border border-slate-200 text-slate-700 outline-none"
              >
                <option value="all">All Fee Categories</option>
                <option value="permit">Permit Fees Only</option>
                <option value="arkabala">Arkabala Collections Only</option>
              </select>

              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 border border-slate-200 text-slate-700 outline-none"
              >
                <option value="all">All Payment Channels</option>
                <option value="CASH">Cash Over-the-Counter</option>
                <option value="PAYMONGO_QRPH">Online / PayMongo QRPh</option>
              </select>
            </>
          )}

          {activeTab === 'applications' && (
            <>
              <select
                value={appType}
                onChange={(e) => setAppType(e.target.value)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 border border-slate-200 text-slate-700 outline-none"
              >
                <option value="all">All Types (New &amp; Renewal)</option>
                <option value="New">New Applications</option>
                <option value="Renewal">Renewal Applications</option>
              </select>

              <select
                value={appStatus}
                onChange={(e) => setAppStatus(e.target.value)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 border border-slate-200 text-slate-700 outline-none"
              >
                <option value="all">All Processing Stages</option>
                <option value="PENDING_ADMIN_APPROVAL">Pending Admin Review</option>
                <option value="PENDING_INSPECTOR_APPROVAL">Pending Field Inspection</option>
                <option value="PENDING_SANITARY_APPROVAL">Pending Sanitary Review</option>
                <option value="PENDING_TREASURY_PAYMENT">Pending Payment Verification</option>
                <option value="READY_FOR_PERMIT_RELEASE">Ready for Permit Release</option>
                <option value="FINISHED">Permit Released / Finished</option>
                <option value="ADMIN_REJECTED">Admin Rejected</option>
              </select>
            </>
          )}

          {activeTab === 'market-stalls' && (
            <>
              <select
                value={stallSection}
                onChange={(e) => setStallSection(e.target.value)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 border border-slate-200 text-slate-700 outline-none"
              >
                <option value="all">All Sections (A to F - 300 Slots)</option>
                <option value="A">Section A &bull; Vegetables &amp; Spices (50 Slots)</option>
                <option value="B">Section B &bull; Fruits &amp; Produce (50 Slots)</option>
                <option value="C">Section C &bull; Accessories &amp; RTW (50 Slots)</option>
                <option value="D">Section D &bull; Dry Goods &amp; Grains (50 Slots)</option>
                <option value="E">Section E &bull; Cooked Food &amp; Delicacies (50 Slots)</option>
                <option value="F">Section F &bull; Fish &amp; Seafood (50 Slots)</option>
              </select>

              <select
                value={stallStatus}
                onChange={(e) => setStallStatus(e.target.value)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 border border-slate-200 text-slate-700 outline-none"
              >
                <option value="all">All Stall Statuses</option>
                <option value="OCCUPIED">Occupied Slots</option>
                <option value="AVAILABLE">Available (Vacant) Slots</option>
                <option value="RESERVED">Reserved Slots</option>
                <option value="RESTRICTED">Restricted Slots</option>
              </select>
            </>
          )}

          {activeTab === 'peddlers' && (
            <select
              value={peddlerStatus}
              onChange={(e) => setPeddlerStatus(e.target.value)}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 border border-slate-200 text-slate-700 outline-none"
            >
              <option value="all">All Peddler Statuses</option>
              <option value="active">Active Permittees</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="suspended">Suspended Vendors</option>
              <option value="inactive">Inactive</option>
            </select>
          )}

          {activeTab === 'activity-logs' && (
            <select
              value={logRole}
              onChange={(e) => setLogRole(e.target.value)}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 border border-slate-200 text-slate-700 outline-none"
            >
              <option value="all">All Staff Personnel Roles</option>
              <option value="admin">City Administrators</option>
              <option value="treasury">Treasury Officers</option>
              <option value="inspector">Market Inspectors</option>
              <option value="sanitary">Sanitary Inspectors</option>
              <option value="peddler">Peddler Users</option>
            </select>
          )}
        </div>
      </div>

      {/* Main Data Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Subheader */}
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900">
              {activeTab === 'revenue' && 'Revenue & Collections Ledger'}
              {activeTab === 'applications' && 'Permit Applications Registry'}
              {activeTab === 'market-stalls' && 'Saturday Market 300-Stall Inventory'}
              {activeTab === 'peddlers' && 'Active Peddlers Master Directory'}
              {activeTab === 'activity-logs' && 'System Activity & Audit Log Trail'}
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              {rows.length} {rows.length === 1 ? 'record' : 'records'}
            </span>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Page {currentPage} of {totalPages}
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-700" />
            <span className="text-xs font-semibold text-slate-600">Generating report data...</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-slate-300" />
            <p className="font-semibold text-slate-600">No records found matching current criteria.</p>
            <p className="text-[11px] text-slate-400">Try adjusting your date range or filter options.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* 1. REVENUE TABLE */}
            {activeTab === 'revenue' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-600">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">OR / Receipt #</th>
                    <th className="py-3 px-4">Reference / App #</th>
                    <th className="py-3 px-4">Payor / Registrant</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4 text-right">Amount (PHP)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRows.map((tx, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {formatDate(tx.verified_at)}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {tx.or_number || 'N/A'}
                      </td>
                      <td className="py-3 px-4 font-mono text-emerald-700 font-semibold">
                        {tx.application_number}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800 block">{tx.payor_name}</span>
                        <span className="text-[10px] text-slate-400">{tx.nature_of_business || tx.business_nature}</span>
                      </td>
                      <td className="py-3 px-4">
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
                      <td className="py-3 px-4 font-medium text-slate-600">{tx.payment_method}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                        {formatCurrency(tx.amount_paid)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 2. APPLICATIONS TABLE */}
            {activeTab === 'applications' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-600">
                    <th className="py-3 px-4">Date Filed</th>
                    <th className="py-3 px-4">Application #</th>
                    <th className="py-3 px-4">Applicant Full Name</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Line of Business</th>
                    <th className="py-3 px-4 text-center">Stall Slot</th>
                    <th className="py-3 px-4 text-center">Units</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRows.map((app, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {formatDate(app.created_at)}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {app.application_number}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800 block">{app.applicant_name}</span>
                        <span className="text-[10px] text-slate-400">{app.phone || 'No phone'}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            app.application_type === 'New'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {app.application_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700">
                        {app.nature_of_business}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-emerald-700">
                        {app.assigned_slot || '—'}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-700">
                        {(app.num_papag || 0) + (app.num_lag_it || 0)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            app.status === 'FINISHED' || app.status === 'READY_FOR_PERMIT_RELEASE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : app.status.includes('REJECTED')
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {app.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 3. MARKET STALLS TABLE */}
            {activeTab === 'market-stalls' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-600">
                    <th className="py-3 px-4 text-center">Slot</th>
                    <th className="py-3 px-4">Section / Category Zone</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Assigned Vendor / Applicant</th>
                    <th className="py-3 px-4">Peddler / App #</th>
                    <th className="py-3 px-4">Product Line</th>
                    <th className="py-3 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRows.map((stall, idx) => {
                    const occupant = stall.peddler_name || stall.applicant_name || 'None (Vacant)';
                    const code = stall.peddler_code || stall.application_number || '—';
                    const nature = stall.business_nature || stall.app_business_nature || '—';
                    const st = (stall.status || '').toUpperCase();

                    return (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 text-center font-mono font-black text-sm text-emerald-800">
                          {stall.slot_code}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-800 block">Sec {stall.section_code}</span>
                          <span className="text-[10px] text-slate-500">{stall.section_name}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              st === 'OCCUPIED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : st === 'AVAILABLE'
                                ? 'bg-blue-100 text-blue-800'
                                : st === 'RESERVED'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {st}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {occupant}
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-600">
                          {code}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {nature}
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {stall.notes || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* 4. PEDDLERS TABLE */}
            {activeTab === 'peddlers' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-600">
                    <th className="py-3 px-4 text-center">Peddler Code</th>
                    <th className="py-3 px-4">Full Name</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Line of Business</th>
                    <th className="py-3 px-4 text-center">Stall Slot</th>
                    <th className="py-3 px-4">Permit Ref #</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Arkabala QR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRows.map((ped, idx) => {
                    const name = `${ped.first_name} ${ped.middle_name ? ped.middle_name + ' ' : ''}${ped.last_name}`;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">
                          {ped.peddler_code}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">{name}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">{ped.phone || '—'}</td>
                        <td className="py-3 px-4 text-slate-700">{ped.business_nature}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-emerald-700">
                          {ped.assigned_slot || '—'}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {ped.permit_number || '—'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              ped.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {ped.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {ped.is_qr_active ? (
                            <span className="text-emerald-700 font-bold text-[11px]">✓ Active</span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Inactive</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* 5. AUDIT LOGS TABLE */}
            {activeTab === 'activity-logs' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-600">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Government Personnel</th>
                    <th className="py-3 px-4 text-center">Role</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Entity</th>
                    <th className="py-3 px-4">Details</th>
                    <th className="py-3 px-4 text-center">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRows.map((log, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {formatDateTime(log.created_at)}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {log.staff_name || log.username || 'System'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                          {log.role_name}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{log.action}</td>
                      <td className="py-3 px-4 font-mono text-emerald-700 text-[11px]">
                        {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}>
                        {formatLogDetails(log.details)}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-[11px] text-slate-500">
                        {log.ip_address}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, rows.length)} of {rows.length} entries
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700">
                {currentPage}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
