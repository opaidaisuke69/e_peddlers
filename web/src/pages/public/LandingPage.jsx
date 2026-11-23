import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  ArrowRight,
  Search,
  Sparkles,
  Lock,
  ChevronRight,
  UserCheck,
  Check,
  X,
  Loader2,
  AlertCircle,
  User,
  MapPin,
  ShieldCheck,
  Menu,
} from 'lucide-react';
import { applicationApi } from '../../services/api';
import logo from '../../assets/logo.png';

const formatTrackingNumber = (input, prevVal = '') => {
  if (!input) return '';
  const isDeleting = input.length < prevVal.length;
  const val = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!val) return '';

  const prefix3 = val.slice(0, 3);
  if (prefix3 === 'PED' || prefix3 === 'APP') {
    const rest = val.slice(3).replace(/[^0-9]/g, '').slice(0, 9);
    if (!rest) {
      return isDeleting ? prefix3 : `${prefix3}-`;
    }
    const yearPart = rest.slice(0, 4);
    const seqPart = rest.slice(4);
    if (rest.length < 4) {
      return `${prefix3}-${yearPart}`;
    }
    if (rest.length === 4) {
      return isDeleting ? `${prefix3}-${yearPart}` : `${prefix3}-${yearPart}-`;
    }
    return `${prefix3}-${yearPart}-${seqPart}`;
  }

  if (val.startsWith('A') || val.startsWith('AP') || val.startsWith('P') || val.startsWith('PE')) {
    return val;
  }

  // Pure digits: 16-digit random Application Number
  if (/^[0-9]+$/.test(val)) {
    return val.slice(0, 16);
  }

  return val;
};

