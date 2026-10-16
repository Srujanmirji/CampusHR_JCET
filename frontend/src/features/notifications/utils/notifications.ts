import {
  Bell,
  CalendarCheck2,
  CalendarClock,
  CalendarX2,
  Megaphone,
  Repeat2,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  'leave.waiting': CalendarClock,
  'leave.progress': CalendarClock,
  'leave.approved': CalendarCheck2,
  'leave.rejected': CalendarX2,
  'substitution.assigned': Repeat2,
  announcement: Megaphone,
};
export const iconFor = (kind: string) => ICONS[kind] ?? Bell;

const relative = new Intl.RelativeTimeFormat('en-IN', { numeric: 'auto' });
const absolute = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' });

/** "5 minutes ago", "yesterday", then a date after a week. */
export function timeAgo(iso: string, now = Date.now()) {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);
  if (Math.abs(seconds) < 60) return 'just now';
  if (Math.abs(minutes) < 60) return relative.format(minutes, 'minute');
  if (Math.abs(hours) < 24) return relative.format(hours, 'hour');
  if (Math.abs(days) < 7) return relative.format(days, 'day');
  return absolute.format(new Date(iso));
}
