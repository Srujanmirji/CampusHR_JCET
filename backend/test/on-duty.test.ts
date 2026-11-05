import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import {
  calculateWorkingDays,
  createOnDutyService,
} from '../src/modules/on-duty/on-duty.service.js';
import type {
  OnDutyRecord,
  OnDutyRepository,
} from '../src/modules/on-duty/on-duty.repository.js';
import type { Access } from '../src/modules/auth/auth.service.js';
import type { Notifier } from '../src/modules/notifications/notifications.service.js';

const FACULTY_CSE_ID = randomUUID();
const FACULTY_ECE_ID = randomUUID();

function createMemoryOnDutyRepository(): {
  repo: OnDutyRepository;
  requests: OnDutyRecord[];
  creditedAttendance: Array<{ employeeId: string; date: Date; dutyTitle: string }>;
  notifications: Array<{ target: string; note: any }>;
  notifier: Notifier;
} {
  const requests: OnDutyRecord[] = [];
  const creditedAttendance: Array<{ employeeId: string; date: Date; dutyTitle: string }> = [];
  const notifications: Array<{ target: string; note: any }> = [];

  const employees = [
    {
      id: FACULTY_CSE_ID,
      employeeCode: 'JCET-CSE-001',
      firstName: 'Amit',
      lastName: 'Patil',
      departmentId: 1,
      department: { id: 1, code: 'CSE', name: 'Computer Science and Engineering' },
      designation: { id: 1, name: 'Assistant Professor', category: 'TEACHING' as const },
    },
    {
      id: FACULTY_ECE_ID,
      employeeCode: 'JCET-ECE-001',
      firstName: 'Neha',
      lastName: 'Kamat',
      departmentId: 2,
      department: { id: 2, code: 'ECE', name: 'Electronics and Communication Engineering' },
      designation: { id: 1, name: 'Associate Professor', category: 'TEACHING' as const },
    },
  ];

  const notifier: Notifier = {
    async notifyEmployee(employeeId, note) {
      notifications.push({ target: `employee:${employeeId}`, note });
    },
    async notifyRole(role, departmentId, note) {
      notifications.push({ target: `role:${role}`, note });
    },
  };

  const repo: OnDutyRepository = {
    async list(where: any, { skip, take }) {
      let filtered = [...requests];
      const deptId = where.employee?.departmentId ?? where.AND?.[0]?.employee?.departmentId;
      if (deptId) {
        filtered = filtered.filter((r) => r.employee.departmentId === deptId);
      }
      const empId = where.employeeId ?? where.AND?.[0]?.employeeId;
      if (empId) {
        filtered = filtered.filter((r) => r.employeeId === empId);
      }
      const status = where.status ?? where.AND?.[1]?.status;
      if (status) {
        filtered = filtered.filter((r) => r.status === status);
      }
      return {
        rows: filtered.slice(skip, skip + take),
        total: filtered.length,
      };
    },

    async findById(id) {
      return requests.find((r) => r.id === id) ?? null;
    },

    async getMetrics(where: any) {
      let filtered = [...requests];
      const deptId = where.employee?.departmentId;
      if (deptId) {
        filtered = filtered.filter((r) => r.employee.departmentId === deptId);
      }
      const empId = where.employeeId;
      if (empId) {
        filtered = filtered.filter((r) => r.employeeId === empId);
      }
      return {
        total: filtered.length,
        pending: filtered.filter((r) => r.status === 'PENDING').length,
        recommended: filtered.filter((r) => r.status === 'RECOMMENDED').length,
        approved: filtered.filter((r) => r.status === 'APPROVED').length,
        rejected: filtered.filter((r) => r.status === 'REJECTED').length,
      };
    },

    async create(data: any) {
      const emp = employees.find((e) => e.id === data.employee.connect.id)!;
      const record: OnDutyRecord = {
        id: randomUUID(),
        employeeId: emp.id,
        employee: emp,
        category: data.category,
        title: data.title,
        description: data.description,
        venue: data.venue,
        startDate: data.startDate,
        endDate: data.endDate,
        totalDays: data.totalDays,
        status: data.status,
        attachmentUrl: data.attachmentUrl ?? null,
        attachmentName: data.attachmentName ?? null,
        attendanceCertificateUrl: null,
        hodReviewedById: null,
        hodReviewedAt: null,
        hodNote: null,
        finalApprovedById: null,
        finalApprovedAt: null,
        finalNote: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      requests.push(record);
      return record;
    },

    async update(id, data: any) {
      const idx = requests.findIndex((r) => r.id === id);
      if (idx === -1) throw new Error('Not found');
      const current = requests[idx]!;
      const updated: OnDutyRecord = {
        ...current,
        ...data,
        hodReviewedById: data.hodReviewedBy?.connect?.id ?? current.hodReviewedById,
        finalApprovedById: data.finalApprovedBy?.connect?.id ?? current.finalApprovedById,
        updatedAt: new Date(),
      };
      requests[idx] = updated;
      return updated;
    },

    async findEmployee(id) {
      const emp = employees.find((e) => e.id === id);
      return emp
        ? {
            id: emp.id,
            employeeCode: emp.employeeCode,
            departmentId: emp.departmentId,
            firstName: emp.firstName,
            lastName: emp.lastName,
          }
        : null;
    },

    async creditAttendanceForDates({ employeeId, dates, dutyTitle }) {
      for (const d of dates) {
        creditedAttendance.push({ employeeId, date: d, dutyTitle });
      }
    },
  };

  return { repo, requests, creditedAttendance, notifications, notifier };
}

test('calculateWorkingDays calculates Monday through Saturday and excludes Sundays', () => {
  // 2026-11-09 (Monday) to 2026-11-15 (Sunday) = 7 calendar days, 6 working days (Sunday skipped)
  const result = calculateWorkingDays('2026-11-09', '2026-11-15');
  assert.equal(result.totalDays, 6);
  assert.equal(result.dates.length, 6);
  for (const d of result.dates) {
    assert.notEqual(d.getUTCDay(), 0);
  }
});

test('faculty can apply for On-Duty and HOD can recommend it', async () => {
  const { repo, notifications, notifier } = createMemoryOnDutyRepository();
  const service = createOnDutyService(repo, notifier);

  const facultyAccess: Access = {
    scope: 'own',
    userId: randomUUID(),
    employeeId: FACULTY_CSE_ID,
    departmentId: 1,
  };

  const created = await service.apply(facultyAccess, {
    category: 'UNIVERSITY_VALUATION',
    title: 'VTU Central Valuation - Design of Machine Elements',
    description: 'Valuation of 5th semester exam answer scripts',
    venue: 'VTU Regional Evaluation Center, Belagavi',
    startDate: '2026-11-10',
    endDate: '2026-11-14',
    attachmentUrl: 'https://example.com/vtu-order.pdf',
    attachmentName: 'VTU_Relieving_Order.pdf',
  });

  assert.equal(created.status, 'PENDING');
  assert.equal(created.totalDays, 5);
  assert.equal(created.employeeId, FACULTY_CSE_ID);

  // Notification dispatched to HOD
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0]!.target, 'role:HOD');

  // HOD reviews and recommends
  const hodAccess: Access = {
    scope: 'department',
    userId: randomUUID(),
    employeeId: randomUUID(),
    departmentId: 1, // CSE HOD
  };

  const recommended = await service.review(hodAccess, created.id, {
    decision: 'RECOMMEND',
    note: 'Syllabus covered. Recommended for university valuation duty.',
  });

  assert.equal(recommended.status, 'RECOMMENDED');
  assert.equal(recommended.hodNote, 'Syllabus covered. Recommended for university valuation duty.');

  // Notification sent to Principal
  assert(notifications.some((n) => n.target === 'role:Principal'));
});

