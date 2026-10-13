import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CalendarDays,
  Clock3,
  MapPin,
  GraduationCap,
  ClipboardCheck,
} from 'lucide-react';
import { leaveRequests } from '@/data/mock/leaveRequests';
import { getEmployee, departmentNames } from '@/data/mock/employees';
import {
  formatDate,
  formatTime,
  getAffectedClasses,
  getCandidates,
} from '@/lib/academic';
import { useAcademicWorkflow } from '@/features/leave/useAcademicWorkflow';
import { CandidateCard } from '../components/CandidateCard';
import { TimetablePreview } from '../components/TimetablePreview';
import { PageTransition } from '@/components/shared/PageTransition';
import { PageHeader, SectionHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type Choice =
  { classId: string; facultyId: string } | { classId: string; facultyId: null };
export default function SubstitutionPage() {
  const workflow = useAcademicWorkflow();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('leave') ?? workflow.state.activeLeaveId;
  const request = leaveRequests.find(
    (item) => item.id === selectedId && workflow.status(item.id) === 'Approved',
  );
  const approved = leaveRequests.filter(
    (item) => workflow.status(item.id) === 'Approved',
  );
  const faculty = request ? getEmployee(request.employeeId) : null;
  const classes = request ? getAffectedClasses(request.id) : [];
  const covered = classes.filter((item) =>
    Boolean(workflow.state.coverage[item.id]),
  ).length;
  const assigned = classes.filter(
    (item) => workflow.state.coverage[item.id]?.kind === 'faculty',
  ).length;
  const waived = covered - assigned;
  const complete = Boolean(request) && covered === classes.length;
  const [choice, setChoice] = useState<Choice | null>(null);
  const [waiverReason, setWaiverReason] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(false);
  const trigger = useRef<HTMLElement | null>(null);
  const lastClass = useRef<string | null>(null);
  const previewTrigger = useRef<HTMLButtonElement>(null);
  const classItem = classes.find((item) => item.id === choice?.classId);
  const selectedCandidate =
    classItem && choice?.facultyId
      ? getCandidates(classItem, workflow.state.coverage).find(
          (item) => item.employee.id === choice.facultyId,
        )
      : undefined;
  function choose(next: Choice, element: HTMLElement) {
    trigger.current = element;
    lastClass.current = next.classId;
    setError('');
    setWaiverReason('');
    setChoice(next);
  }
  function confirm() {
    if (!choice || !classItem) return;
    if (!choice.facultyId && !waiverReason.trim()) {
      setError('Describe how this class will be handled without a substitute.');
      return;
    }
    const success = workflow.coverClass(
      choice.classId,
      choice.facultyId
        ? { kind: 'faculty', facultyId: choice.facultyId }
        : { kind: 'waived', reason: waiverReason.trim() },
    );
    if (!success) {
      setError(
        'This faculty member is no longer available for the class. Cancel and review the recommendations.',
      );
      return;
    }
    toast.success(
      choice.facultyId
        ? `${getEmployee(choice.facultyId).name} has been assigned successfully.`
        : 'Class marked: no substitute required.',
    );
    setChoice(null);
  }
  return (
    <PageTransition>
      <PageHeader
        title="Smart faculty substitution"
        description="Keep teaching on track when a faculty member is on leave."
        action={
          <div className="workflow-select substitution-leave-select">
            <label htmlFor="substitution-leave">Approved leave</label>
            <Select
              value={request?.id ?? ''}
              onValueChange={(id) => {
                workflow.selectLeave(id);
                setParams({ leave: id });
              }}
            >
              <SelectTrigger id="substitution-leave">
                <SelectValue placeholder="Choose approved leave" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {approved.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {getEmployee(item.employeeId).name} ·{' '}
                      {formatDate(item.start)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        }
      />
      {request && faculty ? (
        <>
          <ol
            className="workflow-steps"
            aria-label="Academic workflow progress"
          >
            <li data-done="true">
              <Check />
              Leave approved
            </li>
            <li data-done={complete}>
              <GraduationCap />
              Find substitutes
            </li>
            <li data-done={complete}>
              <ClipboardCheck />
              Classes accounted for
            </li>
          </ol>
          <Card className="substitution-leave-info">
            <CardHeader>
              <SectionHeader
                title="Leave information"
                action={<StatusBadge status="Approved" />}
              />
            </CardHeader>
            <CardContent>
              <div className="substitution-info-grid">
                <div className="faculty-profile">
                  <Avatar>
                    <AvatarImage src={faculty.photo} alt="" />
                    <AvatarFallback>{faculty.initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="text-xs text-muted-foreground">
                      Absent faculty
                    </span>
                    <h2>{faculty.name}</h2>
                    <p>{faculty.designation}</p>
                  </div>
                </div>
                <dl>
                  <div>
                    <dt>Department</dt>
                    <dd>{departmentNames[faculty.department]}</dd>
                  </div>
                  <div>
                    <dt>Leave date</dt>
                    <dd>
                      {formatDate(request.start, true)}
                      {request.end !== request.start &&
                        ` – ${formatDate(request.end, true)}`}
                    </dd>
                  </div>
                  <div>
                    <dt>Affected classes</dt>
                    <dd>
                      {classes.length} scheduled{' '}
                      {classes.length === 1 ? 'class' : 'classes'}
                    </dd>
                  </div>
                </dl>
              </div>
            </CardContent>
          </Card>
          <section
            className="coverage-progress"
            aria-labelledby="coverage-title"
          >
            <div>
              <h2 id="coverage-title">
                {classes.length} {classes.length === 1 ? 'Class' : 'Classes'}{' '}
                Affected
              </h2>
              <p>
                {complete
                  ? 'Every affected class has a recorded coverage decision.'
                  : 'Assign a substitute or record why one is not required for each class.'}
              </p>
            </div>
            <div>
              <strong aria-live="polite">
                {covered} / {classes.length} Covered
              </strong>
              <progress
                max={Math.max(1, classes.length)}
                value={covered}
                aria-label={`${covered} of ${classes.length} affected classes covered`}
              />
            </div>
          </section>
          {!complete && (
            <p className="ranking-method">
              <GraduationCap aria-hidden="true" />
              <span>
                <strong>Smart Recommendation:</strong> Candidates are ranked
                using subject expertise, timetable availability, department
                compatibility, teaching experience and current workload. HOD
                makes the final assignment decision.
              </span>
            </p>
          )}
          {classes.map((item, index) => {
            const coverage = workflow.state.coverage[item.id];
            const candidates = getCandidates(item, workflow.state.coverage);
            const best = candidates.find((candidate) => !candidate.reason)
              ?.employee.id;

            const badgeText = coverage
              ? coverage.kind === 'faculty'
                ? 'Substitute Assigned'
                : 'No Substitute Required'
              : 'Needs Coverage';

            const badgeClass = coverage ? 'coverage-badge' : 'uncovered-badge';

            return (
              <Card
                key={item.id}
                className="affected-class-card"
                id={`class-${item.id}`}
                tabIndex={-1}
                data-covered={Boolean(coverage)}
              >
                <CardHeader>
                  <div className="affected-class-heading">
                    <div>
                      <span className="text-xs text-muted-foreground uppercase font-semibold">
                        Affected class {index + 1}
                      </span>
                      <h2>{item.subject}</h2>
                      <div className="class-meta">
                        <Badge variant="secondary">{item.cohort}</Badge>
                        <span>
                          <CalendarDays />
                          {formatDate(item.date)}
                        </span>
                        <span>
                          <Clock3 />
                          {formatTime(item.start)} – {formatTime(item.end)}
                        </span>
                        <span>
                          <MapPin />
                          {item.room}
                        </span>
                      </div>
                      <p className="original-class-faculty">
                        Original faculty: <strong>{faculty.name}</strong>
                      </p>
                    </div>
                    <Badge variant="outline" className={badgeClass}>
                      {coverage ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          {badgeText}
                        </>
                      ) : (
                        badgeText
                      )}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <AnimatePresence mode="wait">
                    {coverage ? (
                      <motion.div
                        key="covered"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="class-covered-state border border-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/20 dark:border-emerald-800 p-4 rounded-xl space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            {coverage.kind === 'faculty'
                              ? 'Substitute Assigned'
                              : 'No Substitute Required'}
                          </span>
                          {coverage.kind === 'faculty' && (
                            <Badge className="substitute-badge bg-emerald-600 text-white hover:bg-emerald-600 text-xs font-medium">
                              Substitute Active
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-1">
                          <h3 className="text-base font-bold text-foreground">
                            {coverage.kind === 'faculty'
                              ? getEmployee(coverage.facultyId).name
                              : 'Alternative Academic Arrangement'}
                          </h3>
                          <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
                            {coverage.kind === 'faculty'
                              ? `${item.shortSubject} — ${item.cohort}`
                              : coverage.reason}
                          </p>
                          {coverage.kind === 'faculty' && (
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                              <span className="flex items-center gap-1">
                                <Clock3 className="w-3.5 h-3.5" />
                                {formatTime(item.start)} –{' '}
                                {formatTime(item.end)}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                {item.room}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-emerald-200/80 dark:border-emerald-800/80 text-xs">
                          <span className="text-muted-foreground">
                            Original Faculty:{' '}
                          </span>
                          <strong className="font-semibold text-foreground">
                            {faculty.name}
                          </strong>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="recommendations"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <div className="candidate-section-heading">
                          <div>
                            <h3>Smart Recommendations</h3>
                            <span className="text-xs text-muted-foreground">
                              Ranked by match score &amp; teaching workload
                            </span>
                          </div>
                        </div>
                        {candidates.length ? (
                          <div className="candidate-grid">
                            {candidates.map((candidate) => (
                              <CandidateCard
                                key={candidate.employee.id}
                                candidate={candidate}
                                best={best === candidate.employee.id}
                                onAssign={(element) =>
                                  choose(
                                    {
                                      classId: item.id,
                                      facultyId: candidate.employee.id,
                                    },
                                    element,
                                  )
                                }
                              />
                            ))}
                          </div>
                        ) : (
                          <EmptyState
                            title="No available faculty in this sample"
                            description="Record an academic arrangement if no substitute is required."
                          />
                        )}
                        <div className="waiver-action">
                          <p>Already arranged an alternative for this class?</p>
                          <Button
                            variant="link"
                            onClick={(event) =>
                              choose(
                                { classId: item.id, facultyId: null },
                                event.currentTarget,
                              )
                            }
                          >
                            No substitute required
                            <ArrowRight />
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            );
          })}
          <AnimatePresence mode="wait">
            {complete && (
              <motion.section
                key="complete"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="workflow-success p-6 rounded-xl border border-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/30 dark:border-emerald-800"
                aria-labelledby="workflow-success-title"
                role="status"
              >
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div className="space-y-3 w-full">
                    <h2
                      id="workflow-success-title"
                      className="text-xl font-bold text-foreground"
                    >
                      All Classes Covered
                    </h2>
                    <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                      No classes left uncovered
                    </p>
                    <div className="grid grid-cols-3 gap-3 py-2 text-center bg-card/70 rounded-lg border border-emerald-200 dark:border-emerald-800/60 px-4">
                      <div>
                        <span className="block text-lg font-bold text-primary">
                          {classes.length}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          classes affected
                        </span>
                        <span className="sr-only">
                          {classes.length} classes affected
                        </span>
                      </div>
                      <div>
                        <span className="block text-lg font-bold text-emerald-600">
                          {covered}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          classes resolved
                        </span>
                        <span className="sr-only">
                          {covered} classes resolved
                        </span>
                      </div>
                      <div>
                        <span className="block text-lg font-bold text-muted-foreground">
                          {classes.length - covered}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          classes uncovered
                        </span>
                        <span className="sr-only">
                          {classes.length - covered} classes uncovered
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      All {classes.length} scheduled classes affected by{' '}
                      {faculty.name}’s leave now have confirmed academic
                      coverage ({assigned}{' '}
                      {assigned === 1 ? 'substitute' : 'substitutes'} assigned
                      {waived > 0 ? `, ${waived} alternative arrangement` : ''}
                      ).
                    </p>
                  </div>
                </div>
                <div className="workflow-success-actions flex flex-wrap gap-3 mt-4 pt-4 border-t border-emerald-200 dark:border-emerald-800/60">
                  <Button asChild variant="outline">
                    <Link to="/leave">
                      <ArrowLeft className="w-4 h-4 mr-1.5" />
                      Return to Leave Management
                    </Link>
                  </Button>
                  <Button
                    ref={previewTrigger}
                    variant="accent"
                    onClick={() => setPreview(true)}
                    disabled={!classes.length}
                  >
                    View Updated Timetable
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
          <TimetablePreview
            request={request}
            open={preview}
            onOpenChange={setPreview}
          />
        </>
      ) : (
        <Card>
          <CardContent>
            <EmptyState
              title="Start with a leave approval"
              description="Review Prof. Asha Patil’s request and its two affected classes. Approve the leave to launch the substitution workflow."
            />
            <div className="flex justify-center">
              <Button asChild variant="accent">
                <Link to="/leave?request=LR001">
                  Review pending leave
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <Dialog
        open={Boolean(choice)}
        onOpenChange={(open) => {
          if (!open) setChoice(null);
        }}
      >
        <DialogContent
          className="workflow-confirmation"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (trigger.current?.isConnected) trigger.current.focus();
            else document.getElementById(`class-${lastClass.current}`)?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {choice?.facultyId
                ? 'Confirm faculty assignment'
                : 'No substitute required?'}
            </DialogTitle>
            <DialogDescription>
              {choice?.facultyId && selectedCandidate && classItem
                ? `Assign ${selectedCandidate.employee.name} to ${classItem.shortSubject} — ${classItem.cohort} — ${formatTime(classItem.start)}?`
                : `Record an alternative arrangement for ${classItem?.subject} — ${classItem?.cohort}. This class will count as covered without a substitute.`}
            </DialogDescription>
          </DialogHeader>
          {classItem && (
            <p className="confirmation-class-info">
              {formatDate(classItem.date, true)} · {classItem.room} ·{' '}
              {classItem.hours} teaching{' '}
              {classItem.hours === 1 ? 'hour' : 'hours'}
            </p>
          )}
          {choice && !choice.facultyId && (
            <div className="flex flex-col gap-2">
              <label htmlFor="waiver-reason" className="text-sm font-medium">
                Academic arrangement
              </label>
              <Textarea
                id="waiver-reason"
                value={waiverReason}
                onChange={(event) => setWaiverReason(event.target.value)}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'assignment-error' : undefined}
                placeholder="e.g. Supervised independent study agreed with the HOD."
              />
            </div>
          )}
          {error && (
            <p
              id="assignment-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {error}
            </p>
          )}
          <div className="confirmation-actions">
            <Button variant="accent" onClick={confirm}>
              {choice?.facultyId
                ? 'Confirm Assignment'
                : 'Confirm No Substitute Required'}
            </Button>
            <Button variant="ghost" onClick={() => setChoice(null)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
