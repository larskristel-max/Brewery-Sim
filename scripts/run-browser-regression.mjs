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

const styleValue = async (locator, property) =>
  locator.evaluate((node, prop) => getComputedStyle(node).getPropertyValue(prop), property);

const assertMobileChromeCollapsed = async (page, message) => {
  assert.equal(await styleValue(page.locator('.missions-control'), 'display'), 'none', `${message}: missions should not persist on mobile landscape`);
  if ((await page.locator('.garage-pressure-strip').count()) > 0) {
    assert.equal(await styleValue(page.locator('.garage-pressure-strip'), 'display'), 'none', `${message}: pressure strip should not persist on mobile landscape`);
  }
  assert.equal(await page.locator('.event-ticker').count(), 0, `${message}: floor note ticker should stay collapsed`);
};

const assertFocusOverlayOwnsLayer = async (page, message) => {
  assert.equal(await page.locator('.game-shell.focus-open').count(), 1, `${message}: shell should mark focus overlay state`);
  assert.equal(await styleValue(page.locator('.top-hud'), 'visibility'), 'hidden', `${message}: HUD should not compete with a focus overlay`);
  assert.equal(await styleValue(page.locator('.shop-cart-hotspot'), 'opacity'), '0', `${message}: cart should hide behind focus overlay`);
  assert.equal(await styleValue(page.locator('.ops-control'), 'opacity'), '0', `${message}: plus control should hide behind focus overlay`);
};

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

const boxesOverlap = (a, b) =>
  a && b && a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

