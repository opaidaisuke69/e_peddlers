import React, { useState, useEffect } from 'react';
import { ShieldCheck, Printer, Download, Eye, Calendar, MapPin, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { dashboardApi, workflowApi } from '../../services/api';
import { formatDate } from '../../utils/formatters';
import { useToast } from '../../contexts/ToastContext';

export default function PeddlerPermit() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { error } = useToast();

  const fetchPermit = async () => {
    try {
      setLoading(true);
      const res = await dashboardApi.getMetrics();
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      error(err.message || 'Failed to load verification proof.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermit();
  }, []);

  if (loading || !data) {
    return (
      <div className="py-20 flex justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-700" />
      </div>
    );
  }

  const p = data.peddler || {};
  const hasPermit = !!data.permit_number;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Peddler Permit Verification Proof</h1>
        <p className="text-xs font-semibold text-slate-500 mt-0.5">
          Official proof confirming that your peddler application and requirements have been verified and approved by the City Government of La Carlota.
        </p>
      </div>

      {!hasPermit ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-sm">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-900">No Released Verification Proof Available</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Your application is either pending review, inspection, or Treasury payment. Once your requirements and payment are verified by Admin, your verification proof will be available here for printing and downloading.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border-2 border-emerald-600/50 p-8 shadow-xl relative overflow-hidden">
          {/* Watermark */}
          <div className="absolute right-4 bottom-4 text-slate-100 font-serif font-black text-8xl pointer-events-none select-none opacity-40">
            VERIFIED
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-emerald-700" />
                <h2 className="text-xl font-extrabold text-emerald-950 font-serif">
                  PEDDLER PERMIT VERIFICATION PROOF
                </h2>
              </div>
              <p className="text-xs text-emerald-800 font-mono font-bold mt-1">
                VERIFICATION REF NO: {data.permit_number}
              </p>
            </div>

            <a
              href={workflowApi.getPermitViewUrl(p.id)}
              target="_blank"
              rel="noreferrer"
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Download Verification Proof</span>
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Verified Peddler</span>
              <p className="font-bold text-slate-900 text-sm mt-0.5">
                {p.first_name} {p.middle_name} {p.last_name}
              </p>
              <p className="font-mono text-emerald-700 text-[11px] font-bold">{data.peddler_code}</p>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Validity Period</span>
              <p className="font-bold text-slate-900 mt-0.5">
                {formatDate(data.valid_from)} • {formatDate(data.valid_until)}
              </p>
              <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                Verified &amp; In Good Standing
              </span>
            </div>

            <div className="md:col-span-2">
              <span className="text-[10px] uppercase font-bold text-slate-400">Nature of Vending Line</span>
              <p className="font-bold text-slate-800 mt-0.5">{data.business_name}</p>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Permitted Vending Zone</span>
              <p className="font-semibold text-slate-800 mt-0.5">
                {p.business_address || 'Designated Peddler Public Market & Plaza Zones'}
              </p>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Authorized Mobile Units</span>
              <p className="font-semibold text-slate-800 mt-0.5">
                {p.num_papag || 1} Papag / Lag-it
              </p>
            </div>
          </div>

          {/* Bottom Tiny Details Disclaimer */}
          <div className="mt-8 pt-4 border-t border-slate-200/80 text-center">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              VERIFICATION PROOF • NOT AN OFFICIAL BUSINESS PERMIT
            </p>
            <p className="text-[10px] text-slate-400 mt-1 max-w-xl mx-auto leading-relaxed">
              This document serves as verified digital proof of compliance and municipal approval. Official physical business permits are issued by the Business Permits &amp; Licensing Office (BPLO) at La Carlota City Hall.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
