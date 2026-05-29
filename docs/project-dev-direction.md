# Brewery Sim Project Dev Direction: Batch-Driven Craft Drama

## Executive Verdict

The plan is now strong enough to justify a vertical slice, not full production. The core is no longer "brew beer and sell it"; it is **build a brewery people care about, one risky, memorable batch at a time**.

The old danger was "Brewing Risk Simulator." The new target must be **craft drama**: authentic brewing risk, human promises, customer memory, pride, place attachment, and visible success.

## What Genre Leaders Prove

- **Stardew Valley:** succeeds because it mixes routine, self-directed goals, community, mastery, and restoration. Its official pitch is not just farming; it is rebuilding a life, leveling multiple skills, and restoring a town. [Stardew official](https://www.stardewvalley.net/about/)
- **Planet Zoo:** succeeds through care and creative ownership. Animal welfare gives management emotional meaning, while construction tools let players make something visibly theirs. It is also a warning: too much management friction can bury the joy. [PlayStation Planet Zoo](https://www.playstation.com/en-us/games/planet-zoo/), [GameSpot review](https://www.gamespot.com/reviews/planet-zoo-review-spreadsheet-safari/1900-6417370/)
- **The Sims:** succeeds because players create personal stories in spaces they shape. Will Wright's "dollhouse" insight matters: the house is not decoration; it is the story engine. [Wired interview](https://www.wired.com/story/the-creator/)
- **Football Manager:** succeeds because data becomes identity. Players remember promotions, youth prospects, heartbreak, and long careers, not spreadsheets. [GameSpot FM2013](https://www.gamespot.com/reviews/football-manager-2013-review/1900-6398938/), [PC Gamer FM26](https://www.pcgamer.com/games/sports/football-manager-26-review/)
- **Euro Truck Simulator 2:** succeeds because mastery is calming. Authentic atmosphere, routine, progression, and company growth create flow without constant drama. [Gamezebo review](https://www.gamezebo.com/reviews/euro-truck-simulator-2-review/)
- **Dave the Diver:** succeeds because two loops feed each other: exploration creates restaurant payoff, and restaurant success funds deeper exploration. Its director explicitly built around switching rhythms. [ScreenRant interview](https://screenrant.com/dave-diver-game-interview/)
- **Retention lesson:** players stay when games satisfy autonomy, competence, and relatedness; fun is also tied to learning and mastery. [SDT/PENS research](https://pubmed.ncbi.nlm.nih.gov/17761025/), [Raph Koster](https://www.raphkoster.com/2006/03/06/a-theory-of-fun-milestone-and-postmortem/)

## Rewritten Core Fantasy

The player is buying this fantasy:

**I started with a garage setup, made beer people actually cared about, survived real brewery pressure, built a reputation batch by batch, and chose what kind of brewery I became.**

Fantasy ranking:

1. Build a brewery people remember.
2. Create beers with identity and history.
3. Keep promises to customers.
4. Master brewing under real constraints.
5. Grow from garage to professional brewery.
6. Recover from disasters.
7. Build a business.

The fantasy is compelling only if the beer becomes emotionally meaningful. If beer is just inventory, the game fails.

## Core Pillars

- **Batch Stories:** every batch has a process history, verdict, customer reaction, and possible legacy.
- **Brewery Identity:** the player becomes known for saisons, lagers, IPAs, event beer, local pub reliability, Belgian experimentation, or high-consistency regional production.
- **Human Promises:** demand comes from named people with deadlines, taste, trust, tolerance, and memory.
- **Craft Mastery:** brewing decisions teach patterns over time; fast is sometimes smart, sometimes reckless.
- **Visible Ownership:** the brewery floor, equipment, labels, awards, tap handles, clutter, and customer notes show history.
- **Dynamic Pressure:** no easy/medium/hard. Pressure rises from ambition, scale, shortcuts, promises, visibility, and ignored warnings.
- **Success Legends:** beloved flagship beers, awards, festival wins, sellouts, and bar taps are as important as failures.

## Signature Loop

```text
Promise -> Recipe Choice -> Brewday -> Fermentation Readiness -> Conditioning / CO2 -> Packaging -> Batch Verdict -> Customer Reaction -> Brewery Legacy
```

The emotional loop:

1. Someone wants something from you.
2. You choose how to make it.
3. You take shortcuts or play safe.
4. The batch becomes a product with a story.
5. The customer reacts.
6. Your brewery identity changes.

## The First 90-Minute Vertical Slice

Build this before expanding scope:

1. Samira asks for 4 cases of Garage Blonde.
2. Player chooses a brewday approach: careful, standard, fast.
3. Fermentation shows readiness: FG confidence and yeast cleanup.
4. Player chooses wait, check gravity, or package early.
5. Player chooses packaging mode.
6. Batch gets a sensory verdict.
7. Samira reacts with human feedback.
8. Empty shelf creates supply planning.
9. Second fermenter unlocks overlapping production.
10. Uncle Nico wedding introduces deadline pressure.
11. Player can create one success story or one earned quality problem.

Success metric: after 3-5 batches, the player can tell a story without mentioning numbers.

## Brewing System: Realistic, Not Academic

Use compact decision nodes first; optional hands-on mode later.

Brewday choices:

- Careful / standard / fast mash.
- Normal / short / hard boil.
- Fast / slow chill.
- Careful / rough transfer.

Fast brewing is not automatically bad:

- Fast blonde can be fine.
- Short pils boil risks DMS.
- Rough IPA transfer risks oxygen/aroma loss.
- Hard dark-grain process risks astringency.
- Slow chill in a dirty setup risks contamination.

Fermentation readiness:

- FG confidence: unknown, moving, nearly stable, stable.
- Yeast cleanup: green, cleaning-up, ready.
- Temperature stress.
- Rush risk.

Conditioning / CO2:

- carbonation progress
- CO2 integration
- refermentation risk
- package pressure risk

Packaging:

- careful: slower, safer, better presentation
- standard: baseline
- rush: faster, more oxygen/fill/cap/sanitation risk

## Batch Verdict System

Every finished lot receives a verdict:

```ts
type BatchVerdict = {
  qualityBand: 'excellent' | 'solid' | 'flawed' | 'bad' | 'unsafe';
  headline: string;
  sensoryNotes: string[];
  likelyCauses: string[];
  sellAdvice: 'sell' | 'discount' | 'hold' | 'dump' | 'recall';
  stabilityRisk: number;
  legacyTags: string[];
};
```

Verdicts must be sensory and causal:

- "Fast but clean. Young, simple, sellable."
- "Hop aroma collapsed. Oxygen pickup during rushed packaging."
- "Unstable package. FG confidence was low before bottling."
- "Do not sell. Refermentation risk is severe."

## Customer Promises And Memory

Replace generic demand as the primary driver.

Customers:

- Samira: forgiving first promise.
- Rudy: supply mentor and shop connection.
- Uncle Nico: deadline and volume chaos.
- Mira: bar owner, quality-sensitive repeat account.
- Festival organizer: volume, presentation, timing.
- Restaurant/shop: formal buyer, invoice and traceability pressure.

Customers remember:

- great batches
- bad batches
- missed deadlines
- replacement gestures
- consistency
- recalls
- flagship beers they helped popularize

The player should think: "Who deserves this batch?" not "Which channel pays most?"

## Brewery Identity And Flagships

Add identity as a core system, not flavor.

Identity paths:

- clean lager specialist
- farmhouse/saison brewer
- hype IPA brewery
- event/festival supplier
- local pub workhorse
- experimental Belgian-style brewery
- regional consistency producer

Flagship beer system:

- A recipe can gain fans, expectations, awards, or fatigue.
- Customers ask for it by name.
- Changing it risks upsetting regulars.
- Improving it creates pride.
- A bad repeat batch can damage the flagship's trust.

## Progression Blueprint

Each tier must add new responsibilities.

- **Garage:** personal promises, forgiving customers, hands-on choices, cleaning discipline, first repeat buyer.
- **Nano:** overlapping batches, tank scheduling, bar accounts, small festivals, packaging bottlenecks.
- **Craft:** staff, QC, flagship reputation, awards, supplier relationships, formal buyers.
- **Regional:** distribution contracts, consistency pressure, brand damage, recalls, professional systems.

Progression must never be just bigger tanks.

## Systems To Expand / Reduce / Remove

Expand:

- batch verdicts
- customer memory
- flagships
- brewery identity
- festivals and awards
- sensory feedback
- visible brewery history
- recovery actions

Reduce:

- raw risk percentages
- generic demand
- repetitive cleaning
- fault taxonomy overload
- severe punishment before emotional investment

Remove or delay:

- full chemistry sim
- paperwork gameplay
- detailed HACCP/excise forms
- constant recalls
- manual cleaning checklist every batch
- factory automation obsession

## Authentic Brewery Risk As Drama Fuel

Use real brewing expertise to create believable cause and effect:

Fun risks:

- package instability
- missed cleaning parts
- contamination scare
- oxygen-damaged IPA
- rushed wedding batch
- warm fermentation choice
- tank scheduling conflict
- supplier substitution
- packaging line failure
- competition judging

Realism traps:

- legal forms
- lab procedure micromanagement
- yeast kinetics
- full sanitation checklist repetition
- tax declarations

Professional harshness is allowed, but it must be earned by visible warning signs and player ambition.

## Future AI / Cloudflare Guardrail

Brewery Sim currently ships as a static GitHub Pages app and does not use Cloudflare Workers AI. If future work adds Cloudflare Workers, AI-assisted simulation, AI-generated customer text, or an Operon/Cloudflare bridge, do not use the Workers AI models Cloudflare flagged for May 30, 2026 deprecation.

Avoid these deprecated model IDs:

- `@cf/moonshotai/kimi-k2.5`
- `@hf/meta-llama/meta-llama-3-8b-instruct`
- `@cf/meta/llama-3-8b-instruct`
- `@cf/meta/llama-3-8b-instruct-awq`
- `@cf/meta/llama-3.1-8b-instruct`
- `@cf/meta/llama-3.1-8b-instruct-awq`
- `@cf/meta/llama-3.1-70b-instruct`
- `@cf/meta/llama-2-7b-chat-int8`
- `@cf/meta/llama-2-7b-chat-fp16`
- `@cf/mistral/mistral-7b-instruct-v0.1`
- `@hf/google/gemma-7b-it`
- `@cf/google/gemma-3-12b-it`
- `@hf/nousresearch/hermes-2-pro-mistral-7b`
- `@cf/microsoft/phi-2`
- `@cf/defog/sqlcoder-7b-2`
- `@cf/unum/uform-gen2-qwen-500m`
- `@cf/facebook/bart-large-cnn`
- `@hf/mistral/mistral-7b-instruct-v0.2`

Before adding any Workers AI model reference, check current Cloudflare docs/changelog and prefer actively supported tool-calling or multimodal models. Treat this as an infrastructure guardrail, not a gameplay direction.

## Emotional Targets

The game must create:

- Pride: beloved batch, clean verdict, first award.
- Stress: deadline, dirty line, unstable FG.
- Relief: saved batch, fulfilled promise.
- Discovery: new style fit, seasonal success.
- Ownership: visible brewery history.
- Attachment: regular customers and flagship beers.
- Mastery: learning when fast is safe.
- Joy: festivals, sellouts, praise, trophies.

Current danger: too much stress and not enough joy.

## Implementation Roadmap

1. Define validated brewing risk data with brewer approval.
2. Add brewday approach choices.
3. Add fermentation readiness.
4. Add packaging mode.
5. Add batch verdicts.
6. Add Samira customer reaction.
7. Add customer promises and trust.
8. Add second-fermenter overlap pressure.
9. Add Uncle Nico wedding deadline.
10. Add flagship tags and batch history.
11. Add first festival/award event.
12. Add sanitation debt and missed critical parts.
13. Add recovery actions: hold, discount, dump, recall, replacement.
14. Expand identity paths and tier progression.

## Acceptance Tests

- A forgiving fast Garage Blonde can succeed.
- Short pils boil can create DMS risk.
- Rough IPA transfer can damage aroma.
- Early packaging can create refermentation risk.
- Waiting improves FG confidence and yeast cleanup.
- Missed bottling wand/filler head can ruin a good batch.
- Verdict explains what happened in human language.
- Samira reacts differently to excellent, flawed, late, or unsafe beer.
- A great batch can become a repeat request.
- A bad batch can damage trust.
- First 90 minutes create at least one success story and one meaningful tradeoff.

## Final Design Standard

The target player story is:

> "I started in a garage, made a fast but clean blonde for Samira, nearly ruined Uncle Nico's wedding beer by packaging before stable FG, recovered with a replacement saison, won a summer festival with my kveik, and turned it into the beer my brewery became known for."

That is the game.

Not:

> "I managed brewing risks and optimized fault percentages."
