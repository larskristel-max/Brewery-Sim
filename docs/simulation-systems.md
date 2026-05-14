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
- Fatigued staff should work more slowly and have increased chances of mistakes such as missed cleaning steps, incorrect transfers, packaging errors, or late checks.
- Training should reduce variance and unlock more reliable execution of complex procedures.
- Staffing levels should influence bottlenecks, overtime, morale, and whether parallel work can be sustained.
- Automation should reduce some repetitive labor risks while introducing maintenance and calibration responsibilities.

Intended gameplay effect: staffing should be a core production constraint, not only a payroll number.

### 7. Facility Layout Affects Throughput and Error Exposure

The physical brewery layout should shape workflow efficiency and operational risk.

- Long travel distances between storage, brewhouse, fermentation, packaging, and shipping should increase task time.
- Poor adjacency can create bottlenecks, hose congestion, forklift conflicts, or confusing work paths.
- Good layout should make repeated processes faster, safer, and easier to understand visually.
- Expansion decisions should create meaningful tradeoffs between cheap additions, clean flow, and future scalability.
- Some equipment should require utility access, floor drains, clearance, ventilation, or service space.

Intended gameplay effect: the brewery floor itself should be a playable system, making spatial upgrades and rearrangement meaningful.

### 8. Maintenance Affects Reliability and Hidden Risk

Maintenance should preserve equipment performance and reduce surprise failures.

- Preventive maintenance should consume time and resources but lower breakdown probability.
- Deferred maintenance should gradually increase failure risk, reduced efficiency, quality variance, and emergency repair costs.
- Equipment should show warning signs before some failures, letting attentive players intervene early.
- Breakdowns should affect schedules, batch quality, packaging commitments, or safety depending on where they occur.
- Replacement decisions should weigh repair cost, downtime, capacity needs, and operational reliability.

Intended gameplay effect: maintenance should be an ongoing management rhythm that competes with production pressure.

## Implementation Guidance

- Start Phase A with simplified versions of these relationships, such as equipment quality, sanitation risk, basic ingredient constraints, and quality-driven sales.
- Prefer transparent formulas and clear player feedback over hidden complexity.
- Add detail only when it creates understandable choices, consequences, and stories.
- Keep simulation rules isolated from presentation so they can later map to Operon-backed operational concepts.
