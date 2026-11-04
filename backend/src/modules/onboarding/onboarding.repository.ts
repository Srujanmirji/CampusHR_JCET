import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';

export interface OnboardingCandidateRecord {
  id: string;
  appointmentRefNo: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  departmentId: number;
  department: {
    id: number;
    code: string;
    name: string;
  };
  designationId: number;
  designation: {
    id: number;
    name: string;
    category: 'TEACHING' | 'NON_TEACHING';
  };
  employmentType: 'PERMANENT' | 'CONTRACT' | 'PROBATIONARY' | 'VISITING';
  qualification: string;
  specialization: string | null;
  experienceYears: number;
  expectedJoiningDate: Date;
  status:
    | 'OFFER_PENDING'
    | 'OFFER_ISSUED'
    | 'OFFER_ACCEPTED'
    | 'DOCUMENTS_SUBMITTED'
    | 'ONBOARDED'
    | 'REJECTED'
    | 'WITHDRAWN';
  payScale: string;
  basicPay: number;
  agp: number;
  daPercent: number;
  hraPercent: number;
  grossSalary: number;
  probationMonths: number;
  noticePeriodMonths: number;
  documentsChecklist: any;
  employeeId: string | null;
  employee?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
  } | null;
  issuedById: string | null;
  issuedBy?: {
    id: string;
    email: string;
  } | null;
  issuedAt: Date | null;
  joinedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OnboardingRepository {
  list(
    where: Prisma.OnboardingCandidateWhereInput,
    pagination: { skip: number; take: number },
  ): Promise<{ rows: OnboardingCandidateRecord[]; total: number }>;
  findById(id: string): Promise<OnboardingCandidateRecord | null>;
  findByEmail(email: string): Promise<OnboardingCandidateRecord | null>;
  getMetrics(where: Prisma.OnboardingCandidateWhereInput): Promise<{
    total: number;
    pending: number;
    issued: number;
    accepted: number;
    onboarded: number;
  }>;
  nextRefNo(year: number): Promise<string>;
  create(data: Prisma.OnboardingCandidateCreateInput): Promise<OnboardingCandidateRecord>;
  update(
    id: string,
    data: Prisma.OnboardingCandidateUpdateInput,
  ): Promise<OnboardingCandidateRecord>;
  findDepartment(id: number): Promise<{ id: number; code: string; name: string } | null>;
  findDesignation(
    id: number,
  ): Promise<{ id: number; name: string; category: 'TEACHING' | 'NON_TEACHING' } | null>;
  findRoleByName(name: string): Promise<{ id: number; name: string } | null>;
  findEmployeeByEmail(email: string): Promise<{ id: string } | null>;
  codesWithPrefix(prefix: string): Promise<string[]>;
  completeOnboarding(params: {
    candidateId: string;
    employeeInput: Prisma.EmployeeCreateInput;
    userInput?: Prisma.UserCreateInput;
  }): Promise<{ employee: { id: string; employeeCode: string }; candidate: OnboardingCandidateRecord }>;
}

const defaultInclude = {
  department: { select: { id: true, code: true, name: true } },
  designation: { select: { id: true, name: true, category: true } },
  employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
  issuedBy: { select: { id: true, email: true } },
} as const;

export function createOnboardingRepository(prisma: PrismaClient): OnboardingRepository {
  return {
    async list(where, { skip, take }) {
      const [rows, total] = await Promise.all([
        prisma.onboardingCandidate.findMany({
          where,
          include: defaultInclude,
          orderBy: { createdAt: 'desc' },
          skip,
          take,
        }),
        prisma.onboardingCandidate.count({ where }),
      ]);
      return { rows: rows as unknown as OnboardingCandidateRecord[], total };
    },

    async findById(id) {
      const row = await prisma.onboardingCandidate.findUnique({
        where: { id },
        include: defaultInclude,
      });
      return row as unknown as OnboardingCandidateRecord | null;
    },

    async findByEmail(email) {
      const row = await prisma.onboardingCandidate.findUnique({
        where: { email },
        include: defaultInclude,
      });
      return row as unknown as OnboardingCandidateRecord | null;
    },

    async getMetrics(where) {
      const [total, pending, issued, accepted, onboarded] = await Promise.all([
        prisma.onboardingCandidate.count({ where }),
        prisma.onboardingCandidate.count({
          where: { ...where, status: 'OFFER_PENDING' },
        }),
        prisma.onboardingCandidate.count({
          where: { ...where, status: 'OFFER_ISSUED' },
        }),
        prisma.onboardingCandidate.count({
          where: {
            ...where,
            status: { in: ['OFFER_ACCEPTED', 'DOCUMENTS_SUBMITTED'] },
          },
        }),
        prisma.onboardingCandidate.count({
          where: { ...where, status: 'ONBOARDED' },
        }),
      ]);
      return { total, pending, issued, accepted, onboarded };
    },

    async nextRefNo(year) {
      const prefix = `JCET/APPT/${year}/`;
      const matches = await prisma.onboardingCandidate.findMany({
        where: { appointmentRefNo: { startsWith: prefix } },
        select: { appointmentRefNo: true },
      });
      const numbers = matches.map((m) => {
        const part = m.appointmentRefNo.slice(prefix.length);
        const n = parseInt(part, 10);
        return isNaN(n) ? 0 : n;
      });
      const nextNum = Math.max(0, ...numbers) + 1;
      return `${prefix}${String(nextNum).padStart(3, '0')}`;
    },

    async create(data) {
      const row = await prisma.onboardingCandidate.create({
        data,
        include: defaultInclude,
      });
      return row as unknown as OnboardingCandidateRecord;
    },

    async update(id, data) {
      const row = await prisma.onboardingCandidate.update({
        where: { id },
        data,
        include: defaultInclude,
      });
      return row as unknown as OnboardingCandidateRecord;
    },

    async findDepartment(id) {
      return prisma.department.findUnique({
        where: { id },
        select: { id: true, code: true, name: true },
      });
    },

    async findDesignation(id) {
      return prisma.designation.findUnique({
        where: { id },
        select: { id: true, name: true, category: true },
      });
    },

    async findRoleByName(name) {
      return prisma.role.findUnique({
        where: { name },
        select: { id: true, name: true },
      });
    },

    async findEmployeeByEmail(email) {
      return prisma.employee.findUnique({
        where: { email },
        select: { id: true },
      });
    },

    async codesWithPrefix(prefix) {
      const rows = await prisma.employee.findMany({
        where: { employeeCode: { startsWith: prefix } },
        select: { employeeCode: true },
      });
      return rows.map((r) => r.employeeCode);
    },

    async completeOnboarding({ candidateId, employeeInput, userInput }) {
      return prisma.$transaction(async (tx) => {
        const employee = await tx.employee.create({
          data: employeeInput,
          select: { id: true, employeeCode: true },
        });

        if (userInput) {
          await tx.user.create({
            data: {
              ...userInput,
              employee: { connect: { id: employee.id } },
            },
          });
        }

        const candidate = await tx.onboardingCandidate.update({
          where: { id: candidateId },
          data: {
            status: 'ONBOARDED',
            employeeId: employee.id,
            joinedAt: employeeInput.joiningDate,
          },
          include: defaultInclude,
        });

        return {
          employee,
          candidate: candidate as unknown as OnboardingCandidateRecord,
        };
      });
    },
  };
}
