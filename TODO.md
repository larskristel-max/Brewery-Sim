# Brewery-Sim TODO

This file tracks actionable development work. Keep the README focused on project overview and design direction.

## Current Rijn Review Status

Verdict: **🟡 Fix foundation first**.

The prototype has a working first loop: start batch, transfer manually, ferment, package manually, and sell. The deterministic simulation layer is a good MVP base and already includes useful brewing pressures such as contamination risk, ingredient condition decay, storage overflow, fermenter temperature impact, and sales feedback.

Do **not** add more gameplay systems until the foundation cleanup below is complete.

## P0 — Must fix before new mechanics

### 1. Add CI test enforcement before deploy

- [ ] Update `.github/workflows/pages.yml` so `npm test` runs before Pages artifact upload/deploy.
- [ ] Keep browser regression tests separate until Playwright browser installation is reliable in CI.
- [ ] Ensure gameplay regressions cannot deploy just because TypeScript builds.

### 2. Refactor `src/main.ts` into focused UI modules

- [ ] Keep `src/main.ts` as a thin entry point/orchestrator.
- [ ] Move scene rendering into a focused UI module.
- [ ] Move overlay rendering/state helpers into a focused UI module.
- [ ] Move input/interaction dispatch into a focused UI module.
- [ ] Move layout debug behavior into a focused UI module.
- [ ] Keep deterministic rules in `src/game/simulation.ts`.
- [ ] Preserve current gameplay behavior.
- [ ] Confirm `npm run build` passes.
- [ ] Confirm `npm run test` passes.

Suggested module names:

```text
src/ui/appShell.ts
src/ui/sceneRenderer.ts
src/ui/overlays.ts
src/ui/inputHandlers.ts
src/ui/layoutDebug.ts
src/ui/renderHelpers.ts
```

### 3. Canonicalize asset paths

- [ ] Use `public/assets/` as the canonical runtime asset root.
- [ ] Remove, document, or clearly mark any duplicate non-runtime `assets/` tree.
- [ ] Keep scene backgrounds under `public/assets/garage/backgrounds/`.
- [ ] Keep equipment sprites under `public/assets/garage/equipment/`.
- [ ] Use tier subfolders such as `tier1/` and `tier2/` only where useful.

## P1 — Fix next

### 1. Reduce early-game complexity exposure

- [ ] Keep the first five minutes focused on: Mash → Ferment → Package → Sell.
- [ ] Delay, soften, or hide non-core pressure feedback until after the first successful sale.
- [ ] Make sure compliance, household pressure, demand variants, storage overflow, and temperature do not overwhelm first-loop clarity.

### 2. Validate portrait mobile readability

- [ ] Reduce top HUD density on narrow screens.
- [ ] Keep overlays subordinate to the garage scene.
- [ ] Confirm tap targets remain usable on iPhone-sized screens.
- [ ] Confirm object discovery remains clear in portrait.

### 3. Clarify tier layout data

- [ ] If tier 1 and tier 2 layouts are identical, collapse the abstraction for now or make intended differences explicit.
- [ ] Keep slot-based percentage positioning as the responsive layout foundation.

## P2 — Cleanup and polish

- [ ] Align stack wording with the actual current architecture: dependency-light TypeScript DOM prototype compiled with `tsc`, not React/Vite-first if that is no longer true in code.
- [ ] Add concise developer notes for `npm install`, `npm run build`, `npm run test`, and `npm run test:browser`.
- [ ] Document the Playwright browser installation requirement for browser regression tests.
- [ ] Document `layoutDebug=1`.
- [ ] Document `tierPreview=2` if supported.
- [ ] Mark `sprite: null` equipment visuals with explicit TODO/status metadata.
- [ ] Keep browser regression setup documented even if it is not yet a required deploy gate.

## Recommended PR sequence

1. CI test gate PR.
2. `src/main.ts` modular split PR.
3. Asset-path canonicalization and developer docs PR.
4. Mobile portrait readability pass PR.
5. Resume gameplay expansion only after the foundation cleanup is merged.

## Deferred

### Local save persistence

Local save persistence remains useful, but it is no longer the immediate next task after the Rijn review. Do this after foundation cleanup.

Requirements:

- [ ] Auto-save the full `GameState` after game state changes.
- [ ] Restore the saved state on startup.
- [ ] Keep the save local only through `localStorage`.
- [ ] Add a clear reset/new game action.
- [ ] Include a save `version` guard so incompatible future state can be ignored or migrated.
- [ ] Keep persistence outside core simulation logic.
- [ ] Do not add accounts, cloud saves, Supabase, Operon integration, or backend infrastructure.
