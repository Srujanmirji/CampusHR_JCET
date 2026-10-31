// Run against home-preview.mjs; never a production account.
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
    globalThis.process.env.CHROME_EXECUTABLE ||
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const page = await browser.newPage({
  viewport: { width: 375, height: 812 },
  reducedMotion: 'reduce',
});
const base = 'http://[::1]:8081';
const api = 'http://[::1]:4011';
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const mode = async (value) => {
  assert.equal(
    (await globalThis.fetch(`${api}/test-mode/${value}`, { method: 'POST' }))
      .status,
    204,
  );
};
const output =
  globalThis.process.env.HOME_SCREENSHOTS || '/tmp/campushr-ios005';
mkdirSync(output, { recursive: true });
try {
  await mode('normal');
  await page.goto(base);
  await page
    .getByLabel('Employee ID or College Email', { exact: true })
    .fill('home-check@jcet.test');
  await page.getByLabel('Password', { exact: true }).fill('home-check-only');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.getByText('6.5 days', { exact: true }).waitFor();
  await page
    .getByRole('button', { name: 'Timetable', exact: true })
    .first()
    .click();
  const screen = page.getByTestId('timetable-screen');
  await screen.getByText(/2 slots · 1 substitution duty/).waitFor();
  await screen.getByText(/Batch A2/).waitFor();
  await page.screenshot({
    path: `${output}/timetable-375.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({
    path: `${output}/timetable-1280.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 375, height: 812 });
  assert.equal(
    await page.evaluate(
      () =>
        globalThis.document.documentElement.scrollWidth >
        globalThis.window.innerWidth,
    ),
    false,
  );
  await page.getByRole('tab', { name: 'Full Week', exact: true }).click();
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const date = new Date(`${today}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 7);
  const next = date.toISOString().slice(0, 10);
  await page.getByRole('button', { name: 'Next week', exact: true }).click();
  await screen
    .getByText(new RegExp(`1 slot · 0 substitution duties for ${next}`))
    .waitFor();
  assert.equal(await screen.getByText(/Covering Absent Faculty/).count(), 0);
  assert.equal(
    await screen.getByText(/In progress|Completed/).count(),
    0,
    'future regular class has no live status',
  );
  await page.screenshot({
    path: `${output}/timetable-next-week.png`,
    fullPage: true,
  });
  await page.getByRole('tab', { name: 'Today', exact: true }).click();
  await screen.getByText(/2 slots · 1 substitution duty/).waitFor();
  await mode('duties-error');
  await page
    .getByRole('button', { name: 'Refresh timetable', exact: true })
    .click();
  await screen.getByText(/Substitution duties could not be loaded/).waitFor();
  assert.equal(
    await screen
      .getByText('BCS501 · Database Management Systems', { exact: true })
      .count(),
    1,
  );
  assert.equal(await screen.getByText(/Covering Absent Faculty/).count(), 0);
  await page.screenshot({
    path: `${output}/timetable-duty-error.png`,
    fullPage: true,
  });
  await mode('normal');
  await page.getByRole('button', { name: 'Retry duties', exact: true }).click();
  await screen.getByText(/2 slots · 1 substitution duty/).waitFor();
  await mode('bad-duty-periods');
  await page
    .getByRole('button', { name: 'Refresh timetable', exact: true })
    .click();
  await screen.getByText(/Substitution duties could not be loaded/).waitFor();
  assert.equal(
    await screen
      .getByText('BCS501 · Database Management Systems', { exact: true })
      .count(),
    1,
  );
  await mode('duties-undone');
  await page.getByRole('button', { name: 'Retry duties', exact: true }).click();
  await screen.getByText(/1 slot · 0 substitution duties/).waitFor();
  await mode('timetable-error');
  await page
    .getByRole('button', { name: 'Refresh timetable', exact: true })
    .click();
  await screen.getByText(/Could not load your schedule/).waitFor();
  assert.equal(
    await screen
      .getByText('BCS501 · Database Management Systems', { exact: true })
      .count(),
    0,
  );
  assert.equal(
    await screen.getByText(/No regular classes/).count(),
    0,
    'failure is not an empty schedule',
  );
  await mode('empty');
  await page
    .getByRole('button', { name: 'Retry timetable', exact: true })
    .click();
  await screen.getByText(/No regular classes/).waitFor();
  await mode('normal');
  await page
    .getByRole('button', { name: 'Refresh timetable', exact: true })
    .click();
  await screen.getByText(/2 slots · 1 substitution duty/).waitFor();
  // Every control is keyboard reachable with visible focus.
  const labels = new Set();
  for (let i = 0; i < 18; i++) {
    await page.keyboard.press('Tab');
    const focus = await page.evaluate(() => {
      const el = globalThis.document.activeElement;
      const css = globalThis.getComputedStyle(el);
      return {
        tag: el.tagName,
        label: el.getAttribute('aria-label') || el.textContent,
        outline: css.outlineStyle,
        width: css.outlineWidth,
      };
    });
    if (focus.tag !== 'BODY') {
      labels.add(focus.label);
      assert.ok(
        focus.outline !== 'none' && focus.width !== '0px',
        `Invisible focus: ${focus.label}`,
      );
    }
  }
  assert.ok(labels.size >= 5);
  assert.deepEqual(errors, []);
  globalThis.console.log(
    'Timetable UI passed: dated lab, exact-date week navigation, independent duty failure/retry, bad timings, undo refresh, empty and regular error states, 375/1280 and keyboard focus.',
  );
} finally {
  await mode('normal');
  await browser.close();
}
