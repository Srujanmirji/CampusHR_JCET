import { HttpError } from '../../common/http-error.js';
import type { Access } from '../auth/auth.service.js';
import type { Notifier } from '../notifications/notifications.service.js';
import {
  autoAllotSchema,
  createDutySchema,
  createSessionSchema,
  queryDutiesSchema,
  swapDecideSchema,
  swapRequestSchema,
  type AutoAllotInput,
  type CreateDutyInput,
  type CreateSessionInput,
  type QueryDutiesInput,
  type SwapDecideInput,
  type SwapRequestInput,
} from './exam-duty.schema.js';
import type {
  ExamDutyRecord,
  ExamDutyRepository,
  ExamSessionRecord,
} from './exam-duty.repository.js';

export interface ExamDutyService {
  listSessions(access: Access): Promise<ExamSessionRecord[]>;
  createSession(
    access: Access,
    input: CreateSessionInput,
  ): Promise<ExamSessionRecord>;
  listDuties(
    access: Access,
    query: QueryDutiesInput,
  ): Promise<ExamDutyRecord[]>;
  createDuty(access: Access, input: CreateDutyInput): Promise<ExamDutyRecord>;
  autoAllot(
    access: Access,
    input: AutoAllotInput,
  ): Promise<{
    allottedCount: number;
    duties: ExamDutyRecord[];
    unallocatedRoomIds: number[];
  }>;
  requestSwap(
    access: Access,
    dutyId: string,
    input: SwapRequestInput,
  ): Promise<ExamDutyRecord>;
  decideSwap(
    access: Access,
    dutyId: string,
    input: SwapDecideInput,
  ): Promise<ExamDutyRecord>;
  exportCsv(access: Access, query: QueryDutiesInput): Promise<string>;
}

