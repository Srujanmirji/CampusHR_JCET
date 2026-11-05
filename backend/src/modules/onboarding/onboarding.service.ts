import bcrypt from 'bcrypt';
import { HttpError } from '../../common/http-error.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { Access } from '../auth/auth.service.js';
import { BCRYPT_COST } from '../auth/auth.service.js';
import type { Notifier } from '../notifications/notifications.service.js';
import { nextEmployeeCode } from '../employees/employee.service.js';
import {
  createCandidateSchema,
  updateCandidateSchema,
  updateCandidateStatusSchema,
  completeOnboardingSchema,
  queryCandidatesSchema,
  type CreateCandidateInput,
  type UpdateCandidateInput,
  type UpdateCandidateStatusInput,
  type CompleteOnboardingInput,
  type QueryCandidatesInput,
} from './onboarding.schema.js';
import type {
  OnboardingCandidateRecord,
  OnboardingRepository,
} from './onboarding.repository.js';

export function formatAppointmentLetter(candidate: OnboardingCandidateRecord) {
  const issueDate = candidate.issuedAt
    ? candidate.issuedAt.toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const joiningDate = candidate.expectedJoiningDate.toISOString().slice(0, 10);

  return {
    refNo: candidate.appointmentRefNo,
    issueDate,
    candidateName: `${candidate.firstName} ${candidate.lastName}`,
    email: candidate.email,
    phone: candidate.phone,
    department: candidate.department.name,
    departmentCode: candidate.department.code,
    designation: candidate.designation.name,
    category: candidate.designation.category,
    employmentType: candidate.employmentType,
    probationMonths: candidate.probationMonths,
    noticePeriodMonths: candidate.noticePeriodMonths,
    expectedJoiningDate: joiningDate,
    institution: {
      name: 'Jain College of Engineering & Technology (JCET)',
      address: 'Hubballi Road, Belagavi, Karnataka - 590014',
      affiliation: 'Approved by AICTE, New Delhi & Affiliated to VTU, Belagavi',
      authorizedSignatory: 'Principal & Member Secretary',
    },
    termsAndConditions: [
      `1. You will be placed on probation for a period of ${candidate.probationMonths} months from the date of joining.`,
      `2. You will be required to give ${candidate.noticePeriodMonths} months' notice prior to resignation.`,
      '3. Your appointment is subject to submission of original educational credentials, proof of age, and satisfactory background verification.',
      '4. You will strictly abide by the rules, code of ethics, and academic regulations of JCET, VTU, and AICTE.',
    ],
  };
}

export interface OnboardingService {
  list(access: Access, rawQuery: QueryCandidatesInput): Promise<{
    data: OnboardingCandidateRecord[];
    meta: {
      page: number;
      pageSize: number;
      total: number;
      pending: number;
      issued: number;
      accepted: number;
      onboarded: number;
    };
  }>;
  getById(access: Access, id: string): Promise<OnboardingCandidateRecord & { letter: ReturnType<typeof formatAppointmentLetter> }>;
  create(access: Access, rawInput: CreateCandidateInput): Promise<OnboardingCandidateRecord>;
  update(access: Access, id: string, rawInput: UpdateCandidateInput): Promise<OnboardingCandidateRecord>;
  issueLetter(access: Access, id: string): Promise<OnboardingCandidateRecord & { letter: ReturnType<typeof formatAppointmentLetter> }>;
  updateStatus(access: Access, id: string, rawInput: UpdateCandidateStatusInput): Promise<OnboardingCandidateRecord>;
  complete(access: Access, id: string, rawInput: CompleteOnboardingInput): Promise<{
    candidate: OnboardingCandidateRecord;
    employee: { id: string; employeeCode: string };
    generatedPassword?: string;
  }>;
}

