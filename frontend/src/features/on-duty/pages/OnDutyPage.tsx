import { useEffect, useState } from 'react';
import {
  Briefcase,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Check,
  X,
  Send,
  FileCheck,
  FileText,
  MapPin,
  ExternalLink,
  Upload,
} from 'lucide-react';
import { useCan } from '@/features/auth/hooks/useCan';
import {
  applyOnDuty,
  cancelOnDuty,
  fetchOnDutyRequests,
  reviewOnDuty,
  uploadOnDutyCertificate,
  type OnDutyCategory,
  type OnDutyMetrics,
  type OnDutyRequest,
  type OnDutyStatus,
} from '../api/onDuty';

const CATEGORY_MAP: Record<OnDutyCategory, { label: string; icon: string }> = {
  UNIVERSITY_VALUATION: {
    label: 'VTU Central Valuation',
    icon: '📝',
  },
  EXTERNAL_EXAMINER: {
    label: 'External Lab Examiner',
    icon: '🔬',
  },
  CONFERENCE_SEMINAR: {
    label: 'Conference / Seminar',
    icon: '🎤',
  },
  FDP_WORKSHOP: {
    label: 'FDP / ATAL Workshop',
    icon: '💻',
  },
  BOS_BOE_MEETING: {
    label: 'BoS / BoE Meeting',
    icon: '🏛️',
  },
  OFFICIAL_COLLEGE_DUTY: {
    label: 'Official College Duty',
    icon: '🏫',
  },
  OTHER: {
    label: 'Other External Duty',
    icon: '📌',
  },
};

const STATUS_BADGES: Record<
  OnDutyStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  PENDING: {
    label: 'Pending HOD Scrutiny',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
  },
  RECOMMENDED: {
    label: 'Recommended for Principal',
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
  },
  APPROVED: {
    label: 'Approved & Credited',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
  },
  REJECTED: {
    label: 'Rejected',
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-200',
  },
  CANCELLED: {
    label: 'Cancelled',
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
  },
};

