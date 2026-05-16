# Garage Loop Implementation To-Do

This document is the working implementation checklist for the next Brewery-Sim phase. It turns the current planning thread into an ordered build plan so future agents can continue without rereading the full conversation.

Use `docs/equipment-tier-reference.html` as the companion visual reference board for Tier 1, Tier 2, and Tier 3 equipment.

## Goal

Make the game feel like operating a garage brewery before adding accounts, cloud saves, Supabase sync, Notion import, OpenRUM/Operon integration, multiplayer, or shared progress.

The game stays local-only in this phase. Saves remain in browser storage. Recipes, ingredients, equipment, prices, and balance values remain local TypeScript data for now.

The implementation should still use naming and data shapes that can later map cleanly to Operon concepts:

- Batch
- Tank or fermenter
- Lot
- Sale
- Workflow step
- Compliance risk
- Legal release status

## Current Repo Warning

There are existing modified files in the repo from earlier work. Before starting implementation, check the worktree and avoid overwriting unrelated edits. In particular, make sure `src` and committed `dist` stay in sync after each source change because GitHub Pages currently loads the built browser files.

## Latest Pause Handoff

Updated May 16, 2026 after the garage hotspot stabilization pass.

### Implemented In Current Worktree

- Removed the bad CSS-drawn Tier 1 equipment overlay from the garage scene. The current visual approach is labels/hotspots only until proper matching assets are available.
- Kept the useful recipe/order UX fixes:
  - Clicking the stockpot/brewhouse opens the recipe overlay directly.
  - Ordering missing ingredients keeps the recipe overlay open.
  - Duplicate missing-ingredient orders are disabled when pending deliveries already cover the missing stock.
- Added real in-game date display starting at `May 16`.
- Added date-based order UX:
  - Recipe cards show estimated arrival dates before ordering.
  - Pending orders show `Ordered / Arrives [date]`.
  - Order events use calendar dates instead of `Day N`.
- Replaced browser-clock progression with action-based in-game time.
  - The old `window.setInterval(...tick...)` loop was removed.
  - `tick` is now intentionally inert for compatibility.
  - `end-day` advances overnight fermentation and bottle conditioning.
- Added `energy` to game state and HUD.
  - Brewing, packaging, and cleaning consume in-game time and energy.
  - Day rollover restores energy to 100.
- Replaced the old auto-flow with manual gated production states:
  - `brewing`
  - `awaiting-transfer`
  - `fermenting`
  - `awaiting-packaging`
  - `packaging`
  - `bottle-conditioning`
  - `ready`
- Added visible progress/time remaining on production cards.
- Added bottle conditioning before beer becomes sellable.
- Cleaning now consumes in-game time and energy instead of being only an instant cash action.
- Added buyer-offer style sales actions for:
  - Friends and family
  - Private event
  - Local bar
- Stabilized the direct garage-floor hotspot loop:
  - Equipment hotspot cards now handle direct clicks even when the nested button is not the exact click target.
  - Fermenter direct clicks can transfer waiting batches.
  - Bottler direct clicks can package batches waiting for packaging.
  - Cases direct clicks can open buyer offers and complete the first sale path.
- Hid the cases hotspot until finished sellable cases exist, so awaiting-packaging and bottle-conditioning states no longer imply packaged stock is ready.
- Added a browser-level regression script for the full direct hotspot loop:
  `stockpot -> brew -> transfer -> end days -> package -> condition -> buyer offer`.
- Added `npm run test:browser` and `npm run test:all`.
- Bumped local save version to `v4` so old prototype saves reset cleanly.
- Rebuilt `dist` from `src`; `src` and tracked `dist` are currently in sync.

### Verification Completed

- `npm.cmd test` passes.
- Browser checked at `http://127.0.0.1:4173/`:
  - Stockpot opens recipes.
  - Missing orders keep the overlay open.
  - Duplicate missing orders are disabled once covered by pending deliveries.
  - Brew day stops at manual transfer instead of auto-fermenting.
  - Production overlay transfer moves the batch into fermentation.
  - End day advances fermentation.
  - Packaging starts bottle conditioning instead of creating sellable cases immediately.
  - End day advances conditioning until cases become sellable.
  - Buyer offers render in the production view once finished cases exist.
  - Direct fermenter, bottler, and cases hotspot paths complete the first loop.
  - Cases stay hidden until sellable inventory exists.
  - Phone portrait blocker still appears.
  - iPad-like landscape viewport remains usable.
- `npm.cmd run test:browser` covers the direct hotspot path in an 844x390 browser viewport.

### Known Follow-Up Before More Feature Work

- Keep the new browser regression in the normal verification path when touching garage UI, production state, sales, or hotspot hit testing.
- The direct hotspot path is covered for the first loop, but future expanded/action states should still get browser coverage when they are added.
- The proper empty-garage plus fixed equipment-slot visual asset system remains future work. Do not reintroduce CSS-drawn fake equipment.

## Latest Planning Handoff

Updated May 16, 2026 after live user testing and design review.

The current direction has changed in several important ways. Future agents should treat this section as the latest source of truth before continuing implementation.

