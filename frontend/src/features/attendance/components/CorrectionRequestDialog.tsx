import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  requestAttendanceCorrection,
  type AttendanceStatusKey,
} from '../api/attendance';

export function CorrectionRequestDialog({
  open,
  onOpenChange,
  defaultDate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
}) {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(
    defaultDate || new Date().toISOString().split('T')[0],
  );
  const [checkIn, setCheckIn] = useState('09:00');
  const [checkOut, setCheckOut] = useState('17:00');
  const [status, setStatus] = useState<AttendanceStatusKey>('PRESENT');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mutation = useMutation({
    mutationFn: requestAttendanceCorrection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Correction request submitted to your HOD.');
      onOpenChange(false);
      setReason('');
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to submit correction request.',
      );
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!date) {
      toast.error('Please pick a date.');
      return;
    }
    if (!reason.trim()) {
      toast.error('Please provide a reason for the correction.');
      return;
    }

    setIsSubmitting(true);
    const inDateTime = checkIn ? `${date}T${checkIn}:00.000Z` : null;
    const outDateTime = checkOut ? `${date}T${checkOut}:00.000Z` : null;

    mutation.mutate({
      date,
      requestedCheckIn: inDateTime,
      requestedCheckOut: outDateTime,
      requestedStatus: status,
      reason,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Request Attendance Correction</DialogTitle>
            <DialogDescription>
              Submit a request if you missed a biometric punch or experienced a
              system glitch.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="corr-date">Date</Label>
              <Input
                id="corr-date"
                type="date"
                value={date}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="corr-in">Check-in Time</Label>
                <Input
                  id="corr-in"
                  type="time"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="corr-out">Check-out Time</Label>
                <Input
                  id="corr-out"
                  type="time"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="corr-status">Requested Status</Label>
              <Select
                value={status}
                onValueChange={(val: AttendanceStatusKey) => setStatus(val)}
              >
                <SelectTrigger id="corr-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRESENT">Present (Full Day)</SelectItem>
                  <SelectItem value="HALF_DAY">Half Day</SelectItem>
                  <SelectItem value="LATE">Late Entry</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="corr-reason">Reason</Label>
              <Textarea
                id="corr-reason"
                placeholder="e.g. Biometric device was offline, or on duty at university exam center."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
