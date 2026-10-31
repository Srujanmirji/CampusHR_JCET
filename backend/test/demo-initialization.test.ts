import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { initializeDemo } from './demo/initialize.js';

test('a restarted local demo loads its saved initialization without reseeding edited records', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'campushr-demo-init-'));
  try {
    const initial = {
      accounts: [{ email: 'faculty-check@jcet.test', employeeId: 'saved-id' }],
    };
    assert.deepEqual(
      await initializeDemo(directory, async () => initial),
      initial,
    );
    const restored = await initializeDemo(directory, async () => {
      throw new Error(
        'Reseeding would recreate renamed employees or deleted classes.',
      );
    });
    assert.deepEqual(restored, initial);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('an invalid saved initialization fails visibly instead of reseeding existing data', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'campushr-demo-invalid-'));
  try {
    await writeFile(join(directory, 'initialized.json'), 'not-json');
    await assert.rejects(
      initializeDemo(directory, async () => ({ reset: true })),
      SyntaxError,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
