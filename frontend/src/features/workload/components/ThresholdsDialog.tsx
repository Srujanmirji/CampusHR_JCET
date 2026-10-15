import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/services/api';
import { listThresholds, saveThreshold, type Threshold } from '../api/workload';

/** Principal sets each teaching designation's weekly-hour band. */
export function ThresholdsDialog({ onClose }: { onClose: () => void }) {
  const thresholds = useQuery({
    queryKey: ['workload', 'thresholds'],
    queryFn: listThresholds,
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Workload bands</DialogTitle>
          <DialogDescription>
            Weekly teaching hours per designation. Below the minimum is
            underloaded, above the maximum overloaded.
          </DialogDescription>
        </DialogHeader>
        {thresholds.isPending ? (
          <div
            role="status"
            aria-label="Loading bands"
            className="flex flex-col gap-2"
          >
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : thresholds.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {thresholds.error.message}{' '}
            <Button
              variant="link"
              className="h-auto p-0"
              onClick={() => void thresholds.refetch()}
            >
              Try again
            </Button>
          </p>
        ) : (
          <ul className="flex flex-col divide-y rounded-lg border">
            {thresholds.data.map((row) => (
              <BandRow key={row.designation.id} row={row} />
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

function BandRow({ row }: { row: Threshold }) {
  const queryClient = useQueryClient();
  const [min, setMin] = useState(row.minHours?.toString() ?? '');
  const [max, setMax] = useState(row.maxHours?.toString() ?? '');
  const save = useMutation({
    mutationFn: () =>
      saveThreshold(row.designation.id, {
        minHours: Number(min),
        maxHours: Number(max),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workload'] });
      toast.success(`Saved the ${row.designation.name} band.`);
    },
  });

  const whole = (value: string) => /^\d{1,2}$/.test(value);
  const valid = whole(min) && whole(max) && Number(min) <= Number(max);
  const changed =
    min !== (row.minHours?.toString() ?? '') ||
    max !== (row.maxHours?.toString() ?? '');
  const id = `band-${row.designation.id}`;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (valid && changed) save.mutate();
  };

  return (
    <li className="p-3">
      <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
        <span className="min-w-36 flex-1 text-sm font-medium">
          {row.designation.name}
        </span>
        <div className="flex flex-col gap-1">
          <label
            htmlFor={`${id}-min`}
            className="text-xs text-muted-foreground"
          >
            Min hours
          </label>
          <Input
            id={`${id}-min`}
            className="w-20 tabular-nums"
            inputMode="numeric"
            value={min}
            onChange={(event) => setMin(event.target.value.trim())}
            aria-invalid={min !== '' && !valid}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor={`${id}-max`}
            className="text-xs text-muted-foreground"
          >
            Max hours
          </label>
          <Input
            id={`${id}-max`}
            className="w-20 tabular-nums"
            inputMode="numeric"
            value={max}
            onChange={(event) => setMax(event.target.value.trim())}
            aria-invalid={max !== '' && !valid}
          />
        </div>
        <Button
          type="submit"
          variant="outline"
          disabled={!valid || !changed || save.isPending}
        >
          {save.isPending && <LoaderCircle className="animate-spin" />}
          Save
        </Button>
        {(save.isError || (min !== '' && max !== '' && !valid)) && (
          <p role="alert" className="w-full text-xs text-destructive">
            {save.isError
              ? save.error instanceof ApiError
                ? save.error.message
                : 'Couldn’t save. Try again.'
              : 'Use whole hours, with the minimum no higher than the maximum.'}
          </p>
        )}
      </form>
    </li>
  );
}
