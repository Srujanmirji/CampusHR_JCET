import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  BookOpen,
  Briefcase,
  Edit2,
  LoaderCircle,
  Plus,
  RefreshCw,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/shared/EmptyState';
import { SectionHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApiError } from '@/services/api';
import {
  createLeaveAdjustment,
  fetchPolicyGroups,
  getDutyMappings,
  listLeaveAdjustments,
  listLeavePolicies,
  saveLeavePolicy,
  type LeavePolicyDto,
} from '../api/leave';
import { getLeaveTheme } from '../utils/leave';

type SubView = 'policies' | 'adjustments' | 'duty-mappings';

export function LeaveTypesPanel() {
  const [subView, setSubView] = useState<SubView>('policies');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'TEACHING' | 'NON_TEACHING'>('ALL');
  const [editingPolicy, setEditingPolicy] = useState<LeavePolicyDto | 'new' | null>(null);
  const [newAdjustmentOpen, setNewAdjustmentOpen] = useState(false);

  const policiesQuery = useQuery({
    queryKey: ['leave-policies', 'all'],
    queryFn: () => listLeavePolicies(),
  });

  const adjustmentsQuery = useQuery({
    queryKey: ['leave-adjustments'],
    queryFn: () => listLeaveAdjustments(),
    enabled: subView === 'adjustments',
  });

  const dutyMappingsQuery = useQuery({
    queryKey: ['duty-mappings'],
    queryFn: getDutyMappings,
    enabled: subView === 'duty-mappings',
  });

  const policies = policiesQuery.data ?? [];
  const filteredPolicies = policies.filter((p) => {
    if (categoryFilter === 'ALL') return true;
    return p.employeeCategory === categoryFilter || p.appliesToAllCategories;
  });

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <SectionHeader
            title="Configurable Leave Policy Engine"
            description="Institution-level Leave Policy source of truth: Dual workforce rules, annual quotas, carry-forward limits, attendance mapping, and duty classifications for JCET Hubballi."
          />
          <div className="flex items-center gap-2">
            {subView === 'policies' && (
              <Button onClick={() => setEditingPolicy('new')} size="sm">
                <Plus className="size-4 mr-1.5" />
                Add Policy
              </Button>
            )}
            {subView === 'adjustments' && (
              <Button onClick={() => setNewAdjustmentOpen(true)} size="sm">
                <Plus className="size-4 mr-1.5" />
                New Adjustment
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-3">
          <Tabs value={subView} onValueChange={(val) => setSubView(val as SubView)}>
            <TabsList>
              <TabsTrigger value="policies" className="gap-1.5">
                <Scale className="size-3.5" />
                Policies & Entitlements
              </TabsTrigger>
              <TabsTrigger value="adjustments" className="gap-1.5">
                <RefreshCw className="size-3.5" />
                Balance Adjustments
              </TabsTrigger>
              <TabsTrigger value="duty-mappings" className="gap-1.5">
                <Briefcase className="size-3.5" />
                OOD / ODE Duty Mappings
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {subView === 'policies' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Workforce:</span>
              <Select
                value={categoryFilter}
                onValueChange={(val) => setCategoryFilter(val as 'ALL' | 'TEACHING' | 'NON_TEACHING')}
              >
                <SelectTrigger className="h-8 w-44 text-xs">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Staff Categories</SelectItem>
                  <SelectItem value="TEACHING">Teaching Faculty Only</SelectItem>
                  <SelectItem value="NON_TEACHING">Non-Teaching Staff Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-0">
        {subView === 'policies' && (
          <div>
            <div className="mx-6 my-2 rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300 flex items-start gap-2.5">
              <AlertCircle className="size-4 shrink-0 text-amber-700 dark:text-amber-400 mt-0.5" />
              <div>
                <span className="font-semibold block text-amber-950 dark:text-amber-200">
                  Institutional Policy Baseline (JCET Hubballi)
                </span>
                The entitlements and settings below reflect initial operational baselines. Unconfirmed rules (including carry-forward caps, medical certificate thresholds, break combinations, and staff vacation eligibility) remain labeled as <strong>Awaiting Approval</strong> or <strong>Not Configured</strong> until formally approved by JCET administration.
              </div>
            </div>

            {policiesQuery.isPending ? (
              <div className="flex flex-col gap-2 px-6 py-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : policiesQuery.isError ? (
              <EmptyState
                title="Couldn't load leave policies"
                description={policiesQuery.error.message}
                actionLabel="Try again"
                onAction={() => void policiesQuery.refetch()}
              />
            ) : filteredPolicies.length === 0 ? (
              <EmptyState
                title="No policies found"
                description="No policies match the selected workforce filter. Add a policy or select all categories."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[58rem]">
                  <TableCaption className="sr-only">
                    JCET Leave Policies and Rules
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col" className="pl-6">Code & Policy</TableHead>
                      <TableHead scope="col">Workforce</TableHead>
                      <TableHead scope="col" className="text-right">Entitlement</TableHead>
                      <TableHead scope="col">Carry Forward</TableHead>
                      <TableHead scope="col">Half-Day</TableHead>
                      <TableHead scope="col">Notice / Max</TableHead>
                      <TableHead scope="col">Coverage Type</TableHead>
                      <TableHead scope="col">Attendance</TableHead>
                      <TableHead scope="col">Status</TableHead>
                      <TableHead scope="col" className="pr-6 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPolicies.map((pol) => {
                      const theme = getLeaveTheme(pol.code);
                      const isTeaching = pol.employeeCategory === 'TEACHING';

                      return (
                        <TableRow key={pol.id}>
                          <TableCell className="pl-6">
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${theme.bg} ${theme.text}`}
                              >
                                {pol.code}
                              </span>
                              <div>
                                <span className="font-medium text-foreground block">
                                  {pol.name}
                                </span>
                                {pol.description && (
                                  <span className="text-xs text-muted-foreground line-clamp-1">
                                    {pol.description}
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <span
                              className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${
                                isTeaching
                                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                              }`}
                            >
                              {isTeaching ? <BookOpen className="size-3" /> : <Briefcase className="size-3" />}
                              {isTeaching ? 'Teaching Faculty' : 'Non-Teaching'}
                            </span>
                          </TableCell>

                          <TableCell className="text-right tabular-nums font-semibold">
                            {pol.annualEntitlement !== null ? (
                              `${pol.annualEntitlement} ${pol.entitlementUnit.toLowerCase()}`
                            ) : (
                              <span className="text-xs text-muted-foreground font-normal">
                                As per policy
                              </span>
                            )}
                          </TableCell>

                          <TableCell className="text-xs">
                            {pol.carryForwardAllowed ? (
                              pol.carryForwardLimit !== null && pol.carryForwardLimit !== undefined ? (
                                <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                                  Capped at {pol.carryForwardLimit}d
                                </span>
                              ) : (
                                <span className="text-amber-700 dark:text-amber-400 font-medium">
                                  Not Configured
                                </span>
                              )
                            ) : (
                              <span className="text-muted-foreground">Lapses at year-end</span>
                            )}
                          </TableCell>

                          <TableCell className="text-xs">
                            {pol.halfDayAllowed ? 'Allowed' : 'Disabled'}
                          </TableCell>

                          <TableCell className="text-xs text-muted-foreground">
                            {pol.minimumNoticeDays}d notice
                            {pol.maximumConsecutiveDays ? ` · max ${pol.maximumConsecutiveDays}d` : ''}
                          </TableCell>

                          <TableCell className="text-xs">
                            {isTeaching ? (
                              <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                                Academic Coverage (Timetable)
                              </span>
                            ) : (
                              <span className="text-teal-600 dark:text-teal-400 font-medium">
                                Operational Duty
                              </span>
                            )}
                          </TableCell>

                          <TableCell className="text-xs font-medium">
                            {pol.attendanceStatus === 'ON_DUTY' ? (
                              <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                <ShieldCheck className="size-3" />
                                Official Duty
                              </span>
                            ) : pol.attendanceStatus === 'RESTRICTED_HOLIDAY' ? (
                              <span className="text-amber-600 dark:text-amber-400">Restricted Holiday</span>
                            ) : pol.attendanceStatus === 'VACATION_LEAVE' ? (
                              <span className="text-sky-600 dark:text-sky-400">Vacation Leave</span>
                            ) : (
                              <span className="text-foreground">On Leave</span>
                            )}
                          </TableCell>

                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <StatusBadge
                                status={pol.active ? 'Active' : 'Inactive'}
                                label={pol.active ? 'Active' : 'Inactive'}
                              />
                              {pol.approvalStatus === 'AWAITING_APPROVAL' && (
                                <span className="inline-flex items-center rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300 w-fit">
                                  Awaiting Approval
                                </span>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="pr-6 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingPolicy(pol)}
                            >
                              <Edit2 className="size-3.5 mr-1" />
                              Configure
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        {subView === 'adjustments' && (
          <div className="px-6 py-2">
            {adjustmentsQuery.isPending ? (
              <div className="flex flex-col gap-2 py-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : adjustmentsQuery.isError ? (
              <EmptyState
                title="Couldn't load adjustments"
                description={adjustmentsQuery.error.message}
                actionLabel="Try again"
                onAction={() => void adjustmentsQuery.refetch()}
              />
            ) : (adjustmentsQuery.data ?? []).length === 0 ? (
              <EmptyState
                title="No balance adjustments on record"
                description="Audit ledger is clean. Use 'New Adjustment' to record opening corrections or emergency credits."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Leave Code</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Adjustment Type</TableHead>
                    <TableHead className="text-right">Days</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Recorded At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adjustmentsQuery.data.map((adj) => (
                    <TableRow key={adj.id}>
                      <TableCell className="font-medium">
                        {adj.employee ? `${adj.employee.firstName} ${adj.employee.lastName} (${adj.employee.employeeCode})` : adj.employeeId}
                      </TableCell>
                      <TableCell className="font-mono uppercase font-semibold">{adj.leaveCode}</TableCell>
                      <TableCell>{adj.policyYear}</TableCell>
                      <TableCell>
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-semibold ${
                            adj.adjustmentType === 'CREDIT'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : adj.adjustmentType === 'DEBIT'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {adj.adjustmentType.replaceAll('_', ' ')}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        {adj.adjustmentType === 'DEBIT' ? `-${adj.days}` : `+${adj.days}`}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{adj.reason}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {new Date(adj.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}

        {subView === 'duty-mappings' && (
          <div className="px-6 py-2">
            {dutyMappingsQuery.isPending ? (
              <div className="flex flex-col gap-2 py-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : dutyMappingsQuery.isError ? (
              <EmptyState
                title="Couldn't load duty mappings"
                description={dutyMappingsQuery.error.message}
                actionLabel="Try again"
                onAction={() => void dutyMappingsQuery.refetch()}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Duty Category</TableHead>
                    <TableHead>Leave Target</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Attendance Classification</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dutyMappingsQuery.data.map((map) => (
                    <TableRow key={map.id}>
                      <TableCell className="font-medium text-foreground">
                        {map.title}
                        <span className="block text-xs font-mono text-muted-foreground">{map.dutyCategory}</span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded px-2.5 py-0.5 text-xs font-semibold ${
                            map.targetLeaveCode === 'ODE'
                              ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300'
                              : 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                          }`}
                        >
                          {map.targetLeaveCode === 'ODE' ? 'ODE (Examination Duty)' : 'OOD (Official Duty)'}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {map.description ?? 'Official institutional duty assignment'}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                          <ShieldCheck className="size-3" />
                          Official Duty (Never Absent)
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={map.active ? 'Active' : 'Inactive'}
                          label={map.active ? 'Active' : 'Disabled'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </CardContent>

      {editingPolicy && (
        <EditPolicyDialog
          policy={editingPolicy === 'new' ? undefined : editingPolicy}
          onClose={() => setEditingPolicy(null)}
        />
      )}

      {newAdjustmentOpen && (
        <NewAdjustmentDialog
          onClose={() => setNewAdjustmentOpen(false)}
        />
      )}
    </Card>
  );
}

function EditPolicyDialog({
  policy,
  onClose,
}: {
  policy?: LeavePolicyDto;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const policyGroupsQuery = useQuery({
    queryKey: ['policy-groups'],
    queryFn: () => fetchPolicyGroups(),
  });
  const [code, setCode] = useState(policy?.code ?? 'CL');
  const [name, setName] = useState(policy?.name ?? '');
  const [description, setDescription] = useState(policy?.description ?? '');
  const [policyYear, setPolicyYear] = useState(policy?.policyYear ?? '2026');
  const [category, setCategory] = useState<'TEACHING' | 'NON_TEACHING'>(
    policy?.employeeCategory ?? 'TEACHING',
  );
  const [policyGroupId, setPolicyGroupId] = useState(policy?.policyGroupId ?? 'ALL');
  const [approvalStatus, setApprovalStatus] = useState<'DRAFT' | 'AWAITING_APPROVAL' | 'APPROVED'>(
    policy?.approvalStatus ?? 'AWAITING_APPROVAL',
  );
  const [asPerPolicy, setAsPerPolicy] = useState(
    policy ? policy.annualEntitlement === null : false,
  );
  const [entitlement, setEntitlement] = useState(policy?.annualEntitlement?.toString() ?? '12');
  const [carryForwardAllowed, setCarryForwardAllowed] = useState(policy?.carryForwardAllowed ?? false);
  const [carryForwardLimit, setCarryForwardLimit] = useState(
    policy?.carryForwardLimit !== null && policy?.carryForwardLimit !== undefined
      ? policy.carryForwardLimit.toString()
      : '',
  );
  const [halfDayAllowed, setHalfDayAllowed] = useState(policy?.halfDayAllowed ?? false);
  const [minimumNoticeDays, setMinimumNoticeDays] = useState(policy?.minimumNoticeDays?.toString() ?? '1');
  const [maximumConsecutiveDays, setMaximumConsecutiveDays] = useState(policy?.maximumConsecutiveDays?.toString() ?? '15');
  const [attachmentRequired, setAttachmentRequired] = useState(policy?.attachmentRequired ?? false);
  const [attachmentRequiredAfterDays, setAttachmentRequiredAfterDays] = useState(
    policy?.attachmentRequiredAfterDays !== null && policy?.attachmentRequiredAfterDays !== undefined
      ? policy.attachmentRequiredAfterDays.toString()
      : '',
  );
  const [attendanceStatus, setAttendanceStatus] = useState(policy?.attendanceStatus ?? 'ON_LEAVE');
  const [affectsTimetable, setAffectsTimetable] = useState(policy?.affectsTimetable ?? (category === 'TEACHING'));
  const [active, setActive] = useState(policy?.active ?? true);
  const [problem, setProblem] = useState('');

  const save = useMutation({
    mutationFn: () => {
      const payload: Partial<LeavePolicyDto> = {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim() || null,
        policyYear,
        employeeCategory: category,
        policyGroupId: policyGroupId && policyGroupId !== 'ALL' ? policyGroupId : null,
        approvalStatus,
        annualEntitlement: asPerPolicy ? null : Number(entitlement),
        carryForwardAllowed,
        carryForwardLimit: carryForwardAllowed && carryForwardLimit.trim() ? Number(carryForwardLimit) : null,
        lapseAtYearEnd: !carryForwardAllowed,
        halfDayAllowed,
        minimumNoticeDays: Number(minimumNoticeDays),
        maximumConsecutiveDays: maximumConsecutiveDays ? Number(maximumConsecutiveDays) : null,
        attachmentRequired,
        attachmentRequiredAfterDays: attachmentRequired && attachmentRequiredAfterDays.trim() ? Number(attachmentRequiredAfterDays) : null,
        attendanceStatus,
        affectsTimetable: category === 'TEACHING' ? affectsTimetable : false,
        requiresAcademicCoverage: category === 'TEACHING',
        requiresOperationalCoverage: category === 'NON_TEACHING',
        active,
        effectiveFrom: policy?.effectiveFrom ?? '2026-01-01',
      };
      return saveLeavePolicy(policy?.id, payload);
    },
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['leave-policies'] });
      void queryClient.invalidateQueries({ queryKey: ['leave'] });
      toast.success(`Saved leave policy for ${saved.name}.`);
      onClose();
    },
    onError: (error) => {
      setProblem(error instanceof ApiError ? error.message : 'Failed to save policy');
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setProblem('Please enter a policy name');
      return;
    }
    setProblem('');
    save.mutate();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SlidersHorizontal className="size-5" />
            {policy ? `Configure ${policy.name}` : 'New Leave Policy'}
          </DialogTitle>
          <DialogDescription>
            Configure leave entitlements, category eligibility, carry-forward, and coverage requirements.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-4 text-xs">
          <div className="grid grid-cols-3 gap-3">
            <Field>
              <FieldLabel htmlFor="pol-code">Leave Code</FieldLabel>
              <Input
                id="pol-code"
                className="font-mono uppercase font-semibold"
                value={code}
                disabled={Boolean(policy)}
                onChange={(e) => setCode(e.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="pol-year">Policy Year</FieldLabel>
              <Input
                id="pol-year"
                value={policyYear}
                placeholder="2026"
                onChange={(e) => setPolicyYear(e.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="pol-cat">Workforce</FieldLabel>
              <Select
                value={category}
                disabled={Boolean(policy)}
                onValueChange={(val) => {
                  setCategory(val as 'TEACHING' | 'NON_TEACHING');
                  if (val === 'NON_TEACHING') setAffectsTimetable(false);
                }}
              >
                <SelectTrigger id="pol-cat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TEACHING">Teaching Faculty</SelectItem>
                  <SelectItem value="NON_TEACHING">Non-Teaching Staff</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="pol-name">Policy Display Name</FieldLabel>
            <Input
              id="pol-name"
              value={name}
              placeholder="e.g. Casual Leave (Teaching Faculty)"
              onChange={(e) => setName(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="pol-group">Policy Group</FieldLabel>
              <Select value={policyGroupId} onValueChange={setPolicyGroupId}>
                <SelectTrigger id="pol-group">
                  <SelectValue placeholder="All Groups" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Groups ({category === 'TEACHING' ? 'Faculty' : 'Staff'})</SelectItem>
                  {(policyGroupsQuery.data ?? [])
                    .filter((g) => g.employeeCategory === category)
                    .map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="pol-approval-status">Institutional Approval</FieldLabel>
              <Select
                value={approvalStatus}
                onValueChange={(val) => setApprovalStatus(val as 'DRAFT' | 'AWAITING_APPROVAL' | 'APPROVED')}
              >
                <SelectTrigger id="pol-approval-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AWAITING_APPROVAL">Awaiting Approval</SelectItem>
                  <SelectItem value="APPROVED">Approved by JCET</SelectItem>
                  <SelectItem value="DRAFT">Draft Policy</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="pol-attendance">Attendance Status Treatment</FieldLabel>
              <Select value={attendanceStatus} onValueChange={setAttendanceStatus}>
                <SelectTrigger id="pol-attendance">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                  <SelectItem value="ON_DUTY">Official Duty (Never Absent)</SelectItem>
                  <SelectItem value="RESTRICTED_HOLIDAY">Restricted Holiday</SelectItem>
                  <SelectItem value="VACATION_LEAVE">Vacation Leave</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="pol-notice">Advance Notice (Days)</FieldLabel>
              <Input
                id="pol-notice"
                inputMode="numeric"
                value={minimumNoticeDays}
                onChange={(e) => setMinimumNoticeDays(e.target.value)}
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="pol-desc">Description</FieldLabel>
            <Textarea
              id="pol-desc"
              rows={2}
              value={description}
              placeholder="Guidelines displayed to applicant"
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>

          {/* Entitlement Quota */}
          <div className="rounded-xl border bg-muted/30 p-3 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">Annual Entitlement</span>
              <label className="flex items-center gap-2 cursor-pointer font-medium text-foreground">
                <Checkbox
                  checked={asPerPolicy}
                  onCheckedChange={(checked) => setAsPerPolicy(checked === true)}
                />
                As per policy (no fixed quota)
              </label>
            </div>
            {!asPerPolicy && (
              <Field>
                <FieldLabel htmlFor="pol-quota">Days per calendar year</FieldLabel>
                <Input
                  id="pol-quota"
                  inputMode="decimal"
                  value={entitlement}
                  onChange={(e) => setEntitlement(e.target.value)}
                />
              </Field>
            )}
          </div>

          {/* Carry Forward */}
          <div className="rounded-xl border bg-muted/30 p-3 flex flex-col gap-3">
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-foreground">
              <Checkbox
                checked={carryForwardAllowed}
                onCheckedChange={(checked) => setCarryForwardAllowed(checked === true)}
              />
              Allow Carry Forward to Next Year
            </label>
            {carryForwardAllowed && (
              <Field>
                <FieldLabel htmlFor="pol-carry">
                  Maximum Carry Forward Days (Leave blank if Not Configured)
                </FieldLabel>
                <Input
                  id="pol-carry"
                  inputMode="numeric"
                  value={carryForwardLimit}
                  placeholder="Not Configured (Awaiting Approval)"
                  onChange={(e) => setCarryForwardLimit(e.target.value)}
                />
              </Field>
            )}
          </div>

          <Field>
            <FieldLabel htmlFor="pol-max">Max Consecutive Days</FieldLabel>
            <Input
              id="pol-max"
              inputMode="numeric"
              value={maximumConsecutiveDays}
              onChange={(e) => setMaximumConsecutiveDays(e.target.value)}
            />
          </Field>

          <div className="flex flex-col gap-2 rounded-xl border p-3">
            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <Checkbox
                checked={halfDayAllowed}
                onCheckedChange={(checked) => setHalfDayAllowed(checked === true)}
              />
              Allow Half-Day Applications
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <Checkbox
                checked={attachmentRequired}
                onCheckedChange={(checked) => setAttachmentRequired(checked === true)}
              />
              Mandatory Supporting Document / Medical Certificate
            </label>

            {attachmentRequired && (
              <Field className="pl-6">
                <FieldLabel htmlFor="pol-att-days">
                  Require document after consecutive days (leave blank if required from Day 1)
                </FieldLabel>
                <Input
                  id="pol-att-days"
                  inputMode="numeric"
                  value={attachmentRequiredAfterDays}
                  placeholder="e.g. 2 (Leave blank if from Day 1)"
                  onChange={(e) => setAttachmentRequiredAfterDays(e.target.value)}
                />
              </Field>
            )}

            {category === 'TEACHING' && (
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <Checkbox
                  checked={affectsTimetable}
                  onCheckedChange={(checked) => setAffectsTimetable(checked === true)}
                />
                Affects Teaching Timetable (Triggers Smart Substitution)
              </label>
            )}

            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <Checkbox
                checked={active}
                onCheckedChange={(checked) => setActive(checked === true)}
              />
              Policy Active & Available for Application
            </label>
          </div>

          {problem && <p className="text-destructive font-medium">{problem}</p>}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <LoaderCircle className="size-3.5 animate-spin mr-1.5" />}
              Save Policy
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NewAdjustmentDialog({
  onClose,
}: {
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [employeeId, setEmployeeId] = useState('');
  const [leaveCode, setLeaveCode] = useState('CL');
  const [policyYear, setPolicyYear] = useState('2026');
  const [adjustmentType, setAdjustmentType] = useState<'CREDIT' | 'DEBIT' | 'OPENING_CORRECTION'>('CREDIT');
  const [days, setDays] = useState('1');
  const [reason, setReason] = useState('');
  const [problem, setProblem] = useState('');

  const save = useMutation({
    mutationFn: () => {
      return createLeaveAdjustment({
        employeeId: employeeId.trim(),
        leaveCode: leaveCode.trim().toUpperCase(),
        policyYear: policyYear.trim(),
        adjustmentType,
        days: Number(days),
        reason: reason.trim(),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['leave-adjustments'] });
      void queryClient.invalidateQueries({ queryKey: ['leave'] });
      toast.success('Recorded balance adjustment successfully.');
      onClose();
    },
    onError: (err) => {
      setProblem(err instanceof ApiError ? err.message : 'Failed to record adjustment');
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!employeeId.trim()) {
      setProblem('Employee ID is required');
      return;
    }
    if (isNaN(Number(days)) || Number(days) <= 0) {
      setProblem('Enter a positive number of days');
      return;
    }
    if (reason.trim().length < 3) {
      setProblem('Reason is required (min 3 chars)');
      return;
    }
    setProblem('');
    save.mutate();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="size-5" />
            Record Balance Adjustment
          </DialogTitle>
          <DialogDescription>
            Audited manual adjustment to credit, debit, or correct an employee's leave balance.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-4 text-xs">
          <Field>
            <FieldLabel htmlFor="adj-emp">Employee UUID</FieldLabel>
            <Input
              id="adj-emp"
              placeholder="e.g. 54d76ca4-167b-4bd1-a8dd-21699bd0d49f"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="adj-code">Leave Code</FieldLabel>
              <Select value={leaveCode} onValueChange={setLeaveCode}>
                <SelectTrigger id="adj-code">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CL">CL (Casual Leave)</SelectItem>
                  <SelectItem value="EL">EL (Earned Leave)</SelectItem>
                  <SelectItem value="SPL_ML">SPL_ML (Medical Leave)</SelectItem>
                  <SelectItem value="OOD">OOD (On Official Duty)</SelectItem>
                  <SelectItem value="ODE">ODE (Examination Duty)</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="adj-year">Year</FieldLabel>
              <Input
                id="adj-year"
                value={policyYear}
                onChange={(e) => setPolicyYear(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="adj-type">Adjustment Type</FieldLabel>
              <Select value={adjustmentType} onValueChange={(v) => setAdjustmentType(v as 'CREDIT' | 'DEBIT' | 'OPENING_CORRECTION')}>
                <SelectTrigger id="adj-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CREDIT">CREDIT (+)</SelectItem>
                  <SelectItem value="DEBIT">DEBIT (-)</SelectItem>
                  <SelectItem value="OPENING_CORRECTION">OPENING CORRECTION</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="adj-days">Days</FieldLabel>
              <Input
                id="adj-days"
                inputMode="decimal"
                value={days}
                onChange={(e) => setDays(e.target.value)}
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="adj-reason">Audit Reason</FieldLabel>
            <Textarea
              id="adj-reason"
              rows={2}
              placeholder="Official institutional reason for adjustment"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>

          {problem && <p className="text-destructive font-medium">{problem}</p>}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <LoaderCircle className="size-3.5 animate-spin mr-1.5" />}
              Save Adjustment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
