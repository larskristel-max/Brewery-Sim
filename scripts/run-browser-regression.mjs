import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const port = Number(process.env.BROWSER_TEST_PORT ?? 4183);
const baseUrl = `http://127.0.0.1:${port}/`;

const server = spawn(process.execPath, ['scripts/dev-server.mjs'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe']
});

const waitForServer = async () => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 15000) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Timed out waiting for Brewery Sim dev server at ${baseUrl}`);
};

const openOps = async (page) => {
  if ((await page.locator('.ops-menu').count()) === 0) {
    await page.locator('.ops-button').click();
  }
};

const endDay = async (page) => {
  await openOps(page);
  await page.getByRole('button', { name: 'Time End day' }).click();
};

const visibleText = async (page) => page.locator('body').innerText();

try {
  await waitForServer();

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
  await page.goto(baseUrl);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await assert.doesNotReject(page.locator('.garage-scene').waitFor({ state: 'visible', timeout: 5000 }));
  assert.match(await visibleText(page), /May 16/i);
  assert.equal(await page.locator('.case-hotspot').count(), 0, 'fresh game should not show sellable cases');

  await page.locator('.hotspot-kettle').click();
  await assert.doesNotReject(page.getByRole('dialog', { name: 'Recipe / Brew' }).waitFor({ state: 'visible', timeout: 5000 }));
  await page.locator('.recipe-card').filter({ hasText: 'Garage Blonde' }).getByRole('button', { name: 'Brew' }).click();
  await assert.doesNotReject(page.getByText('Transfer waiting').waitFor({ state: 'visible', timeout: 5000 }));
  assert.equal(await page.locator('.case-hotspot').count(), 0, 'cases should stay hidden while beer is not sellable');

  await page.locator('.hotspot-fermenter').click();
  await assert.doesNotReject(page.getByText('18 C fermentation').waitFor({ state: 'visible', timeout: 5000 }));

  for (let day = 0; day < 8 && !(await page.getByText('2 cases waiting').isVisible()); day += 1) {
    await endDay(page);
  }
  await assert.doesNotReject(page.getByText('2 cases waiting').waitFor({ state: 'visible', timeout: 5000 }));
  assert.equal(await page.locator('.case-hotspot').count(), 0, 'cases should stay hidden while packaging is waiting');

  await page.locator('.hotspot-bottler').click();
  await assert.doesNotReject(page.getByText('Conditioning').waitFor({ state: 'visible', timeout: 5000 }));
  assert.equal(await page.locator('.case-hotspot').count(), 0, 'cases should stay hidden during bottle conditioning');

  for (let day = 0; day < 3 && (await page.locator('.case-hotspot').count()) === 0; day += 1) {
    await endDay(page);
  }
  await assert.doesNotReject(page.locator('.case-hotspot').waitFor({ state: 'visible', timeout: 5000 }));
  await page.locator('.case-hotspot').click();
  await assert.doesNotReject(page.getByRole('button', { name: /Friends and family/ }).waitFor({ state: 'visible', timeout: 5000 }));
  await page.getByRole('button', { name: /Friends and family/ }).click();

  assert.match(await visibleText(page), /REP\s+1/);
  assert.equal(await page.locator('.case-hotspot').count(), 0, 'sold-out cases should leave the scene');

  await browser.close();
  console.log('Browser regression passed: direct hotspot garage loop works.');
} finally {
  server.kill();
}
