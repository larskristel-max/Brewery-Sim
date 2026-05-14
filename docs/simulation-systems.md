# Simulation Systems

This document describes the intended systemic relationships for Brewery-Sim. These relationships are meant to make brewery management feel interconnected: choices in equipment, process discipline, staffing, ingredients, and product quality should propagate through the simulation instead of resolving as isolated events.

## Design Goals

- Make early cost-cutting viable but risky, with consequences that can compound over time.
- Let operational discipline reduce volatility without removing all uncertainty.
- Create feedback loops where production quality affects market outcomes, and market outcomes constrain future operations.
- Support emergent stories that players can understand after the fact: the game should make it clear why a batch succeeded, failed, or created downstream pressure.

## Core System Relationships

### 1. Equipment Quality Affects Temperature Stability

Equipment quality should influence how tightly brewing and fermentation equipment can hold target process conditions.

- Low-quality kettles, mash tuns, chillers, and fermenters should have wider temperature drift, slower correction, and higher failure or maintenance risk.
- Higher-quality equipment should improve insulation, cooling/heating response, sensor accuracy, and automated control reliability.
- Equipment wear should gradually degrade stability, making maintenance a way to preserve performance rather than only repair breakdowns.
- Environmental conditions, such as seasonal heat, should expose weak equipment more strongly than well-built equipment.

Intended gameplay effect: cheaper equipment lowers upfront costs but increases process variance, especially during temperature-sensitive production steps.

### 2. Temperature Stability Affects Attenuation and Flavor Consistency

Temperature stability should affect both measurable batch outcomes and perceived product consistency.

- Stable fermentation temperatures should help yeast perform predictably, producing attenuation closer to the recipe target.
- Temperature swings should increase the chance of under-attenuation, over-attenuation, stalled fermentation, or unexpected fermentation speed.
- Temperature instability should increase flavor variance, including off-flavors, muted recipe character, or batch-to-batch inconsistency.
- Different yeast strains and beer styles should have different tolerance ranges, allowing process planning and recipe design to matter.

Intended gameplay effect: players can still produce acceptable beer with imperfect control, but consistent brand quality should require stable process conditions.

### 3. Cleaning/CIP Quality Affects Contamination Risk

Cleaning and clean-in-place (CIP) quality should directly influence contamination probability and severity.

- Shortened, skipped, or poorly executed cleaning cycles should leave residual soil or microbes that increase contamination risk for future batches.
- Proper chemical concentration, contact time, temperature, and rinse quality should reduce risk.
- Dirty hoses, valves, tanks, packaging lines, and transfer paths should be possible contamination points.
- Staff skill, fatigue, chemical availability, and equipment design should all affect CIP quality.
- Contamination should range from subtle quality penalties to total batch loss, depending on organism type, detection timing, and process stage.

Intended gameplay effect: cleaning consumes time and resources, but neglecting it creates hidden risk that can surface later as quality issues, dumping losses, or reputation damage.

### 4. Ingredient Availability Affects Brew Scheduling

Ingredient availability should constrain what can be brewed and when.

- Recipes should require specific quantities and, where appropriate, specific varieties of malt, hops, yeast, adjuncts, and packaging materials.
- Missing or late ingredients should delay brew days, force recipe substitutions, or require emergency purchasing at higher cost.
- Perishable or viability-sensitive ingredients, such as yeast or certain fresh additions, should impose timing pressure.
- Supplier reliability, contracts, storage capacity, and seasonal availability should shape schedule planning.
- Substitutions should preserve production flow but may alter batch quality, consistency, cost, or customer expectations.

Intended gameplay effect: production planning should be more than filling a calendar; it should require aligning recipes, inventory, suppliers, staff, and tank capacity.

### 5. Batch Quality Affects Reputation and Sales

Batch quality should be one of the primary links between production simulation and business simulation.

- High-quality batches should improve customer satisfaction, review sentiment, repeat purchases, and account retention.
- Consistent quality should build trust more reliably than occasional exceptional batches surrounded by inconsistent ones.
- Low-quality or contaminated batches should generate complaints, refunds, returns, distributor hesitation, or draft account loss.
- Reputation should affect demand, taproom traffic, distributor interest, price tolerance, and the success of new releases.
- Reputation should recover gradually through sustained quality, marketing, customer service, and reliable fulfillment.

Intended gameplay effect: quality problems should not end at the fermenter; they should influence market confidence and future revenue.

### 6. Staff Skill and Fatigue Affect Mistakes and Throughput

Staff attributes should influence both operational speed and error rates.

- Skilled staff should complete tasks faster, execute procedures more accurately, notice problems earlier, and recover from disruptions better.
- Fatigued staff should work more slowly and be more likely to make mistakes such as incorrect measurements, missed cleaning steps, late transfers, or packaging errors.
- Training should increase long-term capability but consume time and possibly reduce short-term throughput.
- Overtime should temporarily increase labor availability while increasing fatigue and mistake risk.
- Task complexity should matter: advanced recipes, tight schedules, and manual work should benefit more from experienced, rested staff.

Intended gameplay effect: labor management should involve tradeoffs between speed, cost, quality, and burnout rather than simply assigning any available worker to any task.

## End-to-End Emergent Chain Example

A systemic chain should allow a player to trace a business outcome back to operational choices:

1. The player buys a cheap fermenter to conserve cash.
2. The cheap fermenter has poor insulation and weak cooling control.
3. A warm week pushes fermentation temperature above the recipe's preferred range.
4. Yeast attenuation becomes unpredictable, and ester production varies from the intended profile.
5. The finished beer tastes noticeably different from the previous batch of the same brand.
6. Customers notice the inconsistency and submit complaints or negative reviews.
7. Reputation falls because the brand is now perceived as unreliable.
8. Lower reputation reduces taproom visits, distributor confidence, and repeat sales.
9. Reduced sales tighten cash flow, making it harder to buy better equipment or schedule preventive maintenance.

This chain should not require a scripted event. It should emerge from linked systems: equipment quality, environment, temperature control, fermentation behavior, flavor consistency, customer response, reputation, and sales.

## Additional Cross-System Feedback Loops

- Poor scheduling due to missing ingredients can compress the production calendar, encouraging overtime; overtime increases staff fatigue, which increases mistakes and can reduce throughput despite the longer hours.
- Weak CIP execution can contaminate a batch; if the batch reaches customers, quality complaints can reduce reputation and sales, limiting the budget for better cleaning equipment or training.
- High staff skill can partially compensate for older equipment through careful monitoring, but fatigue or turnover can expose the same equipment's weaknesses.
- Strong reputation can increase demand, which may overload limited tank capacity and staff unless the player invests in operations before growth outpaces reliability.

## Implementation Notes

- Systems should expose readable causes and effects through logs, alerts, batch reports, staff notes, or customer feedback.
- Randomness should be weighted by player decisions and simulation state, not arbitrary punishment.
- Outcomes should usually have early warning signs, giving attentive players chances to intervene.
- Multiple mitigation paths should exist: better equipment, maintenance, training, conservative scheduling, quality control testing, supplier contracts, and customer service can all reduce or absorb risk.