### Keep From The Current Work

- Clicking the brewhouse/stock pot should open the recipe overlay directly. The user liked this.
- Ordering missing ingredients should keep the recipe overlay open.
- If the missing ingredients are already covered by pending deliveries, the game should disable repeated "order missing" clicks so cash is not spent accidentally.
- Recipe cards should clearly show delivery status, such as `Already ordered. Arrives May 19`.
- Old starter labels such as `40 L brew system` and `30 L fermenter` should stay removed.
- Generic upgrades should stay replaced by physical equipment purchases.

### Undo Or Avoid

- Remove the recent CSS-drawn equipment overlay approach. It looked hacked onto the photo, fought the background, overlapped labels, and made the UI worse.
- Do not add fake CSS-drawn buckets, pots, fermenters, or cappers on top of the current photo.
- Do not keep the current auto-running production loop where one click can eventually produce finished cases without more player input.
- Do not let the browser clock advance game time just because the app is open.

### Visual Equipment Decision

Use one strong garage background for the garage phase, but it should be an empty or mostly empty garage with clear equipment zones, not a photo that already contains advanced brewery equipment.

The scene should have fixed equipment slots:

- Brewhouse slot.
- Multiple fermenter slots, likely 4-6 visible positions.
- Packaging slot.
- Storage and cases zone.

When the player buys equipment, the game assigns that equipment to a valid slot. Equipment should not be randomly positioned.

Use proper transparent-background image assets for equipment. These assets must match the background camera angle, lighting, scale, and floor perspective so they look like they belong in the room.

Needed visual asset types:

- 20 L enamel BIAB stock pot.
- Plastic fermentation bucket.
- Additional plastic buckets.
- All-in-one electric brewing system.
- Three-vessel homebrew stand.
- Stainless conical fermenter.
- Larger unitank or nano fermenter.
- Bottle wand and hand capper.
- Semi-auto bottle filler.
- Small canning or seaming bench.

Each equipment catalog item should eventually include visual metadata:

- `image`
- `slotType`
- `slotIndex` or allowed slot list
- `x`
- `y`
- `scale`
- `zIndex`
- `visualState`
- `maxVisibleCount`, where useful

Short-term, if proper matching assets are not ready, use clean labels/hotspots only. Do not fake equipment with CSS overlays.

### Simplified All-Grain Brewing Loop

The real all-grain process includes mash, BIAB bag lift or lauter/sparge, boil, chill, transfer to fermenter, fermentation, packaging, and bottle conditioning. The normal detailed process belongs later in optional hands-on brewing mode.

For the current standard mode, simplify it into station-gated actions:

1. Start brew day.
2. Brewing timer runs as one combined step: mash, lift/sparge, boil, chill.
3. Brewing completes and waits.
4. Player clicks `Transfer to fermenter`.
5. Fermentation timer runs.
6. Fermentation completes and waits.
7. Player clicks `Package`.
8. Packaging timer runs.
9. Packaging completes and starts or asks for bottle conditioning, depending on final UX.
10. Bottle conditioning timer runs.
11. Beer becomes ready.
12. Player chooses a buyer and sells.

Use these states, or very close equivalents:

- `brewing`
- `awaiting-transfer`
- `fermenting`
- `awaiting-packaging`
- `packaging`
- `bottle-conditioning`
- `ready`

Active states have timers. Waiting states do not progress until the player acts.

The user does not want this flow:

`Click brew -> automatic fermenting -> automatic packaging -> automatic finished cases`

That defeats the purpose of playing through the garage loop.

### Time And Energy Direction

Game time should advance because the player starts actions, not because the app is open.

Initial balance targets:

- Start each day around 7:00 AM.
- Brew day action consumes about 6 in-game hours.
- Packaging consumes about 2 in-game hours.
- Cleaning consumes time and energy.
- Fermentation and bottle conditioning progress whenever in-game time advances.
- `End day` advances overnight fermentation and conditioning.

Add an energy bar:

- Start day at 100 energy.
- Brewing costs high energy.
- Packaging costs medium energy.
- Cleaning costs medium to high energy.
- Ordering and selling cost low energy.
- Low energy makes actions slower and increases mistakes or risk.
- If energy is empty, the player should end the day.

The exact `End day` behavior still needs design, but a good first version is:

- Available when no urgent manual transfer/package action is waiting.
- Advances to the next morning.
- Fermentation and bottle conditioning progress by overnight hours.
- Household pressure may recover slightly if the garage is not cluttered.

### Cleaning Direction

Cleaning must become a real production action, not just a cheap instant condition reset.

Research-aligned simplification:

- Homebrew cleaning generally means rinse, cleaner wash, rinse, and sanitize before use.
- Professional CIP often means caustic, rinse, acid when needed, sanitizer, and setup/tear-down.
- A small brewery CIP cycle can plausibly take about two hours all-in.

Initial game balance:

