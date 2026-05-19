# Brewery-Sim UI / UX / Gameplay Review

Review date: 2026-05-18  
Reviewer stance: senior gameplay systems design, UI/UX design, simulation product review  
Primary target: a cozy, tactile, mobile-first brewery operations sim where the garage itself is the main playable surface.

## Tested Build And Scope

Tested as a playable browser game, not as isolated code.

- Live build: `https://larskristel-max.github.io/Brewery-Sim/`
- Layout debug build: `https://larskristel-max.github.io/Brewery-Sim/?layoutDebug=1`
- Tier 2 preview build: `https://larskristel-max.github.io/Brewery-Sim/?layoutDebug=1&tierPreview=2`
- Desktop landscape viewport around 1280x720.
- Phone landscape viewport around 844x390.
- Phone portrait viewport around 390x844.

Main loop playtest path:

1. Opened fresh garage scene.
2. Opened operations layer.
3. Started `Garage Blonde`.
4. Transferred to fermenter.
5. Advanced days through fermentation.
6. Packaged.
7. Advanced through bottle conditioning.
8. Sold to a buyer offer.
9. Inspected missions, inventory, equipment store, layout debug, and Tier 2 preview.

## Executive Verdict

Brewery-Sim is on the right track. The current direction should continue, not pivot. The garage scene plus physical equipment placement is the right identity for this project, and it is already much more distinctive than a dashboard management prototype. The strongest current value is the sense that the player is operating inside a specific small place, not managing abstract production rows.

The biggest issue is that the game still frequently asks the player to leave the garage and operate through overlays. The prototype says "the object is the button", but the actual loop still depends heavily on the operations layer and production panel. The result is promising but not yet tactile enough. It is not an ERP simulator, but it can still feel like a stylish dashboard laid over a garage unless the next pass makes the garage itself responsible for the main actions.

The single highest-value next move is to make the first full loop physically readable and satisfying on the garage floor:

`tap kettle -> brew feedback -> tap fermenter -> fermentation state -> tap bottling bench -> packaging feedback -> pallet fills -> tap pallet -> sell offer -> cash/rep payoff`

Do that before adding more content, more tiers, more recipes, or more simulation subsystems.

## 1. Overall Product Direction

### Is It On The Right Track?

Yes. The current prototype has the correct strategic direction:

- A single warm garage scene as the core identity.
- Equipment as physical objects rather than abstract upgrade rows.
- A loop built around small-batch brewing, waiting, bottling, and informal selling.
- A growth fantasy based on "my little brewery is getting more capable", not "my dashboard has more metrics".
- Practical equipment names such as `20 L enamel stock pot`, `Plastic fermentation bucket`, and `Bottle wand and hand capper`.

The garage approach is working because it creates immediate place identity. The player can remember where things are: kettle left, fermenter center, packaging right, pallet near the garage door. That spatial memory is important. It is the biggest difference between this project and a generic tycoon interface.

### Does It Feel Like A Believable Brewery Sim?

Partly. It feels more believable than most early prototypes because the equipment, batch sizes, and process steps are grounded:

- Brewing consumes time and energy.
- Fermentation takes days.
- Packaging is a separate action.
- Beer conditions before selling.
- Buyer channels have different volume, price, and visibility/risk language.
- Equipment has space use, capacity, and tier identity.

However, believability weakens in a few places:

- The first brew shows a `Batch cost now EUR 16`, but cash did not visibly drop when brewing started during the playtest.
- A sale offer displayed `EUR 24`, but the cash total increased from `EUR 180` to `EUR 213` after selling in the tested run. If this was not intentional, the economic feedback is currently not trustworthy.
- The production panel reports large minute counts like `7183 in-game minutes remaining`, which is mathematically clear but emotionally awkward.
- Quality dropped from `Q55` after brew to `Q30` after fermentation/packaging, but the player does not see a story explaining why quality fell.
- `Missions` moved from `45%` to `35%` during the same loop before reaching `100%` after selling, which reads as regression rather than guided progress.

These issues do not require a pivot. They require clearer cause-and-effect.

### Does It Feel Tactile Enough?

Not yet. It has tactile potential, but most tactile moments are still implied rather than felt.

What works:

- Equipment sprites invite tapping.
- The garage has convincing texture, lighting, and clutter.
- The physical layout is memorable.
- The bottling table and fermenter have believable silhouettes.

What is missing:

- No strong brew-start animation or local visual change.
- No transfer visual from kettle to fermenter.
- No fermenter bubbling or completion state.
- No packaging animation, bottle clink, or case stack growth.
- No visible pallet fill after beer becomes ready.
- No satisfying sale payoff beyond numbers changing.
- No equipment installation moment after purchase.

The game currently has tactile nouns, but it needs tactile verbs.

### Does It Feel Too Much Like A UI Dashboard?

Less than before, but still too much during the actual loop.

The base screen is scene-first. That is good. But the moment the player needs to understand or progress the batch, the game usually becomes overlay-first:

- Recipes are in a large modal.
- Transfer is in `Production flow`.
- Packaging is in `Production flow`.
- Selling is in `Production flow`.
- Inventory is in a large detail modal.
- Equipment buying is in a large store modal.

Some overlays are necessary on phone, but the main loop should not feel like the player is repeatedly opening admin panels. The garage should remain the default surface, and overlays should be contextual drawers that support a physical action.

### Does It Have A Clear Identity?

Yes, with one caveat. The identity is becoming clear:

> A small garage brewery where growth is visible through physical equipment, space pressure, and informal local sales.

The caveat is that `HOP HAVEN` and the polished garage scene can read slightly more established than "starter garage brewery". The starting setup already looks composed, atmospheric, and branded. For a cozy growth game, consider letting the earliest state feel more humble: fewer professional props, clearer empty space, visible starter gear, and a stronger sense that the player is building this from scratch.

### Is The Current Direction Worth Continuing?

Continue. Do not pivot. Narrow the next scope.

