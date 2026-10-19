import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, X, Clock, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  listAttendanceCorrections,
  reviewAttendanceCorrection,
  type AttendanceCorrection,
} from '../api/attendance';

export function CorrectionsQueueDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['attendance', 'corrections', 'pending'],
    queryFn: () => listAttendanceCorrections({ status: 'PENDING' }),
    enabled: open,
  });

  const reviewMutation = useMutation({
    mutationFn: ({
      id,
      status,
      reviewNote,
    }: {
      id: string;
      status: 'APPROVED' | 'REJECTED';
      reviewNote?: string;
    }) => reviewAttendanceCorrection(id, { status, reviewNote }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success(
        variables.status === 'APPROVED'
          ? 'Correction request approved and attendance record updated.'
          : 'Correction request rejected.',
      );
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to review correction request.');
    },
  });

  const pendingItems = data?.data || [];

  const handleReview = (id: string, status: 'APPROVED' | 'REJECTED') => {
    const note = reviewNotes[id];
    reviewMutation.mutate({ id, status, reviewNote: note });
  };

  const formatTime = (iso?: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <span>Attendance Corrections Queue</span>
            {pendingItems.length > 0 && (
              <Badge variant="secondary" className="bg-amber-500/15 text-amber-600">
                {pendingItems.length} Pending
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            Review and decide missed-punch correction requests submitted by faculty and staff.
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Loading correction requests...
          </div>
        ) : pendingItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 mb-3">
              <Check className="h-6 w-6" />
            </div>
            <h4 className="font-semibold text-foreground">All Caught Up!</h4>
            <p className="text-sm text-muted-foreground max-w-[280px] mt-1">
              There are no pending attendance correction requests waiting for your approval.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingItems.map((item: AttendanceCorrection) => (
              <div
                key={item.id}
                className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground text-sm">
                        {item.employee.firstName} {item.employee.lastName}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {item.employee.department.code}
                      </Badge>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">
                      {item.employee.employeeCode}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {item.requestedStatus}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-muted/30 p-2.5 rounded-lg border border-border/40">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    <span>Date: <b>{new Date(item.date).toISOString().split('T')[0]}</b></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    <span>
                      {formatTime(item.requestedCheckIn)} – {formatTime(item.requestedCheckOut)}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Reason:
                  </span>
                  <p className="text-xs text-foreground mt-0.5 italic">
                    "{item.reason}"
                  </p>
                </div>

                <div className="pt-1">
                  <Input
                    placeholder="Decision note (optional)..."
                    value={reviewNotes[item.id] || ''}
                    onChange={(e) =>
                      setReviewNotes((prev) => ({ ...prev, [item.id]: e.target.value }))
                    }
                    className="h-8 text-xs mb-3"
                  />
                  <div className="flex items-center gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={reviewMutation.isPending}
                      onClick={() => handleReview(item.id, 'REJECTED')}
                    >
                      <X className="mr-1 h-3.5 w-3.5" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                      disabled={reviewMutation.isPending}
                      onClick={() => handleReview(item.id, 'APPROVED')}
                    >
                      <Check className="mr-1 h-3.5 w-3.5" />
                      Approve
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
