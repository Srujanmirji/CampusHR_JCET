import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, DoorOpen } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageTransition } from '@/components/shared/PageTransition';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useScope } from '@/features/auth/hooks/useCan';
import { useSession } from '@/features/auth/hooks/useSession';
import { listDepartments } from '@/features/departments/api/departments';
import {
  getLeaveClasses,
  listApprovedLeave,
  listMyClasses,
} from '@/features/substitution/api/substitution';
import { MutualClassSwapCard } from '@/features/substitution/components/MutualClassSwapCard';
import {
  listEntries,
  listPeriods,
  type Day,
  type Entry,
} from '../api/timetable';
import { EntryDialog, type EntryTarget } from '../components/EntryDialog';
import { RoomsDialog, SubjectsDialog } from '../components/ReferenceDialogs';
import {
  TimetableGrid,
  type EntrySubstitution,
} from '../components/TimetableGrid';

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];
const SECTIONS = ['A', 'B', 'C', 'D'];

export default function TimetablePage() {
  const scopeOf = useScope();
  const session = useSession();
  const user = session.status === 'signedIn' ? session.user : undefined;
  const readScope = scopeOf('timetable.read');
  const manageScope = scopeOf('timetable.manage');
  const subScope = scopeOf('substitution.read');
  // Faculty see their own classes across sections; others pick a class.
  const ownView = readScope === 'own';

  const departments = useQuery({
    queryKey: ['departments'],
    queryFn: listDepartments,
  });
  const periods = useQuery({
    queryKey: ['timetable', 'periods'],
    queryFn: listPeriods,
  });
  const [chosenDepartment, setChosenDepartment] = useState<number>();
  const [semester, setSemester] = useState(1);
  const [section, setSection] = useState('A');
  const [target, setTarget] = useState<EntryTarget | null>(null);
  const [reference, setReference] = useState<'subjects' | 'rooms' | null>(null);

  const departmentChoices =
    readScope === 'all'
      ? (departments.data ?? [])
      : (departments.data ?? []).filter((row) => row.id === user?.departmentId);
  const departmentId =
    chosenDepartment ?? user?.departmentId ?? departmentChoices[0]?.id;
  const department = departments.data?.find((row) => row.id === departmentId);
  const canManage =
    !ownView &&
    (manageScope === 'all' ||
      (manageScope === 'department' && departmentId === user?.departmentId));

  const filters = ownView ? {} : { departmentId, semester, section };
  const entries = useQuery({
    queryKey: ['timetable', 'entries', filters],
    queryFn: () => listEntries(filters),
    enabled: ownView || departmentId !== undefined,
  });
  const myDuties = useQuery({
    queryKey: ['substitution', 'mine'],
    queryFn: listMyClasses,
    enabled: ownView && subScope !== null,
  });
  const deptSubstitutions = useQuery({
    queryKey: ['substitution', 'timetable-coverage', departmentId],
    enabled:
      !ownView &&
      subScope !== null &&
      subScope !== 'own' &&
      departmentId !== undefined,
    queryFn: async () => {
      const leaves = await listApprovedLeave();
      const details = await Promise.all(
        leaves
          .filter((item) => item.leave.department.id === departmentId)
          .map((item) => getLeaveClasses(item.leave.id)),
      );
      const map: Record<string, EntrySubstitution[]> = {};
      for (const detail of details) {
        for (const cls of detail.classes) {
          if (!cls.coverage) continue;
          const list = (map[cls.entry.id] ??= []);
          list.push({
            date: cls.date,
            kind: cls.coverage.kind,
            label:
              cls.coverage.kind === 'SUBSTITUTE' && cls.coverage.substitute
                ? `Sub: ${cls.coverage.substitute.name}`
                : 'No sub needed',
          });
        }
      }
      return map;
    },
  });

  function open(day: Day, period: number, entry?: Entry) {
    if (!department) return;
    setTarget({
      departmentId: department.id,
      departmentCode: department.code,
      semester,
      section,
      day,
      period,
      entry,
    });
  }

  const loading =
    periods.isPending || (entries.isPending && entries.fetchStatus !== 'idle');
  const failed = periods.isError ? periods : entries.isError ? entries : null;

  return (
    <PageTransition>
      <PageHeader
        title={ownView ? 'My timetable' : 'Timetable'}
        description={
          ownView
            ? 'Your classes this week, across all sections.'
            : 'Weekly classes by department, semester and section.'
        }
        action={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => setReference('subjects')}
              >
                <BookOpen />
                Subjects
              </Button>
              <Button variant="outline" onClick={() => setReference('rooms')}>
                <DoorOpen />
                Rooms
              </Button>
            </div>
          ) : undefined
        }
      />

      {!ownView && (
        <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border bg-card p-4 shadow-xs sm:grid-cols-3 lg:flex">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="timetable-department">Department</Label>
            <Select
              value={departmentId ? String(departmentId) : ''}
              onValueChange={(value) => setChosenDepartment(Number(value))}
              disabled={departmentChoices.length < 2}
            >
              <SelectTrigger id="timetable-department" className="lg:w-72">
                <SelectValue
                  placeholder={departments.isPending ? 'Loading…' : 'Choose'}
                />
              </SelectTrigger>
              <SelectContent>
                {departmentChoices.map((row) => (
                  <SelectItem key={row.id} value={String(row.id)}>
                    {row.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="timetable-semester">Semester</Label>
            <Select
              value={String(semester)}
              onValueChange={(value) => setSemester(Number(value))}
            >
              <SelectTrigger id="timetable-semester" className="lg:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEMESTERS.map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    Semester {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="timetable-section">Section</Label>
            <Select value={section} onValueChange={setSection}>
              <SelectTrigger id="timetable-section" className="lg:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SECTIONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    Section {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {loading ? (
        <div
          role="status"
          aria-label="Loading timetable"
          className="flex flex-col gap-2"
        >
          {Array.from({ length: 7 }, (_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : failed ? (
        <div className="rounded-xl border bg-card p-8">
          <EmptyState
            title="Couldn’t load the timetable"
            description={failed.error?.message ?? 'Try again.'}
            actionLabel="Try again"
            onAction={() => void failed.refetch()}
          />
        </div>
      ) : !ownView && departmentId === undefined ? (
        <div className="rounded-xl border bg-card p-8">
          <EmptyState
            title="Choose a department"
            description="Pick a department to see its timetable."
          />
        </div>
      ) : (
        <>
          <p role="status" className="mb-3 text-sm text-muted-foreground">
            {entries.data?.length
              ? `${entries.data.length} ${entries.data.length === 1 ? 'class' : 'classes'} a week`
              : ownView
                ? 'No classes are assigned to you yet.'
                : canManage
                  ? `No classes for ${department?.code} ${semester}${section} yet. Use + in a slot to add one.`
                  : `No classes for ${department?.code} ${semester}${section} yet.`}
          </p>
          <TimetableGrid
            periods={periods.data ?? []}
            entries={entries.data ?? []}
            showClass={ownView}
            canManage={canManage}
            substitutions={deptSubstitutions.data}
            coveredDuties={myDuties.data}
            onAdd={(day, period) => open(day, period)}
            onOpen={(entry) => open(entry.day, entry.startPeriod, entry)}
          />
          <MutualClassSwapCard
            canDecide={canManage}
            currentUserName={user?.email ?? 'Faculty Member'}
          />
        </>
      )}

      {target && periods.data && (
        <EntryDialog
          key={target.entry?.id ?? `${target.day}-${target.period}`}
          target={target}
          periods={periods.data}
          onClose={() => setTarget(null)}
        />
      )}
      {reference === 'subjects' && department && (
        <SubjectsDialog
          departmentId={department.id}
          departmentCode={department.code}
          semester={semester}
          onClose={() => setReference(null)}
        />
      )}
      {reference === 'rooms' && (
        <RoomsDialog onClose={() => setReference(null)} />
      )}
    </PageTransition>
  );
}
