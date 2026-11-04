import assert from 'node:assert/strict';
import test from 'node:test';
import {
  checkDocumentExpirations,
  startDocumentExpiryWorker,
} from '../src/modules/documents/documents.expiry.js';
import type { PrismaClient } from '../src/generated/prisma/client.js';
import type { Notifier } from '../src/modules/notifications/notifications.service.js';
import type { NewNotification } from '../src/modules/notifications/notifications.repository.js';

test('checkDocumentExpirations identifies expiring documents and notifies employee and HR', async () => {
  const employeeNotifications: Array<{
    employeeId: string;
    note: NewNotification;
  }> = [];
  const roleNotifications: Array<{ role: string; note: NewNotification }> = [];

  const mockNotifier: Notifier = {
    async notifyEmployee(employeeId, note) {
      employeeNotifications.push({ employeeId, note });
    },
    async notifyRole(role, _dept, note) {
      roleNotifications.push({ role, note });
    },
  };

  const fakeNow = new Date('2026-11-04T12:00:00Z');
  const expiryDate = new Date('2026-11-20T12:00:00Z'); // 16 days ahead

  const mockPrisma = {
    document: {
      async findMany() {
        return [
          {
            id: 'doc-1',
            employeeId: 'emp-101',
            title: 'Teaching Certificate',
            documentType: 'Certificate',
            expiryDate,
            employee: {
              id: 'emp-101',
              firstName: 'Rahul',
              lastName: 'Sharma',
              employeeCode: 'JCET-CSE-001',
              department: { id: 1, name: 'Computer Science', code: 'CSE' },
            },
          },
        ];
      },
    },
    notification: {
      async findFirst() {
        return null; // Not already notified
      },
    },
  } as unknown as PrismaClient;

  const result = await checkDocumentExpirations(
    mockPrisma,
    mockNotifier,
    fakeNow,
  );

  assert.equal(result.checkedCount, 1);
  assert.equal(result.notifiedCount, 1);

  assert.equal(employeeNotifications.length, 1);
  assert.equal(employeeNotifications[0].employeeId, 'emp-101');
  assert.ok(employeeNotifications[0].note.body.includes('expires in 16 days'));
  assert.ok(
    employeeNotifications[0].note.body.includes('Teaching Certificate'),
  );

  assert.equal(roleNotifications.length, 1);
  assert.equal(roleNotifications[0].role, 'HR Admin');
  assert.ok(roleNotifications[0].note.body.includes('Rahul Sharma'));
});

test('checkDocumentExpirations skips already-notified documents within 7 days', async () => {
  const employeeNotifications: Array<{
    employeeId: string;
    note: NewNotification;
  }> = [];
  const mockNotifier: Notifier = {
    async notifyEmployee(employeeId, note) {
      employeeNotifications.push({ employeeId, note });
    },
    async notifyRole() {},
  };

  const fakeNow = new Date('2026-11-04T12:00:00Z');

  const mockPrisma = {
    document: {
      async findMany() {
        return [
          {
            id: 'doc-2',
            employeeId: 'emp-102',
            title: 'Driving License',
            documentType: 'Identity',
            expiryDate: new Date('2026-11-10T12:00:00Z'),
            employee: {
              id: 'emp-102',
              firstName: 'Priya',
              lastName: 'Patil',
              employeeCode: 'JCET-ECE-002',
              department: { id: 2, name: 'Electronics', code: 'ECE' },
            },
          },
        ];
      },
    },
    notification: {
      async findFirst() {
        // Already notified in past 7 days!
        return { id: 'notif-existing' };
      },
    },
  } as unknown as PrismaClient;

  const result = await checkDocumentExpirations(
    mockPrisma,
    mockNotifier,
    fakeNow,
  );

  assert.equal(result.checkedCount, 1);
  assert.equal(result.notifiedCount, 0);
  assert.equal(employeeNotifications.length, 0);
});

test('startDocumentExpiryWorker starts and shuts down cleanly', async () => {
  const mockPrisma = {
    document: {
      async findMany() {
        return [];
      },
    },
    notification: {
      async findFirst() {
        return null;
      },
    },
  } as unknown as PrismaClient;

  const stop = startDocumentExpiryWorker(mockPrisma, undefined, 100000);
  assert.equal(typeof stop, 'function');
  await stop();
});
