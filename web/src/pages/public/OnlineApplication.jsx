import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Trash2,
  Copy,
  Check,
  Upload,
  MapPin,
  Store,
  X,
  Layers,
  Sparkles,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import SignaturePad from '../../components/SignaturePad';
import PagsulundanModal from '../../components/PagsulundanModal';
import VendorMap from '../../components/VendorMap';
import { applicationApi } from '../../services/api';
import { BARANGAYS_LA_CARLOTA } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatters';
import { useToast } from '../../contexts/ToastContext';
import logo from '../../assets/logo.png';

const STAGES = [
  { id: 1, title: 'Basic Information' },
  { id: 2, title: 'Name of Tax Payer / Registrant' },
  { id: 3, title: 'Business Information & Stalls' },
  { id: 4, title: 'In Case of Emergency' },
  { id: 5, title: 'Compliance Document Uploads' },
  { id: 6, title: 'Applicant Affirmation & Signature' },
];

export default function OnlineApplication() {
  const { success, error } = useToast();

  const [currentStage, setCurrentStage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submittedApp, setSubmittedApp] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showPagsulundanModal, setShowPagsulundanModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);

  const [form, setForm] = useState({
    // 1st - Basic Information
    application_type: 'New',
    existing_peddler_code: '',
    is_late_renewal: false,
    gender: 'Male',
    ctc_number: '',
    date_of_application: new Date().toISOString().split('T')[0],
    civil_status: 'Single',
    phone: '',

    // 2nd - Name of Tax Payer / Registrant
    last_name: '',
    first_name: '',
    middle_name: '',
    residential_address: '',
    residential_barangay: BARANGAYS_LA_CARLOTA[0],
    residential_city: 'La Carlota City',
    email: '',

    // 3rd - Business Information & Stalls
    nature_of_business: '',
    business_type: 'Peddlers',
    num_employees: 0,
    assigned_slot: '',
    slot_details: null,
    business_address: '',
    business_barangay: BARANGAYS_LA_CARLOTA[0],
    business_city: 'La Carlota City',
    num_papag_lag_it: 1,
    num_papag: 1,
    num_lag_it: 0,

    // 4th - In Case of Emergency
    emergency_contact_person: '',
    emergency_contact_phone: '',

    // 5th & 6th - Documents & Signature
    agreed_to_terms: false,
    signature_data: null,
    documents: [],
  });

  const totalUnits = Math.max(0, Number(form.num_papag_lag_it ?? 1));
  const occupationalTax = 110 * totalUnits;
  const fixedBase = 540;
  const isPastJan31 = form.application_type === 'Renewal' && (new Date() > new Date(new Date().getFullYear(), 0, 31, 23, 59, 59));
  const lateFee = (form.is_late_renewal || isPastJan31) ? 200 : 0;
  const estimatedTotal = fixedBase + occupationalTax + lateFee;

  const inputClass =
    'w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/25 bg-white transition-all';
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5';

  const handleUnitsChange = (val) => {
    const units = Math.max(0, parseInt(val) || 0);
    setForm((prev) => ({
      ...prev,
      num_papag_lag_it: units,
      num_papag: units,
      num_lag_it: 0,
    }));
  };

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
        success('Document uploaded.');
      }
    } catch (err) {
      error(err.message || 'File upload failed.');
    }
  };

  const removeDoc = (docType) => {
    setForm((prev) => ({
      ...prev,
      documents: prev.documents.filter((d) => d.document_type !== docType),
    }));
  };

  const getDoc = (docType) => form.documents.find((d) => d.document_type === docType);

  const validateCurrentStage = () => {
    if (currentStage === 1) {
      if (form.application_type === 'Renewal' && !form.existing_peddler_code.trim()) {
        error('Please enter your existing Peddler ID.');
        return false;
      }
      if (!form.date_of_application) {
        error('Please select the Date of Application.');
        return false;
      }
      if (!form.phone.trim()) {
        error('Please enter your Cellphone #');
        return false;
      }
    } else if (currentStage === 2) {
      if (!form.last_name.trim() || !form.first_name.trim()) {
        error('Please enter Last Name and First Name.');
        return false;
      }
      if (!form.residential_address.trim()) {
        error('Please enter your Address.');
        return false;
      }
      if (!form.email.trim() || !form.email.includes('@')) {
        error('Please enter a valid Email.');
        return false;
      }
    } else if (currentStage === 3) {
      if (!form.nature_of_business.trim()) {
        error('Please enter the Nature of Business.');
        return false;
      }
      if (form.application_type === 'New' && !form.assigned_slot) {
        error('Please select an Available stall slot from the Saturday Market Map.');
        setShowMapModal(true);
        return false;
      }
      if (!form.business_address.trim()) {
        error('Please enter the Business Address / Location.');
        return false;
      }
    } else if (currentStage === 4) {
      if (!form.emergency_contact_person.trim() || !form.emergency_contact_phone.trim()) {
        error('Please enter the Emergency Contact Person and Cellphone #.');
        return false;
      }
    } else if (currentStage === 5) {
      const requiredDocs = [
        { key: 'barangay_clearance', label: 'Barangay Clearance' },
        { key: 'price_tag', label: 'Price Tag Photo' },
        { key: 'sample_products', label: 'Sample Products Photo' },
        { key: 'government_id', label: 'Valid ID / CTC' },
      ];
      const missing = requiredDocs.filter((doc) => !getDoc(doc.key));
      if (missing.length > 0) {
        error(`Please upload all 4 required compliance documents: ${missing.map((m) => m.label).join(', ')}.`);
        return false;
      }
    }
    return true;
  };

  const nextStage = () => {
    if (validateCurrentStage()) {
      setCurrentStage((prev) => Math.min(6, prev + 1));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStage = () => {
    setCurrentStage((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Verify all 4 documents are present
    const requiredDocs = [
      { key: 'barangay_clearance', label: 'Barangay Clearance' },
      { key: 'price_tag', label: 'Price Tag Photo' },
      { key: 'sample_products', label: 'Sample Products Photo' },
      { key: 'government_id', label: 'Valid ID / CTC' },
    ];
    const missing = requiredDocs.filter((doc) => !getDoc(doc.key));
    if (missing.length > 0) {
      error(`Please upload all required compliance documents: ${missing.map((m) => m.label).join(', ')}.`);
      setCurrentStage(5);
      return;
    }

    if (!form.signature_data) {
      error('Please draw and provide your signature before submitting.');
      return;
    }

    if (!form.agreed_to_terms) {
      error('Please open and read the Pagsulundan Market Guidelines before submitting.');
      setShowPagsulundanModal(true);
      return;
    }

    try {
      setLoading(true);
      const res = await applicationApi.create({
        ...form,
        num_papag: form.num_papag_lag_it,
        num_lag_it: 0,
      });
      if (res.success && res.data) {
        setSubmittedApp(res.data);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        success('Application submitted successfully!');
      }
    } catch (err) {
      error(err.message || 'Failed to submit application.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // SUCCESS SCREEN
  if (submittedApp) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-emerald-100 p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-emerald-900">Application Submitted</h2>
          <p className="text-xs text-slate-500 mt-1">
            Save your application number below to track your permit status.
          </p>

          <div className="my-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
            <div className="text-left">
              <span className="text-[11px] text-slate-500 block">16-Digit Application Reference</span>
              <span className="text-lg font-mono font-bold text-emerald-950">
                {submittedApp.application_number}
              </span>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(submittedApp.application_number)}
              className="p-2 rounded-lg bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {(submittedApp.assigned_slot || form.assigned_slot) && (
            <div className="mb-6 p-3.5 rounded-xl bg-slate-50 border border-emerald-200 text-left flex items-center gap-3">
              <div className="min-w-[42px] px-2 h-9 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-mono font-bold text-xs shrink-0 shadow-xs whitespace-nowrap">
                {submittedApp.assigned_slot || form.assigned_slot}
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Assigned Saturday Market Slot</span>
                <span className="text-xs font-bold text-slate-900 block">
                  Slot {submittedApp.assigned_slot || form.assigned_slot} • Saturday Market Area
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Link
              to="/"
              className="flex-1 py-2.5 px-4 rounded-lg border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors"
            >
              Back to Home
            </Link>
            <Link
              to="/peddler-login"
              className="flex-1 py-2.5 px-4 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-xs hover:from-emerald-700 hover:to-teal-700 transition-all"
            >
              Peddler Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-4 sm:py-8 px-2.5 sm:px-4 w-full overflow-x-hidden">
      <div className="max-w-2xl w-full mx-auto min-w-0">
        {/* Clean Card Container */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-emerald-100 overflow-hidden w-full min-w-0">
          {/* Top Emerald Banner matching Login & Landing Page */}
          <div className="relative overflow-hidden bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-950 px-4 sm:px-6 py-4 sm:py-5 text-white flex items-center justify-between gap-2.5">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#a7f3d0_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
            <div className="relative z-10 flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <img
                src={logo}
                alt="City of La Carlota Seal"
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white p-0.5 object-contain shadow-sm shrink-0"
              />
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold leading-tight truncate">
                  Peddler Permit Application
                </h1>
                <p className="text-[11px] sm:text-xs text-emerald-200 truncate">
                  City Government of La Carlota
                </p>
              </div>
            </div>
            <Link
              to="/"
              className="relative z-10 inline-flex items-center gap-1 sm:gap-1.5 text-xs font-medium text-emerald-100 hover:text-white transition-colors shrink-0 py-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Back to site</span>
              <span className="sm:hidden">Back</span>
            </Link>
          </div>

          {/* Simple Step Indicator */}
          <div className="px-3 sm:px-6 py-3 sm:py-4 bg-slate-50/70 border-b border-slate-200/80">
            <div className="flex items-center justify-between gap-1 sm:gap-2">
              {STAGES.map((st) => {
                const isDone = st.id < currentStage;
                const isCurrent = st.id === currentStage;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => isDone && setCurrentStage(st.id)}
                    disabled={!isDone}
                    className="flex-1 flex flex-col items-center gap-1 group"
                  >
                    <div
                      className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full text-[11px] sm:text-xs font-bold flex items-center justify-center transition-all ${
                        isCurrent
                          ? 'bg-emerald-600 text-white ring-2 sm:ring-4 ring-emerald-500/20'
                          : isDone
                          ? 'bg-emerald-100 text-emerald-800 cursor-pointer'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {isDone ? <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : st.id}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="text-center mt-2">
              <span className="text-xs font-semibold text-emerald-800">
                Stage {currentStage} of 6: {STAGES[currentStage - 1].title}
              </span>
            </div>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 md:p-8">
            {/* STAGE 1: BASIC INFORMATION */}
            {currentStage === 1 && (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>New or Renewal</label>
                    <select
                      value={form.application_type}
                      onChange={(e) => setForm({ ...form, application_type: e.target.value })}
                      className={inputClass}
                    >
                      <option value="New">New</option>
                      <option value="Renewal">Renewal</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Gender</label>
                    <select
                      value={form.gender}
                      onChange={(e) => setForm({ ...form, gender: e.target.value })}
                      className={inputClass}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>

                  {form.application_type === 'Renewal' && (
                    <div className="sm:col-span-2 space-y-2">
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
                        <strong className="font-bold block text-amber-950">Renewal Policy &amp; Validity Notice:</strong>
                        Permits are valid within the calendar year (January 1 to December 31). You can renew if your permit is expired and you haven't renewed yet for the current year. On-time renewal window is January 1 to January 31. Renewals submitted after January 31 (late by 1 month) incur a statutory ₱200 late renewal surcharge.
                      </div>
                      <label className={labelClass}>Existing Peddler ID</label>
                      <input
                        type="text"
                        value={form.existing_peddler_code}
                        onChange={(e) =>
                          setForm({ ...form, existing_peddler_code: e.target.value.toUpperCase() })
                        }
                        placeholder="e.g. PED-2026-12345"
                        className={inputClass}
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className={labelClass}>
                      CTC No. <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={form.ctc_number}
                      onChange={(e) => setForm({ ...form, ctc_number: e.target.value })}
                      placeholder="Community Tax Certificate No."
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Date of Application</label>
                    <input
                      type="date"
                      value={form.date_of_application}
                      onChange={(e) => setForm({ ...form, date_of_application: e.target.value })}
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Civil Status</label>
                    <select
                      value={form.civil_status}
                      onChange={(e) => setForm({ ...form, civil_status: e.target.value })}
                      className={inputClass}
                    >
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Widowed">Widowed</option>
                      <option value="Separated">Separated</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Cellphone #</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="0912 345 6789"
                      className={inputClass}
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STAGE 2: NAME OF TAX PAYER / REGISTRANT */}
            {currentStage === 2 && (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>Lastname</label>
                    <input
                      type="text"
                      value={form.last_name}
                      onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                      placeholder="Dela Cruz"
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Firstname</label>
                    <input
                      type="text"
                      value={form.first_name}
                      onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                      placeholder="Juan"
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Middle Name <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={form.middle_name}
                      onChange={(e) => setForm({ ...form, middle_name: e.target.value })}
                      placeholder="Santos"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Address</label>
                    <input
                      type="text"
                      value={form.residential_address}
                      onChange={(e) => setForm({ ...form, residential_address: e.target.value })}
                      placeholder="House No. / Street / Purok"
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Barangay</label>
                    <select
                      value={form.residential_barangay}
                      onChange={(e) => setForm({ ...form, residential_barangay: e.target.value })}
                      className={inputClass}
                    >
                      {BARANGAYS_LA_CARLOTA.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="juan@example.com"
                    className={inputClass}
                    required
                  />
                </div>
              </div>
            )}

            {/* STAGE 3: BUSINESS INFORMATION & STALLS */}
            {currentStage === 3 && (
              <div className="space-y-4 w-full min-w-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full min-w-0">
                  {/* Saturday Market Stall Slot Selection (New Applicants Only) */}
                  {form.application_type === 'New' && (
                    <div className="sm:col-span-2 w-full min-w-0 p-3.5 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50/90 via-teal-50/50 to-emerald-50/90 border border-emerald-200/90 shadow-xs box-border">
                      {/* Section Heading */}
                      <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                          <Store className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
                            <span className="text-sm font-bold text-slate-900 leading-tight">
                              Saturday Market Stall Assignment
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider shrink-0 whitespace-nowrap">
                              Required for New
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed text-pretty">
                            Choose your designated stall on the official Saturday Market Vendor Map (Sections A to F).
                          </p>
                        </div>
                      </div>

                      {/* Selected Slot Confirmation or Unselected Action */}
                      {form.assigned_slot ? (
                        <div className="mt-3.5 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-emerald-300/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0 box-border">
                          <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                            <div className="w-12 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black font-mono text-sm tracking-wide shadow-xs shrink-0 whitespace-nowrap">
                              {form.assigned_slot}
                            </div>
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="text-xs font-bold text-slate-900 leading-snug">
                                <span>Designated Stall: Slot {form.assigned_slot}</span>
                                {form.slot_details && (
                                  <span className="font-semibold text-slate-600 block sm:inline">
                                    {' • '}Section {form.slot_details.section_code} ({form.slot_details.section_name})
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-emerald-700 flex items-center gap-1.5 font-medium">
                                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[3]" />
                                <span className="leading-tight">Status: Available • Reserved for your application</span>
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowMapModal(true)}
                            className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                          >
                            <Layers className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <span className="whitespace-nowrap">Change Slot</span>
                          </button>
                        </div>
                      ) : (
                        <div className="mt-3.5 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/90 border border-amber-200 text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0 box-border">
                          <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5 sm:mt-0" />
                            <span className="text-xs text-slate-600 leading-relaxed">
                              No stall selected yet. Please choose an <strong>Available (White)</strong> slot from the map.
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowMapModal(true)}
                            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                          >
                            <Layers className="w-4 h-4 text-emerald-100 shrink-0" />
                            <span className="whitespace-nowrap">Open Saturday Market Map</span>
                            <ChevronRight className="w-4 h-4 text-emerald-100 shrink-0" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className={labelClass}>Nature of Business</label>
                    <input
                      type="text"
                      value={form.nature_of_business}
                      onChange={(e) => setForm({ ...form, nature_of_business: e.target.value })}
                      placeholder="e.g. Vegetables, Fish, Fruits"
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Type of Business</label>
                    <input
                      type="text"
                      value="Peddlers"
                      readOnly
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-100 text-sm font-medium text-slate-600"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>No. of Employee</label>
                    <input
                      type="number"
                      min="0"
                      value={form.num_employees}
                      onChange={(e) =>
                        setForm({ ...form, num_employees: Math.max(0, parseInt(e.target.value) || 0) })
                      }
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>No. of Papag / Lag-it (Stall Units • ₱110 each)</label>
                    <input
                      type="number"
                      min="0"
                      value={form.num_papag_lag_it}
                      onChange={(e) => handleUnitsChange(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Business Address / Location</label>
                    <input
                      type="text"
                      value={form.business_address}
                      onChange={(e) => setForm({ ...form, business_address: e.target.value })}
                      placeholder="Public Market / Street Location"
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Business Barangay</label>
                    <select
                      value={form.business_barangay}
                      onChange={(e) => setForm({ ...form, business_barangay: e.target.value })}
                      className={inputClass}
                    >
                      {BARANGAYS_LA_CARLOTA.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* STAGE 4: IN CASE OF EMERGENCY */}
            {currentStage === 4 && (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>In Case of Emergency Contact Person</label>
                    <input
                      type="text"
                      value={form.emergency_contact_person}
                      onChange={(e) =>
                        setForm({ ...form, emergency_contact_person: e.target.value })
                      }
                      placeholder="Full Name"
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Cellphone #</label>
                    <input
                      type="tel"
                      value={form.emergency_contact_phone}
                      onChange={(e) =>
                        setForm({ ...form, emergency_contact_phone: e.target.value })
                      }
                      placeholder="0919 876 5432"
                      className={inputClass}
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STAGE 5: COMPLIANCE DOCUMENT UPLOADS */}
            {currentStage === 5 && (
              <div className="space-y-3">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 font-medium">
                  <strong>Pahibalo:</strong> All four (4) documents below are mandatory requirements for permit approval. Please upload clear photos or PDF copies.
                </div>

                {[
                  { key: 'barangay_clearance', label: 'Barangay Clearance' },
                  { key: 'price_tag', label: 'Price Tag Photo' },
                  { key: 'sample_products', label: 'Sample Products Photo' },
                  { key: 'government_id', label: 'Valid ID / CTC' },
                ].map((doc) => {
                  const uploaded = getDoc(doc.key);
                  return (
                    <div
                      key={doc.key}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 rounded-xl border transition-all gap-2.5 ${
                        uploaded
                          ? 'border-emerald-300 bg-emerald-50/50'
                          : 'border-slate-200 bg-slate-50/70 hover:border-slate-300'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs sm:text-sm font-bold text-slate-900">{doc.label}</p>
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                            * Required
                          </span>
                        </div>
                        {uploaded ? (
                          <p className="text-xs text-emerald-700 font-semibold mt-1 truncate flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
                            ✓ Uploaded: {uploaded.file_name}
                          </p>
                        ) : (
                          <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">JPG, PNG, or PDF</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                        <label className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 transition-colors shadow-xs">
                          <Upload className="w-3.5 h-3.5" />
                          <span>{uploaded ? 'Replace File' : 'Upload'}</span>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => handleDocumentUpload(doc.key, e.target.files[0])}
                            className="hidden"
                          />
                        </label>
                        {uploaded && (
                          <button
                            type="button"
                            onClick={() => removeDoc(doc.key)}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Remove file"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* STAGE 6: APPLICANT AFFIRMATION & SIGNATURE */}
            {currentStage === 6 && (
              <div className="space-y-5">
                {/* Compact Summary */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-2">
                    <span className="text-slate-500 shrink-0">Applicant:</span>
                    <span className="font-semibold text-slate-900 truncate">
                      {form.first_name} {form.middle_name} {form.last_name} ({form.application_type})
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-2">
                    <span className="text-slate-500 shrink-0">Business:</span>
                    <span className="font-semibold text-slate-900 truncate">
                      {form.nature_of_business} • {totalUnits} Papag / Lag-it
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200 text-xs sm:text-sm font-bold text-emerald-900">
                    <span>Estimated Permit Fee:</span>
                    <span>{formatCurrency(estimatedTotal)}</span>
                  </div>
                </div>

                {/* Signature */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={labelClass}>
                      Applicant Signature <span className="text-rose-600 font-bold">* (Required)</span>
                    </label>
                    {form.signature_data && (
                      <span className="text-[11px] font-bold text-emerald-700">✓ Signature Captured</span>
                    )}
                  </div>
                  <SignaturePad
                    onSave={(sigData) => setForm({ ...form, signature_data: sigData })}
                    initialData={form.signature_data}
                  />
                  {!form.signature_data && (
                    <p className="text-[11px] text-rose-600 mt-1 font-semibold">
                      * Signature is required. Please draw your digital signature above before submitting.
                    </p>
                  )}
                </div>

                {/* Pagsulundan Agreement (Must Open & Read Before Checking) */}
                <div className="pt-2">
                  <div
                    onClick={() => {
                      if (!form.agreed_to_terms) {
                        setShowPagsulundanModal(true);
                      }
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      form.agreed_to_terms
                        ? 'border-emerald-300 bg-emerald-50/70'
                        : 'border-amber-300 bg-amber-50/70 hover:bg-amber-100/60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="agreeTermsSimple"
                        checked={form.agreed_to_terms}
                        onChange={(e) => {
                          if (!form.agreed_to_terms) {
                            setShowPagsulundanModal(true);
                          } else {
                            setForm({ ...form, agreed_to_terms: false });
                          }
                        }}
                        onClick={(e) => {
                          if (!form.agreed_to_terms) {
                            e.preventDefault();
                            setShowPagsulundanModal(true);
                          }
                        }}
                        className="mt-0.5 w-4 h-4 text-emerald-700 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer shrink-0"
                      />
                      <div className="text-xs leading-relaxed flex-1">
                        {form.agreed_to_terms ? (
                          <div>
                            <span className="font-bold text-emerald-950 block text-xs sm:text-sm">
                              ✓ Nabasa kag Ginapasugtan ang mga Pagsulundan sang Merkado Publiko
                            </span>
                            <span className="text-emerald-800 text-[11px] block mt-0.5">
                              I certify that all information provided is true, and I agree to strictly abide by all City peddling guidelines.
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowPagsulundanModal(true);
                              }}
                              className="text-emerald-700 font-bold underline mt-1.5 text-[11px] inline-block cursor-pointer"
                            >
                              View Pagsulundan Guidelines Again
                            </button>
                          </div>
                        ) : (
                          <div>
                            <span className="font-bold text-amber-950 block text-xs sm:text-sm">
                              ⚠️ Kinahanglan Basahon ang Pagsulundan (Required)
                            </span>
                            <span className="text-amber-900 text-[11px] block mt-0.5">
                              Palihog buksi kag basaha anay ang opisyal nga 17 ka mga pagsulundan bag-o mag-check kag mag-submit.
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowPagsulundanModal(true);
                              }}
                              className="mt-2.5 px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                            >
                              <span>Buksan kag Basahon ang Pagsulundan &rarr;</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Footer */}
            <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between gap-2.5">
              {currentStage > 1 ? (
                <button
                  type="button"
                  onClick={prevStage}
                  className="px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-lg border border-slate-300 text-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-50 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Back</span>
                </button>
              ) : (
                <div />
              )}

              {currentStage < 6 ? (
                <button
                  type="button"
                  onClick={nextStage}
                  className="px-5 sm:px-6 py-2 sm:py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-xs sm:text-sm inline-flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <span>Next</span>
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 sm:px-6 py-2 sm:py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 text-white font-semibold text-xs sm:text-sm inline-flex items-center gap-2 shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Application</span>
                      <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      <PagsulundanModal
        isOpen={showPagsulundanModal}
        onClose={() => setShowPagsulundanModal(false)}
        onAgree={(agreed) => setForm((prev) => ({ ...prev, agreed_to_terms: agreed }))}
        agreedInitially={form.agreed_to_terms}
      />

      {/* Full-Screen Saturday Market Vendor Mapping Modal */}
      {showMapModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-1 sm:p-4 overflow-y-auto"
          onClick={() => setShowMapModal(false)}
        >
          <div
            className="bg-slate-50 text-slate-900 rounded-2xl sm:rounded-3xl max-w-6xl w-full max-h-[96vh] sm:max-h-[92vh] overflow-y-auto border border-slate-200 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header Bar */}
            <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-3 sm:px-6 py-2.5 sm:py-3.5 border-b border-slate-200 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider truncate">
                  Select Market Stall • Saturday Market Mapping
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowMapModal(false)}
                className="p-1.5 sm:p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer shrink-0"
                title="Close Map"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Vendor Map Component in Selection Mode */}
            <div className="p-1 sm:p-4">
              <VendorMap
                selectionMode={true}
                selectedSlot={form.assigned_slot}
                onSelectSlot={(slot) => {
                  setForm((prev) => ({
                    ...prev,
                    assigned_slot: slot.slot_code,
                    slot_details: slot,
                    business_address: `Agora Public Market — Saturday Market Area, Section ${slot.section_code} (${slot.section_name}), Slot ${slot.slot_code}`,
                  }));
                  setShowMapModal(false);
                  success(`Selected stall slot ${slot.slot_code}!`);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
