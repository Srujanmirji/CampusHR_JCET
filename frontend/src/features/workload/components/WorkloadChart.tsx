import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  LOAD_LABEL,
  type LoadStatus,
  type WorkloadSummary,
} from '../api/workload';

const tick = { fill: 'var(--muted-foreground)', fontSize: 'var(--text-xs)' };
const tooltipStyle = {
  borderRadius: 'var(--radius-control)',
  border: '1px solid var(--border)',
  background: 'var(--card)',
  color: 'var(--foreground)',
  fontSize: 'var(--text-sm)',
};
const SERIES: { key: LoadStatus; color: string }[] = [
  { key: 'UNDERLOADED', color: 'var(--warning)' },
  { key: 'NORMAL', color: 'var(--success)' },
  { key: 'OVERLOADED', color: 'var(--destructive)' },
];

/** How many faculty teach each number of weekly hours, stacked by status. */
export function WorkloadChart({ rows }: { rows: WorkloadSummary[] }) {
  const top = Math.max(20, ...rows.map((row) => row.totalHours));
  const data = Array.from({ length: top + 1 }, (_, hours) => {
    const at = rows.filter((row) => row.totalHours === hours);
    return {
      hours,
      count: at.length,
      ...Object.fromEntries(
        SERIES.map(({ key }) => [
          key,
          at.filter((row) => row.status === key).length || undefined,
        ]),
      ),
      // Undefined rather than 0 keeps empty series out of the tooltip.
      NONE: at.filter((row) => row.status === null).length || undefined,
    };
  });
  const summary = data
    .filter((bucket) => bucket.count > 0)
    .map((bucket) => `${bucket.hours} h: ${bucket.count}`)
    .join('; ');

  return (
    <figure aria-label="Faculty by weekly teaching hours">
      <div className="mb-2 flex flex-wrap justify-end gap-4 text-xs text-muted-foreground">
        {SERIES.map(({ key, color }) => (
          <span key={key} className="flex items-center gap-1.5">
            <i
              className="size-2.5 rounded-xs"
              style={{ background: color }}
              aria-hidden="true"
            />
            {LOAD_LABEL[key]}
          </span>
        ))}
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, left: -24, bottom: 8 }}
            accessibilityLayer
          >
            <CartesianGrid
              stroke="var(--border)"
              vertical={false}
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="hours"
              axisLine={false}
              tickLine={false}
              tick={tick}
              interval="preserveStartEnd"
              label={{
                value: 'Hours a week',
                position: 'insideBottom',
                offset: -4,
                ...tick,
              }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={tick}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: 'var(--muted)' }}
              labelFormatter={(hours) => `${hours} hours a week`}
            />
            {SERIES.map(({ key, color }) => (
              <Bar
                key={key}
                dataKey={key}
                name={LOAD_LABEL[key]}
                stackId="load"
                fill={color}
                maxBarSize={28}
                isAnimationActive={false}
              />
            ))}
            <Bar
              dataKey="NONE"
              name="No band"
              stackId="load"
              fill="var(--muted-foreground)"
              maxBarSize={28}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">
        Faculty count by weekly hours — {summary}.
      </figcaption>
    </figure>
  );
}
