import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import {
  calculateGrossSalary,
  createOnboardingService,
  formatAppointmentLetter,
} from '../src/modules/onboarding/onboarding.service.js';
import type {
  OnboardingCandidateRecord,
  OnboardingRepository,
} from '../src/modules/onboarding/onboarding.repository.js';
import type { Access } from '../src/modules/auth/auth.service.js';
import type { Notifier } from '../src/modules/notifications/notifications.service.js';

function createMemoryOnboardingRepository(): {
  repo: OnboardingRepository;
  candidates: OnboardingCandidateRecord[];
  employees: Array<{ id: string; employeeCode: string; email: string }>;
  users: Array<{ id: string; email: string; roleId: number }>;
  notifications: Array<{ employeeId: string; note: any }>;
  notifier: Notifier;
} {
  const candidates: OnboardingCandidateRecord[] = [];
  const employees: Array<{ id: string; employeeCode: string; email: string }> = [
    { id: randomUUID(), employeeCode: 'JCET-CSE-001', email: 'existing@jcet.ac.in' },
  ];
  const users: Array<{ id: string; email: string; roleId: number }> = [];
  const notifications: Array<{ employeeId: string; note: any }> = [];

  const departments = [
    { id: 1, code: 'CSE', name: 'Computer Science and Engineering' },
    { id: 2, code: 'ECE', name: 'Electronics and Communication Engineering' },
  ];

  const designations = [
    { id: 1, name: 'Assistant Professor', category: 'TEACHING' as const },
    { id: 2, name: 'Lab Assistant', category: 'NON_TEACHING' as const },
  ];

  const roles = [
    { id: 1, name: 'Faculty' },
    { id: 2, name: 'Non-Teaching Staff' },
  ];

  const notifier: Notifier = {
    async notifyEmployee(employeeId, note) {
      notifications.push({ employeeId, note });
    },
    async notifyRole() {},
  };

  const repo: OnboardingRepository = {
    async list(where: any, { skip, take }) {
      let filtered = [...candidates];
      const deptId = where.departmentId ?? where.AND?.[0]?.departmentId;
      if (deptId) {
        filtered = filtered.filter((c) => c.departmentId === deptId);
      }
      const status = where.status ?? where.AND?.[1]?.status;
      if (status) {
        filtered = filtered.filter((c) => c.status === status);
      }
      return {
        rows: filtered.slice(skip, skip + take),
        total: filtered.length,
      };
    },

    async findById(id) {
      return candidates.find((c) => c.id === id) ?? null;
    },

    async findByEmail(email) {
      return candidates.find((c) => c.email.toLowerCase() === email.toLowerCase()) ?? null;
    },

    async getMetrics(where) {
      let filtered = [...candidates];
      if (where.departmentId) {
        filtered = filtered.filter((c) => c.departmentId === where.departmentId);
      }
      return {
        total: filtered.length,
        pending: filtered.filter((c) => c.status === 'OFFER_PENDING').length,
        issued: filtered.filter((c) => c.status === 'OFFER_ISSUED').length,
        accepted: filtered.filter(
          (c) => c.status === 'OFFER_ACCEPTED' || c.status === 'DOCUMENTS_SUBMITTED',
        ).length,
        onboarded: filtered.filter((c) => c.status === 'ONBOARDED').length,
      };
    },

    async nextRefNo(year) {
      const prefix = `JCET/APPT/${year}/`;
      const matches = candidates.filter((c) => c.appointmentRefNo.startsWith(prefix));
      const nextNum = matches.length + 1;
      return `${prefix}${String(nextNum).padStart(3, '0')}`;
    },

    async create(data: any) {
      const dept = departments.find((d) => d.id === data.department.connect.id)!;
      const desig = designations.find((d) => d.id === data.designation.connect.id)!;
      const record: OnboardingCandidateRecord = {
        id: randomUUID(),
        appointmentRefNo: data.appointmentRefNo,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        departmentId: dept.id,
        department: dept,
        designationId: desig.id,
        designation: desig,
        employmentType: data.employmentType,
        qualification: data.qualification,
        specialization: data.specialization ?? null,
        experienceYears: data.experienceYears ?? 0,
        expectedJoiningDate: data.expectedJoiningDate,
        status: data.status,
        payScale: data.payScale,
        basicPay: data.basicPay,
        agp: data.agp ?? 0,
        daPercent: data.daPercent ?? 50,
        hraPercent: data.hraPercent ?? 18,
        grossSalary: data.grossSalary,
        probationMonths: data.probationMonths ?? 12,
        noticePeriodMonths: data.noticePeriodMonths ?? 3,
        documentsChecklist: data.documentsChecklist,
        employeeId: null,
        issuedById: null,
        issuedAt: null,
        joinedAt: null,
        notes: data.notes ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      candidates.push(record);
      return record;
    },

    async update(id, data: any) {
      const idx = candidates.findIndex((c) => c.id === id);
      if (idx === -1) throw new Error('Not found');
      const current = candidates[idx]!;
      const updated: OnboardingCandidateRecord = {
        ...current,
        ...data,
        issuedById: data.issuedBy?.connect?.id ?? current.issuedById,
        updatedAt: new Date(),
      };
      candidates[idx] = updated;
      return updated;
    },

    async findDepartment(id) {
      return departments.find((d) => d.id === id) ?? null;
    },

    async findDesignation(id) {
      return designations.find((d) => d.id === id) ?? null;
    },

    async findRoleByName(name) {
      return roles.find((r) => r.name === name) ?? null;
    },

    async findEmployeeByEmail(email) {
      const emp = employees.find((e) => e.email.toLowerCase() === email.toLowerCase());
      return emp ? { id: emp.id } : null;
    },

    async codesWithPrefix(prefix) {
      return employees
        .filter((e) => e.employeeCode.startsWith(prefix))
        .map((e) => e.employeeCode);
    },

    async completeOnboarding({ candidateId, employeeInput, userInput }) {
      const idx = candidates.findIndex((c) => c.id === candidateId);
      if (idx === -1) throw new Error('Candidate not found');

      const empId = randomUUID();
      const newEmp = {
        id: empId,
        employeeCode: employeeInput.employeeCode,
        email: employeeInput.email,
      };
      employees.push(newEmp);

      if (userInput) {
        users.push({
          id: randomUUID(),
          email: userInput.email,
          roleId: (userInput as any).role.connect.id,
        });
      }

      candidates[idx] = {
        ...candidates[idx]!,
        status: 'ONBOARDED',
        employeeId: empId,
        joinedAt: new Date(),
      };

      return {
        employee: newEmp,
        candidate: candidates[idx]!,
      };
    },
  };

  return { repo, candidates, employees, users, notifications, notifier };
}

test('calculateGrossSalary correctly sums base, DA, and HRA', () => {
  // basic 57700, agp 0, da 50% = 28850, hra 18% = 10386 -> gross 96936
  const gross = calculateGrossSalary(57700, 0, 50, 18);
  assert.equal(gross, 57700 + 28850 + 10386);
});

test('HR Admin can create candidate and issue official appointment letter', async () => {
  const { repo, notifier } = createMemoryOnboardingRepository();
  const service = createOnboardingService(repo, notifier);

  const hrAccess: Access = {
    scope: 'all',
    userId: randomUUID(),
    employeeId: randomUUID(),
    departmentId: null,
  };

  const created = await service.create(hrAccess, {
    firstName: 'Ananya',
    lastName: 'Bhat',
    email: 'ananya.bhat@gmail.com',
    phone: '9876543210',
    departmentId: 1,
    designationId: 1,
    employmentType: 'PERMANENT',
    qualification: 'M.Tech, Ph.D (VLSI Design)',
    specialization: 'Embedded Systems',
    experienceYears: 4,
    expectedJoiningDate: '2026-11-20',
    payScale: 'AICTE 7th CPC Level 10 (₹57,700 - ₹1,82,400)',
    basicPay: 57700,
    agp: 0,
    daPercent: 50,
    hraPercent: 18,
    probationMonths: 12,
    noticePeriodMonths: 3,
  });

  assert.equal(created.firstName, 'Ananya');
  assert.equal(created.appointmentRefNo, 'JCET/APPT/2026/001');
  assert.equal(created.status, 'OFFER_PENDING');
  assert.equal(created.grossSalary, 96936);

  // Issue official letter
  const issued = await service.issueLetter(hrAccess, created.id);
  assert.equal(issued.status, 'OFFER_ISSUED');
  assert.equal(issued.issuedById, hrAccess.userId);
  assert(issued.letter.refNo.startsWith('JCET/APPT/2026/'));
  assert.equal(issued.letter.candidateName, 'Ananya Bhat');
  assert.equal(issued.letter.institution.name, 'Jain College of Engineering & Technology (JCET)');
});

test('HOD is scoped to own department when viewing candidates and cannot create candidates', async () => {
  const { repo, notifier } = createMemoryOnboardingRepository();
  const service = createOnboardingService(repo, notifier);

  const hrAccess: Access = {
    scope: 'all',
    userId: randomUUID(),
    employeeId: randomUUID(),
    departmentId: null,
  };

  // Add CSE candidate
  await service.create(hrAccess, {
    firstName: 'CSE',
    lastName: 'Prof',
    email: 'cse.prof@gmail.com',
    phone: '9999999991',
    departmentId: 1,
    designationId: 1,
    employmentType: 'PERMANENT',
    qualification: 'M.Tech',
    expectedJoiningDate: '2026-11-20',
    payScale: 'Level 10',
    basicPay: 57700,
  });

  // Add ECE candidate
  await service.create(hrAccess, {
    firstName: 'ECE',
    lastName: 'Prof',
    email: 'ece.prof@gmail.com',
    phone: '9999999992',
    departmentId: 2,
    designationId: 1,
    employmentType: 'PERMANENT',
    qualification: 'M.Tech',
    expectedJoiningDate: '2026-11-20',
    payScale: 'Level 10',
    basicPay: 57700,
  });

  const cseHodAccess: Access = {
    scope: 'department',
    userId: randomUUID(),
    employeeId: randomUUID(),
    departmentId: 1,
  };

  // HOD listing sees only CSE candidate
  const hodList = await service.list(cseHodAccess, {});
  assert.equal(hodList.data.length, 1);
  assert.equal(hodList.data[0]!.departmentId, 1);

  // HOD attempting to create candidate is forbidden
  await assert.rejects(
    () =>
      service.create(cseHodAccess, {
        firstName: 'Unauthorized',
        lastName: 'User',
        email: 'unauth@gmail.com',
        phone: '9999999993',
        departmentId: 1,
        designationId: 1,
        employmentType: 'PERMANENT',
        qualification: 'B.E.',
        expectedJoiningDate: '2026-11-20',
        payScale: 'Level 10',
        basicPay: 57700,
      }),
    { code: 'FORBIDDEN' },
  );
});

test('completing onboarding generates next employee code and creates Employee and User account', async () => {
  const { repo, employees, users, notifications, notifier } =
    createMemoryOnboardingRepository();
  const service = createOnboardingService(repo, notifier);

  const hrAccess: Access = {
    scope: 'all',
    userId: randomUUID(),
    employeeId: randomUUID(),
    departmentId: null,
  };

  const candidate = await service.create(hrAccess, {
    firstName: 'Kavita',
    lastName: 'Deshpande',
    email: 'kavita.deshpande@gmail.com',
    phone: '9888877776',
    departmentId: 1, // CSE
    designationId: 1, // Assistant Professor (TEACHING)
    employmentType: 'PERMANENT',
    qualification: 'Ph.D (Computer Science)',
    expectedJoiningDate: '2026-11-25',
    payScale: 'AICTE Level 10',
    basicPay: 57700,
  });

  const completion = await service.complete(hrAccess, candidate.id, {
    createLoginAccount: true,
    temporaryPassword: 'Jcet@Password2026!',
    joiningDate: '2026-11-25',
  });

  // Since JCET-CSE-001 already exists, next should be JCET-CSE-002
  assert.equal(completion.employee.employeeCode, 'JCET-CSE-002');
  assert.equal(completion.candidate.status, 'ONBOARDED');
  assert.equal(employees.length, 2);
  assert.equal(users.length, 1);
  assert.equal(users[0]!.roleId, 1); // Faculty role

  // Welcome notification dispatched
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0]!.note.kind, 'onboarding_welcome');
  assert(notifications[0]!.note.body.includes('JCET-CSE-002'));
});