export default function LandingPage() {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackResult, setTrackResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Set page title to e-Peddlers
  useEffect(() => {
    document.title = 'e-Peddlers';
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTrack = async (e) => {
    e.preventDefault();
    const query = trackingNumber.trim();
    if (!query) return;

    try {
      setSearching(true);
      setSearchError('');
      setTrackResult(null);

      const res = await applicationApi.track(query);
      const data = Array.isArray(res.data) ? res.data[0] : res.data;
      if (res.success && data) {
        setTrackResult(data);
      } else {
        setSearchError(res.message || `No records found matching "${query}". Please verify your application number.`);
      }
    } catch (err) {
      setSearchError(err.message || 'Unable to connect to registry. Please check your application reference number.');
    } finally {
      setSearching(false);
    }
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div id="home" className="min-h-screen bg-slate-50 text-slate-900 selection:bg-emerald-500 selection:text-white overflow-x-hidden">
      {/* 1. TOP HEADER NAVIGATION */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-emerald-100 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2">
          {/* Logo & City Identity */}
          <Link to="/" className="flex items-center gap-2.5 sm:gap-3.5 group shrink-0 min-w-0">
            <img
              src={logo}
              alt="City of La Carlota Official Seal"
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-contain shadow-sm group-hover:scale-105 transition-transform shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-lg sm:text-xl font-extrabold tracking-tight text-emerald-950 font-serif truncate">
                  e-Peddlers
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider shrink-0">
                  La Carlota
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium hidden md:block truncate">
                La Carlota Peddler Business Permit &amp; Vendor Mapping System
              </p>
            </div>
          </Link>

          {/* Desktop Navigation: Apply Permit & Peddlers Login */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <Link
              to="/vendor-map"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-emerald-900 hover:text-emerald-950 hover:bg-emerald-50 font-bold text-xs sm:text-sm transition-all"
            >
              <MapPin className="w-4 h-4 text-emerald-700" />
              <span>Vendor Map</span>
            </Link>
            <Link
              to="/apply-online"
              className="relative inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-md shadow-emerald-600/30 ring-2 ring-emerald-300/60 ring-offset-2 ring-offset-white transition-all"
            >
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400" />
              </span>
              <FileText className="w-4 h-4" />
              <span>Apply Permit</span>
            </Link>
            <Link
              to="/peddler-login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-50 border-2 border-emerald-600 text-emerald-800 hover:bg-emerald-600 hover:text-white font-bold text-sm transition-all shadow-xs"
            >
              <UserCheck className="w-4 h-4" />
              <span>Peddlers Login</span>
            </Link>
          </div>

          {/* Mobile Hamburger Menu Toggle (Only for mobile responsiveness) */}
          <div className="relative md:hidden shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-600/70 text-emerald-900 font-bold text-xs transition-all cursor-pointer shadow-xs active:scale-95"
              aria-expanded={menuOpen}
              aria-label="Toggle navigation menu"
            >
              {menuOpen ? (
                <X className="w-4 h-4 text-emerald-800" />
              ) : (
                <Menu className="w-4 h-4 text-emerald-800" />
              )}
              <span className="font-bold text-emerald-950">Menu</span>
            </button>

            {/* Mobile Dropdown Menu */}
            {menuOpen && (
              <div className="absolute right-0 mt-2.5 w-72 bg-white rounded-2xl shadow-2xl shadow-emerald-950/15 border border-emerald-100 p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 border-b border-slate-100 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Municipal Peddler Portal
                  </span>
                  <span className="text-xs font-semibold text-emerald-900">
                    City Government of La Carlota
                  </span>
                </div>

                <div className="space-y-1.5">
                  {/* 1. Apply Permit */}
                  <Link
                    to="/apply-online"
                    onClick={() => setMenuOpen(false)}
                    className="relative flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border border-emerald-200/90 transition-all group shadow-xs"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-emerald-950">
                          Apply Permit
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs">
                          New
                        </span>
                      </div>
                      <p className="text-xs text-emerald-800/80 truncate mt-0.5">
                        Submit permit registration
                      </p>
                    </div>
                  </Link>

                  {/* 2. Peddlers Login */}
                  <Link
                    to="/peddler-login"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-emerald-50 border border-transparent hover:border-emerald-200/80 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 group-hover:bg-emerald-700 group-hover:text-white transition-colors">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900 group-hover:text-emerald-900">
                          Peddlers Login
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        Access peddler account &amp; ID
                      </p>
                    </div>
                  </Link>

                  {/* 2b. Saturday Vendor Map */}
                  <Link
                    to="/vendor-map"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-emerald-50 border border-transparent hover:border-emerald-200/80 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900 group-hover:text-emerald-900">
                          Saturday Vendor Map
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        View market stall availability
                      </p>
                    </div>
                  </Link>
                  {/* 3. Track Application */}
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      scrollToSection('track-application');
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group text-left cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 group-hover:bg-slate-200 transition-colors">
                      <Search className="w-5 h-5 text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-800 group-hover:text-slate-950">
                          Track Application
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        Check clearance progress
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-900 via-emerald-800 to-emerald-950 text-white py-12 sm:py-16 lg:py-24">
        {/* Decorative backdrop */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#a7f3d0_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
        <div className="absolute top-1/4 -right-24 w-72 sm:w-96 h-72 sm:h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 -left-24 w-72 sm:w-96 h-72 sm:h-96 bg-teal-400/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-5 sm:space-y-6 text-center lg:text-left order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-semibold backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                <span>Republic of the Philippines • City of La Carlota</span>
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight font-serif break-words">
                e-Peddlers: La Carlota Peddler Business Permit &amp; Vendor Mapping System
              </h1>

              <p className="text-sm sm:text-base text-emerald-100/90 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-light">
                Official business permit application and vendor mapping platform for street and market peddlers in La Carlota City. Apply online, submit compliance requirements, and track municipal approvals across city departments.
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 w-full sm:w-auto">
                <Link
                  to="/apply-online"
                  className="w-full sm:w-auto px-7 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm sm:text-base shadow-xl shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-center"
                >
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950" />
                  <span>Apply for Permit</span>
                  <ArrowRight className="w-4 h-4 text-slate-950" />
                </Link>

                <button
                  type="button"
                  onClick={() => scrollToSection('track-application')}
                  className="w-full sm:w-auto px-7 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl bg-emerald-700/60 hover:bg-emerald-700 border border-emerald-400/30 text-white font-bold text-sm sm:text-base backdrop-blur-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  <span>Track Application</span>
                </button>
              </div>
            </div>

            {/* Right Column: Stationary Official Seal Logo with Bling Signal Waves */}
            <div className="lg:col-span-5 flex items-center justify-center py-4 sm:py-6 order-1 lg:order-2 overflow-hidden">
              <div className="relative flex items-center justify-center p-6 sm:p-10">
                {/* Radiating Bling Signal Rings */}
                <div className="bling-signal-1 absolute w-48 h-48 sm:w-64 sm:h-64 lg:w-80 lg:h-80 rounded-full border-2 border-emerald-300/70 shadow-[0_0_25px_rgba(110,231,183,0.45)] pointer-events-none" />
                <div className="bling-signal-2 absolute w-48 h-48 sm:w-64 sm:h-64 lg:w-80 lg:h-80 rounded-full border-2 border-emerald-200/60 shadow-[0_0_25px_rgba(167,243,208,0.4)] pointer-events-none" />
                <div className="bling-signal-3 absolute w-48 h-48 sm:w-64 sm:h-64 lg:w-80 lg:h-80 rounded-full border-2 border-teal-200/50 shadow-[0_0_25px_rgba(153,246,228,0.35)] pointer-events-none" />

                {/* Stationary Larger Seal Container with Bling Shine Sweep */}
                <div className="logo-bling-shine relative w-48 h-48 sm:w-64 sm:h-64 lg:w-80 lg:h-80 rounded-full bg-white p-2 overflow-hidden ring-4 ring-emerald-300/60 shadow-[0_0_40px_rgba(16,185,129,0.45)]">
                  <img
                    src={logo}
                    alt="City of La Carlota Official Seal"
                    className="w-full h-full object-contain rounded-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. TRACK APPLICATION SECTION (MODERN REDESIGN) */}
      <section id="track-application" className="py-24 bg-gradient-to-b from-white via-slate-50 to-emerald-50/20 border-b border-emerald-100 scroll-mt-20 relative overflow-hidden">
        {/* Soft Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-emerald-100/50 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main Elevated Card Container */}
          <div className="bg-white rounded-3xl border border-emerald-100 shadow-xl shadow-emerald-950/5 p-6 sm:p-10 relative overflow-hidden">
            {/* Top Emerald Accent Strip */}
            <div className="absolute top-0 inset-x-8 h-1 bg-gradient-to-r from-emerald-700 via-emerald-500 to-teal-500 rounded-b-full" />

            {/* Header */}
            <div className="text-center max-w-xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-bold tracking-wide shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                <span>Application Status</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-3 font-serif tracking-tight">
                Track Application
              </h2>
            </div>

            {/* Search Input Form */}
            <form onSubmit={handleTrack} className="mt-7">
              <div className="relative flex flex-col sm:flex-row items-stretch gap-2.5 p-1.5 sm:p-2 bg-slate-50/90 rounded-2xl border-2 border-slate-200 focus-within:border-emerald-600 focus-within:ring-4 focus-within:ring-emerald-500/15 focus-within:bg-white transition-all shadow-xs">
                <div className="relative flex-1 flex items-center">
                  <Search className="w-5 h-5 text-emerald-700/60 absolute left-4 pointer-events-none" />
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => {
                      const formatted = formatTrackingNumber(e.target.value, trackingNumber);
                      setTrackingNumber(formatted);
                    }}
                    placeholder="e.g. 16-digit Application No. or PED-2026-12345..."
                    required
                    className="w-full pl-12 pr-10 py-3 text-slate-900 placeholder-slate-400 text-sm sm:text-base font-mono uppercase bg-transparent focus:outline-none"
                  />
                  {trackingNumber && (
                    <button
                      type="button"
                      onClick={() => {
                        setTrackingNumber('');
                        setTrackResult(null);
                        setSearchError('');
                      }}
                      className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
                      title="Clear"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={searching}
                  className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-800 hover:to-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-800/20 active:scale-[0.99] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 whitespace-nowrap"
                >
                  {searching ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Checking...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>Track Status</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Error Message */}
            {searchError && (
              <div className="mt-5 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-rose-900">Record Not Found</p>
                  <p className="text-xs text-rose-700 mt-0.5">{searchError}</p>
                </div>
              </div>
            )}

            {/* Search Results Display */}
            {trackResult && (
              <div className="mt-8 p-6 sm:p-7 rounded-2xl bg-slate-50/70 border border-emerald-200/80 shadow-sm">
                {/* Result Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-200/80 gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Application Reference
                    </span>
                    <h4 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono mt-0.5">
                      {trackResult.application_number}
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 font-medium">
                      {trackResult.applicant_full_name || `${trackResult.first_name || ''} ${trackResult.last_name || ''}`.trim() || 'Applicant'} • <span className="text-emerald-800 font-semibold">{trackResult.nature_of_business || trackResult.business_name || 'Peddler'}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border bg-emerald-100 text-emerald-900 border-emerald-300">
                      {trackResult.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                {/* 5-Stage Stepper Progress */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3 text-xs">
                    <span className="font-bold text-slate-600 uppercase tracking-wider">
                      Municipal Clearance Stages
                    </span>
                    <span className="font-semibold text-emerald-800">
                      Stage {Math.min(trackResult.current_stage || 1, 5)} of 5
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-1.5 sm:gap-2 text-center">
                    {[
                      { num: 1, name: 'Admin' },
                      { num: 2, name: 'Inspector' },
                      { num: 3, name: 'Sanitary' },
                      { num: 4, name: 'Treasury' },
                      { num: 5, name: 'Release' },
                    ].map((step) => {
                      const isApproved = ['APPROVED', 'PERMIT_ISSUED', 'RELEASED'].includes((trackResult.status || '').toUpperCase());
                      const isCompleted = isApproved || (trackResult.current_stage > step.num);
                      const isCurrent = !isApproved && (trackResult.current_stage === step.num);

                      return (
                        <div
                          key={step.num}
                          className={`p-2.5 sm:p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                            isCompleted
                              ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                              : isCurrent
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-500 ring-2 ring-emerald-500/25 font-bold'
                              : 'bg-white text-slate-400 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-center">
                            {isCompleted ? (
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            ) : isCurrent ? (
                              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                            ) : (
                              <span className="text-[11px] font-mono">{step.num}</span>
                            )}
                          </div>
                          <span className="text-[11px] sm:text-xs font-semibold truncate max-w-full">
                            {step.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Remarks / Rejection notice if any */}
                {trackResult.rejection_reason && (
                  <div className="mt-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                    <strong className="font-bold">Action Required / Remarks:</strong> {trackResult.rejection_reason}
                  </div>
                )}

                {/* Details Grid */}
                <div className="mt-6 pt-5 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-white border border-slate-200/80 flex items-center gap-2.5">
                    <User className="w-4 h-4 text-emerald-700 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[11px] text-slate-500 block">Registrant</span>
                      <strong className="text-slate-900 font-medium truncate block">
                        {trackResult.applicant_full_name || `${trackResult.first_name || ''} ${trackResult.last_name || ''}`.trim() || 'N/A'}
                      </strong>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-slate-200/80 flex items-center gap-2.5">
                    <MapPin className="w-4 h-4 text-emerald-700 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[11px] text-slate-500 block">Location</span>
                      <strong className="text-slate-900 font-medium truncate block">
                        {trackResult.barangay ? `Brgy. ${trackResult.barangay}` : trackResult.business_address || 'La Carlota City'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Peddler ID & Action Footer */}
                <div className="mt-4 p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold font-mono text-xs shadow-xs">
                      ID
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Peddler ID</span>
                      <span className="text-slate-900 font-mono font-bold text-sm">
                        {trackResult.peddler_code || trackResult.peddler_id_code || 'Pending final release'}
                      </span>
                    </div>
                  </div>

                  <Link
                    to="/peddler-login"
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-900/10 transition-colors"
                  >
                    <span>Peddler Login</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. FOOTER WITH DISCREET MUNICIPAL STAFF LINK */}
      <footer className="bg-emerald-950 text-slate-300 border-t border-emerald-900/80 pt-10 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between pb-6 border-b border-emerald-900 gap-6">
            <div className="flex items-center gap-3">
              <img
                src={logo}
                alt="City of La Carlota Official Seal"
                className="w-10 h-10 rounded-full bg-white p-0.5 object-contain"
              />
              <div>
                <span className="text-base font-bold text-white font-serif">e-Peddlers</span>
                <p className="text-xs text-emerald-200/70">City Government of La Carlota, Negros Occidental</p>
              </div>
            </div>

          </div>

          {/* Bottom Bar with Discreet Staff Login */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
            <p>&copy; {new Date().getFullYear()} City Government of La Carlota. All rights reserved.</p>

            <Link
              to="/staff-login"
              className="inline-flex items-center gap-1.5 text-slate-600 hover:text-emerald-400 text-[11px] font-semibold transition-colors"
              title="Authorized Municipal Staff Only"
            >
              <Lock className="w-3 h-3" />
              <span>Official Staff Access</span>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}