export function createOnboardingService(
  repo: OnboardingRepository,
  notifier?: Notifier,
): OnboardingService {
  function applyScope(
    access: Access,
    queryDept?: number,
  ): Prisma.OnboardingCandidateWhereInput {
    if (access.scope === 'department') {
      if (access.departmentId === null) {
        throw new HttpError(403, 'FORBIDDEN', 'No department linked to user account.');
      }
      return { departmentId: access.departmentId };
    }
    if (access.scope === 'all') {
      return queryDept ? { departmentId: queryDept } : {};
    }
    throw new HttpError(403, 'FORBIDDEN', 'Insufficient permissions for recruitment.');
  }

  return {
    async list(access, rawQuery) {
      const query = queryCandidatesSchema.parse(rawQuery);
      const scopedWhere = applyScope(access, query.departmentId);

      const where: Prisma.OnboardingCandidateWhereInput = {
        AND: [
          scopedWhere,
          query.status ? { status: query.status } : {},
          query.search
            ? {
                OR: [
                  { firstName: { contains: query.search, mode: 'insensitive' } },
                  { lastName: { contains: query.search, mode: 'insensitive' } },
                  { email: { contains: query.search, mode: 'insensitive' } },
                  { appointmentRefNo: { contains: query.search, mode: 'insensitive' } },
                ],
              }
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
        meta: {
          page: query.page,
          pageSize: query.pageSize,
          total: paged.total,
          pending: metrics.pending,
          issued: metrics.issued,
          accepted: metrics.accepted,
          onboarded: metrics.onboarded,
        },
      };
    },

    async getById(access, id) {
      const candidate = await repo.findById(id);
      if (!candidate) {
        throw new HttpError(404, 'NOT_FOUND', 'Candidate not found.');
      }
      if (
        access.scope === 'department' &&
        candidate.departmentId !== access.departmentId
      ) {
        throw new HttpError(403, 'FORBIDDEN', 'Candidate belongs to another department.');
      }

      return {
        ...candidate,
        letter: formatAppointmentLetter(candidate),
      };
    },

    async create(access, rawInput) {
      if (access.scope !== 'all') {
        throw new HttpError(403, 'FORBIDDEN', 'Only HR Admin can add candidates.');
      }

      const input = createCandidateSchema.parse(rawInput);

      // Verify department & designation exist
      const [dept, desig] = await Promise.all([
        repo.findDepartment(input.departmentId),
        repo.findDesignation(input.designationId),
      ]);
      if (!dept) throw new HttpError(400, 'VALIDATION_ERROR', 'Invalid department.');
      if (!desig) throw new HttpError(400, 'VALIDATION_ERROR', 'Invalid designation.');

      // Check email uniqueness across both candidates and existing employees
      const [existingCand, existingEmp] = await Promise.all([
        repo.findByEmail(input.email),
        repo.findEmployeeByEmail(input.email),
      ]);
      if (existingCand || existingEmp) {
        throw new HttpError(409, 'ALREADY_EXISTS', 'A candidate or employee with this email already exists.');
      }

      const currentYear = new Date().getFullYear();
      const appointmentRefNo = await repo.nextRefNo(currentYear);

      const created = await repo.create({
        appointmentRefNo,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email.toLowerCase(),
        phone: input.phone,
        department: { connect: { id: input.departmentId } },
        designation: { connect: { id: input.designationId } },
        employmentType: input.employmentType,
        qualification: input.qualification,
        specialization: input.specialization,
        experienceYears: input.experienceYears,
        expectedJoiningDate: new Date(`${input.expectedJoiningDate}T00:00:00Z`),
        status: 'OFFER_PENDING',
        probationMonths: input.probationMonths,
        noticePeriodMonths: input.noticePeriodMonths,
        documentsChecklist: {
          degreeCertificate: false,
          pgMarksheet: false,
          experienceCertificate: false,
          relievingOrder: false,
          aadhaarPan: false,
          addressProof: false,
        },
        notes: input.notes,
      });

      return created;
    },

    async update(access, id, rawInput) {
      if (access.scope !== 'all') {
        throw new HttpError(403, 'FORBIDDEN', 'Only HR Admin can edit candidate details.');
      }

      const existing = await repo.findById(id);
      if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Candidate not found.');
      if (existing.status === 'ONBOARDED') {
        throw new HttpError(409, 'CONFLICT', 'Cannot edit a candidate who is already onboarded.');
      }

      const input = updateCandidateSchema.parse(rawInput);

      if (input.email && input.email !== existing.email) {
        const conflict = await repo.findByEmail(input.email);
        if (conflict && conflict.id !== id) {
          throw new HttpError(409, 'ALREADY_EXISTS', 'Email is already taken by another candidate.');
        }
      }

      const mergedChecklist = input.documentsChecklist
        ? { ...(existing.documentsChecklist || {}), ...input.documentsChecklist }
        : existing.documentsChecklist;

      const updated = await repo.update(id, {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email?.toLowerCase(),
        phone: input.phone,
        department: input.departmentId ? { connect: { id: input.departmentId } } : undefined,
        designation: input.designationId ? { connect: { id: input.designationId } } : undefined,
        employmentType: input.employmentType,
        qualification: input.qualification,
        specialization: input.specialization,
        experienceYears: input.experienceYears,
        expectedJoiningDate: input.expectedJoiningDate
          ? new Date(`${input.expectedJoiningDate}T00:00:00Z`)
          : undefined,
        probationMonths: input.probationMonths,
        noticePeriodMonths: input.noticePeriodMonths,
        documentsChecklist: mergedChecklist
          ? (mergedChecklist as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        notes: input.notes,
      });

      return updated;
    },

    async issueLetter(access, id) {
      if (access.scope !== 'all') {
        throw new HttpError(403, 'FORBIDDEN', 'Only HR Admin can issue appointment letters.');
      }

      const existing = await repo.findById(id);
      if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Candidate not found.');

      const updated = await repo.update(id, {
        status: 'OFFER_ISSUED',
        issuedBy: { connect: { id: access.userId } },
        issuedAt: new Date(),
      });

      return {
        ...updated,
        letter: formatAppointmentLetter(updated),
      };
    },

    async updateStatus(access, id, rawInput) {
      if (access.scope !== 'all') {
        throw new HttpError(403, 'FORBIDDEN', 'Only HR Admin can update candidate status.');
      }

      const existing = await repo.findById(id);
      if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Candidate not found.');
      if (existing.status === 'ONBOARDED') {
        throw new HttpError(409, 'CONFLICT', 'Cannot change status of onboarded candidate.');
      }

      const input = updateCandidateStatusSchema.parse(rawInput);
      const updated = await repo.update(id, {
        status: input.status,
        notes: input.notes ? `${existing.notes || ''}\n${input.notes}`.trim() : existing.notes,
      });

      return updated;
    },

    async complete(access, id, rawInput) {
      if (access.scope !== 'all') {
        throw new HttpError(403, 'FORBIDDEN', 'Only HR Admin can complete onboarding.');
      }

      const candidate = await repo.findById(id);
      if (!candidate) throw new HttpError(404, 'NOT_FOUND', 'Candidate not found.');
      if (candidate.status === 'ONBOARDED') {
        throw new HttpError(409, 'CONFLICT', 'Candidate has already been onboarded.');
      }

      const input = completeOnboardingSchema.parse(rawInput);

      // Generate next employee code in JCET-<DEPT>-<NNN>
      const prefix = `JCET-${candidate.department.code}-`;
      const existingCodes = await repo.codesWithPrefix(prefix);
      const employeeCode = nextEmployeeCode(candidate.department.code, existingCodes);

      const joiningDate = input.joiningDate
        ? new Date(`${input.joiningDate}T00:00:00Z`)
        : new Date(candidate.expectedJoiningDate);

      // Prepare employee record
      const employeeInput: Prisma.EmployeeCreateInput = {
        employeeCode,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        email: candidate.email,
        phone: candidate.phone,
        department: { connect: { id: candidate.departmentId } },
        designation: { connect: { id: candidate.designationId } },
        employmentType: candidate.employmentType,
        joiningDate,
        qualification: candidate.qualification,
        specialization: candidate.specialization,
        experienceYears: candidate.experienceYears,
        status: 'ACTIVE',
      };

      let userInput: Prisma.UserCreateInput | undefined;
      const generatedPassword = input.temporaryPassword || 'Jcet@Welcome2026!';

      if (input.createLoginAccount) {
        // Map designation category to role name
        const roleName =
          candidate.designation.category === 'TEACHING'
            ? 'Faculty'
            : 'Non-Teaching Staff';

        const role = await repo.findRoleByName(roleName);
        if (!role) {
          throw new HttpError(500, 'SERVER_ERROR', `Role ${roleName} not found.`);
        }

        const passwordHash = await bcrypt.hash(generatedPassword, BCRYPT_COST);
        userInput = {
          email: candidate.email,
          passwordHash,
          role: { connect: { id: role.id } },
          status: 'ACTIVE',
        };
      }

      const result = await repo.completeOnboarding({
        candidateId: id,
        employeeInput,
        userInput,
      });

      // Send welcome notification if notifier is available
      if (notifier && result.employee.id) {
        notifier.notifyEmployee(result.employee.id, {
          kind: 'onboarding_welcome',
          title: 'Welcome to JCET!',
          body: `Congratulations ${candidate.firstName}! Your onboarding is complete. Your Employee Code is ${employeeCode}.`,
          link: '/dashboard',
        }).catch(() => {});
      }

      return {
        candidate: result.candidate,
        employee: result.employee,
        generatedPassword: input.createLoginAccount ? generatedPassword : undefined,
      };
    },
  };
}
