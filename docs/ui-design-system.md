# Brewery-Sim UI Design System

This document is the canonical visual and interaction reference for the next Brewery-Sim UI phase.

The game should feel like a one-screen operational brewery cockpit, not a scrollable management dashboard.

> The game does not want more UI. The game wants more brewery.

## Visual reference

The current reference image is stored at:

```text
docs/ui/brewery-sim-ui-design-system.jpeg
```

Embed when available:

![Brewery-Sim UI Design System](ui/brewery-sim-ui-design-system.jpeg)

## Core UI principles

### 1. Scene first

The brewery scene is the home screen, the emotional center, and the main interaction layer.

Rules:

- The brewery should remain visible during normal gameplay.
- The player should feel anchored in the physical space.
- UI should support the brewery scene, not replace it.
- Prefer visible world state over abstract panels.

### 2. One-screen gameplay

Normal gameplay must fit in one viewport.

Rules:

- No vertical scrolling during core gameplay.
- No stacked page sections for production, inventory, logs, upgrades, or supplies.
- Use overlays, popups, edge HUD, and world-embedded indicators instead of page flow.
- The default screen should feel like one living brewery, not a webpage.

### 3. Lightweight edge-based HUD

The HUD should float lightly above the brewery.

Rules:

- Keep the HUD compact, translucent, and edge-based.
- Avoid a tall website-style navbar.
- Reduce persistent branding after the first impression.
- Prioritize glanceable state over decorative header mass.
- Target a compact HUD height of roughly 48–56px on landscape layouts when possible.

HUD should include only essential persistent data:

- day/time
- cash
- reputation
- notifications
- current/next action where useful

### 4. Context over panels

Contextual UI should appear near the object or problem it explains.

Use for:

- equipment details
- contamination warnings
- mission updates
- supply arrivals
- quick actions
- packaging status
- low-stock warnings

Rules:

- Never use full-screen contextual popups for ordinary actions.
- Keep popups small and dismissible.
- Place them near the relevant equipment or edge.
- Do not obscure the brewery unnecessarily.

### 5. Diegetic / embedded information

Information should often live inside the brewery world.

Examples:

- storage shown on shelves
- cases shown as visible stacks
- dirty equipment shown visually
- low stock shown through missing sacks/crates
- active batch signage on the fermenter/kettle/bottling station
- delivery pallets appearing in the space

The player should read the brewery by looking at it.

### 6. Temporary focus overlays

Some actions need more detail, but they should still feel temporary.

Use focus overlays for:

- inventory detail
- supply orders
- upgrades
- recipe/brew selection

Rules:

- Dim or blur the brewery slightly behind the overlay.
- Keep overlays compact and purpose-built.
- Provide a clear close action.
- Return cleanly to the brewery scene.
- Avoid making overlays feel like separate app pages.

### 7. Physical storytelling

Systems should create visible operational stories.

Good moments:

- the fermenter is dirty before a risky batch
- cases pile up and crowd the floor
- bottles run out before packaging
- delivery arrives and creates storage pressure
- packaging becomes chaotic under demand pressure
- a batch gets an off-note because cleaning was delayed

The UI should help the player understand these stories visually.

## Anti-patterns

Avoid:

- giant stacked panels
- scrollable gameplay pages
- ERP dashboards
- admin CRUD screens
- Notion-like layouts
- inventory as database rows
- upgrade shop as huge blue cards
- large persistent top navbars
- logs that consume half the screen
- hidden simulation state with no visual representation

## Implementation rules

- Core gameplay screen must not require vertical scrolling.
- Brewery scene should occupy the majority of the viewport during normal play.
- Logs, inventory, supplies, upgrades, and recipes should be temporary overlays or world-embedded interactions.
- HUD should be compact, translucent, and visually secondary to the scene.
- Alerts should be short, contextual, and spatial when possible.
- The player should always know what to do next without opening a dashboard.

## Design compass

Before adding UI, ask:

> Does this increase brewery presence or UI presence?

Prefer brewery presence.

Before adding realism, ask:

> Does this create operational storytelling or just admin work?

Prefer operational storytelling.