export function createExamDutyService(
  repo: ExamDutyRepository,
  notifier?: Notifier,
): ExamDutyService {
  return {
    async listSessions(_access) {
      return repo.listSessions();
    },

    async createSession(access, rawInput) {
      const input = createSessionSchema.parse(rawInput);
      if (access.scope !== 'all') {
        throw new HttpError(
          403,
          'FORBIDDEN',
          'Only Admin and Principal can create exam sessions.',
        );
      }
      return repo.createSession({
        name: input.name,
        academicYear: input.academicYear,
        examType: input.examType,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        status: input.status,
        notes: input.notes ?? null,
      });
    },

    async listDuties(access, rawQuery) {
      const query = queryDutiesSchema.parse(rawQuery);
      const filters: Parameters<typeof repo.listDuties>[0] = {};
      if (query.sessionId) filters.sessionId = query.sessionId;
      if (query.date) filters.date = new Date(query.date);
      if (query.status) filters.status = query.status;

      if (access.scope === 'own') {
        if (!access.employeeId) {
          throw new HttpError(
            403,
            'FORBIDDEN',
            'Account not linked to an employee record.',
          );
        }
        filters.facultyId = access.employeeId;
      } else if (access.scope === 'department') {
        if (!access.departmentId) {
          throw new HttpError(
            403,
            'FORBIDDEN',
            'No department assigned to this account.',
          );
        }
        filters.departmentId = access.departmentId;
      } else if (query.facultyId) {
        filters.facultyId = query.facultyId;
      } else if (query.departmentId) {
        filters.departmentId = query.departmentId;
      }

      return repo.listDuties(filters);
    },

    async createDuty(access, rawInput) {
      const input = createDutySchema.parse(rawInput);
      if (access.scope === 'own') {
        throw new HttpError(
          403,
          'FORBIDDEN',
          'Faculty cannot self-assign exam duties.',
        );
      }

      const session = await repo.findSessionById(input.sessionId);
      if (!session) {
        throw new HttpError(404, 'NOT_FOUND', 'Exam session not found.');
      }

      const dutyDate = new Date(input.date);
      const sessionTime = input.sessionTime;
      const reportingTime = input.reportingTime;
      const role = input.role;

      // Check if faculty is on leave on dutyDate
      const facultyOnLeave = await repo.findFacultyOnLeave(dutyDate);
      if (facultyOnLeave.has(input.facultyId)) {
        throw new HttpError(
          409,
          'LEAVE_CLASH',
          'Selected faculty is on approved or pending leave on this date.',
        );
      }

      // Check if faculty already has duty at that time
      const dutyClash = await repo.findDutyClash(
        input.facultyId,
        dutyDate,
        sessionTime,
      );
      if (dutyClash) {
        throw new HttpError(
          409,
          'FACULTY_CLASH',
          `Faculty is already assigned an exam duty on this date (${sessionTime} session).`,
        );
      }

      // Check room clash if room specified
      if (input.roomId) {
        const roomClash = await repo.findRoomClash(
          input.roomId,
          dutyDate,
          sessionTime,
        );
        if (roomClash) {
          throw new HttpError(
            409,
            'ROOM_CLASH',
            `Room is already booked for another exam duty on this date (${sessionTime} session).`,
          );
        }
      }

      const duty = await repo.createDuty({
        sessionId: input.sessionId,
        date: dutyDate,
        sessionTime,
        reportingTime,
        roomId: input.roomId ?? null,
        facultyId: input.facultyId,
        role,
        remarks: input.remarks ?? null,
      });

      if (notifier) {
        await notifier.notifyEmployee(input.facultyId, {
          kind: 'exam.duty.assigned',
          title: 'Exam Invigilation Duty Assigned',
          body: `You have been assigned ${role} duty on ${input.date} (${sessionTime}). Reporting time: ${reportingTime}.`,
          link: '/exam-duty',
        }).catch(() => {});
      }

      return duty;
    },

    async autoAllot(access, rawInput) {
      const input = autoAllotSchema.parse(rawInput);
      if (access.scope === 'own') {
        throw new HttpError(
          403,
          'FORBIDDEN',
          'Only exam administrators and HODs can run auto-allotment.',
        );
      }

      const session = await repo.findSessionById(input.sessionId);
      if (!session) {
        throw new HttpError(404, 'NOT_FOUND', 'Exam session not found.');
      }

      const dutyDate = new Date(input.date);
      const sessionTime = input.sessionTime;
      const reportingTime = input.reportingTime;
      const [eligibleFaculty, onLeaveSet, dutyCounts] = await Promise.all([
        repo.findEligibleFaculty({
          departmentIds:
            access.scope === 'department'
              ? [access.departmentId!]
              : input.departmentIds,
          excludeFacultyIds: input.excludeFacultyIds,
        }),
        repo.findFacultyOnLeave(dutyDate),
        repo.countDutiesByFacultyInSession(input.sessionId),
      ]);

      // Filter candidates who are NOT on leave
      const availableCandidates: typeof eligibleFaculty = [];
      for (const faculty of eligibleFaculty) {
        if (onLeaveSet.has(faculty.id)) continue;
        const clash = await repo.findDutyClash(
          faculty.id,
          dutyDate,
          sessionTime,
        );
        if (clash) continue;
        availableCandidates.push(faculty);
      }

      // Sort candidates by lowest duties served so far (equitable distribution)
      availableCandidates.sort((a, b) => {
        const countA = dutyCounts.get(a.id) ?? 0;
        const countB = dutyCounts.get(b.id) ?? 0;
        if (countA !== countB) return countA - countB;
        return a.employeeCode.localeCompare(b.employeeCode);
      });

      const allotted: ExamDutyRecord[] = [];
      const unallocatedRoomIds: number[] = [];

      for (let i = 0; i < input.roomIds.length; i++) {
        const roomId = input.roomIds[i]!;
        // Verify room isn't already occupied
        const roomClash = await repo.findRoomClash(
          roomId,
          dutyDate,
          sessionTime,
        );
        if (roomClash) {
          unallocatedRoomIds.push(roomId);
          continue;
        }

        const candidate = availableCandidates.shift();
        if (!candidate) {
          unallocatedRoomIds.push(roomId);
          continue;
        }

        const duty = await repo.createDuty({
          sessionId: input.sessionId,
          date: dutyDate,
          sessionTime,
          reportingTime,
          roomId,
          facultyId: candidate.id,
          role: 'INVIGILATOR',
          remarks: 'Auto-allotted via Fair Allocation Engine',
        });
        allotted.push(duty);

        if (notifier) {
          notifier.notifyEmployee(candidate.id, {
            kind: 'exam.duty.assigned',
            title: 'Exam Invigilation Duty Assigned',
            body: `You are allotted exam duty on ${input.date} (${sessionTime}). Reporting: ${reportingTime}.`,
            link: '/exam-duty',
          }).catch(() => {});
        }
      }

      return {
        allottedCount: allotted.length,
        duties: allotted,
        unallocatedRoomIds,
      };
    },

    async requestSwap(access, dutyId, rawInput) {
      const input = swapRequestSchema.parse(rawInput);
      const duty = await repo.findDutyById(dutyId);
      if (!duty) {
        throw new HttpError(404, 'NOT_FOUND', 'Exam duty not found.');
      }

      if (access.scope === 'own' && duty.facultyId !== access.employeeId) {
        throw new HttpError(
          403,
          'FORBIDDEN',
          'You can only request a swap for your own exam duty.',
        );
      }

      if (duty.facultyId === input.swapWithFacultyId) {
        throw new HttpError(
          400,
          'INVALID_SWAP',
          'Cannot swap duty with yourself.',
        );
      }

      const dutyDate = new Date(duty.date);

      // Check if target faculty is on leave
      const onLeave = await repo.findFacultyOnLeave(dutyDate);
      if (onLeave.has(input.swapWithFacultyId)) {
        throw new HttpError(
          409,
          'TARGET_ON_LEAVE',
          'Substitute faculty is on leave on this date.',
        );
      }

      // Check if target faculty has a clash
      const clash = await repo.findDutyClash(
        input.swapWithFacultyId,
        dutyDate,
        duty.sessionTime,
      );
      if (clash) {
        throw new HttpError(
          409,
          'TARGET_DUTY_CLASH',
          'Substitute faculty already has an exam duty on this date and session.',
        );
      }

      const updated = await repo.updateDuty(dutyId, {
        status: 'SWAP_REQUESTED',
        swapWithFacultyId: input.swapWithFacultyId,
        swapReason: input.reason,
        swapStatus: 'PENDING',
      });

      if (notifier) {
        notifier.notifyEmployee(input.swapWithFacultyId, {
          kind: 'exam.duty.swap_request',
          title: 'Exam Duty Swap Request',
          body: `A colleague requested an exam duty swap with you on ${dutyDate.toISOString().slice(0, 10)}.`,
          link: '/exam-duty',
        }).catch(() => {});
      }

      return updated;
    },

    async decideSwap(access, dutyId, rawInput) {
      const input = swapDecideSchema.parse(rawInput);
      if (access.scope === 'own') {
        throw new HttpError(
          403,
          'FORBIDDEN',
          'Only HODs and Exam Cell can approve or reject duty swaps.',
        );
      }

      const duty = await repo.findDutyById(dutyId);
      if (!duty) {
        throw new HttpError(404, 'NOT_FOUND', 'Exam duty not found.');
      }
      if (duty.status !== 'SWAP_REQUESTED' || !duty.swapWithFacultyId) {
        throw new HttpError(
          400,
          'INVALID_STATUS',
          'No pending swap request on this duty.',
        );
      }

      if (input.decision === 'APPROVED') {
        const updated = await repo.executeSwap(
          dutyId,
          duty.swapWithFacultyId,
          input.remarks,
        );

        if (notifier) {
          notifier.notifyEmployee(duty.facultyId, {
            kind: 'exam.duty.swap_approved',
            title: 'Exam Duty Swap Approved',
            body: `Your swap request for ${new Date(duty.date).toISOString().slice(0, 10)} has been approved.`,
            link: '/exam-duty',
          }).catch(() => {});

          notifier.notifyEmployee(duty.swapWithFacultyId, {
            kind: 'exam.duty.assigned',
            title: 'Exam Duty Reassigned (Swap Approved)',
            body: `You are now assigned exam duty on ${new Date(duty.date).toISOString().slice(0, 10)}.`,
            link: '/exam-duty',
          }).catch(() => {});
        }

        return updated;
      }

      const updated = await repo.updateDuty(dutyId, {
        status: 'ASSIGNED',
        swapStatus: 'REJECTED',
        remarks: input.remarks ?? 'Swap request was rejected.',
      });

      if (notifier) {
        notifier.notifyEmployee(duty.facultyId, {
          kind: 'exam.duty.swap_rejected',
          title: 'Exam Duty Swap Rejected',
          body: `Your swap request for ${new Date(duty.date).toISOString().slice(0, 10)} was rejected.`,
          link: '/exam-duty',
        }).catch(() => {});
      }

      return updated;
    },

    async exportCsv(access, rawQuery) {
      const duties = await this.listDuties(access, rawQuery);
      const rows = [
        [
          'Date',
          'Session Time',
          'Reporting Time',
          'Hall / Room',
          'Faculty Code',
          'Faculty Name',
          'Department',
          'Designation',
          'Role',
          'Status',
          'Contact Phone',
        ],
      ];

      for (const d of duties) {
        rows.push([
          new Date(d.date).toISOString().slice(0, 10),
          d.sessionTime,
          d.reportingTime,
          d.room?.name ?? 'Unassigned',
          d.faculty?.employeeCode ?? '',
          `${d.faculty?.firstName ?? ''} ${d.faculty?.lastName ?? ''}`.trim(),
          d.faculty?.department?.name ?? '',
          d.faculty?.designation?.name ?? '',
          d.role,
          d.status,
          d.faculty?.phone ?? '',
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