The project should not add more broad systems until the existing loop feels good. The correct next work is not "more recipes" or "deeper compliance". It is making one batch feel satisfying from start to sale.

## 2. First-Time Player Experience

### What The Player Understands Immediately

The first screen communicates several useful things instantly:

- This is a brewery in a garage-like workspace.
- The brewery is called `HOP HAVEN`.
- Money, energy, reputation, date, and time matter.
- The process is `Mash · Ferment · Package · Sell`.
- There are missions.
- Equipment exists and can be inspected.
- The plus button opens more controls.

The garage background does a lot of work. It immediately differentiates the game from an accounting sim.

### What Is Confusing

The first five minutes still have several unclear points:

- The first action is not obvious enough. The player sees missions, notifications, equipment, sprites, and a plus button all competing for attention.
- `Missions 0%` is not self-explanatory. It looks like progress but not a next step.
- The workflow label is not actionable. It tells the loop order but not what to tap.
- The equipment badge `3/11 tiers - 5/16 space` is cryptic. "Tiers" is not a natural player-facing count.
- The floor equipment is clickable, but the affordance is subtle. On first view, the objects look like illustration more than controls.
- The notification badge has the first real instruction, but it is tucked away behind a bell.
- The operations layer says `Floor controls`, but it feels like a command menu rather than an in-world surface.

### First Clear Action

The clearest reliable first action is either:

- Tap the kettle/brewhouse, which opens recipes.
- Tap the plus button, then `Brew / Recipes`.

The kettle path is more aligned with the product vision. It should become the primary onboarding path. The plus menu should remain a fallback, not the main flow.

### Is The Player Guided Enough?

Barely. The build is playable if the player experiments, but a first-time player can miss the intended flow.

The first instruction should be visible without opening notifications:

- "Tap the stock pot to brew your first Garage Blonde."

This can be a small physical callout anchored near the kettle, not a tutorial card. The player should not need to discover the plus menu before feeling like they are playing.

### Are Goals Visible?

Goals are present but not visible enough by default. The mission button shows progress, but the actual objective is hidden until tapped.

After the first sale, tapping missions showed:

`Next objective: add a second plastic fermenter. EUR 45/EUR 45`

That is a good objective because it points to capacity and physical growth. It should be surfaced more naturally after the first sale, with a stronger equipment-store link.

### Is The Loop Understandable Without Explanation?

The top-level loop is understandable:

`Mash -> Ferment -> Package -> Sell`

The actionable loop is less clear:

- Start brew is clear once recipes are open.
- Transfer requires the production panel.
- Fermentation requires ending days, but the player is not strongly guided toward `End day`.
- Packaging requires reopening production.
- Selling is in production rather than on the pallet.

The loop exists, but it is not yet self-evident from the garage.

### Does The Player Know Why They Are Doing Things?

At a high level, yes: brew beer, sell beer, earn cash, buy equipment.

At a moment-to-moment level, not always:

- Why did quality change?
- Why is contamination risk 28%?
- Why does `Private event` become the current channel before selling?
- Why did mission progress change downward?
- Why is a buyer offer better or worse beyond cash and visibility?
- Why are bottles shown as `20/40` while finished cases are separate?

The game needs short cause labels at state transitions. The player should learn the simulation through results.

## 3. Core Gameplay Loop

Current loop:

`brew -> transfer -> ferment -> package -> bottle condition -> finished beer -> sell -> upgrade`

This is the right loop. It should be protected.

### Clarity

Strong:

- Recipe cards clearly show which recipes are brewable and which are blocked.
- Manual gates for transfer and packaging are good.
- The production panel clearly says when a batch is waiting for player input.
- Buyer offers are better than a generic sell button.

Weak:

- Important actions are not always on the relevant object.
- The production panel becomes the main game board.
- Fermentation time is shown in huge minute counts rather than readable days/hours.
- Finished beer appears as a buyer list, not as a visible pallet/cases payoff.
- The player has to infer that `End day` is the correct way to progress fermentation.

### Satisfaction

The loop is functional but under-rewarded.

The first brew completing should feel like a small celebration. Instead, the game mostly changes numbers and notification counts. The sale should feel like the first proof that the little brewery worked. Instead, the cash value changes quietly and the panel closes.

Satisfaction is currently carried by the idea of the loop, not by feedback.

### Pacing

The pacing is structurally promising:

- Brewing consumes the first day.
- Fermentation spans several days.
- Packaging costs energy and time.
- Bottle conditioning adds a short final wait.
- Sale unlocks the next objective.

Problems:

- Fermentation is mostly repeated `End day` clicks with no alternate meaningful action during the first loop.
- The first loop takes many state changes but has few sensory rewards.
- Waiting states do not yet create planning choices unless the player has multiple fermenters, orders, cleaning, or equipment decisions.

Short term, either shorten the first fermentation path or add useful activities during waiting. The best fit is not idle timers; it is small garage work: clean, order ingredients, inspect equipment, plan next batch, buy another bucket once affordable.

### Friction

Good friction:

- Ingredient blockers.
- Fermenter slot reservation.
- Energy consumption.
- Space limits.
- Sales visibility/compliance tradeoff.

Bad friction:

- Repeatedly opening the operations layer.
- Large modals that hide the garage.
- Cryptic status counts.
- Actions located away from the physical object.
- Close buttons that are visually present but less reliable than they should feel for touch users.

### Decision-Making

Current decisions are still light:

- Which recipe to brew: mostly constrained by ingredients, not meaningful preference.
- Which buyer to sell to: promising, because cash/visibility/volume differ.
- Whether to order missing or extra ingredients: useful but not yet emotionally important.
- What equipment to buy: promising, especially extra fermenter, but the game needs clearer "this changes your next loop" feedback.

The first meaningful decision should be:

> Do I spend my first earnings on another plastic bucket so I can have two batches fermenting, or save for a better system?

That decision fits the cozy garage fantasy and creates immediate spatial payoff.

