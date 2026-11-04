import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CalendarClock,
  Download,
  CheckCircle2,
  RefreshCw,
  Search,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { previewLeaveRollover, executeLeaveRollover } from '../api/leave';
import { listDepartments } from '@/features/departments/api/departments';

interface LeaveRolloverModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeaveRolloverModal({
  open,
  onOpenChange,
}: LeaveRolloverModalProps) {
  const queryClient = useQueryClient();
  const currentYear = new Date().getUTCFullYear();
  const [fromYear, setFromYear] = useState<number>(currentYear);
  const [toYear, setToYear] = useState<number>(currentYear + 1);
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [encashSurplus, setEncashSurplus] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [confirmingExecute, setConfirmingExecute] = useState(false);

  // Departments
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: listDepartments,
    enabled: open,
  });

  // Selected department ID
  const selectedDeptId =
    deptFilter !== 'ALL'
      ? departments?.find((d) => d.code === deptFilter)?.id
      : undefined;

  // Preview Query
  const {
    data: summary,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: [
      'leave',
      'rollover',
      fromYear,
      toYear,
      selectedDeptId,
      encashSurplus,
    ],
    queryFn: () =>
      previewLeaveRollover({
        year: fromYear,
        targetYear: toYear,
        departmentId: selectedDeptId,
        encashSurplusEL: encashSurplus,
      }),
    enabled: open,
  });

  // Execute Rollover Mutation
  const executeMutation = useMutation({
    mutationFn: () =>
      executeLeaveRollover({
        fromYear,
        toYear,
        departmentId: selectedDeptId,
        encashSurplusEL: encashSurplus,
        notes: `Annual institutional rollover from ${fromYear} to ${toYear}`,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leave'] });
      toast.success(
        `Leave rollover for ${data.summary.totalEmployees} employees completed successfully!`,
      );
      setConfirmingExecute(false);
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error(`Rollover execution failed: ${err.message}`);
    },
  });

  // Download CSV
  const handleExportCsv = () => {
    if (!summary || summary.records.length === 0) {
      toast.error('No rollover records to export.');
      return;
    }

    const headers = [
      'Employee Code',
      'Faculty Name',
      'Department',
      'Leave Type',
      `${fromYear} Quota`,
      `${fromYear} Closing Balance`,
      `Carried Forward to ${toYear}`,
      'Lapsed Days',
      'Encashed Days',
      `${toYear} Opening Balance`,
    ];

    const rows: string[][] = [];
    for (const rec of summary.records) {
      for (const b of rec.balances) {
        rows.push([
          rec.employeeCode,
          `"${rec.name.replace(/"/g, '""')}"`,
          rec.department.code,
          b.leaveTypeCode,
          b.yearlyQuota !== null ? String(b.yearlyQuota) : 'As per policy',
          b.closingBalance !== null ? String(b.closingBalance) : '—',
          String(b.carriedForward),
          String(b.lapsed),
          String(b.encashed),
          b.nextYearOpening !== null
            ? String(b.nextYearOpening)
            : 'As per policy',
        ]);
      }
    }

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `JCET_Leave_Rollover_${fromYear}_${toYear}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Rollover Statement CSV downloaded.');
  };

  // Filter records
  const filteredRecords = (summary?.records || []).filter((rec) => {
    const term = search.toLowerCase().trim();
    if (!term) return true;
    return (
      rec.name.toLowerCase().includes(term) ||
      rec.employeeCode.toLowerCase().includes(term) ||
      rec.department.code.toLowerCase().includes(term)
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/50">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>
                Annual Leave Rollover & Year-End Automation
              </DialogTitle>
              <DialogDescription>
                Simulate annual carry-forward quotas, apply VTU/JCET caps (e.g.
                max 15 days for Earned Leave), audit lapsed balances, and
                initialize the next academic year.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Configuration Bar */}
        <div className="p-3.5 bg-muted/40 rounded-xl border space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase">
                Transition:
              </span>
              <div className="flex items-center gap-1.5 font-medium text-sm">
                <Select
                  value={String(fromYear)}
                  onValueChange={(v) => {
                    setFromYear(Number(v));
                    setToYear(Number(v) + 1);
                  }}
                >
                  <SelectTrigger className="h-8 w-24 text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2026">2026</SelectItem>
                    <SelectItem value="2027">2027</SelectItem>
                  </SelectContent>
                </Select>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                <Badge
                  variant="outline"
                  className="h-8 px-2.5 font-semibold text-xs"
                >
                  {toYear}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Departments</SelectItem>
                  {departments?.map((d) => (
                    <SelectItem key={d.id} value={d.code}>
                      {d.code} - {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                size="sm"
                variant="outline"
                onClick={() => refetch()}
                disabled={isFetching}
                className="h-8 text-xs"
              >
                <RefreshCw
                  className={`h-3 w-3 mr-1 ${isFetching ? 'animate-spin' : ''}`}
                />
                Recalculate
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t text-xs text-foreground">
            <Checkbox
              id="encash-surplus"
              checked={encashSurplus}
              onCheckedChange={(checked) => setEncashSurplus(Boolean(checked))}
            />
            <label
              htmlFor="encash-surplus"
              className="cursor-pointer select-none text-muted-foreground"
            >
              Optionally encash surplus Earned Leave (EL) beyond the 15-day
              carry-forward limit instead of lapsing
            </label>
          </div>
        </div>

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-4 gap-3">
          <div className="p-3 border rounded-xl bg-card">
            <span className="text-[11px] text-muted-foreground block font-medium">
              Staff Evaluated
            </span>
            <span className="text-xl font-bold text-foreground">
              {isLoading ? '...' : (summary?.totalEmployees ?? 0)}
            </span>
          </div>
          <div className="p-3 border rounded-xl bg-card">
            <span className="text-[11px] text-muted-foreground block font-medium">
              Days Carried Forward
            </span>
            <span className="text-xl font-bold text-emerald-600 flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              {isLoading ? '...' : (summary?.totalDaysCarriedForward ?? 0)}
            </span>
          </div>
          <div className="p-3 border rounded-xl bg-card">
            <span className="text-[11px] text-muted-foreground block font-medium">
              Days Lapsed
            </span>
            <span className="text-xl font-bold text-rose-600">
              {isLoading ? '...' : (summary?.totalDaysLapsed ?? 0)}
            </span>
          </div>
          <div className="p-3 border rounded-xl bg-card">
            <span className="text-[11px] text-muted-foreground block font-medium">
              {encashSurplus ? 'Days Encashed' : 'Surplus Encashable'}
            </span>
            <span className="text-xl font-bold text-amber-600">
              {isLoading ? '...' : (summary?.totalDaysEncashed ?? 0)}
            </span>
          </div>
        </div>

        {/* Search & Export Controls */}
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search faculty or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCsv}
              className="h-8 text-xs"
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              Export CSV Statement
            </Button>
            {!confirmingExecute ? (
              <Button
                size="sm"
                onClick={() => setConfirmingExecute(true)}
                className="h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                Finalize {toYear} Rollover
              </Button>
            ) : (
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmingExecute(false)}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => executeMutation.mutate()}
                  disabled={executeMutation.isPending}
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {executeMutation.isPending ? (
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  )}
                  Confirm Execution
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 border-b text-muted-foreground">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Faculty / Staff</th>
                <th className="py-2.5 px-3 font-semibold">Dept</th>
                <th className="py-2.5 px-3 font-semibold">Leave Type</th>
                <th className="py-2.5 px-3 font-semibold text-right">
                  {fromYear} Closing
                </th>
                <th className="py-2.5 px-3 font-semibold text-right">
                  Carry to {toYear}
                </th>
                <th className="py-2.5 px-3 font-semibold text-right">Lapsed</th>
                <th className="py-2.5 px-3 font-semibold text-right">
                  {toYear} Opening
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-6 text-center text-muted-foreground"
                  >
                    No faculty records found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) =>
                  rec.balances.map((b, idx) => (
                    <tr
                      key={`${rec.employeeId}-${b.leaveTypeId}`}
                      className="hover:bg-accent/30 transition-colors"
                    >
                      {idx === 0 && (
                        <td
                          rowSpan={rec.balances.length}
                          className="py-2.5 px-3 font-medium text-foreground align-top border-r bg-card/40"
                        >
                          <div>{rec.name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {rec.employeeCode}
                          </div>
                        </td>
                      )}
                      {idx === 0 && (
                        <td
                          rowSpan={rec.balances.length}
                          className="py-2.5 px-3 font-mono text-[11px] align-top border-r"
                        >
                          {rec.department.code}
                        </td>
                      )}
                      <td className="py-2 px-3">
                        <span className="font-semibold text-foreground">
                          {b.leaveTypeCode}
                        </span>{' '}
                        <span className="text-muted-foreground text-[11px]">
                          ({b.leaveTypeName})
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-medium">
                        {b.closingBalance !== null
                          ? `${b.closingBalance} d`
                          : '—'}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-emerald-600">
                        {b.carriedForward > 0 ? `+${b.carriedForward} d` : '0'}
                      </td>
                      <td className="py-2 px-3 text-right text-rose-600 font-medium">
                        {b.lapsed > 0 ? `-${b.lapsed} d` : '0'}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-foreground">
                        {b.nextYearOpening !== null
                          ? `${b.nextYearOpening} d`
                          : '—'}
                      </td>
                    </tr>
                  )),
                )
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
