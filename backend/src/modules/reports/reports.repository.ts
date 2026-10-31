import { countLeaveDays } from '../leave/leave.rules.js';
import {
  inHalf,
  isoDate,
  leaveDates,
  toDate,
  weekdayOf,
} from '../substitution/substitution.rules.js';
import { weeklyHours } from '../workload/workload.calc.js';
import type { PrismaClient } from '../../generated/prisma/client.js';

export interface ReportsRepository {
  getExecutiveSummary(departmentId?: number): Promise<{
    headcount: {
      total: number;
      teaching: number;
      nonTeaching: number;
      doctorates: number;
      cadre: {
        professors: number;
        associateProfessors: number;
        assistantProfessors: number;
        others: number;
      };
    };
    attendance: {
      todayRate: number;
      present: number;
      absent: number;
      late: number;
      onLeave: number;
      totalToday: number;
      departmentAverages: { department: string; rate: number }[];
    };
    leave: {
      monthlyLeaveDays: number;
      activeLeavesToday: number;
      monthlyTrends: {
        month: string;
        CL: number;
        ML: number;
        EL: number;
        other: number;
      }[];
    };
    continuity: {
      affectedClasses: number;
      classesCovered: number;
      coverageRate: number;
      uncoveredClasses: number;
    };
    workload: {
      normalLoadPercentage: number;
      totalAudited: number;
    };
  }>;

  getAttendanceReport(params: {
    from?: string;
    to?: string;
    departmentId?: number;
  }): Promise<{
    summary: { totalEmployees: number; averageRate: number };
    records: {
      employeeId: string;
      employeeCode: string;
      name: string;
      department: string;
      designation: string;
      present: number;
      late: number;
      halfDay: number;
      absent: number;
      onLeave: number;
      totalRecorded: number;
      attendanceRate: number;
    }[];
  }>;

  getLeaveReport(params: {
    from?: string;
    to?: string;
    departmentId?: number;
  }): Promise<{
    summary: { totalDays: number; totalRequests: number };
    byType: { type: string; days: number }[];
    records: {
      employeeId: string;
      employeeCode: string;
      name: string;
      department: string;
      designation: string;
      totalRequests: number;
      totalApprovedDays: number;
      clDays: number;
      mlDays: number;
      elDays: number;
      otherDays: number;
    }[];
  }>;

  getWorkloadReport(params: { departmentId?: number }): Promise<{
    summary: { normal: number; overload: number; underload: number };
    records: {
      facultyId: string;
      employeeCode: string;
      name: string;
      department: string;
      designation: string;
      theoryHours: number;
      labHours: number;
      totalHours: number;
      minThreshold: number | null;
      maxThreshold: number | null;
      status: 'NORMAL' | 'OVERLOAD' | 'UNDERLOAD' | 'UNCONFIGURED';
    }[];
  }>;

  getContinuityReport(params: {
    from?: string;
    to?: string;
    departmentId?: number;
  }): Promise<{
    summary: {
      totalImpacted: number;
      covered: number;
      uncovered: number;
      coverageRate: number;
    };
    records: {
      id: string;
      date: string;
      originalFaculty: string;
      department: string;
      subject: string;
      period: string;
      kind: string;
      substituteFaculty: string | null;
      status: 'COVERED' | 'UNCOVERED';
    }[];
  }>;
}

