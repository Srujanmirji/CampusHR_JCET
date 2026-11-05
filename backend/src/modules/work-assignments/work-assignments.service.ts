import { HttpError } from '../../common/http-error.js';
import type { Access } from '../auth/auth.service.js';
import type { Notifier } from '../notifications/notifications.service.js';
import {
  createWorkAssignmentSchema,
  queryWorkSchema,
  reviewWorkSchema,
  updateWorkStatusSchema,
  type CreateWorkAssignmentInput,
  type QueryWorkInput,
  type ReviewWorkInput,
  type UpdateWorkStatusInput,
} from './work-assignments.schema.js';
import type {
  WorkAssignmentRecord,
  WorkAssignmentRepository,
} from './work-assignments.repository.js';

export interface WorkAssignmentMetrics {
  assigned: number;
  inProgress: number;
  submitted: number;
  completed: number;
}

export interface WorkAssignmentService {
  createAssignments(
    access: Access,
    rawInput: CreateWorkAssignmentInput,
  ): Promise<WorkAssignmentRecord[]>;
  listAssignments(
    access: Access,
    rawQuery: QueryWorkInput,
  ): Promise<{
    items: WorkAssignmentRecord[];
    total: number;
    metrics: WorkAssignmentMetrics;
  }>;
  findAssignment(access: Access, id: string): Promise<WorkAssignmentRecord>;
  updateStatus(
    access: Access,
    id: string,
    rawInput: UpdateWorkStatusInput,
  ): Promise<WorkAssignmentRecord>;
  reviewAssignment(
    access: Access,
    id: string,
    rawInput: ReviewWorkInput,
  ): Promise<WorkAssignmentRecord>;
}

