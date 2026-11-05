import { HttpError } from '../../common/http-error.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { Access } from '../auth/auth.service.js';
import type { Notifier } from '../notifications/notifications.service.js';
import {
  createOnDutySchema,
  queryOnDutySchema,
  reviewOnDutySchema,
  uploadCertificateSchema,
  type CreateOnDutyInput,
  type QueryOnDutyInput,
  type ReviewOnDutyInput,
  type UploadCertificateInput,
} from './on-duty.schema.js';
import type {
  OnDutyMetrics,
  OnDutyRecord,
  OnDutyRepository,
} from './on-duty.repository.js';

export function calculateWorkingDays(startDateStr: string, endDateStr: string): {
  totalDays: number;
  dates: Date[];
} {
  const start = new Date(`${startDateStr}T00:00:00Z`);
  const end = new Date(`${endDateStr}T00:00:00Z`);

  if (start > end) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Start date cannot be after end date.');
  }

  const dates: Date[] = [];
  const current = new Date(start);

  while (current <= end) {
    // 0 = Sunday (colleges are off on Sundays)
    if (current.getUTCDay() !== 0) {
      dates.push(new Date(current));
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return { totalDays: dates.length, dates };
}

export interface OnDutyService {
  list(access: Access, rawQuery: QueryOnDutyInput): Promise<{
    data: OnDutyRecord[];
    metrics: OnDutyMetrics;
    meta: {
      page: number;
      pageSize: number;
      total: number;
    };
  }>;
  getById(access: Access, id: string): Promise<OnDutyRecord>;
  apply(access: Access, rawInput: CreateOnDutyInput): Promise<OnDutyRecord>;
  review(access: Access, id: string, rawInput: ReviewOnDutyInput): Promise<OnDutyRecord>;
  uploadCertificate(access: Access, id: string, rawInput: UploadCertificateInput): Promise<OnDutyRecord>;
  cancel(access: Access, id: string): Promise<OnDutyRecord>;
}

export function createOnDutyService(
  repo: OnDutyRepository,
  notifier?: Notifier,
): OnDutyService {
  function applyScope(
    access: Access,
    queryDept?: number,
    queryEmp?: string,
    view?: string,
  ): Prisma.OnDutyRequestWhereInput {
    // If user explicitly asks for "my-requests"
    if (view === 'my-requests') {
      if (!access.employeeId) {
        throw new HttpError(403, 'FORBIDDEN', 'No employee record linked to account.');
      }
      return { employeeId: access.employeeId };
    }

    if (access.scope === 'own') {
      if (!access.employeeId) {
        throw new HttpError(403, 'FORBIDDEN', 'No employee record linked to account.');
      }
      return { employeeId: access.employeeId };
    }

    if (access.scope === 'department') {
      if (access.departmentId === null) {
        throw new HttpError(403, 'FORBIDDEN', 'No department linked to user account.');
      }
      return {
        employee: { departmentId: access.departmentId },
      };
    }

    if (access.scope === 'all') {
      const where: Prisma.OnDutyRequestWhereInput = {};
      if (queryDept) where.employee = { departmentId: queryDept };
      if (queryEmp) where.employeeId = queryEmp;
      return where;
    }

    throw new HttpError(403, 'FORBIDDEN', 'Insufficient permissions for On-Duty.');
  }

  return {
    async list(access, rawQuery) {
      const query = queryOnDutySchema.parse(rawQuery);
      const scopedWhere = applyScope(
        access,
        query.departmentId,
        query.employeeId,
        query.view,
      );

      const where: Prisma.OnDutyRequestWhereInput = {
        AND: [
          scopedWhere,
          query.status ? { status: query.status } : {},
          query.category ? { category: query.category } : {},
          query.startDate
            ? { startDate: { gte: new Date(`${query.startDate}T00:00:00Z`) } }
            : {},
          query.endDate
            ? { endDate: { lte: new Date(`${query.endDate}T00:00:00Z`) } }
            : {},
        ],
      };

      const [paged, metrics] = await Promise.all([
        repo.list(where, {
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
        repo.getMetrics(scopedWhere),
      ]);

      return {
        data: paged.rows,
        metrics,
        meta: {
          page: query.page,
          pageSize: query.pageSize,
          total: paged.total,
        },
      };
    },

    async getById(access, id) {
      const request = await repo.findById(id);
      if (!request) {
        throw new HttpError(404, 'NOT_FOUND', 'On-Duty request not found.');
      }

      if (access.scope === 'own' && request.employeeId !== access.employeeId) {
        throw new HttpError(403, 'FORBIDDEN', 'Cannot view other staff requests.');
      }

      if (
        access.scope === 'department' &&
        request.employee.departmentId !== access.departmentId
      ) {
        throw new HttpError(403, 'FORBIDDEN', 'Request belongs to another department.');
      }

      return request;
    },

    async apply(access, rawInput) {
      if (!access.employeeId) {
        throw new HttpError(403, 'FORBIDDEN', 'No employee record linked to account.');
      }

      const input = createOnDutySchema.parse(rawInput);
      const employee = await repo.findEmployee(access.employeeId);
      if (!employee) {
        throw new HttpError(404, 'NOT_FOUND', 'Employee record not found.');
      }

      const { totalDays, dates } = calculateWorkingDays(input.startDate, input.endDate);
      if (totalDays === 0) {
        throw new HttpError(400, 'VALIDATION_ERROR', 'The selected dates fall only on non-working days.');
      }

      const created = await repo.create({
        employee: { connect: { id: access.employeeId } },
        category: input.category,
        title: input.title,
        description: input.description,
        venue: input.venue,
        startDate: new Date(`${input.startDate}T00:00:00Z`),
        endDate: new Date(`${input.endDate}T00:00:00Z`),
        totalDays,
        status: 'PENDING',
        attachmentUrl: input.attachmentUrl,
        attachmentName: input.attachmentName,
      });

      // Notify leadership of application
      if (notifier) {
        notifier.notifyRole(
          'HOD',
          employee.departmentId,
          {
            kind: 'on_duty_applied',
            title: 'New On-Duty Application',
            body: `${employee.firstName} ${employee.lastName} applied for On-Duty: ${input.title} (${totalDays} days).`,
            link: '/on-duty',
          },
          access.employeeId,
        ).catch(() => {});
      }

      return created;
    },

    async review(access, id, rawInput) {
      const input = reviewOnDutySchema.parse(rawInput);
      const request = await repo.findById(id);
      if (!request) {
        throw new HttpError(404, 'NOT_FOUND', 'On-Duty request not found.');
      }

      if (request.status === 'APPROVED' || request.status === 'REJECTED') {
        throw new HttpError(409, 'CONFLICT', `Request has already been ${request.status.toLowerCase()}.`);
      }

      const isHod = access.scope === 'department';
      const isExecutive = access.scope === 'all';

      if (!isHod && !isExecutive) {
        throw new HttpError(403, 'FORBIDDEN', 'Only HOD and Principal can review On-Duty requests.');
      }

      if (isHod && request.employee.departmentId !== access.departmentId) {
        throw new HttpError(403, 'FORBIDDEN', 'Cannot review requests from another department.');
      }

      // HOD action
      if (isHod) {
        if (input.decision === 'RECOMMEND') {
          const updated = await repo.update(id, {
            status: 'RECOMMENDED',
            hodReviewedBy: { connect: { id: access.userId } },
            hodReviewedAt: new Date(),
            hodNote: input.note,
          });

          if (notifier) {
            notifier.notifyRole('Principal', null, {
              kind: 'on_duty_recommended',
              title: 'On-Duty Recommended by HOD',
              body: `HOD recommended On-Duty for ${request.employee.firstName} ${request.employee.lastName} (${request.title}) for approval.`,
              link: '/on-duty',
            }).catch(() => {});
          }

          return updated;
        }

        if (input.decision === 'REJECT') {
          const updated = await repo.update(id, {
            status: 'REJECTED',
            hodReviewedBy: { connect: { id: access.userId } },
            hodReviewedAt: new Date(),
            hodNote: input.note,
          });

          if (notifier) {
            notifier.notifyEmployee(request.employeeId, {
              kind: 'on_duty_rejected',
              title: 'On-Duty Request Rejected',
              body: `Your On-Duty request for "${request.title}" was not recommended by HOD. Reason: ${input.note || 'None specified'}.`,
              link: '/on-duty',
            }).catch(() => {});
          }

          return updated;
        }

        throw new HttpError(400, 'VALIDATION_ERROR', 'HOD can only recommend or reject.');
      }

      // Executive / Principal action (scope === 'all')
      if (input.decision === 'APPROVE') {
        const updated = await repo.update(id, {
          status: 'APPROVED',
          finalApprovedBy: { connect: { id: access.userId } },
          finalApprovedAt: new Date(),
          finalNote: input.note,
        });

        // Credit attendance automatically for working days!
        const startDateStr = request.startDate.toISOString().slice(0, 10);
        const endDateStr = request.endDate.toISOString().slice(0, 10);
        const { dates } = calculateWorkingDays(startDateStr, endDateStr);

        await repo.creditAttendanceForDates({
          employeeId: request.employeeId,
          dates,
          dutyTitle: request.title,
        });

        if (notifier) {
          notifier.notifyEmployee(request.employeeId, {
            kind: 'on_duty_approved',
            title: 'On-Duty Approved & Attendance Credited!',
            body: `Your On-Duty request for "${request.title}" (${request.totalDays} days) has been approved. Attendance has been credited.`,
            link: '/on-duty',
          }).catch(() => {});
        }

        return updated;
      }

      if (input.decision === 'REJECT') {
        const updated = await repo.update(id, {
          status: 'REJECTED',
          finalApprovedBy: { connect: { id: access.userId } },
          finalApprovedAt: new Date(),
          finalNote: input.note,
        });

        if (notifier) {
          notifier.notifyEmployee(request.employeeId, {
            kind: 'on_duty_rejected',
            title: 'On-Duty Request Rejected',
            body: `Your On-Duty request for "${request.title}" was rejected by Principal. Reason: ${input.note || 'None specified'}.`,
            link: '/on-duty',
          }).catch(() => {});
        }

        return updated;
      }

      throw new HttpError(400, 'VALIDATION_ERROR', 'Invalid decision.');
    },

    async uploadCertificate(access, id, rawInput) {
      const input = uploadCertificateSchema.parse(rawInput);
      const request = await repo.findById(id);
      if (!request) {
        throw new HttpError(404, 'NOT_FOUND', 'On-Duty request not found.');
      }

      if (access.scope === 'own' && request.employeeId !== access.employeeId) {
        throw new HttpError(403, 'FORBIDDEN', 'Cannot update another staff request.');
      }

      const updated = await repo.update(id, {
        attendanceCertificateUrl: input.attendanceCertificateUrl,
      });

      return updated;
    },

    async cancel(access, id) {
      const request = await repo.findById(id);
      if (!request) {
        throw new HttpError(404, 'NOT_FOUND', 'On-Duty request not found.');
      }

      if (request.employeeId !== access.employeeId && access.scope !== 'all') {
        throw new HttpError(403, 'FORBIDDEN', 'Cannot cancel another staff request.');
      }

      if (request.status === 'APPROVED') {
        throw new HttpError(409, 'CONFLICT', 'Approved On-Duty requests cannot be cancelled.');
      }

      return repo.update(id, { status: 'CANCELLED' });
    },
  };
}
