import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { LogIn, LogOut, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getTodayAttendance, punchAttendance } from '../api/attendance';
import { CorrectionRequestDialog } from './CorrectionRequestDialog';

export function PunchCard() {
  const queryClient = useQueryClient();
  const [correctionOpen, setCorrectionOpen] = useState(false);

  const { data: today, isLoading } = useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: getTodayAttendance,
  });

  const punchMutation = useMutation({
    mutationFn: () => punchAttendance({ source: 'WEB' }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      if (data?.checkOut) {
        toast.success('Successfully punched out. Have a great evening!');
      } else {
        toast.success('Successfully punched in. Have a productive day!');
      }
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to record punch.');
    },
  });

  const isCheckedIn = Boolean(today?.checkIn);
  const isCheckedOut = Boolean(today?.checkOut);

  const formatTime = (iso?: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <Card className="border-border/60 bg-gradient-to-r from-card via-card to-primary/5 shadow-sm">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-foreground">Today's Attendance</h3>
                {today && (
                  <StatusBadge
                    status={
                      today.status === 'PRESENT'
                        ? 'Present'
                        : today.status === 'LATE'
                          ? 'Late'
                          : today.status === 'HALF_DAY'
                            ? 'Half Day'
                            : 'Absent'
                    }
                  />
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {isCheckedOut
                  ? `Completed: In at ${formatTime(today?.checkIn)} • Out at ${formatTime(today?.checkOut)}`
                  : isCheckedIn
                    ? `Punched in at ${formatTime(today?.checkIn)} • Shift in progress`
                    : 'You haven’t checked in for today yet.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCorrectionOpen(true)}
              className="text-xs"
            >
              <AlertCircle className="mr-1.5 h-3.5 w-3.5" />
              Request Correction
            </Button>

            {!isCheckedOut && (
              <Button
                size="sm"
                onClick={() => punchMutation.mutate()}
                disabled={punchMutation.isPending || isLoading}
                className={isCheckedIn ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-primary'}
              >
                {isCheckedIn ? (
                  <>
                    <LogOut className="mr-1.5 h-4 w-4" />
                    Punch Out
                  </>
                ) : (
                  <>
                    <LogIn className="mr-1.5 h-4 w-4" />
                    Punch In
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <CorrectionRequestDialog
        open={correctionOpen}
        onOpenChange={setCorrectionOpen}
        defaultDate={new Date().toISOString().split('T')[0]}
      />
    </>
  );
}
