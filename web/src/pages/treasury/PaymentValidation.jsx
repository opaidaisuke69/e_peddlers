import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Receipt,
  QrCode,
  DollarSign,
  Coins,
  RefreshCw,
  Loader2,
  FileText,
  AlertCircle,
  Eye,
  Check,
  ShieldCheck,
  ArrowRight,
  Clock,
  Landmark,
} from 'lucide-react';
import { applicationApi, paymentApi } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useToast } from '../../contexts/ToastContext';

export default function PaymentValidation() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [filterTab, setFilterTab] = useState('ALL'); // ALL, ONLINE, CASH
  const { success, error } = useToast();

  // Cash Payment Form
  const [showCashModal, setShowCashModal] = useState(false);
  const [orNumber, setOrNumber] = useState('');
  const [amountReceived, setAmountReceived] = useState('');
  const [remarks, setRemarks] = useState('');

  // Online Payment Review Modal
  const [showOnlineModal, setShowOnlineModal] = useState(false);
  const [onlineOrNumber, setOnlineOrNumber] = useState('');
  const [onlineRemarks, setOnlineRemarks] = useState('');

  // Rejection Form
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const res = await applicationApi.list({
        status: 'PENDING_TREASURY_PAYMENT',
        per_page: 50,
      });
      if (res.success && res.data) {
        setApplications(res.data);
      }
    } catch (err) {
      error(err.message || 'Failed to load pending payments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  // Filter calculations
  const onlineApplications = applications.filter(
    (app) => app.payment_method === 'PAYMONGO_QRPH' && Number(app.amount_paid) > 0
  );
  const cashApplications = applications.filter(
    (app) => !(app.payment_method === 'PAYMONGO_QRPH' && Number(app.amount_paid) > 0)
  );

  const displayedApplications = applications.filter((app) => {
    if (filterTab === 'ONLINE') {
      return app.payment_method === 'PAYMONGO_QRPH' && Number(app.amount_paid) > 0;
    }
    if (filterTab === 'CASH') {
      return !(app.payment_method === 'PAYMONGO_QRPH' && Number(app.amount_paid) > 0);
    }
    return true;
  });

  const handleOpenCashModal = (app) => {
    setSelectedApp(app);
    setShowCashModal(true);
    setShowOnlineModal(false);
    setShowRejectModal(false);
    setAmountReceived(app.total_amount);
    setOrNumber(`OR-LC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setRemarks('Cash payment received at City Treasury');
  };

  const handleOpenOnlineModal = (app) => {
    setSelectedApp(app);
    setShowOnlineModal(true);
    setShowCashModal(false);
    setShowRejectModal(false);
    setOnlineOrNumber(`OR-LC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setOnlineRemarks('Online PayMongo QRPh payment verified against Treasury electronic transaction logs.');
  };

  const handleConfirmCashPayment = async (e) => {
    e.preventDefault();
    if (!selectedApp) return;

    try {
      setActionLoading(true);
      const res = await paymentApi.recordCashPayment(selectedApp.id, {
        amount_received: Number(amountReceived),
        or_number: orNumber.trim(),
        remarks: remarks.trim(),
      });
      if (res.success) {
        success(`Cash payment verified! Official Receipt #${res.data.or_number} issued. Application forwarded to Admin for permit release.`);
        setShowCashModal(false);
        setSelectedApp(null);
        fetchApplications();
      }
    } catch (err) {
      error(err.message || 'Failed to record cash payment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveOnlinePayment = async (e) => {
    e.preventDefault();
    if (!selectedApp) return;

    try {
      setActionLoading(true);
      const res = await paymentApi.verifyOnlinePayment(selectedApp.id, {
        or_number: onlineOrNumber.trim(),
        remarks: onlineRemarks.trim(),
      });
      if (res.success) {
        success(`Online payment approved! Official Receipt #${res.data.or_number} issued. Application sent to Admin for final permit release.`);
        setShowOnlineModal(false);
        setSelectedApp(null);
        fetchApplications();
      }
    } catch (err) {
      error(err.message || 'Failed to approve online payment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectPayment = async (e) => {
    e.preventDefault();
    if (!selectedApp || !rejectReason.trim()) {
      error('Please enter a rejection explanation.');
      return;
    }

    try {
      setActionLoading(true);
      const res = await paymentApi.rejectPayment(selectedApp.id, {
        reason: rejectReason.trim(),
      });
      if (res.success) {
        success('Payment rejected and applicant notified.');
        setShowRejectModal(false);
        setSelectedApp(null);
        fetchApplications();
      }
    } catch (err) {
      error(err.message || 'Failed to reject payment.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Permit Payment Assessment &amp; Review</h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Stage 4: Review fee payments, validate PayMongo QRPh online settlements, issue Official Receipts, and authorize forwarding to Admin for Permit Release.
          </p>
        </div>
        <button
          onClick={fetchApplications}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs cursor-pointer transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Online Payments Notification Banner if any */}
      {onlineApplications.length > 0 && (
        <div className="p-4 rounded-3xl bg-indigo-50 border border-indigo-200/80 text-indigo-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-100 text-indigo-700 mt-0.5 shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-indigo-950">
                {onlineApplications.length} Online Payment(s) Awaiting Treasury Approval
              </h3>
              <p className="text-xs text-indigo-800 mt-0.5 leading-relaxed">
                Peddlers have paid their permit fees online via PayMongo QRPh (GCash/Maya). City Treasury review and official receipt validation is required before sending to Admin for permit issuance.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFilterTab('ONLINE')}
            className="px-4 py-2 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all shrink-0"
          >
            <span>Review Online Payments &rarr;</span>
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 text-xs font-bold">
        <button
          type="button"
          onClick={() => setFilterTab('ALL')}
          className={`px-3.5 py-1.5 rounded-xl border transition-colors cursor-pointer ${
            filterTab === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Queue ({applications.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterTab('ONLINE')}
          className={`px-3.5 py-1.5 rounded-xl border transition-colors cursor-pointer flex items-center gap-1.5 ${
            filterTab === 'ONLINE'
              ? 'bg-indigo-700 text-white border-indigo-700'
              : 'bg-white text-indigo-800 border-slate-200 hover:bg-indigo-50'
          }`}
        >
          <QrCode className="w-3.5 h-3.5" />
          <span>Online Paid (Review Required)</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-800 font-mono font-bold">
            {onlineApplications.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setFilterTab('CASH')}
          className={`px-3.5 py-1.5 rounded-xl border transition-colors cursor-pointer flex items-center gap-1.5 ${
            filterTab === 'CASH'
              ? 'bg-emerald-700 text-white border-emerald-700'
              : 'bg-white text-emerald-800 border-slate-200 hover:bg-emerald-50'
          }`}
        >
          <Coins className="w-3.5 h-3.5" />
          <span>Walk-in / Cash Payments</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-mono font-bold">
            {cashApplications.length}
          </span>
        </button>
      </div>

      {/* Applications List */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-700" />
            <p className="text-xs font-semibold">Loading Treasury payment queue...</p>
          </div>
        ) : displayedApplications.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl m-6">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2 opacity-80" />
            <h3 className="font-extrabold text-slate-800 text-sm">Payment Queue Clear</h3>
            <p className="mt-1 text-slate-500">
              {filterTab === 'ONLINE'
                ? 'No online payments awaiting Treasury review.'
                : 'All permit fee assessments have been verified and processed.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200">
                  <th className="py-3 px-4">Application ID</th>
                  <th className="py-3 px-4">Peddler ID &amp; Name</th>
                  <th className="py-3 px-4">Business Nature</th>
                  <th className="py-3 px-4">Declared Units</th>
                  <th className="py-3 px-4">Assessment Due</th>
                  <th className="py-3 px-4">Payment Channel &amp; Status</th>
                  <th className="py-3 px-4 text-right">Treasury Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedApplications.map((app) => {
                  const isOnlinePaid =
                    app.payment_method === 'PAYMONGO_QRPH' && Number(app.amount_paid) > 0;

                  return (
                    <tr
                      key={app.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        isOnlinePaid ? 'bg-indigo-50/20' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {app.application_number}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{app.applicant_full_name}</div>
                        <span className="font-mono text-[10px] text-emerald-700 font-semibold">
                          {app.peddler_code}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">{app.nature_of_business}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {Number(app.num_papag || 0) + Number(app.num_lag_it || 0)} Papag / Lag-it
                      </td>
                      <td className="py-3.5 px-4 font-mono font-extrabold text-slate-900 text-sm">
                        {formatCurrency(app.total_amount)}
                      </td>
                      <td className="py-3.5 px-4">
                        {isOnlinePaid ? (
                          <div className="space-y-1">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-100 text-indigo-800 border border-indigo-200 inline-flex items-center gap-1">
                              <QrCode className="w-3 h-3 text-indigo-600" />
                              <span>PayMongo QRPh</span>
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-700">
                              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                              <span>Paid Online (₱{Number(app.amount_paid).toFixed(2)}) &bull; Review Required</span>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1">
                              <Coins className="w-3 h-3 text-slate-500" />
                              <span>Treasury Cash</span>
                            </span>
                            <span className="text-[10px] text-slate-400 block font-medium">
                              Awaiting counter settlement
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedApp(app);
                              setShowRejectModal(true);
                              setShowOnlineModal(false);
                              setShowCashModal(false);
                            }}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                          >
                            Reject
                          </button>

                          {isOnlinePaid ? (
                            <button
                              type="button"
                              onClick={() => handleOpenOnlineModal(app)}
                              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer transition-all"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-sky-200" />
                              <span>Review &amp; Approve Online Payment</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenCashModal(app)}
                              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer transition-all"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>Record &amp; Verify Cash</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Online Payment Review & Approval Modal */}
      {showOnlineModal && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-8">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    Review &amp; Approve Online Payment
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {selectedApp.application_number} &bull; {selectedApp.applicant_full_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowOnlineModal(false);
                  setSelectedApp(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                &times;
              </button>
            </div>

            {/* Online Payment Verification Summary Box */}
            <div className="mb-4 p-4 bg-indigo-50/70 rounded-2xl border border-indigo-200 text-xs space-y-2">
              <div className="flex justify-between items-center pb-2 border-b border-indigo-200/60">
                <span className="text-indigo-900 font-semibold">Payment Channel:</span>
                <span className="font-bold text-indigo-950 font-mono bg-white px-2 py-0.5 rounded border border-indigo-200">
                  PayMongo QRPh (GCash / Maya)
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-indigo-200/60">
                <span className="text-indigo-900 font-semibold">Amount Captured Online:</span>
                <span className="text-base font-black text-emerald-700 font-mono">
                  {formatCurrency(selectedApp.amount_paid || selectedApp.total_amount)}
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-indigo-800">
                <span>Verification State:</span>
                <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                  Electronic Payment Confirmed
                </span>
              </div>
            </div>

            {/* Approval Notice */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 mb-4 flex items-start gap-2">
              <Landmark className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Approving this payment will issue the <strong>Official Receipt (OR)</strong> and forward the application to the <strong>Admin (Stage 5)</strong> for Official Peddler Permit Release.
              </p>
            </div>

            {/* Treasury Official Receipt Form */}
            <form onSubmit={handleApproveOnlinePayment} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Official Receipt (OR) Number
                </label>
                <input
                  type="text"
                  required
                  value={onlineOrNumber}
                  onChange={(e) => setOnlineOrNumber(e.target.value)}
                  placeholder="OR-LC-2026-XXXX"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Treasury Officer Validation Remarks
                </label>
                <input
                  type="text"
                  value={onlineRemarks}
                  onChange={(e) => setOnlineRemarks(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowOnlineModal(false);
                    setSelectedApp(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  {actionLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>Approve Payment &amp; Send to Admin for Release &rarr;</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cash Payment Modal */}
      {showCashModal && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Treasury Cash Official Receipt Verification</h3>
                <p className="text-xs text-slate-500 font-mono">{selectedApp.application_number} &bull; {selectedApp.applicant_full_name}</p>
              </div>
              <button
                onClick={() => {
                  setShowCashModal(false);
                  setSelectedApp(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                &times;
              </button>
            </div>

            <div className="mb-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
              <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200">
                <span className="text-slate-500">Statutory Assessment Total:</span>
                <span className="text-base font-extrabold text-emerald-700 font-mono">
                  {formatCurrency(selectedApp.total_amount)}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Includes Mayor's Permit, Sanitary Permit, Health Certificate, Occupational Tax ({selectedApp.num_papag + selectedApp.num_lag_it} units), Garbage Fee, Barangay Clearance, and Peddlers Tax.
              </p>
            </div>

            <form onSubmit={handleConfirmCashPayment} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Official Receipt (OR) Number
                </label>
                <input
                  type="text"
                  required
                  value={orNumber}
                  onChange={(e) => setOrNumber(e.target.value)}
                  placeholder="OR-LC-2026-XXXX"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Amount Received (PHP)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-emerald-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Treasury Officer Remarks
                </label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowCashModal(false);
                    setSelectedApp(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Verify Cash &amp; Send to Admin</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Reject Payment Assessment</h3>
            <p className="text-xs text-slate-500 mb-4 font-mono">{selectedApp.application_number}</p>

            <form onSubmit={handleRejectPayment} className="space-y-4">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for payment rejection (e.g. Discrepancy in unit declaration, invalid deposit)..."
                rows={3}
                required
                className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-500/20"
              />

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedApp(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm cursor-pointer"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
