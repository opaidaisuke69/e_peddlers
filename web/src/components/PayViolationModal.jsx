import React, { useState, useEffect } from 'react';
import {
  X,
  QrCode,
  ShieldCheck,
  Zap,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Printer,
  Receipt,
  AlertTriangle,
  Landmark,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';
import { violationApi } from '../services/api';
import { useToast } from '../contexts/ToastContext';

export default function PayViolationModal({ isOpen, onClose, violation, onPaymentSuccess }) {
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [receiptData, setReceiptData] = useState(null);
  const { success, error } = useToast();

  useEffect(() => {
    if (isOpen && violation) {
      if (violation.status === 'PAID') {
        // Show receipt view directly for settled violation
        setReceiptData({
          receipt_number: violation.receipt_number || 'VIOL-REC-OFFICIAL',
          violation_number: violation.violation_number,
          violation_name: violation.violation_name,
          peddler_code: violation.peddler_code,
          peddler_name: violation.first_name ? `${violation.first_name} ${violation.last_name}` : 'Registered Peddler',
          amount_paid: violation.penalty_amount,
          payment_method: violation.settled_payment_method || 'ONLINE',
          paid_at: violation.payment_date || violation.resolved_at || new Date().toISOString(),
        });
      } else {
        setReceiptData(null);
        initPayment();
      }
    } else {
      setQrData(null);
      setReceiptData(null);
    }
  }, [isOpen, violation]);

  if (!isOpen || !violation) return null;

  const initPayment = async () => {
    try {
      setLoading(true);
      const res = await violationApi.createPayMongoQrPh(violation.id);
      if (res.success && res.data) {
        setQrData(res.data);
      }
    } catch (err) {
      error(err.message || 'Failed to initialize PayMongo QRPh payment.');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatePayment = async () => {
    try {
      setSimulating(true);
      const res = await violationApi.simulatePayMongo(violation.id);
      if (res.success && res.data) {
        success('Violation penalty paid and verified successfully!');
        setReceiptData(res.data);
        if (onPaymentSuccess) {
          onPaymentSuccess(res.data);
        }
      }
    } catch (err) {
      error(err.message || 'Payment simulation failed.');
    } finally {
      setSimulating(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const qrImageUrl = qrData?.qr_code_data
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrData.qr_code_data)}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 my-8">
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
              {receiptData ? (
                <Receipt className="w-4 h-4 text-emerald-300" />
              ) : (
                <QrCode className="w-4 h-4 text-emerald-300" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight text-white font-serif">
                {receiptData ? 'Official Violation Settlement Receipt' : 'Pay Violation Online'}
              </h3>
              <p className="text-[10px] text-emerald-200 uppercase tracking-wider font-semibold font-mono">
                {receiptData ? 'Electronic Official Receipt (OR)' : 'PayMongo QRPh • GCash / Maya / Bank'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {receiptData ? (
            /* OFFICIAL RECEIPT VIEW */
            <div className="space-y-5 print:p-0">
              {/* Seal & City Header */}
              <div className="text-center border-b border-slate-200 pb-4">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-2 border border-emerald-300">
                  <Landmark className="w-5 h-5" />
                </div>
                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
                  Republic of the Philippines
                </p>
                <h4 className="text-sm font-black text-slate-900 font-serif">
                  City Government of La Carlota
                </h4>
                <p className="text-[11px] font-semibold text-emerald-800">
                  Office of the City Treasurer &bull; Revenue Assessment
                </p>
                <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[11px] font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>PENALTY SETTLED &bull; PAID ONLINE</span>
                </div>
              </div>

              {/* Receipt Details Box */}
              <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4 space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Official Receipt No:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{receiptData.receipt_number}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Violation Reference:</span>
                  <span className="font-mono font-bold text-slate-800">{receiptData.violation_number}</span>
                </div>
                <div className="flex justify-between items-start py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Violation Nature:</span>
                  <span className="font-bold text-slate-800 text-right max-w-xs">{receiptData.violation_name}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Peddler ID &amp; Name:</span>
                  <span className="font-semibold text-slate-800 text-right">
                    {receiptData.peddler_code || violation.peddler_code} &bull; {receiptData.peddler_name || (violation.first_name ? `${violation.first_name} ${violation.last_name}` : 'Peddler')}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Payment Channel:</span>
                  <span className="font-bold text-emerald-800 uppercase text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {receiptData.payment_method === 'CASH' ? 'Treasury Cashier' : 'Online (PayMongo QRPh)'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Date &amp; Time Settled:</span>
                  <span className="font-mono text-slate-700">{formatDate(receiptData.paid_at, true)}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm font-bold text-slate-800">Total Penalty Paid:</span>
                  <span className="text-lg font-black font-mono text-emerald-700">
                    {formatCurrency(receiptData.amount_paid)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 print:hidden">
                <button
                  type="button"
                  onClick={handlePrintReceipt}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Done</span>
                </button>
              </div>
            </div>
          ) : (
            /* PAYMENT CHECKOUT VIEW */
            <div className="space-y-4 text-center">
              {/* Violation Info Card */}
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 text-left text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-rose-950 text-xs">{violation.violation_number}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-200/80 text-rose-900 uppercase">
                    Unsettled Penalty
                  </span>
                </div>
                <p className="font-bold text-slate-900 text-sm">{violation.violation_name}</p>
                <p className="text-slate-600 text-[11px] leading-relaxed pt-0.5">{violation.description}</p>
              </div>

              {/* Amount */}
              <div className="py-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Payable Penalty Fee
                </span>
                <span className="text-3xl font-black text-rose-700 font-mono">
                  {formatCurrency(violation.penalty_amount)}
                </span>
              </div>

              {/* QRPh Loading or Display */}
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
                  <p className="text-xs font-semibold">Generating PayMongo QRPh code...</p>
                </div>
              ) : qrImageUrl ? (
                <div className="flex flex-col items-center space-y-3">
                  <div className="p-3 bg-white rounded-2xl shadow-inner border-2 border-emerald-500/30 inline-block">
                    <img src={qrImageUrl} alt="PayMongo QRPh" className="w-48 h-48 rounded-xl" />
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Philippine Standard QRPh (InstaPay / GCash / Maya)</span>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 text-left w-full border border-slate-200 text-xs text-slate-600 space-y-1">
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-400">Reference:</span>
                      <span className="font-mono font-bold text-slate-800">{qrData?.reference}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-400">Payment Status:</span>
                      <span className="font-bold text-amber-700 uppercase text-[10px] bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">
                        Awaiting Online Payment
                      </span>
                    </div>
                  </div>

                  {/* Simulator button for test / website demo */}
                  <button
                    type="button"
                    onClick={handleSimulatePayment}
                    disabled={simulating}
                    className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {simulating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying Online Payment...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 text-amber-300" />
                        <span>Complete Online Payment (Simulate Test Mode)</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="py-6 text-xs text-rose-600">
                  <p>Could not generate QRPh code. Please check your network connection.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
