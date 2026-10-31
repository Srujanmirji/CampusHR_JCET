import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { apiUrl, checkPassword, checkUser, mockAuthApi } from './mock-api.js';
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
const page = await browser.newPage({
  viewport: { width: 1280, height: 900 },
  reducedMotion: 'reduce',
});
const base = 'http://localhost:5173',
  id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const employee = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  employeeCode: 'DOC001',
  firstName: 'Document',
  lastName: 'Test',
  department: { id: 1, name: 'Computer Science', code: 'CSE' },
};
const row = {
  id,
  employeeId: employee.id,
  category: 'ACADEMIC',
  title: 'Private certificate',
  documentType: 'Degree',
  fileUrl: '/uploads/documents/private.png',
  fileName: 'certificate.png',
  fileSize: 68,
  mimeType: 'image/png',
  status: 'VERIFIED',
  createdAt: '2026-10-22T00:00:00Z',
  updatedAt: '2026-10-22T00:00:00Z',
  employee,
};
const content = 'BT /F1 18 Tf 40 100 Td (Synthetic private document) Tj ET';
const objects = [
  '<< /Type /Catalog /Pages 2 0 R >>',
  '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
];
let pdfText = '%PDF-1.4\n';
const offsets = [0];
for (const [i, object] of objects.entries()) {
  offsets.push(Buffer.byteLength(pdfText));
  pdfText += `${i + 1} 0 obj\n${object}\nendobj\n`;
}
const xref = Buffer.byteLength(pdfText);
pdfText += `xref\n0 6\n0000000000 65535 f \n${offsets
  .slice(1)
  .map((offset) => String(offset).padStart(10, '0') + ' 00000 n ')
  .join('\n')}\ntrailer\n<< /Root 1 0 R /Size 6 >>\nstartxref\n${xref}\n%%EOF`;
const pdfBytes = Buffer.from(pdfText);
checkUser.permissions.push(
  'document.read.all',
  'document.upload.own',
  'document.verify.all',
);
await mockAuthApi(page, base);
let pdf = false;
let denied = false,
  contentCalls = 0,
  pending;
const downloads = [];
page.on('download', (value) => downloads.push(value));
await page.route(`${apiUrl}/documents**`, async (route) => {
  const path = new URL(route.request().url()).pathname;
  if (path.endsWith('/content')) {
    assert.ok(route.request().headers().authorization?.startsWith('Bearer '));
    contentCalls++;
    if (pending) {
      pending.started();
      await pending.promise;
    }
    return route.fulfill(
      denied
        ? {
            status: 403,
            json: {
              error: { code: 'FORBIDDEN', message: 'Permission denied.' },
            },
          }
        : {
            contentType: pdf ? 'application/pdf' : 'image/png',
            body: pdf
              ? pdfBytes
              : Buffer.from(
                  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jK1cAAAAASUVORK5CYII=',
                  'base64',
                ),
          },
    );
  }
  return route.fulfill({
    json: path.endsWith('pending-count')
      ? { data: { count: 0 } }
      : {
          data: [
            pdf
              ? {
                  ...row,
                  title: 'Private PDF',
                  mimeType: 'application/pdf',
                  fileName: 'certificate.pdf',
                }
              : row,
          ],
          page: 1,
          total: 1,
          totalPages: 1,
        },
  });
});
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
try {
  await page.goto(`${base}/login`);
  await page.getByLabel('Employee ID or college email').fill(checkUser.email);
  await page.getByLabel('Password', { exact: true }).fill(checkPassword);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.waitForURL('**/dashboard');
  await page.goto(`${base}/documents`);
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('img', { name: row.title, exact: true }).waitFor();
  const url = await dialog.getByRole('img').getAttribute('src');
  await page.keyboard.press('Escape');
  assert.equal(
    await page.evaluate(async (source) => {
      try {
        await fetch(source);
        return false;
      } catch {
        return true;
      }
    }, url),
    true,
  );
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  assert.equal((await download).suggestedFilename(), 'certificate.png');
  denied = true;
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await dialog.getByRole('alert').waitFor();
  denied = false;
  await dialog.getByRole('button', { name: 'Retry preview' }).click();
  await dialog.getByRole('img').waitFor();
  await page.keyboard.press('Escape');
  pdf = true;
  await page.reload();
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  const pdfFrame = page.locator('iframe[title="Private PDF"]');
  await pdfFrame.waitFor();
  assert.equal(await pdfFrame.getAttribute('sandbox'), null);
  const pdfBlob = await pdfFrame.getAttribute('src');
  assert.equal(
    await page.evaluate(
      async (url) => (await (await fetch(url)).blob()).type,
      pdfBlob,
    ),
    'application/pdf',
  );
  await page
    .frameLocator('iframe[title="Private PDF"]')
    .locator('link[href*="pdf_embedder.css"]')
    .waitFor({ state: 'attached' });
  await dialog.evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished)),
  );
  await page.screenshot({ path: '/tmp/campushr-ios011/web-pdf.png' });
  await page.keyboard.press('Escape');
  pdf = false;
  await page.reload();
  let release, started;
  const startedPromise = new Promise((resolve) => {
    started = resolve;
  });
  pending = {
    promise: new Promise((resolve) => {
      release = resolve;
    }),
    started,
  };
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  await startedPromise;
  await page
    .getByRole('button', { name: `Open profile menu for ${checkUser.email}` })
    .click();
  await page.getByRole('menuitem', { name: 'Logout', exact: true }).click();
  await page.waitForURL('**/login');
  const lateDownload = page.waitForEvent('download', { timeout: 1500 }).then(
    () => true,
    () => false,
  );
  release();
  assert.equal(await lateDownload, false);
  assert.equal(downloads.length, 1);
  assert.ok(contentCalls >= 5);
  assert.deepEqual(errors, []);
  console.log(
    'Web document preview/download passed: Bearer-authenticated content, revoked preview, denied/retry state, named download.',
  );
} finally {
  await browser.close();
}
