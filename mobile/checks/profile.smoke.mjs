// Uses the disposable loopback API's real auth/employee/document services.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(
  join(
    homedir(),
    '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright',
  ),
);
const browser = await chromium.launch({
  headless: true,
  executablePath:
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const page = await browser.newPage({
  viewport: { width: 375, height: 900 },
  reducedMotion: 'reduce',
});
page.setDefaultTimeout(15000);
const errors = [],
  requests = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('request', (request) => {
  if (
    request.url().includes(':4011/api/v1/documents') ||
    request.url().includes(':4011/api/v1/employees')
  )
    requests.push(request);
});
const output = '/tmp/campushr-ios011';
mkdirSync(output, { recursive: true });
const api = 'http://[::1]:4011',
  mode = (name) =>
    globalThis.fetch(`${api}/test-mode/${name}`, { method: 'POST' });
const login = async (
  email = 'home-check@jcet.test',
  password = 'home-check-only',
) => {
  await page
    .getByLabel('Employee ID or College Email', { exact: true })
    .fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.getByText('Profile', { exact: true }).click();
};
const logout = async () => {
  await page.getByRole('button', { name: 'Sign Out', exact: true }).click();
  await page.getByRole('button', { name: 'Sign In', exact: true }).waitFor();
};
const screen = page.getByTestId('profile-screen');
const choose = async (name = 'new-certificate.png') => {
  const event = page.waitForEvent('filechooser');
  await screen
    .getByRole('button', { name: 'Choose document file', exact: true })
    .click();
  await (
    await event
  ).setFiles({
    name,
    mimeType: 'image/png',
    buffer: globalThis.Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jK1cAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await screen.getByText(new RegExp(name)).waitFor();
};
try {
  await mode('profile-live');
  await page.goto('http://[::1]:8081');
  await login();
  await screen
    .getByText('Computer Science · Associate Professor', { exact: true })
    .waitFor();
  await screen
    .getByText('HR note: Please upload a clearer copy.', { exact: true })
    .waitFor();
  await screen
    .getByLabel('Phone number', { exact: true })
    .fill('+91 98765 43211');
  await screen
    .getByRole('button', { name: 'Save phone number', exact: true })
    .click();
  await screen.getByText('Phone number saved.', { exact: true }).waitFor();
  const patch = requests.find((request) => request.method() === 'PATCH');
  assert.deepEqual(JSON.parse(patch.postData()), { phone: '+91 98765 43211' });
  await screen.getByLabel('Phone number', { exact: true }).fill('bad');
  await screen
    .getByRole('button', { name: 'Save phone number', exact: true })
    .click();
  await screen
    .getByText('Enter a valid phone number.', { exact: true })
    .waitFor();
  await screen
    .getByLabel('Phone number', { exact: true })
    .fill('+91 98765 43211');
  await screen
    .getByRole('button', { name: 'Preview Verified certificate', exact: true })
    .click();
  await page
    .getByRole('img', { name: 'Protected document', exact: true })
    .waitFor();
  const content = requests.find(
    (request) =>
      request.method() === 'GET' && request.url().endsWith('/content'),
  );
  assert.ok(content.headers().authorization?.startsWith('Bearer '));
  const blob = await page
    .getByRole('img', { name: 'Protected document', exact: true })
    .getAttribute('src');
  await page
    .getByRole('button', { name: 'Close document preview', exact: true })
    .click();
  assert.equal(
    await page.evaluate(async (url) => {
      try {
        await globalThis.fetch(url);
        return false;
      } catch {
        return true;
      }
    }, blob),
    true,
  );
  await screen
    .getByLabel('Document title', { exact: true })
    .fill('New certificate');
  await screen.getByLabel('Document type', { exact: true }).fill('Degree');
  await choose();
  await screen
    .getByRole('button', { name: 'Upload document', exact: true })
    .click();
  await screen
    .getByText('Document uploaded. Waiting for HR review.', { exact: true })
    .waitFor();
  await screen
    .getByRole('button', { name: 'Preview New certificate', exact: true })
    .waitFor();
  await mode('profile-refused');
  await screen
    .getByLabel('Document title', { exact: true })
    .fill('Refused certificate');
  await screen.getByLabel('Document type', { exact: true }).fill('Degree');
  await choose('refused.png');
  await screen
    .getByRole('button', { name: 'Upload document', exact: true })
    .click();
  await screen
    .getByText('This update is not permitted.', { exact: true })
    .waitFor();
  assert.equal(
    await screen.getByLabel('Document title', { exact: true }).inputValue(),
    'Refused certificate',
  );
  await mode('profile-uncertain');
  await screen
    .getByRole('button', { name: 'Upload document', exact: true })
    .click();
  await screen
    .getByText(
      'Upload was not confirmed. Refresh documents and check for the file before starting a new upload.',
      { exact: true },
    )
    .waitFor();
  assert.equal(
    await screen
      .getByRole('button', { name: 'Upload document', exact: true })
      .getAttribute('aria-disabled'),
    'true',
  );
  await mode('normal');
  await screen
    .getByRole('button', { name: 'Refresh documents', exact: true })
    .click();
  await screen
    .getByRole('button', { name: 'Preview Refused certificate', exact: true })
    .waitFor();
  await screen
    .getByRole('button', { name: 'Discard upload draft', exact: true })
    .click();
  // All password fields clear on leaving the tab.
  await screen
    .getByLabel('Current password', { exact: true })
    .fill('unsaved-test-only');
  await page.getByText('Home', { exact: true }).click();
  await page.getByText('Profile', { exact: true }).click();
  assert.equal(
    await screen.getByLabel('Current password', { exact: true }).inputValue(),
    '',
  );
  for (const width of [375, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(
      await page.evaluate(
        () =>
          globalThis.document.documentElement.scrollWidth >
          globalThis.innerWidth,
      ),
      false,
    );
    await screen
      .getByText('My employee record', { exact: true })
      .scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/profile-${width}.png` });
    await screen
      .getByText('Upload a document', { exact: true })
      .scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/documents-${width}.png` });
  }
  // Keyboard traversal exercises the Profile form's controls with visible focus.
  await screen.getByRole('button', { name: 'Sign Out', exact: true }).focus();
  for (let i = 0; i < 18; i++) {
    await page.keyboard.press('Tab');
    assert.ok(
      await page.evaluate(() => {
        const element = globalThis.document.activeElement;
        const style = globalThis.getComputedStyle(element);
        return (
          element.tagName === 'INPUT' ||
          parseFloat(style.outlineWidth) >= 2 ||
          parseFloat(style.borderWidth) >= 1
        );
      }),
      await page.evaluate(() =>
        globalThis.document.activeElement.outerHTML.slice(0, 350),
      ),
    );
  }
  await logout();
  requests.length = 0;
  await login('no-employee@jcet.test');
  await screen.getByText(/Documents require your own employee link/).waitFor();
  assert.equal(requests.length, 0);
  assert.equal(
    await screen
      .getByRole('button', { name: 'Preview New certificate', exact: true })
      .count(),
    0,
  );
  await logout();
  await login();
  assert.equal(
    await screen.getByLabel('Phone number', { exact: true }).inputValue(),
    '+91 98765 43211',
  );
  await screen
    .getByLabel('Current password', { exact: true })
    .fill('wrong-test-only');
  await screen
    .getByLabel('New password', { exact: true })
    .fill('profile-test-password-only');
  await screen
    .getByLabel('Confirm new password', { exact: true })
    .fill('profile-test-password-only');
  await screen
    .getByRole('button', { name: 'Change password', exact: true })
    .click();
  await screen.getByText(/current password.*not right/i).waitFor();
  await screen
    .getByLabel('Current password', { exact: true })
    .fill('home-check-only');
  await screen
    .getByLabel('New password', { exact: true })
    .fill('profile-test-password-only');
  await screen
    .getByLabel('Confirm new password', { exact: true })
    .fill('profile-test-password-only');
  await screen
    .getByRole('button', { name: 'Change password', exact: true })
    .click();
  await screen
    .getByText('Password changed. Your other sessions have been signed out.', {
      exact: true,
    })
    .waitFor();
  assert.equal(
    await screen.getByLabel('New password', { exact: true }).inputValue(),
    '',
  );
  await logout();
  await login('home-check@jcet.test', 'profile-test-password-only');
  await screen.getByText('My documents', { exact: true }).waitFor();
  await logout();
  assert.deepEqual(errors, []);
  globalThis.console.log(
    'Profile passed: own phone edit and persistence, protected preview/revocation, native-picker web upload, review status, denied/unconfirmed writes, no-employee/account isolation, password rejection/change/relogin, 375/1280, keyboard focus.',
  );
} catch (error) {
  await page.screenshot({ path: `${output}/failure.png` });
  throw error;
} finally {
  await mode('normal');
  await browser.close();
}
