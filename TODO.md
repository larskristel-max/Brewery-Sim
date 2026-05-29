# Brewery-Sim TODO

Current source of truth: [docs/project-dev-direction.md](docs/project-dev-direction.md).

## Next Vertical Slice Work

- [x] Define validated brewing risk data with brewer approval. Rule data: [src/data/brewingRiskRules.ts](src/data/brewingRiskRules.ts). Brewer review sheet: [docs/brewing-risk-validation.md](docs/brewing-risk-validation.md).
- [x] Add brewday approach choices.
- [x] Add fermentation readiness.
- [x] Add packaging mode.
- [x] Add playable conditioning / CO2 release-vs-wait phase.
- [x] Add batch verdicts.
- [x] Add Samira customer reaction.
- [x] Add customer promises and trust.
- [x] Add second-fermenter overlap pressure.
- [x] Add Uncle Nico wedding deadline.
- [x] Add flagship tags and batch history.
- [x] Add named flagship repeat requests that reject substitute beer.
- [x] Add first festival/award event.
- [x] Add playable competition judging for finished lots.
- [x] Add supplier substitution brewing for deadline pressure.
- [x] Add sanitation debt and missed critical parts.
- [x] Add recovery actions: hold, discount, dump, recall, replacement.
- [x] Expand identity paths and tier progression.

## Acceptance Checks

- [x] A forgiving fast Garage Blonde can succeed.
- [x] Short pils boil can create DMS risk.
- [x] Rough IPA transfer can damage aroma.
- [x] Early packaging can create refermentation risk.
- [x] Waiting improves FG confidence and yeast cleanup.
- [x] Missed bottling wand/filler head can ruin a good batch.
- [x] Verdict explains what happened in human language.
- [x] Samira reacts differently to excellent, flawed, late, or unsafe beer.
- [x] A great batch can become a repeat request.
- [x] A flagship beer can be requested by name and reject substitutes.
- [x] Finished beer can be entered into judging for awards or feedback.
- [x] Missing exact supplies can become a substitution decision instead of only an order-and-wait blocker.
- [x] A bad batch can damage trust.
- [x] First 90 minutes create at least one success story and one meaningful tradeoff.
