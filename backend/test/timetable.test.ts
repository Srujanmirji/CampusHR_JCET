import assert from 'node:assert/strict';
import test from 'node:test';
import {
  findClashes,
  type Slot,
} from '../src/modules/timetable/timetable.clash.js';

const base: Slot = {
  id: 'existing',
  departmentId: 1,
  semester: 5,
  section: 'A',
  batch: null,
  facultyId: 'asha',
  roomId: 10,
  day: 'MON',
  startPeriod: 2,
  endPeriod: 3,
};
const kinds = (candidate: Partial<Slot>) =>
  findClashes({ ...base, id: undefined, ...candidate }, [base]).map(
    (clash) => clash.kind,
  );
const elsewhere = { facultyId: 'ravi', roomId: 11, section: 'B' };

test('overlapping periods on the same day clash; touching ones do not', () => {
  assert.deepEqual(
    kinds({ ...elsewhere, startPeriod: 3, endPeriod: 4, facultyId: 'asha' }),
    ['faculty'],
  );
  assert.deepEqual(
    kinds({ ...elsewhere, startPeriod: 4, endPeriod: 5, facultyId: 'asha' }),
    [],
  );
  assert.deepEqual(
    kinds({ ...elsewhere, startPeriod: 1, endPeriod: 1, facultyId: 'asha' }),
    [],
  );
  assert.deepEqual(kinds({ ...elsewhere, day: 'TUE', facultyId: 'asha' }), []);
});

test('the same faculty, room or class section cannot be double-booked', () => {
  assert.deepEqual(kinds({ ...elsewhere, facultyId: 'asha' }), ['faculty']);
  assert.deepEqual(kinds({ ...elsewhere, roomId: 10 }), ['room']);
  assert.deepEqual(kinds({ ...elsewhere, section: 'A' }), ['class']);
  assert.deepEqual(kinds(elsewhere), []);
  assert.deepEqual(
    kinds({ ...elsewhere, section: 'A', semester: 3 }),
    [],
    'another semester is another class',
  );
});

test('different lab batches of one section may run together', () => {
  const lab = { ...base, batch: 'A1' };
  const batch = (candidateBatch: string | null) =>
    findClashes(
      {
        ...lab,
        id: undefined,
        facultyId: 'ravi',
        roomId: 11,
        batch: candidateBatch,
      },
      [lab],
    ).map((clash) => clash.kind);
  assert.deepEqual(batch('A2'), []);
  assert.deepEqual(batch('A1'), ['class']);
  assert.deepEqual(
    batch(null),
    ['class'],
    'the whole section clashes with a batch',
  );
});

test('an entry does not clash with itself when edited', () => {
  assert.deepEqual(findClashes(base, [base]), []);
});
