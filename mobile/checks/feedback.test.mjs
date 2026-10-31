import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import { setImmediate } from 'node:timers/promises';

const Platform = { OS: 'ios' },
  calls = [];
let unavailable = false;
const record = (value) => {
  calls.push(value);
  return unavailable
    ? Promise.reject(new Error('Haptics unavailable'))
    : Promise.resolve();
};
mock.module('react-native', { exports: { Platform } });
mock.module('expo-haptics', {
  exports: {
    selectionAsync: () => record('selection'),
    impactAsync: (value) => record(value),
    notificationAsync: (value) => record(value),
    ImpactFeedbackStyle: { Medium: 'medium' },
    NotificationFeedbackType: { Warning: 'warning' },
  },
});
const { selectionFeedback, committedFeedback } =
  await import('../lib/feedback.ts');
test('native selection and confirmed actions use distinct feedback; web and hardware failures are safe', async () => {
  selectionFeedback();
  committedFeedback();
  committedFeedback(true);
  assert.deepEqual(calls, ['selection', 'medium', 'warning']);
  Platform.OS = 'web';
  selectionFeedback();
  committedFeedback();
  assert.equal(calls.length, 3);
  Platform.OS = 'ios';
  unavailable = true;
  selectionFeedback();
  committedFeedback();
  committedFeedback(true);
  await setImmediate();
  assert.equal(calls.length, 6);
});
