# Brewery-Sim TODO

This file tracks actionable development work. Keep the README focused on project overview and design direction.

## Current Rijn Review Status

Verdict: **Green for the Rijn foundation pass; resume new mechanics only after this cleanup is reviewed and merged**.

The prototype has a working first loop: start batch, transfer manually, ferment, package manually, sell, and restock. The deterministic simulation layer is a good MVP base and already includes useful brewing pressures such as contamination risk, ingredient condition decay, storage overflow, fermenter temperature impact, sales feedback, browser-local persistence, and campaign-gated onboarding.

Do **not** add more gameplay systems until this cleanup is reviewed and merged.

## P0 - Must fix before new mechanics

### 1. Keep deploy tests honest

- [x] Run `npm test` in `.github/workflows/pages.yml` before Pages artifact upload/deploy.
- [x] Ensure deterministic gameplay regressions cannot deploy just because TypeScript builds.
- [x] Run `npm run test:browser` in CI with an explicit Chromium install.

### 2. Refactor `src/main.ts` into focused UI modules

- [x] Keep `src/main.ts` as a thin entry point/orchestrator.
- [x] Move scene rendering into a focused UI module.
- [x] Move overlay rendering/state helpers into a focused UI module.
- [x] Move input/interaction dispatch into a focused UI module.
- [x] Move HUD and story/tutorial rendering into focused UI modules.
- [x] Move layout debug behavior into a focused UI module.
- [x] Keep deterministic rules in `src/game/simulation.ts`.
- [x] Preserve current gameplay behavior for the extracted modules.
- [x] Confirm `npm run build` passes.
- [x] Confirm `npm run test` passes.

Suggested module names:

```text
src/ui/appShell.ts
src/ui/garageScene.ts
src/ui/hud.ts
src/ui/inputHandlers.ts
src/ui/overlays.ts
src/ui/stationViewModel.ts
src/ui/storyPanels.ts
src/ui/tutorialGuidance.ts
src/ui/layoutDebug.ts
src/ui/renderHelpers.ts
```

### 3. Canonicalize asset paths

- [x] Use `public/assets/` as the canonical runtime asset root.
- [x] Remove, document, or clearly mark any duplicate non-runtime `assets/` tree.
- [x] Keep scene backgrounds under `public/assets/garage/backgrounds/`.
- [x] Keep equipment sprites under `public/assets/garage/equipment/`.
- [x] Use tier subfolders such as `tier1/` and `tier2/` only where useful.
- [x] Mark `sprite: null` equipment visuals with explicit TODO/status metadata.

## P1 - Fix next

### 1. Protect first-loop clarity

- [x] Keep the first five minutes focused on: Mash -> Ferment -> Package -> Sell.
- [x] Delay, soften, or hide non-core pressure feedback until after the first successful sale.
- [x] Make sure compliance, household pressure, demand variants, storage overflow, and temperature do not overwhelm first-loop clarity.
- [x] Keep auditing the first five minutes after each new UI/system addition.

### 2. Validate portrait mobile readability

- [x] Decide that portrait phone play stays blocked until the garage floor has a portrait-specific layout.
- [x] Keep the portrait rotate blocker tested so the HUD, overlays, tap targets, and object discovery do not render in an unsupported layout.
- [x] Keep narrow landscape HUD and overlays subordinate to the garage scene.
- [x] Confirm landscape phone tap targets remain usable on 667x375.

### 3. Clarify tier layout data

- [x] Keep slot-based percentage positioning as the responsive layout foundation.
- [x] Keep tier 1 and tier 2 layout differences explicit through `garageLayout.ts`.
- [x] Continue validating tier 2 preview before adding more physical equipment.

### 4. Improve sale consequence readability

- [x] Preview cash, reputation, visibility, compliance, and household pressure changes before a buyer offer is accepted.
- [x] Keep first-sale offers simple; introduce the full consequence preview only when the extra risks are visible.

## P2 - Cleanup and polish

- [x] Align stack wording with the actual current architecture: dependency-light TypeScript DOM prototype compiled with `tsc`.
- [x] Add concise developer notes for `npm install`, `npm run build`, `npm run test`, and `npm run test:browser`.
- [x] Document the Playwright browser installation requirement for browser regression tests.
- [x] Document `layoutDebug=1`.
- [x] Document `tierPreview=2`.
- [x] Keep browser regression setup documented even if it is not yet a required deploy gate.
- [x] Split `src/styles/garage.css` into clearer scene, overlay, control, story/station, and responsive sections once the UI module split starts.

## Recommended PR sequence

1. Review and merge the Rijn foundation cleanup.
2. Resume gameplay expansion only after the cleanup is merged.

## Completed Rijn Items

### Local save persistence

Implemented. Keep future save changes versioned and outside core simulation logic.

- [x] Auto-save the full `GameState` after game state changes.
- [x] Restore the saved state on startup.
- [x] Keep the save local only through `localStorage`.
- [x] Add a clear reset/new game action.
- [x] Include a save `version` guard so incompatible future state can be ignored or migrated.
- [x] Keep persistence outside core simulation logic.
- [x] Do not add accounts, cloud saves, Supabase, Operon integration, or backend infrastructure.
