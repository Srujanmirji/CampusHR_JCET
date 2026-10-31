import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { apiUrl, checkUser, facultyUser, mockAuthApi } from './mock-api.js';
const require = createRequire(import.meta.url);
const bundled = join(
  homedir(),
  '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright',
);
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    (existsSync(bundled) ? bundled : 'playwright'),
);
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME_EXECUTABLE ||
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const base = process.env.PREVIEW_URL || 'http://localhost:5173';
const output = '/tmp/campushr-pull-ui';
mkdirSync(output, { recursive: true });
const zero = {
  headcount: {
    total: 0,
    teaching: 0,
    nonTeaching: 0,
    doctorates: 0,
    cadre: {
      professors: 0,
      associateProfessors: 0,
      assistantProfessors: 0,
      others: 0,
    },
  },
  attendance: {
    todayRate: 0,
    present: 0,
    absent: 0,
    late: 0,
    onLeave: 0,
    totalToday: 0,
    departmentAverages: [],
  },
  leave: { monthlyLeaveDays: 0, activeLeavesToday: 0, monthlyTrends: [] },
  continuity: {
    affectedClasses: 0,
    classesCovered: 0,
    coverageRate: 0,
    uncoveredClasses: 0,
  },
  workload: { normalLoadPercentage: 0, totalAudited: 0 },
};
try {
  for (const role of ['Principal', 'HOD', 'Faculty']) {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
      reducedMotion: 'reduce',
    });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const state = await mockAuthApi(page, base);
    state.user =
      role === 'Faculty'
        ? facultyUser
        : {
            ...checkUser,
            role,
            employeeId: facultyUser.employeeId,
            departmentId: 1,
          };
    let failed = false;
    let exports = 0;
    let summaries = 0;
    const cors = {
      'Access-Control-Allow-Origin': base,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    };
    await page.route(`${apiUrl}/reports/**`, async (route) => {
      const req = route.request();
      if (req.method() === 'OPTIONS')
        return route.fulfill({ status: 204, headers: cors });
      if (failed)
        return route.fulfill({
          status: 503,
          headers: cors,
          json: { error: { message: 'Unavailable' } },
        });
      const url = new URL(req.url());
      if (url.pathname.endsWith('/summary')) summaries++;
      assert.equal(
        req.headers().authorization,
        'Bearer check-token',
        'Exports and reports require the current access token',
      );
      if (url.searchParams.get('format') === 'csv') {
        exports++;
        if (exports === 1)
          return route.fulfill({
            status: 401,
            headers: cors,
            json: { error: { code: 'TOKEN_EXPIRED' } },
          });
        return route.fulfill({
          status: 200,
          headers: { ...cors, 'Content-Type': 'text/csv' },
          body: 'Name,Days\r\nTeacher,0',
        });
      }
      return route.fulfill({
        status: 200,
        headers: cors,
        json: {
          data: url.pathname.endsWith('/summary')
            ? zero
            : {
                summary: {
                  totalImpacted: 0,
                  covered: 0,
                  uncovered: 0,
                  coverageRate: 0,
                },
                records: [],
              },
        },
      });
    });
    await page.goto(`${base}/dashboard`);
    await page.locator('.metrics-grid').waitFor();
    if (role === 'Principal') {
      await page
        .getByText('Department Academic & Attendance Matrix', { exact: true })
        .waitFor();
      assert.equal(
        await page.locator('.metric-value').nth(0).textContent(),
        '0%',
      );
      assert.equal(
        await page.locator('.metric-value').nth(1).textContent(),
        '0%',
      );
      assert.equal(
        await page.getByText('6 / 6 NBA & AICTE', { exact: true }).count(),
        0,
      );
      const beforeRefresh = summaries;
      await page.getByRole('button', { name: 'Refresh dashboard' }).click();
      await page.locator('.metrics-grid').waitFor();
      assert.ok(
        summaries > beforeRefresh,
        'Refresh dashboard must refetch live summaries',
      );
    }
    if (role === 'HOD') {
      assert.equal(
        await page.getByText(/Prof. Asha Patil is on approved leave/).count(),
        0,
      );
    }
    for (const width of [375, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${role} overflow at ${width}`,
      );
      await page.screenshot({
        path: `${output}/${role}-${width}.png`,
        fullPage: true,
      });
    }
    const metric = page.locator('.metric-card').first();
    await metric.focus();
    await page.keyboard.press('Enter');
    await page.waitForURL('**/attendance');
    if (role === 'Principal') {
      await page.goto(`${base}/reports`);
      const report = page.getByRole('button', {
        name: /Academic Continuity Report/,
      });
      await report.waitFor();
      await report.focus();
      await page.keyboard.press('Enter');
      const dialog = page.getByRole('dialog');
      await dialog.waitFor();
      await page.emulateMedia({ media: 'print' });
      assert.equal(await page.locator('#root').isVisible(), false);
      assert.equal(
        await page.getByRole('button', { name: 'Print / PDF' }).isVisible(),
        false,
      );
      assert.equal(
        await dialog
          .getByRole('heading', { name: 'Academic Continuity Report' })
          .isVisible(),
        true,
      );
      await page.pdf({ path: `${output}/continuity.pdf` });
      await page.emulateMedia({ media: 'screen' });
      const download = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Export CSV / Excel' }).click();
      await download;
      assert.equal(
        exports,
        2,
        'An expired export renews and retries exactly once',
      );
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      for (const width of [375, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          JSON.stringify(
            await page.evaluate(() =>
              [...document.querySelectorAll('main *')]
                .filter(
                  (element) =>
                    element.getBoundingClientRect().right > innerWidth + 1,
                )
                .slice(0, 8)
                .map((element) => ({
                  tag: element.tagName,
                  class: element.className,
                  width: element.getBoundingClientRect().width,
                })),
            ),
          ),
        );
        await page.screenshot({
          path: `${output}/reports-${width}.png`,
          fullPage: true,
        });
      }
      failed = true;
      await page.reload();
      await page
        .getByRole('alert')
        .filter({ hasText: 'Reports could not be loaded' })
        .waitFor({ timeout: 15000 });
      failed = false;
      await page.getByRole('button', { name: 'Retry', exact: true }).click();
      await page
        .getByRole('alert')
        .filter({ hasText: 'Reports could not be loaded' })
        .waitFor({ state: 'hidden' });
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log(
    'Reports/dashboard regression passed: real zero values, no sample schedules, responsive layouts, keyboard navigation, authenticated CSV renewal and error/retry.',
  );
} finally {
  await browser.close();
}
