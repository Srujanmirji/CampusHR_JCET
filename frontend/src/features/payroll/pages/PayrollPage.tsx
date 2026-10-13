import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageTransition } from '@/components/shared/PageTransition';
import { MetricCard } from '@/components/shared/MetricCard';
import { PlannedModuleBanner } from '@/components/shared/PlannedModuleBanner';
import { PayslipModal } from '../components/PayslipModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { employees } from '@/data/mock/employees';
import { mockPayrollRecords } from '@/data/mock/payroll';
import type { PayrollRecord } from '@/types/academic';
import {
  WalletCards,
  Users,
  FileCheck2,
  AlertCircle,
  Search,
  FilterX,
  FileSpreadsheet,
  Eye,
  Receipt,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

export default function PayrollPage() {
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');

  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);
  const [payslipOpen, setPayslipOpen] = useState(false);

  function formatRupees(amount: number) {
    return '₹' + amount.toLocaleString('en-IN');
  }

  const filteredRecords = useMemo(() => {
    return mockPayrollRecords
      .map((rec) => {
        const emp = employees.find((e) => e.id === rec.employeeId);
        return { ...rec, employee: emp };
      })
      .filter((item) => {
        if (!item.employee) return false;

        if (search.trim()) {
          const q = search.toLowerCase();
          const matchesName = item.employee.name.toLowerCase().includes(q);
          const matchesId = item.employee.id.toLowerCase().includes(q);
          if (!matchesName && !matchesId) return false;
        }

        if (departmentFilter !== 'ALL' && item.employee.department !== departmentFilter) {
          return false;
        }

        return true;
      });
  }, [search, departmentFilter]);

  function handleViewPayslip(record: PayrollRecord) {
    setSelectedRecord(record);
    setPayslipOpen(true);
  }

  return (
    <PageTransition>
      <PageHeader
        title="Payroll & Compensation Preview"
        description="Salary registers, statutory deduction previews, and monthly disbursal drafts."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() =>
                toast.info('Export will be enabled after backend integration.', {
                  id: 'exp-pay',
                })
              }
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export Excel
            </Button>
            <Button
              onClick={() =>
                toast.info('Generate Payroll calculation is available after backend integration.', {
                  id: 'gen-pay',
                })
              }
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Payroll
            </Button>
          </div>
        }
      />

      <PlannedModuleBanner route="/payroll" />

      {/* Prominent Fictional Disclaimer */}
      <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-900 dark:text-amber-200">
        <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div>
          <span className="font-bold">Prototype payroll values are fictional and shown only for UI demonstration.</span>
          <p className="mt-0.5 text-muted-foreground">
            Real compensation figures, bank IFSC codes, and income tax brackets will be populated via the secure ERP payroll service.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <section aria-label="Payroll summary overview" className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Payroll Month"
          value="October 2026"
          detail="Scheduled disbursal: Oct 31"
          icon={Receipt}
          index={0}
        />
        <MetricCard
          label="Employees"
          value={186}
          detail="132 teaching · 54 non-teaching"
          icon={Users}
          index={1}
        />
        <MetricCard
          label="Status"
          value="Draft"
          detail="Awaiting administrative sign-off"
          icon={FileCheck2}
          index={2}
        />
        <MetricCard
          label="Estimated Gross"
          value="₹1.18 Cr"
          detail="Net payable: ₹1.04 Cr after PF/PT"
          icon={WalletCards}
          index={3}
        />
      </section>

      {/* Filters */}
      <div className="mb-4 rounded-xl border bg-card p-4 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search faculty or staff by name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[150px] text-xs">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Departments</SelectItem>
                <SelectItem value="CSE">CSE</SelectItem>
                <SelectItem value="ECE">ECE</SelectItem>
                <SelectItem value="ME">Mechanical</SelectItem>
                <SelectItem value="CE">Civil</SelectItem>
                <SelectItem value="AI & ML">AI & ML</SelectItem>
                <SelectItem value="MBA">MBA</SelectItem>
              </SelectContent>
            </Select>

            {(search || departmentFilter !== 'ALL') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setDepartmentFilter('ALL');
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

      {/* Payroll Table */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3 text-right">Gross Salary</th>
                <th className="px-4 py-3 text-right">Deductions</th>
                <th className="px-4 py-3 text-right font-bold text-foreground">Net Salary</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground">
                    No payroll records matching current filter.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((item) => {
                  const emp = item.employee!;

                  return (
                    <tr
                      key={item.id}
                      className="cursor-pointer transition-colors hover:bg-muted/30"
                      onClick={() => handleViewPayslip(item)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8">
                            {emp.photo && <AvatarImage src={emp.photo} alt={emp.name} />}
                            <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                              {emp.initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold text-foreground">{emp.name}</div>
                            <div className="text-[11px] text-muted-foreground">{emp.designation}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-medium text-foreground">
                        {emp.id}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {emp.department}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs">
                        {formatRupees(item.grossSalary)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-red-600">
                        -{formatRupees(item.deductions)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm font-bold text-foreground">
                        {formatRupees(item.netSalary)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="secondary" className="text-xs">
                          {item.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1 px-2 text-xs"
                          onClick={() => handleViewPayslip(item)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View Payslip
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

      <PayslipModal
        record={selectedRecord}
        open={payslipOpen}
        onOpenChange={setPayslipOpen}
      />
    </PageTransition>
  );
}
