import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(
  join(
    homedir(),
    '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright',
  ),
);
const browser = await chromium.launch({
  headless: true,
  executablePath:
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4182';
const out = fileURLToPath(new URL('./screenshots/', import.meta.url));
await mkdir(out, { recursive: true });
const page = await browser.newPage({
  viewport: { width: 375, height: 900 },
  deviceScaleFactor: 2,
  reducedMotion: 'reduce',
});
page.setDefaultTimeout(12000);
const errors = [],
  external = [],
  writes = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('request', (request) => {
  if (!request.url().startsWith(base)) external.push(request.url());
  if (request.method() !== 'GET') writes.push(request.method());
});
const ids = [
  'login',
  'home',
  'today',
  'week',
  'attendance',
  'leave',
  'apply',
  'detail',
  'notifications',
  'profile',
  'settings',
  'password',
];
const manifest = [];
const settle = async () => {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
};
try {
  for (const width of [375, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const id of ids) {
      await page.goto(`${base}/?screen=${id}`);
      await settle();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `${id} overflow at ${width}`,
      );
      const issues = await page
        .locator(
          '#app button:not([disabled]),#app a,#app input:not([type=checkbox]):not([type=file]),#app select,#app textarea',
        )
        .evaluateAll((elements) =>
          elements
            .filter((el) => !el.closest('[inert]'))
            .filter((el) => {
              const r = el.getBoundingClientRect();
              return (
                r.width > 0 &&
                r.height > 0 &&
                (r.width < 47.9 || r.height < 47.9)
              );
            })
            .map(
              (el) =>
                `${el.tagName}: ${el.getAttribute('aria-label') || el.textContent.trim()}`,
            ),
        );
      assert.deepEqual(issues, [], `${id} touch targets at ${width}`);
      if (width === 375) {
        const controls = page.locator(
          '#app a[href], #app button, #app input, #app select, #app textarea',
        );
        const count = await controls.evaluateAll(
          (elements) =>
            elements.filter(
              (el) =>
                !el.closest('[inert]') &&
                !el.disabled &&
                el.tabIndex >= 0 &&
                el.getBoundingClientRect().width > 0,
            ).length,
        );
        const first = await controls.evaluateAll((elements) =>
          elements.findIndex(
            (el) =>
              !el.closest('[inert]') &&
              !el.disabled &&
              el.tabIndex >= 0 &&
              el.getBoundingClientRect().width > 0,
          ),
        );
        await controls.nth(first).focus();
        const seen = new Set();
        for (let stop = 0; stop < count * 6; stop++) {
          const focus = await controls.evaluateAll((elements) => {
            const current = document.activeElement;
            if (!document.querySelector('#app').contains(current)) return null;
            const parent = current.closest('.attachment-label');
            return {
              index: elements.indexOf(current),
              outline: getComputedStyle(parent || current).outlineWidth,
            };
          });
          if (!focus) break;
          assert.ok(
            parseFloat(focus.outline) >= 2,
            `${id}: visible keyboard focus`,
          );
          if (focus.index >= 0) seen.add(focus.index);
          await page.keyboard.press('Tab');
          if (seen.size === count) break;
        }
        assert.equal(
          seen.size,
          count,
          `${id}: keyboard reaches every action/field`,
        );
      }
    }
    await page.goto(`${base}/?screen=home`);
    await settle();
    await page.screenshot({
      path: join(out, `preview-${width}.png`),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 390, height: 900 });
  for (const id of ids) {
    await page.goto(`${base}/?capture=1&screen=${id}`);
    await settle();
    const device = page.locator('.device');
    const rect = await device.boundingBox();
    assert.equal(rect.width, 390);
    await device.screenshot({ path: join(out, `${id}.png`) });
    manifest.push({
      id,
      width: 390,
      height: Math.ceil(rect.height),
      file: `screenshots/${id}.png`,
    });
  }
  // Actual prototype behavior, not screenshots alone.
  await page.goto(`${base}/?screen=week`);
  await page
    .getByRole('button', { name: 'Thursday, 22 October', exact: true })
    .click();
  assert.equal(await page.locator('#day-schedule .schedule-row').count(), 2);
  assert.equal(
    await page
      .locator('#day-schedule')
      .getByText('Computer Networks', { exact: true })
      .count(),
    0,
  );
  await page
    .getByRole('button', { name: 'Saturday, 24 October', exact: true })
    .click();
  assert.equal(await page.locator('#day-schedule .schedule-row').count(), 1);
  await page.goto(`${base}/?screen=leave`);
  await page.getByRole('button', { name: 'Rejected', exact: true }).click();
  assert.equal(await page.locator('.request-row').count(), 1);
  await page.locator('.request-row').click();
  await page.getByText('No substitution required.', { exact: true }).waitFor();
  await page.goto(`${base}/?screen=apply`);
  assert.equal(await page.locator('#academic-impact .impact-row').count(), 2);
  await page
    .getByRole('switch', { name: 'Half-day leave', exact: true })
    .click();
  assert.equal(await page.locator('#academic-impact .impact-row').count(), 1);
  await page.locator('#reason').fill('<script>unsafe-example</script>');
  await page
    .getByRole('switch', { name: 'Half-day leave', exact: true })
    .click();
  assert.equal(
    await page.locator('#reason').inputValue(),
    '<script>unsafe-example</script>',
  );
  assert.equal(await page.locator('#app script').count(), 0);
  await page
    .getByRole('button', { name: 'Submit Request', exact: true })
    .click();
  await page
    .getByRole('status')
    .getByText(/Submission preview only/)
    .waitFor();
  assert.equal(await page.evaluate(() => localStorage.length), 0);
  await page.goto(`${base}/?screen=notifications`);
  await page.getByRole('button', { name: 'Substitution', exact: true }).click();
  assert.equal(await page.locator('.feed-row').count(), 1);
  await page
    .getByRole('button', { name: 'Mark all read', exact: true })
    .click();
  assert.equal(await page.locator('.feed-row.unread').count(), 0);
  await page.goto(`${base}/?screen=login`);
  await page
    .getByLabel('Employee ID / College Email', { exact: true })
    .fill('preview-only@jcet.test');
  await page
    .getByLabel('Password', { exact: true })
    .fill('preview-only-not-a-login');
  await page
    .getByRole('button', { name: 'Show password', exact: true })
    .click();
  assert.equal(await page.locator('#password').getAttribute('type'), 'text');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByText('Starts in 42 min', { exact: true }).waitFor();
  assert.equal(await page.locator('input[type=password]').count(), 0);
  await page.goto(`${base}/?screen=login`);
  await page
    .getByRole('link', { name: 'Forgot password?', exact: true })
    .click();
  await page.getByRole('dialog').waitFor();
  const controls = page.getByRole('dialog').locator('button');
  await controls.last().focus();
  await page.keyboard.press('Tab');
  assert.equal(
    await controls.first().evaluate((el) => el === document.activeElement),
    true,
    'Sheet keyboard focus wraps',
  );
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  await page.locator('#login-form').waitFor();
  assert.equal(
    await page
      .getByRole('link', { name: 'Forgot password?', exact: true })
      .evaluate((el) => el === document.activeElement),
    true,
    'Sheet dismissal restores invoking link focus',
  );
  // Keyboard only traversal of the complete form, no skipped focus stops.
  await page.locator('#identifier').focus();
  for (let i = 0; i < 7; i++) {
    const info = await page.evaluate(() => ({
      tag: document.activeElement.tagName,
      outline: getComputedStyle(document.activeElement).outlineWidth,
    }));
    assert.ok(parseFloat(info.outline) >= 2, `Missing focus on ${info.tag}`);
    await page.keyboard.press('Tab');
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  assert.deepEqual(writes, []);
  await writeFile(
    join(out, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  console.log(
    '12 faculty screens passed at 375/1280; local assets, 48-point targets, week/day updates, filters, half-day impact, safe form data, modal focus/escape, keyboard focus, no network writes.',
  );
} catch (error) {
  await page.screenshot({ path: join(out, 'failure.png'), fullPage: true });
  throw error;
} finally {
  await browser.close();
}
