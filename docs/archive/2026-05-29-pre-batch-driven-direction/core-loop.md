# Core Loop Implementation Checkpoints

This document represents the brewery simulation core loop as implementation checkpoints. Each checkpoint defines the minimum Phase A requirement needed to make the loop playable, followed by the later expanded version that can deepen simulation complexity.

## 1. Plan

**Loop intent:** The player prepares a production run before any work begins.

### Phase A minimum requirement

- Let the player choose one available recipe.
- Check whether the required ingredients are present in inventory.
- Allocate one available tank to the batch.
- Schedule a simple brewday start time or queue position.

### Later expanded version

- Support multiple recipe styles with variable ingredient bills, batch sizes, expected yields, quality targets, and production risks.
- Add inventory forecasting, supplier lead times, substitutions, spoilage, and bulk purchasing decisions.
- Model tank compatibility, cleaning state, capacity, current occupancy, and planned future availability.
- Provide a production calendar with staff shifts, equipment conflicts, maintenance windows, and delivery commitments.

## 2. Produce

**Loop intent:** The planned batch moves through the brewery production pipeline.

### Phase A minimum requirement

- Advance a batch through four basic states: brew, transfer, ferment, and package.
- Consume ingredients when brewing begins.
- Reserve the allocated tank during fermentation.
- Produce packaged inventory when the batch completes.

### Later expanded version

- Break brewing into mash, boil, chill, transfer, pitch yeast, ferment, condition, package, and clean-down tasks.
- Track batch attributes such as volume, gravity, alcohol percentage, bitterness, clarity, flavor profile, and quality score.
- Add active fermentation monitoring, packaging format choices, losses, rework, and quality control checks.
- Allow equipment, staff skill, timing, sanitation, and temperature control to influence final product quality and yield.

## 3. Respond

**Loop intent:** The player reacts to operational problems that interrupt the ideal production flow.

### Phase A minimum requirement

- Surface simple events for contamination, production delay, temperature issue, failed batch, and staff issue.
- Give each event a clear player response, such as discard, delay, repair, adjust, or pay a cost.
- Apply a visible consequence to money, time, inventory, batch status, or quality.

### Later expanded version

- Add event severity, probability, root causes, warning signs, prevention methods, and cascading consequences.
- Let players investigate problems, choose tradeoffs, assign staff, expedite repairs, salvage batches, or communicate with customers.
- Connect incidents to sanitation practices, maintenance history, staff morale, training, workload, facility layout, and equipment quality.
- Track reputation impact, recurring risk, insurance, regulatory checks, and long-term operational resilience.

## 4. Sell

**Loop intent:** Packaged beer leaves inventory and generates revenue.

### Phase A minimum requirement

- Sell packaged inventory to local customers, bars, festivals, and shops.
- Use simple demand and price values for each sales channel.
- Convert sold units into cash and remove them from inventory.

### Later expanded version

- Differentiate channels by volume, margin, payment timing, reputation value, contract obligations, and logistics cost.
- Add customer preferences, seasonal demand, style trends, festival deadlines, recurring bar accounts, retail shelf space, and direct taproom traffic.
- Include sales forecasting, order fulfillment, stockouts, discounts, returns, distributor relationships, and marketing campaigns.
- Let quality, consistency, branding, awards, and missed deliveries affect future demand and channel access.

## 5. Upgrade

**Loop intent:** The player reinvests earnings to improve brewery capability.

### Phase A minimum requirement

- Offer basic upgrades for equipment, facility, automation, and branding.
- Make upgrades cost money and provide a clear benefit, such as more capacity, faster production, fewer problems, or higher demand.

### Later expanded version

- Add upgrade trees with prerequisites, installation time, downtime, space requirements, financing, depreciation, and maintenance costs.
- Expand equipment into brewhouse, tanks, packaging line, cold storage, lab tools, cleaning systems, and utilities.
- Make facility improvements affect layout, throughput, safety, sanitation, storage, taproom experience, and expansion permits.
- Let automation and branding alter labor needs, process reliability, demand generation, customer segments, and competitive positioning.

## 6. Scale

**Loop intent:** Growth increases output while adding management pressure.

### Phase A minimum requirement

- Allow the player to produce more beer by adding capacity or running more batches.
- Increase complexity through more simultaneous batches, higher inventory needs, and more frequent operational events.
- Preserve the same plan, produce, respond, sell, and upgrade loop at larger scale.

### Later expanded version

- Add multi-line production planning, larger facilities, warehouse management, distribution logistics, hiring structures, and management roles.
- Introduce more recipes, quality expectations, compliance requirements, supplier contracts, debt, taxes, and market competition.
- Increase operational pressure through bottlenecks, scheduling conflicts, staff burnout, maintenance backlogs, cash-flow timing, and reputation risk.
- Support strategic choices such as taproom focus, contract brewing, regional distribution, premium branding, festival circuit growth, or high-volume retail expansion.
