import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Coins,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Lock,
  Award,
  MapPin,
  Clock,
  User,
} from 'lucide-react';
import SignaturePad from '../../components/SignaturePad';
import { applicationApi } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';

export default function RenewalPermit() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error } = useToast();

  const [permitInfo, setPermitInfo] = useState(null);
  const [loadingPermit, setLoadingPermit] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Editable renewal form
  const [form, setForm] = useState(null);

  const fetchRenewalData = async () => {
    try {
      setLoadingPermit(true);
      const res = await applicationApi.getRenewalInfo();
      if (res.success && res.data) {
        const d = res.data;
        setPermitInfo(d);

        if (d.can_renew) {
          setForm({
            application_type: 'Renewal',
            peddler_id: d.peddler_id,
            existing_peddler_code: d.peddler_code,
            previous_permit_number: d.permit_number,
            is_late_renewal: d.is_late_renewal,
            gender: d.gender || 'Male',
            civil_status: d.civil_status || 'Single',
            ctc_number: d.ctc_number || '',
            first_name: d.first_name,
            middle_name: d.middle_name || '',
            last_name: d.last_name,
            residential_address: d.residential_address,
            residential_barangay: d.residential_barangay,
            residential_city: d.residential_city || 'La Carlota City',
            email: d.email,
            phone: d.phone,
            nature_of_business: d.business_nature,
            business_type: d.business_type || 'Peddlers',
            num_employees: d.num_employees || 0,
            business_address: d.business_address,
            business_barangay: d.business_barangay,
            business_city: d.business_city || 'La Carlota City',
            num_papag: d.num_papag || 1,
            num_lag_it: d.num_lag_it || 0,
            emergency_contact_person: d.emergency_contact_person || '',
            emergency_contact_phone: d.emergency_contact_phone || '',
            agreed_to_terms: true,
            signature_data: null,
            documents: [],
          });
        } else {
          setForm(null);
        }
      }
    } catch (err) {
      error(err.message || 'Failed to retrieve peddler permit record.');
      setPermitInfo(null);
      setForm(null);
    } finally {
      setLoadingPermit(false);
    }
  };

  useEffect(() => {
    fetchRenewalData();
  }, []);

  const handleDocumentUpload = async (docType, file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', docType);

    try {
      const res = await applicationApi.uploadDocument(formData);
      if (res.success && res.data) {
        setForm((prev) => ({
          ...prev,
          documents: [
            ...prev.documents.filter((d) => d.document_type !== docType),
            res.data,
          ],
        }));
        success(`${docType.replace(/_/g, ' ')} uploaded.`);
      }
    } catch (err) {
      error(err.message || 'Upload failed.');
    }
  };

  const handleSubmitRenewal = async (e) => {
    e.preventDefault();
    if (!form.signature_data) {
      error('Please sign the renewal form.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await applicationApi.create({
        ...form,
        num_papag: Number(form.num_papag),
        num_lag_it: Number(form.num_lag_it),
        num_employees: Number(form.num_employees),
      });

      if (res.success) {
        success(`Renewal Application ${res.data.application_number} submitted!`);
        navigate('/peddler/applications');
      }
    } catch (err) {
      error(err.message || 'Renewal submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const isExpired = permitInfo?.is_expired;
  const canRenew = permitInfo?.can_renew;
  const permitStatus = permitInfo?.permit_status?.toLowerCase();

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Annual Permit Renewal</h1>
        <p className="text-xs font-semibold text-slate-500 mt-0.5">
          Annual peddler permit verification and renewal for accredited ambulant peddlers in La Carlota City.
        </p>
      </div>

      {/* Municipal Renewal Ordinance Guide */}
      <div className="p-4 rounded-3xl bg-emerald-50/80 border border-emerald-200/80 text-xs text-emerald-950 space-y-2 shadow-xs">
        <div className="flex items-center gap-2 font-bold text-emerald-900">
          <Calendar className="w-4 h-4 text-emerald-700" />
          <span>City Government of La Carlota &bull; Permit Validity &amp; Renewal Ordinance</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11px]">
          <div className="p-2.5 rounded-xl bg-white/90 border border-emerald-200/60">
            <span className="font-bold text-slate-900 block">Annual Validity</span>
            <span className="text-slate-600">Jan 1 to Dec 31. All permits expire on December 31 of each year.</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white/90 border border-emerald-200/60">
            <span className="font-bold text-slate-900 block">Renewal Eligibility</span>
            <span className="text-slate-600">Renewal begins Jan 1. You can renew if your permit is expired and not yet renewed.</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white/90 border border-emerald-200/60">
            <span className="font-bold text-slate-900 block">Late Penalty (1 Month)</span>
            <span className="text-slate-600">₱200 penalty applies if renewal is submitted after January 31.</span>
          </div>
        </div>
      </div>

      {/* Permit Display Card */}
      {loadingPermit ? (
        <div className="py-16 bg-white rounded-3xl border border-slate-200/80 p-8 flex flex-col items-center justify-center gap-2 text-slate-400 shadow-sm">
          <Loader2 className="w-7 h-7 animate-spin text-emerald-700" />
          <p className="text-xs font-semibold">Loading your registered permit details...</p>
        </div>
      ) : permitInfo?.has_permit ? (
        <div className="space-y-6">
          {/* Official Registered Permit Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                  <Award className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-300">
                      Registered Peddler Permit
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-300">
                      {permitInfo.peddler_code}
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-white font-mono mt-0.5">
                    {permitInfo.permit_number}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    permitStatus === 'active'
                      ? 'bg-emerald-500 text-emerald-950 shadow-md shadow-emerald-500/20'
                      : 'bg-amber-400 text-amber-950 shadow-md shadow-amber-400/20'
                  }`}
                >
                  {permitStatus === 'active' ? 'ACTIVE PERMIT' : 'PERMIT EXPIRED'}
                </span>
              </div>
            </div>

            {/* Permit Details Grid */}
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Registrant Name</span>
                <p className="font-bold text-slate-800 text-sm mt-0.5">
                  {permitInfo.first_name} {permitInfo.middle_name} {permitInfo.last_name}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Vending Nature</span>
                <p className="font-semibold text-slate-800 mt-0.5">{permitInfo.business_nature}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Designated Stall / Slot</span>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {permitInfo.assigned_slot ? `Slot ${permitInfo.assigned_slot}` : 'Ambulant Peddler'}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Validity Period</span>
                <p className="font-semibold text-slate-800 mt-0.5 font-mono">
                  {formatDate(permitInfo.valid_from)} &rarr; {formatDate(permitInfo.valid_until)}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Declared Units</span>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {permitInfo.num_papag || 1} Papag / Lag-it
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Annual Expiration</span>
                <p className="font-bold text-slate-800 mt-0.5">
                  December 31, {permitInfo.valid_until ? new Date(permitInfo.valid_until).getFullYear() : '2026'}
                </p>
              </div>
            </div>
          </div>

          {/* RENEWAL STATUS BANNER */}
          {!canRenew ? (
            /* ACTIVE / LOCKED STATE */
            <div className="p-5 rounded-3xl bg-amber-50/80 border border-amber-200/90 text-amber-950 shadow-xs space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-2xl bg-amber-100 text-amber-700 mt-0.5 shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-amber-900">
                    Annual Renewal Unavailable &bull; Permit Is Currently Active
                  </h3>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    {permitInfo.renewal_eligibility_message ||
                      `Your peddler permit (${permitInfo.permit_number}) is currently ACTIVE and valid until December 31, 2026. Permit renewal begins on January 1, 2027 after your permit has expired.`}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-amber-200/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-1.5 text-amber-800 font-medium">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Renewal Window: January 1 &ndash; January 31, 2027</span>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to="/peddler/permit"
                    className="px-3.5 py-1.5 rounded-xl bg-white text-emerald-800 font-bold border border-emerald-200 hover:bg-emerald-50 transition-colors shadow-xs"
                  >
                    View Official Permit Proof &rarr;
                  </Link>
                  <button
                    type="button"
                    disabled
                    className="px-4 py-1.5 rounded-xl bg-amber-200/60 text-amber-900 font-bold opacity-75 cursor-not-allowed select-none"
                  >
                    Renewal Locked
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* EXPIRED / CAN RENEW STATE */
            <div className="space-y-6">
              <div className="p-5 rounded-3xl bg-emerald-50/90 border border-emerald-200 text-emerald-950 shadow-xs space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-2xl bg-emerald-100 text-emerald-700 mt-0.5 shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-emerald-900">
                      Permit Expired &bull; Eligible for Annual Renewal
                    </h3>
                    <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                      Your prior permit expired on <strong>{formatDate(permitInfo.valid_until)}</strong>. You are eligible to file your annual renewal application for calendar year <strong>{permitInfo.target_renewal_year}</strong>.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-emerald-200/60 text-xs">
                  {permitInfo.is_late_renewal ? (
                    <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span className="leading-snug">
                        <strong>Late Renewal Surcharge (₱200.00 Applied):</strong> Application filed after the January 31 municipal deadline (1 month past January 1 renewal start).
                      </span>
                    </div>
                  ) : (
                    <div className="p-3 rounded-2xl bg-white/90 border border-emerald-200 text-emerald-900 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="leading-snug">
                        <strong>On-Time Regular Renewal:</strong> Submitted within the regular January window. No late penalty assessed.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* RENEWAL APPLICATION FORM */}
              {form && (
                <form onSubmit={handleSubmitRenewal} className="space-y-6 animate-fade-in">
                  {/* Personal & Vending Information */}
                  <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">1. Review &amp; Update Declaration</h3>
                        <span className="text-[11px] font-mono text-emerald-700 font-bold">{form.existing_peddler_code}</span>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase">
                        RENEWAL FOR {permitInfo.target_renewal_year}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Registrant Name</label>
                        <input
                          type="text"
                          disabled
                          value={`${form.first_name} ${form.last_name}`}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Contact Phone</label>
                        <input
                          type="text"
                          required
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Vending Nature</label>
                        <input
                          type="text"
                          required
                          value={form.nature_of_business}
                          onChange={(e) => setForm({ ...form, nature_of_business: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-900"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Vending Location / Address</label>
                        <input
                          type="text"
                          required
                          value={form.business_address}
                          onChange={(e) => setForm({ ...form, business_address: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200"
                        />
                      </div>
                      <div className="sm:col-span-2 p-3 bg-emerald-50/50 rounded-xl border border-emerald-200">
                        <label className="block text-[11px] font-bold text-emerald-950 uppercase mb-1">
                          Declared Papag / Lag-it Units (₱110 each unit)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={form.num_papag}
                          onChange={(e) => setForm({ ...form, num_papag: e.target.value, num_lag_it: 0 })}
                          className="w-full max-w-xs px-3 py-2 rounded-xl border border-emerald-300 font-bold bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Upload Requirements */}
                  <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-slate-900">2. Updated Annual Clearance &amp; Price Tag</h3>
                    <p className="text-xs text-slate-500">
                      Please attach your current year Barangay Clearance or updated sample price tag photo.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { type: 'barangay_clearance', label: 'Updated Barangay Clearance' },
                        { type: 'price_tag', label: 'Updated Price Tag Photo' },
                      ].map((doc) => {
                        const uploaded = form.documents.find((d) => d.document_type === doc.type);
                        return (
                          <div key={doc.type} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                            <span className="font-bold text-slate-800">{doc.label}</span>
                            <div className="mt-2">
                              {uploaded ? (
                                <span className="text-emerald-700 font-semibold">{uploaded.file_name}</span>
                              ) : (
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  onChange={(e) => handleDocumentUpload(doc.type, e.target.files[0])}
                                  className="text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-emerald-600 file:text-white cursor-pointer"
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Signature */}
                  <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-slate-900">3. Applicant Signature</h3>
                    <SignaturePad
                      onSave={(data) => setForm((prev) => ({ ...prev, signature_data: data }))}
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>Submit Permit Renewal Application</span>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      ) : (
        /* NO PERMIT FOUND */
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-sm space-y-3">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">No Issued Peddler Permit Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            You do not currently have an active or expired peddler permit registered under this account.
          </p>
        </div>
      )}
    </div>
  );
}