- Plastic bucket cleaning: 45-60 in-game minutes.
- Bottling cleanup: 60-90 in-game minutes.
- Stainless conical cleaning: 90-120 in-game minutes, but with lower contamination risk afterward.
- Unitank or larger stainless CIP: 2-3 in-game hours, reliable but energy/time intensive.

Dirty equipment should increase contamination, quality loss, packaging loss, or stuck-action risk.

### Ordering UX Direction

Replace day counters like `Day 5` with real in-game dates.

Fresh games should start on an in-game date, for example `May 16`.

Before ordering, buttons/cards should say:

- `Order missing - EUR 23`
- `Estimated delivery: May 19`
- `Arrives in 3 days`

After ordering:

- `Ordered`
- `Arrives May 19`
- Disable duplicate "order missing" if pending deliveries already cover those missing ingredients.

The player should still be allowed to intentionally order extra supplies before earlier deliveries arrive.

### Sales Direction

Replace the generic sell button with buyer offers.

Offer examples:

- Friends and family: small case count, lower price, cash today, very low visibility.
- Private event: medium case count, good price, medium visibility.
- Local bar: larger case count, normal commercial price, may ask for invoice, repeat demand possible.

Future pricing direction:

- Friends-and-family price can be near production cost.
- Private event can be a favor or event price.
- Bar sales can include normal price, cash discount, or volume discount.
- Letting the player set prices can come later.

### Sound Direction

Add lightweight optional sound feedback after the first user interaction:

- Start brew: burner click or bubbling.
- Transfer: liquid flowing.
- Package: bottle clink or capper sound.
- Sell: cash register.
- Buy/order: purchase sound.
- Blocked action: soft dull click.

Keep audio optional and browser-safe.

### Immediate Next Build Order

1. Remove the bad CSS equipment overlay.
2. Preserve useful UX fixes: brewhouse opens recipes, order overlay stays open, duplicate missing orders are blocked.
3. Add real date-based delivery estimates and order status.
4. Replace the auto-advancing production loop with manual gated states.
5. Add visible time/progress for active states.
6. Add energy and action-based time advancement.
7. Add bottle conditioning.
8. Add cleaning as a timed/energy-costing action.
9. Add buyer offer selection for sales.
10. Then build the proper empty-garage plus equipment-slot visual system.

## Current Local Walkthrough Findings

Verified on May 16, 2026 against the current local app at `http://localhost:4173` after running the existing prototype checks.

- `npm.cmd test` passes; the PowerShell `npm test` alias can fail on this machine because `npm.ps1` is blocked by execution policy.
- The app opens locally and the iPad-like landscape viewport fits without showing the rotate blocker.
- The visible starter setup does not yet match the new garage plan: the first screen still labels the starter brewhouse as `40 L brew system`, the fermenter as `30 L fermenter`, and the background/visible equipment reads as a more advanced stainless setup rather than a 20 L enamel BIAB pot, one plastic bucket, bottle wand, and hand capper.
- The workshop overlay is still the old generic upgrade flow: `Larger kettle`, `Fermentation temp control`, and `Hand labeler`. It is not yet a grouped equipment store with Brewhouse, Fermentation, and Packaging stations.
- The generic upgrade buttons appear clickable even when the player cannot afford them; the reason is only surfaced after clicking. The new store should show affordability and purchase blockers before the click.
- Brewing a first `Garage Blonde` starts and advances through mash and fermentation automatically.
- While only one fermenter exists, the recipe screen can still enable brewing another `Garage Blonde` during the active production flow. Fermenter-slot reservation and capacity blocking are not implemented yet.
- The current UI can get stuck at packaging: when the bottling station shows `5 cases waiting`, the `Bottle` button is enabled but clicking it did not package the batch in the browser walkthrough. Cases stayed at `0` and `Sell` remained disabled.
- The recipe overlay is functional but still case-based and abstract. It does not explain liters, selected fermenter capacity, or why a brewhouse would be capped by fermenter capacity.
- Sales still use a single generic cases hotspot and do not yet model sales channels, repeat customers, invoices, legal release, or blocked formal orders.

## Detailed Game Developer Pass Findings

Verified on May 16, 2026 in the in-app browser with fresh saves, desktop landscape, iPad-like landscape, small landscape, and phone portrait viewports.

### Critical Loop Issues

- The visible core loop currently cannot be trusted as playable because packaging can hard-stall. A batch reaches `5 cases waiting`, the bottling station exposes an enabled `Bottle` action, but clicking it does not create cases. The cases hotspot stays at `0`, and `Sell` remains disabled.
- Automated tests still pass, so this packaging problem needs a browser-level regression test. Unit coverage alone is not catching the UI dispatch or rendered-action failure.
- The game can show `5 cases waiting` and a separate `Cases 0` hotspot at the same time. This creates a contradiction at the most important payoff moment in the first loop.
- The recipe overlay allows `Garage Blonde` to remain brewable while the first batch is already occupying the only fermentation path. Until multiple fermenters exist, a new batch should either be blocked or clearly warned as impossible because no empty fermenter is available.
- The first batch finishes too quickly for the intended next phase. It validates the prototype, but it does not yet create a satisfying brewing rhythm or meaningful waiting-time choices.

