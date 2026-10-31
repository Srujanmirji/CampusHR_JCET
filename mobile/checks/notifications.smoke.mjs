// Disposable scoped notification service and real Socket.IO; no production data.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url),
  bundled = join(
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
  api = 'http://[::1]:4011',
  output = '/tmp/campushr-ios009';
mkdirSync(output, { recursive: true });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const mode = async (name) =>
  assert.equal(
    (await globalThis.fetch(`${api}/test-mode/${name}`, { method: 'POST' }))
      .status,
    204,
  );
const send = async (target) =>
  assert.equal(
    (
      await globalThis.fetch(`${api}/test-notifications/${target}`, {
        method: 'POST',
      })
    ).status,
    201,
  );
async function login(page, email = 'home-check@jcet.test') {
  await page.goto(base);
  await page
    .getByLabel('Employee ID or College Email', { exact: true })
    .fill(email);
  await page.getByLabel('Password', { exact: true }).fill('home-check-only');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page
    .getByRole('button', { name: 'Open notification inbox', exact: true })
    .click();
  await page
    .getByTestId('notifications-screen')
    .getByText('Live updates connected.', { exact: true })
    .waitFor();
}
try {
  await mode('notifications-live');
  await login(page);
  const inbox = page.getByTestId('notifications-screen');
  await inbox.getByText('23 unread', { exact: true }).waitFor();
  await inbox.getByText('Campus notice 01', { exact: true }).waitFor();
  assert.equal(
    await inbox
      .getByRole('button', {
        name: 'Open related screen for Untrusted link',
        exact: true,
      })
      .count(),
    0,
  );
  await page.screenshot({ path: `${output}/inbox-375.png`, fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: `${output}/inbox-1280.png`, fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 });
  await inbox
    .getByRole('button', { name: 'Load more notifications', exact: true })
    .click();
  await inbox.getByText('Campus notice 23', { exact: true }).waitFor();
  assert.equal(
    await inbox
      .getByRole('button', { name: 'Load more notifications', exact: true })
      .count(),
    0,
  );
  await page.keyboard.press('Control+Home');
  let stops = 0;
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => {
      const e = globalThis.document.activeElement,
        c = globalThis.getComputedStyle(e);
      return {
        button: e.getAttribute('role') === 'button',
        style: c.outlineStyle,
        width: c.outlineWidth,
      };
    });
    if (focused.button) {
      stops++;
      assert.notEqual(focused.style, 'none');
      assert.notEqual(focused.width, '0px');
    }
  }
  assert.ok(stops >= 8);
  await mode('notifications-refused');
  await inbox
    .getByRole('button', { name: 'Mark Campus notice 01 read', exact: true })
    .click();
  await inbox
    .getByText('Read update denied for this test.', { exact: true })
    .waitFor();
  assert.equal(
    await inbox
      .getByRole('button', { name: 'Mark Campus notice 01 read', exact: true })
      .count(),
    1,
  );
  await inbox.getByText('23 unread', { exact: true }).waitFor();
  await mode('notifications-ok');
  await inbox
    .getByRole('button', { name: 'Mark Campus notice 01 read', exact: true })
    .click();
  await inbox.getByText('22 unread', { exact: true }).waitFor();
  assert.equal(
    await inbox
      .getByRole('button', { name: 'Mark Campus notice 01 read', exact: true })
      .count(),
    0,
  );
  await inbox
    .getByRole('button', { name: 'Back to Home', exact: true })
    .click();
  await page
    .getByTestId('home-screen')
    .getByText('22 unread', { exact: true })
    .waitFor();
  await page
    .getByRole('button', { name: 'Open notification inbox', exact: true })
    .click();
  await inbox
    .getByRole('button', {
      name: 'Open related screen for Cover an assigned class',
      exact: true,
    })
    .click();
  await page.getByTestId('timetable-screen').waitFor();
  await page.getByText('Home', { exact: true }).last().click();
  await page
    .getByRole('button', { name: 'Open notification inbox', exact: true })
    .click();
  await inbox.getByText('21 unread', { exact: true }).waitFor();
  await inbox
    .getByRole('button', { name: 'Mark all read', exact: true })
    .click();
  await inbox.getByText('0 unread', { exact: true }).waitFor();
  const otherContext = await browser.newContext({
      viewport: { width: 375, height: 812 },
    }),
    other = await otherContext.newPage();
  await login(other, 'coverage-recipient@jcet.test');
  const otherInbox = other.getByTestId('notifications-screen');
  await otherInbox
    .getByText('Recipient only notice', { exact: true })
    .waitFor();
  assert.equal(
    await otherInbox.getByText('Campus notice 01', { exact: true }).count(),
    0,
  );
  await send('recipient');
  await otherInbox
    .getByText('Live update for recipient', { exact: true })
    .waitFor();
  await otherInbox.getByText('2 unread', { exact: true }).waitFor();
  await inbox.getByText('0 unread', { exact: true }).waitFor();
  assert.equal(
    await inbox.getByText('Live update for recipient', { exact: true }).count(),
    0,
  );
  await send('hod');
  await inbox.getByText('Live update for hod', { exact: true }).waitFor();
  await inbox.getByText('1 unread', { exact: true }).waitFor();
  assert.equal(
    await otherInbox.getByText('Live update for hod', { exact: true }).count(),
    0,
  );
  await mode('notifications-uncertain');
  await inbox
    .getByRole('button', { name: 'Mark Live update for hod read', exact: true })
    .click();
  await inbox
    .getByText('Read update response could not be confirmed.', { exact: true })
    .waitFor();
  await inbox.getByText('0 unread', { exact: true }).waitFor();
  await mode('notifications-ok');
  assert.equal(
    (
      await globalThis.fetch(`${api}/test-sockets/disconnect`, {
        method: 'POST',
      })
    ).status,
    204,
  );
  await send('hod');
  await inbox.getByText('Live updates connected.', { exact: true }).waitFor();
  await inbox.getByText('1 unread', { exact: true }).waitFor();
  await mode('notifications-error');
  await inbox
    .getByRole('button', { name: 'Refresh inbox', exact: true })
    .click();
  await inbox.getByText(/Notification inbox temporarily unavailable/).waitFor();
  await mode('notifications-ok');
  await inbox
    .getByRole('button', { name: 'Refresh inbox', exact: true })
    .click();
  await inbox.getByText('Campus notice 01', { exact: true }).waitFor();
  await otherContext.close();
  // Actual server ownership enforcement, including a forged known ID belonging to another account.
  const tokenFor = async (identifier) => {
    const r = await globalThis.fetch(`${api}/api/v1/auth/native/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password: 'home-check-only' }),
    });
    assert.equal(r.status, 200);
    return (await r.json()).accessToken;
  };
  const recipientToken = await tokenFor('coverage-recipient@jcet.test'),
    hodToken = await tokenFor('home-check@jcet.test');
  const owned = await (
    await globalThis.fetch(`${api}/api/v1/notifications`, {
      headers: { Authorization: `Bearer ${recipientToken}` },
    })
  ).json();
  assert.equal(
    (
      await globalThis.fetch(
        `${api}/api/v1/notifications/${owned.data[0].id}/read`,
        { method: 'PATCH', headers: { Authorization: `Bearer ${hodToken}` } },
      )
    ).status,
    404,
  );
  // Browser restart retains server read state, without saving credentials in browser storage.
  await page.reload();
  await inbox.getByText('1 unread', { exact: true }).waitFor();
  assert.equal(
    await inbox
      .getByRole('button', { name: 'Mark Campus notice 01 read', exact: true })
      .count(),
    0,
  );
  const adminContext = await browser.newContext(),
    admin = await adminContext.newPage();
  await login(admin, 'no-employee@jcet.test');
  await admin
    .getByTestId('notifications-screen')
    .getByText('Administrator notice', { exact: true })
    .waitFor();
  await adminContext.close();
  assert.deepEqual(errors, []);
  globalThis.console.log(
    `Notifications passed: pagination, read/read-all persistence, unsafe links, permission-scoped routing, live unread/room isolation/reconnect, refused/lost updates, no-employee inbox, 375/1280 and keyboard focus. ${output}`,
  );
} catch (error) {
  await page.screenshot({ path: `${output}/failure.png`, fullPage: true });
  globalThis.console.error(
    (await page.locator('body').innerText()).slice(-6000),
  );
  throw error;
} finally {
  await browser.close();
}
