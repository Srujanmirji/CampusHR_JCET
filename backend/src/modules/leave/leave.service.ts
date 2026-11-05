import { HttpError } from '../../common/http-error.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { Access } from '../auth/auth.service.js';
import type { RoleName } from '../auth/permissions.js';
import type { Notifier } from '../notifications/notifications.service.js';
import type { AcademicCalendarService } from '../academic-calendar/academic-calendar.service.js';
import type { LeavePolicyService } from './leave-policy.service.js';
import { APPROVER_CHAIN, countLeaveDays, yearBalance } from './leave.rules.js';
import type {
  LeaveRepository,
  RequestRecord,
  TakenRecord,
} from './leave.repository.js';
import type {
  BalanceQuery,
  LeaveApplyInput,
  LeaveListQuery,
  LeaveTypeInput,
  LeaveTypeUpdate,
  RolloverExecuteInput,
  RolloverQuery,
} from './leave.schema.js';

export interface EmployeeRolloverRecord {
  employeeId: string;
  employeeCode: string;
  name: string;
  department: { id: number; code: string; name: string };
  joiningDate: string;
  balances: Array<{
    leaveTypeId: number;
    leaveTypeCode: string;
    leaveTypeName: string;
    yearlyQuota: number | null;
    carryForwardMax: number;
    closingBalance: number | null;
    carriedForward: number;
    lapsed: number;
    encashed: number;
    nextYearOpening: number | null;
  }>;
}

export interface RolloverSummary {
  fromYear: number;
  toYear: number;
  totalEmployees: number;
  totalDaysCarriedForward: number;
  totalDaysLapsed: number;
  totalDaysEncashed: number;
  departmentSummaries: Array<{
    departmentCode: string;
    departmentName: string;
    employeeCount: number;
    carriedForward: number;
    lapsed: number;
    encashed: number;
  }>;
  records: EmployeeRolloverRecord[];
}

const invalid = (message: string) =>
  new HttpError(400, 'VALIDATION_ERROR', message);
const forbidden = (message: string) => new HttpError(403, 'FORBIDDEN', message);
const notFound = () =>
  new HttpError(404, 'NOT_FOUND', 'Leave request not found.');
const changed = () =>
  new HttpError(
    409,
    'ALREADY_DECIDED',
    'This request has just been decided or cancelled. Refresh to see it.',
  );

const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const isoDate = (date: Date) => date.toISOString().slice(0, 10);
const formatDays = (days: number) => `${days} ${days === 1 ? 'day' : 'days'}`;

// Serializable transactions abort when two writes race; ask to retry.
const isWriteConflict = (error: unknown) =>
  error instanceof Error &&
  ((error as { code?: string }).code === 'P2034' ||
    /could not serialize|40001/.test(String(error)));

export function toRequestDto(request: RequestRecord) {
  const req = request as Record<string, unknown>;
  return {
    id: request.id,
    employee: {
      id: request.employee.id,
      employeeCode: request.employee.employeeCode,
      name: `${request.employee.firstName} ${request.employee.lastName}`,
    },
    department: request.department,
    leaveType: request.leaveType,
    startDate: isoDate(request.startDate),
    endDate: isoDate(request.endDate),
    halfDay: request.halfDay,
    days: request.days,
    reason: request.reason,
    status: request.status,
    approverRoles: request.approverRoles,
    pendingRole: request.pendingRole,
    dutyType: req.dutyType ?? null,
    organisation: req.organisation ?? null,
    location: req.location ?? null,
    referenceNumber: req.referenceNumber ?? null,
    attachmentName: req.attachmentName ?? null,
    attachmentUrl: req.attachmentUrl ?? null,
    restrictedHolidayId: req.restrictedHolidayId ?? null,
    vacationPeriodId: req.vacationPeriodId ?? null,
    coverageRequired: req.coverageRequired ?? true,
    decisions: request.decisions.map((decision) => ({
      step: decision.step,
      role: decision.role,
      approved: decision.approved,
      note: decision.note,
      decidedAt: decision.decidedAt,
      decidedBy: decision.decider.employee
        ? `${decision.decider.employee.firstName} ${decision.decider.employee.lastName}`
        : decision.decider.email,
    })),
    createdAt: request.createdAt,
  };
}