### Feedback

Feedback is the weakest part of the core loop.

Needed feedback moments:

- Brew start: heat, steam, bubbling, time jump, energy hit.
- Brew complete: kettle state and prompt to transfer.
- Transfer: visible movement or fermenter highlight.
- Fermentation complete: fermenter badge, sound, notification, "ready to package".
- Packaging: bottles/caps consumed, bottling bench active.
- Conditioning complete: cases appear on pallet.
- Sale: cases leave pallet, cash pops, rep/visibility changes, next objective revealed.
- Equipment purchase: new object appears in a slot with an install moment.

### Replayability

Replayability is currently limited because the first loop is mostly linear. Replayability will improve once:

- Multiple fermenters allow overlapping batches.
- Recipes differ in cost, market, risk, and fermentation tolerance.
- Buyer offers create tradeoffs.
- Equipment choices alter capacity, quality, risk, energy, and space.
- The garage visually evolves.

Do not add many recipes yet. Add more reasons to care about one recipe first.

### Missing Tension

The prototype has the language of tension but not the bite:

- Contamination risk is displayed, but the player cannot yet meaningfully manage it.
- Compliance pressure is displayed, but it is not yet a near-term consequence.
- Household pressure is displayed, but it is not active.
- Energy matters for actions, but the player is not forced into an interesting tradeoff yet.

The right tension for this game is gentle operational pressure, not punishment:

- "Do I package tonight while tired or wait until tomorrow?"
- "Do I sell all cases to a private event and increase visibility, or slowly sell to friends?"
- "Do I run another batch before cleaning?"
- "Do I crowd the garage with another bucket?"

### Missing Reward Moments

Most reward moments are currently number-only. Add physical payoffs first:

- Pallet fills in 1/2/3 visual levels.
- New plastic bucket appears after purchase.
- Batch card becomes a small tag on the fermenter.
- Buyer pickup clears cases from the pallet.
- Mission completion briefly calls out the next garage improvement.

## 4. Scene Interaction Model

### Clickable Equipment Sprites

Clickable sprites are the right model. The current implementation proves that this can work:

- Kettle/brewhouse opens recipes.
- Fermenter exists as a physical slot.
- Packaging bench exists as a visible station.
- Finished pallet exists as a sell target.

The issue is consistency. The player should learn:

- Tap kettle to brew or view brew state.
- Tap fermenter to inspect fermentation or transfer.
- Tap packaging bench to package.
- Tap pallet to sell.

At the moment, the reliable path is often:

`plus -> production -> action`

That undermines the "object is the button" model.

### Equipment Cards

The equipment cards in the store are useful and informative. They show tier, capacity, space, description, installed state, and affordability.

However, the cards can become too dense, especially on mobile. The most important line for each card should be a gameplay effect:

- `Adds one 20 L fermenter slot.`
- `Raises brew size to 40 L if a fermenter can hold it.`
- `Packages 60 L faster with less bottle loss.`
- `Uses 3 garage space.`

Flavor descriptions should be secondary.

### Hotspots And Fallbacks

The debug view shows tap zone previews, which is good. The normal build still needs stronger player-facing affordance.

Recommendations:

- On first session, softly pulse the kettle hotspot until the first brew starts.
- When a batch waits for transfer, pulse the fermenter or draw a subtle hose/arrow from kettle to fermenter.
- When fermentation completes, pulse the fermenter.
- When packaging is ready, pulse the bottling bench.
- When cases are ready, pulse the pallet.
- Keep fallback operation controls, but avoid making them visually dominant.

### Visual Affordance

The sprites look like part of the scene, which is good for immersion but risky for discoverability. They need a light interaction language:

- Hover/press glow on desktop.
- Tap highlight on mobile.
- Small state badges attached to objects.
- Object-specific verbs on hover or after tap: `Brew`, `Transfer`, `Package`, `Sell`.

Avoid permanent large labels over every object. Use stateful labels only when the object needs attention.

### Touchability On Phone

The core tap targets are large enough in landscape. The plus button and major overlay buttons are easy to hit. The object sprites are more questionable because they are visually smaller, and some physical stations are close to HUD labels.

Phone landscape needs thumb-first placement:

- Main action should appear near the object tapped, but not at the far edge.
- Close buttons need large hit areas.
- Important action buttons should be at least 44 px high.
- Tiny secondary text should not carry critical meaning.

### Readability On Mobile

The base scene is readable in landscape, but dense overlays push the limits:

- The operations layer is usable but covers a large part of the right side.
- Recipe cards are readable only because the first card dominates the view. Scrolling through many cards on a short landscape phone will feel cramped.
- Equipment store cards are likely too dense for repeated phone play.
- Bottom status pills are small and close to the screen edge.

Portrait blocker works well. It clearly tells the player to rotate.

### Is "The Object Is The Button" Working?

It is working as a direction, not yet as a complete interaction rule.

Current player reality:

- The objects are clickable.
- The main verbs still live in panels.
- The garage is the background for play, but not fully the play board.

Desired player reality:

- The garage object tells the player what it needs.
- Tapping the object opens only the relevant small action view.
- The production overlay becomes a summary, not the primary interaction surface.

### Does The Scene Feel Like A Game Board?

Partly. The object positions, zones, and debug placement system are moving toward a board. The floor has enough open space for future state markers and equipment growth.

It will feel more like a game board when:

- Each station has clear state.
- Equipment count changes are visible.
- Multiple fermenters show separate occupancy.
- Finished cases occupy a visible storage/pallet zone.
- The player can understand production at a glance without opening production.

### Do Overlays Feel Too UI-Heavy?

Yes, especially production, inventory, recipes, and equipment store. The visual style is attractive, but the interaction pattern is still modal-heavy.

Recommendations:

- Use full overlays only for store/inventory.
- Use small object drawers for current station actions.
- Keep the garage visible and unblurred enough during station actions.
- Make the production overlay a "clipboard summary" rather than the required action path.

