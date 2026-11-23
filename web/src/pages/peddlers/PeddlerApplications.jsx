import React, { useState, useEffect } from 'react';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
  Coins,
  QrCode,
  Upload,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import ApplicationTimeline from '../../components/ApplicationTimeline';
import PayMongoModal from '../../components/PayMongoModal';
import { applicationApi } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useToast } from '../../contexts/ToastContext';

export default function PeddlerApplications() {
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payMongoApp, setPayMongoApp] = useState(null);

  // Resubmission state
  const [resubmitting, setResubmitting] = useState(false);
  const [resubmitRemarks, setResubmitRemarks] = useState('');
  const [resubmitDocs, setResubmitDocs] = useState([]);

  const { success, error } = useToast();

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const res = await applicationApi.list({ per_page: 20 });
      if (res.success && res.data) {
        setApplications(res.data);
        if (res.data.length > 0 && !selectedApp) {
          fetchAppDetails(res.data[0].id);
        }
      }
    } catch (err) {
      error(err.message || 'Failed to fetch applications.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAppDetails = async (id) => {
    try {
      const res = await applicationApi.get(id);
      if (res.success && res.data) {
        setSelectedApp(res.data);
      }
    } catch (err) {
      error(err.message || 'Failed to load details.');
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleResubmit = async (e) => {
    e.preventDefault();
    if (!selectedApp) return;

    try {
      setResubmitting(true);
      const res = await applicationApi.resubmit(selectedApp.id, {
        resubmission_remarks: resubmitRemarks.trim(),
        documents: resubmitDocs,
      });
      if (res.success) {
        success('Application resubmitted successfully! It has been returned to the reviewing officer.');
        setResubmitRemarks('');
        setResubmitDocs([]);
        fetchAppDetails(selectedApp.id);
        fetchApplications();
      }
    } catch (err) {
      error(err.message || 'Resubmission failed.');
    } finally {
      setResubmitting(false);
    }
  };

  const handleUploadNewDoc = async (file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', 'corrected_compliance_doc');

    try {
      const res = await applicationApi.uploadDocument(formData);
      if (res.success && res.data) {
        setResubmitDocs([...resubmitDocs, res.data]);
        success('Corrected document attached.');
      }
    } catch (err) {
      error(err.message || 'File upload failed.');
    }
  };

  const isRejected = selectedApp?.status?.includes('REJECTED');
  const isAwaitingPayment = selectedApp?.status === 'PENDING_TREASURY_PAYMENT';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Permit Application History</h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Monitor real-time approval status, inspection remarks, payment processing, and permit releases.
          </p>
        </div>
        <button
          onClick={fetchApplications}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Applications List */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-sm space-y-3 h-fit">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-2">Your Applications</h3>

          {loading ? (
            <div className="py-8 flex justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-700" />
            </div>
          ) : applications.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">No applications submitted yet.</p>
          ) : (
            applications.map((app) => (
              <div
                key={app.id}
                onClick={() => fetchAppDetails(app.id)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  selectedApp?.id === app.id
                    ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-xs text-emerald-950">{app.application_number}</span>
                  <StatusBadge status={app.status} />
                </div>
                <p className="text-xs font-semibold text-slate-800 line-clamp-1">{app.nature_of_business}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                  <span>{formatDate(app.date_of_application)}</span>
                  <span className="font-bold text-emerald-700">{formatCurrency(app.total_amount)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right: Selected Application Details & Interactive Actions */}
        <div className="lg:col-span-2 space-y-6">
          {selectedApp ? (
            <>
              {/* Timeline */}
              <ApplicationTimeline
                status={selectedApp.status}
                currentStage={selectedApp.current_stage}
                timeline={selectedApp.timeline || []}
              />

              {/* Online Payment Callout if Awaiting Payment */}
              {isAwaitingPayment && (
                selectedApp.payment_method === 'PAYMONGO_QRPH' && Number(selectedApp.amount_paid) > 0 ? (
                  <div className="bg-gradient-to-r from-blue-900 to-indigo-800 rounded-3xl p-6 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-2xl bg-white/10 text-sky-200 mt-0.5 shrink-0">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-sky-400/20 text-sky-200 font-mono">
                            Online Payment Received
                          </span>
                          <span className="text-xs font-mono font-bold text-amber-300">
                            {formatCurrency(selectedApp.amount_paid || selectedApp.total_amount)}
                          </span>
                        </div>
                        <h3 className="text-base font-bold mt-1">Awaiting City Treasury Review &amp; Approval</h3>
                        <p className="text-xs text-sky-200 mt-0.5 max-w-xl leading-relaxed">
                          Your online payment via PayMongo QRPh has been submitted and is currently being validated by City Treasury personnel. Once approved, your application will be forwarded to the City Admin for permit release.
                        </p>
                      </div>
                    </div>
                    <div className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-xs font-bold text-sky-100 flex items-center gap-2 shrink-0">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      <span>Stage 4: Treasury Review</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-emerald-800 to-teal-700 rounded-3xl p-6 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold">Sanitary Inspection Approved!</h3>
                      <p className="text-xs text-emerald-100 mt-1">
                        Your permit fee assessment is <strong>{formatCurrency(selectedApp.total_amount)}</strong>. You can pay online via PayMongo QRPh or in cash at the City Treasury.
                      </p>
                    </div>
                    <button
                      onClick={() => setPayMongoApp(selectedApp)}
                      className="px-5 py-2.5 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 font-bold text-xs shadow-md flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer"
                    >
                      <QrCode className="w-4 h-4 text-emerald-700" />
                      <span>Pay with PayMongo QRPh</span>
                    </button>
                  </div>
                )
              )}

              {/* Rejection / Resubmission Box */}
              {isRejected && (
                <div className="bg-white rounded-3xl border border-rose-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-bold text-rose-900">Application Returned for Corrections</h3>
                      <p className="text-xs text-rose-700 mt-0.5">{selectedApp.rejection_reason}</p>
                    </div>
                  </div>

                  <form onSubmit={handleResubmit} className="pt-3 border-t border-rose-100 space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Correction Notes / Resubmission Remarks
                      </label>
                      <textarea
                        value={resubmitRemarks}
                        onChange={(e) => setResubmitRemarks(e.target.value)}
                        placeholder="Explain how you addressed the issue..."
                        rows={2}
                        required
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Attach Corrected Document (Price Tag, Clearance, Photo)
                      </label>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => handleUploadNewDoc(e.target.files[0])}
                        className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white cursor-pointer"
                      />
                      {resubmitDocs.length > 0 && (
                        <p className="text-[11px] text-emerald-600 mt-1 font-semibold">
                          {resubmitDocs.length} corrected document(s) attached.
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={resubmitting}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
                    >
                      {resubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      <span>Resubmit Application</span>
                    </button>
                  </form>
                </div>
              )}

              {/* Summary Details */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Application Summary</h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 uppercase text-[10px] font-bold">Vending Line</span>
                    <p className="font-bold text-slate-900 mt-0.5">{selectedApp.nature_of_business}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[10px] font-bold">Location</span>
                    <p className="font-bold text-slate-900 mt-0.5">{selectedApp.business_address}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[10px] font-bold">Units</span>
                    <p className="font-bold text-slate-900 mt-0.5">
                      {(Number(selectedApp.num_papag || 0) + Number(selectedApp.num_lag_it || 0))} Papag / Lag-it
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[10px] font-bold">Total Fees</span>
                    <p className="font-bold text-emerald-700 font-mono mt-0.5">
                      {formatCurrency(selectedApp.total_amount)}
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center text-slate-400 text-xs">
              Select an application on the left to view tracking.
            </div>
          )}
        </div>
      </div>

      {/* PayMongo QRPh Modal */}
      {payMongoApp && (
        <PayMongoModal
          isOpen={true}
          onClose={() => setPayMongoApp(null)}
          applicationId={payMongoApp.id}
          amount={payMongoApp.total_amount}
          onPaymentSuccess={() => {
            fetchAppDetails(payMongoApp.id);
            fetchApplications();
          }}
        />
      )}
    </div>
  );
}
