// Web guard and Profile layout only; remote APNs delivery needs a signed iPhone build.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { existsSync, mkdirSync } from 'node:fs';
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
const errors = [],
  pushRequests = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('request', (request) => {
  if (request.url().includes('/notifications/push'))
    pushRequests.push(request.url());
});
const output = '/tmp/campushr-ios010';
mkdirSync(output, { recursive: true });
try {
  await globalThis.fetch('http://[::1]:4011/test-mode/normal', {
    method: 'POST',
  });
  await page.goto('http://[::1]:8081');
  await page
    .getByLabel('Employee ID or College Email', { exact: true })
    .fill('home-check@jcet.test');
  await page.getByLabel('Password', { exact: true }).fill('home-check-only');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.getByText('6.5 days', { exact: true }).waitFor();
  await page.getByText('Profile', { exact: true }).click();
  const screen = page.getByTestId('profile-screen');
  await screen.getByText('Remote notifications', { exact: true }).waitFor();
  await screen
    .getByText(/Remote alerts need a signed development build/)
    .waitFor();
  assert.equal(
    await screen
      .getByRole('button', { name: /Enable remote alerts|test notification/i })
      .count(),
    0,
  );
  for (const width of [375, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          globalThis.requestAnimationFrame(() =>
            globalThis.requestAnimationFrame(resolve),
          ),
        ),
    );
    assert.equal(
      await page.evaluate(
        () =>
          globalThis.document.documentElement.scrollWidth >
          globalThis.innerWidth,
      ),
      false,
    );
    await page.screenshot({
      path: `${output}/profile-${width}.png`,
      fullPage: true,
    });
  }
  const logout = screen.getByRole('button', { name: 'Sign Out', exact: true });
  await logout.focus();
  assert.ok(
    await logout.evaluate(
      (element) =>
        parseFloat(globalThis.getComputedStyle(element).outlineWidth) >= 2,
    ),
  );
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Sign In', exact: true }).waitFor();
  assert.deepEqual(pushRequests, []);
  assert.deepEqual(errors, []);
  globalThis.console.log(
    'Push guard/Profile passed: 375/1280, focus/logout, explicit unsupported state, no simulated success or web device registration.',
  );
} finally {
  await browser.close();
}