## 5. UI Layout And Hierarchy

### Top HUD

The top HUD is visually polished and fits the atmosphere. Date/time in the center is strong. Cash/energy/rep in the top-right is understandable.

Issues:

- Reputation at `0` or `1` is clear, but it is not obvious what reputation does.
- Energy is readable, but the relationship between energy and action availability is not yet taught.
- Notifications badge competes with mission and plus button as an early action.
- On phone landscape, HUD elements are readable but leave little vertical breathing room.

Recommendations:

- Keep top HUD compact.
- Make energy changes animate when actions consume it.
- Add brief delta feedback: `-45 energy`, `+EUR 33`, `+1 rep`.
- Do not add more permanent HUD stats.

### Money / Energy / Reputation / Time

Money:

- Cash is important and visible.
- Costs/revenue need consistency. If batch cost is shown, cash should change or the copy should say "ingredient value used".

Energy:

- Strong fit for cozy operations.
- Needs better action feedback and low-energy consequences.

Reputation:

- Correct long-term system, but early reputation should feel like local trust.
- Consider naming early reputation `Local trust` until the game scales.

Time:

- Date/time center is excellent.
- In-game minutes remaining should be converted into player-readable units: `5 days 12 hours`, `finishes overnight`, `ready tomorrow morning`.

### Recipe / Brew Panel

Strengths:

- Recipe cards are flavorful.
- Blocked recipes explain missing ingredients.
- Ingredient ordering is integrated.
- Fermenter slot status appears on each card.
- Market percentage provides a seed for demand.

Weaknesses:

- Too many recipe cards appear too early.
- The first card competes with advanced recipes before the player understands one batch.
- Card text is dense for mobile.
- `Batch cost now` is unclear if cash is not immediately spent.
- "Order missing" and "Order extra" add cognitive load before the first brew.

Recommendation:

For the first session, feature `Garage Blonde` as the starter action and collapse the rest under `Other recipes`. After the first sale, open more recipe choice.

### Equipment Cards / Store

Strengths:

- Grouped by station.
- Physical equipment language is good.
- Space and capacity are visible.
- Unaffordable items show `Need cash`.
- Extra plastic fermenter is a strong next objective.

Weaknesses:

- `Installed: Plastic fermentation bucket` plus `Add another` on the same selected card is slightly confusing.
- Tier counts in the garage badge are hard to parse.
- Tier 2 preview shows `14/11 tiers`, which reads as a bug.
- Cards are too wordy for phone.

Recommendations:

- Change garage badge to `Equipment: 3 installed · 5/16 space`.
- For repeatable items, label the card `Plastic fermentation bucket` and use status `Owned: 1 · Add another`.
- Show the effect line first.

### Missions / Objectives

Missions are useful but under-surfaced.

Strength:

- The next objective after first sale, "add a second plastic fermenter", is exactly the right kind of objective.

Issues:

- The current objective is hidden behind the mission button.
- Percent progress can move in unintuitive ways.
- Mission completion lacks a strong reward moment.

Recommendation:

Make the current objective a small anchored note until completed. After completion, show a short physical next-step prompt near the equipment store.

### Notification Area

Notifications contain good operational writing:

- "Garage Blonde brew day is complete. Tap Transfer to fermenter when you are ready."
- "Garage doors up..."

Issues:

- Notifications are too important for core guidance.
- The panel is dense and scrollable.
- It mixes tutorial, state, and status diagnostics.

Recommendation:

Split messages into:

- Immediate floor note: one actionable next step.
- Logbook: history.
- Alerts: blockers or consequences.

### Bottom Actions / Pressure Pills

The bottom pills (`Channel`, `Compliance`, `Household`) are thematically strong. They communicate the intended pressure model without becoming an accounting screen.

Issues:

- They are small on phone.
- They do not yet produce enough gameplay consequences.
- `Household 0 deliveries` sounds like a metric but not a pressure state.

Recommendation:

Keep these lightweight. Make them change only when the player does something meaningful, and explain deltas in event text.

### Sell / Cases Flow

The buyer offers are a strong improvement over generic selling.

Current issue:

- Selling lives in the production overlay, not at the pallet.
- The finished pallet does not yet clearly show stock level.
- Buyer offer values and cash changes need verification for consistency.

Recommendation:

Tap pallet should open buyer offers. The production panel can list ready cases, but the pallet should own selling.

### Debug Panel

The layout debug editor is useful and well targeted for development. It should stay behind query params.

Notes:

- It clearly exposes slot coordinates and tap zone previews.
- It covers much of the right side, which is fine for debug.
- Copyable JSON is useful.
- Tier 2 preview plus debug confirms the asset placement direction, but also shows future clutter risk.

## 6. UX Flow Review

### Starting A Brew

What works:

- Tapping the kettle opens recipe selection.
- Starter recipe is available.
- Brew button is clear.
- Brew consumes time and energy.

What is confusing:

- The first action is not visible enough.
- The recipe overlay shows too many choices for the first brew.
- It is unclear whether `Batch cost now` is a real cash cost.
- The brew starts and jumps forward without a satisfying action moment.

Potential stuck point:

- A player may open missions or notifications first and not realize the kettle is the primary action.

Missing feedback:

- Brew animation/sound.
- Energy/cost delta.
- "Brew day started" visible on kettle.

Simplification:

- First brew: one featured starter card, one `Start brew day` button, one line explaining output.

### Selecting A Recipe

What works:

- Missing ingredient blockers are explicit.
- Recipe flavor text is good.
- Market percentages hint at strategy.

What is confusing:

- Too much appears before the player understands the loop.
- Advanced recipes are visible but mostly blocked.
- The difference between `Order missing` and `Order extra` is useful but early.

Potential stuck point:

- Player may order ingredients instead of brewing the available starter recipe, delaying the first loop.

Missing feedback:

- Why a recipe is strategically good now.
- Expected cases and profit after ingredient cost.

