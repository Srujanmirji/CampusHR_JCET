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
  process.env.PLAYWRIGHT_MODULE ||
    (existsSync(bundled) ? bundled : 'playwright'),
);
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME_EXECUTABLE || (existsSync(chrome) ? chrome : undefined),
});
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:5175';
assert(
  ['localhost', '127.0.0.1'].includes(new URL(base).hostname),
  'Use a local preview; all recovery APIs are mocked.',
);
try {
  for (const width of [375, 1280]) {
    const page = await browser.newPage({
      viewport: { width, height: 900 },
      reducedMotion: 'reduce',
    });
    const runtimeErrors = [];
    page.on('pageerror', (e) => runtimeErrors.push(e.message));
    let confirms = 0;
    await page.route('**/api/v1/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      let status = 200,
        body;
      if (path.endsWith('/password-reset/options')) body = { enabled: true };
      else if (path.endsWith('/password-reset/request'))
        body = {
          challengeId: '6df85c9b-ff10-4b07-82d2-00ca6c43fb16',
          expiresIn: 600,
          resendAfter: 60,
          message: 'Request received',
        };
      else if (path.endsWith('/password-reset/confirm')) {
        confirms++;
        body = { passwordUpdated: true, message: 'Password updated' };
      } else {
        status = 401;
        body = { error: { code: 'UNAUTHORIZED', message: 'Sign in' } };
      }
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    });
    await page.goto(base + '/login');
    await page.getByRole('button', { name: 'Forgot password?' }).click();
    await page.getByLabel('Registered email').fill('fixture@jcet.test');
    await page.getByRole('button', { name: 'Send verification code' }).click();
    await page.getByLabel('Verification code').fill('123456');
    await page.getByLabel('New password', { exact: true }).fill('ElevenChars');
    await page.getByLabel('Repeat new password').fill('ElevenChars');
    await page
      .getByText('Add 1 more character to reach 12.')
      .waitFor({ timeout: 3000 });
    const update = page.getByRole('button', {
      name: 'Update password',
      exact: true,
    });
    assert(await update.isDisabled());
    assert.equal(confirms, 0);
    for (const weak of [
      'alllowercase123!',
      'ALLUPPERCASE123!',
      'NoDigitsHere!!',
      'NoSymbolsHere123',
    ]) {
      await page.getByLabel('New password', { exact: true }).fill(weak);
      await page.getByLabel('Repeat new password').fill(weak);
      assert(
        await update.isDisabled(),
        'missing character category must block submission',
      );
      assert.equal(confirms, 0);
    }
    await page
      .getByLabel('New password', { exact: true })
      .fill('FacultyReady42!');
    await page.getByText('Passwords do not match yet.').waitFor();
    assert(await update.isDisabled());
    await page.getByLabel('Repeat new password').fill('FacultyReady42!');
    await page.getByText('Passwords match.').waitFor();
    await page.getByText('All password requirements met.').waitFor();
    assert(await update.isEnabled());
    mkdirSync('design/password-recovery-2026-11-01', { recursive: true });
    await page.screenshot({
      path: `design/password-recovery-2026-11-01/password-validation-${width}.png`,
    });
    await update.click();
    await page.getByRole('button', { name: 'Back to sign in' }).waitFor();
    assert.equal(confirms, 1);
    assert.deepEqual(runtimeErrors, []);
    console.log(
      'PASS recovery: live password guidance, mismatch, valid submission at',
      width,
    );
    await page.close();
  }
} finally {
  await browser.close();
}
