import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeAppConfig } from '../app.config.ts';

const base = {
  name: 'CampusHR',
  slug: 'campushr-jcet',
  ios: { supportsTablet: true },
  plugins: ['expo-router', 'expo-notifications'],
};
const staging = {
  APP_VARIANT: 'staging',
  APP_IOS_BUNDLE_IDENTIFIER: 'in.example.campushr.staging',
  EXPO_ACCOUNT_OWNER: 'college-test',
  EXPO_PUBLIC_EXPO_PROJECT_ID: '11111111-1111-4111-8111-111111111111',
  EXPO_PUBLIC_API_URL: 'https://staging.example.edu/api/v1',
};

test('local Expo Go configuration stays unchanged', () => {
  assert.deepEqual(makeAppConfig(base, {}), base);
});

test('staging has its own identity, fixed HTTPS API and project linkage', () => {
  const config = makeAppConfig(base, staging);
  assert.equal(config.name, 'CampusHR Staging');
  assert.equal(config.ios.bundleIdentifier, staging.APP_IOS_BUNDLE_IDENTIFIER);
  assert.equal(config.ios.supportsTablet, true);
  assert.equal(config.owner, staging.EXPO_ACCOUNT_OWNER);
  assert.equal(config.extra.eas.projectId, staging.EXPO_PUBLIC_EXPO_PROJECT_ID);
  assert.equal(config.extra.appVariant, 'staging');
  assert.equal(config.android.package, 'in.jcet.campushr');
  assert.deepEqual(config.plugins, base.plugins);
  assert.equal(config.updates.enabled, false);
});

test('staging refuses missing account identifiers and unsafe API targets', () => {
  for (const key of Object.keys(staging).filter(
    (key) => key !== 'APP_VARIANT',
  )) {
    assert.throws(() => makeAppConfig(base, { ...staging, [key]: '' }), key);
  }
  for (const api of [
    'http://staging.example.edu/api/v1',
    'https://localhost/api/v1',
    'https://127.0.0.1/api/v1',
    'https://10.0.0.1/api/v1',
    'https://api.railway.internal/api/v1',
    'https://user:password@staging.example.edu/api/v1',
    'https://staging.example.edu/wrong',
    'https://staging.example.edu/api/v1?token=value',
  ])
    assert.throws(() =>
      makeAppConfig(base, { ...staging, EXPO_PUBLIC_API_URL: api }),
    );
  assert.throws(() =>
    makeAppConfig(base, { ...staging, APP_VARIANT: 'production' }),
  );
  assert.throws(() =>
    makeAppConfig(base, {
      ...staging,
      EXPO_PUBLIC_EXPO_PROJECT_ID: 'replace-me',
    }),
  );
  assert.throws(() =>
    makeAppConfig(base, { ...staging, APP_IOS_BUNDLE_IDENTIFIER: 'invalid' }),
  );
});

test('an EAS staging profile cannot silently build the local app variant', () => {
  assert.throws(() => makeAppConfig(base, { EAS_BUILD_PROFILE: 'staging' }));
  assert.throws(() =>
    makeAppConfig(base, { EAS_BUILD_PROFILE: 'staging-simulator' }),
  );
});
