# Brewery-Sim UI Design System

Brewery-Sim uses a scene-first interface. The brewery floor is the primary surface, and UI exists only to clarify the operation in progress.

## Core principle

The game does not want more UI. The game wants more brewery.

When a design tradeoff is unclear, prefer the option that increases brewery presence over interface presence.

## Layer model

### Base layer — persistent brewery scene

- The brewery scene remains visible during normal gameplay.
- The player should feel like they are operating inside the garage, not navigating away to a dashboard.
- Use spatial interaction, world labels, visible equipment states, shelves, crates, pallets, clutter, dirt, steam, and glow before adding abstract panels.

### HUD layer — lightweight cockpit glass

The HUD should be compact, translucent, and edge-based.

Persistent HUD information is limited to:

- day and time
- cash
- reputation
- notifications
- save/reset status where needed

HUD rules:

- keep height compact, roughly 48–56 px on the reference landscape layout
- reduce branding and subtitles
- use light borders and high blur/translucency
- avoid heavy segmentation lines
- do not create a website navbar feel

### Context layer — temporary popups

Use contextual popups for immediate local interactions:

- equipment details
- contamination warnings
- mission progress
- packaging status
- notification feed

Contextual popups must stay compact and must not replace the brewery scene.

### Focus layer — temporary immersive overlays

Use focus overlays for detailed tasks that need more room:

- recipe/brew selection
- supply ordering
- upgrades/workshop installation
- inventory detail
- clipboard log review

Focus overlays should dim the brewery slightly, close cleanly, and preserve the feeling that the player is still in the brewery.

## Anti-patterns

Avoid drifting toward:

- ERP software
- dashboard management
- giant menus
- spreadsheet optimization
- mobile idle game UX
- persistent tab sets
- large stacked panels in normal document flow

## One-screen layout rule

The main gameplay view must fit inside one screen without page scrolling. Large systems should be converted into contextual overlays, popups, or embedded world interactions.