Simplification:

- Add a starter recommendation badge: `Good first batch`.

### Progressing Time

What works:

- `End day` exists.
- Time is action-driven rather than real-clock idle.
- Date/time changes are visible.

What is confusing:

- `End day` is hidden in operations.
- The player may not know if ending the day is safe.
- Large minute counts do not feel natural.

Potential stuck point:

- After transfer, player sees `7183 in-game minutes remaining` and may not know they should end days.

Missing feedback:

- A prompt such as `Fermenting. End the day or handle other garage work.`
- Overnight progress summary.

Simplification:

- When only waiting remains, show a clear `End day` button near the time display or fermenter state.

### Fermentation

What works:

- Fermentation reserves the bucket and takes multiple days.
- Progress bar is visible.
- Contamination risk is displayed.

What is confusing:

- Fermenter object does not become the obvious interaction surface.
- Quality/risk changes are not explained.
- There is little to do during the first fermentation.

Potential stuck point:

- Player may tap the fermenter expecting state but end up needing production overlay.

Missing feedback:

- Fermenter bubbling/active state.
- Completion pulse.
- Quality reason text.

Simplification:

- Fermenter object tap should show current batch, time remaining, risk, and next action.

### Packaging

What works:

- Packaging is a manual gate.
- The button is clear in production.
- Packaging consumes time and energy.
- Bottle conditioning starts after packaging.

What is confusing:

- The packaging bench itself is not the primary action.
- Bottles inventory and cases inventory are visually close but semantically different.
- `Bottles 20/40` remains visible even after packaging, while ready cases are elsewhere.

Potential stuck point:

- Player may not know whether to tap bottling station, production, or pallet.

Missing feedback:

- Bottles/caps consumed.
- Bottling activity visual.
- Case count created.

Simplification:

- Tap bottling bench when beer is awaiting packaging. Show one action: `Bottle 2 cases`.

### Selling

What works:

- Buyer offers are promising.
- Sales channels include visibility/compliance language.
- Cash and rep increase after sale.

What is confusing:

- Selling is not owned by the pallet.
- Offer values and resulting cash need consistency.
- Compliance change is visible but not explained.
- The current channel changed to `Private event` before the tested sale, which may be confusing.

Potential stuck point:

- Player may tap pallet and expect sale offers but still need production.

Missing feedback:

- Cases leaving pallet.
- Cash delta.
- Rep/visibility delta.
- Buyer satisfaction.

Simplification:

- Pallet tap opens buyer offers. The selected offer should preview deltas before confirmation.

### Buying Equipment

What works:

- Store has the right categories.
- Extra fermenter objective is a strong next step.
- Equipment is physical and understandable.
- Space cost is visible.

What is confusing:

- `3/11 tiers` does not tell the player what matters.
- Repeat purchases are hidden inside an "installed" card.
- Buying an item should immediately show where it will appear.

Potential stuck point:

- Player may not connect mission objective to store card.

Missing feedback:

- Installation animation.
- New slot highlight.
- "You can now ferment 2 batches at once."

Simplification:

- Objective button should deep-link/highlight the plastic fermenter store card.

### Adding Fermenters

What works:

- Multiple fermenter slots exist conceptually.
- Plastic bucket can be added.
- Tier 2 preview shows several fermenters.

What is confusing:

- The player needs to understand "one fermenter = one batch".
- Capacity should be expressed as 20 L bucket / one batch, not just inventory space.
- New fermenter placement needs a visible before/after.

Missing feedback:

- Empty slot indicator.
- Occupied slot state.
- Available fermenter count near recipes.

Simplification:

- Show small slot tags: `Bucket 1: empty`, `Bucket 2: fermenting`.

### Debug Layout

What works:

- The debug editor is practical.
- Tap zone previews are useful.
- Copyable JSON supports iteration.

What is confusing:

- Not relevant to normal players, correctly hidden behind query params.

Recommendation:

- Keep it as a development tool.
- Add quick viewport presets if layout iteration continues.

## 7. Game Systems Review

### Equipment Upgrades

Current state: promising, should be deepened first.

Equipment is the heart of the game. It should be the primary progression and decision system.

Deepen:

- Owned count.
- Installed slot.
- Capacity.
- Risk.
- Cleaning burden.
- Attention/energy cost.
- Space pressure.

Avoid:

- Abstract percentage upgrades.
- Equipment that only changes visuals.
- Equipment that only increases numbers without changing workflow.

### Fermenter Capacity

Current state: important and nearly ready to carry the game.

This should be the first mechanical depth area. Multiple fermenters naturally create scheduling and planning without making the game an ERP.

Deepen:

- One batch per fermenter.
- Clear empty/occupied states.
- Batch volume capped by fermenter capacity.
- Multiple batches in different states.

### Bottling / Cases

Current state: functional but under-visualized.

Keep simple mechanically, deepen feedback:

- Bottles/caps are consumed.
- Cases are created.
- Cases appear on pallet.
- Packaging equipment changes loss/time.

Avoid detailed packaging SKUs for now.

### Sales

Current state: very promising.

Buyer offers are one of the best systems in the current prototype. They create believable pressure while staying small-brewery focused.

Deepen soon:

- Friends/family: low risk, low volume, lower price.
- Private event: better money, more visibility.
- Local bar: repeat demand, invoice risk.
- Offer preview with cash/rep/visibility changes.

Avoid:

- Full price-setting UI.
- Distributor contracts.
- Tax accounting screens.

### Inventory

Current state: useful but can become noisy.

The inventory detail panel is readable, but it is dense. It has many ingredient rows, order buttons, kg/g/packs, and quality percentages.

Keep lightweight:

- Ingredients should block recipes.
- Orders should have dates.
- Quality/freshness can matter later.

Do not deepen inventory before equipment capacity and selling feel good.

### Money

Current state: visible but needs consistency.

Money should be simple and trusted:

- Brew/order costs reduce cash.
- Sales increase cash.
- Equipment costs reduce cash.
- Mission checks use cash honestly.

Fix any display/action mismatch before tuning balance.

### Energy

Current state: good fit.

Energy supports cozy day planning and prevents the game from becoming idle. Deepen lightly:

- Actions show energy cost.
- Low energy increases mistakes or slows work.
- End day restores energy.

Avoid:

- Turning energy into a free-to-play stamina mechanic.

### Reputation

Current state: too abstract but useful.

Reputation should initially mean local trust/demand. It should connect to offers and repeat customers. Keep it simple until sales channels mature.

### Contamination / Cleanliness

Current state: visible as risk/worn states, not yet meaningful enough.

This is worth deepening after the core loop feedback pass:

- Dirty fermenter/packaging raises risk.
- Cleaning costs time/energy/sanitizer.
- Contamination creates quality loss or batch loss.
- The player sees why it happened.

Do not add complex microbiology.

### Objectives / Missions

Current state: necessary but should be more physical.

The objectives should teach the loop and progression:

1. Brew first Garage Blonde.
2. Transfer to fermenter.
3. Package.
4. Sell first cases.
5. Add second plastic fermenter.
6. Brew two overlapping batches.

Avoid percentage-only mission language. Use concrete next actions.

## 8. Progression And Upgrades

### Does Progression Feel Visible?

Partly. Equipment store progression is visible. Garage scene progression is not yet visible enough in normal play.

The player can read that better equipment exists, but they need to see their garage physically change after buying equipment.

### Are Upgrades Emotionally Satisfying?

Not yet. The extra fermenter objective is emotionally correct, but the purchase needs:

- New object appears.
- New slot highlighted.
- Capacity count changes.
- Recipes show 2 fermenter slots.
- First overlapping batch becomes possible.

Without those, upgrades risk becoming store-button purchases.

### Is Equipment Evolution Understandable?

Mostly:

- Stock pot -> all-in-one -> three-vessel/nano brewhouse.
- Plastic bucket -> stainless conical -> unitank.
- Hand capper -> semi-auto filler -> small canning/seaming bench.

This path is understandable and believable for garage growth.

Potential issue:

- Tier 3 items may already feel beyond "garage" if not framed as the ceiling and pressure point.

### Are Upgrades Mechanically Meaningful?

They are designed to be meaningful, but the player does not yet feel the difference enough.

Each tier should change gameplay:

Tier 1:

- One small batch.
- High attention and energy cost.
- Rough quality and higher contamination risk.
- Manual transfer and packaging.
- Low visibility sales.
- Player learns the loop.

Tier 2:

- More concurrent batches.
- Better quality stability.
- Lower losses.
- Faster/lower attention packaging.
- More credible private events or bar demand.
- Garage space starts to matter.

Tier 3:

- Powerful but uncomfortable.
- Steam, power, clutter, household pressure.
- Formal sales pressure.
- Compliance/invoice issues.
- The game points toward leaving the garage rather than infinite scaling.

### Tier 2 Preview

The Tier 2 preview is encouraging because it shows the intended physical transformation. The all-in-one, grain mill, multiple conicals, and semi-auto filler make the garage feel more operational.

Concerns:

- The three conical fermenters are lined up too cleanly and can read as a showroom display.
- Scale and overlap need careful tuning so the garage does not look like pasted assets.
- The grain mill is visually clear, but it risks being a decorative object until milling has gameplay purpose.
- `14/11 tiers` in the equipment badge reads as broken.

Recommendation:

Keep Tier 2 preview as a development tool until the first Tier 1 purchase/install feedback is satisfying.

## 9. Visual Design And Art Integration

### Garage Background

The background is strong:

- Warm.
- Textured.
- Cozy but operational.
- Visually distinctive.
- Believable as a small workspace.

It may be slightly too polished and equipment-rich for the very first state. If the goal is "garage startup", keep more negative floor space and fewer advanced brewery cues at Tier 1.

### Equipment Sprite Scale

Tier 1:

- Kettle/stock pot reads well.
- Plastic bucket reads well enough but could use stronger active state.
- Bottling bench is readable and attractive.
- Pallet/sell point near the garage door is a good idea.

Tier 2:

- Conicals are readable but may feel too large and repeated.
- Mill is readable but visually competes with the lower-left UI.
- All-in-one station is visually strong but should match perspective and lighting carefully.

### Perspective Consistency

The current assets are close enough for prototype review, but perspective consistency is the main visual risk. A single mismatched object can break the cozy tactile illusion.

Recommendations:

- Use fixed slots.
- Match shadow direction.
- Add contact shadows under every equipment sprite.
- Avoid scaling objects only by width if perspective makes floor position matter.
- Check every asset at phone landscape size, not just desktop.

### Object Readability

Objects are readable on desktop. On phone landscape, the smaller equipment can become background texture unless highlighted by state.

Add:

- Station-specific active glow.
- Small state tags.
- Empty slot silhouettes.
- Filled pallet levels.

### Atmosphere

Atmosphere is one of the prototype's strengths. The lighting, garage clutter, and grounded material palette support the cozy target.

Risk:

- Too many panels blur/dim the scene and reduce atmosphere during play.

### Clutter Vs Negative Space

Current Tier 1 has enough negative space. Tier 2 preview shows future clutter risk. The game should use clutter as progression pressure, not just decoration.

At higher tiers, clutter should communicate:

- Harder movement.
- More household pressure.
- More visibility risk.
- Need to move out of the garage.

### Lighting

The lighting is warm and attractive. Equipment sprites need more consistent grounding so they share the same light source. This matters more as equipment count grows.

### Visual Feedback

This is the biggest art/design gap:

- No strong active state on brewing.
- No obvious fermenter state.
- No packaging state.
- No pallet filling.
- No sale pickup.
- No install animation.

Visual feedback should come before more decorative polish.

### Finished Pallet Direction

The finished beer pallet is the right sell-point mechanic. It should become the main payoff object.

