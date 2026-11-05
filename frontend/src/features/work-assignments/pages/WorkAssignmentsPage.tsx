import { useEffect, useState } from 'react';
import {
  ClipboardCheck,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  ShieldAlert,
  Send,
  Eye,
  Check,
  RotateCcw,
} from 'lucide-react';
import { useCan } from '@/features/auth/hooks/useCan';
import { listEmployees } from '@/features/employees/api/employees';
import {
  createWorkAssignments,
  fetchWorkAssignments,
  reviewWorkAssignment,
  updateWorkStatus,
  type WorkAssignment,
  type WorkMetrics,
} from '../api/workAssignments';

const CATEGORIES = [
  { key: 'ACADEMIC', label: 'Academic' },
  { key: 'NBA_NAAC', label: 'NBA / NAAC Accreditation' },
  { key: 'EXAMINATION', label: 'Exam Cell' },
  { key: 'STUDENT_AFFAIR', label: 'Student Affairs' },
  { key: 'EVENT', label: 'Campus Event' },
  { key: 'ADMINISTRATIVE', label: 'Administrative' },
  { key: 'OTHER', label: 'General / Other' },
];

export default function WorkAssignmentsPage() {
  const can = useCan();
  const canAssign = can('work_assignment.assign');

  const [activeView, setActiveView] = useState<'assigned-to-me' | 'assigned-by-me'>(
    canAssign ? 'assigned-by-me' : 'assigned-to-me',
  );

  const [assignments, setAssignments] = useState<WorkAssignment[]>([]);
  const [metrics, setMetrics] = useState<WorkMetrics>({
    assigned: 0,
    inProgress: 0,
    submitted: 0,
    completed: 0,
  });
  const [loading, setLoading] = useState(true);

  // Available employees for assigner dropdown
  const [employees, setEmployees] = useState<
    Array<{ id: string; employeeCode: string; firstName: string; lastName: string; department?: { code: string } }>
  >([]);

  // Modals state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<WorkAssignment | null>(null);

  // Form states
  const [assignForm, setAssignForm] = useState({
    title: '',
    description: '',
    category: 'ADMINISTRATIVE',
    priority: 'NORMAL',
    assignedToIds: [] as string[],
    dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 16),
    attachmentUrl: '',
    attachmentName: '',
  });

  const [submitForm, setSubmitForm] = useState({
    submissionNotes: '',
    submissionAttachmentUrl: '',
  });

  const [reviewForm, setReviewForm] = useState({
    feedback: '',
  });

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchWorkAssignments({ view: activeView, pageSize: 50 });
      setAssignments(res.data);
      setMetrics(res.metrics);
    } catch (err: any) {
      setActionError(err.message || 'Failed to load assignments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeView]);

  useEffect(() => {
    if (canAssign) {
      listEmployees({ status: 'ACTIVE', page: 1, pageSize: 200 })
        .then((res) => {
          setEmployees(res.data);
        })
        .catch(() => {});
    }
  }, [canAssign]);

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    if (assignForm.assignedToIds.length === 0) {
      setActionError('Please select at least one faculty member.');
      return;
    }
    try {
      await createWorkAssignments({
        ...assignForm,
        dueDate: new Date(assignForm.dueDate).toISOString(),
      });
      setShowAssignModal(false);
      setAssignForm({
        title: '',
        description: '',
        category: 'ADMINISTRATIVE',
        priority: 'NORMAL',
        assignedToIds: [],
        dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 16),
        attachmentUrl: '',
        attachmentName: '',
      });
      setActionSuccess('Work assigned successfully. Real-time notification dispatched.');
      await loadData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to assign work.');
    }
  };

  const handleStartWork = async (id: string) => {
    try {
      await updateWorkStatus(id, { status: 'IN_PROGRESS' });
      setActionSuccess('Task marked as In Progress.');
      await loadData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update task.');
    }
  };

  const handleSubmitWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    setActionError(null);
    try {
      await updateWorkStatus(selectedTask.id, {
        status: 'SUBMITTED',
        submissionNotes: submitForm.submissionNotes,
        submissionAttachmentUrl: submitForm.submissionAttachmentUrl || undefined,
      });
      setShowSubmitModal(false);
      setSelectedTask(null);
      setSubmitForm({ submissionNotes: '', submissionAttachmentUrl: '' });
      setActionSuccess('Work submitted for review. Assigner notified.');
      await loadData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to submit work.');
    }
  };

  const handleReviewDecision = async (decision: 'APPROVE' | 'REQUEST_REVISION') => {
    if (!selectedTask) return;
    setActionError(null);
    try {
      await reviewWorkAssignment(selectedTask.id, {
        decision,
        feedback: reviewForm.feedback,
      });
      setShowReviewModal(false);
      setSelectedTask(null);
      setReviewForm({ feedback: '' });
      setActionSuccess(
        decision === 'APPROVE'
          ? 'Work accepted and marked as completed.'
          : 'Revision requested. Faculty notified.',
      );
      await loadData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to submit review.');
    }
  };

  const toggleAssignee = (id: string) => {
    setAssignForm((prev) => {
      const exists = prev.assignedToIds.includes(id);
      return {
        ...prev,
        assignedToIds: exists
          ? prev.assignedToIds.filter((item) => item !== id)
          : [...prev.assignedToIds, id],
      };
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg dark:bg-indigo-950/40 dark:text-indigo-400">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Official Work & Task Delegation
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Institutional task assignments, real-time alerts, proof submissions & HOD/Principal review
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canAssign && (
            <button
              onClick={() => setShowAssignModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Assign Work
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {actionSuccess && (
        <div className="p-4 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-2 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-4 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 border rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase">Assigned / New</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{metrics.assigned}</div>
          <div className="text-xs text-slate-400 mt-0.5">Awaiting start</div>
        </div>

        <div className="bg-white dark:bg-slate-800 border rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase">In Progress</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{metrics.inProgress}</div>
          <div className="text-xs text-slate-400 mt-0.5">Currently being worked on</div>
        </div>

        <div className="bg-white dark:bg-slate-800 border rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase">Submitted for Review</div>
          <div className="text-2xl font-bold text-purple-600 mt-1">{metrics.submitted}</div>
          <div className="text-xs text-slate-400 mt-0.5">Ready for sign-off</div>
        </div>

        <div className="bg-white dark:bg-slate-800 border rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase">Completed</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{metrics.completed}</div>
          <div className="text-xs text-slate-400 mt-0.5">Approved & archived</div>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveView('assigned-to-me')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeView === 'assigned-to-me'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          My Assigned Work
        </button>

        {canAssign && (
          <button
            onClick={() => setActiveView('assigned-by-me')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeView === 'assigned-by-me'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Work Delegated by Me
          </button>
        )}
      </div>

      {/* Task Cards List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm">
          Loading assigned tasks...
        </div>
      ) : assignments.length === 0 ? (
        <div className="p-12 text-center border rounded-xl bg-white dark:bg-slate-800 text-slate-400">
          <ClipboardCheck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="text-base font-semibold text-slate-700 dark:text-slate-200">
            No work assignments found
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {activeView === 'assigned-to-me'
              ? 'You have no pending tasks assigned at this moment.'
              : 'You have not delegated any tasks yet. Click "Assign Work" above.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((task) => (
            <div
              key={task.id}
              className="bg-white dark:bg-slate-800 border rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {task.category.replace('_', ' ')}
                  </span>

                  {task.priority === 'URGENT' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full">
                      <ShieldAlert className="w-3 h-3" /> Urgent
                    </span>
                  )}
                  {task.priority === 'HIGH' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
                      High Priority
                    </span>
                  )}

                  {task.status === 'ASSIGNED' && (
                    <span className="text-[11px] font-medium text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-full">
                      Assigned
                    </span>
                  )}
                  {task.status === 'IN_PROGRESS' && (
                    <span className="text-[11px] font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full">
                      In Progress
                    </span>
                  )}
                  {task.status === 'SUBMITTED' && (
                    <span className="text-[11px] font-medium text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-0.5 rounded-full">
                      Submitted for Review
                    </span>
                  )}
                  {task.status === 'COMPLETED' && (
                    <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full">
                      Completed & Approved
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {task.title}
                </h3>

                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                  {task.description}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Due: {new Date(task.dueDate).toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    {activeView === 'assigned-by-me' ? (
                      <span>
                        Assigned to:{' '}
                        <strong>
                          {task.assignedTo?.firstName} {task.assignedTo?.lastName} (
                          {task.assignedTo?.employeeCode})
                        </strong>
                      </span>
                    ) : (
                      <span>
                        Assigned by:{' '}
                        <strong>
                          {task.assignedBy?.employee
                            ? `${task.assignedBy.employee.firstName} ${task.assignedBy.employee.lastName}`
                            : task.assignedBy?.email}
                        </strong>
                      </span>
                    )}
                  </div>

                  {task.attachmentUrl && (
                    <a
                      href={task.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 hover:underline flex items-center gap-1 font-medium"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Attachment
                    </a>
                  )}
                </div>

                {task.submissionNotes && (
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-900/40 border rounded text-xs mt-2 text-slate-700 dark:text-slate-300">
                    <strong>Submission Note:</strong> {task.submissionNotes}
                    {task.submissionAttachmentUrl && (
                      <div className="mt-1">
                        <a
                          href={task.submissionAttachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:underline font-medium"
                        >
                          View Submitted Proof / Document ↗
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {task.reviewFeedback && (
                  <div className="p-2.5 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 rounded text-xs mt-1 text-purple-900 dark:text-purple-200">
                    <strong>Reviewer Feedback:</strong> {task.reviewFeedback}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Faculty Actions */}
                {activeView === 'assigned-to-me' && (
                  <>
                    {task.status === 'ASSIGNED' && (
                      <button
                        onClick={() => handleStartWork(task.id)}
                        className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        Start Work
                      </button>
                    )}
                    {task.status === 'IN_PROGRESS' && (
                      <button
                        onClick={() => {
                          setSelectedTask(task);
                          setShowSubmitModal(true);
                        }}
                        className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white inline-flex items-center gap-1"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Submit Work
                      </button>
                    )}
                  </>
                )}

                {/* Assigner Actions */}
                {activeView === 'assigned-by-me' && task.status === 'SUBMITTED' && (
                  <button
                    onClick={() => {
                      setSelectedTask(task);
                      setShowReviewModal(true);
                    }}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-700 text-white inline-flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Review Submission
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assign Work Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-xl w-full p-6 shadow-xl border max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-indigo-600" />
              Delegate Work to Faculty
            </h3>

            <form onSubmit={handleCreateAssignment} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Task Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Prepare NBA Criterion 3 Documentation"
                  value={assignForm.title}
                  onChange={(e) =>
                    setAssignForm({ ...assignForm, title: e.target.value })
                  }
                  required
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Category
                  </label>
                  <select
                    value={assignForm.category}
                    onChange={(e) =>
                      setAssignForm({ ...assignForm, category: e.target.value })
                    }
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.key} value={cat.key}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Priority
                  </label>
                  <select
                    value={assignForm.priority}
                    onChange={(e) =>
                      setAssignForm({ ...assignForm, priority: e.target.value })
                    }
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High Priority</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Detailed Instructions / Work Brief
                </label>
                <textarea
                  placeholder="Describe the requirements, expected deliverables, and guidelines..."
                  rows={4}
                  value={assignForm.description}
                  onChange={(e) =>
                    setAssignForm({
                      ...assignForm,
                      description: e.target.value,
                    })
                  }
                  required
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Faculty Member(s)
                </label>
                <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1 bg-slate-50 dark:bg-slate-900">
                  {employees.map((emp) => (
                    <label
                      key={emp.id}
                      className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-xs cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={assignForm.assignedToIds.includes(emp.id)}
                        onChange={() => toggleAssignee(emp.id)}
                        className="rounded text-indigo-600"
                      />
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {emp.firstName} {emp.lastName}
                      </span>
                      <span className="text-slate-400">
                        ({emp.employeeCode} · {emp.department?.code ?? '—'})
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Submission Deadline
                </label>
                <input
                  type="datetime-local"
                  value={assignForm.dueDate}
                  onChange={(e) =>
                    setAssignForm({ ...assignForm, dueDate: e.target.value })
                  }
                  required
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Reference Document URL (Optional)
                </label>
                <input
                  type="text"
                  placeholder="https://drive.google.com/... or guideline PDF link"
                  value={assignForm.attachmentUrl}
                  onChange={(e) =>
                    setAssignForm({
                      ...assignForm,
                      attachmentUrl: e.target.value,
                    })
                  }
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-3.5 py-2 text-sm rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Dispatch Work Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submit Work Modal */}
      {showSubmitModal && selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6 shadow-xl border">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-indigo-600" />
              Submit Completed Work
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Task: <strong>{selectedTask.title}</strong>
            </p>

            <form onSubmit={handleSubmitWork} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Completion Summary / Notes
                </label>
                <textarea
                  placeholder="Summarize what was completed..."
                  rows={4}
                  value={submitForm.submissionNotes}
                  onChange={(e) =>
                    setSubmitForm({
                      ...submitForm,
                      submissionNotes: e.target.value,
                    })
                  }
                  required
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Proof / File URL (Optional)
                </label>
                <input
                  type="text"
                  placeholder="https://drive.google.com/... or uploaded document link"
                  value={submitForm.submissionAttachmentUrl}
                  onChange={(e) =>
                    setSubmitForm({
                      ...submitForm,
                      submissionAttachmentUrl: e.target.value,
                    })
                  }
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-3.5 py-2 text-sm rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Submit for Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Submission Modal */}
      {showReviewModal && selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6 shadow-xl border">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-purple-600" />
              Review Work Submission
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Task: <strong>{selectedTask.title}</strong> by {selectedTask.assignedTo?.firstName}{' '}
              {selectedTask.assignedTo?.lastName}
            </p>

            <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900 rounded border text-xs text-slate-700 dark:text-slate-300">
              <strong>Submission Notes:</strong>
              <p className="mt-1">{selectedTask.submissionNotes || 'No notes provided.'}</p>
              {selectedTask.submissionAttachmentUrl && (
                <div className="mt-2">
                  <a
                    href={selectedTask.submissionAttachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:underline font-semibold"
                  >
                    View Submitted Document / Link ↗
                  </a>
                </div>
              )}
            </div>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Reviewer Feedback / Comments
              </label>
              <textarea
                placeholder="Optional feedback for the faculty member..."
                rows={3}
                value={reviewForm.feedback}
                onChange={(e) =>
                  setReviewForm({ ...reviewForm, feedback: e.target.value })
                }
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t mt-4">
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="px-3.5 py-2 text-sm rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleReviewDecision('REQUEST_REVISION')}
                className="px-3.5 py-2 text-sm font-medium rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 inline-flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Request Revision
              </button>
              <button
                type="button"
                onClick={() => handleReviewDecision('APPROVE')}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                Approve & Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
