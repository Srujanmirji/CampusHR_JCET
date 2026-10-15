import { StatusBadge } from '@/components/shared/StatusBadge';
import { LOAD_LABEL, type LoadStatus } from '../api/workload';

export function LoadBadge({ status }: { status: LoadStatus | null }) {
  return status ? (
    <StatusBadge status={LOAD_LABEL[status]} />
  ) : (
    <StatusBadge status="Inactive" label="No band" />
  );
}