export function createReportsRepository(
  prisma: PrismaClient,
): ReportsRepository {
  return {
    async getExecutiveSummary(departmentId) {
      const empWhere = {
        status: 'ACTIVE' as const,
        ...(departmentId ? { departmentId } : {}),
      };

      const [employees, departments] = await Promise.all([
        prisma.employee.findMany({
          where: empWhere,
          include: { designation: true, department: true },
        }),
        prisma.department.findMany(),
      ]);

      const total = employees.length;
      let teaching = 0;
      let nonTeaching = 0;
      let doctorates = 0;
      let professors = 0;
      let associateProfessors = 0;
      let assistantProfessors = 0;
      let otherCadre = 0;

      for (const emp of employees) {
        if (emp.designation.category === 'TEACHING') {
          teaching++;
        } else {
          nonTeaching++;
        }

        const qual = (emp.qualification || '').toUpperCase();
        if (
          emp.designation.category === 'TEACHING' &&
          (qual.includes('PH.D') ||
            qual.includes('PHD') ||
            qual === 'DOCTORATE')
        ) {
          doctorates++;
        }

        const desName = emp.designation.name.toLowerCase();
        if (desName.includes('associate professor')) {
          associateProfessors++;
        } else if (desName.includes('assistant professor')) {
          assistantProfessors++;
        } else if (desName.includes('professor')) {
          professors++;
        } else {
          otherCadre++;
        }
      }

      // Today's attendance
      const todayStr = new Date().toISOString().slice(0, 10);
      const todayStart = new Date(`${todayStr}T00:00:00.000Z`);

      const attendanceToday = await prisma.attendance.findMany({
        where: {
          date: todayStart,
          employee: {
            status: 'ACTIVE',
            ...(departmentId ? { departmentId } : {}),
          },
        },
        include: { employee: true },
      });

      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;
      let onLeaveCount = 0;
      let halfDayCount = 0;

      for (const att of attendanceToday) {
        if (att.status === 'PRESENT') presentCount++;
        else if (att.status === 'LATE') {
          presentCount++;
          lateCount++;
        } else if (att.status === 'ABSENT') absentCount++;
        else if (att.status === 'ON_LEAVE') onLeaveCount++;
        else if (att.status === 'HALF_DAY') halfDayCount++;
      }

      const totalToday = attendanceToday.length;
      const todayRate =
        totalToday > 0
          ? Math.round(
              ((presentCount + halfDayCount * 0.5) / totalToday) * 1000,
            ) / 10
          : 0;

      // Department attendance averages
      const deptAttendanceMap = new Map<
        number,
        { present: number; total: number; name: string }
      >();
      for (const dept of departments) {
        if (!departmentId || dept.id === departmentId) {
          deptAttendanceMap.set(dept.id, {
            present: 0,
            total: 0,
            name: dept.code,
          });
        }
      }

      for (const att of attendanceToday) {
        const item = deptAttendanceMap.get(att.employee.departmentId);
        if (item) {
          item.total++;
          if (att.status === 'PRESENT' || att.status === 'LATE') {
            item.present++;
          } else if (att.status === 'HALF_DAY') item.present += 0.5;
        }
      }

      const departmentAverages = Array.from(deptAttendanceMap.values()).map(
        (d) => ({
          department: d.name,
          rate: d.total > 0 ? Math.round((d.present / d.total) * 1000) / 10 : 0,
        }),
      );

      // Monthly leave metrics
      const now = new Date();
      const firstDayOfMonth = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
      );
      const nextMonth = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
      );
      const trendStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3, 1),
      );
      const monthlyLeaves = await prisma.leaveRequest.findMany({
        where: {
          status: 'APPROVED',
          startDate: { lt: nextMonth },
          endDate: { gte: trendStart },
          ...(departmentId ? { departmentId } : {}),
        },
        include: { leaveType: true },
      });
      const monthlyTrends = Array.from({ length: 4 }, (_, index) => {
        const start = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3 + index, 1),
        );
        const end = new Date(
          Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0),
        );
        const totals = { CL: 0, ML: 0, EL: 0, other: 0 };
        for (const leave of monthlyLeaves) {
          const from = new Date(
            Math.max(start.getTime(), leave.startDate.getTime()),
          );
          const to = new Date(Math.min(end.getTime(), leave.endDate.getTime()));
          if (from > to) continue;
          const code = leave.leaveType.code.toUpperCase();
          const key =
            code === 'CL' || code === 'ML' || code === 'EL' ? code : 'other';
          totals[key] += countLeaveDays(from, to, leave.halfDay !== null);
        }
        return {
          month: start.toLocaleDateString('en-GB', {
            month: 'short',
            year: 'numeric',
            timeZone: 'UTC',
          }),
          ...totals,
        };
      });
      const current = monthlyTrends[3]!;
      const monthlyLeaveDays =
        current.CL + current.ML + current.EL + current.other;

      const activeLeavesToday = await prisma.leaveRequest.count({
        where: {
          status: 'APPROVED',
          startDate: { lte: todayStart },
          endDate: { gte: todayStart },
          ...(departmentId ? { departmentId } : {}),
        },
      });

      const [continuity, workload] = await Promise.all([
        this.getContinuityReport({
          from: isoDate(firstDayOfMonth),
          to: isoDate(new Date(nextMonth.getTime() - 86400000)),
          departmentId,
        }),
        this.getWorkloadReport({ departmentId }),
      ]);
      const {
        totalImpacted: affectedClasses,
        covered: classesCovered,
        uncovered: uncoveredClasses,
        coverageRate,
      } = continuity.summary;
      const totalAudited = workload.records.filter(
        (row) => row.status !== 'UNCONFIGURED',
      ).length;

      return {
        headcount: {
          total,
          teaching,
          nonTeaching,
          doctorates,
          cadre: {
            professors,
            associateProfessors,
            assistantProfessors,
            others: otherCadre,
          },
        },
        attendance: {
          todayRate,
          present: presentCount,
          absent: absentCount,
          late: lateCount,
          onLeave: onLeaveCount,
          totalToday,
          departmentAverages,
        },
        leave: {
          monthlyLeaveDays,
          activeLeavesToday,
          monthlyTrends,
        },
        continuity: {
          affectedClasses,
          classesCovered,
          coverageRate,
          uncoveredClasses,
        },
        workload: {
          normalLoadPercentage: totalAudited
            ? Math.round((workload.summary.normal / totalAudited) * 1000) / 10
            : 0,
          totalAudited,
        },
      };
    },

    async getAttendanceReport({ from, to, departmentId }) {
      const dateFilter: { gte?: Date; lte?: Date } = {};
      if (from) dateFilter.gte = new Date(`${from}T00:00:00.000Z`);
      if (to) dateFilter.lte = new Date(`${to}T23:59:59.999Z`);

      const employees = await prisma.employee.findMany({
        where: {
          status: 'ACTIVE',
          ...(departmentId ? { departmentId } : {}),
        },
        include: {
          department: true,
          designation: true,
          attendance: {
            where: Object.keys(dateFilter).length
              ? { date: dateFilter }
              : undefined,
          },
        },
        orderBy: [{ department: { name: 'asc' } }, { employeeCode: 'asc' }],
      });

      let totalRateSum = 0;
      const records = employees.map((emp) => {
        let present = 0;
        let late = 0;
        let halfDay = 0;
        let absent = 0;
        let onLeave = 0;

        for (const a of emp.attendance) {
          if (a.status === 'PRESENT') present++;
          else if (a.status === 'LATE') late++;
          else if (a.status === 'HALF_DAY') halfDay++;
          else if (a.status === 'ABSENT') absent++;
          else if (a.status === 'ON_LEAVE') onLeave++;
        }

        const totalRecorded = emp.attendance.length;
        // Count half day as 0.5, present and late as 1.0
        const effectivePresent = present + late + halfDay * 0.5;
        const attendanceRate =
          totalRecorded > 0
            ? Math.round((effectivePresent / totalRecorded) * 1000) / 10
            : 0;

        totalRateSum += attendanceRate;

        return {
          employeeId: emp.id,
          employeeCode: emp.employeeCode,
          name: `${emp.firstName} ${emp.lastName}`.trim(),
          department: emp.department.code,
          designation: emp.designation.name,
          present,
          late,
          halfDay,
          absent,
          onLeave,
          totalRecorded,
          attendanceRate,
        };
      });

      const averageRate = records.length
        ? Math.round((totalRateSum / records.length) * 10) / 10
        : 0;

      return {
        summary: {
          totalEmployees: records.length,
          averageRate,
        },
        records,
      };
    },

    async getLeaveReport({ from, to, departmentId }) {
      const dateFilter: { gte?: Date; lte?: Date } = {};
      if (from) dateFilter.gte = new Date(`${from}T00:00:00.000Z`);
      if (to) dateFilter.lte = new Date(`${to}T23:59:59.999Z`);

      const [employees, leaveTypes] = await Promise.all([
        prisma.employee.findMany({
          where: {
            status: 'ACTIVE',
            ...(departmentId ? { departmentId } : {}),
          },
          include: {
            department: true,
            designation: true,
            leaveRequests: {
              where: {
                status: 'APPROVED',
                ...(Object.keys(dateFilter).length
                  ? {
                      ...(dateFilter.lte
                        ? { startDate: { lte: dateFilter.lte } }
                        : {}),
                      ...(dateFilter.gte
                        ? { endDate: { gte: dateFilter.gte } }
                        : {}),
                    }
                  : {}),
              },
              include: { leaveType: true },
            },
          },
          orderBy: [{ department: { name: 'asc' } }, { employeeCode: 'asc' }],
        }),
        prisma.leaveType.findMany(),
      ]);

      const typeDaysMap = new Map<string, number>();
      for (const lt of leaveTypes) {
        typeDaysMap.set(lt.code, 0);
      }

      let totalDays = 0;
      let totalRequests = 0;

      const records = employees.map((emp) => {
        let clDays = 0;
        let mlDays = 0;
        let elDays = 0;
        let otherDays = 0;
        let empTotalDays = 0;

        for (const req of emp.leaveRequests) {
          const first = new Date(
            Math.max(
              req.startDate.getTime(),
              dateFilter.gte?.getTime() ?? -Infinity,
            ),
          );
          const last = new Date(
            Math.min(
              req.endDate.getTime(),
              dateFilter.lte?.getTime() ?? Infinity,
            ),
          );
          const days = countLeaveDays(first, last, req.halfDay !== null);
          empTotalDays += days;
          totalDays += days;
          totalRequests++;

          const code = req.leaveType?.code?.toUpperCase() || '';
          if (code === 'CL') clDays += days;
          else if (code === 'ML') mlDays += days;
          else if (code === 'EL') elDays += days;
          else otherDays += days;

          typeDaysMap.set(code, (typeDaysMap.get(code) || 0) + days);
        }

        return {
          employeeId: emp.id,
          employeeCode: emp.employeeCode,
          name: `${emp.firstName} ${emp.lastName}`.trim(),
          department: emp.department.code,
          designation: emp.designation.name,
          totalRequests: emp.leaveRequests.length,
          totalApprovedDays: empTotalDays,
          clDays,
          mlDays,
          elDays,
          otherDays,
        };
      });

      const byType = Array.from(typeDaysMap.entries()).map(([type, days]) => ({
        type,
        days,
      }));

      return {
        summary: {
          totalDays,
          totalRequests,
        },
        byType,
        records,
      };
    },

    async getWorkloadReport({ departmentId }) {
      const faculty = await prisma.employee.findMany({
        where: {
          status: 'ACTIVE',
          designation: { category: 'TEACHING' },
          ...(departmentId ? { departmentId } : {}),
        },
        include: {
          department: true,
          designation: { include: { workload: true } },
          timetable: { include: { subject: true } },
        },
        orderBy: [{ department: { name: 'asc' } }, { employeeCode: 'asc' }],
      });

      let normal = 0;
      let overload = 0;
      let underload = 0;

      const records = faculty.map((emp) => {
        const { theoryHours, labHours, totalHours } = weeklyHours(
          emp.timetable.map((entry) => ({
            ...entry,
            kind: entry.subject.kind,
          })),
        );
        const minThreshold = emp.designation.workload?.minHours ?? null;
        const maxThreshold = emp.designation.workload?.maxHours ?? null;
        let status: 'NORMAL' | 'OVERLOAD' | 'UNDERLOAD' | 'UNCONFIGURED' =
          'UNCONFIGURED';
        if (minThreshold !== null && maxThreshold !== null) {
          if (totalHours > maxThreshold) {
            status = 'OVERLOAD';
            overload++;
          } else if (totalHours < minThreshold) {
            status = 'UNDERLOAD';
            underload++;
          } else {
            status = 'NORMAL';
            normal++;
          }
        }

        return {
          facultyId: emp.id,
          employeeCode: emp.employeeCode,
          name: `${emp.firstName} ${emp.lastName}`.trim(),
          department: emp.department.code,
          designation: emp.designation.name,
          theoryHours,
          labHours,
          totalHours,
          minThreshold,
          maxThreshold,
          status,
        };
      });

      return {
        summary: { normal, overload, underload },
        records,
      };
    },

    // shortcut: history uses the current timetable; snapshot classes when edited schedules must be retained.
    async getContinuityReport({ from, to, departmentId }) {
      const start = from ? toDate(from) : undefined;
      const end = to ? toDate(to) : undefined;
      const leaves = await prisma.leaveRequest.findMany({
        where: {
          status: 'APPROVED',
          ...(end ? { startDate: { lte: end } } : {}),
          ...(start ? { endDate: { gte: start } } : {}),
          employee: {
            timetable: { some: departmentId ? { departmentId } : {} },
          },
        },
        include: {
          employee: {
            include: {
              timetable: {
                where: departmentId ? { departmentId } : {},
                include: { subject: true, department: true },
              },
            },
          },
          substitutions: { include: { substitute: true } },
        },
      });
      const periods = await prisma.period.findMany();
      const starts = new Map(
        periods.map((period) => [period.number, period.startTime]),
      );
      const records = leaves
        .flatMap((leave) => {
          const first =
            start && start > leave.startDate ? start : leave.startDate;
          const last = end && end < leave.endDate ? end : leave.endDate;
          return leaveDates(first, last).flatMap((date) =>
            leave.employee.timetable
              .filter(
                (entry) =>
                  entry.day === weekdayOf(toDate(date)) &&
                  inHalf(leave.halfDay, entry, starts),
              )
              .map((entry) => {
                const sub = leave.substitutions.find(
                  (row) =>
                    row.timetableEntryId === entry.id &&
                    isoDate(row.date) === date,
                );
                const covered =
                  !!sub &&
                  (sub.substituteId !== null || sub.kind === 'NOT_NEEDED');
                return {
                  id: `${leave.id}:${entry.id}:${date}`,
                  date,
                  originalFaculty:
                    `${leave.employee.firstName} ${leave.employee.lastName}`.trim(),
                  department: entry.department.code,
                  subject: entry.subject.name,
                  period:
                    entry.startPeriod === entry.endPeriod
                      ? `Period ${entry.startPeriod}`
                      : `Periods ${entry.startPeriod}-${entry.endPeriod}`,
                  kind: sub?.kind ?? 'UNASSIGNED',
                  substituteFaculty: sub?.substitute
                    ? `${sub.substitute.firstName} ${sub.substitute.lastName}`.trim()
                    : null,
                  status: covered
                    ? ('COVERED' as const)
                    : ('UNCOVERED' as const),
                };
              }),
          );
        })
        .sort(
          (a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id),
        );
      const totalImpacted = records.length;
      const covered = records.filter((row) => row.status === 'COVERED').length;
      return {
        summary: {
          totalImpacted,
          covered,
          uncovered: totalImpacted - covered,
          coverageRate: totalImpacted
            ? Math.round((covered / totalImpacted) * 100)
            : 0,
        },
        records,
      };
    },
  };
}