Recommended states:

- Empty pallet.
- 1-2 cases.
- Half stack.
- Full stack.
- Reserved for pickup.
- Sold/cleared.

Tap pallet should always answer: "What beer is ready, who can buy it, and what happens if I sell?"

## 10. Mobile-First Playability

### Tap Target Sizes

Base controls are mostly large enough:

- Plus button is easy to tap.
- Operation buttons are large.
- Main action buttons in production/recipe panels are large.

Risk areas:

- Close buttons.
- Dense equipment cards.
- Small bottom status pills.
- Object sprites without visible active state.

### Landscape Layout

Landscape phone layout works better than expected. The scene remains legible, and the portrait blocker prevents unusable orientation.

However, overlays dominate the short viewport:

- Operations layer covers much of the right side.
- Recipe panel covers most of the left side.
- Store/inventory panels become dense and scroll-heavy.

The garage should not disappear behind the interface every few taps.

### Readable Text Size

Primary labels are readable. Secondary text is borderline on phone:

- Recipe descriptions.
- Equipment descriptions.
- Store card effect text.
- Offer details.

Recommendation:

On phone, reduce copy density rather than shrinking text.

### Density

Desktop density is acceptable. Phone density is high. The game should use progressive disclosure:

- First show action and consequence.
- Hide detail behind expand or secondary views.
- Do not show all recipe/order/equipment data at once.

### Scroll Behavior

Recipe and inventory overlays scroll, but on phone landscape this creates a heavy panel experience. For repeated play, use smaller station sheets with fewer options.

### Debug Mode

Debug mode is not mobile-player-facing and should remain hidden. It is useful for tuning, but it should not influence normal UI decisions.

### Thumb Comfort

The plus button on the lower-right is thumb-friendly. The left-side mission button is less convenient for right-hand play, but acceptable.

Station actions should appear near the tapped object and avoid requiring reach to top-right close buttons.

### Do Panels Cover Too Much Scene?

Yes. The current overlays are readable but scene-obscuring. This is the central mobile UX risk.

Short-term rule:

- If the action is part of the loop, use a compact station sheet.
- If the action is planning/store/inventory, use a full overlay.

## 11. Emotional And Game Feel

### Satisfaction

The prototype is satisfying conceptually but not sensorially. The player can complete a loop, but the game does not yet celebrate enough.

### Ownership

Ownership is emerging. The named garage, physical equipment, and objectives support it. Ownership will become much stronger once purchased equipment appears in the room and shows state.

### Craft Feeling

Craft feeling is present in recipe descriptions and equipment names. It is missing in action feedback. Brewing should feel like handling liquid, heat, bottles, and equipment, not just progressing a card.

### Anticipation

Fermentation creates anticipation structurally. It needs stronger visible countdown and completion feedback.

### Payoff

Payoff is too quiet. Selling should be one of the best moments in the first loop. Current payoff is mostly a cash number and mission progress.

### Tension

Tension is seeded but not active. Contamination, compliance, and household pressure need light consequences, but only after the first loop feels good.

### Pride In Upgrading

The second fermenter objective can create pride. Make the installed object visible and immediately useful.

### "My Little Brewery Is Growing"

This feeling is close. The garage equipment path is exactly right. The missing piece is visible, physical progression.

## 12. Major Risks

1. Too much UI, not enough direct play.

The scene is strong, but the loop still runs through overlays. If this continues, the game may become a dashboard over a pretty background.

2. Player feedback is insufficient.

Numbers change, but the player does not feel brewing, fermenting, packaging, selling, or installing enough.

3. Scene clutter may grow faster than readability.

Tier 2 preview is promising but shows how quickly the room can become visually crowded.

4. Loop is too linear before multiple fermenters.

The first loop is mostly follow-the-button. Add overlapping production through a second fermenter before adding unrelated systems.

5. Upgrades may become visual-only or number-only.

Every equipment purchase needs a clear workflow effect.

6. Mobile overlays may dominate the experience.

Phone landscape works, but repeated full panels can make the game feel cramped.

7. Systems can become noise.

Inventory, compliance, household pressure, energy, quality, contamination, and reputation are all useful, but not all should deepen at once.

8. Economic trust can break.

If displayed costs and revenue do not match cash changes, players will stop trusting the simulation.

9. Mission progress can confuse.

Progress percentages that move down or hide the current task weaken onboarding.

10. Tier 3 can pull the game away from its identity.

Large equipment should feel like the garage ceiling, not the start of a generic factory tycoon.

## 13. Concrete Recommendations

### A. Must Fix Before Expanding Content

1. Make the full first loop object-driven.

The player should be able to complete the first loop through station taps:

- Kettle: start brew / view brew complete.
- Fermenter: transfer / inspect fermenting / package-ready prompt.
- Bottling bench: package.
- Pallet: sell.

2. Add visible state to each station.

At minimum:

- Kettle active / waiting transfer.
- Fermenter empty / fermenting / ready to package.
- Bottling bench idle / packaging available.
- Pallet empty / cases ready.

3. Fix economic feedback consistency.

Audit:

- Ingredient costs.
- Batch cost copy.
- Sale offer value.
- Cash delta after sale.
- Equipment affordability.

4. Replace cryptic equipment badge.

Change `3/11 tiers - 5/16 space` to something like:

`3 installed · 5/16 space`

For Tier 2 preview, remove impossible-looking counts such as `14/11 tiers`.

5. Make first objective visible without tapping Missions.

Use a small floor note:

`Tap the stock pot to brew Garage Blonde.`

Then update it at each manual gate.

6. Convert large minute counters into readable time.

Use:

- `Ready in 5 days`
- `Ready tomorrow morning`
- `438 minutes` only in debug, not normal play.

7. Add payoff feedback for sale.

On sale:

- Cases leave pallet.
- Cash delta appears.
- Rep/visibility delta appears.
- Next objective appears.

8. Make finished beer pallet the sell entry point.

