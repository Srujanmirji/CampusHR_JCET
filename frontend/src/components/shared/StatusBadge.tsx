import { Badge } from '@/components/ui/badge';

export type Status =
  | 'Active'
  | 'Inactive'
  | 'Present'
  | 'Absent'
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'Overloaded'
  | 'Underloaded'
  | 'On Leave'
  | 'Late'
  | 'Half Day'
  | 'Available'
  | 'At Capacity'
  | 'Near Limit';

const tones: Record<Status, string> = {
  Active: 'positive',
  Present: 'positive',
  Approved: 'positive',
  Available: 'positive',
  Inactive: 'neutral',
  Underloaded: 'neutral',
  'On Leave': 'warning',
  'Half Day': 'warning',
  Late: 'warning',
  'Near Limit': 'warning',
  Pending: 'warning',
  Overloaded: 'negative',
  'At Capacity': 'negative',
  Absent: 'negative',
  Rejected: 'negative',
};

export function StatusBadge({
  status,
  label,
}: {
  status: Status;
  label?: string;
}) {
  const tone = tones[status] ?? 'neutral';
  return (
    <Badge variant="outline" className="status-badge" data-tone={tone}>
      <span className="status-dot" aria-hidden="true" />
      {label ?? status}
    </Badge>
  );
}
