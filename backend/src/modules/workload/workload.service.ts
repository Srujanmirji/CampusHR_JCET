import { HttpError } from '../../common/http-error.js';
import type { Access } from '../auth/auth.service.js';
import { employeeScope } from '../employees/employee.service.js';
import { toEntryDto } from '../timetable/timetable.service.js';
import { loadStatus, weeklyHours } from './workload.calc.js';
import type {
  FacultyRecord,
  ThresholdRecord,
  WorkloadRepository,
} from './workload.repository.js';
import type { ThresholdInput, WorkloadListQuery } from './workload.schema.js';

const notFound = () =>
  new HttpError(404, 'NOT_FOUND', 'Faculty member not found.');

export function toSummary(row: FacultyRecord) {
  const hours = weeklyHours(
    row.timetable.map((entry) => ({
      kind: entry.subject.kind,
      startPeriod: entry.startPeriod,
      endPeriod: entry.endPeriod,
    })),
  );
  const band = row.designation.workload;
  return {
    faculty: {
      id: row.id,
      employeeCode: row.employeeCode,
      name: `${row.firstName} ${row.lastName}`,
      department: row.department,
      designation: { id: row.designation.id, name: row.designation.name },
    },
    ...hours,
    minHours: band?.minHours ?? null,
    maxHours: band?.maxHours ?? null,
    status: loadStatus(hours.totalHours, band),
  };
}

const toThreshold = (row: ThresholdRecord) => ({
  designation: { id: row.id, name: row.name },
  minHours: row.workload?.minHours ?? null,
  maxHours: row.workload?.maxHours ?? null,
  updatedAt: row.workload?.updatedAt ?? null,
});

export function createWorkloadService(repo: WorkloadRepository) {
  return {
    /** Weekly load of each teaching faculty member in the caller's scope. */
    async list(access: Access, query: WorkloadListQuery) {
      const scope = employeeScope(access);
      if (!scope) return [];
      const rows = await repo.faculty({
        AND: [
          scope,
          query.departmentId ? { departmentId: query.departmentId } : {},
        ],
      });
      return rows.map(toSummary);
    },

    /** One faculty member's load with the classes behind it. */
    async faculty(access: Access, id: string) {
      const scope = employeeScope(access);
      const row = scope && (await repo.findFaculty({ AND: [scope, { id }] }));
      if (!row) throw notFound();
      const classes = await repo.classes(id);
      return { ...toSummary(row), classes: classes.map(toEntryDto) };
    },

    async thresholds() {
      return (await repo.thresholds()).map(toThreshold);
    },

    async setThreshold(
      access: Access,
      designationId: number,
      input: ThresholdInput,
      ip?: string,
    ) {
      const designation = await repo.findDesignation(designationId);
      if (designation?.category !== 'TEACHING') {
        throw new HttpError(
          404,
          'NOT_FOUND',
          'Teaching designation not found.',
        );
      }
      const row = await repo.setThreshold(designationId, input, {
        actorUserId: access.userId,
        action: 'workload_threshold.update',
        ip,
      });
      return toThreshold(row);
    },
  };
}

export type WorkloadService = ReturnType<typeof createWorkloadService>;
