import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { createExamDutyService } from '../src/modules/exam-duty/exam-duty.service.js';
import type {
  ExamDutyRecord,
  ExamDutyRepository,
  ExamSessionRecord,
} from '../src/modules/exam-duty/exam-duty.repository.js';
import type { Access } from '../src/modules/auth/auth.service.js';

const FAC_1 = randomUUID();
const FAC_2 = randomUUID();
const FAC_3 = randomUUID();

function createMemoryExamDutyRepository(): {
  repo: ExamDutyRepository;
  sessions: ExamSessionRecord[];
  duties: ExamDutyRecord[];
  facultyOnLeave: Set<string>;
} {
  const sessions: ExamSessionRecord[] = [];
  const duties: ExamDutyRecord[] = [];
  const facultyOnLeave = new Set<string>();

  const facultyList = [
    {
      id: FAC_1,
      employeeCode: 'JCET-CSE-001',
      firstName: 'Rohan',
      lastName: 'Sharma',
      departmentId: 1,
      department: { id: 1, code: 'CSE', name: 'Computer Science' },
      designation: { id: 1, name: 'Assistant Professor' },
    },
    {
      id: FAC_2,
      employeeCode: 'JCET-CSE-002',
      firstName: 'Pooja',
      lastName: 'Hegde',
      departmentId: 1,
      department: { id: 1, code: 'CSE', name: 'Computer Science' },
      designation: { id: 2, name: 'Associate Professor' },
    },
    {
      id: FAC_3,
      employeeCode: 'JCET-ECE-001',
      firstName: 'Vikram',
      lastName: 'Kulkarni',
      departmentId: 2,
      department: { id: 2, code: 'ECE', name: 'Electronics & Communication' },
      designation: { id: 1, name: 'Assistant Professor' },
    },
  ];

  const repo: ExamDutyRepository = {
    async findSessionById(id) {
      return sessions.find((s) => s.id === id) ?? null;
    },
    async listSessions() {
      return [...sessions];
    },
    async createSession(data) {
      const record: ExamSessionRecord = {
        id: randomUUID(),
        ...data,
        notes: data.notes ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      sessions.push(record);
      return record;
    },
    async findDutyById(id) {
      return duties.find((d) => d.id === id) ?? null;
    },
    async listDuties(filters) {
      return duties.filter((d) => {
        if (filters.sessionId && d.sessionId !== filters.sessionId) return false;
        if (filters.facultyId && d.facultyId !== filters.facultyId) return false;
        if (filters.status && d.status !== filters.status) return false;
        if (filters.departmentId && d.faculty?.departmentId !== filters.departmentId) return false;
        return true;
      });
    },
    async findDutyClash(facultyId, date, sessionTime, excludeId) {
      const dStr = date.toISOString().slice(0, 10);
      return (
        duties.find(
          (d) =>
            d.id !== excludeId &&
            d.facultyId === facultyId &&
            d.date.toISOString().slice(0, 10) === dStr &&
            d.sessionTime === sessionTime,
        ) ?? null
      );
    },
    async findRoomClash(roomId, date, sessionTime, excludeId) {
      const dStr = date.toISOString().slice(0, 10);
      return (
        duties.find(
          (d) =>
            d.id !== excludeId &&
            d.roomId === roomId &&
            d.date.toISOString().slice(0, 10) === dStr &&
            d.sessionTime === sessionTime,
        ) ?? null
      );
    },
    async createDuty(data) {
      const faculty = facultyList.find((f) => f.id === data.facultyId);
      const record: ExamDutyRecord = {
        id: randomUUID(),
        sessionId: data.sessionId,
        date: data.date,
        sessionTime: data.sessionTime,
        reportingTime: data.reportingTime,
        roomId: data.roomId ?? null,
        room: data.roomId ? { id: data.roomId, name: `Hall ${data.roomId}` } : null,
        facultyId: data.facultyId,
        faculty: faculty
          ? {
              ...faculty,
              phone: '9876543210',
              email: `${faculty.employeeCode.toLowerCase()}@jcethbl.edu.in`,
            }
          : undefined,
        role: data.role,
        status: 'ASSIGNED',
        swapWithFacultyId: null,
        swapWithFaculty: null,
        swapReason: null,
        swapStatus: null,
        remarks: data.remarks ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      duties.push(record);
      return record;
    },
    async updateDuty(id, data) {
      const duty = duties.find((d) => d.id === id);
      if (!duty) throw new Error('Not found');
      Object.assign(duty, data, { updatedAt: new Date() });
      return duty;
    },
    async executeSwap(dutyId, targetFacultyId, decisionRemarks) {
      const duty = duties.find((d) => d.id === dutyId);
      if (!duty) throw new Error('Not found');
      const targetFaculty = facultyList.find((f) => f.id === targetFacultyId);
      duty.facultyId = targetFacultyId;
      duty.faculty = targetFaculty
        ? {
            ...targetFaculty,
            phone: '9876543210',
            email: `${targetFaculty.employeeCode.toLowerCase()}@jcethbl.edu.in`,
          }
        : undefined;
      duty.status = 'SWAPPED';
      duty.swapStatus = 'APPROVED';
      duty.remarks = decisionRemarks ?? 'Swap approved';
      return duty;
    },
    async countDutiesByFacultyInSession(sessionId) {
      const map = new Map<string, number>();
      for (const d of duties) {
        if (d.sessionId === sessionId) {
          map.set(d.facultyId, (map.get(d.facultyId) ?? 0) + 1);
        }
      }
      return map;
    },
    async findEligibleFaculty() {
      return [...facultyList];
    },
    async findFacultyOnLeave() {
      return new Set(facultyOnLeave);
    },
  };

  return { repo, sessions, duties, facultyOnLeave };
}

const adminAccess: Access = {
  scope: 'all',
  userId: randomUUID(),
  employeeId: null,
  departmentId: null,
};

const facultyAccess: Access = {
  scope: 'own',
  userId: randomUUID(),
  employeeId: FAC_1,
  departmentId: 1,
};

test('createSession allows Admin and stores exam session', async () => {
  const { repo } = createMemoryExamDutyRepository();
  const service = createExamDutyService(repo);

  const session = await service.createSession(adminAccess, {
    name: 'VTU Dec 2026 Examinations',
    academicYear: '2026-27',
    examType: 'VTU_SEMESTER',
    startDate: '2026-12-01',
    endDate: '2026-12-20',
  });

  assert.equal(session.name, 'VTU Dec 2026 Examinations');
  assert.equal(session.academicYear, '2026-27');
  const sessions = await service.listSessions(adminAccess);
  assert.equal(sessions.length, 1);
});

test('createDuty enforces leave checks and clash detection', async () => {
  const { repo, facultyOnLeave } = createMemoryExamDutyRepository();
  const service = createExamDutyService(repo);

  const session = await service.createSession(adminAccess, {
    name: 'IA-1 ODD Sem',
    academicYear: '2026-27',
    startDate: '2026-11-10',
    endDate: '2026-11-15',
  });

  // Assign duty to FAC_1
  const duty = await service.createDuty(adminAccess, {
    sessionId: session.id,
    date: '2026-11-10',
    sessionTime: 'MORNING',
    roomId: 101,
    facultyId: FAC_1,
  });
  assert.equal(duty.facultyId, FAC_1);

  // Attempt to assign same faculty to same session time -> should throw FACULTY_CLASH
  await assert.rejects(
    () =>
      service.createDuty(adminAccess, {
        sessionId: session.id,
        date: '2026-11-10',
        sessionTime: 'MORNING',
        roomId: 102,
        facultyId: FAC_1,
      }),
    { code: 'FACULTY_CLASH' },
  );

  // Attempt to book same room at same time -> should throw ROOM_CLASH
  await assert.rejects(
    () =>
      service.createDuty(adminAccess, {
        sessionId: session.id,
        date: '2026-11-10',
        sessionTime: 'MORNING',
        roomId: 101,
        facultyId: FAC_2,
      }),
    { code: 'ROOM_CLASH' },
  );

  // Faculty on leave -> should throw LEAVE_CLASH
  facultyOnLeave.add(FAC_3);
  await assert.rejects(
    () =>
      service.createDuty(adminAccess, {
        sessionId: session.id,
        date: '2026-11-10',
        sessionTime: 'MORNING',
        roomId: 103,
        facultyId: FAC_3,
      }),
    { code: 'LEAVE_CLASH' },
  );
});

test('autoAllot equitably allocates duties to available faculty and skips faculty on leave', async () => {
  const { repo, facultyOnLeave } = createMemoryExamDutyRepository();
  const service = createExamDutyService(repo);

  const session = await service.createSession(adminAccess, {
    name: 'VTU Theory Exam',
    academicYear: '2026-27',
    startDate: '2026-12-05',
    endDate: '2026-12-15',
  });

  // Pre-assign FAC_1 so FAC_1 has 1 duty already
  await service.createDuty(adminAccess, {
    sessionId: session.id,
    date: '2026-12-05',
    sessionTime: 'MORNING',
    roomId: 201,
    facultyId: FAC_1,
  });

  // Set FAC_3 on leave for 2026-12-06
  facultyOnLeave.add(FAC_3);

  // Auto allot for 2026-12-06 MORNING for 1 room (202)
  // Eligible candidates: FAC_1 (count 1), FAC_2 (count 0), FAC_3 (on leave).
  // Fairness algorithm MUST pick FAC_2 first because FAC_2 has 0 duties!
  const result = await service.autoAllot(adminAccess, {
    sessionId: session.id,
    date: '2026-12-06',
    sessionTime: 'MORNING',
    roomIds: [202],
  });

  assert.equal(result.allottedCount, 1);
  assert.equal(result.duties[0]?.facultyId, FAC_2);
  assert.equal(result.duties[0]?.roomId, 202);
});

test('swap workflow allows faculty to request swap and admin to approve', async () => {
  const { repo } = createMemoryExamDutyRepository();
  const service = createExamDutyService(repo);

  const session = await service.createSession(adminAccess, {
    name: 'VTU Exam',
    academicYear: '2026-27',
    startDate: '2026-12-01',
    endDate: '2026-12-10',
  });

  const duty = await service.createDuty(adminAccess, {
    sessionId: session.id,
    date: '2026-12-01',
    sessionTime: 'MORNING',
    roomId: 301,
    facultyId: FAC_1,
  });

  // FAC_1 requests swap with FAC_2
  const swapRequested = await service.requestSwap(facultyAccess, duty.id, {
    swapWithFacultyId: FAC_2,
    reason: 'Family medical emergency',
  });

  assert.equal(swapRequested.status, 'SWAP_REQUESTED');
  assert.equal(swapRequested.swapWithFacultyId, FAC_2);

  // Admin approves swap
  const decided = await service.decideSwap(adminAccess, duty.id, {
    decision: 'APPROVED',
    remarks: 'Approved by Chief Superintendent',
  });

  assert.equal(decided.status, 'SWAPPED');
  assert.equal(decided.facultyId, FAC_2);

  // CSV export verifies roster
  const csv = await service.exportCsv(adminAccess, { sessionId: session.id });
  assert.ok(csv.includes('Date,Session Time,Reporting Time,Hall / Room'));
  assert.ok(csv.includes('JCET-CSE-002'));
});
