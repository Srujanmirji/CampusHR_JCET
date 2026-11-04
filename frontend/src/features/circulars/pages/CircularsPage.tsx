import { useEffect, useState } from 'react';
import {
  FileText,
  Search,
  Plus,
  CheckCircle2,
  Download,
  ShieldAlert,
  Users,
  Calendar,
  AlertCircle,
  Eye,
  Check,
} from 'lucide-react';
import { useCan } from '@/features/auth/hooks/useCan';
import {
  acknowledgeCircular,
  createCircular,
  exportComplianceCsv,
  fetchCircularById,
  fetchCircularCompliance,
  fetchCirculars,
  type Circular,
  type CircularCompliance,
} from '../api/circulars';

const CATEGORIES = [
  { key: '', label: 'All Notices' },
  { key: 'ACADEMIC', label: 'Academic' },
  { key: 'ADMINISTRATIVE', label: 'Administrative' },
  { key: 'VTU_NOTIFICATION', label: 'VTU Circulars' },
  { key: 'EXAMINATION', label: 'Exams' },
  { key: 'HOLIDAY', label: 'Holidays' },
  { key: 'EVENT', label: 'Events' },
  { key: 'URGENT', label: 'Urgent' },
];

export default function CircularsPage() {
  const can = useCan();
  const canManage = can('circular.manage');

  const [circulars, setCirculars] = useState<Circular[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Reader Modal State
  const [selectedCircular, setSelectedCircular] = useState<Circular | null>(null);
  const [complianceData, setComplianceData] = useState<CircularCompliance | null>(null);
  const [loadingCompliance, setLoadingCompliance] = useState(false);

  // New Circular Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    content: '',
    category: 'ADMINISTRATIVE',
    priority: 'NORMAL',
    targetAudience: 'ALL',
    targetDepartmentId: '' as string | number,
    attachmentUrl: '',
    attachmentName: '',
  });

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadCirculars = async () => {
    setLoading(true);
    try {
      const res = await fetchCirculars({
        category: selectedCategory || undefined,
        search: searchQuery || undefined,
        pageSize: 50,
      });
      setCirculars(res.data);
      setTotalCount(res.total);
    } catch (err: any) {
      setActionError(err.message || 'Failed to load circulars.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCirculars();
  }, [selectedCategory, searchQuery]);

  const handleOpenCircular = async (circ: Circular) => {
    setSelectedCircular(circ);
    setComplianceData(null);
    try {
      // Fetch fresh circular data which automatically records read receipt
      const fresh = await fetchCircularById(circ.id);
      setSelectedCircular(fresh);
      // Update hasRead in list
      setCirculars((prev) =>
        prev.map((c) => (c.id === circ.id ? { ...c, hasRead: true } : c)),
      );
    } catch {
      // Fallback to already opened
    }
  };

  const handleAcknowledge = async (id: string) => {
    try {
      await acknowledgeCircular(id);
      setSelectedCircular((prev) => (prev ? { ...prev, hasRead: true } : null));
      setCirculars((prev) =>
        prev.map((c) => (c.id === id ? { ...c, hasRead: true } : c)),
      );
      setActionSuccess('Notice acknowledged and recorded in the audit register.');
    } catch (err: any) {
      setActionError(err.message || 'Failed to acknowledge notice.');
    }
  };

  const handleLoadCompliance = async (id: string) => {
    setLoadingCompliance(true);
    try {
      const data = await fetchCircularCompliance(id);
      setComplianceData(data);
    } catch (err: any) {
      setActionError(err.message || 'Failed to load compliance details.');
    } finally {
      setLoadingCompliance(false);
    }
  };

  const handleExportComplianceCsv = async (id: string) => {
    try {
      const blob = await exportComplianceCsv(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `JCET-Circular-${id}-Read-Roster.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setActionError(err.message || 'Failed to export CSV.');
    }
  };

  const handleCreateCircular = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      await createCircular({
        ...createForm,
        targetDepartmentId: createForm.targetDepartmentId
          ? Number(createForm.targetDepartmentId)
          : null,
      });
      setShowCreateModal(false);
      setCreateForm({
        title: '',
        content: '',
        category: 'ADMINISTRATIVE',
        priority: 'NORMAL',
        targetAudience: 'ALL',
        targetDepartmentId: '',
        attachmentUrl: '',
        attachmentName: '',
      });
      setActionSuccess('Official circular published and broadcast dispatched.');
      await loadCirculars();
    } catch (err: any) {
      setActionError(err.message || 'Failed to publish circular.');
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg dark:bg-blue-950/40 dark:text-blue-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Digital Circulars & Institutional Notice Board
                {totalCount > 0 && (
                  <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    {totalCount} notices
                  </span>
                )}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Official JCET administrative circulars, VTU notifications & verifiable read compliance
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canManage && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Publish Circular
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                selectedCategory === cat.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search circulars..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Circular Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm">
          Loading institutional notices and circulars...
        </div>
      ) : circulars.length === 0 ? (
        <div className="p-12 text-center border rounded-xl bg-white dark:bg-slate-800 text-slate-400">
          <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="text-base font-semibold text-slate-700 dark:text-slate-200">
            No circulars found
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Check back later for new college announcements or clear filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {circulars.map((circ) => (
            <div
              key={circ.id}
              onClick={() => handleOpenCircular(circ)}
              className="bg-white dark:bg-slate-800 border rounded-xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {circ.circularNumber}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {circ.priority === 'URGENT' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full">
                        <ShieldAlert className="w-3 h-3" />
                        Urgent
                      </span>
                    )}
                    {circ.hasRead ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                        <Check className="w-3 h-3" />
                        Read
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Unread
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors line-clamp-2">
                  {circ.title}
                </h3>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-3">
                  {circ.content}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    {new Date(circ.publishedAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                  {circ.category.replace('_', ' ')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Circular Reader Modal */}
      {selectedCircular && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border">
            {/* Modal Header */}
            <div className="p-6 border-b flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                    {selectedCircular.circularNumber}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    {selectedCircular.category}
                  </span>
                  {selectedCircular.targetAudience !== 'ALL' && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                      Audience: {selectedCircular.targetAudience.replace('_', ' ')}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-2">
                  {selectedCircular.title}
                </h2>
                <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                  <span>
                    Published on{' '}
                    {new Date(selectedCircular.publishedAt).toLocaleString('en-IN')}
                  </span>
                  {selectedCircular.hasRead && (
                    <span className="text-emerald-600 font-medium flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Read Receipt Acknowledged
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => setSelectedCircular(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-sm text-slate-800 dark:text-slate-200 flex-1">
              <div className="whitespace-pre-wrap leading-relaxed font-sans bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-lg border">
                {selectedCircular.content}
              </div>

              {selectedCircular.attachmentUrl && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-medium text-blue-900 dark:text-blue-200">
                      {selectedCircular.attachmentName || 'Official Attached Document'}
                    </span>
                  </div>
                  <a
                    href={selectedCircular.attachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" /> View / Download
                  </a>
                </div>
              )}

              {/* Compliance Section for Admins / HODs */}
              {canManage && (
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-indigo-500" />
                      Read Receipt Compliance Register
                    </span>
                    {!complianceData && (
                      <button
                        onClick={() => handleLoadCompliance(selectedCircular.id)}
                        disabled={loadingCompliance}
                        className="text-xs font-medium text-indigo-600 hover:underline inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {loadingCompliance ? 'Loading...' : 'Check Reader Compliance'}
                      </button>
                    )}
                  </div>

                  {complianceData && (
                    <div className="space-y-3 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-lg border">
                      <div className="flex items-center justify-between text-xs">
                        <span>
                          <strong>{complianceData.readCount}</strong> of{' '}
                          <strong>{complianceData.eligibleCount}</strong> staff acknowledged
                        </span>
                        <span className="font-bold text-indigo-600">
                          {complianceData.compliancePercentage}% Compliance
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all"
                          style={{
                            width: `${complianceData.compliancePercentage}%`,
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-slate-400">
                          Audited read receipt timestamps with client IP verification
                        </span>
                        <button
                          onClick={() => handleExportComplianceCsv(selectedCircular.id)}
                          className="text-xs font-semibold text-slate-700 dark:text-slate-200 hover:underline inline-flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" /> Export Compliance CSV
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t flex items-center justify-between bg-slate-50 dark:bg-slate-900/40">
              <span className="text-xs text-slate-400">
                Official Document · JCET Academic ERP
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedCircular(null)}
                  className="px-4 py-2 text-sm rounded-lg border hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Close
                </button>
                {!selectedCircular.hasRead && (
                  <button
                    onClick={() => handleAcknowledge(selectedCircular.id)}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white inline-flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    Acknowledge Notice
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Publish Circular Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-lg w-full p-6 shadow-xl border">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Publish Official Circular
            </h3>

            <form onSubmit={handleCreateCircular} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Circular Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Schedule of VTU Practical & Theory Examinations"
                  value={createForm.title}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, title: e.target.value })
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
                    value={createForm.category}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, category: e.target.value })
                    }
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="ADMINISTRATIVE">Administrative</option>
                    <option value="ACADEMIC">Academic</option>
                    <option value="VTU_NOTIFICATION">VTU Circular</option>
                    <option value="EXAMINATION">Examination</option>
                    <option value="HOLIDAY">Holiday</option>
                    <option value="EVENT">Event</option>
                    <option value="URGENT">Urgent Notice</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Priority
                  </label>
                  <select
                    value={createForm.priority}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, priority: e.target.value })
                    }
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High Priority</option>
                    <option value="URGENT">Urgent / Red Alert</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Target Audience
                </label>
                <select
                  value={createForm.targetAudience}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      targetAudience: e.target.value,
                    })
                  }
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="ALL">All College (Teaching & Non-Teaching)</option>
                  <option value="TEACHING_ONLY">Faculty & Teaching Staff Only</option>
                  <option value="NON_TEACHING_ONLY">Non-Teaching Staff Only</option>
                  <option value="DEPARTMENT">Specific Department</option>
                </select>
              </div>

              {createForm.targetAudience === 'DEPARTMENT' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Department ID
                  </label>
                  <input
                    type="number"
                    placeholder="Enter Department ID (e.g. 1 for CSE)"
                    value={createForm.targetDepartmentId}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        targetDepartmentId: e.target.value,
                      })
                    }
                    required
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Circular Content / Body
                </label>
                <textarea
                  placeholder="Draft the official notification details..."
                  rows={5}
                  value={createForm.content}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, content: e.target.value })
                  }
                  required
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Optional Document Attachment URL
                </label>
                <input
                  type="text"
                  placeholder="https://... or /uploads/documents/..."
                  value={createForm.attachmentUrl}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      attachmentUrl: e.target.value,
                    })
                  }
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-2 text-sm rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Publish Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
