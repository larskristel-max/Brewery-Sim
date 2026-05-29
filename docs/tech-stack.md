# Tech Stack

## Current Implementation Default

The current Brewery-Sim implementation default is a **dependency-light TypeScript DOM prototype** compiled with `tsc`.

This is intentional. The main unknown is still whether the garage brewery loop is understandable, tactile, and fun. A small web prototype keeps simulation rules easy to inspect, makes Codex-driven iteration fast, and lets playtesters open the game in a browser before the project commits to a full game-engine workflow.

Current stack:

- TypeScript for deterministic game state, selectors, and UI rendering.
- DOM/CSS for the garage scene, overlays, touch targets, and responsive layout.
- Static assets under `public/assets`.
- Local-only browser persistence through `localStorage`.
- GitHub Pages artifact deployment from the built static site.
- Deterministic Node tests plus Playwright browser regression.

## Why Not Unity Yet

Unity remains a plausible later production engine, but it is not the current default. Moving to Unity before the first loop is proven would add engine, scene, asset, and build complexity before the product questions are settled.

Use the current TypeScript prototype until these questions are answered:

- Is the first brew -> ferment -> package -> sell loop fun without dashboard friction?
- Does the garage floor work as the main playable surface?
- Which brewing pressures create good operational stories?
- Which mobile interaction patterns are worth preserving?
- Which visual assets and spatial layout choices are stable enough to port?

## Future Engine Research

### Unity

Unity is still a strong candidate for a later production build if Brewery-Sim needs deeper scene tooling, richer animation, character movement, pathfinding, or isometric/3D production layouts. It has mature UI tooling and a large ecosystem, but it should be treated as a future migration option, not the active implementation target.

### Godot

Godot remains a reasonable lighter engine candidate if the project prioritizes open-source tooling, small footprint, and fast iteration with 2D or lightweight 3D scenes.

### Unreal Engine

Unreal is likely overkill for the current concept. It may become relevant only if high-fidelity 3D presentation becomes central to the product, which is not the current prototype goal.

## Migration Rule

Do not scaffold a game-engine project until the TypeScript prototype has proven the core loop and the team has identified which systems, assets, and interaction patterns should survive a migration.
