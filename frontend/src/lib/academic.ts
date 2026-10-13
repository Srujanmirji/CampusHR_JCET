import type { AffectedClass, Coverage } from '@/types/academic';
import { affectedClasses } from '@/data/mock/timetable';
import { facultyExpertise } from '@/data/mock/facultyExpertise';
import { getEmployee } from '@/data/mock/employees';

export function formatDate(date: string, year = false) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    ...(year ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}
export function formatTime(minutes: number) {
  const hour = Math.floor(minutes / 60);
  return `${hour % 12 || 12}:${String(minutes % 60).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
}
export function getAffectedClasses(leaveId: string) {
  return affectedClasses.filter((item) => item.leaveId === leaveId);
}
function weekStart(date: string) {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day.toISOString().slice(0, 10);
}
export function getCandidates(
  classItem: AffectedClass,
  coverage: Record<string, Coverage>,
) {
  return classItem.candidateIds
    .flatMap((id) => {
      const profile = facultyExpertise.find((item) => item.facultyId === id);
      if (!profile) return [];
      const assignments = affectedClasses.filter((item) => {
        const current = coverage[item.id];
        return (
          item.id !== classItem.id &&
          current?.kind === 'faculty' &&
          current.facultyId === id
        );
      });
      const workload =
        profile.workload +
        assignments
          .filter((item) => weekStart(item.date) === weekStart(classItem.date))
          .reduce((total, item) => total + item.hours, 0);
      const available = profile.available.find(
        (slot) => slot.start <= classItem.start && slot.end >= classItem.end,
      );
      const conflict = assignments.some(
        (item) =>
          item.date === classItem.date &&
          item.start < classItem.end &&
          classItem.start < item.end,
      );
      const isUnavailable = !available || conflict;
      const isOverloaded = workload + classItem.hours > profile.capacity;
      const disabledType:
        'Timetable Conflict' | 'Workload Limit Reached' | null = isUnavailable
        ? 'Timetable Conflict'
        : isOverloaded
          ? 'Workload Limit Reached'
          : null;
      const reason = isUnavailable
        ? 'Faculty has a timetable conflict or is unavailable during this lecture slot.'
        : isOverloaded
          ? `Assigning this class (+${classItem.hours} hrs) would exceed the ${profile.capacity}-hour weekly workload limit (currently at ${workload} hrs).`
          : null;
      const employee = getEmployee(id);
      const points = {
        ...profile.points,
        department: employee.department === classItem.department ? 15 : 6,
        workload: Math.max(
          0,
          profile.points.workload - (workload - profile.workload) * 2,
        ),
      };
      return [
        {
          employee,
          profile: { ...profile, points },
          workload,
          available,
          reason,
          disabledType,
          score: Object.values(points).reduce((a, b) => a + b, 0),
        },
      ];
    })
    .sort((a, b) => b.score - a.score);
}
export type Candidate = ReturnType<typeof getCandidates>[number];
