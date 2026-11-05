import assert from 'node:assert/strict';
import test from 'node:test';
import { createMemoryAttendanceRepository } from './attendance-memory.js';
import { createAttendanceService } from '../src/modules/attendance/attendance.service.js';

test('syncBiometricPunches processes check-in, check-out and status correctly', async () => {
  const repo = createMemoryAttendanceRepository();
  const service = createAttendanceService(repo);

  // 1. Sync batch of punches for JCET-CSE-001: 09:05 AM (check-in) and 17:15 PM (check-out)
  const result = await service.syncBiometricPunches({
    deviceId: 'JCET-BIO-01',
    location: 'Main Gate Terminal',
    punches: [
      {
        employeeCode: 'JCET-CSE-001',
        timestamp: '2026-11-04T09:05:00.000Z',
        punchType: 'AUTO',
        verificationType: 'FINGERPRINT',
      },
      {
        employeeCode: 'JCET-CSE-001',
        timestamp: '2026-11-04T17:15:00.000Z',
        punchType: 'AUTO',
        verificationType: 'FINGERPRINT',
      },
    ],
  });

  assert.equal(result.syncedCount, 2);
  assert.equal(result.unmatchedCount, 0);
  assert.equal(result.recordsCreatedOrUpdated, 1);
  assert.equal(result.deviceId, 'JCET-BIO-01');

  // Verify the record in repository
  const date = new Date(Date.UTC(2026, 10, 4));
  const record = await repo.findByEmployeeAndDate('emp-1', date);
  assert.ok(record);
  assert.equal(record.status, 'PRESENT');
  assert.equal(record.source, 'BIOMETRIC');
  assert.ok(record.checkIn);
  assert.ok(record.checkOut);
  assert.equal(record.checkIn.toISOString(), '2026-11-04T09:05:00.000Z');
  assert.equal(record.checkOut.toISOString(), '2026-11-04T17:15:00.000Z');
});

test('syncBiometricPunches marks LATE when punch is after grace period', async () => {
  const repo = createMemoryAttendanceRepository();
  const service = createAttendanceService(repo);

  // Work start 09:00 + 15m grace = 09:15 cutoff. Punch at 09:30 AM should be LATE.
  await service.syncBiometricPunches({
    deviceId: 'JCET-BIO-02',
    punches: [
      {
        employeeCode: 'JCET-CSE-001',
        timestamp: '2026-11-04T09:30:00.000Z',
        punchType: 'AUTO',
      },
      {
        employeeCode: 'JCET-CSE-001',
        timestamp: '2026-11-04T17:00:00.000Z',
        punchType: 'AUTO',
      },
    ],
  });

  const date = new Date(Date.UTC(2026, 10, 4));
  const record = await repo.findByEmployeeAndDate('emp-1', date);
  assert.ok(record);
  assert.equal(record.status, 'LATE');
});

test('syncBiometricPunches marks HALF_DAY when work duration is less than 4 hours', async () => {
  const repo = createMemoryAttendanceRepository();
  const service = createAttendanceService(repo);

  // Check-in at 09:00, check-out at 12:00 (3 hours < 4 hour half-day threshold)
  await service.syncBiometricPunches({
    deviceId: 'JCET-BIO-03',
    punches: [
      {
        employeeCode: 'JCET-CSE-001',
        timestamp: '2026-11-04T09:00:00.000Z',
        punchType: 'AUTO',
      },
      {
        employeeCode: 'JCET-CSE-001',
        timestamp: '2026-11-04T12:00:00.000Z',
        punchType: 'AUTO',
      },
    ],
  });

  const date = new Date(Date.UTC(2026, 10, 4));
  const record = await repo.findByEmployeeAndDate('emp-1', date);
  assert.ok(record);
  assert.equal(record.status, 'HALF_DAY');
});

test('syncBiometricPunches identifies and reports unmatched employee codes', async () => {
  const repo = createMemoryAttendanceRepository();
  const service = createAttendanceService(repo);

  const result = await service.syncBiometricPunches({
    deviceId: 'JCET-BIO-01',
    punches: [
      {
        employeeCode: 'JCET-CSE-001',
        timestamp: '2026-11-04T09:00:00.000Z',
        punchType: 'AUTO',
      },
      {
        employeeCode: 'NON_EXISTENT_CODE_999',
        timestamp: '2026-11-04T09:02:00.000Z',
        punchType: 'AUTO',
      },
    ],
  });

  assert.equal(result.syncedCount, 1);
  assert.equal(result.unmatchedCount, 1);
  assert.deepEqual(result.unmatchedCodes, ['NON_EXISTENT_CODE_999']);
});

test('importBiometricRows ingests batch log rows from external attendance systems', async () => {
  const repo = createMemoryAttendanceRepository();
  const service = createAttendanceService(repo);

  const result = await service.importBiometricRows({
    deviceId: 'eTimeTrackLite_Export',
    rows: [
      {
        employeeCode: 'JCET-CSE-001',
        date: '2026-11-03',
        checkIn: '2026-11-03T08:55:00.000Z',
        checkOut: '2026-11-03T17:05:00.000Z',
        status: 'PRESENT',
        notes: 'Monthly batch log import',
      },
      {
        employeeCode: 'GHOST_STAFF',
        date: '2026-11-03',
      },
    ],
  });

  assert.equal(result.importedCount, 1);
  assert.equal(result.unmatchedCount, 1);
  assert.deepEqual(result.unmatchedCodes, ['GHOST_STAFF']);
  assert.equal(result.recordsCreatedOrUpdated, 1);

  const date = new Date(Date.UTC(2026, 10, 3));
  const record = await repo.findByEmployeeAndDate('emp-1', date);
  assert.ok(record);
  assert.equal(record.status, 'PRESENT');
  assert.equal(record.source, 'BIOMETRIC');
  assert.equal(record.notes, 'Monthly batch log import');
});

test('getBiometricDevices and getBiometricStats return terminal info', async () => {
  const repo = createMemoryAttendanceRepository();
  const service = createAttendanceService(repo);

  const devices = await service.getBiometricDevices();
  assert.ok(devices.length >= 5);
  assert.equal(devices[0].id, 'JCET-BIO-01');
  assert.equal(devices[0].status, 'ONLINE');

  const stats = await service.getBiometricStats();
  assert.ok(typeof stats.todayBiometricCount === 'number');
  assert.ok(typeof stats.activeDevicesCount === 'number');
  assert.ok(Array.isArray(stats.recentPunches));
});
