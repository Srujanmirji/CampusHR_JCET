import assert from 'node:assert/strict';
import test from 'node:test';
import { createCircularService } from '../src/modules/circulars/circulars.service.js';
import type {
  CircularRecord,
  CircularRepository,
  ReadReceiptRecord,
} from '../src/modules/circulars/circulars.repository.js';
import type { Access } from '../src/modules/auth/auth.service.js';

function createMemoryCircularRepository(): {
  repo: CircularRepository;
  circulars: CircularRecord[];
  receipts: ReadReceiptRecord[];
} {
  const circulars: CircularRecord[] = [];
  const receipts: ReadReceiptRecord[] = [];

  const repo: CircularRepository = {
    async findCircularById(id, currentUserId) {
      const c = circulars.find((item) => item.id === id);
      if (!c) return null;
      const receipt = receipts.find(
        (r) => r.circularId === id && r.userId === currentUserId,
      );
      return {
        ...c,
        hasRead: !!receipt,
        readAt: receipt ? receipt.readAt : null,
      };
    },

    async listCirculars(filters, currentUserId) {
      let filtered = [...circulars];
      if (filters.category) {
        filtered = filtered.filter((c) => c.category === filters.category);
      }
      if (filters.userScope && !filters.userScope.isAdmin) {
        filtered = filtered.filter((c) => {
          if (c.targetAudience === 'ALL') return true;
          if (
            c.targetAudience === 'DEPARTMENT' &&
            c.targetDepartmentId === filters.userScope?.departmentId
          ) {
            return true;
          }
          return false;
        });
      }
      return {
        items: filtered.map((c) => {
          const receipt = receipts.find(
            (r) => r.circularId === c.id && r.userId === currentUserId,
          );
          return {
            ...c,
            hasRead: !!receipt,
            readAt: receipt ? receipt.readAt : null,
          };
        }),
        total: filtered.length,
      };
    },

    async createCircular(data) {
      const record: CircularRecord = {
        id: `circ-${circulars.length + 1}`,
        circularNumber: data.circularNumber,
        title: data.title,
        content: data.content,
        category: data.category,
        priority: data.priority,
        targetAudience: data.targetAudience,
        targetDepartmentId: data.targetDepartmentId ?? null,
        attachmentUrl: data.attachmentUrl ?? null,
        attachmentName: data.attachmentName ?? null,
        isPublished: data.isPublished,
        publishedAt: new Date(),
        expiresAt: data.expiresAt ?? null,
        createdById: data.createdById,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      circulars.push(record);
      return record;
    },

    async updateCircular(id, data) {
      const c = circulars.find((item) => item.id === id);
      if (!c) throw new Error('Not found');
      Object.assign(c, data, { updatedAt: new Date() });
      return c;
    },

    async recordReadReceipt(circularId, userId, meta) {
      const existing = receipts.find(
        (r) => r.circularId === circularId && r.userId === userId,
      );
      if (!existing) {
        receipts.push({
          id: `rcpt-${receipts.length + 1}`,
          circularId,
          userId,
          readAt: new Date(),
          ipAddress: meta?.ipAddress ?? '127.0.0.1',
          userAgent: meta?.userAgent ?? 'TestBrowser',
          user: {
            id: userId,
            email: `${userId}@jcethbl.edu.in`,
            employee: {
              id: `emp-${userId}`,
              employeeCode: `JCET-STAFF-${userId}`,
              firstName: 'Faculty',
              lastName: 'Member',
              department: { id: 1, code: 'CSE', name: 'Computer Science' },
              designation: { id: 1, name: 'Assistant Professor' },
            },
          },
        });
      }
    },

    async getReadReceipts(circularId) {
      return receipts.filter((r) => r.circularId === circularId);
    },

    async countEligibleAudience() {
      return 20; // 20 faculty in college
    },

    async getNextCircularNumber() {
      const year = new Date().getFullYear();
      const count = circulars.length + 1;
      return `JCET/CIR/${year}/${String(count).padStart(3, '0')}`;
    },
  };

  return { repo, circulars, receipts };
}

const adminAccess: Access = {
  scope: 'all',
  userId: 'user-admin',
  employeeId: null,
  departmentId: null,
};

const facultyAccess: Access = {
  scope: 'own',
  userId: 'user-fac1',
  employeeId: 'emp-1',
  departmentId: 1,
};

const otherDeptAccess: Access = {
  scope: 'own',
  userId: 'user-fac2',
  employeeId: 'emp-2',
  departmentId: 2,
};

test('createCircular auto-generates sequential number and publishes', async () => {
  const { repo } = createMemoryCircularRepository();
  const service = createCircularService(repo);

  const circular = await service.createCircular(adminAccess, {
    title: 'VTU Exam Schedule Announcement',
    content: 'All faculty must review their invigilation duties.',
    category: 'EXAMINATION',
    priority: 'HIGH',
    targetAudience: 'ALL',
    isPublished: true,
  });

  const year = new Date().getFullYear();
  assert.equal(circular.circularNumber, `JCET/CIR/${year}/001`);
  assert.equal(circular.title, 'VTU Exam Schedule Announcement');
  assert.equal(circular.category, 'EXAMINATION');
});

test('audience scoping filters circulars by department', async () => {
  const { repo } = createMemoryCircularRepository();
  const service = createCircularService(repo);

  // Circular 1: for ALL
  await service.createCircular(adminAccess, {
    title: 'College Annual Day Notice',
    content: 'College will celebrate Annual Day on 15th Dec.',
    category: 'EVENT',
    targetAudience: 'ALL',
    isPublished: true,
  });

  // Circular 2: for CSE department only (deptId 1)
  await service.createCircular(adminAccess, {
    title: 'CSE Department NBA Meeting',
    content: 'Meeting in CSE seminar hall at 3 PM.',
    category: 'ACADEMIC',
    targetAudience: 'DEPARTMENT',
    targetDepartmentId: 1,
    isPublished: true,
  });

  // CSE faculty can see both
  const cseView = await service.listCirculars(facultyAccess, { page: 1, pageSize: 10 });
  assert.equal(cseView.total, 2);

  // ECE faculty (deptId 2) only sees the college-wide circular
  const eceView = await service.listCirculars(otherDeptAccess, { page: 1, pageSize: 10 });
  assert.equal(eceView.total, 1);
  assert.equal(eceView.items[0]?.title, 'College Annual Day Notice');
});

test('reading a circular marks read receipt and updates compliance statistics', async () => {
  const { repo } = createMemoryCircularRepository();
  const service = createCircularService(repo);

  const circular = await service.createCircular(adminAccess, {
    title: 'Revised Academic Calendar',
    content: 'Please find the revised calendar attached.',
    category: 'ACADEMIC',
    targetAudience: 'ALL',
    isPublished: true,
  });

  // Initially unread by faculty
  const initial = await service.findCircular(facultyAccess, circular.id);
  // findCircular automatically records read receipt for readers!
  assert.equal(initial.hasRead, true);

  // Check compliance report
  const compliance = await service.getCompliance(adminAccess, circular.id);
  assert.equal(compliance.eligibleCount, 20);
  assert.equal(compliance.readCount, 1);
  assert.equal(compliance.compliancePercentage, 5); // 1 / 20 = 5%

  // Check CSV export
  const csv = await service.exportReceiptsCsv(adminAccess, circular.id);
  assert.ok(csv.includes('Circular Number,Title,Category'));
  assert.ok(csv.includes(circular.circularNumber));
  assert.ok(csv.includes('JCET-STAFF-user-fac1'));
});
