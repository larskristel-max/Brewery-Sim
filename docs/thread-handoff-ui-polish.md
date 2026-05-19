# Brewery-Sim Current Handoff

Updated: 2026-05-19  
Local preview: `http://127.0.0.1:4173/`  
Current branch: `main`  
Current remote base: `origin/main` at `6b006f0` (`Add deployed garage assets for Pages`)

## Current State

This thread moved Brewery-Sim further toward the agreed direction: a mobile-first cozy Belgian garage brewery game where the room objects carry the loop. The app still uses the dependency-light TypeScript setup and tracked `dist` output. No Supabase, Notion, Cloudflare, auth, accounts, or Operon API integration was added.

The working tree contains source updates plus rebuilt `dist` output. The untracked review file `docs/ui-ux-gameplay-review-2026-05-18.md` remains present and should be preserved.

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
- The shop overlay is centered like the other large modals.
- Shop flow is now two-step:
  1. Choose `Supplies` or `Equipment`.
  2. Show the relevant cart cards.
- Floating supply/inventory badges, including the `Bottles 20/40` badge, were removed from the garage scene. Inventory remains available through the `+` menu.

### Guidance And Mobile Fit

- Guidance pill is compact and positioned above the pallet lane.
- Station sheets are checked against `844x390`, `1040x432`, and `667x375` landscape conditions.
- Large station panels now show active progress for fermenting batches.

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

- `npm.cmd test`
- `npm.cmd run test:browser`

The browser regression covers the direct garage loop, recipe category flow, stock batch indicators, station sheet progress, no sprite movement/fading, shop cart flow, centered overlays, hidden floating inventory badges, pallet level changes, and sale payoff.

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

- The shop cart icon is now a real SVG cart, but its final visual quality should be judged in the browser at the target phone-landscape size.
- Recipe cards fit better now, but future recipes with more ingredients may need pagination or tighter card content.
- The old `renderSceneSupplyHotspots` helper remains in source but is no longer rendered. It can be removed in a later cleanup if no longer wanted.
- Browser-local save migrations were extended. Keep testing old saves if the save schema changes again.
- The current `main` working tree has not been pushed from this machine unless the next operator explicitly commits and pushes.

## Recommended Next Tasks

1. Play one fresh loop from a cleared save on `844x390`.
2. Tune the cart icon and bottom-right control spacing if the icon still reads poorly.
3. Continue reducing nonessential overlays in favor of object-first station sheets.
4. Add richer payoff feedback when pallet fills and when cases are sold.
5. Remove stale helpers and old branch clutter only after confirming no needed code remains.