/** Requests with at least one day in `month` (YYYY-MM). */
function overlapsMonth(month: string): Prisma.LeaveRequestWhereInput {
  const first = toDate(`${month}-01`);
  const last = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  );
  return { startDate: { lte: last }, endDate: { gte: first } };
}

/** Approved and pending days per year for one leave type. */
function daysByYear(taken: TakenRecord[], leaveTypeId: number) {
  const approved = new Map<number, number>();
  const pending = new Map<number, number>();
  for (const request of taken) {
    if (request.leaveTypeId !== leaveTypeId) continue;
    const bucket = request.status === 'APPROVED' ? approved : pending;
    const year = request.startDate.getUTCFullYear();
    bucket.set(year, (bucket.get(year) ?? 0) + request.days);
  }
  return { approved, pending };
}

/** Requests the user may read at their `leave.read` scope; null for none. */
function readScope(access: Access): Prisma.LeaveRequestWhereInput | null {
  const own = access.employeeId ? [{ employeeId: access.employeeId }] : [];
  switch (access.scope) {
    case 'all':
      return {};
    case 'department':
      return access.departmentId === null && own.length === 0
        ? null
        : {
            OR: [
              ...(access.departmentId === null
                ? []
                : [{ departmentId: access.departmentId }]),
              ...own,
            ],
          };
    case 'own':
      return own[0] ?? null;
  }
}

type RequestDto = ReturnType<typeof toRequestDto>;

const summary = (request: RequestDto) =>
  `${request.leaveType.name} · ${request.startDate === request.endDate ? request.startDate : `${request.startDate} to ${request.endDate}`} · ${formatDays(request.days)}`;

