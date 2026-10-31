import assert from 'node:assert/strict';
import process from 'node:process';
import console from 'node:console';
import { URL } from 'node:url';

const origin = new URL(process.argv[2] || '');
assert.equal(
  origin.protocol,
  'https:',
  'Pass the deployed staging HTTPS origin',
);
assert.equal(
  origin.origin,
  process.argv[2],
  'Use only an origin without credentials, path or trailing slash',
);
for (const [path, status, expected] of [
  ['/api/v1/health', 200, 'ok'],
  ['/api/v1/ready', 200, 'ready'],
  ['/api/v1/employees', 401],
  ['/api/v1/documents', 401],
  ['/uploads/documents/unavailable.pdf', 404],
]) {
  const response = await globalThis.fetch(new URL(path, origin), {
    redirect: 'error',
    signal: globalThis.AbortSignal.timeout(10000),
  });
  assert.equal(response.status, status, `${path} status`);
  const body = await response.json();
  if (expected) assert.equal(body.status, expected, path);
  assert.equal(response.headers.get('x-powered-by'), null);
}
const page = await globalThis.fetch(new URL('/login', origin), {
  redirect: 'error',
  signal: globalThis.AbortSignal.timeout(10000),
});
assert.equal(page.status, 200);
assert.match(page.headers.get('content-type') || '', /text\/html/);
console.log(
  'Staging HTTPS, database readiness, web login and unauthenticated access checks: PASS.',
);
