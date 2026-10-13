import assert from 'node:assert/strict';
import test from 'node:test';
import {
  employeeCreateSchema,
  ownUpdateSchema,
} from '../src/modules/employees/employee.schema.js';
import {
  employeeScope,
  nextEmployeeCode,
} from '../src/modules/employees/employee.service.js';

const actor = { employeeId: 'e1', departmentId: 3 };

test('scope limits which employees are visible', () => {
  assert.deepEqual(employeeScope({ ...actor, scope: 'all' }), {});
  assert.deepEqual(employeeScope({ ...actor, scope: 'department' }), {
    departmentId: 3,
  });
  assert.deepEqual(employeeScope({ ...actor, scope: 'own' }), { id: 'e1' });
  const unlinked = { employeeId: null, departmentId: null };
  assert.equal(employeeScope({ ...unlinked, scope: 'department' }), null);
  assert.equal(employeeScope({ ...unlinked, scope: 'own' }), null);
  assert.deepEqual(employeeScope({ ...unlinked, scope: 'all' }), {});
});

test('next employee code follows JCET-<DEPT>-<NNN>', () => {
  assert.equal(nextEmployeeCode('CSE', []), 'JCET-CSE-001');
  assert.equal(
    nextEmployeeCode('CSE', ['JCET-CSE-007', 'JCET-CSE-021', 'JCET-CSE-OLD']),
    'JCET-CSE-022',
  );
  assert.equal(nextEmployeeCode('ME', ['JCET-ME-999']), 'JCET-ME-1000');
});

test('input is normalised and own updates are contact-only', () => {
  const parsed = employeeCreateSchema.parse({
    employeeCode: ' jcet-cse-022 ',
    firstName: ' Asha ',
    lastName: 'Patil',
    email: 'Asha.Patil@JCETHBL.edu.in',
    phone: '',
    departmentId: 1,
    designationId: 3,
    employmentType: 'PERMANENT',
    joiningDate: '2019-08-01',
    qualification: '  ',
  });
  assert.equal(parsed.employeeCode, 'JCET-CSE-022');
  assert.equal(parsed.firstName, 'Asha');
  assert.equal(parsed.email, 'asha.patil@jcethbl.edu.in');
  assert.equal(parsed.phone, null);
  assert.equal(parsed.qualification, null);
  assert.equal(
    employeeCreateSchema.safeParse({ ...parsed, joiningDate: '01-08-2019' })
      .success,
    false,
  );
  assert.equal(
    ownUpdateSchema.safeParse({ phone: '+91 98450 11221' }).success,
    true,
  );
  assert.equal(ownUpdateSchema.safeParse({ firstName: 'X' }).success, false);
});
