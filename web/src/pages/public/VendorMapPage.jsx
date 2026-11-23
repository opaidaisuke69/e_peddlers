import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, UserCheck, ShieldCheck } from 'lucide-react';
import VendorMap from '../../components/VendorMap';
import logo from '../../assets/logo.png';

export default function VendorMapPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-emerald-100 shadow-xs">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 h-15 sm:h-18 flex items-center justify-between gap-1.5 sm:gap-4">
          {/* Left: Back button + Logo + Branding */}
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
            <Link
              to="/"
              className="inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold shrink-0 transition-colors"
              title="Back to Home"
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Back</span>
            </Link>

            <Link to="/" className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 group">
              <img
                src={logo}
                alt="City Seal"
                className="w-8 h-8 sm:w-11 sm:h-11 rounded-full object-contain shadow-xs shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <span className="text-sm sm:text-lg font-black text-emerald-950 font-serif tracking-tight whitespace-nowrap shrink-0">
                    e&#8209;Peddlers
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider shrink-0 whitespace-nowrap">
                    Vendor Map
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium hidden sm:block truncate whitespace-nowrap">
                  City of La Carlota • Saturday Market Area
                </p>
              </div>
            </Link>
          </div>

          {/* Right: Apply Button */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Link
              to="/apply-online"
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 active:scale-95 transition-all whitespace-nowrap shrink-0"
            >
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Apply for Permit</span>
              <span className="sm:hidden whitespace-nowrap">Apply</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Vendor Map Canvas Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2 sm:p-4 lg:p-8">
        <VendorMap />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} City Government of La Carlota • Saturday Market Vendor Regulatory System
      </footer>
    </div>
  );
}
