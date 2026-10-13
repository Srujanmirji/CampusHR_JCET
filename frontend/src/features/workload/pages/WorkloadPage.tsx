import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageTransition } from '@/components/shared/PageTransition';
import { MetricCard } from '@/components/shared/MetricCard';
import { WorkloadDrawer } from '../components/WorkloadDrawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { employees } from '@/data/mock/employees';
import { facultyWorkloads } from '@/data/mock/workload';
import type { WorkloadRecord } from '@/types/academic';
import {
  ChartNoAxesCombined,
  CheckCircle2,
  Flame,
  Search,
  FilterX,
  Clock,
  Eye,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';

export default function WorkloadPage() {
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [selectedRecord, setSelectedRecord] = useState<WorkloadRecord | null>(
    null,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filteredWorkloads = useMemo(() => {
    return facultyWorkloads
      .map((w) => {
        const emp = employees.find((e) => e.id === w.facultyId);
        return { ...w, faculty: emp };
      })
      .filter((item) => {
        if (!item.faculty) return false;

        if (search.trim()) {
          const q = search.toLowerCase();
          const matchesName = item.faculty.name.toLowerCase().includes(q);
          const matchesId = item.faculty.id.toLowerCase().includes(q);
          if (!matchesName && !matchesId) return false;
        }

        if (
          departmentFilter !== 'ALL' &&
          item.department !== departmentFilter
        ) {
          return false;
        }

        if (statusFilter !== 'ALL' && item.status !== statusFilter) {
          return false;
        }

        return true;
      });
  }, [search, departmentFilter, statusFilter]);

  function handleViewDetails(record: WorkloadRecord) {
    setSelectedRecord(record);
    setDrawerOpen(true);
  }

  return (
    <PageTransition>
      <PageHeader
        title="Faculty Teaching Workload"
        description="Monitor weekly lecture loads, laboratory hours, and capacity limits across departments."
        action={
          <Button
            variant="outline"
            onClick={() =>
              toast.info('Workload dossier export isn’t available yet.', {
                id: 'exp-wl',
              })
            }
          >
            <Download className="mr-2 h-4 w-4" />
            Audit Report PDF
          </Button>
        }
      />

      {/* Summary Cards */}
      <section
        aria-label="Faculty workload summary statistics"
        className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <MetricCard
          label="Faculty Tracked"
          value={132}
          detail="All full-time teaching faculty"
          icon={ChartNoAxesCombined}
          index={0}
        />
        <MetricCard
          label="Normal Workload"
          value={108}
          detail="Within standard VTU 14–16h limit"
          icon={CheckCircle2}
          index={1}
        />
        <MetricCard
          label="Underloaded"
          value={14}
          detail="Under 14h; eligible for extra duties"
          icon={Clock}
          index={2}
        />
        <MetricCard
          label="Overloaded / Limit"
          value={10}
          detail="Near or exceeding 18h cap"
          icon={Flame}
          index={3}
        />
      </section>

      {/* Filters and Search */}
      <div className="mb-4 rounded-xl border bg-card p-4 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search faculty name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={departmentFilter}
              onValueChange={setDepartmentFilter}
            >
              <SelectTrigger className="w-[140px] text-xs">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Depts</SelectItem>
                <SelectItem value="CSE">CSE</SelectItem>
                <SelectItem value="ECE">ECE</SelectItem>
                <SelectItem value="ME">Mechanical</SelectItem>
                <SelectItem value="CE">Civil</SelectItem>
                <SelectItem value="AI & ML">AI & ML</SelectItem>
                <SelectItem value="MBA">MBA</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="Normal">Normal</SelectItem>
                <SelectItem value="Underloaded">Underloaded</SelectItem>
                <SelectItem value="Near Limit">Near Limit</SelectItem>
                <SelectItem value="At Capacity">At Capacity</SelectItem>
              </SelectContent>
            </Select>

            {(search ||
              departmentFilter !== 'ALL' ||
              statusFilter !== 'ALL') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setDepartmentFilter('ALL');
                  setStatusFilter('ALL');
                }}
                className="h-9 px-2 text-xs"
              >
                <FilterX className="mr-1 h-3.5 w-3.5" />
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Workload Table */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Faculty</th>
                <th className="px-4 py-3">Dept</th>
                <th className="px-3 py-3 text-center">Theory</th>
                <th className="px-3 py-3 text-center">Lab</th>
                <th className="px-3 py-3 text-center">Project</th>
                <th className="px-3 py-3 text-center">Mentoring</th>
                <th className="px-3 py-3 text-center">Other</th>
                <th className="px-3 py-3 text-center font-bold text-foreground">
                  Total
                </th>
                <th className="px-3 py-3 text-center">Cap</th>
                <th className="px-4 py-3 min-w-[120px]">Workload Bar</th>
                <th className="px-3 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredWorkloads.length === 0 ? (
                <tr>
                  <td
                    colSpan={12}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No faculty found matching the current filters.
                  </td>
                </tr>
              ) : (
                filteredWorkloads.map((item) => {
                  const emp = item.faculty!;
                  const percent = Math.min(
                    100,
                    Math.round((item.total / item.capacity) * 100),
                  );

                  return (
                    <tr
                      key={item.facultyId}
                      className="cursor-pointer transition-colors hover:bg-muted/30"
                      onClick={() => handleViewDetails(item)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8">
                            {emp.photo && (
                              <AvatarImage src={emp.photo} alt={emp.name} />
                            )}
                            <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                              {emp.initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold text-foreground">
                              {emp.name}
                            </div>
                            <div className="text-[11px] font-mono text-muted-foreground">
                              {emp.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {item.department}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-center font-mono text-xs">
                        {item.theory}h
                      </td>
                      <td className="px-3 py-3 text-center font-mono text-xs">
                        {item.lab}h
                      </td>
                      <td className="px-3 py-3 text-center font-mono text-xs">
                        {item.project}h
                      </td>
                      <td className="px-3 py-3 text-center font-mono text-xs">
                        {item.mentoring}h
                      </td>
                      <td className="px-3 py-3 text-center font-mono text-xs">
                        {item.other}h
                      </td>
                      <td className="px-3 py-3 text-center font-mono text-sm font-bold text-foreground">
                        {item.total}h
                      </td>
                      <td className="px-3 py-3 text-center font-mono text-xs text-muted-foreground">
                        {item.capacity}h
                      </td>
                      <td className="px-4 py-3">
                        <div className="w-full">
                          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full transition-all ${
                                item.status === 'At Capacity'
                                  ? 'bg-red-500'
                                  : item.status === 'Near Limit'
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {percent}% used
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <Badge
                          variant={
                            item.status === 'At Capacity'
                              ? 'destructive'
                              : item.status === 'Near Limit'
                                ? 'secondary'
                                : 'outline'
                          }
                          className="text-[11px]"
                        >
                          {item.status}
                        </Badge>
                      </td>
                      <td
                        className="px-4 py-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1 px-2 text-xs"
                          onClick={() => handleViewDetails(item)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Free Slots
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <WorkloadDrawer
        record={selectedRecord}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </PageTransition>
  );
}
