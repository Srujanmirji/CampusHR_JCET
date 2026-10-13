import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { SectionHeader } from '@/components/shared/PageHeader';
import { departmentData, attendanceData } from '@/data/mock/dashboard';

const tick = { fill: 'var(--muted-foreground)', fontSize: 'var(--text-xs)' };
const tooltipStyle = {
  borderRadius: 'var(--radius-control)',
  border: '1px solid var(--border)',
  background: 'var(--card)',
  color: 'var(--foreground)',
  fontSize: 'var(--text-sm)',
};

export function DashboardCharts() {
  return (
    <div className="dashboard-charts">
      <Card>
        <CardHeader>
          <SectionHeader
            title="Employees by department"
            description="Staff strength across the institution"
            action={
              <span className="chart-summary">
                186 <small>employees</small>
              </span>
            }
          />
        </CardHeader>
        <CardContent>
          <figure aria-label="Employees by department bar chart">
            <div className="chart-canvas">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart
                  data={departmentData}
                  margin={{ top: 16, right: 8, left: -24, bottom: 0 }}
                  accessibilityLayer
                >
                  <CartesianGrid
                    stroke="var(--border)"
                    vertical={false}
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    dataKey="department"
                    axisLine={false}
                    tickLine={false}
                    tick={tick}
                    tickMargin={12}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={tick}
                    domain={[0, 50]}
                    ticks={[0, 10, 20, 30, 40, 50]}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: 'var(--muted)' }}
                  />
                  <Bar
                    dataKey="employees"
                    name="Employees"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                    isAnimationActive={false}
                  >
                    {departmentData.map((item, index) => (
                      <Cell
                        key={item.department}
                        fill={
                          index === 0
                            ? 'var(--brand-orange)'
                            : 'var(--brand-navy)'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <figcaption className="sr-only">
              {departmentData
                .map(
                  (item) => `${item.department}: ${item.employees} employees`,
                )
                .join('; ')}
              .
            </figcaption>
          </figure>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <SectionHeader
            title="Attendance overview"
            description="Weekly campus attendance · sample week"
            action={<span className="chart-period">9–14 Mar</span>}
          />
        </CardHeader>
        <CardContent>
          <figure aria-label="Weekly present and absent attendance line chart">
            <div className="chart-legend">
              <span>
                <i data-series="present" />
                Present
              </span>
              <span>
                <i data-series="absent" />
                Absent
              </span>
            </div>
            <div className="chart-canvas attendance-canvas">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <LineChart
                  data={attendanceData}
                  margin={{ top: 12, right: 12, left: -20, bottom: 0 }}
                  accessibilityLayer
                >
                  <CartesianGrid
                    stroke="var(--border)"
                    vertical={false}
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={tick}
                    tickMargin={12}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={tick}
                    domain={[0, 200]}
                    ticks={[0, 50, 100, 150, 200]}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line
                    type="monotone"
                    dataKey="Present"
                    stroke="var(--brand-navy)"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: 'var(--card)', strokeWidth: 2 }}
                    activeDot={{ r: 5 }}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="Absent"
                    stroke="var(--brand-red)"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <figcaption className="sr-only">
              {attendanceData
                .map(
                  (day) =>
                    `${day.day}: ${day.Present} present, ${day.Absent} absent`,
                )
                .join('; ')}
              . Leave is recorded separately.
            </figcaption>
          </figure>
        </CardContent>
      </Card>
    </div>
  );
}
