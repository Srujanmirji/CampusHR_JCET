import type {
  ExamDutyRole,
  ExamDutySession,
  ExamDutyStatus,
  ExamDutySwapStatus,
  ExamSessionStatus,
  ExamType,
  PrismaClient,
} from '../../generated/prisma/client.js';

export interface ExamSessionRecord {
  id: string;
  name: string;
  academicYear: string;
  examType: ExamType;
  startDate: Date;
  endDate: Date;
  status: ExamSessionStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { duties: number };
}

export interface ExamDutyRecord {
  id: string;
  sessionId: string;
  session?: { id: string; name: string; examType: ExamType };
  date: Date;
  sessionTime: ExamDutySession;
  reportingTime: string;
  roomId: number | null;
  room?: { id: number; name: string } | null;
  facultyId: string;
  faculty?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    departmentId: number;
    department?: { id: number; code: string; name: string };
    designation?: { id: number; name: string };
    phone: string | null;
    email: string;
  };
  role: ExamDutyRole;
  status: ExamDutyStatus;
  swapWithFacultyId: string | null;
  swapWithFaculty?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    departmentId: number;
  } | null;
  swapReason: string | null;
  swapStatus: ExamDutySwapStatus | null;
  remarks: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExamDutyRepository {
  findSessionById(id: string): Promise<ExamSessionRecord | null>;
  listSessions(): Promise<ExamSessionRecord[]>;
  createSession(data: {
    name: string;
    academicYear: string;
    examType: ExamType;
    startDate: Date;
    endDate: Date;
    status: ExamSessionStatus;
    notes?: string | null;
  }): Promise<ExamSessionRecord>;

  findDutyById(id: string): Promise<ExamDutyRecord | null>;
  listDuties(filters: {
    sessionId?: string;
    date?: Date;
    facultyId?: string;
    departmentId?: number;
    status?: ExamDutyStatus;
  }): Promise<ExamDutyRecord[]>;

  findDutyClash(
    facultyId: string,
    date: Date,
    sessionTime: ExamDutySession,
    excludeId?: string,
  ): Promise<ExamDutyRecord | null>;

  findRoomClash(
    roomId: number,
    date: Date,
    sessionTime: ExamDutySession,
    excludeId?: string,
  ): Promise<ExamDutyRecord | null>;

  createDuty(data: {
    sessionId: string;
    date: Date;
    sessionTime: ExamDutySession;
    reportingTime: string;
    roomId?: number | null;
    facultyId: string;
    role: ExamDutyRole;
    remarks?: string | null;
  }): Promise<ExamDutyRecord>;

  updateDuty(
    id: string,
    data: Partial<{
      status: ExamDutyStatus;
      role: ExamDutyRole;
      roomId: number | null;
      reportingTime: string;
      remarks: string | null;
      swapWithFacultyId: string | null;
      swapReason: string | null;
      swapStatus: ExamDutySwapStatus | null;
    }>,
  ): Promise<ExamDutyRecord>;

  executeSwap(
    dutyId: string,
    targetFacultyId: string,
    decisionRemarks?: string,
  ): Promise<ExamDutyRecord>;

  countDutiesByFacultyInSession(
    sessionId: string,
  ): Promise<Map<string, number>>;

  findEligibleFaculty(options?: {
    departmentIds?: number[];
    excludeFacultyIds?: string[];
  }): Promise<
    Array<{
      id: string;
      employeeCode: string;
      firstName: string;
      lastName: string;
      departmentId: number;
      department: { id: number; code: string; name: string };
      designation: { id: number; name: string };
    }>
  >;

  findFacultyOnLeave(date: Date): Promise<Set<string>>;
}

const dutySelect = {
  id: true,
  sessionId: true,
  session: { select: { id: true, name: true, examType: true } },
  date: true,
  sessionTime: true,
  reportingTime: true,
  roomId: true,
  room: { select: { id: true, name: true } },
  facultyId: true,
  faculty: {
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      departmentId: true,
      department: { select: { id: true, code: true, name: true } },
      designation: { select: { id: true, name: true } },
      phone: true,
      email: true,
    },
  },
  role: true,
  status: true,
  swapWithFacultyId: true,
  swapWithFaculty: {
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      departmentId: true,
    },
  },
  swapReason: true,
  swapStatus: true,
  remarks: true,
  createdAt: true,
  updatedAt: true,
} as const;

