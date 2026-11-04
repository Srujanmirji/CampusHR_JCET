import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { createWorkAssignmentService } from '../src/modules/work-assignments/work-assignments.service.js';
import type {
  WorkAssignmentRecord,
  WorkAssignmentRepository,
} from '../src/modules/work-assignments/work-assignments.repository.js';
import type { Access } from '../src/modules/auth/auth.service.js';
import type { Notifier } from '../src/modules/notifications/notifications.service.js';

const EMP_CSE_1 = randomUUID();
const EMP_CSE_2 = randomUUID();
const EMP_ECE_1 = randomUUID();

function createMemoryWorkAssignmentRepository(): {
  repo: WorkAssignmentRepository;
  assignments: WorkAssignmentRecord[];
  notificationsSent: Array<{ employeeId: string; note: any }>;
  notifier: Notifier;
} {
  const assignments: WorkAssignmentRecord[] = [];
  const notificationsSent: Array<{ employeeId: string; note: any }> = [];

  const employees = [
    {
      id: EMP_CSE_1,
      employeeCode: 'JCET-CSE-001',
      firstName: 'Rohan',
      lastName: 'Sharma',
      departmentId: 1,
      status: 'ACTIVE',
    },
    {
      id: EMP_CSE_2,
      employeeCode: 'JCET-CSE-002',
      firstName: 'Pooja',
      lastName: 'Hegde',
      departmentId: 1,
      status: 'ACTIVE',
    },
    {
      id: EMP_ECE_1,
      employeeCode: 'JCET-ECE-001',
      firstName: 'Vikram',
      lastName: 'Kulkarni',
      departmentId: 2,
      status: 'ACTIVE',
    },
  ];

  const repo: WorkAssignmentRepository = {
    async findAssignmentById(id) {
      return assignments.find((a) => a.id === id) ?? null;
    },
    async listAssignments(filters) {
      let filtered = [...assignments];
      if (filters.assignedToId) {
        filtered = filtered.filter((a) => a.assignedToId === filters.assignedToId);
      }
      if (filters.assignedById) {
        filtered = filtered.filter((a) => a.assignedById === filters.assignedById);
      }
      if (filters.status) {
        filtered = filtered.filter((a) => a.status === filters.status);
      }
      return { items: filtered, total: filtered.length };
    },
    async createAssignment(data) {
      const emp = employees.find((e) => e.id === data.assignedToId);
      const record: WorkAssignmentRecord = {
        id: randomUUID(),
        title: data.title,
        description: data.description,
        category: data.category,
        priority: data.priority,
        status: 'ASSIGNED',
        assignedById: data.assignedById,
        assignedBy: {
          id: data.assignedById,
          email: 'principal@jcethbl.edu.in',
          role: { id: 3, name: 'Principal' },
          employee: {
            id: 'emp-principal',
            firstName: 'Suresh',
            lastName: 'Patil',
          },
        },
        assignedToId: data.assignedToId,
        assignedTo: {
          id: data.assignedToId,
          employeeCode: emp?.employeeCode ?? '',
          firstName: emp?.firstName ?? '',
          lastName: emp?.lastName ?? '',
          departmentId: emp?.departmentId ?? 1,
          phone: '9876543210',
          email: 'faculty@jcethbl.edu.in',
        },
        dueDate: data.dueDate,
        attachmentUrl: data.attachmentUrl ?? null,
        attachmentName: data.attachmentName ?? null,
        submissionNotes: null,
        submissionAttachmentUrl: null,
        submittedAt: null,
        reviewedAt: null,
        reviewFeedback: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      assignments.push(record);
      return record;
    },
    async updateAssignment(id, data) {
      const a = assignments.find((item) => item.id === id);
      if (!a) throw new Error('Not found');
      Object.assign(a, data, { updatedAt: new Date() });
      return a;
    },
    async findEmployeeById(id) {
      return employees.find((e) => e.id === id) ?? null;
    },
    async countMetrics(options) {
      let filtered = [...assignments];
      if (options?.assignedToId) {
        filtered = filtered.filter((a) => a.assignedToId === options.assignedToId);
      }
      return {
        assigned: filtered.filter((a) => a.status === 'ASSIGNED').length,
        inProgress: filtered.filter((a) => a.status === 'IN_PROGRESS').length,
        submitted: filtered.filter((a) => a.status === 'SUBMITTED').length,
        completed: filtered.filter((a) => a.status === 'COMPLETED').length,
      };
    },
  };

  const notifier: Notifier = {
    async notifyEmployee(employeeId, note) {
      notificationsSent.push({ employeeId, note });
    },
    async notifyRole() {},
  };

  return { repo, assignments, notificationsSent, notifier };
}

const principalAccess: Access = {
  scope: 'all',
  userId: randomUUID(),
  employeeId: 'emp-principal',
  departmentId: null,
};

const hodCseAccess: Access = {
  scope: 'department',
  userId: randomUUID(),
  employeeId: 'emp-hod-cse',
  departmentId: 1,
};

const facultyCseAccess: Access = {
  scope: 'own',
  userId: randomUUID(),
  employeeId: EMP_CSE_1,
  departmentId: 1,
};

test('Principal can assign work to any faculty and sends real-time notification', async () => {
  const { repo, notifier, notificationsSent } =
    createMemoryWorkAssignmentRepository();
  const service = createWorkAssignmentService(repo, notifier);

  const [assignment] = await service.createAssignments(principalAccess, {
    title: 'Prepare NBA Criterion 3 Document',
    description: 'Compile student performance metrics for 2024-2026 batches.',
    category: 'NBA_NAAC',
    priority: 'HIGH',
    assignedToIds: [EMP_CSE_1],
    dueDate: '2026-11-15T17:00:00Z',
  });

  assert.ok(assignment);
  assert.equal(assignment.title, 'Prepare NBA Criterion 3 Document');
  assert.equal(assignment.status, 'ASSIGNED');
  assert.equal(assignment.assignedToId, EMP_CSE_1);

  // Check notification dispatched
  assert.equal(notificationsSent.length, 1);
  assert.equal(notificationsSent[0]?.employeeId, EMP_CSE_1);
  assert.ok(notificationsSent[0]?.note.title.includes('NBA Criterion 3'));
});

test('HOD can assign work to own department but is forbidden from other departments', async () => {
  const { repo, notifier } = createMemoryWorkAssignmentRepository();
  const service = createWorkAssignmentService(repo, notifier);

  // HOD CSE assigns to CSE faculty -> Succeeds
  const cseTasks = await service.createAssignments(hodCseAccess, {
    title: 'Finalize 3rd Sem IA Question Papers',
    description: 'Ensure questions follow Bloom taxonomy.',
    assignedToIds: [EMP_CSE_2],
    dueDate: '2026-11-10T12:00:00Z',
  });
  assert.equal(cseTasks.length, 1);

  // HOD CSE attempts to assign to ECE faculty -> Throws 403
  await assert.rejects(
    () =>
      service.createAssignments(hodCseAccess, {
        title: 'Review ECE Lab Manual',
        description: 'Verify experiments.',
        assignedToIds: [EMP_ECE_1],
        dueDate: '2026-11-10T12:00:00Z',
      }),
    { code: 'FORBIDDEN' },
  );

  // Regular faculty cannot delegate official tasks
  await assert.rejects(
    () =>
      service.createAssignments(facultyCseAccess, {
        title: 'Review Question Paper',
        description: 'Peer review.',
        assignedToIds: [EMP_CSE_2],
        dueDate: '2026-11-10T12:00:00Z',
      }),
    { code: 'FORBIDDEN' },
  );
});

test('faculty can progress and submit work, and assigner can review and approve', async () => {
  const { repo, notifier, notificationsSent } =
    createMemoryWorkAssignmentRepository();
  const service = createWorkAssignmentService(repo, notifier);

  const [task] = await service.createAssignments(principalAccess, {
    title: 'VTU LIC Audit Report',
    description: 'Prepare lab infrastructure report.',
    assignedToIds: [EMP_CSE_1],
    dueDate: '2026-11-20T17:00:00Z',
  });

  // Faculty marks In Progress
  const inProgress = await service.updateStatus(facultyCseAccess, task.id, {
    status: 'IN_PROGRESS',
  });
  assert.equal(inProgress.status, 'IN_PROGRESS');

  // Faculty submits work with notes
  const submitted = await service.updateStatus(facultyCseAccess, task.id, {
    status: 'SUBMITTED',
    submissionNotes: 'Uploaded report to shared Google Drive.',
    submissionAttachmentUrl: 'https://drive.google.com/audit-report.pdf',
  });
  assert.equal(submitted.status, 'SUBMITTED');
  assert.equal(
    submitted.submissionNotes,
    'Uploaded report to shared Google Drive.',
  );
  assert.ok(submitted.submittedAt);

  // Assigner approves work
  const completed = await service.reviewAssignment(principalAccess, task.id, {
    decision: 'APPROVE',
    feedback: 'Excellent thorough report. Approved.',
  });
  assert.equal(completed.status, 'COMPLETED');
  assert.ok(completed.completedAt);
  assert.equal(completed.reviewFeedback, 'Excellent thorough report. Approved.');
});
