import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  User,
  MapPin,
  Upload,
  PenTool,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Coins,
  ShieldAlert,
  Loader2,
  Trash2,
  Check,
} from 'lucide-react';
import SignaturePad from '../../components/SignaturePad';
import PagsulundanModal from '../../components/PagsulundanModal';
import { applicationApi } from '../../services/api';
import { BARANGAYS_LA_CARLOTA } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatters';
import { useToast } from '../../contexts/ToastContext';

export default function ApplyPermit() {
  const navigate = useNavigate();
  const { success, error } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPagsulundanModal, setShowPagsulundanModal] = useState(false);

  // Form State
  const [form, setForm] = useState({
    application_type: 'New',
    gender: 'Male',
    civil_status: 'Single',
    ctc_number: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    residential_address: '',
    residential_barangay: BARANGAYS_LA_CARLOTA[0],
    residential_city: 'La Carlota City',
    email: '',
    phone: '',
    nature_of_business: '',
    business_type: 'Peddlers',
    num_employees: 0,
    business_address: '',
    business_barangay: BARANGAYS_LA_CARLOTA[0],
    business_city: 'La Carlota City',
    num_papag: 1,
    num_lag_it: 0,
    emergency_contact_person: '',
    emergency_contact_phone: '',
    agreed_to_terms: false,
    signature_data: null,
    documents: [],
  });

  // Calculate fees dynamically
  const totalUnits = Number(form.num_papag || 0) + Number(form.num_lag_it || 0);
  const occupationalTax = 110 * totalUnits;
  const fixedBase = 540; // 110+55+110+55+10+200
  const estimatedTotal = fixedBase + occupationalTax;

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
        success(`${docType.replace(/_/g, ' ')} uploaded successfully.`);
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

  const validateStep = () => {
    if (currentStep === 2) {
      if (!form.first_name || !form.last_name || !form.email || !form.phone || !form.residential_address) {
        error('Please complete all required personal details.');
        return false;
      }
      if (!form.nature_of_business || !form.business_address || !form.emergency_contact_person || !form.emergency_contact_phone) {
        error('Please complete all required business and emergency contact fields.');
        return false;
      }
    }
    if (currentStep === 3) {
      if (!form.agreed_to_terms) {
        error('You must read and agree to the Pagsulundan before proceeding.');
        return false;
      }
    }
    if (currentStep === 4) {
      const requiredDocs = ['barangay_clearance', 'price_tag', 'sample_products', 'government_id'];
      const uploadedDocs = (form.documents || []).map((d) => d.document_type);
      const missing = requiredDocs.filter((req) => !uploadedDocs.includes(req));
      if (missing.length > 0) {
        error('Please upload all 4 required compliance documents before proceeding.');
        return false;
      }
    }
    if (currentStep === 5) {
      if (!form.signature_data) {
        error('Please draw your digital signature before continuing.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 2 && !form.agreed_to_terms) {
      setShowPagsulundanModal(true);
      return;
    }
    if (validateStep()) {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const res = await applicationApi.create({
        ...form,
        num_papag: Number(form.num_papag),
        num_lag_it: Number(form.num_lag_it),
        num_employees: Number(form.num_employees),
      });

      if (res.success) {
        success(`Application ${res.data.application_number} submitted! Confirmation email sent.`);
        navigate('/peddler/applications');
      }
    } catch (err) {
      error(err.message || 'Application submission failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Wizard Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Peddler Business Permit Application</h1>
        <p className="text-xs font-semibold text-slate-500 mt-0.5">
          Step-by-step registration for ambulant and itinerant peddling within La Carlota City jurisdiction.
        </p>

        {/* Stepper Progress Bar */}
        <div className="mt-6 grid grid-cols-6 gap-2">
          {[
            { step: 1, label: 'Type' },
            { step: 2, label: 'Information' },
            { step: 3, label: 'Pagsulundan' },
            { step: 4, label: 'Documents' },
            { step: 5, label: 'Signature' },
            { step: 6, label: 'Review' },
          ].map((st) => (
            <div key={st.step} className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep === st.step
                    ? 'bg-emerald-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-300'
                    : currentStep > st.step
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {currentStep > st.step ? <Check className="w-4 h-4" /> : st.step}
              </div>
              <span className="text-[10px] font-bold text-slate-600 mt-1 uppercase tracking-wider hidden sm:block">
                {st.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* STEP 1: Application Type */}
      {currentStep === 1 && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm space-y-6">
          <h2 className="text-base font-bold text-slate-900">Step 1: Select Application Type</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              onClick={() => setForm({ ...form, application_type: 'New' })}
              className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                form.application_type === 'New'
                  ? 'border-emerald-600 bg-emerald-50/40 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-slate-900">New Permit Application</span>
                <span className="w-4 h-4 rounded-full border border-emerald-600 flex items-center justify-center">
                  {form.application_type === 'New' && <span className="w-2 h-2 rounded-full bg-emerald-600" />}
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                First-time registration for a Peddler Business Permit in La Carlota City. A permanent Peddler ID and QR Code will be issued upon approval.
              </p>
            </div>

            <div
              onClick={() => {
                navigate('/peddler/renew');
              }}
              className="p-6 rounded-2xl border-2 border-slate-200 hover:border-slate-300 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-slate-900">Permit Renewal</span>
                <span className="w-4 h-4 rounded-full border border-slate-300" />
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Already have a registered Peddler ID or existing Permit? Click here to access the fast Renewal Wizard with auto-filled records.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Basic Information */}
      {currentStep === 2 && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm space-y-6">
          <h2 className="text-base font-bold text-slate-900">Step 2: Registrant &amp; Business Details</h2>

          <div className="space-y-6">
            {/* Taxpayer Information */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">Taxpayer Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Middle Name</label>
                  <input
                    type="text"
                    value={form.middle_name}
                    onChange={(e) => setForm({ ...form, middle_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Gender *</label>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Civil Status *</label>
                  <select
                    value={form.civil_status}
                    onChange={(e) => setForm({ ...form, civil_status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                  >
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Widowed">Widowed</option>
                    <option value="Separated">Separated</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">CTC Number</label>
                  <input
                    type="text"
                    placeholder="Optional"
                    value={form.ctc_number}
                    onChange={(e) => setForm({ ...form, ctc_number: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Mobile Phone *</label>
                  <input
                    type="text"
                    required
                    placeholder="0917XXXXXXX"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Residential Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="Zone, Purok, Street"
                    value={form.residential_address}
                    onChange={(e) => setForm({ ...form, residential_address: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Barangay *</label>
                  <select
                    value={form.residential_barangay}
                    onChange={(e) => setForm({ ...form, residential_barangay: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
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

            {/* Business Information */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">Business &amp; Vending Info</h3>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Nature of Business *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Native Delicacies, Fruits & Vegetables, Fish Peddling"
                  value={form.nature_of_business}
                  onChange={(e) => setForm({ ...form, nature_of_business: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Vending Address / Location *</label>
                  <input
                    type="text"
                    required
                    placeholder="Public Plaza, Market Perimeter, School Zone"
                    value={form.business_address}
                    onChange={(e) => setForm({ ...form, business_address: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Location Barangay *</label>
                  <select
                    value={form.business_barangay}
                    onChange={(e) => setForm({ ...form, business_barangay: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                  >
                    {BARANGAYS_LA_CARLOTA.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200">
                <label className="block text-[11px] font-bold text-emerald-950 uppercase mb-1">
                  No. of Papag / Lag-it (₱110 each unit) *
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  Number of vendor display stands / stalls in the market.
                </p>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={form.num_papag}
                  onChange={(e) => setForm({ ...form, num_papag: e.target.value, num_lag_it: 0 })}
                  className="w-full max-w-xs px-3.5 py-2.5 rounded-xl border border-emerald-300 text-sm font-bold bg-white"
                />
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">Emergency Contact Person</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Contact Person Name *</label>
                  <input
                    type="text"
                    required
                    value={form.emergency_contact_person}
                    onChange={(e) => setForm({ ...form, emergency_contact_person: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Emergency Phone *</label>
                  <input
                    type="text"
                    required
                    value={form.emergency_contact_phone}
                    onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Terms and Conditions (Pagsulundan) */}
      {currentStep === 3 && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm space-y-6 text-center">
          <ShieldAlert className="w-12 h-12 text-emerald-700 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Step 3: Pagsulundan Agreement</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            You must read, acknowledge, and agree to the statutory peddling regulations of La Carlota City before proceeding to document upload.
          </p>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block text-left max-w-md w-full">
            <label className="flex items-center gap-3 cursor-pointer text-xs font-bold text-slate-800">
              <input
                type="checkbox"
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
                className="w-4 h-4 text-emerald-700 rounded"
              />
              <span>I have read and agree to the Pagsulundan.</span>
            </label>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowPagsulundanModal(true)}
              className="text-xs font-bold text-emerald-700 hover:underline"
            >
              Open Pagsulundan Document &rarr;
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Documents Upload */}
      {currentStep === 4 && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Step 4: Upload Required Documents</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Please upload clear photos or PDF scans of the following requirements:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { type: 'price_tag', label: '1. Price Tag Photo', desc: 'Visible price tag on products/cart' },
              { type: 'sample_products', label: '2. Sample Products Photo', desc: 'Photos of goods to be sold' },
              { type: 'barangay_clearance', label: '3. Barangay Clearance', desc: 'Valid clearance endorsement' },
              { type: 'government_id', label: '4. Valid Government ID', desc: 'PhilID, Driver\'s License, Voter\'s ID' },
            ].map((req) => {
              const uploaded = form.documents.find((d) => d.document_type === req.type);

              return (
                <div key={req.type} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{req.label}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">{req.desc}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/60">
                    {uploaded ? (
                      <div className="flex items-center justify-between text-xs text-emerald-800 bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                        <span className="font-semibold truncate max-w-[150px]">{uploaded.file_name}</span>
                        <button
                          type="button"
                          onClick={() => removeDoc(req.type)}
                          className="p-1 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer py-2 px-3 rounded-xl border border-dashed border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center gap-2 text-xs font-semibold text-slate-600 transition-colors">
                        <Upload className="w-4 h-4 text-slate-400" />
                        <span>Choose File / Drag &amp; Drop</span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          className="hidden"
                          onChange={(e) => handleDocumentUpload(req.type, e.target.files[0])}
                        />
                      </label>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 5: Digital Signature */}
      {currentStep === 5 && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Step 5: Digital Signature Capture</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Draw your signature on the pad using your mouse or finger on touchscreens.
            </p>
          </div>

          <SignaturePad
            initialData={form.signature_data}
            onSave={(data) => setForm((prev) => ({ ...prev, signature_data: data }))}
          />
        </div>
      )}

      {/* STEP 6: Review & Submission */}
      {currentStep === 6 && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Step 6: Review Application &amp; Estimated Fees</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verify your information before submitting to the City Administrator.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-900 uppercase text-[11px] mb-2">Registrant Summary</h4>
              <p><strong>Name:</strong> {form.first_name} {form.middle_name} {form.last_name}</p>
              <p><strong>Gender / Civil Status:</strong> {form.gender} • {form.civil_status}</p>
              <p><strong>Contact:</strong> {form.phone} • {form.email}</p>
              <p><strong>Address:</strong> {form.residential_address}, {form.residential_barangay}</p>
              <p><strong>Vending Line:</strong> {form.nature_of_business}</p>
              <p><strong>Vending Location:</strong> {form.business_address}, {form.business_barangay}</p>
              <p><strong>Stall Units:</strong> {Number(form.num_papag || 0) + Number(form.num_lag_it || 0)} Papag / Lag-it</p>
            </div>

            {/* Statutory Fee Computation Box */}
            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-1.5">
              <h4 className="font-bold text-emerald-900 uppercase text-[11px] mb-2 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-emerald-700" />
                <span>Government Fee Computation</span>
              </h4>
              <div className="flex justify-between py-0.5 text-slate-600">
                <span>Mayor's Permit:</span>
                <span>₱110.00</span>
              </div>
              <div className="flex justify-between py-0.5 text-slate-600">
                <span>Sanitary Permit:</span>
                <span>₱55.00</span>
              </div>
              <div className="flex justify-between py-0.5 text-slate-600">
                <span>Health Certificate:</span>
                <span>₱110.00</span>
              </div>
              <div className="flex justify-between py-0.5 text-slate-600">
                <span>Occupational Tax ({totalUnits} units @ ₱110):</span>
                <span>{formatCurrency(occupationalTax)}</span>
              </div>
              <div className="flex justify-between py-0.5 text-slate-600">
                <span>Garbage Fee:</span>
                <span>₱55.00</span>
              </div>
              <div className="flex justify-between py-0.5 text-slate-600">
                <span>Barangay Clearance:</span>
                <span>₱10.00</span>
              </div>
              <div className="flex justify-between py-0.5 text-slate-600">
                <span>Peddlers Tax:</span>
                <span>₱200.00</span>
              </div>
              <div className="pt-2 border-t border-emerald-200 flex justify-between font-bold text-sm text-emerald-900">
                <span>Total Fee Estimate:</span>
                <span className="font-mono text-base font-black">{formatCurrency(estimatedTotal)}</span>
              </div>
              <p className="text-[10px] text-slate-500 pt-1 italic">
                * Payable upon Sanitary Approval through Treasury Cash or PayMongo QRPh.
              </p>
            </div>
          </div>

          <div className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-200 text-xs text-emerald-950">
            <strong>Ready for Submission:</strong> Your application will be assigned a unique Application ID and forwarded to the City Administrator for Stage 1 Review.
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        {currentStep > 1 ? (
          <button
            type="button"
            onClick={() => setCurrentStep((s) => s - 1)}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Previous Step</span>
          </button>
        ) : (
          <div />
        )}

        {currentStep < 6 ? (
          <button
            type="button"
            onClick={handleNext}
            className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
          >
            <span>Next Step</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            disabled={loading}
            onClick={handleSubmit}
            className="px-8 py-3 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/25 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>Submit Permit Application</span>
          </button>
        )}
      </div>

      {/* Pagsulundan Modal */}
      <PagsulundanModal
        isOpen={showPagsulundanModal}
        agreedInitially={form.agreed_to_terms}
        onClose={() => setShowPagsulundanModal(false)}
        onAgree={(agreed) => {
          setForm((prev) => ({ ...prev, agreed_to_terms: agreed }));
          setCurrentStep(3);
        }}
      />
    </div>
  );
}
