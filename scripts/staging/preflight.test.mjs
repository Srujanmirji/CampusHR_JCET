import assert from 'node:assert/strict';
import { test } from 'node:test';
import { stagingProblems } from './preflight.mjs';

const valid = {
  APP_ENV: 'staging',
  RAILWAY_ENVIRONMENT_NAME: 'staging',
  NODE_ENV: 'production',
  VITE_API_URL: '/api/v1',
  JWT_ACCESS_SECRET: 'x'.repeat(32),
  CORS_ORIGIN: 'https://campushr-staging.up.railway.app',
  DATABASE_URL:
    'postgresql://postgres:secret@postgres.railway.internal:5432/railway',
  STAGING_DATABASE_HOST: 'postgres.railway.internal',
  STAGING_DATABASE_PORT: '5432',
  STAGING_DATABASE_NAME: 'railway',
  RAILWAY_VOLUME_MOUNT_PATH: '/data',
  DOCUMENTS_DIR: '/data/documents',
};
test('staging accepts explicit hosted configuration', () => {
  assert.deepEqual(stagingProblems(valid), []);
});
test('staging startup blocks a production target and temporary document paths', () => {
  for (const override of [
    { RAILWAY_ENVIRONMENT_NAME: 'production' },
    { APP_ENV: 'production' },
    { VITE_API_URL: 'http://localhost:4000/api/v1' },
    { DATABASE_URL: 'postgresql://localhost/test' },
    {
      DATABASE_URL: 'postgresql://user:password@production.example.edu/railway',
    },
    {
      DATABASE_URL:
        'postgresql://user:password@postgres.railway.internal/production',
    },
    { STAGING_DATABASE_HOST: '' },
    { STAGING_DATABASE_PORT: '' },
    {
      DATABASE_URL:
        'postgresql://user:password@postgres.railway.internal:5433/railway',
    },
    { DATABASE_URL: valid.DATABASE_URL + '?host=production.example.edu' },
    { DATABASE_URL: valid.DATABASE_URL + '?port=5433' },
    { DATABASE_URL: valid.DATABASE_URL + '?dbname=production' },
    { STAGING_DATABASE_NAME: '' },
    { CORS_ORIGIN: 'http://campushr-staging.up.railway.app' },
    { CORS_ORIGIN: valid.CORS_ORIGIN + '/' },
    { DOCUMENTS_DIR: '/tmp/documents' },
    { DOCUMENTS_DIR: '/data/../tmp' },
    { RAILWAY_VOLUME_MOUNT_PATH: '' },
    { JWT_ACCESS_SECRET: 'short' },
  ])
    assert.ok(
      stagingProblems({ ...valid, ...override }).length,
      JSON.stringify(Object.keys(override)),
    );
});
test('validation errors contain field names without secret values', () => {
  const secret = 'sensitive-value-do-not-print';
  const output = stagingProblems({
    ...valid,
    DATABASE_URL: secret,
    JWT_ACCESS_SECRET: secret,
  }).join('\n');
  assert.ok(output.includes('DATABASE_URL'));
  assert.ok(!output.includes(secret));
});

test('standard schema and TLS parameters do not change the pinned target', () => {
  assert.deepEqual(
    stagingProblems({
      ...valid,
      DATABASE_URL: valid.DATABASE_URL + '?schema=public&sslmode=require',
    }),
    [],
  );
});
