import { useEffect, useState } from 'react';
import {
  GraduationCap,
  CalendarCheck2,
  Users,
  Repeat2,
  Download,
  Plus,
  Sparkles,
  AlertCircle,
  Clock,
  CheckCircle2,
  Building,
  Check,
  X,
} from 'lucide-react';
import { useCan } from '@/features/auth/hooks/useCan';
import { useSession } from '@/features/auth/hooks/useSession';
import {
  autoAllotExamDuties,
  createExamSession,
  decideDutySwap,
  exportExamDutyCsv,
  fetchExamDuties,
  fetchExamSessions,
  requestDutySwap,
  type ExamDuty,
  type ExamSession,
} from '../api/examDuty';

export default function ExamDutyPage() {
  const session = useSession();
  const user = session.status === 'signedIn' ? session.user : null;
  const can = useCan();
  const canManage = can('exam_duty.manage');

  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [duties, setDuties] = useState<ExamDuty[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'roster' | 'my-duties'>('roster');

  // Modals state
  const [showAutoAllotModal, setShowAutoAllotModal] = useState(false);
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [selectedDutyForSwap, setSelectedDutyForSwap] = useState<ExamDuty | null>(null);

  // Form states
  const [newSessionForm, setNewSessionForm] = useState({
    name: '',
    academicYear: '2026-27',
    examType: 'VTU_SEMESTER',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
    notes: '',
  });

  const [autoAllotForm, setAutoAllotForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    sessionTime: 'MORNING' as 'MORNING' | 'AFTERNOON',
    reportingTime: '09:00 AM',
    roomInput: '101, 102, 103, 104, 105',
  });

  const [swapForm, setSwapForm] = useState({
    swapWithFacultyId: '',
    reason: '',
  });

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const sessList = await fetchExamSessions();
      setSessions(sessList);
      const activeSess = sessList.find((s) => s.status === 'ACTIVE') ?? sessList[0];
      const sid = selectedSessionId || activeSess?.id || '';
      setSelectedSessionId(sid);

      if (sid) {
        const dutyList = await fetchExamDuties({ sessionId: sid });
        setDuties(dutyList);
      } else {
        setDuties([]);
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to load exam duties.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedSessionId]);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      const created = await createExamSession(newSessionForm);
      setShowNewSessionModal(false);
      setSelectedSessionId(created.id);
      setActionSuccess('Exam session successfully created.');
      await loadData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to create exam session.');
    }
  };

  const handleAutoAllot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId) return;
    setActionError(null);
    try {
      const roomIds = autoAllotForm.roomInput
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n) && n > 0);

      if (roomIds.length === 0) {
        setActionError('Please specify at least one valid room number.');
        return;
      }

      const res = await autoAllotExamDuties({
        sessionId: selectedSessionId,
        date: autoAllotForm.date,
        sessionTime: autoAllotForm.sessionTime,
        reportingTime: autoAllotForm.reportingTime,
        roomIds,
      });

      setShowAutoAllotModal(false);
      setActionSuccess(
        `Fair Allotment completed: ${res.allottedCount} faculty successfully assigned to ${roomIds.length} examination halls.`,
      );
      await loadData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to run auto-allotment.');
    }
  };

  const handleRequestSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDutyForSwap) return;
    setActionError(null);
    try {
      await requestDutySwap(selectedDutyForSwap.id, {
        swapWithFacultyId: swapForm.swapWithFacultyId,
        reason: swapForm.reason,
      });
      setShowSwapModal(false);
      setSelectedDutyForSwap(null);
      setSwapForm({ swapWithFacultyId: '', reason: '' });
      setActionSuccess('Swap request submitted. Awaiting HOD / Chief Superintendent review.');
      await loadData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to request duty swap.');
    }
  };

  const handleDecideSwap = async (dutyId: string, decision: 'APPROVED' | 'REJECTED') => {
    setActionError(null);
    try {
      await decideDutySwap(dutyId, {
        decision,
        remarks: decision === 'APPROVED' ? 'Approved by Examination Cell' : 'Rejected',
      });
      setActionSuccess(`Swap request ${decision.toLowerCase()} successfully.`);
      await loadData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to process swap decision.');
    }
  };

  const handleExportCsv = async () => {
    try {
      const blob = await exportExamDutyCsv(selectedSessionId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `JCET-Exam-Duty-Roster-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setActionError(err.message || 'Failed to export CSV.');
    }
  };

  // Filter for 'my-duties'
  const myEmployeeId = user?.employeeId;
  const myDuties = duties.filter((d) => d.facultyId === myEmployeeId);
  const displayDuties = activeTab === 'my-duties' ? myDuties : duties;

  return (
    <div className="space-y-6 p-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg dark:bg-indigo-950/40 dark:text-indigo-400">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Exam Duty & Invigilation Allotment
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                VTU semester & internal examination duty scheduling, fair auto-allotment & duty swaps
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {sessions.length > 0 && (
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="text-sm border rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 font-medium"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.academicYear})
                </option>
              ))}
            </select>
          )}

          {canManage && (
            <>
              <button
                onClick={() => setShowNewSessionModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
              >
                <Plus className="w-4 h-4" />
                New Exam
              </button>

              <button
                onClick={() => setShowAutoAllotModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              >
                <Sparkles className="w-4 h-4" />
                Fair Auto-Allot
              </button>
            </>
          )}

          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
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

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Total Duties Allotted</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {duties.length}
          </div>
          <div className="mt-1 text-xs text-slate-400">Current exam schedule</div>
        </div>

        <div className="bg-white dark:bg-slate-800 border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>My Assigned Duties</span>
            <CalendarCheck2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {myDuties.length}
          </div>
          <div className="mt-1 text-xs text-slate-400">Duties requiring your attendance</div>
        </div>

        <div className="bg-white dark:bg-slate-800 border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Pending Swap Requests</span>
            <Repeat2 className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {duties.filter((d) => d.status === 'SWAP_REQUESTED').length}
          </div>
          <div className="mt-1 text-xs text-slate-400">Requires HOD / Admin approval</div>
        </div>

        <div className="bg-white dark:bg-slate-800 border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Examination Halls</span>
            <Building className="w-4 h-4 text-sky-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {new Set(duties.map((d) => d.roomId).filter(Boolean)).size}
          </div>
          <div className="mt-1 text-xs text-slate-400">Active rooms mapped</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('roster')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'roster'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Allotment Roster ({duties.length})
        </button>
        <button
          onClick={() => setActiveTab('my-duties')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'my-duties'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          My Exam Duties ({myDuties.length})
        </button>
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-slate-800 border rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            Loading examination duty roster...
          </div>
        ) : displayDuties.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <GraduationCap className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <p className="text-base font-semibold text-slate-700 dark:text-slate-200">
              No exam duties found for this view
            </p>
            <p className="text-sm mt-1 text-slate-400">
              {canManage
                ? 'Click "Fair Auto-Allot" above to automatically distribute invigilation duties.'
                : 'You have no exam duties scheduled in this session.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Date & Session</th>
                  <th className="py-3 px-4">Room / Hall</th>
                  <th className="py-3 px-4">Faculty Member</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {displayDuties.map((d) => (
                  <tr
                    key={d.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {new Date(d.date).toLocaleDateString('en-IN', {
                          weekday: 'short',
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {d.sessionTime === 'MORNING'
                            ? '09:30 AM – 12:30 PM'
                            : '02:00 PM – 05:00 PM'}{' '}
                          (Report by {d.reportingTime})
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                      {d.room ? d.room.name : `Hall ${d.roomId ?? 'Unassigned'}`}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {d.faculty?.firstName} {d.faculty?.lastName}
                      </div>
                      <div className="text-xs text-slate-400">
                        {d.faculty?.employeeCode} · {d.faculty?.designation?.name}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                      {d.faculty?.department?.code ?? '—'}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {d.role.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {d.status === 'ASSIGNED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          Assigned
                        </span>
                      )}
                      {d.status === 'SWAP_REQUESTED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                          <Repeat2 className="w-3 h-3" />
                          Swap Requested
                        </span>
                      )}
                      {d.status === 'SWAPPED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                          <Check className="w-3 h-3" />
                          Swapped
                        </span>
                      )}
                      {d.status === 'CONFIRMED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          Confirmed
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {/* Action for faculty: Request Swap */}
                      {d.facultyId === myEmployeeId && d.status === 'ASSIGNED' && (
                        <button
                          onClick={() => {
                            setSelectedDutyForSwap(d);
                            setShowSwapModal(true);
                          }}
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 hover:underline mr-2"
                        >
                          Request Swap
                        </button>
                      )}

                      {/* Actions for HOD/Admin: Approve/Reject Swap */}
                      {canManage && d.status === 'SWAP_REQUESTED' && (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleDecideSwap(d.id, 'APPROVED')}
                            className="p-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400"
                            title="Approve Swap"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDecideSwap(d.id, 'REJECTED')}
                            className="p-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-400"
                            title="Reject Swap"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Auto-Allot Modal */}
      {showAutoAllotModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6 shadow-xl border">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              Fair Auto-Allotment Engine
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Select date, session time, and room IDs. The algorithm prioritizes faculty with lowest previous duties and excludes faculty on approved leave.
            </p>

            <form onSubmit={handleAutoAllot} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Exam Date
                </label>
                <input
                  type="date"
                  value={autoAllotForm.date}
                  onChange={(e) =>
                    setAutoAllotForm({ ...autoAllotForm, date: e.target.value })
                  }
                  required
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Session Time
                  </label>
                  <select
                    value={autoAllotForm.sessionTime}
                    onChange={(e) =>
                      setAutoAllotForm({
                        ...autoAllotForm,
                        sessionTime: e.target.value as any,
                      })
                    }
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700"
                  >
                    <option value="MORNING">Morning (09:30 AM)</option>
                    <option value="AFTERNOON">Afternoon (02:00 PM)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Reporting Time
                  </label>
                  <input
                    type="text"
                    value={autoAllotForm.reportingTime}
                    onChange={(e) =>
                      setAutoAllotForm({
                        ...autoAllotForm,
                        reportingTime: e.target.value,
                      })
                    }
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Room IDs / Examination Halls (Comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 101, 102, 103, 104, 105"
                  value={autoAllotForm.roomInput}
                  onChange={(e) =>
                    setAutoAllotForm({
                      ...autoAllotForm,
                      roomInput: e.target.value,
                    })
                  }
                  required
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAutoAllotModal(false)}
                  className="px-3.5 py-2 text-sm rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Run Allotment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Session Modal */}
      {showNewSessionModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6 shadow-xl border">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Create New Examination Schedule
            </h3>

            <form onSubmit={handleCreateSession} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Exam Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. VTU Dec 2026 Semester Examinations"
                  value={newSessionForm.name}
                  onChange={(e) =>
                    setNewSessionForm({ ...newSessionForm, name: e.target.value })
                  }
                  required
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Academic Year
                  </label>
                  <input
                    type="text"
                    placeholder="2026-27"
                    value={newSessionForm.academicYear}
                    onChange={(e) =>
                      setNewSessionForm({
                        ...newSessionForm,
                        academicYear: e.target.value,
                      })
                    }
                    required
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Exam Type
                  </label>
                  <select
                    value={newSessionForm.examType}
                    onChange={(e) =>
                      setNewSessionForm({
                        ...newSessionForm,
                        examType: e.target.value as any,
                      })
                    }
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="VTU_SEMESTER">VTU Semester</option>
                    <option value="INTERNAL_ASSESSMENT">Internal Assessment (IA)</option>
                    <option value="LAB_EXAM">Lab Examination</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={newSessionForm.startDate}
                    onChange={(e) =>
                      setNewSessionForm({
                        ...newSessionForm,
                        startDate: e.target.value,
                      })
                    }
                    required
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={newSessionForm.endDate}
                    onChange={(e) =>
                      setNewSessionForm({
                        ...newSessionForm,
                        endDate: e.target.value,
                      })
                    }
                    required
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowNewSessionModal(false)}
                  className="px-3.5 py-2 text-sm rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Create Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Duty Swap Modal */}
      {showSwapModal && selectedDutyForSwap && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6 shadow-xl border">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Repeat2 className="w-5 h-5 text-indigo-600" />
              Request Invigilation Duty Swap
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Duty on {new Date(selectedDutyForSwap.date).toLocaleDateString()} (
              {selectedDutyForSwap.sessionTime}) at Hall {selectedDutyForSwap.roomId}.
            </p>

            <form onSubmit={handleRequestSwap} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Substitute Faculty ID / UUID
                </label>
                <input
                  type="text"
                  placeholder="Enter colleague's employee UUID"
                  value={swapForm.swapWithFacultyId}
                  onChange={(e) =>
                    setSwapForm({ ...swapForm, swapWithFacultyId: e.target.value })
                  }
                  required
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Reason for Swap
                </label>
                <textarea
                  placeholder="e.g. Personal emergency, University committee meeting"
                  rows={3}
                  value={swapForm.reason}
                  onChange={(e) =>
                    setSwapForm({ ...swapForm, reason: e.target.value })
                  }
                  required
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowSwapModal(false)}
                  className="px-3.5 py-2 text-sm rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Submit Swap Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