test('HOD is forbidden from reviewing On-Duty from another department', async () => {
  const { repo, notifier } = createMemoryOnDutyRepository();
  const service = createOnDutyService(repo, notifier);

  const eceFacultyAccess: Access = {
    scope: 'own',
    userId: randomUUID(),
    employeeId: FACULTY_ECE_ID,
    departmentId: 2,
  };

  const created = await service.apply(eceFacultyAccess, {
    category: 'CONFERENCE_SEMINAR',
    title: 'IEEE International Conference on VLSI',
    description: 'Oral paper presentation on low-power architectures',
    venue: 'IISc Bangalore',
    startDate: '2026-11-16',
    endDate: '2026-11-18',
  });

  const cseHodAccess: Access = {
    scope: 'department',
    userId: randomUUID(),
    employeeId: randomUUID(),
    departmentId: 1, // Department 1 (CSE), while request is in Department 2 (ECE)
  };

  await assert.rejects(
    () =>
      service.review(cseHodAccess, created.id, {
        decision: 'RECOMMEND',
      }),
    { code: 'FORBIDDEN' },
  );
});

test('Principal approval updates status to APPROVED and credits attendance records', async () => {
  const { repo, creditedAttendance, notifications, notifier } = createMemoryOnDutyRepository();
  const service = createOnDutyService(repo, notifier);

  const facultyAccess: Access = {
    scope: 'own',
    userId: randomUUID(),
    employeeId: FACULTY_CSE_ID,
    departmentId: 1,
  };

  const created = await service.apply(facultyAccess, {
    category: 'EXTERNAL_EXAMINER',
    title: 'VTU External Lab Examiner - Computer Networks Lab',
    description: 'Conducting final practical exams',
    venue: 'KLS GIT Belagavi',
    startDate: '2026-11-16', // Monday
    endDate: '2026-11-18', // Wednesday = 3 working days
  });

  const principalAccess: Access = {
    scope: 'all',
    userId: randomUUID(),
    employeeId: randomUUID(),
    departmentId: null,
  };

  const approved = await service.review(principalAccess, created.id, {
    decision: 'APPROVE',
    note: 'Approved. Relieving order sanctioned.',
  });

  assert.equal(approved.status, 'APPROVED');
  assert.equal(approved.finalApprovedById, principalAccess.userId);

  // Verify attendance credit was triggered for all 3 days
  assert.equal(creditedAttendance.length, 3);
  for (const record of creditedAttendance) {
    assert.equal(record.employeeId, FACULTY_CSE_ID);
    assert(record.dutyTitle.includes('External Lab Examiner'));
  }

  // Verify faculty received instant approval notification
  assert(
    notifications.some(
      (n) =>
        n.target === `employee:${FACULTY_CSE_ID}` &&
        n.note.kind === 'on_duty_approved',
    ),
  );
});
