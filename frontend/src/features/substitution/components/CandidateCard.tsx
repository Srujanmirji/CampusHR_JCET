import { motion } from 'framer-motion';
import { Award, ArrowRight, Info, AlertTriangle } from 'lucide-react';
import type { Candidate } from '@/lib/academic';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function CandidateCard({
  candidate,
  best,
  onAssign,
}: {
  candidate: Candidate;
  best: boolean;
  onAssign: (trigger: HTMLButtonElement) => void;
}) {
  const { employee, profile, workload, score, reason, disabledType } =
    candidate;

  const subjectRating =
    profile.points.subject >= 33
      ? 'Excellent'
      : profile.points.subject >= 30
        ? 'Very Good'
        : 'Good';

  const deptMatch =
    profile.points.department >= 15 ? 'Same department' : 'Inter-department';

  const isUnavailable = disabledType === 'Timetable Conflict';
  const isOverloaded = disabledType === 'Workload Limit Reached';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card
        className={`candidate-card ${best ? 'border-primary shadow-sm' : ''} ${
          reason ? 'border-destructive/30 bg-card/60' : ''
        }`}
        data-best={best}
      >
        <CardContent className="flex flex-col gap-3.5 p-4">
          <div className="candidate-top flex justify-between items-start gap-2">
            <div className="candidate-person flex items-start gap-2.5 min-w-0">
              <Avatar className="w-10 h-10 shrink-0">
                <AvatarImage src={employee.photo} alt="" />
                <AvatarFallback>{employee.initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-primary truncate">
                  {employee.name}
                </h4>
                <p className="text-xs text-muted-foreground truncate">
                  {employee.designation} — {employee.department}
                </p>
              </div>
            </div>
            <div className="match-score text-right shrink-0">
              <div className="flex items-center justify-end gap-1">
                <strong className="text-xl font-bold text-primary tabular-nums">
                  {score}
                  <small className="text-xs font-normal">%</small>
                </strong>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground inline-flex items-center focus:outline-hidden"
                      aria-label="Information about match score calculation"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    Candidates are ranked using subject expertise, timetable
                    availability, department compatibility, teaching experience
                    and current workload.
                  </TooltipContent>
                </Tooltip>
              </div>
              <span className="text-[11px] text-muted-foreground block">
                Match Score
              </span>
            </div>
          </div>

          <div className="candidate-badges flex flex-wrap items-center gap-1.5">
            {best && !reason && (
              <Badge className="best-match bg-primary text-primary-foreground font-semibold flex items-center gap-1">
                <Award className="w-3 h-3" />
                Best Match
              </Badge>
            )}
            {disabledType ? (
              <Badge
                variant="outline"
                className="border-destructive/40 bg-destructive/10 text-destructive text-[11px] font-semibold"
              >
                {disabledType}
              </Badge>
            ) : !best ? (
              <Badge variant="outline" className="text-[11px]">
                Available Candidate
              </Badge>
            ) : null}
          </div>

          <div className="candidate-breakdown space-y-1.5 text-xs py-2 border-y border-border/70">
            <div className="flex justify-between items-baseline gap-2">
              <span className="text-muted-foreground">Subject expertise</span>
              <strong className="text-foreground font-medium text-right">
                {subjectRating}{' '}
                <span className="text-muted-foreground font-normal">
                  ({profile.subject})
                </span>
              </strong>
            </div>
            <div className="flex justify-between items-baseline gap-2">
              <span className="text-muted-foreground">Availability</span>
              <strong
                className={`text-right font-medium ${
                  isUnavailable
                    ? 'text-destructive font-semibold'
                    : 'text-foreground'
                }`}
              >
                {isUnavailable ? 'Timetable Conflict' : 'Available'}
              </strong>
            </div>
            <div className="flex justify-between items-baseline gap-2">
              <span className="text-muted-foreground">Department match</span>
              <strong className="text-foreground font-medium text-right">
                {deptMatch}
              </strong>
            </div>
            <div className="flex justify-between items-baseline gap-2">
              <span className="text-muted-foreground">Workload</span>
              <strong
                className={`text-right font-medium ${
                  isOverloaded
                    ? 'text-destructive font-semibold'
                    : 'text-foreground'
                }`}
              >
                {workload} / {profile.capacity} hrs
              </strong>
            </div>
            <div className="flex justify-between items-baseline gap-2">
              <span className="text-muted-foreground">Previous experience</span>
              <strong className="text-foreground font-medium text-right">
                {profile.semesters} semesters
              </strong>
            </div>
          </div>

          <progress
            className="workload-meter w-full h-1.5 rounded-full overflow-hidden"
            max={profile.capacity}
            value={Math.min(workload, profile.capacity)}
            aria-label={`${employee.name} current workload: ${workload} of ${profile.capacity} hours`}
          />

          {reason && (
            <div className="p-2.5 rounded-md bg-destructive/10 border border-destructive/20 text-xs text-destructive">
              <div className="flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span className="leading-snug">{reason}</span>
              </div>
            </div>
          )}

          {reason ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-full cursor-not-allowed">
                  <Button
                    variant="outline"
                    className="w-full opacity-60 text-xs"
                    disabled
                    aria-label={`Assign ${employee.name}`}
                  >
                    Cannot Assign — {disabledType}
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs">
                {reason}
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant={best ? 'accent' : 'outline'}
              className="w-full mt-auto"
              aria-label={`Assign ${employee.name}`}
              onClick={(event) => onAssign(event.currentTarget)}
            >
              Assign Faculty
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
