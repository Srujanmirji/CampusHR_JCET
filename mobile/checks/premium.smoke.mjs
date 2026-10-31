// End-to-end redesign regression against the disposable loopback fixture API.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
const require = createRequire(import.meta.url);
const bundled = join(
  homedir(),
  '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright',
);
const { chromium } = require(
  globalThis.process.env.PLAYWRIGHT_MODULE ||
    (existsSync(bundled) ? bundled : 'playwright'),
);
const base = globalThis.process.env.PREMIUM_WEB_URL || 'http://127.0.0.1:8081';
const api = 'http://127.0.0.1:4011';
const out =
  globalThis.process.env.PREMIUM_SCREENSHOTS || '/tmp/campushr-premium-web';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath:
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const errors = [];
const page = await browser.newPage({
  viewport: { width: 375, height: 900 },
  reducedMotion: 'reduce',
});
page.setDefaultTimeout(15000);
page.on('pageerror', (e) => errors.push(e.message));
const mode = async (name) =>
  assert.equal(
    (await globalThis.fetch(`${api}/test-mode/${name}`, { method: 'POST' }))
      .status,
    204,
  );
const shot = async (p, name) => {
  await p.screenshot({ path: `${out}/${name}.png`, fullPage: true });
  assert.equal(
    await p.evaluate(
      () =>
        globalThis.document.documentElement.scrollWidth > globalThis.innerWidth,
    ),
    false,
    `${name}: horizontal overflow`,
  );
};
const button = (p, name) => p.getByRole('button', { name, exact: true });
const signIn = async (p, email) => {
  await p.goto(base);
  await p.getByLabel('Email or employee ID', { exact: true }).fill(email);
  await p.getByLabel('Password', { exact: true }).fill('home-check-only');
  await button(p, 'Sign in').click();
  await p.getByRole('tab', { name: 'Home', exact: true }).waitFor();
};
try {
  await mode('normal');
  await page.goto(base);
  await page.getByLabel('Email or employee ID', { exact: true }).waitFor();
  await button(page, 'Sign in').click();
  await page.locator('input[aria-invalid="true"]').first().waitFor();
  assert.equal(
    await page
      .getByLabel('Email or employee ID', { exact: true })
      .getAttribute('aria-invalid'),
    'true',
  );
  await button(page, 'Forgot password?').click();
  await page.getByText('0836-2002117', { exact: true }).waitFor();
  await shot(page, 'password-help-375');
  await button(page, 'Done').click();
  await shot(page, 'login-375');
  await signIn(page, 'faculty-check@jcet.test');
  await page.getByText('Today’s schedule', { exact: true }).waitFor();
  await page.getByText('6.5 days', { exact: true }).waitFor();
  await shot(page, 'faculty-home-375');
  // Full keyboard path on the primary screen, with visible focus at every stop.
  for (let n = 0; n < 34; n++) {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => {
      const e = globalThis.document.activeElement;
      if (
        !e?.matches(
          'button,a,input,textarea,select,[role="tab"],[role="button"]',
        )
      )
        return null;
      const s = globalThis.getComputedStyle(e);
      return {
        label: e.getAttribute('aria-label') || e.textContent,
        visible: s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0,
      };
    });
    if (focused)
      assert.equal(
        focused.visible,
        true,
        `Missing keyboard focus: ${focused.label}`,
      );
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await shot(page, 'faculty-home-1280');
  await page.setViewportSize({ width: 375, height: 900 });
  await page.getByRole('tab', { name: 'Timetable', exact: true }).click();
  await page.getByRole('tab', { name: 'Today', exact: true }).waitFor();
  await shot(page, 'timetable-today');
  await page.getByRole('tab', { name: 'Week', exact: true }).click();
  await page
    .getByRole('tab', { name: 'Week', exact: true, selected: true })
    .waitFor();
  assert.equal(
    await page
      .getByRole('tab', { name: 'Week', exact: true })
      .getAttribute('aria-selected'),
    'true',
  );
  await shot(page, 'timetable-week');
  await mode('attendance-live');
  await page.getByRole('tab', { name: 'Attendance', exact: true }).click();
  await button(page, 'Check in').click();
  await page
    .getByText('Check-in recorded by the server.', { exact: true })
    .waitFor();
  await shot(page, 'attendance');
  await mode('leave-live');
  await page.getByRole('tab', { name: 'Leave', exact: true }).click();
  await button(page, 'Apply for leave').waitFor();
  await shot(page, 'leave');
  await button(page, 'Apply for leave').click();
  const reason = page.getByLabel('Reason', { exact: true });
  await reason.waitFor();
  assert.equal(await reason.evaluate((e) => e.tagName), 'TEXTAREA');
  assert.equal(await reason.getAttribute('maxlength'), '500');
  await button(page, 'Submit request').click();
  await page.locator('textarea[aria-invalid="true"]').waitFor();
  assert.equal(await reason.getAttribute('aria-invalid'), 'true');
  await reason.fill('Faculty workshop\nCourse preparation');
  assert.ok((await reason.inputValue()).includes('\n'));
  await shot(page, 'apply-leave');
  await reason.fill('');
  await button(page, 'Close leave application').click();
  await page.getByRole('tab', { name: 'Profile', exact: true }).click();
  await button(page, 'Personal information').waitFor();
  await shot(page, 'profile');
  await button(page, 'Personal information').click();
  await page.getByText('Loading employee record…').waitFor({ state: 'hidden' });
  await shot(page, 'personal-information');
  await button(page, 'Back').click();
  await button(page, 'Documents').click();
  await page.getByText('My documents', { exact: true }).waitFor();
  await shot(page, 'documents');
  await button(page, 'Back').click();
  await button(page, 'Settings').click();
  await button(page, 'Change password').waitFor();
  await shot(page, 'settings');
  await button(page, 'Change password').click();
  await page.getByLabel('Current password', { exact: true }).waitFor();
  await shot(page, 'change-password');
  await mode('notifications-live');
  await page.goto(base + '/notifications');
  await button(page, 'Mark all read').waitFor();
  await shot(page, 'notifications');
  const hodContext = await browser.newContext({
    viewport: { width: 375, height: 900 },
    reducedMotion: 'reduce',
  });
  const hod = await hodContext.newPage();
  hod.setDefaultTimeout(15000);
  hod.on('pageerror', (e) => errors.push(e.message));
  await mode('leave-live');
  await signIn(hod, 'home-check@jcet.test');
  await hod.getByText('Your department today', { exact: true }).waitFor();
  assert.equal(
    await hod.getByRole('tab', { name: 'Attendance', exact: true }).count(),
    0,
  );
  await shot(hod, 'hod-home');
  await hod.getByRole('tab', { name: 'Approvals', exact: true }).click();
  await button(hod, 'Review').first().waitFor();
  await shot(hod, 'approvals');
  await button(hod, 'Review').first().click();
  await button(hod, 'Recommend approval').waitFor();
  await shot(hod, 'leave-review');
  await button(hod, 'Reject').click();
  await button(hod, 'Confirm rejection').click();
  await hod
    .getByText(/Provide a rejection reason with at least 3 characters/)
    .waitFor();
  await button(hod, 'Back to leave requests').click();
  await hod.getByRole('tab', { name: 'Workload', exact: true }).click();
  await hod.getByText('Scheduled teaching hours · Weekly').waitFor();
  await shot(hod, 'hod-workload');
  await mode('coverage-live');
  await hod.goto(base + '/leave/coverage');
  await button(hod, /View affected classes for/)
    .first()
    .click();
  await button(hod, /Manage .* periods/)
    .first()
    .click();
  await hod
    .getByText('Available for assignment', { exact: true })
    .first()
    .waitFor();
  await shot(hod, 'smart-substitution');
  assert.equal(await hod.getByText(/\d+ points/).count(), 0);
  hod.on('dialog', (d) => d.accept());
  await button(hod, 'Select Coverage Recipient').click();
  await button(hod, 'Confirm coverage').click();
  await hod.getByText('Coverage confirmed', { exact: true }).waitFor();
  await shot(hod, 'coverage-confirmation');
  assert.equal(
    await hod.getByText('Notification sent', { exact: true }).count(),
    0,
  );
  assert.deepEqual(errors, []);
  globalThis.console.log(
    'PASS: 13-screen redesign plus profile/document/security routes, keyboard focus, 375/1280 layout, role gating, validation, attendance write, and coverage assignment.',
  );
} catch (error) {
  await page.screenshot({ path: `${out}/failure.png`, fullPage: true });
  globalThis.console.error(error);
  globalThis.process.exitCode = 1;
} finally {
  await browser.close();
}