export function createWorkAssignmentService(
  repo: WorkAssignmentRepository,
  notifier?: Notifier,
): WorkAssignmentService {
  return {
    async createAssignments(access, rawInput) {
      const input = createWorkAssignmentSchema.parse(rawInput);
      if (access.scope === 'own') {
        throw new HttpError(
          403,
          'FORBIDDEN',
          'Faculty cannot delegate official work to colleagues.',
        );
      }

      const dueDate = new Date(input.dueDate);
      const createdAssignments: WorkAssignmentRecord[] = [];

      for (const employeeId of input.assignedToIds) {
        const emp = await repo.findEmployeeById(employeeId);
        if (!emp || emp.status !== 'ACTIVE') {
          throw new HttpError(
            404,
            'NOT_FOUND',
            `Employee with ID ${employeeId} not found or inactive.`,
          );
        }

        // HOD scope check
        if (
          access.scope === 'department' &&
          emp.departmentId !== access.departmentId
        ) {
          throw new HttpError(
            403,
            'FORBIDDEN',
            `HOD can only assign work to staff in their own department (ID: ${access.departmentId}).`,
          );
        }

        const assignment = await repo.createAssignment({
          title: input.title,
          description: input.description,
          category: input.category,
          priority: input.priority,
          assignedById: access.userId,
          assignedToId: employeeId,
          dueDate,
          attachmentUrl: input.attachmentUrl ?? null,
          attachmentName: input.attachmentName ?? null,
        });

        createdAssignments.push(assignment);

        if (notifier) {
          const priorityTag =
            input.priority === 'URGENT'
              ? '🚨 [URGENT] '
              : input.priority === 'HIGH'
                ? '⚡ '
                : '';
          const dueStr = dueDate.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          });

          notifier.notifyEmployee(employeeId, {
            kind: 'work.assigned',
            title: `${priorityTag}New Work Assignment: ${input.title}`,
            body: `You have been assigned official work due by ${dueStr}. Tap to review instructions.`,
            link: '/work-assignments',
          }).catch(() => {});
        }
      }

      return createdAssignments;
    },

    async listAssignments(access, rawQuery) {
      const query = queryWorkSchema.parse(rawQuery);
      const filters: Parameters<typeof repo.listAssignments>[0] = {
        status: query.status,
        priority: query.priority,
        category: query.category,
        search: query.search,
        page: query.page,
        pageSize: query.pageSize,
      };

      // Handle view scoping
      if (query.view === 'assigned-to-me') {
        if (!access.employeeId) {
          return {
            items: [],
            total: 0,
            metrics: { assigned: 0, inProgress: 0, submitted: 0, completed: 0 },
          };
        }
        filters.assignedToId = access.employeeId;
      } else if (query.view === 'assigned-by-me') {
        filters.assignedById = access.userId;
      } else {
        // View 'all'
        if (access.scope === 'department') {
          filters.departmentId = access.departmentId ?? undefined;
        } else if (access.scope === 'own') {
          filters.assignedToId = access.employeeId ?? undefined;
        }
      }

      const [result, metrics] = await Promise.all([
        repo.listAssignments(filters),
        repo.countMetrics({
          assignedToId:
            query.view === 'assigned-to-me'
              ? (access.employeeId ?? undefined)
              : undefined,
          assignedById:
            query.view === 'assigned-by-me' ? access.userId : undefined,
        }),
      ]);

      return {
        items: result.items,
        total: result.total,
        metrics,
      };
    },

    async findAssignment(access, id) {
      const assignment = await repo.findAssignmentById(id);
      if (!assignment) {
        throw new HttpError(404, 'NOT_FOUND', 'Work assignment not found.');
      }

      if (
        access.scope === 'own' &&
        assignment.assignedToId !== access.employeeId &&
        assignment.assignedById !== access.userId
      ) {
        throw new HttpError(
          403,
          'FORBIDDEN',
          'You are not authorized to view this work assignment.',
        );
      }

      return assignment;
    },

    async updateStatus(access, id, rawInput) {
      const input = updateWorkStatusSchema.parse(rawInput);
      const assignment = await repo.findAssignmentById(id);
      if (!assignment) {
        throw new HttpError(404, 'NOT_FOUND', 'Work assignment not found.');
      }

      // Only the assigned faculty or admin can update status
      if (
        access.scope === 'own' &&
        assignment.assignedToId !== access.employeeId
      ) {
        throw new HttpError(
          403,
          'FORBIDDEN',
          'Only the assigned faculty can update task progress.',
        );
      }

      const updateData: Parameters<typeof repo.updateAssignment>[1] = {
        status: input.status,
      };

      if (input.status === 'SUBMITTED') {
        updateData.submissionNotes = input.submissionNotes ?? null;
        updateData.submissionAttachmentUrl =
          input.submissionAttachmentUrl ?? null;
        updateData.submittedAt = new Date();
      }

      const updated = await repo.updateAssignment(id, updateData);

      // Notify the assigner when work is submitted
      if (input.status === 'SUBMITTED' && notifier) {
        const assignerEmpId = assignment.assignedBy.employee?.id;
        if (assignerEmpId) {
          notifier.notifyEmployee(assignerEmpId, {
            kind: 'work.submitted',
            title: 'Work Submitted for Review',
            body: `${assignment.assignedTo.firstName} ${assignment.assignedTo.lastName} has submitted work for "${assignment.title}".`,
            link: '/work-assignments',
          }).catch(() => {});
        }
      }

      return updated;
    },

    async reviewAssignment(access, id, rawInput) {
      const input = reviewWorkSchema.parse(rawInput);
      const assignment = await repo.findAssignmentById(id);
      if (!assignment) {
        throw new HttpError(404, 'NOT_FOUND', 'Work assignment not found.');
      }

      // Reviewer must be assigner or admin
      if (
        access.scope === 'own' &&
        assignment.assignedById !== access.userId
      ) {
        throw new HttpError(
          403,
          'FORBIDDEN',
          'Only the assigner or administrator can review completed work.',
        );
      }

      const isApprove = input.decision === 'APPROVE';
      const updated = await repo.updateAssignment(id, {
        status: isApprove ? 'COMPLETED' : 'IN_PROGRESS',
        reviewedAt: new Date(),
        completedAt: isApprove ? new Date() : null,
        reviewFeedback: input.feedback ?? null,
      });

      if (notifier) {
        notifier.notifyEmployee(assignment.assignedToId, {
          kind: isApprove ? 'work.approved' : 'work.revision_requested',
          title: isApprove
            ? 'Work Assignment Completed & Approved'
            : 'Work Revision Requested',
          body: isApprove
            ? `Your work on "${assignment.title}" has been approved.`
            : `Feedback on "${assignment.title}": ${input.feedback || 'Please revise and resubmit.'}`,
          link: '/work-assignments',
        }).catch(() => {});
      }

      return updated;
    },
  };
}