Production can summarize, but pallet should sell.

### B. Should Improve Soon

1. Feature the first recipe and collapse advanced recipes early.

Do not show seven blocked recipes as equal choices in minute one.

2. Add installation feedback for second fermenter.

When bought:

- New bucket appears.
- Slot highlights.
- Recipe panel says `2 fermenter slots open`.

3. Add simple overnight summary.

After `End day`:

- `Garage Blonde fermented 24h. 3 days remaining.`
- `Energy restored.`
- `No urgent issues.`

4. Make buyer offers preview consequences.

Each offer should show:

- Cases sold.
- Cash gained.
- Rep gained.
- Visibility/compliance increase.

5. Lightly teach quality and risk.

After packaging:

`Quality fell: plastic bucket + warm garage + hand packaging. Stainless gear and cleaning reduce this later.`

Keep it short.

6. Improve mobile overlay strategy.

Use compact station sheets for loop actions. Keep full overlays for store and inventory.

7. Add hover/tap affordance.

Objects should highlight when interactive and pulse when they need attention.

8. Make cleaning visible only when it matters.

If equipment is worn, provide a clear timed cleaning action and expected benefit.

### C. Nice Later

1. Optional sound feedback.

Burner click, liquid transfer, bubbling, bottle clink, cash sale, equipment install.

2. Hands-on brew mode.

Only after auto-loop feels good. Keep it optional.

3. More recipe personality.

Add style-specific risks after capacity and selling decisions matter.

4. Repeat customers.

Let friends/family and private events become recurring demand before adding formal contracts.

5. Compliance incidents.

Add invoice trouble and traceability requests after the player has sold enough to understand why attention is risky.

6. Seasonal garage temperature.

Useful later for fermentation choices, but not needed before the core loop is satisfying.

### D. Avoid Doing Now

1. Do not add more recipes as the main content expansion.

The current recipes are enough to test the loop.

2. Do not add a full accounting/compliance system.

Use compliance as event pressure, not a ledger.

3. Do not build a full production calendar.

Multiple fermenters and object states are enough for now.

4. Do not add staff systems.

Energy already represents effort at this scale.

5. Do not add full 3D or freeform layout.

Fixed slots are the right scope.

6. Do not deepen inventory freshness before the player cares about batches.

Ingredients should remain a blocker/planning system for now.

7. Do not let Tier 3 become a factory game.

Tier 3 should force a "garage ceiling" decision.

## 14. Next Implementation Roadmap

### Phase 1 - Make Current Loop Satisfying

Goal: one batch from brew to sale feels clear, tactile, and rewarding.

Tasks:

- Add station states for kettle, fermenter, bottling bench, and pallet.
- Route transfer/package/sell through object taps.
- Keep production overlay as a summary/fallback.
- Add visible action deltas for energy, cash, rep, quality, and compliance.
- Replace in-game minute text with readable days/hours.
- Add a simple first-loop objective note that updates at each step.
- Add pallet fill states for ready cases.
- Fix sale revenue and batch cost consistency.
- Add a browser regression test for `brew -> transfer -> ferment -> package -> condition -> sell`.

Done when:

- A new player can complete the first loop without opening the operations layer except as a fallback.
- The first sale clearly feels like a payoff.

### Phase 2 - Make Garage Scene Fully Interactive

Goal: the garage becomes the main gameplay surface.

Tasks:

- Add tap/hover affordance for interactive equipment.
- Add attention pulses only when action is needed.
- Add object-attached state tags.
- Make fermenter slots show empty/occupied/ready.
- Make the pallet own finished inventory and buyer offers.
- Make bottling bench own packaging.
- Improve mobile station sheets so loop actions do not require full-screen panels.
- Keep store/inventory as full overlays but reduce card density on phone.

Done when:

- The player can read the brewery state by looking at the garage.
- Multiple active/ready stations are visually distinguishable.

### Phase 3 - Improve Progression And Upgrades

Goal: equipment purchases visibly and mechanically change play.

Tasks:

- Polish second plastic fermenter purchase flow.
- Show installed equipment in fixed slots immediately.
- Add empty fermenter slot indicators.
- Let multiple batches ferment in parallel.
- Clearly show available fermenter slots on recipes.
- Make brewhouse capacity capped by fermenter capacity and explain the bottleneck.
- Add clear equipment effect lines in the store.
- Tune first upgrade prices so second fermenter is achievable right after or shortly after first sale.

Done when:

- Buying a second bucket changes both the room and the production strategy.
- The player understands why capacity matters.

### Phase 4 - Add Depth Carefully

Goal: deepen the simulation without turning it into an ERP.

Tasks:

- Add lightweight cleaning as time/energy/sanitizer action.
- Make contamination risk respond to equipment cleanliness and tier.
- Add repeat buyer offers and simple channel pressure.
- Add first invoice/compliance warning after repeated public sales.
- Add household pressure from clutter, deliveries, and repeated brewing.
- Add Tier 2 equipment when Tier 1 loop and multi-fermenter play are stable.
- Make Tier 2 equipment reduce attention/loss/risk, not just increase capacity.

Done when:

- The player faces gentle operational tradeoffs.
- More systems create stories, not noise.

## 15. Final Verdict

Continue the current direction. Do not pivot.

The garage/equipment approach is the right identity for Brewery-Sim. It gives the project a specific emotional and spatial hook that a spreadsheet tycoon cannot offer. The current prototype already proves the core concept: a small physical place, real brewing equipment, manual production gates, buyer offers, and visible growth pressure.

Narrow the scope before expanding. The game does not need more content yet. It needs one complete, tactile, readable, mobile-friendly first loop.

The single highest-value next move:

> Make the garage objects own the first loop, and make the finished beer pallet deliver a visible sale payoff.

If that lands, the next 2-4 weeks can safely build multiple fermenters and Tier 1 progression. If it does not land, adding more recipes, tiers, or systems will mostly add panel complexity on top of an under-felt core.
