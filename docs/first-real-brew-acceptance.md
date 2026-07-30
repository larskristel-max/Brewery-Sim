# The First Real Brew — acceptance evidence

## Playable production loop

- The campaign starts with named raw-material and packaging lots.
- Recommissioning, mash, boil, fermenter cleaning, transfer, fermentation, packaging, courtyard preparation and service are independent station commands.
- Every work order has a start and end minute, occupies its station and requires an on-shift staff member with the relevant skill.
- The 20 L Lantern Blonde batch consumes 4.2 kg malt, one yeast pitch and one empty keg.
- Fermentation runs for seven estate days. Players may run the clock or advance to the next scheduled completion.

## Decisions and consequences

- Mash drift: cut heat and stir, add cold water, or accept a richer body.
- Missing hops: use estate herbs, buy an express delivery, or reduce bitterness.
- Choices affect delay, cost, volume, quality, sensory tags, Count confidence and community trust.
- Automated routes prove that the estate-herb craft route and cash-saving route both reach service but produce different quality, revenue, political results and authority progression.

## Management and campaign

- Jules, Maëlle, Noor and Inez have shifts, skills, energy, rapport and visible station assignments.
- The management layer tracks lots, station cleanliness and condition, jobs, promise deadline, forty-guest courtyard demand, cash, runway, trust, restoration and council history.
- The second week opens with competing commitments: a 50-guest festival rush for Lantern Blonde or a higher-standard Stable Amber reserve for the Count.
- The Week 2 plans carry distinct deposits, ingredient bills, deadlines, quality gates, settlements, and trust/confidence consequences.
- Used brewhouse, fermenter, and packaging stations retain sanitation debt between batches and must be cleaned before reuse.
- Apolline's council offers reinvestment, creditor payment and community backing.
- Versioned saves preserve the customized player, batch, lots, jobs, staff, decisions, council and restoration state.
- The authority ladder contains Castle Brewmaster, Keeper of the Old Stables, Deputy Steward and Estate Steward with distinct gates and unlocks.
- First insolvency triggers emergency credit and probation. A third poor council review can lose the estate.

## Visual implementation

- The Old Stables are assembled from modular 3D floor, limestone wall, timber, brewhouse, fermentation, packaging and courtyard pieces.
- Work lights react to station occupancy. Painted figures remain atmospheric, while real jobs show station-anchored assignment cards with the named worker, task, and time remaining.
- `outputs/renderings/old-stables-gameplay.png` shows the starting management state.
- `outputs/renderings/old-stables-brew-decision.png` shows the live missing-hop decision.
- `outputs/renderings/old-stables-first-brew-outcome.png` shows service, council promotion and restoration options.

## Verification

Run from the repository root:

```powershell
scripts\run-godot-validation.cmd
npm.cmd test
python tools/validate_scenario.py godot/data/imported_scenario
```

The Godot suites execute complete production routes plus contract-specific incidents, schedule, station, lot, save, restoration, authority, business-risk, responsive hotspot, and truthful worker-assignment assertions.
