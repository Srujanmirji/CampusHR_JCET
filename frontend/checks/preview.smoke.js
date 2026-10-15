import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  apiUrl,
  checkPassword,
  checkUser,
  facultyUser,
  mockAuthApi,
} from './mock-api.js';

const require = createRequire(import.meta.url);
const bundled = join(
  homedir(),
  '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright',
);
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    (existsSync(bundled) ? bundled : 'playwright'),
);
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const executablePath =
  process.env.CHROME_EXECUTABLE || (existsSync(chrome) ? chrome : undefined);
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({
  viewport: { width: 1280, height: 900 },
  reducedMotion: 'reduce',
});
const base = process.env.PREVIEW_URL || 'http://localhost:5173';
const errors = [];
const externalRequests = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('request', (request) => {
  const url = request.url();
  if (![base, apiUrl, 'data:'].some((prefix) => url.startsWith(prefix)))
    externalRequests.push(url);
});
const api = await mockAuthApi(page, base);
const profileMenu = { name: `Open profile menu for ${checkUser.email}` };
async function dashboard() {
  await page.goto(`${base}/dashboard`);
  await page.waitForSelector('.metric-value');
}
try {
  await page.goto(`${base}/dashboard`);
  await page.waitForURL('**/login');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.getByText('Enter your employee ID or college email.').waitFor();
  await page.getByLabel('Employee ID or college email').fill(checkUser.email);
  await page.getByLabel('Password', { exact: true }).fill('wrong password');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.getByText('Incorrect employee ID, email or password.').waitFor();
  await page.getByLabel('Password', { exact: true }).fill(checkPassword);
  await page.getByRole('button', { name: 'Forgot password?' }).click();
  await page.getByRole('dialog').waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Login', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.waitForURL('**/dashboard');
  await page.waitForSelector('.metric-value');
  assert.deepEqual(await page.locator('.metric-value').allTextContents(), [
    '186',
    '162',
    '11',
    '2', // leave waiting for this Super Admin (mock API)
    '6',
    '6',
  ]);
  assert.equal(await page.locator('.leave-card tbody tr').count(), 3);
  assert.equal(await page.locator('nav a.sidebar-link').count(), 11);
  assert.equal(await page.locator('nav a.sidebar-link-active').count(), 1);
  assert.equal(
    await page.locator('.chart-canvas svg.recharts-surface').count(),
    2,
  );
  for (let index = 0; index < 36; index++) {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => {
      const element = document.activeElement;
      const group = element.closest('[data-slot="input-group"]');
      const style = getComputedStyle(group || element);
      return {
        tag: element.tagName,
        outline: style.outlineStyle,
        width: style.outlineWidth,
      };
    });
    if (focused.tag !== 'BODY')
      assert.ok(
        focused.outline === 'solid' && parseFloat(focused.width) >= 2,
        `Invisible keyboard focus: ${JSON.stringify(focused)}`,
      );
  }
  await page.getByRole('button', { name: 'Add Employee', exact: true }).click();
  await page.waitForURL('**/employees');
  await page.getByRole('heading', { name: 'Add employee' }).waitFor();
  await page.keyboard.press('Escape');
  await page.getByText('JCET-CSE-001').waitFor();
  await dashboard();
  await page.getByLabel('Filter leave requests by status').click();
  await page.getByRole('option', { name: 'Rejected', exact: true }).click();
  await page.getByText('No requests in this status', { exact: true }).waitFor();
  await page
    .getByRole('button', { name: 'Show all statuses', exact: true })
    .click();
  assert.equal(await page.locator('.leave-card tbody tr').count(), 3);
  const profileButton = page.getByRole('button', profileMenu);
  await profileButton.click();
  await page.getByRole('menuitem', { name: 'My profile' }).click();
  await page.getByRole('dialog').waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  // The dialog returns focus once its close transition ends.
  await page
    .waitForFunction(
      (name) => document.activeElement?.getAttribute('aria-label') === name,
      profileMenu.name,
      { timeout: 2000 },
    )
    .catch(() => {});
  assert.ok(
    await profileButton.evaluate(
      (element) => element === document.activeElement,
    ),
    'Profile dialog must restore focus to its trigger',
  );
  await page.getByRole('button', { name: 'Collapse sidebar' }).click();
  assert.equal(
    await page.locator('.app-shell').getAttribute('data-collapsed'),
    'true',
  );
  await page.getByRole('button', { name: 'Expand sidebar' }).click();
  await page.getByLabel('Search employees and modules').fill('Asha');
  await page
    .locator('.search-results')
    .getByRole('link', { name: /Prof. Asha Patil.*employee/ })
    .click();
  await page.waitForURL('**/employees');
  for (const route of [
    'employees',
    'attendance',
    'timetable',
    'workload',
    'reports',
    'notifications',
    'settings',
  ]) {
    await page.goto(`${base}/${route}`);
    await page.locator('main h1').waitFor();
  }
  await dashboard();
  for (const width of [1440, 1280, 768, 375]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(
      await page.evaluate(() => document.body.scrollWidth <= innerWidth),
      `Overflow at ${width}px`,
    );
  }
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('dialog').waitFor();
  await page
    .getByRole('dialog')
    .getByRole('link', { name: 'Employees', exact: true })
    .click();
  await page.waitForURL('**/employees');
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await dashboard();
  // One interactive check for the complete academic operation and its recovery paths.
  await dashboard();
  await page
    .getByRole('button', { name: 'Approve Leave', exact: true })
    .click();
  await page
    .getByRole('heading', { name: 'Leave management', exact: true })
    .waitFor();
  await page.setViewportSize({ width: 1440, height: 1000 });
  // Leave waiting for the Super Admin opens first; approving it decides it.
  await page.goto(`${base}/leave`);
  await page
    .getByRole('button', {
      name: 'View Dr. Suresh Patil’s Casual Leave request',
    })
    .first()
    .click();
  const drawer = page.getByRole('dialog', { name: 'Leave request details' });
  await drawer.waitFor();
  await drawer
    .getByRole('button', { name: 'Approve Leave', exact: true })
    .click();
  await page
    .getByText('Approved Dr. Suresh Patil’s leave.', { exact: true })
    .waitFor();
  await drawer.waitFor({ state: 'hidden' });
  // Smart substitution: Asha's approved leave opens first.
  await page.goto(`${base}/substitution`);
  await page.getByText('0 / 2 Covered', { exact: true }).waitFor();
  const firstClass = page.locator('.affected-class-card').nth(0);
  const secondClass = page.locator('.affected-class-card').nth(1);
  for (const card of [firstClass, secondClass]) {
    await card
      .getByRole('button', { name: 'Assign Prof. Priya Kulkarni', exact: true })
      .waitFor();
    assert.deepEqual(
      await card.locator('.match-score strong').allTextContents(),
      ['94/100', '86/100', '74/100'],
    );
  }
  assert.ok(
    await secondClass
      .getByRole('button', { name: 'Assign Dr. Rahul Deshpande', exact: true })
      .isDisabled(),
    'Lab assignment must enforce workload capacity',
  );
  await firstClass
    .getByRole('button', { name: 'Assign Prof. Priya Kulkarni', exact: true })
    .click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  assert.equal(
    await page.getByText('0 / 2 Covered', { exact: true }).count(),
    1,
  );
  await firstClass
    .getByRole('button', { name: 'Assign Prof. Priya Kulkarni', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Confirm Assignment', exact: true })
    .click();
  await page.getByText('1 / 2 Covered', { exact: true }).waitFor();
  assert.equal(
    await page.getByText('No classes left uncovered', { exact: true }).count(),
    0,
  );
  await page.reload();
  await page.getByText('1 / 2 Covered', { exact: true }).waitFor();
  await secondClass
    .getByRole('button', { name: 'Assign Prof. Priya Kulkarni', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Confirm Assignment', exact: true })
    .click();
  await page.getByText('2 / 2 Covered', { exact: true }).waitFor();
  await page.getByText('No classes left uncovered', { exact: true }).waitFor();
  // Undo puts the class back in need of cover.
  await secondClass.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.getByText('1 / 2 Covered', { exact: true }).waitFor();
  await secondClass
    .getByRole('button', { name: 'Assign Prof. Priya Kulkarni', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Confirm Assignment', exact: true })
    .click();
  await page.getByText('2 / 2 Covered', { exact: true }).waitFor();
  await page
    .getByRole('link', { name: 'Return to Leave Management', exact: true })
    .click();
  await page
    .getByRole('heading', { name: 'Leave management', exact: true })
    .waitFor();
  await page.getByLabel('Show', { exact: true }).click();
  await page.getByRole('option', { name: 'All requests', exact: true }).click();
  await page.getByLabel('Search leave requests', { exact: true }).fill('Asha');
  await page
    .getByRole('button', {
      name: 'View Prof. Asha Patil’s Casual Leave request',
    })
    .waitFor();
  assert.equal(await page.locator('main tbody tr').count(), 1);
  assert.equal(
    await page.locator('main tbody .status-badge').textContent(),
    'Pending',
  );
  await page
    .getByLabel('Search leave requests', { exact: true })
    .fill('No faculty by this name');
  await page.getByText('No leave requests match', { exact: true }).waitFor();
  await page.getByLabel('Search leave requests', { exact: true }).fill('');
  // Asha's leave waits for her HOD: the Super Admin reads it and its classes.
  await page
    .getByRole('button', {
      name: 'View Prof. Asha Patil’s Casual Leave request',
    })
    .click();
  await drawer.getByText('2 classes affected').waitFor();
  await drawer.getByText('Database Management Systems').waitFor();
  assert.equal(
    await drawer.getByRole('button', { name: 'Approve Leave' }).count(),
    0,
  );
  await page.keyboard.press('Escape');
  await drawer.waitFor({ state: 'hidden' });
  await page.goto(
    `${base}/substitution?leave=b0000000-0000-4000-8000-000000000002`,
  );
  await page.getByText('0 / 2 Covered', { exact: true }).waitFor();
  for (const index of [0, 1]) {
    await page
      .locator('.affected-class-card')
      .nth(index)
      .getByRole('button', { name: 'No substitute required', exact: true })
      .click();
    await page
      .getByRole('button', {
        name: 'Confirm No Substitute Required',
        exact: true,
      })
      .click();
    await page
      .getByText(
        'Describe how this class will be handled without a substitute.',
        { exact: true },
      )
      .waitFor();
    await page
      .getByLabel('Academic arrangement', { exact: true })
      .fill('Supervised independent study agreed with the HOD.');
    await page
      .getByRole('button', {
        name: 'Confirm No Substitute Required',
        exact: true,
      })
      .click();
  }
  await page.getByText('2 / 2 Covered', { exact: true }).waitFor();
  assert.ok(
    (await page.locator('.workflow-success').textContent()).includes(
      '0 substitutes assigned',
    ),
  );
  await page.reload();
  await page.getByText('No classes left uncovered', { exact: true }).waitFor();
  const secondRequest = 'a0000000-0000-4000-8000-000000000003';
  await page.goto(`${base}/leave?tab=requests&request=${secondRequest}`);
  await drawer
    .getByRole('button', { name: 'Reject Leave', exact: true })
    .click();
  await drawer
    .getByText('Say why you are rejecting it, in a few words.', {
      exact: true,
    })
    .waitFor();
  await drawer
    .getByLabel('Note', { exact: true })
    .fill('Department assessment duty on the requested date.');
  await drawer
    .getByRole('button', { name: 'Reject Leave', exact: true })
    .click();
  await drawer.waitFor({ state: 'hidden' });
  await page.goto(
    `${base}/leave?tab=requests&show=ALL&request=${secondRequest}`,
  );
  await drawer
    .getByText('Department assessment duty on the requested date.')
    .waitFor();
  assert.equal(
    await drawer.locator('.status-badge').first().textContent(),
    'Rejected',
  );
  await page.keyboard.press('Escape');
  // Leave calendar: Asha's two pending days in November; month navigation.
  await page.goto(`${base}/leave?tab=calendar&month=2026-11`);
  await page.getByRole('heading', { name: 'November 2026' }).waitFor();
  const ashaChip = page.getByRole('button', {
    name: 'Prof. Asha Patil, Casual Leave, waiting for approval',
  });
  await ashaChip.first().waitFor();
  assert.equal(
    await ashaChip.count(),
    2,
    'Asha is on leave on 2 and 3 November',
  );
  await page.getByRole('button', { name: 'Previous month' }).click();
  await page.getByRole('heading', { name: 'October 2026' }).waitFor();
  await page.getByText('Nobody is on leave in October 2026.').waitFor();
  for (const width of [1440, 1280, 768, 375]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of ['leave', 'substitution']) {
      await page.goto(`${base}/${route}`);
      await page
        .getByRole('heading', {
          name:
            route === 'leave'
              ? 'Leave management'
              : 'Smart faculty substitution',
          exact: true,
        })
        .waitFor();
      assert.ok(
        await page.evaluate(() => document.body.scrollWidth <= innerWidth),
        `Phase 2 overflow: ${route} at ${width}px`,
      );
    }
  }
  await page.evaluate(() =>
    sessionStorage.setItem('campushr-academic-demo-v1', '{invalid JSON'),
  );
  await page.goto(`${base}/leave`);
  await page
    .getByRole('heading', { name: 'Leave management', exact: true })
    .waitFor();
  // A broken stored demo workflow falls back instead of breaking the app.
  await page.goto(`${base}/notifications`);
  await page.locator('main h1').waitFor();
  await dashboard();
  await page.getByRole('button', profileMenu).click();
  await page.getByRole('menuitem', { name: 'Logout' }).click();
  await page.waitForURL('**/login');
  assert.equal(api.user, undefined, 'logout must reach the API');
  await page.goto(`${base}/leave`);
  await page.waitForURL('**/login');
  await page.getByLabel('Employee ID or college email').fill(checkUser.email);
  await page.getByLabel('Password', { exact: true }).fill(checkPassword);
  await page.getByLabel('Remember me').check();
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.waitForURL('**/leave');
  assert.equal(api.lastLogin.remember, true);
  await page.reload();
  await page.locator('main h1').waitFor();
  assert.ok(page.url().endsWith('/leave'), 'session restored after reload');

  // A Faculty account sees only its modules and is refused the rest.
  await page.getByRole('button', profileMenu).click();
  await page.getByRole('menuitem', { name: 'Logout' }).click();
  await page.waitForURL('**/login');
  await page.getByLabel('Employee ID or college email').fill(facultyUser.email);
  await page.getByLabel('Password', { exact: true }).fill(checkPassword);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.waitForURL('**/dashboard');
  const facultyNav = await page.locator('nav a.sidebar-link').allTextContents();
  assert.equal(facultyNav.length, 9, `Faculty sidebar: ${facultyNav}`);
  assert.ok(!facultyNav.some((label) => /Reports|Settings/.test(label)));
  await page.goto(`${base}/reports`);
  await page.getByText('You don’t have access to this page').waitFor();
  await page.goto(`${base}/employees`);
  await page.getByText('JCET-CSE-021').waitFor();
  assert.equal(
    await page.locator('tbody tr').count(),
    1,
    'Faculty see only their own record',
  );
  assert.equal(
    await page.getByRole('button', { name: 'Add employee' }).count(),
    0,
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(externalRequests, []);
  console.log(
    'Phase 1 + 2 smoke check passed: approval, ranked assignment, full coverage, timetable, reject, cancellation, manual coverage, persistence, responsive layouts, and local-only requests.',
  );
} finally {
  await browser.close();
}
