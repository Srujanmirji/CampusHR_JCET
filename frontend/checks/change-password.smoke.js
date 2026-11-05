import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { checkUser, checkPassword, mockAuthApi } from './mock-api.js';
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
  'Use a local preview with mocked authentication.',
);
try {
  for (const [width, height] of [
    [375, 667],
    [1280, 900],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      reducedMotion: 'reduce',
    });
    const api = await mockAuthApi(page, base);
    api.user = checkUser;
    await page.goto(base + '/dashboard');
    await page
      .getByRole('button', { name: `Open profile menu for ${checkUser.email}` })
      .click();
    await page.getByRole('menuitem', { name: 'Change password' }).click();
    const dialog = page.getByRole('dialog', { name: 'Change password' });
    await dialog.getByRole('list', { name: 'Password requirements' }).waitFor();
    const bounds = await dialog.boundingBox();
    assert(
      bounds.y >= 0 && bounds.height <= height - 30,
      'Change-password dialog must fit the viewport with breathing room',
    );
    const close = dialog.getByRole('button', { name: 'Close', exact: true });
    await close.scrollIntoViewIfNeeded();
    const closeBox = await close.boundingBox();
    assert(closeBox.height >= 44 && closeBox.width >= 44);
    await dialog
      .getByLabel('Current password', { exact: true })
      .fill(checkPassword);
    await dialog
      .getByLabel('New password', { exact: true })
      .fill('NoSymbolsHere123');
    await dialog
      .getByLabel('Repeat new password', { exact: true })
      .fill('NoSymbolsHere123');
    const change = dialog.getByRole('button', {
      name: 'Change password',
      exact: true,
    });
    assert(await change.isDisabled());
    await dialog
      .getByLabel('New password', { exact: true })
      .fill('FacultyReady42!');
    await dialog
      .getByLabel('Repeat new password', { exact: true })
      .fill('FacultyReady42!');
    assert(await change.isEnabled());
    await dialog
      .getByLabel('Current password', { exact: true })
      .fill('FacultyReady42!');
    assert(await change.isDisabled());
    await dialog
      .getByText('Choose a password different from your current one.')
      .waitFor();
    await dialog
      .getByLabel('Current password', { exact: true })
      .fill(checkPassword);
    await change.focus();
    assert.equal(
      await change.evaluate((e) => document.activeElement === e),
      true,
    );
    mkdirSync('design/password-recovery-2026-11-01', { recursive: true });
    await page.screenshot({
      path: `design/password-recovery-2026-11-01/change-password-${width}.png`,
    });
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await change.scrollIntoViewIfNeeded();
    const colors = await change.evaluate((e) => ({
      text: getComputedStyle(e).color,
      background: getComputedStyle(e).backgroundColor,
    }));
    assert.equal(colors.background, 'rgb(245, 245, 247)');
    assert.equal(colors.text, 'rgb(0, 0, 0)');
    await change.click();
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(api.passwordChanged, true);
    console.log(
      'PASS change-password: responsive dialog, composition checklist, reuse feedback, keyboard focus, dark theme, and mocked submit at',
      width,
    );
    await page.close();
  }
} finally {
  await browser.close();
}