### Player Onboarding And Game Feel

- The first screen does not tell the player what to do strongly enough. `Mash - Ferment - Package - Sell` is useful, but the next actionable click is visually competing with Missions, Notifications, and the floating operations button.
- The mission objective points to `Earn EUR 500 and buy the larger kettle`, which conflicts with the new direction. The first objective should teach the garage loop and physical starter equipment, not push the old generic upgrade.
- Starting reputation is `8`, which makes the player feel established before they have brewed or sold anything. For the garage fantasy, consider starting at 0 or making this a named friends-and-family trust value.
- The brand `HOP HAVEN` and semi-professional garage image make the operation feel more like an existing nano brewery than a garage hobby setup. This undermines the planned Tier 1 fantasy.
- The visible background is attractive and readable, but it currently fights the desired progression: stainless systems, hoses, and a polished packaging area are visible before the player has earned them.
- Notifications use useful operational language, but early messages still talk about "quiet local channels" before sales channels exist. That promise should either be implemented soon or softened.

### Equipment And Capacity

- Starter labels still hide the actual equipment data. The catalog contains `20 L enamel stock pot`, `Plastic fermentation bucket`, and `Bottle wand and hand capper`, but the rendered UI says `40 L brew system`, `30 L fermenter`, and `Bottling station`.
- Equipment is still one item per station. It cannot yet represent several plastic fermenters, several all-in-one systems, or one batch per fermenter.
- Capacity is still expressed as cases, not liters. The player cannot see `20 L`, fermenter capacity, batch volume, or the reason a batch would be capped.
- The current equipment model still behaves like station replacement. The next implementation should distinguish owned items, installed/active items, and per-item occupancy.
- Cleaning is visible and useful, but Repair and Replace are disabled placeholders. Either remove them for now or make them part of the coming equipment store/workshop flow.
- Fermenter temperature controls are a good seed mechanic, but the starter plastic bucket should not feel like a precise temperature-controlled vessel. For Tier 1, represent this as ambient garage temperature or a rough water bath unless the player buys control.

### UI And Interaction

- The operations menu works, but it feels like a debug/admin radial menu rather than a garage workbench. It should become a practical workshop/store/clipboard surface with stronger physical framing.
- The recipe cards are information-rich, but they do not show the main production constraint: available fermenter slots and liters. Add a clear "Can brew now / blocked because..." line.
- Disabled recipe buttons show missing ingredients, which is good. Equipment and upgrade/store blockers need the same pre-click clarity.
- The workshop overlay is still generic: `Larger kettle`, `Fermentation temp control`, and `Hand labeler`. It should be replaced by grouped physical equipment cards.
- Unaffordable workshop buttons are still clickable and only explain failure after clicking. Store cards should visibly show insufficient cash and disabled purchase state.
- There are duplicate accessible `Close overlay` buttons because both the scrim and visible close control share the same label. This makes browser testing and accessibility targeting ambiguous.
- Several clickable areas duplicate action metadata on both a container and an inner button. This can make hit testing and event targeting fragile, especially around equipment hotspots.
- The cases hotspot appears before cases exist once a batch is ready. It should avoid implying packaged stock exists until packaging actually succeeds.
- The notification badge caps at `9`, which is fine visually, but the notification list only shows the latest few events. Important blocking failures should be elevated, not buried in the floor log.

### Production And Economy

- Time currently advances as a compressed day clock, but stage durations are so short that the player does not make meaningful decisions during fermentation or packaging.
- Day rollover can happen during the first batch without the player understanding why demand, reputation, or event timing changed.
- Ingredients and ordering work at a prototype level, but deliveries are abstract. For the garage phase, incoming supplies should become visible pressure: boxes, sacks, bottles, storage clutter.
- Inventory storage has useful dry/cold/utility categories. This should connect directly to garage space pressure and equipment space use.
- Demand is still a single daily account such as `Corner Cafe`. That is too formal for the intended first phase. Start with friends/family/private events, then introduce bars later.
- Reputation, visibility, and legal/compliance pressure are not separated yet in the UI. The existing `Garage visibility` number is hidden inside Inventory and should become a first-class risk bar later.
- The current sale action is all-or-nothing from a generic cases hotspot. It should become channel selection or offer fulfillment once channels exist.

### Responsive And Visual QA

- Desktop landscape and iPad-like landscape render without the rotate blocker.
- Phone portrait correctly shows the rotate-device blocker.
- Small landscape is usable, but hotspot labels become dense and the bottom-right controls/cases area can feel crowded. Future store and multi-fermenter visuals need explicit checks at this size.
- No browser console errors appeared during the detailed pass.

## Implementation Order

### 1. Stabilize The Current Prototype

Purpose: get the existing game into a known working state before adding new systems.