export function createExamDutyRepository(prisma: PrismaClient): ExamDutyRepository {
  return {
    async findSessionById(id: string) {
      return prisma.examSession.findUnique({
        where: { id },
        include: { _count: { select: { duties: true } } },
      });
    },

    async listSessions() {
      return prisma.examSession.findMany({
        orderBy: { startDate: 'desc' },
        include: { _count: { select: { duties: true } } },
      });
    },

    async createSession(data) {
      return prisma.examSession.create({ data });
    },

    async findDutyById(id: string) {
      return prisma.examDuty.findUnique({
        where: { id },
        select: dutySelect,
      });
    },

    async listDuties(filters) {
      const where: any = {};
      if (filters.sessionId) where.sessionId = filters.sessionId;
      if (filters.date) where.date = filters.date;
      if (filters.facultyId) where.facultyId = filters.facultyId;
      if (filters.status) where.status = filters.status;
      if (filters.departmentId) {
        where.faculty = { departmentId: filters.departmentId };
      }

      return prisma.examDuty.findMany({
        where,
        select: dutySelect,
        orderBy: [{ date: 'asc' }, { sessionTime: 'asc' }],
      });
    },

    async findDutyClash(facultyId, date, sessionTime, excludeId) {
      return prisma.examDuty.findFirst({
        where: {
          facultyId,
          date,
          sessionTime,
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        select: dutySelect,
      });
    },

    async findRoomClash(roomId, date, sessionTime, excludeId) {
      return prisma.examDuty.findFirst({
        where: {
          roomId,
          date,
          sessionTime,
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        select: dutySelect,
      });
    },

    async createDuty(data) {
      return prisma.examDuty.create({
        data: {
          sessionId: data.sessionId,
          date: data.date,
          sessionTime: data.sessionTime,
          reportingTime: data.reportingTime,
          roomId: data.roomId ?? null,
          facultyId: data.facultyId,
          role: data.role,
          remarks: data.remarks ?? null,
          status: 'ASSIGNED',
        },
        select: dutySelect,
      });
    },

    async updateDuty(id, data) {
      return prisma.examDuty.update({
        where: { id },
        data,
        select: dutySelect,
      });
    },

    async executeSwap(dutyId, targetFacultyId, decisionRemarks) {
      return prisma.examDuty.update({
        where: { id: dutyId },
        data: {
          facultyId: targetFacultyId,
          status: 'SWAPPED',
          swapStatus: 'APPROVED',
          remarks: decisionRemarks ?? 'Swap approved and faculty reassigned',
        },
        select: dutySelect,
      });
    },

    async countDutiesByFacultyInSession(sessionId) {
      const grouped = await prisma.examDuty.groupBy({
        by: ['facultyId'],
        where: { sessionId },
        _count: { _all: true },
      });
      const map = new Map<string, number>();
      for (const item of grouped) {
        map.set(item.facultyId, item._count._all);
      }
      return map;
    },

    async findEligibleFaculty(options) {
      const where: any = {
        status: 'ACTIVE',
        designation: { category: 'TEACHING' },
      };
      if (options?.departmentIds && options.departmentIds.length > 0) {
        where.departmentId = { in: options.departmentIds };
      }
      if (options?.excludeFacultyIds && options.excludeFacultyIds.length > 0) {
        where.id = { notIn: options.excludeFacultyIds };
      }

      return prisma.employee.findMany({
        where,
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          departmentId: true,
          department: { select: { id: true, code: true, name: true } },
          designation: { select: { id: true, name: true } },
        },
        orderBy: [{ departmentId: 'asc' }, { employeeCode: 'asc' }],
      });
    },

    async findFacultyOnLeave(date: Date) {
      const leaves = await prisma.leaveRequest.findMany({
        where: {
          status: { in: ['APPROVED', 'PENDING'] },
          startDate: { lte: date },
          endDate: { gte: date },
        },
        select: { employeeId: true },
      });
      return new Set(leaves.map((l) => l.employeeId));
    },
  };
}
