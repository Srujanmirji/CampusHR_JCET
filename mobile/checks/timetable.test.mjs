import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

mock.module('../lib/api-config.ts', {
  exports: { API_BASE_URL: 'https://api.test/api/v1' },
});
mock.module('../lib/session.ts', {
  exports: {
    apiFetch: async (path) => {
      const response = await globalThis.fetch(
        `https://api.test/api/v1${path}`,
        {
          headers: { Authorization: 'Bearer real-token' },
        },
      );
      if (!response.ok) throw new Error('Unable to load schedule.');
      return response;
    },
  },
});
const { getPeriods, getTimetableEntries } =
  await import('../lib/timetable-api.ts');

test('demo schedules never call the server; signed-out callers get no schedule', async () => {
  const fetch = mock.method(globalThis, 'fetch', () => {
    throw new Error('Unexpected request');
  });
  try {
    assert.ok(
      (await getTimetableEntries('demo-token', { day: 'MON' })).every(
        (e) => e.day === 'MON',
      ),
    );
    assert.ok((await getPeriods('demo-token')).length > 0);
    await assert.rejects(getTimetableEntries(null), /Sign in/);
    await assert.rejects(getPeriods(null), /Sign in/);
    assert.equal(fetch.mock.callCount(), 0);
  } finally {
    fetch.mock.restore();
  }
});

test('real failures and malformed responses never become sample schedules', async () => {
  const fetch = mock.method(globalThis, 'fetch');
  try {
    for (const load of [getPeriods, getTimetableEntries]) {
      for (const status of [401, 403, 500]) {
        fetch.mock.mockImplementation(
          async () => new globalThis.Response('{}', { status }),
        );
        await assert.rejects(load('real-token'), /Unable to load/);
      }
      fetch.mock.mockImplementation(async () => {
        throw new TypeError('Network failed');
      });
      await assert.rejects(load('real-token'), /Network failed/);
      fetch.mock.mockImplementation(async () =>
        globalThis.Response.json({ data: [{}] }),
      );
      await assert.rejects(load('real-token'));
      fetch.mock.mockImplementation(async () =>
        globalThis.Response.json({ data: [] }),
      );
      assert.deepEqual(await load('real-token'), []);
    }
  } finally {
    fetch.mock.restore();
  }
});

test('real schedules send faculty scope and filter day without inventing classes', async () => {
  const sample = await getTimetableEntries('demo-token');
  const fetch = mock.method(globalThis, 'fetch', async (url, init) => {
    assert.equal(
      new globalThis.URL(url).searchParams.get('facultyId'),
      'faculty-id',
    );
    assert.equal(init.headers.Authorization, 'Bearer real-token');
    return globalThis.Response.json({ data: sample });
  });
  try {
    const entries = await getTimetableEntries('real-token', {
      facultyId: 'faculty-id',
      day: 'MON',
    });
    assert.ok(entries.length > 0);
    assert.ok(entries.every((e) => e.day === 'MON'));
    assert.deepEqual(
      entries.map((e) => e.startPeriod),
      entries.map((e) => e.startPeriod).sort((a, b) => a - b),
    );
  } finally {
    fetch.mock.restore();
  }
});
