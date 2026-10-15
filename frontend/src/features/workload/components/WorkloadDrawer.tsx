import { useQuery } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { facultyWorkloadQuery } from '../api/workload';
import { WorkloadBreakdown } from './WorkloadBreakdown';

export function WorkloadDrawer({
  facultyId,
  onClose,
}: {
  facultyId: string | null;
  onClose: () => void;
}) {
  // Shares the breakdown's cached query for the title.
  const { data } = useQuery({
    ...facultyWorkloadQuery(facultyId ?? ''),
    enabled: facultyId !== null,
  });

  return (
    <Sheet
      open={facultyId !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="border-b">
          <SheetTitle>{data?.faculty.name ?? 'Workload'}</SheetTitle>
          <SheetDescription>
            {data
              ? `${data.faculty.designation.name} · ${data.faculty.department.code} · ${data.faculty.employeeCode}`
              : 'Weekly teaching hours and the classes behind them.'}
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-6">
          {facultyId && <WorkloadBreakdown facultyId={facultyId} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}
