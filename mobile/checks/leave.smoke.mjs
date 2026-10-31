// Disposable actual leave router/service; no external database or accounts.
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
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const page = await browser.newPage({
  viewport: { width: 375, height: 812 },
  reducedMotion: 'reduce',
});
const base = 'http://[::1]:8081',
  api = 'http://[::1]:4011';
const output = '/tmp/campushr-ios007';
mkdirSync(output, { recursive: true });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const mode = async (name) =>
  assert.equal(
    (await globalThis.fetch(`${api}/test-mode/${name}`, { method: 'POST' }))
      .status,
    204,
  );
const login = async (page, email = 'home-check@jcet.test') => {
  await page.goto(base);
  await page
    .getByLabel('Employee ID or College Email', { exact: true })
    .fill(email);
  await page.getByLabel('Password', { exact: true }).fill('home-check-only');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page
    .getByRole('button', { name: 'Refresh all Home summaries', exact: true })
    .waitFor();
  await page.goto(`${base}/leave`);
};
async function checkFormFocus() {
  let buttons = 0,
    inputs = 0;
  for (let i = 0; i < 28; i++) {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => {
      const el = globalThis.document.activeElement,
        css = globalThis.getComputedStyle(el);
      return {
        input: el.tagName === 'INPUT',
        button:
          el.getAttribute('role') === 'button' ||
          el.getAttribute('role') === 'checkbox',
        outline: css.outlineStyle,
        width: css.outlineWidth,
        border: el.parentElement
          ? globalThis.getComputedStyle(el.parentElement).borderColor
          : '',
      };
    });
    if (focused.input) {
      inputs++;
      assert.equal(focused.border, 'rgb(5, 31, 91)');
    } else if (focused.button) {
      buttons++;
      assert.notEqual(focused.outline, 'none');
      assert.notEqual(focused.width, '0px');
    }
  }
  assert.ok(buttons > 2 && inputs > 0);
}
try {
  await mode('leave-live');
  await login(page);
  const screen = page.getByTestId('leave-screen');
  await screen.getByText('Faculty test request', { exact: true }).waitFor();
  assert.equal(
    await screen.getByText('Other department request', { exact: true }).count(),
    0,
  );
  assert.equal(
    await screen.getByText('Already with HR', { exact: true }).count(),
    0,
  );
  assert.equal(
    await screen.getByText('Personal test request', { exact: true }).count(),
    0,
  );
  await page.screenshot({
    path: `${output}/leave-approvals-375.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({
    path: `${output}/leave-approvals-1280.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 375, height: 812 });
  // Keyboard-only navigation and visible focus across the queue.
  await page.keyboard.press('Control+Home');
  let stops = 0;
  for (let i = 0; i < 16; i++) {
    await page.keyboard.press('Tab');
    const focus = await page.evaluate(() => {
      const el = globalThis.document.activeElement,
        css = globalThis.getComputedStyle(el);
      return {
        tag: el.tagName,
        style: css.outlineStyle,
        width: css.outlineWidth,
      };
    });
    if (focus.tag !== 'BODY') {
      stops++;
      assert.notEqual(focus.style, 'none');
      assert.notEqual(focus.width, '0px');
    }
  }
  assert.ok(stops >= 6);
  await screen
    .getByRole('button', { name: 'Recommend', exact: true })
    .first()
    .click();
  await checkFormFocus();
  const remark = page.getByLabel('Recommendation Remark (Optional)', {
    exact: true,
  });
  await remark.fill('Recommended for HR review');
  await mode('leave-refused');
  await page
    .getByRole('button', { name: 'Confirm Recommendation', exact: true })
    .click();
  await page
    .getByText('Leave write refused for this test.', { exact: true })
    .waitFor();
  assert.equal(await remark.inputValue(), 'Recommended for HR review');
  await page.screenshot({
    path: `${output}/leave-recommendation-failure.png`,
    fullPage: true,
  });
  await mode('leave-ok');
  await page
    .getByRole('button', { name: 'Confirm Recommendation', exact: true })
    .click();
  await screen
    .getByText('Recommendation recorded. Waiting for HR Admin.', {
      exact: true,
    })
    .waitFor();
  assert.equal(
    await screen
      .getByRole('button', { name: 'Recommend', exact: true })
      .count(),
    1,
  );
  await screen.getByRole('button', { name: 'Reject', exact: true }).click();
  await page
    .getByRole('button', { name: 'Confirm Rejection', exact: true })
    .click();
  await page
    .getByText('Please provide a rejection reason (minimum 3 characters).', {
      exact: true,
    })
    .waitFor();
  await page
    .getByLabel('Rejection Reason (Required)', { exact: true })
    .fill('No alternate arrangements');
  await page
    .getByRole('button', { name: 'Confirm Rejection', exact: true })
    .click();
  await screen
    .getByText('No requests awaiting your recommendation.', { exact: true })
    .waitFor();
  await screen
    .getByRole('button', { name: 'My Leave Records', exact: true })
    .click();
  await screen.getByText('Personal test request', { exact: true }).waitFor();
  await screen.getByText('Unlimited', { exact: true }).waitFor();
  await screen
    .getByRole('button', { name: 'Cancel Request', exact: true })
    .click();
  await screen
    .getByRole('button', { name: 'Confirm cancellation', exact: true })
    .click();
  await screen.getByText('Request cancelled.', { exact: true }).waitFor();
  await screen
    .getByRole('button', { name: 'Apply for New Leave', exact: true })
    .click();
  await checkFormFocus();
  const start = page.getByLabel('Start Date', { exact: true }),
    end = page.getByLabel('End Date', { exact: true }),
    reason = page.getByLabel('Reason for Leave', { exact: true });
  await start.fill('2026-10-27');
  await end.fill('2026-10-27');
  await reason.fill('Personal half day appointment');
  await page.getByRole('checkbox', { name: 'Apply as Half-Day Leave' }).click();
  await mode('leave-refused');
  await page
    .getByRole('button', { name: 'Submit Application', exact: true })
    .click();
  await page
    .getByText('Leave write refused for this test.', { exact: true })
    .waitFor();
  assert.equal(await reason.inputValue(), 'Personal half day appointment');
  await page.screenshot({
    path: `${output}/leave-apply-failure.png`,
    fullPage: true,
  });
  await mode('leave-ok');
  await page
    .getByRole('button', { name: 'Submit Application', exact: true })
    .click();
  await screen
    .getByText('Personal half day appointment', { exact: true })
    .waitFor();
  await screen.getByText(/0.5 days · First half/).waitFor();
  await screen.getByText('Waiting for: Principal', { exact: true }).waitFor();
  await screen
    .getByText('Leave request submitted. Waiting for Principal.', {
      exact: true,
    })
    .waitFor();
  const appliedCard = screen
    .locator('div')
    .filter({
      has: page.getByText('Personal half day appointment', { exact: true }),
    })
    .filter({
      has: page.getByRole('button', { name: 'Cancel Request', exact: true }),
    })
    .last();
  await appliedCard
    .getByRole('button', { name: 'Cancel Request', exact: true })
    .click();
  await mode('leave-uncertain');
  await screen
    .getByRole('button', { name: 'Confirm cancellation', exact: true })
    .click();
  await screen.getByText(/Cancellation outcome unknown/).waitFor();
  await mode('leave-ok');
  await screen
    .getByRole('button', { name: 'Check cancellation status', exact: true })
    .click();
  await screen.getByText('Request cancelled.', { exact: true }).waitFor();
  await screen
    .getByRole('button', { name: 'Apply for New Leave', exact: true })
    .click();
  await start.fill('2026-10-28');
  await end.fill('2026-10-28');
  await reason.fill('Unknown outcome appointment');
  await mode('leave-uncertain');
  await page
    .getByRole('button', { name: 'Submit Application', exact: true })
    .click();
  await page.getByText(/Submission outcome unknown/).waitFor();
  assert.equal(await reason.inputValue(), 'Unknown outcome appointment');
  assert.equal(
    await page
      .getByRole('button', { name: 'Submit Application', exact: true })
      .isDisabled(),
    true,
  );
  await page
    .getByRole('button', { name: 'Close leave application', exact: true })
    .click();
  await mode('leave-ok');
  await screen
    .getByRole('button', { name: 'Refresh leave', exact: true })
    .click();
  await screen
    .getByText('Unknown outcome appointment', { exact: true })
    .waitFor();
  await mode('leave-error');
  await screen
    .getByRole('button', { name: 'Refresh leave', exact: true })
    .click();
  await screen.getByText(/Balances unavailable/).waitFor();
  assert.equal(
    await screen
      .getByText('Unknown outcome appointment', { exact: true })
      .count(),
    1,
  );
  await mode('leave-ok');
  await screen
    .getByRole('button', { name: 'Refresh leave', exact: true })
    .click();
  await screen.getByText('Unlimited', { exact: true }).waitFor();
  await page.screenshot({
    path: `${output}/leave-personal-375.png`,
    fullPage: true,
  });
  const state = await (await globalThis.fetch(`${api}/test-state`)).json();
  assert.ok(
    state.paths.some(
      (path) => path.includes('employeeId=') && path.includes('year=2026'),
    ),
  );
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
  });
  const admin = await context.newPage();
  await login(admin, 'no-employee@jcet.test');
  await admin
    .getByRole('button', { name: 'My Leave Records', exact: true })
    .click();
  await admin
    .getByTestId('leave-screen')
    .getByText('Link an employee record to view your personal summary.', {
      exact: true,
    })
    .waitFor();
  assert.equal(
    await admin
      .getByRole('button', { name: 'Apply for New Leave', exact: true })
      .count(),
    0,
  );
  await context.close();
  assert.deepEqual(errors, []);
  globalThis.console.log(
    `Leave smoke passed: scoped queue, recommendation, rejection, cancellation, half day, failure retention, unknown outcome, independent errors and keyboard focus. Screenshots: ${output}`,
  );
} catch (error) {
  await page.screenshot({ path: `${output}/failure.png`, fullPage: true });
  globalThis.console.error(
    (await page.locator('body').innerText()).slice(-5000),
  );
  throw error;
} finally {
  await browser.close();
}
