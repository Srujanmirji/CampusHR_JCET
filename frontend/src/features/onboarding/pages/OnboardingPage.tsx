import { useCallback, useEffect, useState } from 'react';
import {
  UserPlus,
  FileCheck2,
  ScrollText,
  CheckCircle2,
  Clock,
  Printer,
  Copy,
  Check,
  Send,
  Eye,
  Search,
  CheckSquare,
  AlertCircle,
  X,
  FileBadge,
} from 'lucide-react';
import { useCan } from '@/features/auth/hooks/useCan';
import {
  listDepartments,
  listDesignations,
  type Department,
  type Designation,
} from '@/features/departments/api/departments';
import {
  completeOnboarding,
  createCandidate,
  fetchCandidates,
  getCandidate,
  issueAppointmentLetter,
  updateCandidate,
  updateCandidateStatus,
  type AppointmentLetterData,
  type CandidateStatus,
  type OnboardingCandidate,
} from '../api/onboarding';

const STATUS_BADGES: Record<
  CandidateStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  OFFER_PENDING: {
    label: 'Offer Pending',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  OFFER_ISSUED: {
    label: 'Letter Issued',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  OFFER_ACCEPTED: {
    label: 'Offer Accepted',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
  },
  DOCUMENTS_SUBMITTED: {
    label: 'Docs Verified',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
  },
  ONBOARDED: {
    label: 'Onboarded',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  REJECTED: {
    label: 'Offer Rejected',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
  },
  WITHDRAWN: {
    label: 'Withdrawn',
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
  },
};

export default function OnboardingPage() {
  const can = useCan();
  const canManage = can('recruitment.manage');

  const [candidates, setCandidates] = useState<OnboardingCandidate[]>([]);
  const [metrics, setMetrics] = useState({
    total: 0,
    pending: 0,
    issued: 0,
    accepted: 0,
    onboarded: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [search, setSearch] = useState('');

  // Dropdown data
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLetterModal, setShowLetterModal] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  const [selectedCandidate, setSelectedCandidate] =
    useState<OnboardingCandidate | null>(null);
  const [letterData, setLetterData] = useState<AppointmentLetterData | null>(
    null,
  );

  // Forms
  const [addForm, setAddForm] = useState(() => ({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    departmentId: 1,
    designationId: 1,
    employmentType: 'PERMANENT',
    qualification: '',
    specialization: '',
    experienceYears: 0,
    expectedJoiningDate: new Date(Date.now() + 14 * 86400000)
      .toISOString()
      .slice(0, 10),
    probationMonths: 12,
    noticePeriodMonths: 3,
    notes: '',
  }));

  const [checklistForm, setChecklistForm] = useState({
    degreeCertificate: false,
    pgMarksheet: false,
    experienceCertificate: false,
    relievingOrder: false,
    aadhaarPan: false,
    addressProof: false,
    status: 'OFFER_ACCEPTED' as CandidateStatus,
  });

  const [completeForm, setCompleteForm] = useState({
    createLoginAccount: true,
    temporaryPassword: 'Jcet@Welcome2026!',
    joiningDate: new Date().toISOString().slice(0, 10),
  });

  const [copiedLetter, setCopiedLetter] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchCandidates({
        status: selectedStatus || undefined,
        departmentId: selectedDept ? Number(selectedDept) : undefined,
        search: search || undefined,
        pageSize: 50,
      });
      setCandidates(res.data);
      setMetrics({
        total: res.meta.total,
        pending: res.meta.pending,
        issued: res.meta.issued,
        accepted: res.meta.accepted,
        onboarded: res.meta.onboarded,
      });
    } catch (err: unknown) {
      setActionError((err as Error).message || 'Failed to load candidates.');
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, selectedDept, search]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCandidates();
  }, [loadCandidates]);

  useEffect(() => {
    Promise.all([listDepartments(), listDesignations()])
      .then(([depts, desigs]) => {
        setDepartments(depts);
        setDesignations(desigs);
        if (depts.length > 0)
          setAddForm((prev) => ({ ...prev, departmentId: depts[0]!.id }));
        if (desigs.length > 0)
          setAddForm((prev) => ({ ...prev, designationId: desigs[0]!.id }));
      })
      .catch(() => {});
  }, []);

  const handleCreateCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      await createCandidate(addForm);
      setShowAddModal(false);
      setActionSuccess('Candidate added to onboarding pipeline successfully!');
      loadCandidates();
    } catch (err: unknown) {
      setActionError((err as Error).message || 'Failed to add candidate.');
    }
  };

  const handleViewLetter = async (candidate: OnboardingCandidate) => {
    try {
      const res = await getCandidate(candidate.id);
      setSelectedCandidate(res.data);
      setLetterData(res.data.letter);
      setShowLetterModal(true);
    } catch (err: unknown) {
      setActionError((err as Error).message || 'Failed to load appointment letter.');
    }
  };

  const handleIssueLetter = async (id: string) => {
    setActionError(null);
    try {
      const res = await issueAppointmentLetter(id);
      setSelectedCandidate(res.data);
      setLetterData(res.data.letter);
      setShowLetterModal(true);
      setActionSuccess('Official Appointment Letter generated and issued!');
      loadCandidates();
    } catch (err: unknown) {
      setActionError((err as Error).message || 'Failed to issue appointment letter.');
    }
  };

  const openChecklistModal = (candidate: OnboardingCandidate) => {
    setSelectedCandidate(candidate);
    setChecklistForm({
      degreeCertificate:
        candidate.documentsChecklist?.degreeCertificate || false,
      pgMarksheet: candidate.documentsChecklist?.pgMarksheet || false,
      experienceCertificate:
        candidate.documentsChecklist?.experienceCertificate || false,
      relievingOrder: candidate.documentsChecklist?.relievingOrder || false,
      aadhaarPan: candidate.documentsChecklist?.aadhaarPan || false,
      addressProof: candidate.documentsChecklist?.addressProof || false,
      status: candidate.status,
    });
    setShowChecklistModal(true);
  };

  const handleSaveChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) return;
    try {
      await updateCandidate(selectedCandidate.id, {
        documentsChecklist: {
          degreeCertificate: checklistForm.degreeCertificate,
          pgMarksheet: checklistForm.pgMarksheet,
          experienceCertificate: checklistForm.experienceCertificate,
          relievingOrder: checklistForm.relievingOrder,
          aadhaarPan: checklistForm.aadhaarPan,
          addressProof: checklistForm.addressProof,
        },
      });

      if (checklistForm.status !== selectedCandidate.status) {
        await updateCandidateStatus(selectedCandidate.id, {
          status: checklistForm.status,
        });
      }

      setShowChecklistModal(false);
      setActionSuccess('Document checklist and candidate status updated.');
      loadCandidates();
    } catch (err: unknown) {
      setActionError((err as Error).message || 'Failed to update checklist.');
    }
  };

  const openCompleteModal = (candidate: OnboardingCandidate) => {
    setSelectedCandidate(candidate);
    setCompleteForm({
      createLoginAccount: true,
      temporaryPassword: 'Jcet@Welcome2026!',
      joiningDate: candidate.expectedJoiningDate.slice(0, 10),
    });
    setShowCompleteModal(true);
  };

  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) return;
    try {
      const res = await completeOnboarding(
        selectedCandidate.id,
        completeForm,
      );
      setShowCompleteModal(false);
      setActionSuccess(
        `Onboarding complete! Allocated Employee Code: ${res.data.employee.employeeCode}. Faculty profile created!`,
      );
      loadCandidates();
    } catch (err: unknown) {
      setActionError((err as Error).message || 'Failed to complete onboarding.');
    }
  };

  const copyLetterText = () => {
    if (!letterData) return;
    const text = `
JAIN COLLEGE OF ENGINEERING & TECHNOLOGY (JCET), BELAGAVI
Hubballi Road, Belagavi, Karnataka - 590014
(Approved by AICTE, New Delhi & Affiliated to VTU, Belagavi)

REF: ${letterData.refNo}
DATE: ${letterData.issueDate}

To:
${letterData.candidateName}
Email: ${letterData.email}
Phone: ${letterData.phone}

SUBJECT: OFFER OF APPOINTMENT AS ${letterData.designation.toUpperCase()} IN THE DEPARTMENT OF ${letterData.department.toUpperCase()}

Dear ${letterData.candidateName},

The Management of Jain College of Engineering & Technology (JCET), Belagavi is pleased to offer you the post of ${letterData.designation} in the Department of ${letterData.department} on the following terms and conditions:

1. Nature of Appointment: ${letterData.employmentType}
2. Designation: ${letterData.designation}
3. Department: ${letterData.department}
4. Reporting Officer: Head of Department (${letterData.department})
5. Probation Period: ${letterData.probationMonths} months
6. Notice Period: ${letterData.noticePeriodMonths} months

TERMS & CONDITIONS:
${letterData.termsAndConditions.join('\n')}

Expected Date of Reporting: ${letterData.expectedJoiningDate}

Please return the signed duplicate copy of this letter as confirmation of your acceptance.

For Jain College of Engineering & Technology (JCET),

[Authorized Signatory]
Principal & Member Secretary
    `.trim();

    navigator.clipboard.writeText(text);
    setCopiedLetter(true);
    setTimeout(() => setCopiedLetter(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-teal-600 p-2 text-white shadow-sm">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                Employee Onboarding & Appointment Letters
              </h1>
              <p className="text-xs text-slate-500 sm:text-sm">
                Recruit pipeline, official appointment letters, document
                verification, and faculty code allocation.
              </p>
            </div>
          </div>
        </div>

        {canManage && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 active:bg-teal-800"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Selected Candidate</span>
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">
              Total Pipeline
            </span>
            <ScrollText className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {metrics.total}
          </div>
          <span className="text-xs text-slate-400">Selected recruits</span>
        </div>

        <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 shadow-sm">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-medium uppercase tracking-wider">
              Offer Pending
            </span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-900">
            {metrics.pending}
          </div>
          <span className="text-xs text-amber-600/80">Letters to generate</span>
        </div>

        <div className="rounded-xl border border-blue-200/80 bg-blue-50/40 p-4 shadow-sm">
          <div className="flex items-center justify-between text-blue-700">
            <span className="text-xs font-medium uppercase tracking-wider">
              Letter Issued
            </span>
            <FileBadge className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-900">
            {metrics.issued}
          </div>
          <span className="text-xs text-blue-600/80">Awaiting candidate</span>
        </div>

        <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/40 p-4 shadow-sm">
          <div className="flex items-center justify-between text-indigo-700">
            <span className="text-xs font-medium uppercase tracking-wider">
              Accepted / Verifying
            </span>
            <FileCheck2 className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-indigo-900">
            {metrics.accepted}
          </div>
          <span className="text-xs text-indigo-600/80">Doc verification</span>
        </div>

        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-xs font-medium uppercase tracking-wider">
              Onboarded
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-900">
            {metrics.onboarded}
          </div>
          <span className="text-xs text-emerald-600/80">Active employees</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by candidate name, email, or ref no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-sm text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-teal-500 focus:outline-none"
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name} ({dept.code})
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-teal-500 focus:outline-none"
          >
            <option value="">All Pipeline Stages</option>
            <option value="OFFER_PENDING">Offer Pending</option>
            <option value="OFFER_ISSUED">Letter Issued</option>
            <option value="OFFER_ACCEPTED">Offer Accepted</option>
            <option value="DOCUMENTS_SUBMITTED">Documents Submitted</option>
            <option value="ONBOARDED">Onboarded</option>
            <option value="REJECTED">Rejected</option>
            <option value="WITHDRAWN">Withdrawn</option>
          </select>
        </div>
      </div>

      {/* Candidate Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-slate-400">
            <Clock className="h-6 w-6 animate-spin text-teal-600" />
            <span className="ml-2 text-sm font-medium">Loading recruits...</span>
          </div>
        ) : candidates.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <UserPlus className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-medium text-slate-700">
              No onboarding candidates found
            </p>
            <p className="text-xs text-slate-400">
              Add candidates who have cleared selection interviews.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">Candidate</th>
                  <th className="px-4 py-3">Department & Role</th>
                  <th className="px-4 py-3">Service Terms</th>
                  <th className="px-4 py-3">Expected Joining</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Doc Checklist</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {candidates.map((c) => {
                  const badge = STATUS_BADGES[c.status];
                  const checklist = c.documentsChecklist;
                  const verifiedCount = checklist
                    ? Object.values(checklist).filter(Boolean).length
                    : 0;

                  return (
                    <tr
                      key={c.id}
                      className="transition-colors hover:bg-slate-50/60"
                    >
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">
                          {c.firstName} {c.lastName}
                        </div>
                        <div className="text-xs text-slate-500">{c.email}</div>
                        <div className="mt-0.5 inline-flex items-center gap-1 font-mono text-[10px] text-teal-700">
                          <span>{c.appointmentRefNo}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-medium text-slate-800">
                          {c.designation.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {c.department.name}
                        </div>
                        <span className="text-[10px] uppercase tracking-wide text-slate-400">
                          {c.employmentType}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">
                          {c.probationMonths} mo probation
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {c.noticePeriodMonths} mo notice
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="text-xs font-medium text-slate-800">
                          {new Date(c.expectedJoiningDate).toLocaleDateString(
                            'en-IN',
                            {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            },
                          )}
                        </div>
                        {c.joinedAt && (
                          <div className="text-[10px] text-emerald-600">
                            Joined:{' '}
                            {new Date(c.joinedAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          {badge.label}
                        </span>
                        {c.employee && (
                          <div className="mt-1 font-mono text-[11px] font-bold text-teal-700">
                            {c.employee.employeeCode}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => openChecklistModal(c)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          <CheckSquare className="h-3.5 w-3.5 text-teal-600" />
                          <span>{verifiedCount} / 6 Verified</span>
                        </button>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Letter */}
                          <button
                            onClick={() => handleViewLetter(c)}
                            title="View / Print Appointment Letter"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {/* Issue letter */}
                          {canManage && c.status === 'OFFER_PENDING' && (
                            <button
                              onClick={() => handleIssueLetter(c.id)}
                              className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
                            >
                              <Send className="h-3 w-3" />
                              <span>Issue Letter</span>
                            </button>
                          )}

                          {/* Complete Onboarding */}
                          {canManage && c.status !== 'ONBOARDED' && (
                            <button
                              onClick={() => openCompleteModal(c)}
                              className="inline-flex items-center gap-1 rounded-md bg-teal-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-teal-700"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>Onboard</span>
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

      {/* Modal 1: Add Selected Candidate */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Add Selected Candidate to Pipeline
                </h2>
                <p className="text-xs text-slate-500">
                  Enter candidate credentials and appointment details to
                  generate an appointment letter.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCandidate} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={addForm.firstName}
                    onChange={(e) =>
                      setAddForm({ ...addForm, firstName: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={addForm.lastName}
                    onChange={(e) =>
                      setAddForm({ ...addForm, lastName: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={addForm.email}
                    onChange={(e) =>
                      setAddForm({ ...addForm, email: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Contact Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={addForm.phone}
                    onChange={(e) =>
                      setAddForm({ ...addForm, phone: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Department *
                  </label>
                  <select
                    value={addForm.departmentId}
                    onChange={(e) =>
                      setAddForm({
                        ...addForm,
                        departmentId: Number(e.target.value),
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Designation *
                  </label>
                  <select
                    value={addForm.designationId}
                    onChange={(e) =>
                      setAddForm({
                        ...addForm,
                        designationId: Number(e.target.value),
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm"
                  >
                    {designations.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.category})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Employment Type
                  </label>
                  <select
                    value={addForm.employmentType}
                    onChange={(e) =>
                      setAddForm({ ...addForm, employmentType: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm"
                  >
                    <option value="PERMANENT">Permanent</option>
                    <option value="PROBATIONARY">Probationary</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="VISITING">Visiting</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Highest Qualification *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="M.Tech, Ph.D"
                    value={addForm.qualification}
                    onChange={(e) =>
                      setAddForm({ ...addForm, qualification: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Expected Joining Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={addForm.expectedJoiningDate}
                    onChange={(e) =>
                      setAddForm({
                        ...addForm,
                        expectedJoiningDate: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm"
                  />
                </div>
              </div>

              {/* Service Terms Box */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Employment Service Terms
                </h3>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-[11px] font-medium text-slate-600">
                      Probation Period (Months)
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={addForm.probationMonths}
                      onChange={(e) =>
                        setAddForm({
                          ...addForm,
                          probationMonths: Number(e.target.value),
                        })
                      }
                      className="mt-1 w-full rounded-md border border-slate-200 p-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600">
                      Notice Period (Months)
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={addForm.noticePeriodMonths}
                      onChange={(e) =>
                        setAddForm({
                          ...addForm,
                          noticePeriodMonths: Number(e.target.value),
                        })
                      }
                      className="mt-1 w-full rounded-md border border-slate-200 p-1.5 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
                >
                  Save Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Official Appointment Letter View / Print */}
      {showLetterModal && letterData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-8 shadow-2xl">
            {/* Action Bar */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2">
                <FileBadge className="h-5 w-5 text-teal-600" />
                <span className="font-mono text-xs font-bold text-slate-700">
                  REF: {letterData.refNo}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyLetterText}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  {copiedLetter ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Text</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-900"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Letter</span>
                </button>
                <button
                  onClick={() => setShowLetterModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Official Letterhead */}
            <div className="mt-6 border border-slate-200 bg-white p-8 shadow-sm">
              <div className="border-b-2 border-slate-900 pb-4 text-center">
                <h1 className="text-xl font-extrabold uppercase tracking-wide text-slate-900">
                  {letterData.institution.name}
                </h1>
                <p className="text-xs text-slate-600">
                  {letterData.institution.address}
                </p>
                <p className="text-[11px] font-medium text-slate-500">
                  {letterData.institution.affiliation}
                </p>
              </div>

              {/* Reference & Date */}
              <div className="mt-6 flex justify-between text-xs font-semibold text-slate-800">
                <span>Ref: {letterData.refNo}</span>
                <span>Date: {letterData.issueDate}</span>
              </div>

              {/* Addressee */}
              <div className="mt-4 text-xs text-slate-800">
                <div className="font-bold">To,</div>
                <div className="text-sm font-bold text-slate-900">
                  {letterData.candidateName}
                </div>
                <div>Email: {letterData.email}</div>
                <div>Phone: {letterData.phone}</div>
              </div>

              {/* Subject */}
              <div className="mt-6 rounded bg-slate-50 p-2.5 text-xs font-bold text-slate-900">
                SUBJECT: APPOINTMENT ORDER FOR THE POST OF{' '}
                {letterData.designation.toUpperCase()} IN THE DEPARTMENT OF{' '}
                {letterData.department.toUpperCase()}
              </div>

              {/* Salutation & Body */}
              <div className="mt-4 space-y-3 text-xs leading-relaxed text-slate-800">
                <p>Dear {letterData.candidateName},</p>
                <p>
                  With reference to your interview and recommendation of the
                  Staff Selection Committee, the Management is pleased to offer
                  you the post of{' '}
                  <span className="font-bold">{letterData.designation}</span> in
                  the Department of{' '}
                  <span className="font-bold">{letterData.department}</span> at
                  Jain College of Engineering & Technology (JCET), Belagavi.
                </p>

                {/* Employment Appointment Summary */}
                <div className="my-4 overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 font-semibold text-slate-700">
                      <tr>
                        <th className="p-2">Employment Detail</th>
                        <th className="p-2">Official Record</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="p-2 font-medium text-slate-600">Designation</td>
                        <td className="p-2 font-semibold text-slate-900">{letterData.designation}</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium text-slate-600">Department</td>
                        <td className="p-2 font-semibold text-slate-900">{letterData.department}</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium text-slate-600">Nature of Appointment</td>
                        <td className="p-2 text-slate-800">{letterData.employmentType}</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium text-slate-600">Reporting Officer</td>
                        <td className="p-2 text-slate-800">Head of Department ({letterData.department})</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium text-slate-600">Expected Reporting Date</td>
                        <td className="p-2 font-semibold text-teal-800">{letterData.expectedJoiningDate}</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium text-slate-600">Probation Period</td>
                        <td className="p-2 text-slate-800">{letterData.probationMonths} Months</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium text-slate-600">Notice Period</td>
                        <td className="p-2 text-slate-800">{letterData.noticePeriodMonths} Months</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Terms */}
                <div>
                  <h4 className="font-bold uppercase text-slate-900">
                    Terms and Conditions:
                  </h4>
                  <ul className="mt-1 space-y-1 pl-4">
                    {letterData.termsAndConditions.map((term, i) => (
                      <li key={i} className="list-disc">
                        {term}
                      </li>
                    ))}
                  </ul>
                </div>

                <p className="mt-4">
                  You are requested to report for duty on or before{' '}
                  <span className="font-bold text-slate-900">
                    {letterData.expectedJoiningDate}
                  </span>{' '}
                  with all original certificates, relieving order from your
                  previous employer, and 4 passport size photographs.
                </p>

                {/* Signatory */}
                <div className="mt-10 flex justify-between border-t border-slate-200 pt-6">
                  <div>
                    <div className="text-[11px] text-slate-500">
                      Candidate Acceptance:
                    </div>
                    <div className="mt-8 text-xs font-semibold">
                      Signature of Candidate
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-block rounded border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
                      Digitally Verified by JCET Executive
                    </div>
                    <div className="mt-6 text-xs font-bold text-slate-900">
                      {letterData.institution.authorizedSignatory}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Jain College of Engineering & Technology
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Document Verification Checklist */}
      {showChecklistModal && selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Document Verification Checklist
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedCandidate.firstName} {selectedCandidate.lastName} (
                  {selectedCandidate.appointmentRefNo})
                </p>
              </div>
              <button
                onClick={() => setShowChecklistModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveChecklist} className="mt-4 space-y-4">
              <div className="space-y-2.5">
                {[
                  {
                    key: 'degreeCertificate',
                    label: 'UG / B.E. Degree Certificate & Marksheets',
                  },
                  {
                    key: 'pgMarksheet',
                    label: 'Post-Graduate / M.Tech / Ph.D Degree Certificate',
                  },
                  {
                    key: 'experienceCertificate',
                    label: 'Previous Teaching / Industry Experience Letters',
                  },
                  {
                    key: 'relievingOrder',
                    label: 'Official Relieving Order & No-Objection Certificate',
                  },
                  {
                    key: 'aadhaarPan',
                    label: 'Aadhaar Card & PAN Card Copies',
                  },
                  {
                    key: 'addressProof',
                    label: 'Permanent Address Proof / Domicile Certificate',
                  },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200/80 p-2.5 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={
                        checklistForm[item.key as keyof typeof checklistForm] as boolean
                      }
                      onChange={(e) =>
                        setChecklistForm({
                          ...checklistForm,
                          [item.key]: e.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-xs font-medium text-slate-800">
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">
                  Update Candidate Stage
                </label>
                <select
                  value={checklistForm.status}
                  onChange={(e) =>
                    setChecklistForm({
                      ...checklistForm,
                      status: e.target.value as CandidateStatus,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs"
                >
                  <option value="OFFER_ACCEPTED">Offer Accepted</option>
                  <option value="DOCUMENTS_SUBMITTED">
                    Documents Submitted & Verified
                  </option>
                  <option value="OFFER_PENDING">Offer Pending</option>
                  <option value="REJECTED">Offer Rejected</option>
                  <option value="WITHDRAWN">Candidate Withdrawn</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowChecklistModal(false)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700"
                >
                  Save Verification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Complete Onboarding & Allocate Employee Code */}
      {showCompleteModal && selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Complete Faculty Onboarding
                </h3>
                <p className="text-xs text-slate-500">
                  Confirm joining and generate JCET employee credentials.
                </p>
              </div>
            </div>

            <form onSubmit={handleCompleteOnboarding} className="mt-4 space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                <div className="font-semibold text-slate-900">
                  {selectedCandidate.firstName} {selectedCandidate.lastName}
                </div>
                <div>Department: {selectedCandidate.department.name}</div>
                <div>Designation: {selectedCandidate.designation.name}</div>
                <div className="mt-1 font-mono text-teal-700">
                  Next sequential code: JCET-{selectedCandidate.department.code}-
                  ***
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">
                  Actual Date of Joining
                </label>
                <input
                  type="date"
                  required
                  value={completeForm.joiningDate}
                  onChange={(e) =>
                    setCompleteForm({
                      ...completeForm,
                      joiningDate: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs"
                />
              </div>

              <div className="rounded-lg border border-slate-200 p-3">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={completeForm.createLoginAccount}
                    onChange={(e) =>
                      setCompleteForm({
                        ...completeForm,
                        createLoginAccount: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    Create Portal Login Account
                  </span>
                </label>

                {completeForm.createLoginAccount && (
                  <div className="mt-2.5">
                    <label className="text-[11px] font-medium text-slate-500">
                      Temporary Password (for first login)
                    </label>
                    <input
                      type="text"
                      value={completeForm.temporaryPassword}
                      onChange={(e) =>
                        setCompleteForm({
                          ...completeForm,
                          temporaryPassword: e.target.value,
                        })
                      }
                      className="mt-1 w-full rounded border border-slate-200 p-1.5 font-mono text-xs"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(false)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  Confirm & Allocate Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
