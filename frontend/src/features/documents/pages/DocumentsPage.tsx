import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageTransition } from '@/components/shared/PageTransition';
import { MetricCard } from '@/components/shared/MetricCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Files,
  FileCheck2,
  Clock,
  AlertTriangle,
  Upload,
  Search,
  Eye,
  Download,
  Trash2,
  CheckCircle2,
  XCircle,
  FilterX,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { useCan } from '@/features/auth/hooks/useCan';
import {
  downloadDocument,
  DOCUMENT_CATEGORY_MAP,
  useDocuments,
  usePendingDocumentsCount,
  useDeleteDocument,
  type DocumentCategoryKey,
  type DocumentItem,
  type DocumentStatusKey,
} from '../api/documents';
import { DocumentUploadDialog } from '../components/DocumentUploadDialog';
import { DocumentPreviewDialog } from '../components/DocumentPreviewDialog';
import { DocumentReviewDialog } from '../components/DocumentReviewDialog';

export default function DocumentsPage() {
  const can = useCan();
  const canVerify = can('document.verify');
  const canUpload = can('document.upload');

  // Filters & State
  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [reviewDoc, setReviewDoc] = useState<DocumentItem | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  // Queries
  const { data: documentsData, isLoading } = useDocuments({
    category:
      categoryFilter !== 'ALL'
        ? (categoryFilter as DocumentCategoryKey)
        : undefined,
    status:
      activeTab === 'pending'
        ? 'PENDING'
        : statusFilter !== 'ALL'
          ? (statusFilter as DocumentStatusKey)
          : undefined,
    search: search.trim() || undefined,
    limit: 100,
  });

  const { data: pendingCount = 0 } = usePendingDocumentsCount();
  const deleteMutation = useDeleteDocument();

  const documents = useMemo(
    () => documentsData?.data ?? [],
    [documentsData?.data],
  );

  // Metrics
  const metrics = useMemo(() => {
    const total = documentsData?.total ?? 0;
    const verified = documents.filter((d) => d.status === 'VERIFIED').length;
    const pending = activeTab === 'pending' ? documents.length : pendingCount;

    // Check expiring in next 60 days
    const now = new Date();
    const in60Days = new Date();
    in60Days.setDate(now.getDate() + 60);

    const expiring = documents.filter((d) => {
      if (!d.expiryDate) return false;
      const exp = new Date(d.expiryDate);
      return exp >= now && exp <= in60Days;
    }).length;

    return { total, verified, pending, expiring };
  }, [documentsData?.total, documents, pendingCount, activeTab]);

  const handleOpenPreview = (doc: DocumentItem) => {
    setPreviewDoc(doc);
    setPreviewOpen(true);
  };

  const handleOpenReview = (doc: DocumentItem) => {
    setReviewDoc(doc);
    setReviewOpen(true);
  };

  const handleDelete = (doc: DocumentItem) => {
    if (confirm(`Are you sure you want to delete "${doc.title}"?`)) {
      deleteMutation.mutate(doc.id, {
        onSuccess: () => toast.success('Document deleted.'),
        onError: (err: unknown) =>
          toast.error(err instanceof Error ? err.message : 'Delete failed.'),
      });
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setCategoryFilter('ALL');
    setStatusFilter('ALL');
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title="Document Management System"
          description="Institutional repository for faculty credentials, degrees, experience letters, and accreditation records."
          action={
            <div className="flex items-center gap-2">
              {canUpload && (
                <Button
                  onClick={() => setUploadOpen(true)}
                  className="gap-2 shadow-sm"
                >
                  <Upload className="h-4 w-4" />
                  Upload Document
                </Button>
              )}
            </div>
          }
        />

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Total Documents"
            value={metrics.total}
            icon={Files}
            index={0}
            detail="Stored institutional files"
          />
          <MetricCard
            label="Verified Credentials"
            value={metrics.verified}
            icon={FileCheck2}
            index={1}
            detail="Approved by HR Administration"
          />
          <MetricCard
            label="Pending Review"
            value={metrics.pending}
            icon={Clock}
            index={2}
            detail="Awaiting HR verification"
          />
          <MetricCard
            label="Expiring Soon"
            value={metrics.expiring}
            icon={AlertTriangle}
            index={3}
            detail="Action required within 60 days"
          />
        </div>

        {/* Tabs & Filters Bar */}
        <div className="bg-card border rounded-xl p-4 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
            {/* View Tabs */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'all'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                All Documents
              </button>

              {canVerify && (
                <button
                  type="button"
                  onClick={() => setActiveTab('pending')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'pending'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <ShieldCheck className="h-4 w-4" />
                  Verification Queue
                  {pendingCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-white text-amber-700 font-bold">
                      {pendingCount}
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Total Results Counter */}
            <span className="text-xs text-muted-foreground">
              Showing {documents.length} document
              {documents.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Search & Filter Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            {/* Search */}
            <div className="sm:col-span-5 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search title, document type, employee..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Category Filter */}
            <div className="sm:col-span-3">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Categories</SelectItem>
                  {Object.entries(DOCUMENT_CATEGORY_MAP).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter (only active on 'all' tab) */}
            {activeTab === 'all' && (
              <div className="sm:col-span-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="VERIFIED">Verified</SelectItem>
                    <SelectItem value="PENDING">Pending Review</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Reset */}
            {(search || categoryFilter !== 'ALL' || statusFilter !== 'ALL') && (
              <div className="sm:col-span-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleResetFilters}
                  title="Reset filters"
                >
                  <FilterX className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Documents Grid */}
        {isLoading ? (
          <div className="py-16 text-center text-muted-foreground">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
            Loading documents...
          </div>
        ) : documents.length === 0 ? (
          <div className="bg-card border rounded-xl p-12 text-center space-y-3 shadow-sm">
            <Files className="h-12 w-12 text-muted-foreground mx-auto" />
            <h3 className="text-base font-semibold text-foreground">
              No documents found
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {activeTab === 'pending'
                ? 'Great job! There are currently no pending documents awaiting HR verification.'
                : 'Upload degree certificates, experience letters, or identity records to populate the vault.'}
            </p>
            {canUpload && activeTab === 'all' && (
              <Button onClick={() => setUploadOpen(true)} className="mt-2">
                <Upload className="h-4 w-4 mr-2" />
                Upload First Document
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => {
              return (
                <div
                  key={doc.id}
                  className="bg-card border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    {/* Category & Status Row */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                        {DOCUMENT_CATEGORY_MAP[doc.category]}
                      </span>

                      {doc.status === 'VERIFIED' && (
                        <Badge className="bg-emerald-600 text-white text-[11px] gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Verified
                        </Badge>
                      )}
                      {doc.status === 'PENDING' && (
                        <Badge
                          variant="outline"
                          className="text-amber-700 bg-amber-50 text-[11px] gap-1"
                        >
                          <Clock className="h-3 w-3" />
                          Pending
                        </Badge>
                      )}
                      {doc.status === 'REJECTED' && (
                        <Badge
                          variant="destructive"
                          className="text-[11px] gap-1"
                        >
                          <XCircle className="h-3 w-3" />
                          Rejected
                        </Badge>
                      )}
                    </div>

                    {/* Title & Document Type */}
                    <div>
                      <h4
                        className="font-bold text-sm text-foreground line-clamp-1"
                        title={doc.title}
                      >
                        {doc.title}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {doc.documentType}
                      </p>
                    </div>

                    {/* Employee Info */}
                    <div className="bg-slate-50 border rounded-lg p-2 text-xs flex items-center justify-between">
                      <span className="font-medium text-slate-800">
                        {doc.employee.firstName} {doc.employee.lastName}
                      </span>
                      <span className="text-muted-foreground font-mono">
                        {doc.employee.employeeCode} ·{' '}
                        {doc.employee.department.code}
                      </span>
                    </div>

                    {/* Expiry / Rejection Warnings */}
                    {doc.status === 'REJECTED' && doc.reviewNote && (
                      <div className="text-xs text-rose-700 bg-rose-50 p-2 rounded border border-rose-200">
                        <span className="font-semibold">Reason: </span>
                        {doc.reviewNote}
                      </div>
                    )}
                    {doc.expiryDate && (
                      <p className="text-[11px] text-amber-700 font-medium">
                        Expires: {new Date(doc.expiryDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenPreview(doc)}
                        className="h-8 px-2 text-xs gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Preview
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-11 px-2 text-xs gap-1"
                        onClick={() =>
                          void downloadDocument(doc).catch(() =>
                            toast.error('Document download failed. Try again.'),
                          )
                        }
                      >
                        <Download className="h-3.5 w-3.5" /> Download
                      </Button>
                    </div>

                    <div className="flex items-center gap-1">
                      {canVerify && (
                        <Button
                          size="sm"
                          onClick={() => handleOpenReview(doc)}
                          className="h-8 px-2.5 text-xs gap-1 bg-blue-600 hover:bg-blue-700"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Verify
                        </Button>
                      )}

                      {/* Delete (allowed for pending docs or admins) */}
                      {(doc.status !== 'VERIFIED' || canVerify) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(doc)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600"
                          title="Delete Document"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modals */}
        <DocumentUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
        <DocumentPreviewDialog
          document={previewDoc}
          open={previewOpen}
          onOpenChange={setPreviewOpen}
        />
        <DocumentReviewDialog
          document={reviewDoc}
          open={reviewOpen}
          onOpenChange={setReviewOpen}
        />
      </div>
    </PageTransition>
  );
}