export default function OnDutyPage() {
  const can = useCan();
  const canApprove = can('on_duty.approve');
  const canApply = can('on_duty.apply');

  const [activeTab, setActiveTab] = useState<'my-requests' | 'approvals-queue'>(
    canApprove ? 'approvals-queue' : 'my-requests',
  );

  const [requests, setRequests] = useState<OnDutyRequest[]>([]);
  const [metrics, setMetrics] = useState<OnDutyMetrics>({
    total: 0,
    pending: 0,
    recommended: 0,
    approved: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Modals
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showCertModal, setShowCertModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<OnDutyRequest | null>(
    null,
  );

  // Apply Form
  const [applyForm, setApplyForm] = useState({
    category: 'UNIVERSITY_VALUATION' as OnDutyCategory,
    title: '',
    description: '',
    venue: '',
    startDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    attachmentUrl: '',
    attachmentName: '',
  });

  // Review Form
  const [reviewForm, setReviewForm] = useState({
    decision: 'APPROVE' as 'RECOMMEND' | 'APPROVE' | 'REJECT',
    note: '',
  });

  // Certificate Form
  const [certForm, setCertForm] = useState({
    attendanceCertificateUrl: '',
  });

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Live working days computation (skipping Sundays)
  const computeLiveDays = (startStr: string, endStr: string) => {
    try {
      const s = new Date(`${startStr}T00:00:00Z`);
      const e = new Date(`${endStr}T00:00:00Z`);
      if (s > e) return 0;
      let count = 0;
      const cur = new Date(s);
      while (cur <= e) {
        if (cur.getUTCDay() !== 0) count++;
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
      return count;
    } catch {
      return 0;
    }
  };

  const liveWorkingDays = computeLiveDays(
    applyForm.startDate,
    applyForm.endDate,
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchOnDutyRequests({
        view: activeTab === 'my-requests' ? 'my-requests' : undefined,
        category: selectedCategory || undefined,
        status: selectedStatus || undefined,
        pageSize: 50,
      });
      setRequests(res.data);
      setMetrics(res.metrics);
    } catch (err: any) {
      setActionError(err.message || 'Failed to load On-Duty requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, selectedCategory, selectedStatus]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    if (liveWorkingDays <= 0) {
      setActionError('The selected dates contain zero working days.');
      return;
    }
    try {
      await applyOnDuty({
        ...applyForm,
        attachmentUrl: applyForm.attachmentUrl || null,
        attachmentName: applyForm.attachmentName || null,
      });
      setShowApplyModal(false);
      setActionSuccess(
        'On-Duty application submitted! HOD has been notified for scrutiny.',
      );
      loadData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to submit application.');
    }
  };

  const openReviewModal = (req: OnDutyRequest) => {
    setSelectedRequest(req);
    // If HOD, default to RECOMMEND; if Principal/Admin, default to APPROVE
    setReviewForm({
      decision: req.status === 'PENDING' ? 'RECOMMEND' : 'APPROVE',
      note: '',
    });
    setShowReviewModal(true);
  };

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    setActionError(null);
    try {
      await reviewOnDuty(selectedRequest.id, {
        decision: reviewForm.decision,
        note: reviewForm.note || null,
      });
      setShowReviewModal(false);
      setActionSuccess(
        reviewForm.decision === 'APPROVE'
          ? 'On-Duty approved! Attendance records have been credited automatically with status ON_DUTY.'
          : reviewForm.decision === 'RECOMMEND'
            ? 'On-Duty recommended to Principal for final sign-off.'
            : 'On-Duty request rejected.',
      );
      loadData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to process review.');
    }
  };

  const openCertModal = (req: OnDutyRequest) => {
    setSelectedRequest(req);
    setCertForm({
      attendanceCertificateUrl: req.attendanceCertificateUrl || '',
    });
    setShowCertModal(true);
  };

  const handleSaveCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    try {
      await uploadOnDutyCertificate(selectedRequest.id, certForm);
      setShowCertModal(false);
      setActionSuccess('Attendance proof certificate submitted successfully!');
      loadData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to upload certificate.');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this On-Duty request?'))
      return;
    try {
      await cancelOnDuty(id);
      setActionSuccess('On-Duty request cancelled.');
      loadData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to cancel request.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-indigo-600 p-2.5 text-white shadow-sm">
            <Briefcase className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Official On-Duty (OD) & Valuation Management
            </h1>
            <p className="text-xs text-slate-500 sm:text-sm">
              VTU Central Valuation, External Lab Examiner duties, Conferences &
              automated attendance credits.
            </p>
          </div>
        </div>

        {canApply && (
          <button
            onClick={() => setShowApplyModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 active:bg-indigo-800"
          >
            <Plus className="h-4 w-4" />
            <span>Apply for On-Duty</span>
          </button>
        )}
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-emerald-600 hover:text-emerald-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-rose-600 hover:text-rose-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">
              Total Applications
            </span>
            <FileText className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {metrics.total}
          </div>
          <span className="text-xs text-slate-400">Total requests</span>
        </div>

        <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 shadow-sm">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-medium uppercase tracking-wider">
              Pending Scrutiny
            </span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-900">
            {metrics.pending}
          </div>
          <span className="text-xs text-amber-600/80">Awaiting HOD check</span>
        </div>

        <div className="rounded-xl border border-blue-200/80 bg-blue-50/40 p-4 shadow-sm">
          <div className="flex items-center justify-between text-blue-700">
            <span className="text-xs font-medium uppercase tracking-wider">
              Recommended
            </span>
            <Send className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-900">
            {metrics.recommended}
          </div>
          <span className="text-xs text-blue-600/80">With Principal</span>
        </div>

        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-xs font-medium uppercase tracking-wider">
              Approved & Credited
            </span>
            <FileCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-900">
            {metrics.approved}
          </div>
          <span className="text-xs text-emerald-600/80">Attendance active</span>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex rounded-lg border border-slate-200 bg-slate-100/80 p-1">
          {canApply && (
            <button
              onClick={() => setActiveTab('my-requests')}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === 'my-requests'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              My On-Duty Applications
            </button>
          )}
          {canApprove && (
            <button
              onClick={() => setActiveTab('approvals-queue')}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === 'approvals-queue'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Approvals & Scrutiny Queue
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
          >
            <option value="">All Categories</option>
            {Object.entries(CATEGORY_MAP).map(([key, cat]) => (
              <option key={key} value={key}>
                {cat.icon} {cat.label}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending HOD</option>
            <option value="RECOMMENDED">Recommended</option>
            <option value="APPROVED">Approved & Credited</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-slate-400">
            <Clock className="h-6 w-6 animate-spin text-indigo-600" />
            <span className="ml-2 text-sm font-medium">Loading requests...</span>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Briefcase className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-medium text-slate-700">
              No On-Duty applications found
            </p>
            <p className="text-xs text-slate-400">
              {activeTab === 'my-requests'
                ? 'You have not submitted any On-Duty requests yet.'
                : 'No pending requests requiring review.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">Faculty / Staff</th>
                  <th className="px-4 py-3">Duty Category & Title</th>
                  <th className="px-4 py-3">Venue / Location</th>
                  <th className="px-4 py-3">Dates & Days</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Proof Documents</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((r) => {
                  const badge = STATUS_BADGES[r.status];
                  const cat = CATEGORY_MAP[r.category];

                  return (
                    <tr
                      key={r.id}
                      className="transition-colors hover:bg-slate-50/60"
                    >
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">
                          {r.employee.firstName} {r.employee.lastName}
                        </div>
                        <div className="text-xs text-slate-500">
                          {r.employee.department.code} •{' '}
                          {r.employee.designation.name}
                        </div>
                        <div className="font-mono text-[10px] text-indigo-600">
                          {r.employee.employeeCode}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="inline-flex items-center gap-1.5 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                          <span>{cat.icon}</span>
                          <span>{cat.label}</span>
                        </div>
                        <div className="mt-1 font-semibold text-slate-900">
                          {r.title}
                        </div>
                        <p className="line-clamp-1 text-xs text-slate-500">
                          {r.description}
                        </p>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 text-xs font-medium text-slate-800">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          <span>{r.venue}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="text-xs font-medium text-slate-900">
                          {new Date(r.startDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })}{' '}
                          –{' '}
                          {new Date(r.endDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="mt-0.5 font-semibold text-indigo-700 text-xs">
                          {r.totalDays} working {r.totalDays === 1 ? 'day' : 'days'}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          {badge.label}
                        </span>
                        {r.hodNote && (
                          <div className="mt-1 text-[11px] text-slate-500">
                            HOD: {r.hodNote}
                          </div>
                        )}
                        {r.finalNote && (
                          <div className="mt-0.5 text-[11px] font-medium text-emerald-700">
                            Principal: {r.finalNote}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          {r.attachmentUrl ? (
                            <a
                              href={r.attachmentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span>
                                {r.attachmentName || 'Appointment Order'}
                              </span>
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400">
                              No order attached
                            </span>
                          )}

                          {r.status === 'APPROVED' && (
                            <div>
                              {r.attendanceCertificateUrl ? (
                                <a
                                  href={r.attendanceCertificateUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 hover:text-emerald-800"
                                >
                                  <Check className="h-3 w-3" />
                                  <span>Attendance Proof</span>
                                </a>
                              ) : (
                                <button
                                  onClick={() => openCertModal(r)}
                                  className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 hover:text-amber-800"
                                >
                                  <Upload className="h-3 w-3" />
                                  <span>Upload Certificate</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canApprove &&
                            (r.status === 'PENDING' ||
                              r.status === 'RECOMMENDED') && (
                              <button
                                onClick={() => openReviewModal(r)}
                                className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-700"
                              >
                                <span>Scrutinize</span>
                              </button>
                            )}

                          {r.status === 'PENDING' && (
                            <button
                              onClick={() => handleCancel(r.id)}
                              className="rounded p-1 text-slate-400 hover:text-rose-600"
                              title="Cancel Request"
                            >
                              <X className="h-4 w-4" />
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

      {/* Modal 1: Apply for On-Duty */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-indigo-100 p-1.5 text-indigo-700">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Apply for Official On-Duty (OD)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Sanctions external university & academic duties with
                    attendance credit.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowApplyModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleApply} className="mt-4 space-y-3.5">
              <div>
                <label className="text-xs font-medium text-slate-700">
                  Duty Category *
                </label>
                <select
                  value={applyForm.category}
                  onChange={(e) =>
                    setApplyForm({
                      ...applyForm,
                      category: e.target.value as OnDutyCategory,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs font-medium"
                >
                  {Object.entries(CATEGORY_MAP).map(([key, cat]) => (
                    <option key={key} value={key}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">
                  Subject / Duty Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VTU Central Valuation - Design of Machine Elements (18ME52)"
                  value={applyForm.title}
                  onChange={(e) =>
                    setApplyForm({ ...applyForm, title: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">
                  Venue / Organization / Center *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VTU Regional Evaluation Center, Belagavi"
                  value={applyForm.venue}
                  onChange={(e) =>
                    setApplyForm({ ...applyForm, venue: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={applyForm.startDate}
                    onChange={(e) =>
                      setApplyForm({ ...applyForm, startDate: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={applyForm.endDate}
                    onChange={(e) =>
                      setApplyForm({ ...applyForm, endDate: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-2.5 text-xs text-indigo-900 flex items-center justify-between">
                <span>Working Days (excluding Sundays):</span>
                <span className="font-bold text-sm">
                  {liveWorkingDays} {liveWorkingDays === 1 ? 'Day' : 'Days'}
                </span>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">
                  Brief Purpose & Syllabus Arrangement Note *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Explain the purpose of external duty and how missed lectures will be compensated/substituted."
                  value={applyForm.description}
                  onChange={(e) =>
                    setApplyForm({
                      ...applyForm,
                      description: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700">
                    University Relieving / Order URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/order.pdf"
                    value={applyForm.attachmentUrl}
                    onChange={(e) =>
                      setApplyForm({
                        ...applyForm,
                        attachmentUrl: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Attachment Name
                  </label>
                  <input
                    type="text"
                    placeholder="VTU_Valuation_Order.pdf"
                    value={applyForm.attachmentName}
                    onChange={(e) =>
                      setApplyForm({
                        ...applyForm,
                        attachmentName: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Review & Decision Drawer */}
      {showReviewModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Scrutinize On-Duty Application
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedRequest.employee.firstName}{' '}
                  {selectedRequest.employee.lastName} (
                  {selectedRequest.employee.department.code})
                </p>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleReview} className="mt-4 space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs space-y-1.5 text-slate-700">
                <div className="font-semibold text-slate-900">
                  {selectedRequest.title}
                </div>
                <div>Venue: {selectedRequest.venue}</div>
                <div>
                  Duration:{' '}
                  {new Date(selectedRequest.startDate).toLocaleDateString(
                    'en-IN',
                    { day: 'numeric', month: 'short' },
                  )}{' '}
                  to{' '}
                  {new Date(selectedRequest.endDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}{' '}
                  ({selectedRequest.totalDays} working days)
                </div>
                <div className="text-slate-600">
                  {selectedRequest.description}
                </div>
                {selectedRequest.attachmentUrl && (
                  <div className="pt-1">
                    <a
                      href={selectedRequest.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>View Attached Order / Letter</span>
                    </a>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">
                  Decision *
                </label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <label
                    className={`flex cursor-pointer items-center justify-center rounded-lg border p-2 text-xs font-semibold ${
                      reviewForm.decision === 'RECOMMEND'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="decision"
                      value="RECOMMEND"
                      checked={reviewForm.decision === 'RECOMMEND'}
                      onChange={() =>
                        setReviewForm({ ...reviewForm, decision: 'RECOMMEND' })
                      }
                      className="sr-only"
                    />
                    <span>Recommend (HOD)</span>
                  </label>

                  <label
                    className={`flex cursor-pointer items-center justify-center rounded-lg border p-2 text-xs font-semibold ${
                      reviewForm.decision === 'APPROVE'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="decision"
                      value="APPROVE"
                      checked={reviewForm.decision === 'APPROVE'}
                      onChange={() =>
                        setReviewForm({ ...reviewForm, decision: 'APPROVE' })
                      }
                      className="sr-only"
                    />
                    <span>Approve & Credit</span>
                  </label>

                  <label
                    className={`flex cursor-pointer items-center justify-center rounded-lg border p-2 text-xs font-semibold ${
                      reviewForm.decision === 'REJECT'
                        ? 'border-rose-600 bg-rose-50 text-rose-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="decision"
                      value="REJECT"
                      checked={reviewForm.decision === 'REJECT'}
                      onChange={() =>
                        setReviewForm({ ...reviewForm, decision: 'REJECT' })
                      }
                      className="sr-only"
                    />
                    <span>Reject</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">
                  Reviewer Remarks / Condition Note
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Syllabus status verified. Recommended for sanction."
                  value={reviewForm.note}
                  onChange={(e) =>
                    setReviewForm({ ...reviewForm, note: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  Submit Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Upload Certificate */}
      {showCertModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Submit Attendance Proof Certificate
              </h3>
              <button
                onClick={() => setShowCertModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCert} className="mt-4 space-y-3">
              <p className="text-xs text-slate-600">
                Please provide the link to the official certificate of
                attendance issued by the university evaluation center or host
                institution.
              </p>
              <div>
                <label className="text-xs font-medium text-slate-700">
                  Certificate Document URL *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://example.com/attendance-certificate.pdf"
                  value={certForm.attendanceCertificateUrl}
                  onChange={(e) =>
                    setCertForm({
                      ...certForm,
                      attendanceCertificateUrl: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCertModal(false)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  Save Certificate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