const assertMobileGarageFit = async (page, message) => {
  const guidance = await page.locator('.first-loop-objective').boundingBox();
  const hud = await page.locator('.top-hud').boundingBox();
  assert.ok(guidance && hud, `${message}: guidance and HUD should be measurable`);
  assert.ok(guidance.y > hud.y + hud.height + 8, `${message}: guidance should sit below the HUD lane`);

  const equipmentBoxes = await page.locator('.equipment-object').evaluateAll((nodes) =>
    nodes.map((node) => {
      const box = node.getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width, height: box.height };
    })
  );
  assert.ok(equipmentBoxes.length >= 2, `${message}: starter equipment should be visible`);
  equipmentBoxes.forEach((box, index) => {
    assert.ok(box.width >= 32 && box.height >= 32, `${message}: equipment ${index + 1} should remain tappable`);
    assert.equal(boxesOverlap(guidance, box), false, `${message}: guidance should not overlap equipment ${index + 1}`);
  });
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
  assert.equal(await page.locator('.supply-hotspot').count(), 0, 'scene should not render floating inventory alert badges');
  await assertMobileChromeCollapsed(page, 'fresh game');
  assert.match(await visibleText(page), /Tap the stock pot to brew Garage Blonde/i, 'fresh game should show the garage-floor first-loop objective');
  await assertMobileGarageFit(page, '844x390 fresh game');
  await page.setViewportSize({ width: 667, height: 375 });
  await assertMobileGarageFit(page, '667x375 fresh game');
  await page.setViewportSize({ width: 844, height: 390 });
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
  await page.getByRole('button', { name: /Other recipes/ }).click();
  await assert.doesNotReject(page.locator('.recipe-category-card').filter({ hasText: 'Starter' }).waitFor({ state: 'visible', timeout: 5000 }));
  assert.match(await page.locator('.recipe-category-card').filter({ hasText: 'Starter' }).innerText(), /Stock: \d+ batch(?:es)? in stock/i, 'recipe category cards should show how many batches stock supports');
  await page.locator('.recipe-category-card').filter({ hasText: 'Starter' }).click();
  assert.match(await page.locator('.recipe-card').filter({ hasText: 'Garage Blonde' }).innerText(), /\d+ batch(?:es)? in stock/i, 'recipe cards should show stock-supported brew count');
  assert.match(await page.locator('.recipe-card').filter({ hasText: 'Garage Blonde' }).innerText(), /Pilsner malt[\s\S]*Saaz hops[\s\S]*Ale yeast[\s\S]*Bottles and caps/i, 'recipe card should show the ingredient bill of materials');
  assert.doesNotMatch(await page.locator('.recipe-station-panel').innerText(), /Order missing EUR 0/i, 'recipe panel should not show a zero-cost missing-order action');
  assert.equal(
    await page.locator('.recipe-station-panel').evaluate((node) => node.scrollHeight <= node.clientHeight + 1),
    true,
    'starter recipe station panel should fit without internal scrolling'
  );
  await page.locator('.station-panel-close').click();
  await page.locator('.hotspot-kettle').click();
  await page.getByRole('button', { name: /Brew Garage Blonde/ }).click();
  await waitForBatchStep(page, 'brewing');
  assert.match(await visibleText(page), /Tap the stock pot to finish the brew day/i, 'started brew should ask the player to wait through the brew day');
  await page.locator('.hotspot-kettle').click();
  await assert.doesNotReject(page.getByRole('button', { name: /Skip to transfer/ }).waitFor({ state: 'visible', timeout: 5000 }));
  await page.getByRole('button', { name: /Skip to transfer/ }).click();
  await waitForBatchStep(page, 'awaiting-transfer');
  assert.equal(await page.locator('.equipment-object-toggle.next-tap').count(), 1, 'the source station should pulse when transfer is waiting');
  assert.equal(
    await page.locator('.equipment-object-toggle.next-tap').evaluate((node) => getComputedStyle(node, '::after').content),
    'none',
    'equipment next-target feedback should pulse the image without drawing a large outline'
  );
  await assertFinishedPallet(page, 'empty', 'brewing beer not yet sellable');
  assert.match(await visibleText(page), /Tap the stock pot to transfer Garage Blonde/i);

  await page.locator('.hotspot-kettle').click();
  await assert.doesNotReject(page.getByRole('button', { name: /Transfer to fermenter/ }).waitFor({ state: 'visible', timeout: 5000 }), 'kettle should show Transfer to fermenter without opening Production');
  await page.getByRole('button', { name: /Transfer to fermenter/ }).click();
  await waitForBatchStep(page, 'fermenting');
  assert.equal(await page.locator('.equipment-object-toggle.active.next-tap').count(), 0, 'actively fermenting equipment should not keep a ready-to-click pulse');
  await page.locator('.hotspot-fermenter').click();
  await assert.doesNotReject(page.locator('.station-panel').filter({ hasText: /Fermenting/ }).waitFor({ state: 'visible', timeout: 5000 }));
  assert.doesNotMatch(await visibleText(page), /in-game minutes remaining/i, 'fermenter card should use readable time labels');
  assert.doesNotMatch(await visibleText(page), /High risk\s*-\s*\d+\s*C/i, 'fermenter card should not imply normal ale temperature is high risk');
  assert.doesNotMatch(await visibleText(page), /\d+\s*C\s*-\s*risk\s*\d+%/i, 'fermenter temperature note should not repeat an unexplained risk warning');
  assert.match(await visibleText(page), /contamination \d+% \((?:low|moderate|watch|high)\)/i, 'fermenter card should explain that the risk label is contamination risk');
  await page.locator('.station-panel-close').click();

  await page.locator('.hotspot-fermenter').click();
  await assert.doesNotReject(page.getByRole('button', { name: /Skip to packaging/ }).waitFor({ state: 'visible', timeout: 5000 }));
  await page.getByRole('button', { name: /Skip to packaging/ }).click();
  await waitForBatchStep(page, 'awaiting-packaging');
  await assertFinishedPallet(page, 'empty', 'packaging waiting');

  await page.locator('.hotspot-fermenter').click();
  await assert.doesNotReject(page.getByRole('button', { name: /Transfer to bottling/ }).waitFor({ state: 'visible', timeout: 5000 }));
  await page.getByRole('button', { name: /Transfer to bottling/ }).click();
  await waitForBatchStep(page, 'packaging');
  await page.locator('.hotspot-bottler').click();
  await assert.doesNotReject(page.getByRole('button', { name: /Skip to pallet/ }).waitFor({ state: 'visible', timeout: 5000 }));
  await page.getByRole('button', { name: /Skip to pallet/ }).click();
  await page.locator('.scene-payoff-pallet').waitFor({ state: 'visible', timeout: 5000 });
  assert.match(
    await page.locator('.scene-payoff-pallet').innerText(),
    /Pallet filled[\s\S]*gameplay case/i,
    'packaging should show a floor payoff when cases move to the pallet'
  );
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

  assert.ok(
    await page.evaluate((storageKey) => {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return false;
      return (JSON.parse(raw).state.reputation ?? 0) > 0;
    }, 'brewery-sim-save-v4'),
    'selling should increase reputation even when the compact HUD hides the rep label'
  );
  await page.locator('.scene-payoff-sale').waitFor({ state: 'visible', timeout: 5000 });
  assert.match(await page.locator('.scene-payoff-sale').innerText(), /Cases sold[\s\S]*\+EUR\s+\d+[\s\S]*Rep \+\d+/i, 'selling should show a cash and rep floor payoff');
  await assertFinishedPallet(page, finishedPalletLevelName(await finishedCases(page)), 'post-sale inventory');
  if ((await finishedCases(page)) > 0) {
    await page.locator('.sell-point-object[data-sell-point-id="finished-beer-pallet"]').click();
    await page.getByRole('button', { name: /Friends and family/ }).click();
    await page.waitForFunction(
      (storageKey) => {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return false;
        return (JSON.parse(raw).state.inventory?.cases ?? 0) === 0;
      },
      'brewery-sim-save-v4',
      { timeout: 5000 }
    );
  }
  assert.doesNotMatch(
    await page.locator('.first-loop-objective strong').innerText(),
    /stock pot to brew Garage Blonde/i,
    'post-sale objective should not reset to the completed first brew instruction'
  );

  assert.equal(await page.locator('.workshop-hotspot').getAttribute('aria-label'), 'Shop cart', 'workshop hotspot should be labelled as a shop cart');
  assert.equal((await page.locator('.workshop-hotspot').innerText()).trim(), '', 'shop cart hotspot should be icon-only');
  const shopButtonBox = await page.locator('.shop-cart-hotspot').boundingBox();
  const opsButtonBox = await page.locator('.ops-button').boundingBox();
  assert.ok(
    shopButtonBox &&
      opsButtonBox &&
      Math.abs(shopButtonBox.y - opsButtonBox.y) < 2 &&
      shopButtonBox.x + shopButtonBox.width <= opsButtonBox.x - 4,
    'shop cart icon should sit immediately left of the plus button'
  );
  await page.locator('.workshop-hotspot').click();
  await assert.doesNotReject(page.getByRole('dialog', { name: 'Shop cart' }).waitFor({ state: 'visible', timeout: 5000 }));
  await assertFocusOverlayOwnsLayer(page, 'shop cart overlay');
  assert.equal(await page.locator('.shop-section-card').count(), 2, 'shop cart should first ask whether to shop supplies or equipment');
  assert.equal(await page.locator('.ingredient-cart-card[data-action="order-ingredient"]').count(), 0, 'shop cart should not show supplies before a section is chosen');
  await page.locator('.shop-section-card').filter({ hasText: 'Equipment' }).click();
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
    '76.8',
    'tier 2 preview should use the tier-specific milling placement'
  );
  assert.match(await page.locator('[data-layout-json]').inputValue(), /"milling": \{\n    "x": 16\.2,\n    "y": 76\.8,\n    "width": 11\.2/);
  await page.locator('.equipment-object[data-equipment-id="mill"] .equipment-object-toggle').click();
  assert.equal(
    await page.locator('.station-panel').count(),
    1,
    'tier 2 grain mill should be clickable'
  );

  const narrowPage = await browser.newPage({ viewport: { width: 667, height: 375 } });
  await narrowPage.goto(baseUrl);
  await narrowPage.evaluate(() => localStorage.clear());
  await narrowPage.reload();
  await assert.doesNotReject(narrowPage.locator('.garage-scene').waitFor({ state: 'visible', timeout: 5000 }));
  await assertMobileChromeCollapsed(narrowPage, '667x375 fresh game');
  assert.equal(await narrowPage.locator('.shop-cart-hotspot').isVisible(), true, '667x375 cart fallback should remain visible');
  assert.equal(await narrowPage.locator('.ops-button').isVisible(), true, '667x375 plus fallback should remain visible');
  await narrowPage.locator('.shop-cart-hotspot').click();
  await assert.doesNotReject(narrowPage.getByRole('dialog', { name: 'Shop cart' }).waitFor({ state: 'visible', timeout: 5000 }));
  await assertFocusOverlayOwnsLayer(narrowPage, '667x375 shop overlay');
  assert.equal(
    await narrowPage.locator('.focus-upgrades').evaluate((node) => node.scrollWidth <= node.clientWidth + 1),
    true,
    '667x375 shop overlay should not need horizontal scrolling'
  );
  await narrowPage.close();

  await browser.close();
  console.log('Browser regression passed: direct hotspot garage loop works.');
} finally {
  server.kill();
}