- Run the current tests and note what fails.
- Fix or intentionally document the current packaging UI bug where the visible `Bottle` button can fail to move a ready batch into packaged cases.
- Add a browser-level regression check that completes the first loop through brew, ferment, bottle/package, and sell.
- Check whether the current code still references the old upgrade model.
- Replace remaining starter labels that say `40 L brew system` and `30 L fermenter` before treating the equipment work as complete.
- Replace the old mission objective that points to `Larger kettle` with a first-loop garage objective.
- Decide whether to finish the partial equipment-store changes or reshape them around the newer design below.
- Keep the save version guard simple: old prototype saves may be ignored and reset to a fresh game.
- Do not add migration complexity for old saves.
- Rebuild `dist` after source changes.
- Confirm the browser build still opens.

Done when:

- Tests pass or failures are clearly documented.
- The local browser build runs.
- The save version behavior is intentional.

### 2. Replace Generic Upgrades With Garage Equipment

Purpose: make progress feel physical, visible, and tied to the garage.

Create a local equipment catalog grouped by station:

- Brewhouse
- Fermentation
- Packaging

Each equipment item should define:

- `id`
- `station`
- `tier`
- `name`
- `description`
- `cost`
- `spaceUsed`
- `capacityLiters`
- `batchTimeModifier`
- `attentionModifier`
- `qualityModifier`
- `riskModifier`
- `lossModifier`
- `visualClass`
- `operonTypeKey`, where useful, such as `equipment.kettle`, `equipment.mash_tun`, `equipment.fv`, or `equipment.bbt`

Remove or fully replace the old `buy-upgrade` behavior with `buy-equipment`.

Done when:

- New games start with actual starter equipment.
- Equipment purchases cost money.
- Unaffordable equipment cannot be bought.
- Installed equipment changes labels and behavior.

### 3. Implement Tier 1 Amateur Garage Equipment

Purpose: make the starting point feel like real homebrewing, not an advanced mini brewery.

Starting equipment:

- Brewhouse: 20 L enamel stock pot with brew bag, for brew-in-a-bag all-grain brewing.
- Fermentation: 1 plastic fermentation bucket.
- Packaging: bottle wand and hand capper.

Important rules:

- All brewing is all-grain.
- No extract brewing.
- Tier 1 brew-in-a-bag should be slower and more hands-on.
- The player may buy additional plastic fermenters until garage space is full.
- Each fermenter holds one batch.
- The player can brew another batch if there is an empty fermenter available.

Suggested Tier 1 balance:

- Brew size: about 18-20 L into fermenter.
- Bottles: about 55-60 bottles of 33 cl after losses.
- Brew timer: about 3-5 real minutes for the first playable prototype.
- Fermentation timer: about 8-15 real minutes for early ales.
- Bottling timer: about 1.5-3 real minutes for a 20 L batch.

Done when:

- Player starts with one BIAB stock pot, one plastic bucket, and bottle wand/capper.
- Player can add extra plastic fermenters within a garage space limit.
- Occupied fermenters block new batches.
- Empty fermenters allow parallel batch planning while other batches ferment.

### 4. Add Real Fermenter Capacity Logic

Purpose: make equipment choices matter and prevent unrealistic production.

Rules:

- A batch must have an empty fermenter before brewing starts or before transfer, depending on final UI choice.
- Effective batch volume is limited by:
  - brewhouse capacity
  - selected empty fermenter capacity
  - available ingredients
  - packaging/storage limits, later
- If the player buys a 150 L brewhouse but only has a 40-50 L fermenter, the game should explain that the brew is capped by fermentation capacity.
- Do not split one batch across multiple fermenters in this phase unless explicitly added later.

Done when:

- Batch size is `min(brewhouse capacity, selected fermenter capacity)`.
- UI clearly explains capacity bottlenecks.
- Tests prove a larger brewhouse does not create more beer without matching fermentation capacity.

### 5. Add The Store Or Workshop Overlay

Purpose: let the player buy physical equipment instead of abstract upgrades.

The store should:

- Open from the main garage UI.
- Group equipment by Brewhouse, Fermentation, and Packaging.
- Show owned equipment and installed equipment.
- Show cost, capacity, space use, and practical effect.
- Explain why an item cannot be bought.
- Close cleanly without losing current game state.

Store language should stay practical:

- "Adds one 20 L plastic fermenter."
- "Raises maximum batch size, but only if an empty fermenter can hold it."
- "Reduces packaging loss."
- "Takes more garage space."

Done when:

- Store opens and closes cleanly.
- Buying equipment changes the garage state.
- UI labels update immediately.

### 6. Make Equipment Visible In The Garage

Purpose: make the player feel they are changing the room, not clicking a static picture.

Latest decision: do not add CSS-drawn equipment overlays to the current photo. The live test showed this looks hacked in, overlaps labels, and fights the lighting/perspective.

Visual approach for this phase:

- Create or generate one strong empty garage background for the garage phase.
- Place equipment into fixed slots on that background.
- Use matching transparent-background equipment cutouts, not CSS approximations.
- Match each equipment cutout to the background camera angle, floor perspective, lighting, and scale.
- Keep clean labels/hotspots only until the visual assets are good enough.

Slot zones:

- Brewhouse slot.
- Multiple fermenter slots.
- Packaging slot.
- Storage and cases zone.

Equipment visual metadata should be added to catalog entries as the asset system is implemented:

- `image`
- `slotType`
- `slotIndex` or allowed slots
- `x`
- `y`
- `scale`
- `zIndex`
- `visualState`
- `maxVisibleCount`, where useful

Tier 1 visual notes:

- One enamel pot on burner or stand.
- Brew bag/BIAB indication.
- Plastic buckets with airlocks.
- Bottle wand, capper, bottles/crates.

Tier 2 visual notes:

- All-in-one systems may be bought in multiples, up to 3 because they use less space.
- Three-vessel system should look larger and more serious.
- Stainless conical fermenters should feel like serious homebrewer or early nano equipment.
- Semi-auto bottling filler should be visible in packaging zone.

Tier 3 visual notes:

- Compact nano brewhouse or large all-in-one system.
- 100-150 L or 1 BBL scale fermenters.
- Advanced bottle filler or very small canning/seaming setup, not a real canning line.
- The room should feel crowded and uncomfortable.

Done when:

- Equipment names and visuals change by owned/installed equipment.
- Equipment appears in fixed garage slots and looks like it belongs in the same scene.
- The player can understand their setup by looking at the garage.
- iPad-like landscape viewport still fits the game clearly.

### 7. Add Tier 2 Equipment Path

Purpose: let the player grow into serious homebrewing without becoming a professional brewery yet.

Tier 2 brewhouse options:

- All-in-one electric brewing system, similar in role to Grainfather, Brewtools B40, or Braumeister-style systems.
- Player may buy up to 3 all-in-one systems because they take less space.
- All-in-one systems should not greatly speed a single brew day, but should reduce attention and allow parallel production if the player owns multiple units.
- Three-vessel homebrew system.
- Three-vessel system can improve throughput because mash, boil, and next mash can overlap.

Tier 2 fermenter options:

- Small stainless conical fermenter.
- 20-50 L stainless fermenters.
- Better temperature stability.
- Lower trub/transfer loss.
- Lower contamination risk.

Tier 2 packaging options:

- Enolmatic-style vacuum filler or small semi-auto filler.
- Faster filling.
- Lower packaging loss.
- Higher cost.

Done when:

- Tier 2 offers at least one brewhouse path, one fermenter path, and one packaging path.
- All-in-one and three-vessel paths have different gameplay identities.
- Fermenter capacity still limits batch size.

### 8. Add Tier 3 Garage Ceiling Equipment

Purpose: make the last garage step powerful but clearly too much for the house.

Tier 3 brewhouse examples:

- 100-150 L compact nano system.
- Brewtools B150-style system.
- Speidel/Braumeister 200 L-style system.
- 1 BBL pilot system.

Tier 3 fermenter examples:

- 100-150 L stainless conical or unitank.
- 1 BBL unitank.
- Matching capacity matters more than headline brewhouse size.

Tier 3 packaging examples:

- Advanced bottle filler.
- Very small canning or seaming setup.
- Do not model a full professional canning line in the garage phase.

Pressure at Tier 3:

- Garage space should be nearly exhausted.
- Power limits, steam, heat, water use, noise, and storage pressure should show up as events.
- Household tolerance should be strained.
- Visibility and compliance risk should rise quickly.
- The game should say the next step is moving into a professional brewery, not buying endless garage upgrades.

Done when:

- Owning top garage equipment triggers a "ready to move on" message.
- More garage upgrades are blocked or discouraged.
- The player feels productive but constrained.

### 9. Add Timers And In-Game Time Pressure

Purpose: make brewing, fermentation, and packaging feel like real production steps without making the first batch boring.

Latest decision: game time should advance because the player starts actions, not because the browser is open. Waiting for real time while the app is open should not be the main driver of game progress.

Use action-based in-game time:

- Start each day around 7:00 AM.
- Brew day consumes about 6 in-game hours.
- Packaging consumes about 2 in-game hours.
- Cleaning consumes in-game time and energy.
- Fermentation and bottle conditioning progress whenever in-game time advances.
- `End day` advances overnight fermentation and bottle conditioning.

Add an energy bar:

- Start day at 100 energy.
- Brewing costs high energy.
- Packaging costs medium energy.
- Cleaning costs medium to high energy.
- Ordering and selling cost low energy.
- Low energy makes actions slower and increases risk or mistakes.
- If energy is empty, the player should end the day.

Production states should be manually gated:

- `brewing`
- `awaiting-transfer`
- `fermenting`
- `awaiting-packaging`
- `packaging`
- `bottle-conditioning`
- `ready`

Active states have timers and progress. Waiting states stop until the player acts. Do not let one brew click automatically result in finished cases.

Prototype real-time display targets can still be short for playability:

- Tier 1 brew day: 3-5 real minutes.
- Tier 1 fermentation: 8-15 real minutes.
- Tier 1 bottling: 1.5-3 real minutes.
- Tier 1 bottle conditioning: initially short enough to test, but represented as in-game days.
- Better equipment can reduce time, reduce attention, reduce loss, or allow parallel work.

Time should create choices:

- Brew while another batch ferments.
- Clean while waiting.
- Order supplies while waiting.
- Package finished beer.
- Sell finished beer.
- Buy equipment.
- Handle events.

Avoid:

- A first batch that completes in seconds.
- A first batch that forces the player to wait with nothing to do.

Done when:

- Batches have visible timers.
- Cards show in-game time remaining and progress percentage.
- Manual transitions are required for transfer, packaging, and readying cases.
- Multiple batches can be in different stages.
- The player can do other actions while fermentation runs.

### 10. Add Optional Hands-On Brewday Mode

Purpose: make brewing itself an optional deeper mechanic.

The player should be able to choose:

- Auto Brew: simple timer and result.
- Hands-On Brew: a small step-based minigame or workflow window.

Tier 1 BIAB hands-on steps:

- Heat strike water.
- Add grain bag.
- Hold mash temperature.
- Lift and drain bag.
- Boil.
- Add hops at timing windows.
- Chill.
- Transfer to fermenter.
- Clean.

All-in-one hands-on steps:

- Set mash temperature.
- Manage recirculation.
- Lift grain basket.
- Sparge.
- Boil.
- Add hops.
- Chill or transfer.
- Clean.

Three-vessel hands-on steps:

- Heat liquor.
- Mash in.
- Lauter and sparge.
- Boil.
- Whirlpool.
- Knockout transfer.
- Optionally overlap next mash after the first mash completes.

Use Operon workflow names where possible:

- `process.mash`
- `process.lauter_sparge`
- `process.boil`
- `process.whirlpool`
- `process.knockout_transfer`
- `process.primary_fermentation`
- `process.packaging`

Do not add detailed chemistry yet:

- No pH correction system.
- No water salt calculator.
- No enzyme-model simulation.
- No full yeast kinetics.

Done when:

- Hands-on mode exists for at least Tier 1.
- Auto Brew remains available.
- Better equipment changes the hands-on burden.

### 11. Add Sales Channels And Customer Pressure

Purpose: make selling beer more interesting than pressing one sell button.

Customer ladder:

- Friends and family.
- Barbecue parties.
- Friend's wedding or private event.
- Local bar.
- Local event.
- Restaurant.
- Shop or retailer.

Channel behavior:

- Early customers pay cash quickly and ask fewer questions.
- Friends and family should usually pay a lower friends-and-family price or near production cost.
- Private events can pay better but increase visibility.
- Local bars can pay normal commercial rates, with possible cash or volume discounts later.
- Bars may order regularly and create dependable demand.
- After several bar orders, a bar may ask for an invoice.
- Restaurants and shops should usually require invoices, VAT details, traceability, or formal delivery.
- Payment terms can delay cash.
- Failed or blocked orders can leave beer stuck in inventory.

Sales UI direction:

- Replace the generic sell button with available buyer offers.
- Each offer should show cases requested, price, risk/visibility impact, and invoice requirement.
- Player chooses who receives the beer when multiple offers exist.
- Price negotiation and player-set prices can come later.

Important scenario:

- A bar buys cash several times.
- The player brews expecting another easy cash sale.
- The bar asks for an invoice.
- If the player cannot invoice, the order stalls or cancels.
- The player is stuck with beer and no expected cash.
- Risk and pressure increase.

Done when:

- At least three sales channels exist.
- Repeat customers can create expectations.
- Invoice-required sales can block if the player is not compliant.

### 12. Add Reputation, Visibility Risk, And Household Pressure

Purpose: separate "people like the beer" from "too many people are noticing."

Bars:

- Reputation: demand and trust.
- Visibility risk: chance of compliance trouble from selling too much informally.
- Household pressure: garage inconvenience, spending, mess, noise, storage, time.

Risk should increase from:

- High monthly liters.
- Too many cash sales.
- Public events.
- Restaurants or shops.
- Labeled bottles.
- Repeat bar orders.
- Large equipment in a garage.
- Noise, steam, storage, deliveries, and neighbor attention.

Household pressure should increase from:

- Spending too much money.
- Filling the garage.
- Brewing too often.
- Smell, steam, clutter, and late packaging sessions.
- Unpaid bills or low cash.

Use respectful wording. Avoid making household pressure a joke about a spouse. It should represent the whole household and living situation.

Done when:

- Reputation and risk are separate.
- High reputation can be good and dangerous at the same time.
- Risk events can force decisions.

### 13. Add Compliance Incidents

Purpose: make Tier 2 and Tier 3 growth uncomfortable in a believable way.

Compliance concepts to mirror from Operon:

- Sale
- Invoice
- Lot
- Traceability record
- Declaration
- Legal release
- Excise state

Belgian-inspired compliance pressure:

- VAT/invoice requirements.
- AFSCA-style food safety/traceability expectations.
- Belgian excise concepts like fiscal warehouse, AC4, EMCS/ARC for proper commercial movement.

Important rule:

- Packaging beer is not the same as legal release for consumption.
- Do not let the game imply bottled beer is automatically compliant for formal commercial sale.

Incident examples:

