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

const finishedPalletLevelName = (cases) => {
  if (cases <= 0) return 'empty';
  if (cases < 6) return 'level1';
  if (cases < 12) return 'level2';
  return 'level3';
};

const finishedCases = async (page) =>
  page.evaluate((storageKey) => {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return 0;
    return JSON.parse(raw).state.inventory?.cases ?? 0;
  }, 'brewery-sim-save-v4');

const assertFinishedPallet = async (page, expectedLevel, message) => {
  assert.equal(
    await page.locator('.sell-point-object[data-sell-point-id="finished-beer-pallet"]').count(),
    1,
    `${message}: finished beer pallet should render once`
  );
  const expectedFilename = `pallet-finished-beer-${expectedLevel}.png`;
  assert.match(
    (await page.locator('.sell-point-sprite').getAttribute('src')) ?? '',
    new RegExp(expectedFilename.replace('.', '\\.')),
    `${message}: finished beer pallet should show ${expectedFilename}`
  );
};

const waitForBatchStep = async (page, step) => {
  await page.waitForFunction(
    ([storageKey, expectedStep]) => {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return false;
      const state = JSON.parse(raw).state;
      return state.batches.some((batch) => batch.step === expectedStep);
    },
    ['brewery-sim-save-v4', step],
    { timeout: 5000 }
  );
};

