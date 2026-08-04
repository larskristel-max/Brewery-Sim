# Old Stables UI/UX benchmark review

Reviewed 30 July 2026 against primary sources from shipped management games, AAA interface talks, and the Xbox Accessibility Guidelines.

## Benchmark set

- [Anno 1800](https://www.ubisoft.com/en-us/game/anno/1800) makes production chains, workforce, logistics, and profitability the heart of play. Ubisoft's [The Passage update](https://www.ubisoft.com/en-gb/game/anno/1800/news-updates/6mdByyQSPxzhHoaesWJdGd/anno-1800-the-passage) added statistics that compare production and consumption across goods.
- Paradox's [Cities: Skylines II Economy 2.0](https://www.paradoxinteractive.com/games/cities-skylines-ii/news/dev-diary-economy-part-one) explicitly responds to simulation that was not transparent or controllable enough by aiming for more responsive systems, clearer consequences, and meaningful player control. Its [Work in Motion resource UI](https://www.paradoxinteractive.com/games/cities-skylines-ii/news/work-in-motion) exposes production-chain resources and production-versus-consumption comparisons.
- Bungie's GDC talk, [Tenacious Design and the Interface of Destiny](https://www.gdcvault.com/play/1023107/Tenacious-Design-and-The-Interface), frames a successful game interface as digestible to a new player while retaining depth for an experienced one. It also covers focus, cursor, and time-gated interaction.
- Maxis's GDC talk, [How to Implement AAA Game UI in HTML](https://www.gdcvault.com/play/1022054/How-to-Implement-AAA-Game), documents the iterative UI workflow used for SimCity.
- The Xbox Accessibility Guidelines provide measurable shipped-game targets: [text legibility](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/101), [contrast](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/102), [navigation](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/112), [input](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/107), [focus](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/113), and [time limits and pause](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/116).

These are design benchmarks, not claims that Old Stables has the production budget or content scale of those games.

## Audit result

| Area | Before Brewery in Motion | Benchmark | Implemented result |
| --- | --- | --- | --- |
| Production visibility | One global batch and one contextual action strip | Anno and Cities expose production state and resource pressure continuously | Persistent cards show every contract's recipe, stage, quality target, deadline risk, next step, active work, and equipment conflict |
| Player control | Repeatedly choosing the next milestone could solve most production | Cities emphasizes transparent, controllable consequences | The clock refuses to skip fermentation while another batch can use free capacity; the player must select the batch, worker, and work order |
| Capacity forecasting | Capacity appeared mainly during contract acceptance | Anno compares supply, demand, workforce, and logistics | The live board shows free malt, hops, yeast, casks, cash, demand segments, and occupied stations |
| Conflict readability | The second contract was a queue entry | Management games surface bottlenecks before failure | Brewhouse, fermenter, filler, staff, fatigue, deadline, and equipment conflicts are visible before assignment |
| New-player/veteran layering | Strong contextual guidance, limited systemic overview | Destiny targets immediate digestibility with retained depth | The original action strip remains the simple execution layer; the batch rail adds an expert planning layer without another modal |
| Text size | 14 px design default at 1600×900 | XAG 101 gives 18 px at 1080p as a common PC baseline, scaling to roughly 15 px at 900p and 12 px at 720p | Default raised to 15 px at the 900p design viewport; the production forecast also uses 15 px |
| Contrast | Dark stable palette with several muted text colors | XAG 102: 4.5:1 for standard text, 3:1 for large text and important visual information | Key palette pairs against `#171310` measure 14.69:1 cream, 7.42:1 sage, 6.73:1 muted, 6.11:1 copper, and 6.47:1 risk coral |
| Focus and navigation | Focus style and native controls existed | XAG 112/113 require predictable traversal and a visible focus indicator | Batch cards are native buttons in logical visual order; the existing 2 px bright-copper focus treatment applies to them |
| Time pressure | Decisions paused; production time could continue at multiple speeds | XAG 116 favors pause and avoids inaccessible forced timing | All councils and negotiations pause automatically; Space and the clock controls remain available during live production |
| Responsive fit | First Fortnight panels fit the 1280×720 window | XAG 112 calls for consistent navigation and reflow | The expanded operations dock and council stop above one another and are covered by the full UI interaction route at the 1280×720 window |

## Remaining UX work

1. Add user-controlled interface scale and remappable inputs rather than relying only on the operating-window scale and Godot defaults.
2. Add a compact schedule timeline once three or more simultaneous batches become possible; two cards are clearer than a timeline at the current scale.
3. Add icon-plus-text station and resource markers. Text remains intentionally authoritative so color or icon recognition is never required.
4. Run external controller-only and screen-reader-oriented playtests. Automated focus and viewport checks cannot replace those.

## Acceptance checks

- Every live contract is selectable without closing the brewery view.
- A selected batch always exposes either its next work order, its active job, its shared-equipment blocker, or its settled result.
- Three feasible plans complete: Abbey only, Inn only, and Abbey plus renegotiated Inn.
- Accepting both full contracts is blocked before resources are consumed.
- At least two work orders can overlap, while the single fermenter remains exclusive.
- Save/load preserves a live two-batch production state.
- The full UI route fits the 1280×720 target window and exposes worker energy before assignment.
