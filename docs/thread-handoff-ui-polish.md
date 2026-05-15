# Brewery-Sim UI Polish Handoff

## Current repository state

- Repository: `https://github.com/larskristel-max/Brewery-Sim`
- GitHub Pages: `https://larskristel-max.github.io/Brewery-Sim/`
- Local test URL: `http://127.0.0.1:4173/`
- Latest merged work: PR #14, `[codex] Polish landscape brewery UI`
- Latest main commit at handoff: `ae68e1c` (`Polish landscape brewery UI`)

## What was completed in this thread

- Preserved the dependency-light TypeScript setup. The app still builds with `tsc`; no React or Vite migration was introduced.
- Preserved tracked `dist` output and rebuilt it after source changes.
- Added the clean garage brewery background asset at `assets/garage-brewery-floor.png`.
- Implemented the garage brewery UI in `src/main.ts` and `src/styles/garage.css`.
- Added outside-click dismissal for expanded equipment cards, Missions, and Notifications.
- Kept action buttons working without closing before dispatch:
  - Brew
  - Inspect
  - Bottle
  - Clean
  - Sell
  - Missions
  - Notifications
- Reworked Notifications into an icon-only bell button with a small count badge.
- Reduced expanded-card overlap in phone landscape.
- Hid obstructing nearby hotspots only when they interfere with the active expanded card.
- Added a portrait-only rotate blocker that fully covers the game and says Brewery-Sim is played in landscape mode.
- Verified the browser experience at `844x390` and portrait orientation.
- Merged the work into `main` through GitHub PR #14.
- Deleted the merged `codex/create-operon-integration-documentation` remote branch.
- Left closed-but-unmerged remote branches intact.

## Validation already run

- `npm.cmd run build`
- `npm.cmd run test`
- In-app browser checks at `844x390`:
  - expanded equipment card closes when tapping empty scene space
  - expanded card does not close before its action buttons dispatch
  - Missions and Notifications close when tapping outside
  - notification button is icon-only with a count badge
  - fermenter and bottling station cards avoid awkward overlap better than before
  - Brew, Inspect, Bottle, Clean, and Sell dispatch correctly
- In-app browser portrait check:
  - rotate prompt fully blocks the game

## Important correction from latest review

The attempted "bottom Menu opens lower panels" idea is rejected.

Brewery-Sim needs to remain a one-screen game in phone landscape. The next implementation should not hide core gameplay information behind a bottom drawer or create a scrolling/dashboard mode.

## UI menu TODO for the next thread

Goal: make the `844x390` landscape view a true one-screen playable game.

1. Keep `body`, `.game-shell`, and `.garage-scene` locked to one viewport in phone landscape.
   - No browser scrollbar.
   - No lower dashboard content flowing below the scene.
   - No bottom drawer menu for normal play.

2. Remove the lower panels from normal document flow at the phone-landscape breakpoint.
   - Production, Inventory, Upgrades, and Event Log should not appear below the scene at `844x390`.
   - Do not replace them with a bottom menu drawer.

3. Fold essential information into compact, always-available scene/HUD surfaces.
   - Production: one compact batch/status strip.
   - Inventory: only essentials needed for immediate decisions, such as water, cases, and key constrained supplies.
   - Upgrades/orders/log: expose only urgent/actionable state through Missions or Notifications.

4. Missions must not be blocked by equipment cards.
   - Raise the Missions popover above hotspot cards.
   - If the popover overlaps a hotspot, dim or hide only the obstructing hotspot while Missions is open.
   - Missions itself should not be visually covered by the brew system card.

5. Notifications should follow the same layering rule as Missions.
   - The bell remains icon-only with a badge.
   - The popover should open above scene cards and close on outside click.

6. Keep equipment cards as the main interaction surface.
   - Kettle expanded card: Brew, Clean, disabled Repair, disabled Replace.
   - Fermenter expanded card: Inspect, Clean, disabled Repair, disabled Replace.
   - Bottler expanded card: Bottle, Clean, disabled Repair, disabled Replace.
   - Cases expanded card: Sell.

7. Reverify in the in-app browser at `844x390`.
   - No scrollbar.
   - No lower dashboard visible below the scene.
   - Missions does not collide with the brew system card.
   - Notifications does not collide with active cards.
   - Empty scene taps still close open overlays/cards.
   - Core actions still dispatch.

## Files most likely to edit next

- `src/main.ts`
- `src/styles/garage.css`
- rebuilt tracked output under `dist/`

Avoid changing the save schema, economy, recipe model, or simulation behavior unless the next task explicitly asks for it.
