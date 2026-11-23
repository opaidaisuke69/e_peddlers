import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  FileText,
  User,
  MapPin,
  Phone,
  Calendar,
  Award,
  Loader2,
  Coins,
  ShieldCheck,
  Eye,
  Download,
  AlertCircle,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import ApplicationTimeline from '../../components/ApplicationTimeline';
import DocumentViewerModal from '../../components/DocumentViewerModal';
import { applicationApi, workflowApi } from '../../services/api';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { useToast } from '../../contexts/ToastContext';

export default function ApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error } = useToast();

  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fetchApplication = async () => {
    try {
      setLoading(true);
      const res = await applicationApi.get(id);
      if (res.success && res.data) {
        setApplication(res.data);
      }
    } catch (err) {
      error(err.message || 'Failed to load application.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplication();
  }, [id]);

  const handleAdminApprove = async () => {
    if (!window.confirm('Are you sure you want to approve this application? A unique Peddler ID will be assigned and emailed to the applicant with login instructions.')) {
      return;
    }

    try {
      setActionLoading(true);
      const res = await workflowApi.adminDecision(id, { decision: 'APPROVED' });
      if (res.success) {
        success(`Application approved! Peddler ID ${res.data.peddler_code} assigned and emailed to applicant with login instructions.`);
        fetchApplication();
      }
    } catch (err) {
      error(err.message || 'Failed to approve application.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdminReject = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      error('Please provide a mandatory explanation for rejecting this application.');
      return;
    }

    try {
      setActionLoading(true);
      const res = await workflowApi.adminDecision(id, {
        decision: 'REJECTED',
        reason: rejectReason.trim(),
      });
      if (res.success) {
        success('Application rejected and explanation emailed to applicant.');
        setShowRejectModal(false);
        fetchApplication();
      }
    } catch (err) {
      error(err.message || 'Failed to reject application.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReleasePermit = async () => {
    if (!window.confirm('Confirm release of official Peddler Business Permit?')) {
      return;
    }

    try {
      setActionLoading(true);
      const res = await workflowApi.releasePermit(id);
      if (res.success) {
        success(`Permit ${res.data.permit_number} successfully released! QR Code is now activated.`);
        fetchApplication();
      }
    } catch (err) {
      error(err.message || 'Failed to release permit.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteApplication = async () => {
    try {
      setActionLoading(true);
      const res = await applicationApi.delete(id);
      if (res.success) {
        success(res.message || `Application #${application.application_number} permanently deleted.`);
        navigate('/admin/applications');
      } else {
        error(res.message || 'Failed to delete application.');
      }
    } catch (err) {
      error(err.message || 'Failed to delete application.');
    } finally {
      setActionLoading(false);
      setShowDeleteModal(false);
    }
  };

  if (loading || !application) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-700" />
        <p className="text-xs font-semibold">Loading application details...</p>
      </div>
    );
  }

  const isPendingAdmin = application.status === 'PENDING_ADMIN_APPROVAL';
  const isReadyRelease = application.status === 'READY_FOR_PERMIT_RELEASE';
  const isFinished = application.status === 'FINISHED';

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/applications"
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
            title="Back to Applications"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                {application.application_number}
              </h1>
              <StatusBadge status={application.status} />
              <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-slate-100 text-slate-700">
                {application.application_type}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Submitted on {formatDate(application.date_of_application)} • Registrant: {application.applicant_full_name}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {isPendingAdmin && (
            <>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject Application</span>
              </button>
              <button
                onClick={handleAdminApprove}
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Approve &amp; Assign ID</span>
              </button>
            </>
          )}

          {isReadyRelease && (
            <button
              onClick={handleReleasePermit}
              disabled={actionLoading}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-2 animate-pulse"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
              <span>RELEASE OFFICIAL PERMIT</span>
            </button>
          )}

          {isFinished && (
            <a
              href={workflowApi.getPermitViewUrl(application.id)}
              target="_blank"
              rel="noreferrer"
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-sm flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              <span>View / Print Verification Proof</span>
            </a>
          )}

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            disabled={actionLoading}
            className="px-3 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Delete Application"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Delete</span>
          </button>
        </div>
      </div>

      {/* Visual Workflow Timeline */}
      <ApplicationTimeline
        status={application.status}
        currentStage={application.current_stage}
        timeline={application.timeline || []}
      />

      {/* Rejection Alert if present */}
      {application.rejection_reason && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-900 text-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold">Returned for Correction:</strong>
            <p className="mt-0.5 text-rose-800">{application.rejection_reason}</p>
          </div>
        </div>
      )}

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Personal & Business Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Taxpayer Information Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-700" />
              <span>Taxpayer &amp; Registrant Profile</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Full Name</span>
                <p className="font-bold text-slate-900 mt-0.5 text-sm">{application.applicant_full_name}</p>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Assigned Peddler ID</span>
                <p className="font-mono font-bold text-emerald-800 mt-0.5 text-sm">
                  {application.peddler_code || 'Pending Admin Approval'}
                </p>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Gender • Civil Status</span>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {application.gender} • {application.civil_status}
                </p>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">CTC Number</span>
                <p className="font-semibold text-slate-800 mt-0.5">{application.ctc_number || 'N/A'}</p>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Email Address</span>
                <p className="font-semibold text-slate-800 mt-0.5">{application.email}</p>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Phone Number</span>
                <p className="font-semibold text-slate-800 mt-0.5">{application.phone}</p>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Residential Address</span>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {application.residential_address}, {application.residential_barangay}, {application.residential_city}
                </p>
              </div>
            </div>
          </div>

          {/* Business & Vending Details Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-700" />
              <span>Business &amp; Peddling Location</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2">
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Nature of Business</span>
                <p className="font-bold text-slate-900 mt-0.5 text-sm">{application.nature_of_business}</p>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Business Type</span>
                <p className="font-semibold text-slate-800 mt-0.5">{application.business_type}</p>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Number of Employees</span>
                <p className="font-semibold text-slate-800 mt-0.5">{application.num_employees}</p>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Authorized Units</span>
                <p className="font-bold text-emerald-950 mt-0.5">
                  {(Number(application.num_papag || 0) + Number(application.num_lag_it || 0))} Papag / Lag-it
                </p>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Vending Barangay</span>
                <p className="font-semibold text-slate-800 mt-0.5">{application.business_barangay}</p>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Business Location Address</span>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {application.business_address}, {application.business_barangay}, {application.business_city}
                </p>
              </div>
              {application.assigned_slot && (
                <div className="sm:col-span-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                      Saturday Market Assigned Stall
                    </span>
                    <span className="text-sm font-bold font-mono text-emerald-950">
                      Slot {application.assigned_slot} • Saturday Market Area
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-900 uppercase">
                    Reserved Slot
                  </span>
                </div>
              )}
              <div className="sm:col-span-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">Emergency Contact</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {application.emergency_contact_person} ({application.emergency_contact_phone})
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Uploaded Compliance Documents */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-700" />
              <span>Uploaded Requirements &amp; Compliance Files</span>
            </h3>

            {application.documents?.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">No documents uploaded.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {application.documents.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    className="p-3 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/30 transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900 capitalize">
                        {doc.document_type?.replace(/_/g, ' ')}
                      </p>
                      <span className="text-[10px] text-slate-400 truncate max-w-[180px] block">
                        {doc.file_name}
                      </span>
                    </div>
                    <Eye className="w-4 h-4 text-emerald-700" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Fees Breakdown, Signature, Permit Info */}
        <div className="space-y-6">
          {/* Fee Snapshot Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Coins className="w-4 h-4 text-emerald-600" />
              <span>Official Fee Assessment</span>
            </h3>

            <div className="space-y-2 text-xs">
              {Array.isArray(application.fee_breakdown) ? (
                application.fee_breakdown.map((item, idx) => (
                  <div key={idx} className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">{item.name}</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(item.amount)}</span>
                  </div>
                ))
              ) : (
                <p className="text-slate-400">Standard fee calculation applied.</p>
              )}

              {Number(application.penalty_amount) > 0 && (
                <div className="flex justify-between py-1 text-rose-600 font-bold border-b border-slate-100">
                  <span>Late Renewal Penalty</span>
                  <span>{formatCurrency(application.penalty_amount)}</span>
                </div>
              )}

              <div className="pt-3 flex justify-between items-center text-sm font-bold">
                <span className="text-slate-800">Total Payable:</span>
                <span className="text-emerald-700 text-lg font-black font-mono">
                  {formatCurrency(application.total_amount)}
                </span>
              </div>

              {application.payment_status && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Payment Status:</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {application.payment_status} ({application.payment_method})
                  </span>
                </div>
              )}

              {application.or_number && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Official Receipt:</span>
                  <span className="font-mono font-bold text-slate-800">{application.or_number}</span>
                </div>
              )}
            </div>
          </div>

          {/* Digital Signature */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
              Applicant Digital Signature
            </h3>
            {application.signature?.signature_data ? (
              <div className="border border-slate-200 rounded-xl p-2 bg-slate-50 flex flex-col items-center">
                <img
                  src={application.signature.signature_data}
                  alt="Applicant Drawn Signature"
                  className="max-h-24 object-contain"
                />
                <span className="text-[10px] text-slate-400 mt-1">
                  Signed on {formatDateTime(application.signature.signed_at)}
                </span>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No digital signature attached.</p>
            )}
          </div>
        </div>
      </div>

      {/* Document Preview Modal */}
      {selectedDoc && (
        <DocumentViewerModal document={selectedDoc} onClose={() => setSelectedDoc(null)} />
      )}

      {/* Mandatory Rejection Reason Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Mandatory Rejection Explanation</h3>
            <p className="text-xs text-slate-500 mb-4">
              Specify the exact reason for rejecting or returning this application for corrections.
            </p>

            <form onSubmit={handleAdminReject} className="space-y-4">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Attached Barangay Clearance is expired; product price tags missing in submitted photos."
                rows={4}
                required
                className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 leading-relaxed"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm"
                >
                  Confirm Rejection &amp; Notify
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => !actionLoading && setShowDeleteModal(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  Delete Application?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  You are about to permanently delete application{' '}
                  <strong className="font-mono text-slate-800 font-bold">
                    #{application.application_number}
                  </strong>{' '}
                  for <strong className="text-slate-800">{application.applicant_full_name}</strong>.
                </p>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-rose-800">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>This action cannot be undone</span>
              </div>
              <p className="text-[11px] text-rose-700 leading-relaxed">
                All uploaded documents, signatures, clearances, and payment records for this application will be removed. If an Agora Saturday Market stall was assigned, it will be automatically released back to Available.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteApplication}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
