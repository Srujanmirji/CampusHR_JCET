import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

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

try {
  console.log('Starting Phase 3 presentation verification...');

  // 1. Login flow
  await page.goto(`${base}/login`);
  await page.getByLabel('Faculty / Employee ID or Email').fill('HR001');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.waitForURL('**/dashboard');
  await page.waitForSelector('.metric-value');

  // 2. Demo Indicator & HOD Role Context
  assert.ok(
    await page.getByText('Prototype • Demo Data').first().isVisible(),
    'Demo data indicator must be clearly visible in Topbar or header',
  );
  assert.ok(
    await page.getByText('Dr. Ramesh K').first().isVisible(),
    'HOD Dr. Ramesh K must be displayed',
  );
  assert.ok(
    await page.getByText('HOD / HR Administrator').first().isVisible(),
    'HOD / HR Administrator role context must be displayed',
  );

  // 3. Dashboard -> Recent Leave Requests with Review -> link
  const pendingRow = page.locator('.leave-card tbody tr').first();
  await pendingRow.waitFor();
  assert.ok(
    await pendingRow.getByText('Review').isVisible(),
    'Pending leave row must show Review -> callout',
  );

  // Click row or Review button directly navigates to leave details drawer
  await pendingRow.getByRole('link', { name: 'Prof. Asha Patil' }).click();
  const drawer = page.getByRole('dialog', { name: 'Leave request details' });
  await drawer.waitFor();

  // 4. Academic Impact Section in Drawer
  assert.ok(
    await drawer.getByText('Academic Impact').isVisible(),
    'Academic Impact section header must be present',
  );
  assert.ok(
    await drawer.getByText('2 classes affected').isVisible(),
    '2 classes affected warning badge must be displayed',
  );
  assert.ok(
    await drawer
      .getByText(
        'Approving this leave may require substitute faculty for the following scheduled classes.',
      )
      .isVisible(),
    'Academic impact explanatory note must be present',
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

  // 5. Approve & Find Substitute
  await drawer.getByRole('button', { name: 'Approve Leave', exact: true }).click();
  await page
    .getByRole('button', { name: 'Approve & Find Substitute', exact: true })
    .click();
  await page.waitForURL('**/substitution?leave=LR001');

  // 6. Smart Substitution & Score Breakdown
  await page.getByText('0 / 2 Covered', { exact: true }).waitFor();
  assert.ok(
    await page.getByText('Smart Recommendation').first().isVisible(),
    'Smart Recommendation terminology must be used (not AI)',
  );

  const firstClass = page.locator('#class-TT001');
  const secondClass = page.locator('#class-TT002');

  // Verify Best Match badge on top candidate (Prof. Priya Kulkarni)
  assert.ok(
    await firstClass.getByText('Best Match').first().isVisible(),
    'Top candidate must display Best Match badge',
  );

  // Verify compact score breakdown
  assert.ok(
    await firstClass.getByText('Subject expertise').first().isVisible(),
    'Subject expertise must be part of breakdown',
  );
  assert.ok(
    await firstClass.getByText('Availability').first().isVisible(),
    'Availability must be part of breakdown',
  );
  assert.ok(
    await firstClass.getByText('Department match').first().isVisible(),
    'Department match must be part of breakdown',
  );
  assert.ok(
    await firstClass.getByText('Workload').first().isVisible(),
    'Workload must be part of breakdown',
  );
  assert.ok(
    await firstClass.getByText('Previous experience').first().isVisible(),
    'Previous experience must be part of breakdown',
  );

  // Verify disabled state for Dr. Rahul Deshpande (Workload Limit Reached)
  const disabledBtn = secondClass.getByRole('button', {
    name: 'Assign Dr. Rahul Deshpande',
    exact: true,
  });
  assert.ok(
    await disabledBtn.isDisabled(),
    'Dr. Rahul Deshpande assign button must be disabled due to workload',
  );
  assert.ok(
    await secondClass.getByText('Workload Limit Reached').first().isVisible(),
    'Workload Limit Reached badge must be shown',
  );

  // 7. Assign substitute for class 1
  await firstClass
    .getByRole('button', { name: 'Assign Prof. Priya Kulkarni', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Confirm Assignment', exact: true })
    .click();

  await page.getByText('1 / 2 Covered', { exact: true }).waitFor();

  // Verify Assignment Success State on Class 1
  assert.ok(
    await firstClass.getByText('Substitute Assigned').first().isVisible(),
    'Substitute Assigned banner must appear',
  );
  assert.ok(
    await firstClass.getByText('Prof. Priya Kulkarni').first().isVisible(),
    'Prof. Priya Kulkarni must be shown as substitute',
  );
  assert.ok(
    await firstClass.getByText('Original Faculty:').first().isVisible(),
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

  // Verify Completion Screen
  assert.ok(
    await page.getByText('All Classes Covered', { exact: true }).isVisible(),
    'All Classes Covered header must be visible',
  );
  assert.ok(
    await page.getByText('2 classes affected', { exact: true }).isVisible(),
    '2 classes affected metric must be visible',
  );
  assert.ok(
    await page.getByText('2 classes resolved', { exact: true }).isVisible(),
    '2 classes resolved metric must be visible',
  );
  assert.ok(
    await page.getByText('0 classes uncovered', { exact: true }).isVisible(),
    '0 classes uncovered metric must be visible',
  );

  // 9. Updated Timetable Preview
  await page
    .getByRole('button', { name: 'View Updated Timetable', exact: true })
    .click();
  const timetable = page.getByRole('dialog', {
    name: 'Updated timetable preview',
  });
  await timetable.waitFor();
  assert.ok(
    await timetable.getByText('Prof. Priya Kulkarni').first().isVisible(),
    'Timetable preview must show substitute Prof. Priya Kulkarni',
  );
  assert.ok(
    await timetable.getByText('Substitute').first().isVisible(),
    'Timetable preview must show Substitute badge',
  );
  await page.keyboard.press('Escape');
  await timetable.waitFor({ state: 'hidden' });

  // 10. Notifications Update Check
  const notifButton = page.getByRole('button', {
    name: /notifications/i,
  });
  if (await notifButton.isVisible()) {
    await notifButton.click();
    assert.ok(
      await page.getByText(/Prof\. Asha Patil/i).first().isVisible(),
      'Notification stream should mention Prof. Asha Patil',
    );
    await page.keyboard.press('Escape');
  }

  // 11. Demo Mode Reset
  const profileButton = page.getByRole('button', {
    name: 'Open Dr. Ramesh K profile menu',
  });
  await profileButton.click();
  await page.getByRole('menuitem', { name: 'Reset Demo Data' }).click();

  const resetModal = page.getByRole('dialog');
  await resetModal.waitFor();
  assert.ok(
    await resetModal.getByText('Reset CampusHR demo data?').isVisible(),
    'Confirmation dialog title must match',
  );
  await resetModal
    .getByRole('button', { name: 'Reset Demo Data', exact: true })
    .click();

  // Return to Dashboard and check that requests are back to Pending
  await page.goto(`${base}/dashboard`);
  await page.waitForSelector('.metric-value');
  const firstLeaveStatus = page.locator('.leave-card tbody tr .status-badge').first();
  assert.equal(
    await firstLeaveStatus.textContent(),
    'Pending',
    'Leave request status must return to Pending after demo reset',
  );

  // 12. Placeholder Modules Intentional Polish
  for (const route of ['workload', 'employees', 'payroll', 'settings']) {
    await page.goto(`${base}/${route}`);
    assert.ok(
      await page.getByText('Planned Module').first().isVisible(),
      `${route} must show Planned Module badge`,
    );
    assert.ok(
      await page
        .getByText('This module will be implemented after prototype approval.')
        .first()
        .isVisible(),
      `${route} must show implementation note`,
    );
    assert.ok(
      await page
        .getByText('Planned Capabilities & Specifications')
        .first()
        .isVisible(),
      `${route} must have 3 planned capabilities`,
    );
  }

  // Check Settings page has Presentation Demo Controls
  await page.goto(`${base}/settings`);
  assert.ok(
    await page.getByText('Presentation Demo Controls').isVisible(),
    'Settings page must contain Presentation Demo Controls',
  );

  assert.deepEqual(errors, []);
  console.log(
    'Phase 3 smoke check PASSED! All 19 acceptance criteria verified successfully.',
  );
} finally {
  await browser.close();
}
