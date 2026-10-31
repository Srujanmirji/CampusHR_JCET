// Run only against home-preview.mjs: two disposable accounts, actual substitution service.
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
  output = '/tmp/campushr-ios008';
mkdirSync(output, { recursive: true });
const mode = async (name) =>
  assert.equal(
    (await globalThis.fetch(`${api}/test-mode/${name}`, { method: 'POST' }))
      .status,
    204,
  );
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
async function login(page, email = 'home-check@jcet.test') {
  await page.goto(base);
  await page
    .getByLabel('Employee ID or College Email', { exact: true })
    .fill(email);
  await page.getByLabel('Password', { exact: true }).fill('home-check-only');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page
    .getByRole('button', { name: 'Refresh all Home summaries', exact: true })
    .waitFor();
}
try {
  await mode('coverage-live');
  const nativeLogin = async (identifier) => {
    const response = await globalThis.fetch(`${api}/api/v1/auth/native/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password: 'home-check-only' }),
    });
    assert.equal(response.status, 200);
    return (await response.json()).accessToken;
  };
  const facultyToken = await nativeLogin('coverage-recipient@jcet.test');
  assert.equal(
    (
      await globalThis.fetch(`${api}/api/v1/substitution/assignments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${facultyToken}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
      })
    ).status,
    403,
  );
  const hodToken = await nativeLogin('home-check@jcet.test');
  assert.equal(
    (
      await globalThis.fetch(
        `${api}/api/v1/substitution/leave/acacacac-acac-4cac-8cac-acacacacacac`,
        { headers: { Authorization: `Bearer ${hodToken}` } },
      )
    ).status,
    404,
  );

  await login(page);
  await page.goto(`${base}/leave`);
  await page
    .getByRole('button', { name: 'Class coverage', exact: true })
    .click();
  const panel = page.getByTestId('coverage-panel');
  await panel.getByText('0 of 1 classes covered', { exact: true }).waitFor();
  assert.equal(
    await panel.getByRole('button', { name: /View classes for/ }).count(),
    1,
  );
  await panel
    .getByRole('button', { name: 'View classes for ABSENT001', exact: true })
    .click();
  const manage = panel.getByRole('button', {
    name: /^Manage \d{4}-\d{2}-\d{2} periods/,
  });
  await manage.click();
  await panel
    .getByRole('button', { name: 'Select Coverage Recipient', exact: true })
    .waitFor();
  assert.equal(
    await panel
      .getByRole('button', { name: 'Select Overloaded Faculty', exact: true })
      .isDisabled(),
    true,
  );
  await page.screenshot({ path: `${output}/coverage-375.png`, fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({
    path: `${output}/coverage-1280.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.keyboard.press('Control+Home');
  let stops = 0,
    inputs = 0;
  for (let i = 0; i < 32; i++) {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => {
      const el = globalThis.document.activeElement,
        css = globalThis.getComputedStyle(el);
      return {
        input: el.tagName === 'INPUT',
        button: el.getAttribute('role') === 'button',
        style: css.outlineStyle,
        width: css.outlineWidth,
        border: el.parentElement
          ? globalThis.getComputedStyle(el.parentElement).borderColor
          : '',
      };
    });
    if (focused.input) {
      inputs++;
      assert.equal(focused.border, 'rgb(5, 31, 91)');
    } else if (focused.button) {
      stops++;
      assert.notEqual(focused.style, 'none');
      assert.notEqual(focused.width, '0px');
    }
  }
  assert.ok(stops > 5 && inputs > 0);
  await mode('coverage-error');
  await panel
    .getByRole('button', { name: 'Refresh coverage', exact: true })
    .click();
  await panel
    .getByText('Candidate search temporarily unavailable.', { exact: true })
    .waitFor();
  await mode('coverage-ok');
  await panel
    .getByRole('button', { name: 'Refresh coverage', exact: true })
    .click();
  await panel
    .getByRole('button', { name: 'Select Coverage Recipient', exact: true })
    .waitFor();
  await panel
    .getByRole('button', { name: 'Select Coverage Recipient', exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `${output}/coverage-candidates.png`,
    fullPage: true,
  });

  await panel
    .getByRole('button', { name: 'Select Coverage Recipient', exact: true })
    .click();
  await panel
    .getByLabel('Coverage note', { exact: true })
    .fill('Cover the laboratory batch');
  await mode('coverage-refused');
  await panel
    .getByRole('button', { name: 'Confirm coverage', exact: true })
    .click();
  await panel
    .getByText('This candidate is no longer available. Refresh candidates.', {
      exact: true,
    })
    .waitFor();
  assert.equal(
    await panel.getByLabel('Coverage note', { exact: true }).inputValue(),
    'Cover the laboratory batch',
  );
  assert.equal(
    await panel
      .getByText('Coverage saved on the server.', { exact: true })
      .count(),
    0,
  );
  await mode('coverage-ok');
  await panel
    .getByRole('button', { name: 'Refresh coverage', exact: true })
    .click();
  await panel
    .getByRole('button', { name: 'Confirm coverage', exact: true })
    .click();
  await panel
    .getByText('Coverage saved on the server.', { exact: true })
    .waitFor();
  await panel.getByText('1 of 1 classes covered', { exact: true }).waitFor();
  const recipientContext = await browser.newContext({
      viewport: { width: 375, height: 812 },
    }),
    recipient = await recipientContext.newPage();
  recipient.on('pageerror', (error) => errors.push(error.message));
  await login(recipient, 'coverage-recipient@jcet.test');
  await recipient.getByText('Timetable', { exact: true }).last().click();
  const schedule = recipient.getByTestId('timetable-screen');
  await schedule.getByText(/Covering Absent Faculty/).waitFor();
  await recipient.screenshot({
    path: `${output}/recipient-duty.png`,
    fullPage: true,
  });
  await recipient.getByText('Leave', { exact: true }).last().click();
  await recipient.getByTestId('leave-screen').waitFor();
  assert.equal(
    await recipient
      .getByRole('button', { name: 'Class coverage', exact: true })
      .count(),
    0,
  );
  await recipient.getByText('Timetable', { exact: true }).last().click();
  await manage.click();
  await panel
    .getByRole('button', { name: 'Undo coverage', exact: true })
    .click();
  await panel
    .getByRole('button', { name: 'Confirm undo coverage', exact: true })
    .click();
  await panel.getByText(/Coverage removed/).waitFor();
  await panel.getByText('0 of 1 classes covered', { exact: true }).waitFor();
  await schedule
    .getByRole('button', { name: 'Refresh timetable', exact: true })
    .click();
  await schedule.getByText(/No regular classes/).waitFor();
  assert.equal(await schedule.getByText(/Covering Absent Faculty/).count(), 0);
  await manage.click();
  await panel
    .getByRole('button', { name: 'No substitute needed', exact: true })
    .click();
  await panel
    .getByLabel('Coverage note', { exact: true })
    .fill('Lab project work supervised separately');
  await panel
    .getByRole('button', { name: 'Confirm coverage', exact: true })
    .click();
  await panel
    .getByText('Coverage saved on the server.', { exact: true })
    .waitFor();
  await manage.click();
  await panel
    .getByRole('button', { name: 'Undo coverage', exact: true })
    .click();
  await mode('coverage-undo-uncertain');
  await panel
    .getByRole('button', { name: 'Confirm undo coverage', exact: true })
    .click();
  await panel.getByText(/Outcome unknown/).waitFor();
  await mode('coverage-ok');
  await panel
    .getByRole('button', { name: 'Check recorded coverage', exact: true })
    .click();
  await panel
    .getByText(
      'No coverage is currently recorded. Refresh candidates before assigning.',
      { exact: true },
    )
    .waitFor();
  await panel
    .getByRole('button', { name: 'Select Coverage Recipient', exact: true })
    .click();
  await panel
    .getByLabel('Coverage note', { exact: true })
    .fill('Retained unknown outcome note');
  await mode('coverage-uncertain');
  await panel
    .getByRole('button', { name: 'Confirm coverage', exact: true })
    .click();
  await panel.getByText(/Outcome unknown/).waitFor();
  await mode('coverage-ok');
  await panel
    .getByRole('button', { name: 'Check recorded coverage', exact: true })
    .click();
  await panel.getByText(/Recorded coverage: Coverage Recipient/).waitFor();
  await panel
    .getByText('Retained unknown outcome note', { exact: true })
    .waitFor();
  await schedule
    .getByRole('button', { name: 'Refresh timetable', exact: true })
    .click();
  await schedule.getByText(/Covering Absent Faculty/).waitFor();
  await recipientContext.close();
  assert.deepEqual(errors, []);
  globalThis.console.log(
    `Coverage UI passed: server scores, denied selection, real assignment/undo across two accounts, NOT_NEEDED, lost POST/DELETE outcomes, 375/1280 and keyboard focus. ${output}`,
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
