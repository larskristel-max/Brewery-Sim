# Old Stables roadmap

This is the current delivery roadmap for Brewery-Sim. **Old Stables**, the
Godot reboot, is the active game. The TypeScript browser prototype under
`src/` and `dist/` is retained as a systems and design reference; changes to it
must be reviewed and delivered separately from Old Stables work.

## Current milestone: First Fortnight

Goal: a new player can complete two full brewing weeks and reach materially
different financial, community, and Count outcomes.

### Foundation complete

- [x] Complete the Night of First Lights opening week from appointment through
      service and the first weekly council.
- [x] Add Week 2 planning with two distinct commitments:
      Saint Brigid Festival and the Count's Cellar Reserve.
- [x] Add Stable Amber as a second recipe with its own quality target, economics,
      deadline, and stalled-runoff production trouble.
- [x] Carry sanitation debt, station condition, staff state, authority, cash,
      trust, and confidence between weeks.
- [x] Make simulated work visually truthful through named, station-anchored
      assignment cards and explicit active/idle station states.
- [x] Validate the management UI at 1280x720, 1600x900, and ultrawide sizes.
- [x] Pin Godot 4.7.1 and provide model, UI, world-layout, and worker-presentation
      validation locally and in CI.

### Finish First Fortnight

- [x] Play both Week 2 commitments through boil, transfer, fermentation,
      packaging, delivery, settlement, and a second weekly council.
- [x] Give the festival and reserve distinct outcome presentations, settlement
      consequences, and council interpretations.
- [x] Add readable failure and recovery paths for a missed quality target, late
      delivery, and damaged equipment.
- [x] Let the player renegotiate, discount, delay, or absorb a loss where the
      contract permits it; show the cost before the choice is committed.
- [x] Verify save/load during Week 2 planning, production trouble, fermentation,
      recovery, and the second council.
- [x] Exercise both successful and recoverable-failure routes through the real UI.
- [x] Capture final visual evidence for both Week 2 outcomes.
- [x] Run the complete Godot validation suite in CI from a clean checkout.

### First Fortnight exit criteria

- [x] A fresh campaign can complete two councils without test-only state edits.
- [x] The two Week 2 contracts produce visibly and mechanically different endings.
- [x] At least one avoidable failure can be recovered without ending the campaign.
- [x] Consequences persist after save/load and into the following planning state.
- [x] Model, UI, persistence, layout, and presentation tests all pass with no
      leaked Godot objects.

## Next milestone: Brewery in Motion

Goal: turn the authored fortnight into a repeatable management loop where the
player owns a production plan.

- [x] Present at least two simultaneous opportunities instead of a single
      exclusive contract choice.
- [x] Track limited malt, hops, yeast, packaging, cash, staff hours, fermenter
      space, and keg capacity as planning constraints.
- [x] Allow the player to accept, reject, or renegotiate each opportunity.
- [x] Support overlapping preparation, fermentation, cleaning, packaging, and
      delivery jobs across multiple batches.
- [x] Make deadlines, station occupancy, worker fatigue, and maintenance debt
      visible before the player commits a schedule.
- [x] Replace automatic milestone-jumping as the dominant strategy with genuine
      scheduling tradeoffs and interruption risk.
- [x] Carry fulfilled, strained, and rejected commitments into demand, trust,
      confidence, cash flow, and council evaluation.
- [ ] Prove at least three viable weekly plans and one overcommitted failure route
      in automated tests and outside playtests.

### Brewery in Motion exit criteria

- [x] A player can explain what they chose to brew, for whom, by when, with which
      people and equipment, and what risk they accepted.
- [x] Two active batches can contend for a worker, station, ingredient, or
      packaging resource.
- [x] No single sequence of "advance to next milestone" presses solves every week.
- [ ] At least five outside playtests identify a plan the player feels ownership
      over, not merely the next prescribed action.

## Later production work

- Build modular, state-aware equipment and character presentation after the
  repeatable loop is proven.
- Split campaign, scheduling, production, staff, economy, council, and UI
  responsibilities incrementally as those systems expand.
- Expand recipes, customers, restoration, authority, and campaign writing only
  where they create new planning decisions.

## Repository rules

- Keep Old Stables changes and legacy TypeScript changes in separate branches,
  reviews, and commits.
- Do not commit generated captures unless they are intentional review evidence.
- Run `scripts/run-godot-validation.cmd` before committing Godot gameplay work.
- Keep Godot at the version pinned by CI and document any version change.
- Treat `docs/project-dev-direction.md` as archived legacy-prototype direction,
  not the active roadmap.
