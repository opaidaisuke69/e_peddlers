import React, { useState } from 'react';
import { X, QrCode, CheckCircle2, ShieldCheck, Zap, ArrowRight, Loader2 } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { paymentApi } from '../services/api';
import { useToast } from '../contexts/ToastContext';

export default function PayMongoModal({ isOpen, onClose, applicationId, amount, onPaymentSuccess }) {
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [qrData, setQrData] = useState(null);
  const { success, error } = useToast();

  if (!isOpen) return null;

  const initPayment = async () => {
    try {
      setLoading(true);
      const res = await paymentApi.createPayMongoQrPh(applicationId);
      if (res.success && res.data) {
        setQrData(res.data);
      }
    } catch (err) {
      error(err.message || 'Failed to initialize PayMongo QRPh payment.');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async () => {
    try {
      setSimulating(true);
      const res = await paymentApi.simulatePayMongoPayment(applicationId);
      if (res.success) {
        success('PayMongo QRPh payment submitted! Sent to City Treasury for review and approval.');
        if (onPaymentSuccess) onPaymentSuccess(res.data);
        onClose();
      }
    } catch (err) {
      error(err.message || 'Payment simulation failed.');
    } finally {
      setSimulating(false);
    }
  };

  // Trigger init on first mount if not loaded
  if (!qrData && !loading) {
    initPayment();
  }

  const qrImageUrl = qrData?.qr_code_data
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrData.qr_code_data)}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-800 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">PayMongo QRPh Checkout</h3>
              <p className="text-[11px] text-emerald-200 uppercase tracking-wider font-semibold">
                Test Mode • InstaPay / Maya / GCash
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 text-center">
          <div className="mb-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Payable Amount</p>
            <h2 className="text-3xl font-extrabold text-slate-900 mt-1">{formatCurrency(amount)}</h2>
          </div>

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              <p className="text-xs font-semibold">Generating PayMongo QRPh code...</p>
            </div>
          ) : qrImageUrl ? (
            <div className="flex flex-col items-center">
              <div className="p-3 bg-white rounded-2xl shadow-inner border-2 border-emerald-500/30 inline-block mb-3">
                <img src={qrImageUrl} alt="PayMongo QRPh" className="w-52 h-52 rounded-xl" />
              </div>

              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 mb-4">
                <ShieldCheck className="w-4 h-4" />
                <span>Standard Philippine QRPh Compliant</span>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 text-left w-full border border-slate-200 text-xs text-slate-600 mb-4">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Reference:</span>
                  <span className="font-mono font-semibold text-slate-800">{qrData?.reference}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Gateway Status:</span>
                  <span className="font-semibold text-emerald-600 uppercase text-[10px] bg-emerald-100 px-1.5 py-0.5 rounded">
                    Awaiting Payment (TEST)
                  </span>
                </div>
              </div>

              {/* Developer Test Mode Simulator Button */}
              <button
                onClick={handleSimulate}
                disabled={simulating}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all"
              >
                {simulating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying PayMongo Webhook...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-amber-300" />
                    <span>Simulate Payment in Test Mode</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          ) : (
            <p className="text-sm text-rose-600 py-6">Could not load QRPh code.</p>
          )}
        </div>
      </div>
    </div>
  );
}
