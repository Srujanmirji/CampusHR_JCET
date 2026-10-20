import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, ExternalLink, FileText, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { DOCUMENT_CATEGORY_MAP, type DocumentItem } from '../api/documents';

export function DocumentPreviewDialog({
  document,
  open,
  onOpenChange,
}: {
  document: DocumentItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!document) return null;

  const isPdf = document.mimeType === 'application/pdf';
  const isImage = document.mimeType.startsWith('image/');
  const fullFileUrl = `${import.meta.env.VITE_API_URL}${document.fileUrl}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="flex flex-row items-center justify-between border-b pb-3 pr-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <DialogTitle className="text-lg font-bold">{document.title}</DialogTitle>
            </div>
            <p className="text-xs text-muted-foreground">
              {document.documentType} · {DOCUMENT_CATEGORY_MAP[document.category]} · Uploaded by{' '}
              <span className="font-medium text-foreground">
                {document.employee.firstName} {document.employee.lastName} (
                {document.employee.employeeCode})
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {document.status === 'VERIFIED' && (
              <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Verified
              </Badge>
            )}
            {document.status === 'PENDING' && (
              <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 gap-1">
                <Clock className="h-3.5 w-3.5" />
                Pending Review
              </Badge>
            )}
            {document.status === 'REJECTED' && (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3.5 w-3.5" />
                Rejected
              </Badge>
            )}

            <Button
              size="sm"
              variant="outline"
              asChild
            >
              <a href={fullFileUrl} target="_blank" rel="noopener noreferrer" download>
                <Download className="h-4 w-4 mr-1.5" />
                Download
              </a>
            </Button>
          </div>
        </DialogHeader>

        {/* Rejection / Verification Note Callout */}
        {document.reviewNote && (
          <div
            className={`p-3 rounded-lg text-sm my-2 ${
              document.status === 'REJECTED'
                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}
          >
            <span className="font-semibold">
              {document.status === 'REJECTED' ? 'HR Rejection Reason: ' : 'HR Note: '}
            </span>
            {document.reviewNote}
          </div>
        )}

        {/* Document Viewer Frame */}
        <div className="flex-1 w-full min-h-[480px] bg-slate-100 rounded-md overflow-hidden border my-2 flex items-center justify-center">
          {isPdf ? (
            <iframe
              src={fullFileUrl}
              className="w-full h-full min-h-[480px] border-0"
              title={document.title}
            />
          ) : isImage ? (
            <div className="max-h-[500px] overflow-auto p-4 flex items-center justify-center">
              <img
                src={fullFileUrl}
                alt={document.title}
                className="max-w-full max-h-[480px] object-contain rounded shadow"
              />
            </div>
          ) : (
            <div className="text-center p-8 space-y-3">
              <FileText className="h-12 w-12 text-slate-400 mx-auto" />
              <p className="text-sm text-muted-foreground">
                Preview not directly available in-browser for this format ({document.mimeType}).
              </p>
              <Button asChild>
                <a href={fullFileUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1.5" />
                  Open in New Tab
                </a>
              </Button>
            </div>
          )}
        </div>

        {/* Footer Meta */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <span>
            File: {document.fileName} ({(document.fileSize / (1024 * 1024)).toFixed(2)} MB)
          </span>
          {document.expiryDate && (
            <span className="font-medium text-amber-700">
              Expires: {new Date(document.expiryDate).toLocaleDateString()}
            </span>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
