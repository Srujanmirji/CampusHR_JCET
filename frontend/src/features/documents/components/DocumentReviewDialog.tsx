import { useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useReviewDocument, type DocumentItem } from '../api/documents';

export function DocumentReviewDialog({
  document,
  open,
  onOpenChange,
}: {
  document: DocumentItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [action, setAction] = useState<'VERIFIED' | 'REJECTED'>('VERIFIED');
  const [reviewNote, setReviewNote] = useState('');
  const reviewMutation = useReviewDocument();

  if (!document) return null;

  const handleSubmit = () => {
    if (action === 'REJECTED' && !reviewNote.trim()) {
      toast.error('Please enter a rejection reason so the faculty member knows what to correct.');
      return;
    }

    reviewMutation.mutate(
      {
        id: document.id,
        status: action,
        reviewNote: reviewNote.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success(
            action === 'VERIFIED'
              ? `Document "${document.title}" marked as verified!`
              : `Document "${document.title}" rejected. Notification sent to employee.`,
          );
          onOpenChange(false);
          setReviewNote('');
        },
        onError: (err: unknown) => {
          toast.error(err instanceof Error ? err.message : 'Review action failed.');
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            Verify Employee Document
          </DialogTitle>
          <DialogDescription>
            Audit this document against JCET regulatory compliance standards.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Document Summary Card */}
          <div className="bg-slate-50 border rounded-lg p-3 text-sm space-y-1">
            <p className="font-semibold text-foreground">{document.title}</p>
            <p className="text-xs text-muted-foreground">
              Type: <span className="font-medium text-foreground">{document.documentType}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Employee: {document.employee.firstName} {document.employee.lastName} (
              {document.employee.employeeCode} · {document.employee.department.code})
            </p>
          </div>

          {/* Decision Buttons */}
          <div className="space-y-2">
            <Label>Verification Decision</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAction('VERIFIED')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-sm font-medium transition-all ${
                  action === 'VERIFIED'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Verify & Approve
              </button>

              <button
                type="button"
                onClick={() => setAction('REJECTED')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-sm font-medium transition-all ${
                  action === 'REJECTED'
                    ? 'border-rose-600 bg-rose-50 text-rose-800 ring-2 ring-rose-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <XCircle className="h-4 w-4 text-rose-600" />
                Reject Submission
              </button>
            </div>
          </div>

          {/* Review Note */}
          <div className="space-y-1.5">
            <Label htmlFor="reviewNote">
              {action === 'REJECTED' ? 'Reason for Rejection *' : 'Verification Remarks (Optional)'}
            </Label>
            <Textarea
              id="reviewNote"
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder={
                action === 'REJECTED'
                  ? 'e.g. Document copy is blurry. Please upload an original scanned color copy.'
                  : 'e.g. Verified against VTU Convocation Gazette'
              }
              rows={3}
              required={action === 'REJECTED'}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={reviewMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={reviewMutation.isPending || (action === 'REJECTED' && !reviewNote.trim())}
            className={
              action === 'VERIFIED'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-rose-600 hover:bg-rose-700'
            }
          >
            {reviewMutation.isPending
              ? 'Saving...'
              : action === 'VERIFIED'
                ? 'Confirm Verification'
                : 'Reject Document'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