- "The bar now needs an invoice."
- "A restaurant asks for traceability details."
- "A local event wants proof you can legally supply them."
- "A neighbor complains about steam and deliveries."
- "Your cash sales are getting too visible."
- "You need to decide whether to stay informal, pause growth, or move toward compliance."

Risk outcome:

- Do not make the first max-risk moment an automatic hard game over unless that is later chosen intentionally.
- Better first behavior: warning, blocked sale, fine, forced pause, lost customer, inventory stuck, household pressure spike, or forced move/professionalization decision.
- Repeated ignored warnings can lead to a shutdown/game over state.

Done when:

- Invoice trouble exists.
- Compliance risk has practical gameplay consequences.
- Tier 3 clearly pushes the player toward leaving the garage.

### 14. Add Crisis Management Actions

Purpose: give the player interesting recovery choices, inspired by management sim crisis mechanics.

Possible actions:

- Pause risky sales.
- Discount beer to informal customers.
- Dump or hold unsold beer.
- Take a small loan.
- Delay equipment purchase.
- Buy cheaper supplies at quality risk.
- Repair or clean equipment.
- Reduce public sales.
- Spend money on paperwork/compliance preparation.
- Turn down a restaurant or event order.

Consequences should be clear:

- Cash changes.
- Reputation changes.
- Visibility risk changes.
- Household pressure changes.
- Inventory changes.
- Future customer access changes.

Done when:

- At least three crisis actions exist.
- A blocked sale or risk event gives the player a response choice.

### 15. Improve Testing

Purpose: protect the simulation while changing the core loop.

Add tests for:

- New game starts with BIAB stock pot, one plastic fermenter, and bottle wand/capper.
- Buying an extra plastic fermenter increases available fermentation slots.
- Buying kettle/brewhouse equipment does not exceed fermenter capacity.
- Buying fermenter equipment reduces risk, loss, or improves quality.
- Buying packaging equipment reduces packaging loss or packaging time.
- Unaffordable equipment cannot be bought.
- Top-tier garage equipment triggers the ready-to-move-on message.
- Old save version is ignored safely.
- Multiple batches can ferment in parallel when multiple fermenters exist.
- A full fermenter blocks another batch from using it.
- Invoice-required sale blocks when player cannot invoice.

Browser checks:

- iPad-like landscape viewport shows the game inside one screen.
- Store opens and closes cleanly.
- Equipment labels change after purchase.
- Main loop works: brew, ferment, package, sell, buy equipment.
- Multiple fermenters are understandable visually.

Done when:

- Existing tests pass.
- New behavior has focused tests.
- Browser check confirms the main loop still works.

### 16. Keep Dist In Sync

Purpose: keep GitHub Pages loading the current code.

For now, the repo tracks built `dist` files. Until deployment is cleaned up:

- Change source files.
- Run the build.
- Confirm `dist` updated.
- Include both source and matching dist changes in implementation work.

Later cleanup:

- Consider GitHub Actions build/deploy.
- Stop manually committing `dist` if Pages can deploy from build artifacts.

Done when:

- Source and `dist` represent the same behavior.
- GitHub Pages does not lag behind local source changes.

## Suggested Phase Breakdown

### Phase 1: Equipment And Capacity

- Stabilize current code.
- Replace upgrades with equipment.
- Add Tier 1 BIAB, plastic fermenters, and bottling.
- Add multiple fermenters.
- Add capacity bottlenecks.
- Add store overlay.
- Add tests.

### Phase 2: Timers And Parallel Work

- Add meaningful brew, ferment, and bottling timers.
- Let fermentation run while the player does other tasks.
- Support multiple batches in different stages.
- Add cleaning/order/sell/buy side actions.

### Phase 3: Tier 2 And Tier 3 Growth

- Add all-in-one and three-vessel paths.
- Add stainless fermenters.
- Add semi-auto bottling.
- Add Tier 3 compact nano equipment.
- Add garage ceiling messaging.

### Phase 4: Risk, Sales, And Compliance Pressure

- Add sales channel ladder.
- Add repeat customer behavior.
- Add invoice-required orders.
- Add visibility risk and household pressure.
- Add compliance incidents and recovery actions.

### Phase 5: Optional Hands-On Brewing

- Add Auto Brew and Hands-On Brew choice.
- Implement Tier 1 BIAB workflow first.
- Map workflow names to Operon process steps.
- Expand later to all-in-one and three-vessel brewing.

## Do Not Add In This Phase

- Authentication.
- Accounts.
- Cloud saves.
- Backend writes.
- Supabase sync.
- Notion import.
- OpenRUM/Operon live integration.
- Multiplayer.
- Shared progress.
- Full 3D brewery.
- Full chemistry simulator.
- Professional brewery facility management.

## Open Design Questions

- Should a batch reserve a fermenter when brew starts, or only when transfer happens?
- Should the player be allowed to brew without a reserved fermenter and risk being stuck?
- Should all-in-one systems each run one independent batch queue?
- How harsh should first max-risk consequences be?
- Should Tier 3 force a move, or only strongly recommend it?
- Should compliance preparation be a purchasable path before moving professional?
