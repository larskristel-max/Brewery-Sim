# Old Stables vertical-slice verification

Date: 2026-07-15

## Completion standard

The slice is judged as a player-facing 2.5D management experience, not as a simulation-only test or a static concept-art presentation. Verification covers the complete route, visible interaction feedback, scene staging, responsive layout, persistence, branching outcomes, and the safe brewery-data boundary.

## Acceptance evidence

| Requirement | Authoritative evidence |
| --- | --- |
| A new player can finish without developer guidance | The opening explains the role and stakes. The first three actions use an on-screen guidance ribbon. Later objectives, world markers, contextual commands, paused decision panels, active-job text, and milestone controls guide the remaining route. `ui_interaction_test.gd` completes the real interface route through promotion. |
| Required actions have visible affordance and feedback | Brewery equipment has pointer hotspots, hover/selected rings, focus zoom, station labels, contextual commands, worker assignment, animated progress, status feedback, and sound cues. |
| Text is readable and unobscured | Visual captures were reviewed at 1280×720, 1600×900, and a true 2133×900 21:9 logical canvas. The courtyard hotspot was moved above the dock, the authority title was widened, active-job labels were shortened, and worker labels were moved away from station labels. |
| Environment remains the focus | Normal play uses a 74 px top HUD and 188 px bottom command dock. The center of the screen remains the brewery. The right decision panel appears only for brewing, council, and restoration choices. |
| Workers and equipment respond | Painted people remain atmospheric; only real active jobs produce station-anchored assignment cards naming the worker, task, and time remaining. Every station reports ACTIVE or IDLE while progress, steam, bubbles, glints, transfer liquid, and lighting follow live state. |
| Major beats are staged | Appointment, mash decision, packaging, courtyard service, weekly council, and council outcome each use a dedicated composition or deliberately matched scene. |
| Presentation matches the approved direction | All stage plates use blue-hour shadow, warm lantern light, limestone, aged timber, copper, cream, ink, and oxblood. Named people and hands remain central. |
| Automated coverage matches the playable route | `tests/run.gd` validates branching complete routes and persistence. `tests/ui_interaction_test.gd` presses the real controls from customization through the first authority promotion, Week 2 reserve planning, and Stable Amber's contract-specific production trouble. |
| Week 2 opens into a real planning choice | After the first council, players choose between the 50-guest Saint Brigid Festival and the higher-quality Count's Cellar Reserve. The commitments use different recipes, malt bills, advances, quality targets, deadlines, settlements, and political consequences. |
| Week 2 production reflects the accepted contract | Stable Amber develops a stalled runoff rather than repeating Lantern Blonde's heat and missing-hop incidents. The decision panel names the recipe, previews the quality-72 reserve stake, and offers patient recirculation, hot-liquor thinning, or a risky forced runoff. |
| Fresh visual evidence exists | `outputs/vertical-slice/` contains appointment, active brewing/assignment state, mash decision, packaging, courtyard service, weekly council, council outcome, Week 2 planning, Stable Amber commitment, and Stable Amber runoff captures. `outputs/layout-check/` contains 1280×720 and true 21:9 layout captures. |

## Visual-review gallery

- `outputs/vertical-slice/01-appointment.png`
- `outputs/vertical-slice/02-active-brewing.png`
- `outputs/vertical-slice/03-mash-decision.png`
- `outputs/vertical-slice/04-packaging.png`
- `outputs/vertical-slice/05-courtyard-service.png`
- `outputs/vertical-slice/06-weekly-council.png`
- `outputs/vertical-slice/07-council-outcome.png`
- `outputs/vertical-slice/08-week-two-planning.png`
- `outputs/vertical-slice/09-stable-amber-commitment.png`
- `outputs/vertical-slice/10-stable-amber-runoff.png`
- `outputs/layout-check/1280x720.png`
- `outputs/layout-check/ultrawide-21x9.png`

## Validation commands

```powershell
godot --headless --path godot --script res://tests/run.gd
godot --headless --path godot --script res://tests/ui_interaction_test.gd
godot --headless --path godot --script res://tests/world_layout_test.gd
godot --headless --path godot --script res://tests/worker_presentation_test.gd
godot --path godot --resolution 1600x900 --script res://tests/capture_vertical_slice.gd
python tools/validate_scenario.py godot/data/imported_scenario
npm test
```
