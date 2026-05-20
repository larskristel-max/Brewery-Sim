# Brewery-Sim Current Handoff

Updated: 2026-05-20  
Local preview: `http://127.0.0.1:4173/`  
Current branch: `main`  
Current remote base: `origin/main` at `97309fd` (`Simplify mobile garage UI`)

## Current State

This thread moved Brewery-Sim further toward the agreed direction: a mobile-first cozy Belgian garage brewery game where the room objects carry the loop. The app still uses the dependency-light TypeScript setup and tracked `dist` output. No Supabase, Notion, Cloudflare, auth, accounts, or Operon API integration was added.

The working tree is clean. `main` has been pushed to `origin/main` at `97309fd`, and the latest GitHub Pages deployment succeeded.

## Important Branch Notes

Do not blindly merge the old local branches into `main`.

- `codex/stabilize-garage-hotspots` is already merged into `main`.
- `codex/add-real-equipment-sprites` has old commits that would conflict with or remove current asset paths if merged directly.
- `codex/tier2-layout-preview` is older than the current locked placement work now in the working tree.
- `codex/local-main-before-clean-20260517-135653` is a safety snapshot branch, not a current feature branch.

If old branch content is needed later, cherry-pick deliberately after reviewing the diff.

## Completed In This Pass

### Direct Garage Loop

- Kept the garage floor as the primary interaction surface.
- Kettle opens the recipe flow.
- Fermenters, bottling bench, and pallet open large centered station sheets instead of tiny cards or direct hidden actions.
- Transfer, package, and sell actions now close the station sheet after dispatch.
- Active equipment images no longer move or become nearly transparent when clicked.
- Blue dotted active outlines were removed from working equipment.
- Equipment now pulses only when player input is actually needed, such as a fermenter reserved for transfer.

### Locked Equipment Placement

The exact placement values are now centralized in `src/data/garageLayout.ts` and reflected in `dist`.

- `brewhouse`: `x 24.6`, `y 53.1`, `width 17`
- `fermenter-slot-1`: `x 38.6`, `y 45.2`, `width 14.5`
- `fermenter-slot-2`: `x 49.4`, `y 45.2`, `width 14.5`
- `fermenter-slot-3`: `x 60.2`, `y 45.2`, `width 14.5`
- `fermenter-slot-4`: `x 50.5`, `y 65`, `width 12`
- `fermenter-slot-5`: `x 61.5`, `y 65`, `width 12`
- `milling`: `x 18`, `y 76.5`, `width 10`
- `packaging`: `x 74.5`, `y 62.4`, `width 13.1`

### Recipe Flow

- Recipe selection is category-first:
  - Starter
  - Hop-forward
  - Cool fermentation
  - Farmhouse/Wheat
  - Dark
  - Experimental
- Recipe cards now show required ingredients, stocked amounts, missing amounts, and incoming deliveries.
- Category cards and recipe cards show how many batches can be brewed from current stock.
- `Order 1 batch` orders one full extra recipe ingredient set each click.
- The recipe modal is larger and centered; a single recipe card spans the full modal width to avoid scrolling in phone landscape.

### Shop Cart

- The left-side text shop badge was replaced with an icon-only shopping cart button.
- The cart icon sits beside the bottom-right `+` button.
- The cart icon was tuned for better readability at phone-landscape size.
- On mobile landscape, the shop overlay owns focus: HUD, cart, and `+` controls hide behind it.
- The initial shop cart screen is shorter, warmer, and less dashboard-like than the earlier large blue-card panel.
- Shop flow is now two-step:
  1. Choose `Supplies` or `Equipment`.
  2. Show the relevant cart cards.
- Floating supply/inventory badges, including the `Bottles 20/40` badge, were removed from the garage scene. Inventory remains available through the `+` menu.

### Guidance And Mobile Fit

- Guidance pill is compact and positioned above the pallet lane.
- On mobile landscape, persistent `Missions`, the bottom pressure strip, and the floor-note ticker are hidden so the garage floor remains readable.
- Notifications are now a compact log-only popover rather than a mixed equipment/status dashboard, and they no longer cover the bottling bench at target landscape sizes.
- The delivery marker now reads as an in-scene delivery object instead of a blank amber UI tile.
- Post-sale guidance no longer resets to `Tap the stock pot to brew Garage Blonde`; it advances toward selling remaining cases or adding a second fermenter.
- Demand progress display is capped, so completed objectives do not show overfilled counts such as `5/4`.
- Station sheets are checked against `844x390`, `1040x432`, and `667x375` landscape conditions.
- Large station panels now show active progress for fermenting batches.

### Pallet And Sale Payoff

- Packaging now shows a transient floor payoff when cases move onto the pallet.
- Selling now shows a transient cash/reputation payoff on the garage floor.
- Browser regression coverage asserts both payoff moments.

### Sales, Lots, And Operon-Informed Local Model

- Sales offers use shared selectors so displayed revenue matches reducer cash delta.
- Finished beer is modeled as lot-like local stock with source batch, recipe, cases, volume, quality, market appeal, packaging state, and sale state.
- Sales consume finished lots and record movements.
- Added a small local Operon mapping module for process, equipment, inventory movement, and sales-risk vocabulary. This is only a semantic mapping layer, not an integration.
- Added rolling local inventory movement events:
  - `order-created`
  - `order-received`
  - `ingredients-consumed`
  - `beer-packaged`
  - `cases-sold`
  - `loss-recorded`

## Validation Run

Latest successful checks:

- `npm.cmd run test:all`
- Live GitHub Pages mobile checks at `844x390`, `667x375`, and `1040x432`
- Fresh live mobile loop: `brew -> transfer -> ferment -> package -> pallet -> sell out -> post-sale guidance -> shop cart`

The browser regression covers the direct garage loop, recipe category flow, stock batch indicators, station sheet progress, no sprite movement/fading, shop cart flow, overlay focus ownership, hidden persistent mobile chrome, hidden floating inventory badges, pallet level changes, and sale payoff.

## Key Files Changed

- `src/main.ts`
- `src/styles/garage.css`
- `src/data/garageLayout.ts`
- `src/game/schema.ts`
- `src/game/selectors.ts`
- `src/game/simulation.ts`
- `src/game/persistence.ts`
- `src/game/initialState.ts`
- `src/game/operonMappings.ts`
- `scripts/run-tests.mjs`
- `scripts/run-browser-regression.mjs`
- rebuilt tracked output under `dist/`

## Things To Watch Next

- Recipe cards fit better now, but future recipes with more ingredients may need pagination or tighter card content.
- The old `renderSceneSupplyHotspots` helper remains in source but is no longer rendered. It can be removed in a later cleanup if no longer wanted.
- Browser-local save migrations were extended. Keep testing old saves if the save schema changes again.
- GitHub CLI is installed at `C:\Program Files\GitHub CLI\gh.exe` and authenticated as `larskristel-max`. New terminals should find `gh` on PATH; the current Codex shell may still need the full path until its environment refreshes.

## Recommended Next Tasks

1. Continue playtesting station sheets on phone landscape, especially recipe and equipment store density after the second fermenter objective.
2. Improve the second fermenter purchase/install payoff so the new bucket appears as a clear progression moment.
3. Continue reducing nonessential overlays in favor of object-first station sheets.
4. Remove stale helpers and old branch clutter only after confirming no needed code remains.
5. Use `gh` for future Codex/GitHub review thread checks now that the CLI is installed and authenticated.
