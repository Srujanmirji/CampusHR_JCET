import {
  passwordRequirements,
  passwordIsValid,
} from '@campushr/password-policy';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  newPasswordSchema,
  loginSchema,
  nativeChangePasswordSchema,
} from '../src/modules/auth/auth.schema.js';
import {
  loginCreateSchema,
  loginUpdateSchema,
} from '../src/modules/users/users.schema.js';

test('new passwords require length, lowercase, uppercase, digit and symbol', () => {
  for (const password of [
    'shortA1!',
    'alllowercase123!',
    'ALLUPPERCASE123!',
    'NoDigitsHere!!',
    'NoSymbolsHere123',
    'NoSymbolsHere1 ',
  ]) {
    assert.equal(
      newPasswordSchema.safeParse(password).success,
      false,
      'must reject a missing requirement',
    );
  }
  assert.equal(newPasswordSchema.safeParse('FacultyReady42!').success, true);
  assert.equal(
    newPasswordSchema.safeParse('Aa1!' + 'x'.repeat(68)).success,
    true,
  );
  assert.equal(
    newPasswordSchema.safeParse('Aa1!' + 'x'.repeat(69)).success,
    false,
  );
  assert.equal(
    newPasswordSchema.safeParse('Aa1!' + 'é'.repeat(34)).success,
    true,
  );
  assert.equal(
    newPasswordSchema.safeParse('Aa1!' + 'é'.repeat(35)).success,
    false,
  );
});
test('existing passwords remain accepted at sign-in; provisioning and changes enforce the new policy', () => {
  assert.equal(
    loginSchema.safeParse({
      identifier: 'legacy@jcet.test',
      password: 'legacy password',
    }).success,
    true,
  );
  const weak = 'weak-password-only';
  const user = {
    employeeId: '11111111-1111-4111-8111-111111111111',
    roleId: 1,
    password: weak,
  };
  assert.equal(loginCreateSchema.safeParse(user).success, false);
  assert.equal(loginUpdateSchema.safeParse({ password: weak }).success, false);
  assert.equal(
    nativeChangePasswordSchema.safeParse({
      currentPassword: 'legacy password',
      newPassword: weak,
      refreshToken: 'a'.repeat(43),
    }).success,
    false,
  );
});

test('shared client rules match server validation including UTF-8 and Unicode symbols', () => {
  for (const password of [
    '',
    'FacultyReady42!',
    'WeakOnlyLowercase',
    'NoSymbolsHere1 ',
    'Abcdefg1234é',
    'Aa1!' + 'é'.repeat(35),
    'Aa1!' + '\ud800'.repeat(30),
  ]) {
    assert.equal(
      passwordIsValid(password),
      newPasswordSchema.safeParse(password).success,
    );
    assert.equal(
      passwordRequirements(password).every((rule) => rule.met),
      passwordIsValid(password),
    );
  }
});
