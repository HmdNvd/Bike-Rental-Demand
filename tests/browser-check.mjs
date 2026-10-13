import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const output = fileURLToPath(new URL('../submission/screenshots/', import.meta.url));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
const scenarios = [];

async function ready() {
  await page.getByRole('status').filter({ hasText: 'Forecast ready' }).waitFor();
  await page.getByRole('button', { name: 'Predict demand', exact: true }).waitFor();
}

try {
  await page.goto('http://127.0.0.1:8000', { waitUntil: 'networkidle' });
  assert.equal(await page.title(), 'Spoke — Bike demand studio');
  await ready();
  await page.getByRole('heading', { name: 'Predict the next ride.' }).waitFor();
  assert.equal(await page.locator('vite-error-overlay').count(), 0);
  await page.screenshot({ path: `${output}/01-application-ui.png`, fullPage: true });

  for (const [name, filename] of [['Morning commute', '02-morning-commute'], ['Rainy afternoon', '03-rainy-afternoon'], ['Weekend evening', '04-weekend-evening']]) {
    const responsePromise = page.waitForResponse(response => response.url().endsWith('/api/predict') && response.request().method() === 'POST');
    await page.getByRole('button', { name: new RegExp(name) }).click();
    const response = await responsePromise;
    assert.equal(response.status(), 200);
    const result = await response.json();
    await ready();
    await page.getByTestId('observation').waitFor();
    assert.equal(Number((await page.getByTestId('prediction').innerText()).replaceAll(',', '')), result.rentals);
    scenarios.push({ name, ...result, comparison: await page.getByTestId('observation').innerText() });
    await page.screenshot({ path: `${output}/${filename}.png`, fullPage: true });
  }

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download predictions as CSV' }).click();
  const download = await downloadPromise;
  await download.saveAs(`${output}/../sample-predictions.csv`);
  const csv = await readFile(`${output}/../sample-predictions.csv`, 'utf8');
  assert.equal(csv.split('\r\n').length, 25);
  assert.ok(csv.includes('observed_rentals'));

  await page.getByLabel('Hour', { exact: true }).selectOption('17');
  await page.getByRole('status').filter({ hasText: 'Inputs changed' }).waitFor();
  assert.equal(await page.getByTestId('observation').count(), 0);
  assert.ok(await page.getByRole('button', { name: 'Download predictions as CSV' }).isDisabled());
  await page.getByRole('switch', { name: 'Holiday' }).click();
  await page.getByRole('button', { name: 'Heavy', exact: true }).click();
  const holidayResponse = page.waitForResponse(response => response.url().endsWith('/api/predict') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Predict demand', exact: true }).click();
  const holiday = await (await holidayResponse).json();
  assert.equal(holiday.workingday, false);
  await ready();
  await page.getByText('Heavy weather has only a few training observations.', { exact: false }).waitFor();

  await page.getByLabel('Date', { exact: true }).fill('2026-10-13');
  await page.getByRole('button', { name: 'Predict demand', exact: true }).click();
  await ready();
  await page.getByText('This date is outside the 2011–2012 dataset.', { exact: false }).waitFor();
  await page.screenshot({ path: `${output}/05-new-date-heavy-weather.png`, fullPage: true });

  await page.getByRole('button', { name: 'Model notes', exact: true }).click();
  await page.getByRole('dialog').waitFor();
  await page.getByText('0.7138', { exact: true }).waitFor();
  await page.screenshot({ path: `${output}/06-model-notes.png`, fullPage: true });
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog').isVisible(), false);

  // Inject a service failure, then prove the existing output is marked stale and recovery works.
  await page.route('**/api/predict', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ detail: 'Test service unavailable' }) }));
  await page.getByRole('button', { name: 'Predict demand', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Test service unavailable' }).waitFor();
  assert.ok(await page.getByRole('button', { name: 'Download predictions as CSV' }).isDisabled());
  await page.getByRole('heading', { name: 'Last hourly forecast' }).waitFor();
  await page.unroute('**/api/predict');
  await page.getByRole('button', { name: 'Predict demand', exact: true }).click();
  await ready();
  // Expected HTTP 503 console entry belongs to the intentionally injected failure.
  const unexpectedErrors = errors.filter(error => !error.includes('503'));
  assert.deepEqual(unexpectedErrors, []);

  await page.getByRole('button', { name: /Morning commute/ }).click();
  await ready();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(async () => { window.scrollTo(0, 0); await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
  await page.screenshot({ path: `${output}/07-mobile.png`, fullPage: true });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.getByLabel('Humidity', { exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await page.getByRole('status').filter({ hasText: 'Inputs changed' }).waitFor();
  await page.getByRole('button', { name: 'Predict demand', exact: true }).click();
  await ready();
  await page.getByText('View hourly values', { exact: true }).click();
  assert.equal(await page.locator('tbody tr').count(), 24);
  await writeFile(`${output}/../scenario-results.json`, JSON.stringify({ scenarios, checks: ['Page identity', 'Nonblank app', 'No framework overlay', 'No unexpected console errors', 'Three real held-out predictions', 'CSV with 24 hours', 'Edited inputs marked stale', 'Holiday handling', 'Rare weather warning', 'Historical baseline warning', 'Accessible model dialog', 'Service failure and recovery', 'Mobile no overflow', 'Keyboard slider', '24-hour data table'], browser: 'Playwright Chromium', viewports: ['1440×1000', '390×844'] }, null, 2));
  console.log(JSON.stringify({ status: 'passed', screenshots: 7, predictions: scenarios.map(s => ({ name: s.name, rentals: s.rentals, comparison: s.comparison })), unexpectedErrors }, null, 2));
} finally {
  await browser.close();
}
