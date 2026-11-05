import { HttpError } from '../../common/http-error.js';
import type { Access } from '../auth/auth.service.js';
import type { Notifier } from '../notifications/notifications.service.js';
import {
  createCircularSchema,
  queryCircularsSchema,
  updateCircularSchema,
  type CreateCircularInput,
  type QueryCircularsInput,
  type UpdateCircularInput,
} from './circulars.schema.js';
import type {
  CircularRecord,
  CircularRepository,
  ReadReceiptRecord,
} from './circulars.repository.js';

export interface CircularCompliance {
  circular: CircularRecord;
  eligibleCount: number;
  readCount: number;
  compliancePercentage: number;
  receipts: ReadReceiptRecord[];
}

export interface CircularService {
  listCirculars(
    access: Access,
    query: QueryCircularsInput,
  ): Promise<{ items: CircularRecord[]; total: number }>;
  findCircular(
    access: Access,
    id: string,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<CircularRecord>;
  createCircular(
    access: Access,
    input: CreateCircularInput,
  ): Promise<CircularRecord>;
  updateCircular(
    access: Access,
    id: string,
    input: UpdateCircularInput,
  ): Promise<CircularRecord>;
  acknowledgeRead(
    access: Access,
    id: string,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ acknowledged: boolean }>;
  getCompliance(access: Access, id: string): Promise<CircularCompliance>;
  exportReceiptsCsv(access: Access, id: string): Promise<string>;
}

export function createCircularService(
  repo: CircularRepository,
  notifier?: Notifier,
): CircularService {
  return {
    async listCirculars(access, rawQuery) {
      const query = queryCircularsSchema.parse(rawQuery);
      const isAdmin = access.scope === 'all';

      const filters: Parameters<typeof repo.listCirculars>[0] = {
        category: query.category,
        priority: query.priority,
        targetAudience: query.targetAudience,
        search: query.search,
        page: query.page,
        pageSize: query.pageSize,
        userScope: {
          isAdmin,
          isTeaching: true,
          departmentId: access.departmentId ?? null,
        },
      };

      return repo.listCirculars(filters, access.userId);
    },

    async findCircular(access, id, meta) {
      if (access.userId) {
        await repo.recordReadReceipt(id, access.userId, meta).catch(() => {});
      }

      const circular = await repo.findCircularById(id, access.userId);
      if (!circular) {
        throw new HttpError(404, 'NOT_FOUND', 'Circular not found.');
      }

      return circular;
    },

    async createCircular(access, rawInput) {
      const input = createCircularSchema.parse(rawInput);
      if (access.scope === 'own') {
        throw new HttpError(
          403,
          'FORBIDDEN',
          'Faculty and staff cannot publish official circulars.',
        );
      }

      // Department HOD can only publish to their own department
      if (access.scope === 'department') {
        if (!access.departmentId) {
          throw new HttpError(
            403,
            'FORBIDDEN',
            'No department assigned to this account.',
          );
        }
        if (
          input.targetAudience !== 'DEPARTMENT' ||
          input.targetDepartmentId !== access.departmentId
        ) {
          throw new HttpError(
            403,
            'FORBIDDEN',
            'HODs can only publish circulars to their own department.',
          );
        }
      }

      const circularNumber = await repo.getNextCircularNumber();
      const circular = await repo.createCircular({
        circularNumber,
        title: input.title,
        content: input.content,
        category: input.category,
        priority: input.priority,
        targetAudience: input.targetAudience,
        targetDepartmentId: input.targetDepartmentId ?? null,
        attachmentUrl: input.attachmentUrl ?? null,
        attachmentName: input.attachmentName ?? null,
        isPublished: input.isPublished ?? true,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        createdById: access.userId,
      });

      // Notify target audience via notifications & realtime
      if (notifier) {
        const priorityPrefix =
          input.priority === 'URGENT' ? '🚨 [URGENT] ' : '';
        const note = {
          kind: 'circular.published',
          title: `${priorityPrefix}${circularNumber}: ${input.title}`,
          body:
            input.content.slice(0, 150) +
            (input.content.length > 150 ? '...' : ''),
          link: '/circulars',
        };
        const deptId =
          input.targetAudience === 'DEPARTMENT'
            ? (input.targetDepartmentId ?? null)
            : null;
        if (input.targetAudience !== 'NON_TEACHING_ONLY') {
          notifier.notifyRole('Faculty', deptId, note).catch(() => {});
          notifier.notifyRole('HOD', deptId, note).catch(() => {});
        }
        if (input.targetAudience !== 'TEACHING_ONLY') {
          notifier
            .notifyRole('Non-Teaching Staff', deptId, note)
            .catch(() => {});
        }
      }

      return circular;
    },

    async updateCircular(access, id, rawInput) {
      const input = updateCircularSchema.parse(rawInput);
      if (access.scope === 'own') {
        throw new HttpError(
          403,
          'FORBIDDEN',
          'Only circular administrators can edit circulars.',
        );
      }

      const existing = await repo.findCircularById(id);
      if (!existing) {
        throw new HttpError(404, 'NOT_FOUND', 'Circular not found.');
      }

      return repo.updateCircular(id, {
        title: input.title,
        content: input.content,
        category: input.category,
        priority: input.priority,
        targetAudience: input.targetAudience,
        targetDepartmentId: input.targetDepartmentId,
        attachmentUrl: input.attachmentUrl,
        attachmentName: input.attachmentName,
        isPublished: input.isPublished,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
      });
    },

    async acknowledgeRead(access, id, meta) {
      const circular = await repo.findCircularById(id);
      if (!circular) {
        throw new HttpError(404, 'NOT_FOUND', 'Circular not found.');
      }
      await repo.recordReadReceipt(id, access.userId, meta);
      return { acknowledged: true };
    },

    async getCompliance(access, id) {
      if (access.scope === 'own') {
        throw new HttpError(
          403,
          'FORBIDDEN',
          'Only administration and HODs can view circular read compliance.',
        );
      }

      const circular = await repo.findCircularById(id);
      if (!circular) {
        throw new HttpError(404, 'NOT_FOUND', 'Circular not found.');
      }

      const [receipts, eligibleCount] = await Promise.all([
        repo.getReadReceipts(id),
        repo.countEligibleAudience(
          circular.targetAudience,
          circular.targetDepartmentId,
        ),
      ]);

      const readCount = receipts.length;
      const compliancePercentage =
        eligibleCount > 0 ? Math.round((readCount / eligibleCount) * 100) : 100;

      return {
        circular,
        eligibleCount,
        readCount,
        compliancePercentage,
        receipts,
      };
    },

    async exportReceiptsCsv(access, id) {
      const compliance = await this.getCompliance(access, id);
      const rows = [
        [
          'Circular Number',
          'Title',
          'Category',
          'Target Audience',
          'Total Eligible Audience',
          'Total Acknowledged Readers',
          'Compliance %',
        ],
        [
          compliance.circular.circularNumber,
          compliance.circular.title,
          compliance.circular.category,
          compliance.circular.targetAudience,
          compliance.eligibleCount,
          compliance.readCount,
          `${compliance.compliancePercentage}%`,
        ],
        [],
        [
          'Employee Code',
          'Faculty / Staff Name',
          'Department',
          'Designation',
          'Email',
          'Read Timestamp',
          'IP Address',
        ],
      ];

      for (const r of compliance.receipts) {
        rows.push([
          r.user.employee?.employeeCode ?? 'SYSTEM',
          r.user.employee
            ? `${r.user.employee.firstName} ${r.user.employee.lastName}`
            : r.user.email,
          r.user.employee?.department?.name ?? 'Administrative Staff',
          r.user.employee?.designation?.name ?? 'Staff',
          r.user.email,
          new Date(r.readAt).toISOString(),
          r.ipAddress ?? '',
        ]);
      }

      return rows
        .map((r) =>
          r
            .map((val) => {
              const str = String(val ?? '');
              return str.includes(',') || str.includes('"')
                ? `"${str.replaceAll('"', '""')}"`
                : str;
            })
            .join(','),
        )
        .join('\n');
    },
  };
}
