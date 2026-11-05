import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  checkPassword,
  checkUser,
  mockAuthApi,
} from './mock-api.js';

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
const outDir = '/Users/srujanmirji/.gemini/antigravity/brain/4ba2be78-4357-4308-8653-6f35d11631b0/screenshots/web';
mkdirSync(outDir, { recursive: true });

const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

await mockAuthApi(page, base);

try {
  console.log('Capturing 01-web-login.png...');
  await page.goto(`${base}/dashboard`);
  await page.waitForURL('**/login');
  await page.screenshot({ path: `${outDir}/01-web-login.png` });

  console.log('Logging in...');
  await page.getByLabel('Employee ID or college email').fill(checkUser.email);
  await page.getByLabel('Password', { exact: true }).fill(checkPassword);
  await page.getByRole('button', { name: 'Login', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.waitForURL('**/dashboard');
  await page.waitForSelector('.metric-value');

  console.log('Capturing 02-web-dashboard.png...');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${outDir}/02-web-dashboard.png` });

  console.log('Capturing 03-web-employees.png...');
  await page.goto(`${base}/employees`);
  await page.getByText('JCET-CSE-001').waitFor();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/03-web-employees.png` });

  console.log('Capturing 04-web-departments.png...');
  await page.goto(`${base}/departments`);
  await page.getByText('Computer Science & Engineering').first().waitFor();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/04-web-departments.png` });

  console.log('Capturing 05-web-attendance.png...');
  await page.goto(`${base}/attendance`);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${outDir}/05-web-attendance.png` });

  console.log('Capturing 06-web-documents.png...');
  await page.goto(`${base}/documents`);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${outDir}/06-web-documents.png` });

  console.log('Capturing 07-web-leave.png...');
  await page.goto(`${base}/leave?tab=mine`);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${outDir}/07-web-leave.png` });

  console.log('Capturing 07b-web-apply-leave.png...');
  const applyBtn = page.getByRole('button', { name: 'Apply for leave' });
  if (await applyBtn.isVisible()) {
    await applyBtn.click();
    await page.waitForTimeout(400);
    // Select OOD to show dynamic official duty fields and dynamic help
    const typeSelect = page.getByRole('combobox', { name: 'Leave type' });
    if (await typeSelect.isVisible()) {
      await typeSelect.click();
      await page.getByRole('option', { name: /OOD/i }).click();
      await page.waitForTimeout(300);
    }
    // Fill sample date overlapping timetable to show academic impact preview
    const startInput = page.getByLabel('Start date');
    if (await startInput.isVisible()) {
      await startInput.fill('2026-11-02');
      const endInput = page.getByLabel('End date');
      await endInput.fill('2026-11-02');
      await page.waitForTimeout(400);
    }
    await page.screenshot({ path: `${outDir}/07b-web-apply-leave.png` });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }

  console.log('Capturing 08-web-leave-details.png...');
  await page.goto(`${base}/leave?tab=requests&show=ALL`);
  await page.waitForTimeout(600);
  const viewLink = page.getByRole('button', { name: /Details|View/i }).first();
  if (await viewLink.isVisible()) {
    await viewLink.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${outDir}/08-web-leave-details.png` });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }

  console.log('Capturing 08b-web-leave-policies.png...');
  await page.goto(`${base}/leave?tab=types`);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${outDir}/08b-web-leave-policies.png` });

  console.log('Capturing 09-web-timetable.png...');
  await page.goto(`${base}/timetable`);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${outDir}/09-web-timetable.png` });

  console.log('Capturing 10-web-workload.png...');
  await page.goto(`${base}/workload`);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${outDir}/10-web-workload.png` });

  console.log('Capturing 11-web-substitution.png...');
  await page.goto(`${base}/substitution`);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${outDir}/11-web-substitution.png` });

  console.log('Capturing 12-web-reports.png...');
  await page.goto(`${base}/reports`);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${outDir}/12-web-reports.png` });

  console.log('Capturing 13-web-notifications.png...');
  await page.goto(`${base}/notifications`);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/13-web-notifications.png` });

  console.log('Capturing 14-web-settings.png...');
  await page.goto(`${base}/settings`);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/14-web-settings.png` });

  console.log('ALL WEB SCREENSHOTS CAPTURED SUCCESSFULLY!');
} finally {
  await browser.close();
}
