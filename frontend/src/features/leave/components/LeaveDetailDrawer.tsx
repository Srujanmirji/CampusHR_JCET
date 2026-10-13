import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  CalendarDays,
  Clock3,
  MapPin,
  GraduationCap,
  ArrowRight,
  Check,
  Ban,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import type { LeaveRequest } from '@/types/academic';
import { getEmployee, departmentNames } from '@/data/mock/employees';
import { formatDate, formatTime, getAffectedClasses } from '@/lib/academic';
import { useAcademicWorkflow } from '../useAcademicWorkflow';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Textarea } from '@/components/ui/textarea';

export function LeaveDetailDrawer({
  request,
  onClose,
  restoreFocus,
}: {
  request: LeaveRequest | undefined;
  onClose: () => void;
  restoreFocus: () => void;
}) {
  const navigate = useNavigate();
  const workflow = useAcademicWorkflow();
  const [confirmation, setConfirmation] = useState<'approve' | 'reject' | null>(
    null,
  );
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const closeButton = useRef<HTMLButtonElement>(null);
  const actionButton = useRef<HTMLButtonElement | null>(null);
  const faculty = request ? getEmployee(request.employeeId) : null;
  const classes = request ? getAffectedClasses(request.id) : [];
  const status = request ? workflow.status(request.id) : 'Pending';
  function findSubstitutes() {
    if (!request) return;
    workflow.selectLeave(request.id);
    navigate(`/substitution?leave=${request.id}`);
  }
  function approve(find: boolean) {
    if (!request) return;
    workflow.decide(request.id, 'Approved');
    setConfirmation(null);
    toast.success(`${faculty?.name}’s leave has been approved.`, {
      description: classes.length
        ? `${classes.length} scheduled classes need a coverage decision.`
        : 'No scheduled classes are affected.',
    });
    if (find) findSubstitutes();
  }
  return (
    <>
      <Sheet
        open={Boolean(request)}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmation(null);
            onClose();
          }
        }}
      >
        <SheetContent
          side="right"
          showCloseButton={false}
          className="leave-detail-drawer"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            restoreFocus();
          }}
        >
          <header className="workflow-drawer-header">
            <div>
              <SheetTitle>Leave request details</SheetTitle>
              <SheetDescription>
                {request?.id} · faculty leave review
              </SheetDescription>
            </div>
            <Button
              ref={closeButton}
              variant="ghost"
              size="icon"
              aria-label="Close leave details"
              onClick={onClose}
            >
              <X />
            </Button>
          </header>
          {request && faculty && (
            <>
              <div
                className="workflow-drawer-body"
                role="region"
                aria-label="Leave request information"
                tabIndex={0}
              >
                <div className="faculty-profile">
                  <Avatar>
                    <AvatarImage src={faculty.photo} alt="" />
                    <AvatarFallback>{faculty.initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h2>{faculty.name}</h2>
                    <p>{faculty.designation}</p>
                    <span>
                      {faculty.id} · {faculty.department}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <StatusBadge status={status} />
                  <span className="text-xs text-muted-foreground">
                    Faculty profile
                  </span>
                </div>
                <dl className="leave-detail-grid">
                  <div>
                    <dt>Department</dt>
                    <dd>{departmentNames[faculty.department]}</dd>
                  </div>
                  <div>
                    <dt>Leave type</dt>
                    <dd>{request.type}</dd>
                  </div>
                  <div>
                    <dt>Leave dates</dt>
                    <dd>
                      {formatDate(request.start)}
                      {request.end !== request.start &&
                        ` – ${formatDate(request.end)}`}{' '}
                      2026
                    </dd>
                  </div>
                  <div>
                    <dt>Duration</dt>
                    <dd>
                      {request.days} {request.days === 1 ? 'day' : 'days'}
                    </dd>
                  </div>
                </dl>
                {status === 'Rejected' &&
                  workflow.state.rejectionReasons[request.id] && (
                    <section className="detail-section">
                      <h3>Decision note</h3>
                      <p>{workflow.state.rejectionReasons[request.id]}</p>
                    </section>
                  )}
                <section className="detail-section">
                  <h3>Reason for leave</h3>
                  <p>{request.reason}</p>
                </section>
                <section className="detail-section">
                  <h3>
                    Leave balance <span>Before this request</span>
                  </h3>
                  <div className="balance-grid">
                    {Object.entries(request.balance).map(([type, value]) => (
                      <div key={type}>
                        <strong>
                          {value}
                          <small> days</small>
                        </strong>
                        <span>{type}</span>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="academic-impact">
                  <div className="academic-impact-heading">
                    <div className="academic-impact-title-group">
                      <AlertTriangle aria-hidden="true" />
                      <h3>Academic Impact</h3>
                    </div>
                    <span className="academic-impact-badge">
                      {classes.length}{' '}
                      {classes.length === 1 ? 'class' : 'classes'} affected
                    </span>
                  </div>
                  <p className="academic-impact-note">
                    Approving this leave may require substitute faculty for the
                    following scheduled classes.
                  </p>
                  {classes.length ? (
                    <ol className="academic-impact-list">
                      {classes.map((item, index) => (
                        <li key={item.id} className="academic-impact-item">
                          <div className="academic-impact-item-header">
                            <div>
                              <span className="text-xs text-muted-foreground uppercase font-semibold">
                                Class {index + 1}
                              </span>
                              <h4>{item.subject}</h4>
                            </div>
                            <span className="academic-impact-cohort">
                              {item.cohort}
                            </span>
                          </div>
                          <div className="academic-impact-grid">
                            <span>
                              <CalendarDays />
                              <strong>Date:</strong> {formatDate(item.date)}
                            </span>
                            <span>
                              <Clock3 />
                              <strong>Time:</strong> {formatTime(item.start)} –{' '}
                              {formatTime(item.end)}
                            </span>
                            <span>
                              <GraduationCap />
                              <strong>Class / Sem:</strong> {item.cohort}
                            </span>
                            <span>
                              <MapPin />
                              <strong>Room / Lab:</strong> {item.room}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No scheduled classes fall within this leave period.
                    </p>
                  )}
                </section>
                <section className="detail-section">
                  <h3>Previous leave history</h3>
                  <ul className="leave-history">
                    {request.history.map((item) => (
                      <li key={item.date}>
                        <span>
                          {item.type}
                          <small>{formatDate(item.date, true)}</small>
                        </span>
                        <strong>
                          {item.days} {item.days === 1 ? 'day' : 'days'}
                        </strong>
                        <StatusBadge status="Approved" />
                      </li>
                    ))}
                  </ul>
                </section>
                {status === 'Approved' && classes.length > 0 && (
                  <p className="workflow-note">
                    Leave approval and class coverage are separate decisions.
                    Review every affected class before closing the academic
                    workflow.
                  </p>
                )}
              </div>
              <footer className="workflow-drawer-footer">
                {status === 'Pending' ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={(event) => {
                        actionButton.current = event.currentTarget;
                        setReason('');
                        setError('');
                        setConfirmation('reject');
                      }}
                    >
                      <Ban />
                      Reject
                    </Button>
                    <Button
                      variant="accent"
                      onClick={(event) => {
                        actionButton.current = event.currentTarget;
                        setConfirmation('approve');
                      }}
                    >
                      <Check />
                      Approve Leave
                    </Button>
                  </>
                ) : status === 'Approved' && classes.length ? (
                  <Button variant="accent" onClick={findSubstitutes}>
                    Review class coverage
                    <ArrowRight />
                  </Button>
                ) : (
                  <Button variant="outline" onClick={onClose}>
                    Close
                  </Button>
                )}
              </footer>
            </>
          )}
        </SheetContent>
      </Sheet>
      <Dialog
        open={confirmation !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmation(null);
        }}
      >
        <DialogContent
          className="workflow-confirmation"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            (actionButton.current?.isConnected
              ? actionButton.current
              : closeButton.current
            )?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {confirmation === 'approve'
                ? 'Approve leave request?'
                : 'Reject leave request?'}
            </DialogTitle>
            <DialogDescription>
              {confirmation === 'approve'
                ? classes.length
                  ? `Approving this leave will affect ${classes.length} scheduled ${classes.length === 1 ? 'class' : 'classes'}. Would you like CampusHR to find substitute faculty?`
                  : 'No scheduled classes are affected. You can approve this leave without a substitute.'
                : `This will mark ${faculty?.name}’s leave request as rejected .`}
            </DialogDescription>
          </DialogHeader>
          {confirmation === 'reject' && (
            <div className="flex flex-col gap-2">
              <label htmlFor="rejection-reason" className="text-sm font-medium">
                Reason for rejection
              </label>
              <Textarea
                id="rejection-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'rejection-error' : undefined}
                placeholder="Explain the decision to the faculty member."
              />
              {error && (
                <p
                  id="rejection-error"
                  className="text-sm text-destructive"
                  role="alert"
                >
                  {error}
                </p>
              )}
            </div>
          )}
          <div className="confirmation-actions">
            {confirmation === 'approve' ? (
              <>
                <Button
                  variant="accent"
                  disabled={!classes.length}
                  onClick={() => approve(true)}
                >
                  Approve &amp; Find Substitute
                </Button>
                <Button variant="outline" onClick={() => approve(false)}>
                  Approve Without Substitute
                </Button>
              </>
            ) : (
              <Button
                variant="destructive"
                onClick={() => {
                  if (!reason.trim()) {
                    setError('Enter a reason for rejection.');
                    return;
                  }
                  if (request) workflow.decide(request.id, 'Rejected', reason);
                  setConfirmation(null);
                  toast.success('Leave request has been rejected.', {
                    description: reason.trim(),
                  });
                }}
              >
                Reject Leave
              </Button>
            )}
            <Button variant="ghost" onClick={() => setConfirmation(null)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
