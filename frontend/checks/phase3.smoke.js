import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { checkPassword, checkUser, mockAuthApi } from './mock-api.js';

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
  viewport: { width: 1440, height: 900 },
  reducedMotion: 'reduce',
});
const base = process.env.PREVIEW_URL || 'http://localhost:5173';
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await mockAuthApi(page, base);

try {
  console.log('Starting Phase 3 presentation verification...');

  // 1. Login flow
  await page.goto(`${base}/login`);
  await page.getByLabel('Employee ID or college email').fill(checkUser.email);
  await page.getByLabel('Password', { exact: true }).fill(checkPassword);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.waitForURL('**/dashboard');
  await page.waitForSelector('.metric-value');

  // 2. No prototype labelling; HOD role context
  assert.equal(
    await page.getByText(/prototype|demo data/i).count(),
    0,
    'Prototype/demo labels must not appear',
  );
  assert.ok(
    await page.getByText(checkUser.email).first().isVisible(),
    'Signed-in account must be displayed',
  );
  assert.ok(
    await page
      .locator('.profile-copy')
      .getByText('Super Admin', { exact: true })
      .isVisible(),
    'Signed-in role must be displayed',
  );

  // 3. Dashboard -> Recent Leave Requests with Review -> link
  const pendingRow = page.locator('.leave-card tbody tr').first();
  await pendingRow.waitFor();
  assert.ok(
    await pendingRow.getByText('Review').isVisible(),
    'Pending leave row must show Review -> callout',
  );

  // View opens the request's details drawer on the leave page
  await page
    .locator('.leave-card')
    .getByRole('link', { name: 'View Prof. Asha Patil’s leave request' })
    .click();
  const drawer = page.getByRole('dialog', { name: 'Leave request details' });
  await drawer.waitFor();

  // 4. Academic Impact Section in Drawer (from the real timetable)
  await drawer.getByText('2 classes affected').waitFor();
  assert.ok(
    await drawer.getByText('Academic Impact').isVisible(),
    'Academic Impact section header must be present',
  );
  assert.ok(
    await drawer.getByText('2 classes affected').isVisible(),
    '2 classes affected warning badge must be displayed',
  );
  assert.ok(
    await drawer.getByText('Database Management Systems').isVisible(),
    'DBMS class details must be listed',
  );
  assert.ok(
    await drawer.getByText('DBMS Lab').isVisible(),
    'DBMS Lab details must be listed',
  );
  assert.ok(
    await drawer.getByText('LH-203').isVisible(),
    'Room LH-203 must be listed',
  );

  // 5. Smart Substitution for Asha's approved leave
  await page.keyboard.press('Escape');
  await page.goto(`${base}/substitution`);

  // 6. Smart Substitution & Score Breakdown
  await page.getByText('0 / 2 Covered', { exact: true }).waitFor();
  assert.ok(
    await page.getByText('Smart Recommendation').first().isVisible(),
    'Smart Recommendation terminology must be used (not AI)',
  );

  const firstClass = page.locator('.affected-class-card').nth(0);
  const secondClass = page.locator('.affected-class-card').nth(1);
  await firstClass.getByText('Best Match').first().waitFor();
  await secondClass.getByText('Workload Limit Reached').first().waitFor();

  // The visible 35/25/15/15/10 rubric
  for (const label of [
    'Subject match',
    'Availability',
    'Department',
    'Workload headroom',
    'Experience',
  ]) {
    assert.ok(
      await firstClass.getByText(label, { exact: true }).first().isVisible(),
      `${label} must be part of the breakdown`,
    );
  }

  // Disabled for Dr. Rahul Deshpande (over his weekly maximum)
  assert.ok(
    await secondClass
      .getByRole('button', { name: 'Assign Dr. Rahul Deshpande', exact: true })
      .isDisabled(),
    'Dr. Rahul Deshpande assign button must be disabled due to workload',
  );
  assert.ok(
    await secondClass.getByText(/over the 18-hour maximum/).isVisible(),
    'The reason must be shown in words, not only on hover',
  );

  // 7. Assign substitute for class 1
  await firstClass
    .getByRole('button', { name: 'Assign Prof. Priya Kulkarni', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Confirm Assignment', exact: true })
    .click();
  await page.getByText('1 / 2 Covered', { exact: true }).waitFor();
  assert.ok(
    await firstClass.getByText('Substitute Assigned').first().isVisible(),
    'Substitute Assigned badge must appear',
  );
  assert.ok(
    await firstClass.getByText('Prof. Priya Kulkarni').first().isVisible(),
    'Prof. Priya Kulkarni must be shown as substitute',
  );
  assert.ok(
    await firstClass.getByText('Original faculty:').first().isVisible(),
    'Original faculty label must be visible',
  );
  assert.ok(
    await firstClass.getByText('Prof. Asha Patil').first().isVisible(),
    'Original faculty Prof. Asha Patil must be visible',
  );

  // 8. Assign substitute for class 2
  await secondClass
    .getByRole('button', { name: 'Assign Prof. Priya Kulkarni', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Confirm Assignment', exact: true })
    .click();
  await page.getByText('2 / 2 Covered', { exact: true }).waitFor();
  assert.ok(
    await page.getByText('All Classes Covered', { exact: true }).isVisible(),
    'All Classes Covered header must be visible',
  );
  assert.ok(
    (await page.locator('.workflow-success').textContent()).includes(
      '2 substitutes assigned',
    ),
    'Completion must count the substitutes',
  );

  // 11. Notifications: the bell counts unread, the page marks all read
  await page.goto(`${base}/notifications`);
  await page.getByRole('button', { name: 'Notifications, 2 unread' }).waitFor();
  await page.getByText('You are covering Data Structures').waitFor();
  await page
    .getByRole('button', { name: 'Mark all as read', exact: true })
    .click();
  await page.getByRole('button', { name: 'Notifications, 0 unread' }).waitFor();
  await page.getByLabel('Title').fill('Holiday on Friday');
  await page.getByLabel('Message').fill('The college is closed this Friday.');
  await page
    .getByRole('button', { name: 'Send announcement', exact: true })
    .click();
  await page.getByText('Announcement sent to 42 people.').waitFor();

  // 12. Module pages carry no planned/prototype banners
  for (const route of ['workload', 'employees', 'settings']) {
    await page.goto(`${base}/${route}`);
    await page.locator('main h1').waitFor();
    assert.equal(
      await page.getByText(/Planned Module|prototype|fictional/i).count(),
      0,
      `${route} must not show prototype banners`,
    );
  }

  assert.deepEqual(errors, []);
  console.log('Phase 3 smoke check PASSED! All acceptance criteria verified.');
} finally {
  await browser.close();
}