try {
  await waitForServer();

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
  await page.goto(baseUrl);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await assert.doesNotReject(page.locator('.garage-scene').waitFor({ state: 'visible', timeout: 5000 }));
  assert.match(await visibleText(page), /May 16/i);
  assert.equal(await page.locator('.case-hotspot').count(), 0, 'legacy case hotspot should not render');
  assert.match(await visibleText(page), /Tap the stock pot to brew Garage Blonde/i, 'fresh game should show the garage-floor first-loop objective');
  await assertFinishedPallet(page, 'empty', 'fresh game');
  assert.equal(
    await page.locator('.equipment-object[data-equipment-id="fermenter"]').count(),
    1,
    'fresh game should render one owned fermenter'
  );
  assert.equal(
    await page.locator('.equipment-object[data-equipment-id="fermenter"]').getAttribute('data-layout-slot-id'),
    'fermenter-slot-1',
    'starter fermenter should use the first fermenter slot'
  );
  assert.equal(await page.locator('.equipment-object[data-equipment-id="mill"]').count(), 0, 'fresh game should not render an unowned grain mill');

  await page.locator('.hotspot-kettle').click();
  assert.equal(await page.getByRole('dialog', { name: 'Recipe / Brew' }).count(), 0, 'kettle tap should not open the full recipe overlay');
  await assert.doesNotReject(page.getByRole('button', { name: /Brew Garage Blonde/ }).waitFor({ state: 'visible', timeout: 5000 }));
  await page.getByRole('button', { name: /Brew Garage Blonde/ }).click();
  await waitForBatchStep(page, 'awaiting-transfer');
  await assertFinishedPallet(page, 'empty', 'brewing beer not yet sellable');
  assert.match(await visibleText(page), /Tap the fermenter to transfer Garage Blonde/i);

  await page.locator('.hotspot-fermenter').click();
  await assert.doesNotReject(page.getByRole('button', { name: /Transfer to fermenter/ }).waitFor({ state: 'visible', timeout: 5000 }), 'assigned fermenter should show Transfer to fermenter without opening Production');
  await page.getByRole('button', { name: /Transfer to fermenter/ }).click();
  await waitForBatchStep(page, 'fermenting');
  assert.doesNotMatch(await visibleText(page), /in-game minutes remaining/i, 'fermenter card should use readable time labels');

  for (let day = 0; day < 8; day += 1) {
    const packagingWaiting = await page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem('brewery-sim-save-v4') ?? '{}').state;
      return state.batches?.some?.((batch) => batch.step === 'awaiting-packaging') ?? false;
    });
    if (packagingWaiting) break;
    await endDay(page);
  }
  await waitForBatchStep(page, 'awaiting-packaging');
  await assertFinishedPallet(page, 'empty', 'packaging waiting');

  await page.locator('.hotspot-bottler').click();
  await page.getByRole('button', { name: /Package Garage Blonde/ }).click();
  await page.waitForFunction(
    (storageKey) => {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return false;
      const state = JSON.parse(raw).state;
      return (state.inventory?.cases ?? 0) > 0 && (state.batches?.length ?? 0) === 0;
    },
    'brewery-sim-save-v4',
    { timeout: 5000 }
  );
  const sellableCases = await finishedCases(page);
  await assertFinishedPallet(page, finishedPalletLevelName(sellableCases), 'finished packaged beer');
  await page.locator('.sell-point-object[data-sell-point-id="finished-beer-pallet"]').click();
  await assert.doesNotReject(page.getByRole('button', { name: /Friends and family/ }).waitFor({ state: 'visible', timeout: 5000 }));
  await page.getByRole('button', { name: /Friends and family/ }).click();

  assert.match(await visibleText(page), /REP\s+1/);
  await assertFinishedPallet(page, 'empty', 'sold-out inventory');

  await page.locator('.workshop-hotspot').click();
  await page.locator('[data-action="buy-equipment"][data-equipment-item-id="plastic-bucket"]').click();
  await page.locator('[data-action="buy-equipment"][data-equipment-item-id="plastic-bucket"]').click();
  assert.equal(
    await page.locator('.equipment-object[data-equipment-id="fermenter"]').count(),
    3,
    'owned plastic fermenters should render as separate clickable scene objects outside debug mode'
  );
  assert.deepEqual(
    await page.locator('.equipment-object[data-equipment-id="fermenter"]').evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('data-layout-slot-id'))
    ),
    ['fermenter-slot-1', 'fermenter-slot-2', 'fermenter-slot-3'],
    'owned plastic fermenters should occupy the first three fermenter slots'
  );

  await page.goto(`${baseUrl}?layoutDebug=1`);
  await assert.doesNotReject(page.locator('.layout-debug-panel').waitFor({ state: 'visible', timeout: 5000 }));
  assert.equal(
    await page.locator('.layout-debug-fieldset').filter({ hasText: 'Fermenter 1 / plastic-bucket' }).count(),
    1,
    'layout debug should expose fermenter slot 1'
  );
  assert.equal(
    await page.locator('.layout-debug-fieldset').filter({ hasText: 'Fermenter 2 / plastic-bucket' }).count(),
    1,
    'layout debug should expose fermenter slot 2'
  );
  assert.equal(
    await page.locator('.layout-debug-fieldset').filter({ hasText: 'Fermenter 3 / plastic-bucket' }).count(),
    1,
    'layout debug should expose fermenter slot 3'
  );
  const slotTwoXNumber = page.locator('input[type="number"][data-layout-slot-id="fermenter-slot-2"][data-layout-field="x"]');
  const slotTwoXSlider = page.locator('input[type="range"][data-layout-slot-id="fermenter-slot-2"][data-layout-field="x"]');
  await slotTwoXNumber.fill('48.8');
  await slotTwoXNumber.dispatchEvent('input');
  assert.equal(await slotTwoXSlider.inputValue(), '48.8', 'number input should update its paired slider');
  assert.match(await page.locator('[data-layout-json]').inputValue(), /"fermenter-slot-2": \{\n    "x": 48\.8,/);
  await slotTwoXSlider.fill('49.4');
  await slotTwoXSlider.dispatchEvent('input');
  assert.equal(await slotTwoXNumber.inputValue(), '49.4', 'slider should update its paired number input');

  assert.equal(
    await page.locator('.layout-debug-fieldset').filter({ hasText: 'Finished beer pallet / sell point' }).count(),
    1,
    'layout debug should expose the finished beer pallet sell point'
  );
  const palletXNumber = page.locator('input[type="number"][data-sell-point-layout-id="finished-beer-pallet"][data-sell-point-layout-field="x"]');
  const palletXSlider = page.locator('input[type="range"][data-sell-point-layout-id="finished-beer-pallet"][data-sell-point-layout-field="x"]');
  await palletXNumber.fill('16.2');
  await palletXNumber.dispatchEvent('input');
  assert.equal(await palletXSlider.inputValue(), '16.2', 'sell point number input should update its paired slider');
  assert.match(await page.locator('[data-layout-json]').inputValue(), /"finished-beer-pallet": \{\n    "x": 16\.2,/);
  await palletXSlider.fill('47.7');
  await palletXSlider.dispatchEvent('input');
  assert.equal(await palletXNumber.inputValue(), '47.7', 'sell point slider should update its paired number input');

  await page.goto(`${baseUrl}?layoutDebug=1&tierPreview=2`);
  await assert.doesNotReject(page.locator('.layout-debug-panel').waitFor({ state: 'visible', timeout: 5000 }));
  assert.equal(await page.locator('.equipment-object[data-equipment-id="kettle"][data-equipment-item-id="all-in-one-40l"]').count(), 1);
  assert.equal(await page.locator('.equipment-object[data-equipment-id="mill"][data-equipment-item-id="grain-mill-tier2"]').count(), 1);
  assert.equal(await page.locator('.equipment-object[data-equipment-id="fermenter"]').count(), 3);
  assert.equal(await page.locator('.equipment-object[data-equipment-id="fermenter"][data-equipment-item-id="stainless-conical-50l"]').count(), 3);
  assert.equal(await page.locator('.equipment-object[data-equipment-id="bottler"][data-equipment-item-id="semi-auto-filler"]').count(), 1);
  await assertFinishedPallet(page, 'empty', 'tier 2 preview');
  assert.equal(
    await page.locator('.layout-debug-fieldset').filter({ hasText: 'Milling / grain-mill-tier2' }).count(),
    1,
    'tier 2 preview should expose the grain mill in layout debug'
  );
  assert.equal(
    await page.locator('input[type="number"][data-layout-slot-id="milling"][data-layout-field="y"]').inputValue(),
    '76.5',
    'tier 2 preview should use the locked milling placement'
  );
  assert.match(await page.locator('[data-layout-json]').inputValue(), /"milling": \{\n    "x": 18,\n    "y": 76\.5,\n    "width": 10/);
  await page.locator('.equipment-object[data-equipment-id="mill"] .equipment-object-toggle').click();
  assert.equal(
    await page.locator('.equipment-object[data-equipment-id="mill"] .equipment-object-card:not([hidden])').count(),
    1,
    'tier 2 grain mill should be clickable'
  );

  await browser.close();
  console.log('Browser regression passed: direct hotspot garage loop works.');
} finally {
  server.kill();
}