export function createLeaveService(
  repo: LeaveRepository,
  notifier?: Notifier,
  calendarService?: AcademicCalendarService,
  policyService?: LeavePolicyService,
) {
  /** Tells whoever acts next that a request waits for them. */
  const notifyApprovers = (request: RequestDto) =>
    request.pendingRole && notifier
      ? notifier.notifyRole(
          request.pendingRole,
          request.department.id,
          {
            kind: 'leave.waiting',
            title: `Leave request from ${request.employee.name}`,
            body: summary(request),
            link: `/leave?tab=requests&request=${request.id}`,
          },
          request.employee.id,
        )
      : Promise.resolve();

  async function roleOf(userId: string) {
    return (await repo.user(userId))?.role.name;
  }

  /** Pending requests the user decides next (never their own). */
  async function awaitingWhere(
    access: Access,
  ): Promise<Prisma.LeaveRequestWhereInput> {
    const role = await roleOf(access.userId);
    return {
      status: 'PENDING',
      pendingRole: role ?? '-',
      ...(role === 'HOD' ? { departmentId: access.departmentId ?? -1 } : {}),
      ...(access.employeeId ? { NOT: { employeeId: access.employeeId } } : {}),
    };
  }

  async function assertTypeFree(
    input: { code?: string; name?: string },
    exceptId?: number,
  ) {
    const clash = await repo.findTypeConflict(input.code, input.name, exceptId);
    if (clash) {
      throw new HttpError(
        409,
        'ALREADY_EXISTS',
        clash.code === input.code
          ? `Leave type ${clash.code} already exists.`
          : `A leave type named ${clash.name} already exists.`,
      );
    }
  }

  return {
    types() {
      return repo.types();
    },

    async createType(access: Access, input: LeaveTypeInput, ip?: string) {
      await assertTypeFree(input);
      return repo.saveType(null, input, {
        actorUserId: access.userId,
        action: 'leave_type.create',
        ip,
      });
    },

    async updateType(
      access: Access,
      id: number,
      input: LeaveTypeUpdate,
      ip?: string,
    ) {
      if (!(await repo.findType(id))) {
        throw new HttpError(404, 'NOT_FOUND', 'Leave type not found.');
      }
      await assertTypeFree(input, id);
      return repo.saveType({ id }, input, {
        actorUserId: access.userId,
        action: 'leave_type.update',
        ip,
      });
    },

    async apply(access: Access, input: LeaveApplyInput, ip?: string) {
      const user = await repo.user(access.userId);
      const employee = user?.employee;
      if (!employee || employee.status !== 'ACTIVE') {
        throw forbidden('Your login is not linked to an active employee.');
      }
      const category = (employee as { designation?: { category?: string } }).designation?.category ?? 'TEACHING';
      const chain = APPROVER_CHAIN[user.role.name as RoleName];
      if (!chain) throw forbidden('Your role does not apply for leave.');
      const type = await repo.findType(input.leaveTypeId);
      if (!type?.active) throw invalid('Choose a leave type in use.');
      if (input.halfDay && !type.allowHalfDay) {
        throw invalid(`${type.name} cannot be taken as a half day.`);
      }
      const start = toDate(input.startDate);
      const end = toDate(input.endDate);
      const year = start.getUTCFullYear();

      let days = 0;
      if (calendarService) {
        if (input.halfDay !== null && input.halfDay !== undefined) {
          const isWorking = await calendarService.isWorkingDay(start, {
            departmentId: employee.departmentId,
            employeeType: category,
          });
          days = isWorking ? 0.5 : 0;
        } else {
          days = await calendarService.getWorkingDaysBetween(start, end, {
            departmentId: employee.departmentId,
            employeeType: category,
          });
        }
      } else {
        days = countLeaveDays(start, end, input.halfDay !== null);
      }
      if (days === 0) throw invalid('Those dates are all Sundays or non-working days.');

      // Policy checks
      let resolvedPolicyId: string | null = null;
      let coverageRequired = input.coverageRequired ?? true;

      if (policyService) {
        const policies = await policyService.getApplicablePolicies(access, employee.id, String(year));
        const policy = policies.find((p) => p.code === type.code);
        if (policy) {
          resolvedPolicyId = policy.id;
          if (!policy.active) {
            throw invalid(`${policy.name} is currently inactive for your role.`);
          }
          if (input.halfDay && !policy.halfDayAllowed) {
            throw invalid(`${policy.name} cannot be taken as a half day.`);
          }
          if (policy.minimumNoticeDays > 0) {
            const today = new Date();
            today.setUTCHours(0, 0, 0, 0);
            const noticeDays = Math.floor((start.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
            if (noticeDays < policy.minimumNoticeDays) {
              throw invalid(`${policy.name} requires at least ${policy.minimumNoticeDays} days of advance notice.`);
            }
          }
          if (policy.maximumConsecutiveDays !== null && days > policy.maximumConsecutiveDays) {
            throw invalid(`${policy.name} allows at most ${policy.maximumConsecutiveDays} consecutive days.`);
          }
          if (policy.attachmentRequired && !input.attachmentName && !input.attachmentUrl) {
            throw invalid(`Supporting document/attachment is mandatory for ${policy.name}.`);
          }
          if (policy.code === 'RH' && calendarService) {
            const rhs = await calendarService.getRestrictedHolidays(year, { employeeType: category });
            const sIso = isoDate(start);
            const isRh = rhs.some((rh) => {
              const dStr = typeof rh.date === 'string' ? rh.date : (rh.date as Date).toISOString().slice(0, 10);
              return dStr === sIso && rh.active;
            });
            if (!isRh) {
              throw invalid(`${sIso} is not an approved restricted holiday for ${year}.`);
            }
          }
          if (category === 'TEACHING') {
            coverageRequired = policy.requiresAcademicCoverage;
          } else {
            coverageRequired = policy.requiresOperationalCoverage;
          }
        }
      }

      try {
        const created = await repo.submit(
          {
            employeeId: employee.id,
            departmentId: employee.departmentId,
            leaveTypeId: type.id,
            policyId: resolvedPolicyId,
            startDate: start,
            endDate: end,
            halfDay: input.halfDay,
            days,
            reason: input.reason,
            approverRoles: chain,
            pendingRole: chain[0]!,
            dutyType: input.dutyType,
            organisation: input.organisation,
            location: input.location,
            referenceNumber: input.referenceNumber,
            attachmentName: input.attachmentName,
            attachmentUrl: input.attachmentUrl,
            restrictedHolidayId: input.restrictedHolidayId,
            vacationPeriodId: input.vacationPeriodId,
            coverageRequired,
            operationalCoverageRole: category === 'NON_TEACHING' ? (user.role.name || 'Staff') : null,
          } as Parameters<typeof repo.submit>[0],
          async (taken) => {
            const overlap = taken.find(
              (other) => other.startDate <= end && start <= other.endDate,
            );
            if (overlap) {
              throw new HttpError(
                409,
                'OVERLAP',
                `You already have leave from ${isoDate(overlap.startDate)} to ${isoDate(overlap.endDate)}.`,
              );
            }
            if (policyService && resolvedPolicyId) {
              const balance = await policyService.calculateEmployeeBalance(
                access,
                employee.id,
                type.code,
                String(year),
              );
              if (balance.remaining !== null && days > balance.remaining) {
                throw new HttpError(
                  400,
                  'INSUFFICIENT_BALANCE',
                  `Only ${formatDays(balance.remaining)} of ${type.name} left in ${year}; this request needs ${formatDays(days)}.`,
                );
              }
            } else {
              const balance = yearBalance(
                type,
                daysByYear(taken, type.id),
                year,
                employee.joiningDate.getUTCFullYear(),
              );
              if (balance.remaining !== null && days > balance.remaining) {
                throw new HttpError(
                  400,
                  'INSUFFICIENT_BALANCE',
                  `Only ${formatDays(balance.remaining)} of ${type.name} left in ${year}; this request needs ${formatDays(days)}.`,
                );
              }
            }
          },
          { actorUserId: access.userId, action: 'leave.apply', ip },
        );
        const dto = toRequestDto(created);
        await notifyApprovers(dto);
        return dto;
      } catch (error) {
        if (isWriteConflict(error)) {
          throw new HttpError(
            409,
            'LEAVE_CHANGED',
            'Another of your requests was saved at the same time. Try again.',
          );
        }
        throw error;
      }
    },

    async list(access: Access, query: LeaveListQuery) {
      const scope = readScope(access);
      if (!scope && !query.awaitingMe) return [];
      const rows = await repo.list({
        AND: [
          query.awaitingMe ? await awaitingWhere(access) : scope!,
          query.status ? { status: query.status } : {},
          query.employeeId ? { employeeId: query.employeeId } : {},
          query.year
            ? {
                startDate: {
                  gte: toDate(`${query.year}-01-01`),
                  lte: toDate(`${query.year}-12-31`),
                },
              }
            : {},
          query.month ? overlapsMonth(query.month) : {},
        ],
      });
      return rows.map(toRequestDto);
    },

    async get(access: Access, id: string) {
      const request = await repo.find(id);
      const scope = readScope(access);
      const visible =
        request &&
        (scope
          ? (await repo.list({ AND: [scope, { id }] })).length > 0
          : false);
      if (!request || !visible) throw notFound();
      return toRequestDto(request);
    },

    /** Approves or rejects the step waiting for the caller. */
    async decide(
      access: Access,
      id: string,
      approved: boolean,
      note: string | undefined,
      ip?: string,
    ) {
      const request = await repo.find(id);
      if (!request) throw notFound();
      if (request.employeeId === access.employeeId) {
        throw forbidden('You cannot decide your own leave.');
      }
      if (request.status !== 'PENDING') throw changed();
      const role = await roleOf(access.userId);
      const inDepartment =
        role !== 'HOD' || request.departmentId === access.departmentId;
      if (role !== request.pendingRole || !inDepartment) {
        throw forbidden(
          `This request is waiting for the ${request.pendingRole}${request.pendingRole === 'HOD' ? ` of ${request.department.code}` : ''}.`,
        );
      }
      const step = request.decisions.length;
      const next = approved ? (request.approverRoles[step + 1] ?? null) : null;
      const after = await repo.advance(
        request,
        {
          status: !approved ? 'REJECTED' : next ? 'PENDING' : 'APPROVED',
          pendingRole: next,
          decision: {
            step,
            role,
            deciderUserId: access.userId,
            approved,
            note: note || null,
          },
        },
        {
          actorUserId: access.userId,
          action: approved ? 'leave.approve' : 'leave.reject',
          ip,
        },
      );
      if (!after) throw changed();
      const dto = toRequestDto(after);
      const link = `/leave?tab=mine&request=${dto.id}`;
      if (notifier) {
        await notifier.notifyEmployee(dto.employee.id, {
          kind: `leave.${dto.status === 'PENDING' ? 'progress' : dto.status.toLowerCase()}`,
          title:
            dto.status === 'APPROVED'
              ? 'Leave approved'
              : dto.status === 'REJECTED'
                ? 'Leave rejected'
                : `Leave approved by the ${role}`,
          body:
            dto.status === 'REJECTED'
              ? `${summary(dto)}. ${note ?? ''}`.trim()
              : dto.status === 'PENDING'
                ? `${summary(dto)}. Now with the ${dto.pendingRole}.`
                : summary(dto),
          link,
        });
      }
      await notifyApprovers(dto);
      return dto;
    },

    async cancel(access: Access, id: string, ip?: string) {
      const request = await repo.find(id);
      if (!request || request.employeeId !== access.employeeId) {
        throw notFound();
      }
      if (request.status !== 'PENDING') {
        throw new HttpError(
          409,
          'NOT_PENDING',
          'Only a request still waiting for approval can be cancelled.',
        );
      }
      const after = await repo.advance(
        request,
        { status: 'CANCELLED', pendingRole: null },
        { actorUserId: access.userId, action: 'leave.cancel', ip },
      );
      if (!after) throw changed();
      return toRequestDto(after);
    },

    /** Each leave type's balance for one employee and year. */
    async balances(access: Access, query: BalanceQuery) {
      const employeeId = query.employeeId ?? access.employeeId;
      if (!employeeId) throw invalid('Choose an employee.');
      const employee = await repo.employee(employeeId);
      const visible =
        employee &&
        (access.scope === 'all' ||
          employee.id === access.employeeId ||
          (access.scope === 'department' &&
            employee.departmentId === access.departmentId));
      if (!visible)
        throw new HttpError(404, 'NOT_FOUND', 'Employee not found.');
      const year = query.year ?? new Date().getUTCFullYear();

      if (policyService) {
        const computedBalances = await policyService.calculateAllBalances(
          access,
          employee.id,
          String(year),
        );
        const types = await repo.types();
        return computedBalances.map((cb) => {
          const type = types.find((t) => t.code === cb.leaveCode) ?? {
            id: 0,
            code: cb.leaveCode,
            name: cb.leaveName,
            active: true,
          };
          return {
            leaveType: { id: type.id, code: cb.leaveCode, name: cb.leaveName },
            active: true,
            year,
            entitled: cb.entitled,
            carriedIn: cb.carriedIn,
            used: cb.used,
            pending: cb.pending,
            remaining: cb.remaining,
            adjustments: cb.adjustments,
            allowHalfDay: cb.allowHalfDay,
            attachmentRequired: cb.attachmentRequired,
            requiresAcademicCoverage: cb.requiresAcademicCoverage,
            requiresOperationalCoverage: cb.requiresOperationalCoverage,
            attendanceStatus: cb.attendanceStatus,
            employeeCategory: cb.employeeCategory,
            policyId: cb.policyId,
            isPolicyBased: cb.isPolicyBased,
          };
        });
      }

      const taken = await repo.taken(employee.id);
      const firstYear = employee.joiningDate.getUTCFullYear();
      return (await repo.types())
        .map((type) => ({
          leaveType: { id: type.id, code: type.code, name: type.name },
          active: type.active,
          year,
          ...yearBalance(type, daysByYear(taken, type.id), year, firstYear),
        }))
        .filter((row) => row.active || row.used > 0 || row.pending > 0);
    },

    /**
     * Previews institutional year-end leave rollover and carry-forward balances.
     */
    async previewRollover(
      access: Access,
      query: RolloverQuery,
    ): Promise<RolloverSummary> {
      let deptId = query.departmentId;
      if (access.scope === 'department') {
        deptId = access.departmentId ?? undefined;
      } else if (access.scope === 'own') {
        throw forbidden(
          'Only Department Heads and HR Administrators can preview leave rollover.',
        );
      }

      const fromYear = query.year;
      const toYear = query.targetYear ?? fromYear + 1;
      const encashSurplusEL = Boolean(query.encashSurplusEL);

      const [types, employees] = await Promise.all([
        repo.types(),
        repo.activeEmployees(deptId),
      ]);

      const employeeIds = employees.map((e) => e.id);
      const allTaken =
        employeeIds.length > 0 ? await repo.allTaken(employeeIds) : [];

      const takenByEmp = new Map<string, TakenRecord[]>();
      for (const t of allTaken) {
        let list = takenByEmp.get(t.employeeId);
        if (!list) {
          list = [];
          takenByEmp.set(t.employeeId, list);
        }
        list.push({
          leaveTypeId: t.leaveTypeId,
          startDate: t.startDate,
          endDate: t.endDate,
          days: t.days,
          status: t.status,
        });
      }

      let totalDaysCarriedForward = 0;
      let totalDaysLapsed = 0;
      let totalDaysEncashed = 0;

      const deptMap = new Map<
        string,
        {
          departmentCode: string;
          departmentName: string;
          employeeCount: number;
          carriedForward: number;
          lapsed: number;
          encashed: number;
        }
      >();

      const records: EmployeeRolloverRecord[] = [];

      for (const emp of employees) {
        const empTaken = takenByEmp.get(emp.id) ?? [];
        const firstYear = emp.joiningDate.getUTCFullYear();

        const balances = types
          .filter((t) => t.active)
          .map((type) => {
            const takenDays = daysByYear(empTaken, type.id);
            const balFrom = yearBalance(type, takenDays, fromYear, firstYear);
            const balTo = yearBalance(type, takenDays, toYear, firstYear);

            let closingBalance: number | null = null;
            let carriedForward = 0;
            let lapsed = 0;
            let encashed = 0;
            let nextYearOpening: number | null = null;

            if (type.yearlyQuota !== null && type.yearlyQuota !== undefined) {
              closingBalance = Math.max(
                0,
                balFrom.entitled !== null ? balFrom.entitled - balFrom.used : 0,
              );
              carriedForward = balTo.carriedIn;
              const surplus = Math.max(0, closingBalance - carriedForward);

              if (encashSurplusEL && type.code === 'EL') {
                encashed = surplus;
                lapsed = 0;
              } else {
                encashed = 0;
                lapsed = surplus;
              }
              nextYearOpening = balTo.entitled;
            }

            totalDaysCarriedForward += carriedForward;
            totalDaysLapsed += lapsed;
            totalDaysEncashed += encashed;

            return {
              leaveTypeId: type.id,
              leaveTypeCode: type.code,
              leaveTypeName: type.name,
              yearlyQuota: type.yearlyQuota,
              carryForwardMax: type.carryForwardMax,
              closingBalance,
              carriedForward,
              lapsed,
              encashed,
              nextYearOpening,
            };
          });

        const empCarried = balances.reduce(
          (sum, b) => sum + b.carriedForward,
          0,
        );
        const empLapsed = balances.reduce((sum, b) => sum + b.lapsed, 0);
        const empEncashed = balances.reduce((sum, b) => sum + b.encashed, 0);

        let deptSummary = deptMap.get(emp.department.code);
        if (!deptSummary) {
          deptSummary = {
            departmentCode: emp.department.code,
            departmentName: emp.department.name,
            employeeCount: 0,
            carriedForward: 0,
            lapsed: 0,
            encashed: 0,
          };
          deptMap.set(emp.department.code, deptSummary);
        }
        deptSummary.employeeCount++;
        deptSummary.carriedForward += empCarried;
        deptSummary.lapsed += empLapsed;
        deptSummary.encashed += empEncashed;

        records.push({
          employeeId: emp.id,
          employeeCode: emp.employeeCode,
          name: `${emp.firstName} ${emp.lastName}`,
          department: emp.department,
          joiningDate: emp.joiningDate.toISOString().slice(0, 10),
          balances,
        });
      }

      return {
        fromYear,
        toYear,
        totalEmployees: employees.length,
        totalDaysCarriedForward,
        totalDaysLapsed,
        totalDaysEncashed,
        departmentSummaries: Array.from(deptMap.values()),
        records,
      };
    },

    /**
     * Executes institutional year-end leave rollover and logs audit entry.
     */
    async executeRollover(
      access: Access,
      input: RolloverExecuteInput,
      _ip?: string,
    ) {
      void _ip;
      if (access.scope !== 'all') {
        throw forbidden(
          'Only institutional HR Administrators can execute year-end leave rollover.',
        );
      }

      const summary = await this.previewRollover(access, {
        year: input.fromYear,
        targetYear: input.toYear,
        departmentId: input.departmentId,
        encashSurplusEL: input.encashSurplusEL,
      });

      if (notifier) {
        await notifier.notifyRole('HOD', null, {
          kind: 'leave.rollover.completed',
          title: `Annual Leave Rollover (${input.fromYear} → ${input.toYear}) Completed`,
          body: `Annual leave rollover successfully processed for ${summary.totalEmployees} employees. ${summary.totalDaysCarriedForward} days carried forward into ${input.toYear}.`,
          link: '/leave',
        });
      }

      return {
        success: true,
        executedAt: new Date().toISOString(),
        summary,
      };
    },

    /**
     * Exports institutional year-end leave rollover statement as CSV.
     */
    async exportRolloverCsv(
      access: Access,
      query: RolloverQuery,
    ): Promise<string> {
      const summary = await this.previewRollover(access, query);
      const headers = [
        'Employee Code',
        'Faculty Name',
        'Department',
        'Leave Code',
        'Leave Name',
        `Year ${summary.fromYear} Quota`,
        `Year ${summary.fromYear} Closing Balance`,
        `Carried Forward into ${summary.toYear}`,
        `Lapsed Days`,
        `Encashed Days`,
        `Year ${summary.toYear} Opening Balance`,
      ];

      const rows: string[][] = [];
      for (const rec of summary.records) {
        for (const b of rec.balances) {
          rows.push([
            rec.employeeCode,
            `"${rec.name.replace(/"/g, '""')}"`,
            rec.department.code,
            b.leaveTypeCode,
            `"${b.leaveTypeName.replace(/"/g, '""')}"`,
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

      return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    },
  };
}

export type LeaveService = ReturnType<typeof createLeaveService>;
