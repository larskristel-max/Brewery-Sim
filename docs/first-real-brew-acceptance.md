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
- Stable Amber runoff: recirculate patiently, thin the mash, or force the runoff and risk equipment damage.
- Choices affect delay, cost, volume, quality, sensory tags, Count confidence and community trust.
- Automated routes prove that the estate-herb craft route and cash-saving route both reach service but produce different quality, revenue, political results and authority progression.
- Week 2 delivery can pause for a quality miss, lateness, or damaged equipment. Renegotiation, discounting, repair delay, and absorbing the loss produce distinct settlements and political consequences.

## Management and campaign

- Jules, Maëlle, Noor and Inez have shifts, skills, energy, rapport and visible station assignments.
- The management layer tracks lots, station cleanliness and condition, jobs, promise deadline, forty-guest courtyard demand, cash, runway, trust, restoration and council history.
- The second week opens with competing commitments: a 50-guest festival rush for Lantern Blonde or a higher-standard Stable Amber reserve for the Count.
- The Week 2 plans carry distinct deposits, ingredient bills, deadlines, quality gates, settlements, and trust/confidence consequences.
- Both Week 2 contracts are playable through boil, transfer, fermentation, packaging, delivery, their contract-specific outcome, and a second council.
- Used brewhouse, fermenter, and packaging stations retain sanitation debt between batches and must be cleaned before reuse.
- Apolline's council offers reinvestment, creditor payment and community backing.
- Versioned saves preserve the customized player, batch, lots, jobs, staff, decisions, delivery recovery, council, restoration, capacity board, and production queue. UI checkpoints cover planning, production trouble, fermentation, and the second council.
- After the First Fortnight, the Abbey winter table and Three Lanterns inn compete for finite malt, two returnable casks, fourteen staff hours, working cash, and one fermenter. The player must accept, renegotiate, or reject both before production begins.
- One full and one renegotiated commitment creates an explicit overlapping production queue; the second grain bill can be staged while the first batch ferments.
- The authority ladder contains Castle Brewmaster, Keeper of the Old Stables, Deputy Steward and Estate Steward with distinct gates and unlocks.
- First insolvency triggers emergency credit and probation. A third poor council review can lose the estate.

## Visual implementation

- The Old Stables are assembled from modular 3D floor, limestone wall, timber, brewhouse, fermentation, packaging and courtyard pieces.
- Work lights react to station occupancy. Painted figures remain atmospheric, while real jobs show station-anchored assignment cards with the named worker, task, and time remaining.
- `outputs/renderings/old-stables-gameplay.png` shows the starting management state.
- `outputs/renderings/old-stables-brew-decision.png` shows the live missing-hop decision.
- `outputs/renderings/old-stables-first-brew-outcome.png` shows service, council promotion and restoration options.
- `outputs/vertical-slice/11-reserve-approved.png` and `13-festival-saved.png` show the distinct completed Week 2 outcomes.
- `outputs/vertical-slice/14-delivery-recovery.png` shows the quality, deadline, and equipment recovery decision.
- `outputs/vertical-slice/12-capacity-conflict.png` shows the first simultaneous-opportunity capacity board.

## Verification

Run from the repository root:

```powershell
scripts\run-godot-validation.cmd
npm.cmd test
python tools/validate_scenario.py godot/data/imported_scenario
```

The Godot suites execute two complete campaign weeks plus contract-specific incidents and outcomes, delivery recovery, schedule, station, lot, save/load checkpoints, restoration, authority, business risk, capacity negotiation, overlapping production preparation, responsive hotspot, and truthful worker-assignment assertions.
