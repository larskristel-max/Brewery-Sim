# Old Stables vertical-slice verification

Date: 2026-07-30

## Completion standard

The slice is judged as a player-facing 2.5D management experience, not as a simulation-only test or a static concept-art presentation. Verification covers the complete route, visible interaction feedback, scene staging, responsive layout, persistence, branching outcomes, and the safe brewery-data boundary.

## Acceptance evidence

| Requirement | Authoritative evidence |
| --- | --- |
| A new player can finish without developer guidance | The opening explains the role and stakes. The first three actions use an on-screen guidance ribbon. Later objectives, world markers, contextual commands, paused decision panels, active-job text, and milestone controls guide the remaining route. `ui_interaction_test.gd` completes the real interface route through promotion. |
| Required actions have visible affordance and feedback | Brewery equipment has pointer hotspots, hover/selected rings, focus zoom, station labels, contextual commands, worker assignment, animated progress, status feedback, and sound cues. |
| Text is readable and unobscured | Visual captures were reviewed at 1280×720, 1600×900, and a true 2133×900 21:9 logical canvas. The courtyard hotspot was moved above the dock, the authority title was widened, active-job labels were shortened, and worker labels were moved away from station labels. |
| Environment remains the focus | The first two weeks use a 74 px top HUD and compact bottom command dock. Live multi-batch production expands the dock into a production board while leaving the brewery visible. The right decision panel appears only for brewing, council, and restoration choices. |
| Workers and equipment respond | Painted people remain atmospheric; only real active jobs produce station-anchored assignment cards naming the worker, task, and time remaining. Every station reports ACTIVE or IDLE while progress, steam, bubbles, glints, transfer liquid, and lighting follow live state. |
| Major beats are staged | Appointment, mash decision, packaging, courtyard service, both weekly councils, delivery recovery, and the first capacity conflict each use a dedicated composition or deliberately matched scene. |
| Presentation matches the approved direction | All stage plates use blue-hour shadow, warm lantern light, limestone, aged timber, copper, cream, ink, and oxblood. Named people and hands remain central. |
| Automated coverage matches the playable route | `tests/run.gd` validates branching complete routes, three feasible Week 3 schedules, deliberate overcommitment, parallel work, shared stations, demand consequences, and persistence. `tests/ui_interaction_test.gd` presses the real controls from customization through two completed weeks, capacity negotiation, the live two-batch board, and batch switching. |
| Week 2 opens into a real planning choice | After the first council, players choose between the 50-guest Saint Brigid Festival and the higher-quality Count's Cellar Reserve. The commitments use different recipes, malt bills, advances, quality targets, deadlines, settlements, and political consequences. |
| Week 2 production reflects the accepted contract | Stable Amber develops a stalled runoff rather than repeating Lantern Blonde's heat and missing-hop incidents. The decision panel names the recipe, previews the quality-72 reserve stake, and offers patient recirculation, hot-liquor thinning, or a risky forced runoff. |
| Week 2 closes through contract-specific outcomes | The reserve can be approved for meeting its quality target on time; the festival can be saved through an on-time community delivery. Council panels expose quality versus target, timing, settlement, trust, and confidence rather than presenting both contracts as the same generic result. |
| Failure creates recovery play | A quality miss, late delivery, or damaged brewhouse pauses delivery. The player can renegotiate, discount, delay and repair, or absorb the loss. Recovery choices persist into the service result and council ledger. |
| Week 3 begins with a real capacity conflict | The post-council capacity board presents the Abbey winter table and Three Lanterns inn together. It exposes malt, hops, yeast, returnable casks, staff hours, cash, and fermenter overlap; the player must accept, renegotiate, or reject each opportunity before locking production. Two full commitments do not fit, while one full and one renegotiated commitment becomes two independent live batches. |
| Week 3 becomes a scheduling game | The persistent production board exposes each contract's stage, quality target, deadline risk, next step, active work, and shared-equipment conflict. Staff energy changes job duration, station condition blocks unsafe work, and the milestone control refuses to skip a free parallel-work opportunity. Fulfilled and strained deliveries change segmented demand and the production council. |
| UI review uses external benchmarks | `docs/ui-ux-benchmark-review.md` compares the production board against official Anno 1800, Cities: Skylines II, Bungie/Maxis GDC, and Xbox Accessibility guidance, including measured text contrast and target sizes. |
| Fresh visual evidence exists | `outputs/vertical-slice/` contains appointment through Stable Amber trouble plus distinct reserve and festival outcomes, delivery recovery, the capacity board, and Brewery in Motion. `outputs/layout-check/` contains 1280×720 and true 21:9 layout captures. |

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
- `outputs/vertical-slice/11-reserve-approved.png`
- `outputs/vertical-slice/12-capacity-conflict.png`
- `outputs/vertical-slice/13-festival-saved.png`
- `outputs/vertical-slice/14-delivery-recovery.png`
- `outputs/vertical-slice/15-brewery-in-motion.png`
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
