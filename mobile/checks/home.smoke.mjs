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
  globalThis.process.env.HOME_SCREENSHOTS || '/tmp/campushr-ios004';
mkdirSync(output, { recursive: true });
const refresh = () =>
  page.getByRole('button', { name: 'Refresh all Home summaries' }).click();
try {
  await mode('normal');
  await page.goto(base);
  await page
    .getByLabel('Employee ID or College Email', { exact: true })
    .fill('home-check@jcet.test');
  await page.getByLabel('Password', { exact: true }).fill('home-check-only');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.getByText('6.5 days', { exact: true }).waitFor();
  assert.ok(await page.getByText('12 hours', { exact: true }).isVisible());
  assert.ok(await page.getByText('PRESENT', { exact: true }).isVisible());
  await page.getByText('2 unread', { exact: true }).waitFor();
  await page.screenshot({ path: `${output}/home-375.png`, fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: `${output}/home-1280.png`, fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 });
  const overflow = await page.evaluate(
    () =>
      globalThis.document.documentElement.scrollWidth >
      globalThis.window.innerWidth,
  );
  assert.equal(overflow, false);
  // Tab through every interactive Home control without mouse input.
  await page.keyboard.press('Control+Home');
  const focusLabels = new Set();
  for (let i = 0; i < 22; i++) {
    await page.keyboard.press('Tab');
    const focus = await page.evaluate(() => {
      const element = globalThis.document.activeElement;
      const css = globalThis.getComputedStyle(element);
      return {
        label: element.getAttribute('aria-label') || element.textContent,
        outline: css.outlineStyle,
        width: css.outlineWidth,
        tag: element.tagName,
      };
    });
    if (focus.tag !== 'BODY') {
      focusLabels.add(focus.label);
      assert.ok(
        focus.outline !== 'none' && focus.width !== '0px',
        `Missing keyboard focus: ${focus.label}`,
      );
    }
  }
  assert.ok(focusLabels.size >= 5);
  await mode('attendance-error');
  await refresh();
  await page.getByText(/Attendance check temporarily unavailable/).waitFor();
  assert.equal(await page.getByText('6.5 days', { exact: true }).count(), 1);
  assert.equal(await page.getByText('12 hours', { exact: true }).count(), 1);
  await page.screenshot({ path: `${output}/home-error.png`, fullPage: true });
  await mode('normal');
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await page.getByText('PRESENT', { exact: true }).waitFor();
  await mode('unlimited');
  await refresh();
  await page.getByText('No limit', { exact: true }).waitFor();
  await mode('empty');
  await refresh();
  await page.getByText('No record', { exact: true }).waitFor();
  await page.getByText('Not configured', { exact: true }).waitFor();
  await page.getByText('No notifications yet.', { exact: true }).waitFor();
  await page.screenshot({ path: `${output}/home-empty.png`, fullPage: true });
  await mode('normal');
  await refresh();
  await page.getByText('6.5 days', { exact: true }).waitFor();
  await page
    .getByRole('button', {
      name: /Open related screen for Leave request updated/,
    })
    .click();
  assert.ok(new globalThis.URL(page.url()).pathname.includes('leave'));
  // A fresh cookie-free context verifies the no-employee administrator UI.
  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();
  await admin.goto(base);
  await admin
    .getByLabel('Employee ID or College Email', { exact: true })
    .fill('no-employee@jcet.test');
  await admin.getByLabel('Password', { exact: true }).fill('home-check-only');
  await mode('normal');
  await admin.getByRole('button', { name: 'Sign In', exact: true }).click();
  await admin.getByText('2 unread', { exact: true }).waitFor();
  assert.ok(
    (await admin
      .getByText('Link an employee record to view your personal summary.', {
        exact: true,
      })
      .count()) >= 4,
  );
  const state = await (await globalThis.fetch(`${api}/test-state`)).json();
  assert.ok(
    state.paths.every((path) => path.startsWith('/api/v1/notifications')),
    JSON.stringify(state.paths),
  );
  await admin.screenshot({
    path: `${output}/home-no-employee.png`,
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  globalThis.console.log(
    'Home UI passed: 375/1280, keyboard focus, live summaries, partial error/retry, empty/unlimited, related route, no-employee isolation.',
  );
} finally {
  await mode('normal');
  await browser.close();
}
