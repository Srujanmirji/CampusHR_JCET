// Run against the disposable Home fixture API; never a production account.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const bundled = join(
  homedir(),
  '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright',
);
const { chromium } = require(
  globalThis.process.env.PLAYWRIGHT_MODULE ||
    (existsSync(bundled) ? bundled : 'playwright'),
);
const browser = await chromium.launch({
  headless: true,
  executablePath:
    globalThis.process.env.CHROME_EXECUTABLE ||
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const page = await browser.newPage({
  viewport: { width: 375, height: 812 },
  reducedMotion: 'reduce',
});
const base = 'http://[::1]:8081';
const api = 'http://[::1]:4011';
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const mode = async (value) => {
  assert.equal(
    (await globalThis.fetch(`${api}/test-mode/${value}`, { method: 'POST' }))
      .status,
    204,
  );
};
const output =
  globalThis.process.env.HOME_SCREENSHOTS || '/tmp/campushr-ios006';
mkdirSync(output, { recursive: true });
try {
  await mode('attendance-live');
  await page.goto(base);
  await page
    .getByLabel('Employee ID or College Email', { exact: true })
    .fill('home-check@jcet.test');
  await page.getByLabel('Password', { exact: true }).fill('home-check-only');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.getByText('6.5 days', { exact: true }).waitFor();
  await page
    .getByRole('button', { name: 'Attendance details', exact: true })
    .click();
  const screen = page.getByTestId('attendance-screen');
  await screen.getByText('No attendance record', { exact: true }).waitFor();
  await screen.getByText(/No attendance records for this month/).waitFor();
  await page.screenshot({
    path: `${output}/attendance-375.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({
    path: `${output}/attendance-1280.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 375, height: 812 });
  assert.equal(
    await page.evaluate(
      () =>
        globalThis.document.documentElement.scrollWidth >
        globalThis.window.innerWidth,
    ),
    false,
  );
  const focusLabels = new Set();
  for (let index = 0; index < 34; index++) {
    await page.keyboard.press('Tab');
    const focus = await page.evaluate(() => {
      const el = globalThis.document.activeElement;
      const css = globalThis.getComputedStyle(el);
      const parent = globalThis.getComputedStyle(el.parentElement);
      return {
        tag: el.tagName,
        label: el.getAttribute('aria-label') || el.textContent,
        visibleOutline:
          css.outlineStyle !== 'none' && css.outlineWidth !== '0px',
        inputBorder: parent.borderColor === 'rgb(5, 31, 91)',
      };
    });
    if (focus.tag !== 'BODY') {
      focusLabels.add(focus.label);
      assert.ok(
        focus.visibleOutline || (focus.tag === 'INPUT' && focus.inputBorder),
        `Missing focus: ${focus.label}`,
      );
    }
  }
  assert.ok(focusLabels.size >= 8);
  await mode('attendance-punch-refused');
  await screen.getByRole('button', { name: 'Check in', exact: true }).click();
  await screen
    .getByText('Mobile punch is not permitted.', { exact: true })
    .waitFor();
  assert.equal(
    await screen.getByText(/Check-in recorded by the server/).count(),
    0,
  );
  await screen
    .getByRole('button', { name: 'Recheck recorded punches', exact: true })
    .click();
  await mode('attendance-punch-uncertain');
  await screen.getByRole('button', { name: 'Check in', exact: true }).click();
  await screen.getByText(/Punch not confirmed/).waitFor();
  const firstState = await (await globalThis.fetch(`${api}/test-state`)).json();
  assert.equal(
    firstState.paths.filter((path) => path === 'POST /api/v1/attendance/punch')
      .length,
    1,
  );
  await screen
    .getByRole('button', { name: 'Recheck recorded punches', exact: true })
    .click();
  await mode('attendance-ok');
  await screen.getByRole('button', { name: 'Check out', exact: true }).click();
  await screen
    .getByText('Check-out recorded by the server.', { exact: true })
    .waitFor();
  await screen.getByText(/Check-out is recorded/).waitFor();
  await screen
    .getByLabel('Requested check-in (UTC)', { exact: true })
    .fill('09:00');
  await screen
    .getByLabel('Requested check-out (UTC, optional)', { exact: true })
    .fill('17:00');
  await screen.getByLabel('Reason for correction', { exact: true }).fill('x');
  await screen
    .getByRole('button', { name: 'Submit correction request', exact: true })
    .click();
  await screen.getByText(/at least 3 characters/).waitFor();
  await screen
    .getByLabel('Reason for correction', { exact: true })
    .fill('Biometric record needs correction.');
  await mode('attendance-correction-refused');
  await screen
    .getByRole('button', { name: 'Submit correction request', exact: true })
    .click();
  await screen
    .getByText('Correction rejected for this test.', { exact: true })
    .waitFor();
  assert.equal(
    await screen
      .getByLabel('Reason for correction', { exact: true })
      .inputValue(),
    'Biometric record needs correction.',
  );
  await mode('attendance-ok');
  await screen
    .getByRole('button', { name: 'Submit correction request', exact: true })
    .click();
  await screen
    .getByText(/Correction request received. It is pending review/)
    .waitFor();
  await screen
    .getByText('Biometric record needs correction.', { exact: true })
    .waitFor();
  await screen
    .getByLabel('Reason for correction', { exact: true })
    .fill('Unconfirmed submission test.');
  await mode('attendance-correction-uncertain');
  await screen
    .getByRole('button', { name: 'Submit correction request', exact: true })
    .click();
  await screen.getByText(/Submission not confirmed/).waitFor();
  assert.equal(
    await screen
      .getByRole('button', { name: 'Submit correction request', exact: true })
      .isDisabled(),
    true,
  );
  assert.equal(
    await screen
      .getByLabel('Reason for correction', { exact: true })
      .inputValue(),
    'Unconfirmed submission test.',
  );
  await screen
    .getByText('Unconfirmed submission test.', { exact: true })
    .waitFor();
  const secondState = await (
    await globalThis.fetch(`${api}/test-state`)
  ).json();
  assert.equal(
    secondState.paths.filter(
      (path) => path === 'POST /api/v1/attendance/corrections',
    ).length,
    1,
  );
  await page.screenshot({
    path: `${output}/attendance-uncertain.png`,
    fullPage: true,
  });
  await mode('attendance-history-error');
  await screen
    .getByRole('button', { name: 'Refresh attendance', exact: true })
    .click();
  await screen
    .getByText('Attendance history temporarily unavailable.', { exact: true })
    .waitFor();
  assert.equal(
    await screen.getByText(/No attendance records for this month/).count(),
    0,
  );
  await mode('attendance-ok');
  await screen.getByRole('button', { name: 'Retry', exact: true }).click();
  await screen
    .getByText(/No completed duration|0h 0m/)
    .first()
    .waitFor();
  await screen
    .getByRole('button', { name: 'Previous attendance month', exact: true })
    .click();
  await screen.getByText(/No attendance records for this month/).waitFor();
  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();
  await admin.goto(base);
  await admin
    .getByLabel('Employee ID or College Email', { exact: true })
    .fill('no-employee@jcet.test');
  await admin.getByLabel('Password', { exact: true }).fill('home-check-only');
  await admin.getByRole('button', { name: 'Sign In', exact: true }).click();
  await admin.getByText('2 unread', { exact: true }).waitFor();
  await mode('attendance-ok');
  await admin.getByText('Attendance', { exact: true }).click();
  await admin
    .getByTestId('attendance-screen')
    .getByText(/Link an employee record/)
    .waitFor();
  const noEmployee = await (await globalThis.fetch(`${api}/test-state`)).json();
  assert.equal(
    noEmployee.paths.filter((path) => path.includes('/attendance')).length,
    0,
  );
  assert.deepEqual(errors, []);
  globalThis.console.log(
    'Attendance UI passed: 375/1280, explicit punch refusal/reconciliation/check-out, pending corrections, retained input, lost-write response protection, history error/retry/month navigation, no-employee isolation.',
  );
} finally {
  await mode('normal');
  await browser.close();
}
