// V2 visual and functional regression against the disposable loopback API only.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const {
  chromium,
} = require('/Users/srujanmirji/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base = 'http://127.0.0.1:8082',
  api = 'http://127.0.0.1:4011';
const out = '/tmp/campushr-v2-web';
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
const shot = async (name) => {
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
  assert.equal(
    await page.evaluate(
      () =>
        globalThis.document.documentElement.scrollWidth > globalThis.innerWidth,
    ),
    false,
    `${name} horizontal overflow`,
  );
  const controls = await page
    .locator(
      'button:not([disabled]),a[href],input,textarea,select,[role="tab"]',
    )
    .count();
  for (let n = 0; n < controls + 12; n++) {
    await page.keyboard.press('Tab');
    const focus = await page.evaluate(() => {
      const e = globalThis.document.activeElement;
      if (
        !e?.matches(
          'button,a,input,textarea,select,[role="tab"],[role="button"]',
        )
      )
        return null;
      const css = globalThis.getComputedStyle(e),
        parent =
          e.parentElement && globalThis.getComputedStyle(e.parentElement);
      return {
        name: e.getAttribute('aria-label') || e.textContent,
        visible:
          (css.outlineStyle !== 'none' && parseFloat(css.outlineWidth) > 0) ||
          parent?.borderColor === 'rgb(0, 11, 49)',
      };
    });
    if (focus)
      assert.equal(focus.visible, true, `${name}: focus on ${focus.name}`);
  }
};
const visit = async (path) => {
  await page.goto(base + path);
};
try {
  await mode('normal');
  await visit('/');
  await page
    .getByLabel('Employee ID or College Email', { exact: true })
    .waitFor();
  await shot('login-375');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.getByText('Enter your employee ID or college email.').waitFor();
  const identifierField = page.getByLabel('Employee ID or College Email', {
    exact: true,
  });
  assert.equal(await identifierField.getAttribute('aria-invalid'), 'true');
  const errorId = await identifierField.getAttribute('aria-describedby');
  assert.ok(errorId);
  assert.equal(
    await page
      .locator('[id]')
      .evaluateAll(
        (nodes, id) => nodes.find((n) => n.id === id)?.textContent,
        errorId,
      ),
    'Enter your employee ID or college email.',
  );
  await page
    .getByLabel('Employee ID or College Email', { exact: true })
    .fill('faculty-check@jcet.test');
  await page.getByLabel('Password', { exact: true }).fill('home-check-only');
  await page.getByLabel('Password', { exact: true }).press('Enter');
  await page.getByText("Today's Schedule", { exact: true }).waitFor();
  await shot('faculty-home-375');
  await page.setViewportSize({ width: 1280, height: 900 });
  await shot('faculty-home-1280');
  await page.setViewportSize({ width: 375, height: 900 });
  await page.getByRole('tab', { name: 'Timetable' }).click();
  await page.getByRole('tab', { name: 'Week', exact: true }).click();
  await shot('timetable-week');
  await page.getByRole('tab', { name: 'Today', exact: true }).click();
  await shot('timetable-today');
  await mode('attendance-live');
  await page.getByRole('tab', { name: 'Attendance', exact: true }).click();
  await page.getByRole('button', { name: 'Check in', exact: true }).click();
  await page
    .getByText('Check-in recorded by the server.', { exact: true })
    .waitFor();
  await page.getByText('Attendance', { exact: true }).first().waitFor();
  await shot('attendance');
  await mode('leave-live');
  await page.getByRole('tab', { name: 'Leave', exact: true }).click();
  await page.getByRole('button', { name: 'Apply for New Leave' }).waitFor();
  await shot('leave');
  await page.getByRole('button', { name: 'Apply for New Leave' }).click();
  await page.getByText('Apply for Leave', { exact: true }).waitFor();
  await shot('apply-leave');
  const leaveReason = page.getByLabel('Reason for Leave', { exact: true });
  assert.equal(await leaveReason.evaluate((node) => node.tagName), 'TEXTAREA');
  assert.equal(await leaveReason.getAttribute('maxlength'), '500');
  await leaveReason.fill('Faculty workshop');
  await leaveReason.press('End');
  await leaveReason.press('Enter');
  await leaveReason.press('A');
  assert.ok((await leaveReason.inputValue()).includes('\n'));
  await leaveReason.fill('');
  await page.getByRole('button', { name: 'Close leave application' }).click();
  await page.getByRole('tab', { name: 'Profile', exact: true }).click();
  await page
    .getByRole('button', { name: 'Personal Information', exact: true })
    .waitFor();
  await shot('profile');
  await page.getByRole('tab', { name: 'Notifications', exact: true }).click();
  await page
    .getByRole('button', { name: 'Notification Preferences', exact: true })
    .waitFor();
  await shot('profile-notifications');
  await page.getByRole('tab', { name: 'Security', exact: true }).click();
  await page
    .getByRole('button', { name: 'Privacy & Security', exact: true })
    .waitFor();
  await shot('profile-security');
  await page.getByRole('tab', { name: 'Academic', exact: true }).click();
  await page
    .getByRole('button', { name: 'Personal Information', exact: true })
    .click();
  await page.getByText('Loading employee record…').waitFor({ state: 'hidden' });
  await shot('personal-information');
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: 'Documents', exact: true }).click();
  await page.getByText('My documents', { exact: true }).waitFor();
  await shot('documents');
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByText('App Preferences', { exact: true }).waitFor();
  await shot('settings');
  await page
    .getByRole('button', { name: 'Change password', exact: true })
    .click();
  await page.getByLabel('Current password', { exact: true }).waitFor();
  await shot('password');
  await mode('notifications-live');
  await visit('/notifications');
  await page.getByText('Notifications', { exact: true }).first().waitFor();
  await shot('notifications');
  assert.equal(
    await page
      .getByRole('button', { name: 'Mark all read', exact: true })
      .isDisabled(),
    true,
  );
  const hodContext = await browser.newContext({
    viewport: { width: 375, height: 900 },
    reducedMotion: 'reduce',
  });
  const hod = await hodContext.newPage();
  hod.on('pageerror', (e) => errors.push(e.message));
  await mode('leave-live');
  await hod.goto(base);
  await hod
    .getByLabel('Employee ID or College Email', { exact: true })
    .fill('home-check@jcet.test');
  await hod.getByLabel('Password', { exact: true }).fill('home-check-only');
  await hod.getByRole('button', { name: 'Sign In', exact: true }).click();
  await hod.getByText('Your department today', { exact: true }).waitFor();
  await hod.screenshot({ path: out + '/hod-home.png', fullPage: true });
  assert.equal(
    await hod.getByRole('tab', { name: 'Attendance', exact: true }).count(),
    0,
  );
  assert.equal(
    await hod.getByRole('tab', { name: 'Leave', exact: true }).count(),
    0,
  );
  await hod.getByRole('tab', { name: 'Approvals', exact: true }).click();
  await hod
    .getByRole('button', { name: 'Review', exact: true })
    .first()
    .click();
  await hod.getByText('Leave Review', { exact: true }).waitFor();
  await hod
    .getByText('Loading balance…', { exact: true })
    .waitFor({ state: 'hidden' });
  await hod
    .getByText('Loading history…', { exact: true })
    .waitFor({ state: 'hidden' });
  await hod.screenshot({ path: out + '/hod-review.png', fullPage: true });
  await hod.getByRole('button', { name: 'Reject', exact: true }).click();
  await hod
    .getByRole('button', { name: 'Confirm Rejection', exact: true })
    .click();
  await hod.getByText(/Please provide a rejection reason/).waitFor();
  await hod.getByRole('button', { name: 'Close leave decision' }).click();
  await hod.getByRole('tab', { name: 'Workload', exact: true }).click();
  await hod.getByText('Department workload', { exact: true }).waitFor();
  await hod.getByText('Home Test', { exact: true }).waitFor();
  await hod.screenshot({ path: out + '/hod-workload.png', fullPage: true });
  await mode('notifications-live');
  await hod.goto(base + '/notifications');
  await hod.getByRole('button', { name: 'Mark all read', exact: true }).click();
  await hod.getByText('Notifications marked read.', { exact: true }).waitFor();
  await mode('coverage-live');
  await hod.goto(base + '/leave/coverage');
  await hod.getByText('Smart Coverage', { exact: true }).first().waitFor();
  await hod
    .getByRole('button', { name: /View classes for/ })
    .first()
    .click();
  await hod
    .getByRole('button', { name: /Manage .* periods/ })
    .first()
    .click();
  await hod.getByText('Available', { exact: true }).first().waitFor();
  await hod.screenshot({ path: out + '/smart-coverage.png', fullPage: true });
  assert.equal(await hod.getByText(/\d+ points/).count(), 0);
  hod.on('dialog', (dialog) => dialog.accept());
  await hod
    .getByRole('button', { name: 'Select Coverage Recipient', exact: true })
    .click();
  await hod
    .getByRole('button', { name: 'Confirm coverage', exact: true })
    .click();
  await hod.getByText('Coverage confirmed', { exact: true }).waitFor();
  await hod.screenshot({ path: out + '/coverage-success.png', fullPage: true });
  assert.equal(
    await hod.getByText('Notification sent', { exact: true }).count(),
    0,
  );
  await mode('coverage-live');
  await hod.goto(base + '/leave/coverage');
  await hod
    .getByRole('button', { name: /View classes for/ })
    .first()
    .click();
  await hod
    .getByRole('button', { name: /Manage .* periods/ })
    .first()
    .click();
  await hod
    .getByRole('button', { name: 'Select Coverage Recipient', exact: true })
    .click();
  await mode('coverage-uncertain');
  await hod
    .getByRole('button', { name: 'Confirm coverage', exact: true })
    .click();
  await hod.getByText(/Outcome unknown/).waitFor();
  assert.equal(
    await hod.getByText('Coverage confirmed', { exact: true }).count(),
    0,
  );
  assert.equal(
    await hod
      .getByRole('button', { name: 'Confirm coverage', exact: true })
      .and(hod.locator(':enabled'))
      .count(),
    0,
  );
  await mode('coverage-ok');
  await hod
    .getByRole('button', { name: 'Check recorded coverage', exact: true })
    .click();
  await hod.getByText(/Recorded coverage: Coverage Recipient/).waitFor();
  assert.deepEqual(errors, []);
  await hodContext.close();
  globalThis.console.log(
    'V2 Faculty/HOD navigation, login validation, five roots, real fixture-backed screens, native-flow counterparts, rejection validation, workload and non-gamified coverage, confirmed assignment and lost-response reconciliation passed; 375/1280 captures saved.',
  );
} finally {
  await browser.close();
}
