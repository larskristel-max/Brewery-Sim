# Operon Integration Principles

Brewery-Sim should eventually act as a visualization and interaction layer for brewery operations instead of duplicating operational logic that belongs in Operon. The game can render, explain, and let players interact with operational state, but source-of-truth rules for brewery planning, execution, inventory movement, quality checks, and traceability should migrate to shared Operon-backed concepts as that integration becomes available.

Until Operon synchronization exists, prototype systems may remain inside the game to support design exploration and playable iteration. Those systems should be treated as temporary stand-ins: keep them simple, isolate them from presentation code where practical, and avoid growing them into a second production operations model.

## Candidate Shared Concepts

The following concepts are candidates to be shared with, synchronized from, or ultimately owned by Operon.

### Recipes

Recipes should describe reusable production intent: ingredients, quantities, process steps, expected durations, target parameters, and outputs. The game should visualize recipes and allow player selection or inspection, while Operon should become the source of truth for recipe definitions and operational constraints.

### Batches

Batches should represent concrete executions of recipes. Batch identifiers, lifecycle state, timing, linked vessels or equipment, and progress through production should be shared rather than reimplemented independently in the game.

### Inventory

Inventory should cover raw materials, intermediates, finished goods, packaging materials, and losses or adjustments. The game may display quantities and support interactions, but operational inventory math and authoritative stock movements should live in the shared model.

### Production Tasks

Production tasks should describe work to be performed, such as milling, mashing, boiling, fermentation checks, transfers, cleaning, packaging, and maintenance-adjacent actions. The game can translate these tasks into player prompts, worker behaviors, and visual affordances, while Operon should own task definitions, dependencies, and completion state.

### Traceability

Traceability should connect ingredients, batches, equipment usage, process events, QA/QC results, packaging runs, and finished goods. The game should surface this chain visually when useful, but should not invent a separate lineage model once Operon data is available.

### Packaging

Packaging should include packaging runs, container formats, label or SKU details, packaged quantities, rejects, and finished-goods outputs. The game can present packaging activity and interactions, while shared logic should determine packaging outcomes and inventory updates.

### QA/QC Events

QA/QC events should represent measurements, inspections, sensory checks, lab results, deviations, holds, releases, and corrective actions. The game can visualize alerts and feedback, but operational quality state and result interpretation should be shared with Operon.

## Game-Specific Responsibilities

The following responsibilities should remain game-specific because they are presentation, interaction, or prototype concerns rather than authoritative operational logic.

### Camera and Visual Presentation

Camera behavior, framing, scene composition, lighting, shaders, models, and other rendering choices should remain in the game layer.

### Worker Animation

Worker locomotion, gestures, timing blends, animation state machines, and cinematic staging should remain game-specific, even when they are driven by shared production task state.

### World-Space UI

World-space labels, radial menus, object highlights, tooltips, overlays, and interaction affordances should remain in the game layer. They can display shared operational data without becoming the source of that data.

### Player Feedback Effects

Particles, sounds, screen shake, haptics, animations, success or failure cues, and other feedback effects should remain game-specific.

### Simplified Prototype-Only Systems Before Operon Sync Exists

Before Operon synchronization exists, the game may include simplified prototype systems for recipes, batches, inventory, tasks, traceability, packaging, and QA/QC. These systems should be intentionally limited, clearly named or documented as temporary, and designed so they can be replaced by Operon-backed data without rewriting unrelated presentation systems.
