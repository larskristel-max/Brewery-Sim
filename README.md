# Brewery-Sim

Brewery-Sim is a grounded, game-like brewery simulation about growing from a scrappy garage brewing setup into a fully industrial production brewery. It is inspired by the real Operon brewery operating system, but the current decision is to validate the gameplay loop first as a React, Vite, and TypeScript web/mobile prototype rather than starting in Unity or integrating with Operon immediately.

## Player Fantasy

Start as a small garage brewer making batches by hand, then scale step by step into a professional brewery with larger equipment, production lines, staff, logistics, and an increasingly busy brewery floor. Progress should feel physical and earned: every upgrade changes how the space works and how the brewery operates.

## Core Principle

> “You are not managing menus. You are managing a living brewery.”

Implementation decisions should prioritize visible systems, believable spaces, and direct interaction with brewery operations over abstract menu management. Menus can support the experience, but the brewery floor should remain the primary place where the game is understood and played.

## Target Feel

- Grounded industrial realism: practical equipment, believable layouts, and production choices that feel rooted in real brewing.
- Warm atmospheric lighting: inviting, tactile spaces with an amber brewery glow rather than sterile abstraction.
- Readable minimal UI: clear information only when needed, without overwhelming the player or replacing the physical simulation.
- Alive brewery floor: workers, machines, materials, batches, maintenance, and logistics should make the space feel active and responsive.

## Technical recommendation

### Recommendation

Build the first version as a web app prototype using React, Vite, and TypeScript.

This is the right choice for the current stage because the main unknown is not rendering technology; it is whether the brewery gameplay loop is fun. A web prototype lets the team test the loop quickly, keep the simulation logic readable, and avoid investing in a full game-engine workflow before the core mechanics are proven. The first prototype should be a local-only, single-player garage brewery simulation with a game-like scene UI.

It should not feel like a production dashboard, ERP, brewery MES, or Operon admin screen.

### Advantages

- **Fast iteration:** React and Vite are well suited for quickly changing UI layouts, interaction flows, and game loop rules.
- **Codex-friendly workflow:** TypeScript simulation logic, componentized UI, and testable state transitions are easy to inspect and modify.
- **Lower learning curve:** The team can avoid Unity-specific scene, asset, build, and deployment overhead while evaluating the core idea.
- **Future Operon compatibility:** A TypeScript domain model can later map to Supabase tables, Operon API resources, or shared business concepts.
- **Easy playtesting:** A hosted web build can be shared with testers more easily than an early desktop or mobile game build.
- **Mobile path remains open:** The UI can be designed with responsive/touch-friendly interactions from the beginning.
- **Simulation-first architecture:** The brewing rules can live outside React components, making them portable to other presentation layers later.

### Risks

- **Game feel risk:** A normal React app can easily become a dashboard unless the UI is intentionally scene-first and contextual.
- **Visual limitation risk:** DOM/CSS can support an early scene, but more advanced animation, pathfinding, or isometric rendering may later require Canvas, PixiJS, Phaser, or Unity.
- **Over-modeling risk:** Brewing is complex; the prototype must resist becoming a complete brewery management simulator too early.
- **State complexity risk:** Timers, production steps, inventory, and upgrades can become messy without a small simulation engine boundary.
- **Backend temptation:** Connecting Supabase or Operon too soon would slow gameplay discovery and create integration constraints before the game design is stable.
- **Asset polish trap:** Spending too much time on art, animation, or detailed equipment visuals before the loop is fun could hide weak mechanics.

## Proposed repo and project structure

Start with a single Vite app and keep the game simulation separate from React UI components.

```text
Brewery-Sim/
  README.md
  package.json
  index.html
  vite.config.ts
  tsconfig.json
  src/
    main.tsx
    App.tsx
    styles/
      globals.css
      garage.css
    game/
      schema.ts
      initialState.ts
      constants.ts
      selectors.ts
      simulation.ts
      actions.ts
      random.ts
    data/
      equipment.ts
      recipes.ts
      upgrades.ts
      salesChannels.ts
    components/
      layout/
        GameShell.tsx
        TopBar.tsx
      scene/
        GarageScene.tsx
        EquipmentNode.tsx
        BrewerAvatar.tsx
      panels/
        ActionPanel.tsx
        BatchStatusPanel.tsx
        UpgradeShop.tsx
        InventoryPanel.tsx
      feedback/
        EventLog.tsx
        Toast.tsx
    hooks/
      useGameLoop.ts
      useGameState.ts
    tests/
      simulation.test.ts
      actions.test.ts
```

### Structure principles

- `src/game` contains deterministic simulation logic and type definitions.
- `src/data` contains tunable content such as starter gear, recipes, upgrades, and sales channels.
- `src/components` contains scene and UI presentation only.
- React components should dispatch game actions; they should not calculate brewing outcomes directly.
- Local storage can be added after the first loop works, but initial state can simply reset on refresh for the earliest prototype.

## First milestone implementation plan

### Milestone 1: Garage Brewery Prototype

Goal: prove that a simple brew, ferment, package, sell, upgrade loop is understandable and fun in under five minutes.

#### Step 1: Project foundation

- Create a Vite React TypeScript app.
- Add a small CSS-driven garage scene.
- Add a local game state provider or reducer.
- Add unit tests for core simulation functions.

#### Step 2: Static garage scene

- Render a cozy garage brewery floor with starter zones:
  - workbench
  - kettle
  - fermenter
  - bottling table
  - storage shelf
  - upgrade crate/shop corner
- Make equipment clickable.
- Show contextual actions when a player clicks equipment.

#### Step 3: Starter economy

- Start the player with **€500**.
- Let the player buy a starter kit or individual basic equipment.
- Keep starter choices intentionally limited.
- Show cash and reputation in a small game HUD, not a large dashboard.

#### Step 4: One recipe and one batch

- Add one simple recipe, such as **Garage Pale Ale**.
- Let the player start one brew if required equipment and ingredients are available.
- Move the batch through stages:
  - planned
  - brewing
  - fermenting
  - ready to package
  - packaged
  - sold

#### Step 5: Fermentation timer

- Use a short prototype timer, such as 60 to 180 seconds.
- Display stage progress visually near the fermenter.
- Allow time compression only if the loop feels too slow during playtesting.

#### Step 6: Quality and risk result

- Calculate a simple quality score when fermentation completes.
- Include a small contamination/risk chance based on equipment quality, cleanliness, and player choices.
- Keep results understandable:
  - great batch
  - decent batch
  - flawed batch
  - contaminated batch

#### Step 7: Bottle and sell

- Let the player package the beer at the bottling table.
- Sell locally through one basic sales channel.
- Award cash and reputation based on packaged volume and quality.

#### Step 8: Upgrade loop

- Add 2 to 4 upgrades only:
  - better fermenter
  - improved kettle
  - sanitation kit
  - small packaging upgrade
- Upgrades should reduce risk, increase batch size, improve quality, or reduce time.

#### Step 9: Playtest checklist

- Can a new player understand what to click?
- Does the first sale feel rewarding?
- Does the player naturally want one more batch?
- Are upgrades meaningful within 5 to 10 minutes?
- Is the UI more scene-like than dashboard-like?

## Minimum simulation model

The first model should be intentionally small.

### Player

- id
- name
- current stage, starting at garage brewer
- cash
- reputation
- unlocked recipes
- unlocked equipment

### Cash

- starting cash: €500
- transactions for purchases, ingredient costs, packaging costs, and sales
- no loans, taxes, rent, payroll, or accounting yet

### Equipment

- equipment id
- type
- display name
- cost
- capacity
- quality modifier
- risk modifier
- owned/unowned state
- current availability

### Inventory

- ingredients
- packaging supplies
- finished packaged beer
- optional cleaning supplies

### Batch

- batch id
- recipe id
- batch size
- stage
- started time
- expected completion time
- quality score
- contamination result
- packaged units
- sale result

### Fermentation

- fermentation start time
- duration
- progress
- temperature abstraction if needed later
- risk roll at completion

### Quality

A first quality calculation can combine:

- base recipe quality
- equipment quality modifier
- sanitation modifier
- random variation
- contamination penalty

The output should be a simple score from 0 to 100 and a plain-language result label.

### Sales

A first sales calculation can combine:

- packaged units
- base price per unit
- quality multiplier
- reputation multiplier
- sales channel modifier

### Upgrades

Each upgrade should have:

- id
- name
- cost
- description
- effect type
- effect value
- prerequisite, if any
- purchased state

## Simple TypeScript game-state schema

```ts
export type BreweryStage =
  | 'garage_brewer'
  | 'nano_brewery'
  | 'professional_brewery'
  | 'industrial_brewery';

export type EquipmentType =
  | 'kettle'
  | 'fermenter'
  | 'bottling_table'
  | 'storage'
  | 'sanitation';

export type BatchStage =
  | 'planned'
  | 'brewing'
  | 'fermenting'
  | 'ready_to_package'
  | 'packaged'
  | 'sold'
  | 'failed';

export type InventoryItemType =
  | 'malt'
  | 'hops'
  | 'yeast'
  | 'bottles'
  | 'packaged_beer';

export interface GameState {
  version: number;
  currentTime: number;
  player: PlayerState;
  equipment: Record<string, EquipmentState>;
  inventory: Record<string, InventoryItem>;
  recipes: Record<string, RecipeState>;
  batches: Record<string, BatchState>;
  activeBatchId: string | null;
  upgrades: Record<string, UpgradeState>;
  eventLog: GameEvent[];
}

export interface PlayerState {
  id: string;
  name: string;
  breweryStage: BreweryStage;
  cash: number;
  reputation: number;
  unlockedRecipeIds: string[];
  purchasedUpgradeIds: string[];
}

export interface EquipmentState {
  id: string;
  type: EquipmentType;
  name: string;
  owned: boolean;
  cost: number;
  capacityLiters: number;
  qualityModifier: number;
  riskModifier: number;
  isBusy: boolean;
}

export interface InventoryItem {
  id: string;
  type: InventoryItemType;
  name: string;
  quantity: number;
  unit: 'kg' | 'g' | 'each' | 'liters';
}

export interface RecipeState {
  id: string;
  name: string;
  style: string;
  batchSizeLiters: number;
  baseQuality: number;
  basePricePerBottle: number;
  ingredients: RecipeIngredient[];
  requiredEquipmentTypes: EquipmentType[];
  fermentationDurationMs: number;
}

export interface RecipeIngredient {
  itemType: InventoryItemType;
  quantity: number;
}

export interface BatchState {
  id: string;
  recipeId: string;
  stage: BatchStage;
  volumeLiters: number;
  startedAt: number;
  stageStartedAt: number;
  stageCompletesAt: number | null;
  qualityScore: number | null;
  contamination: ContaminationResult | null;
  packagedUnits: number;
  revenueEarned: number | null;
}

export interface ContaminationResult {
  contaminated: boolean;
  riskChance: number;
  roll: number;
  penalty: number;
}

export interface UpgradeState {
  id: string;
  name: string;
  description: string;
  cost: number;
  purchased: boolean;
  effect: UpgradeEffect;
  prerequisiteUpgradeIds?: string[];
}

export type UpgradeEffect =
  | { type: 'increase_capacity'; equipmentType: EquipmentType; liters: number }
  | { type: 'reduce_risk'; equipmentType?: EquipmentType; amount: number }
  | { type: 'increase_quality'; amount: number }
  | { type: 'reduce_duration'; equipmentType?: EquipmentType; percent: number };

export interface GameEvent {
  id: string;
  time: number;
  message: string;
  tone: 'info' | 'success' | 'warning' | 'danger';
}
```

## First version UI plan

### Garage scene

The main screen should be a visual garage brewery floor, not a dashboard. It can be built with HTML and CSS first:

- warm concrete or wood floor background
- back wall with shelves
- clickable kettle, fermenter, bottling table, storage shelf, and upgrade crate
- small animated brewer avatar or simple character marker
- visual status badges over equipment
- progress ring or bar attached to active equipment

### Clickable equipment

Each piece of equipment should have a clear purpose:

- **Kettle:** start brew, view recipe requirements, show brewing status.
- **Fermenter:** start fermentation, view timer, complete fermentation result.
- **Bottling table:** package finished beer.
- **Storage shelf:** inspect ingredients and packaged inventory.
- **Upgrade crate/shop corner:** buy simple upgrades.

### Action panel

Clicking equipment opens a contextual action panel with only relevant choices.

Examples:

- kettle selected: `Brew Garage Pale Ale`
- fermenter selected: `Check fermentation`
- bottling table selected: `Bottle batch`
- storage selected: `View supplies`
- upgrade crate selected: `Buy sanitation kit`

### Batch status

Show one compact batch card:

- beer name
- current stage
- progress
- expected result timing
- quality result after fermentation
- next suggested action

### Cash and reputation display

Use a compact HUD:

- cash: `€500`
- reputation: `0`
- brewery stage: `Garage Brewer`

Avoid tables, charts, KPI dashboards, and dense management views.

### Upgrade shop

The first upgrade shop should be tiny and visual:

- 2 to 4 cards
- clear cost
- clear effect
- disabled state if unaffordable
- immediate feedback after purchase

## Safe development path

- Build the MVP only.
- Keep all simulation local at first.
- Keep the UI scene-first and interaction-first.
- Test every game action as a pure state transition where possible.
- Add only one recipe until the first loop works.
- Add only one active batch until the first loop works.
- Add persistence only after the loop is fun enough to replay.
- Add Supabase only after local state has stabilized.
- Add Operon integration only after the game has a reason to exchange real brewery data.
- Consider Canvas, Phaser, PixiJS, or Unity only if the scene interaction needs exceed what React and CSS can support.

## Anti-Goals

Brewery-Sim should not become:

- Cartoonish or visually exaggerated in a way that breaks the grounded brewery fantasy.
- A mobile idle game focused on timers, tapping, and passive number growth.
- A menu-first management game where the best way to play is through spreadsheets, panels, or abstract dashboards.

## Do not build yet

Do not build these in the first milestone:

- Unity project
- 3D brewery floor
- full Operon integration
- Supabase backend
- authentication
- multiplayer
- staff hiring and payroll
- loans, taxes, rent, accounting, or investor systems
- full recipe designer
- realistic chemistry model
- detailed temperature and pH control
- CIP/SIP workflows
- regulatory compliance systems
- production scheduling calendar
- distribution contracts
- multiple breweries or locations
- analytics dashboard
- charts-heavy management UI
- large item economy
- complex tutorial system
- mobile app store packaging
- detailed art pipeline
- save-game cloud sync
- modding support

## Comparable References

Use these references as directional checks, not direct templates:

- **The Sims**: readable people, routines, needs, and lived-in spaces.
- **Factorio**: production flow, scaling complexity, and satisfying logistics.
- **Two Point Campus**: approachable management, clear feedback, and lively facilities.
- **Cities: Skylines**: growth from small beginnings into complex, interconnected systems.
- **Realistic brewery sim**: believable brewing equipment, production processes, and industrial atmosphere.

## Definition of done for the first playable

The first playable is successful when a tester can:

1. open the prototype
2. understand they are in a garage brewery
3. buy or use starter gear
4. brew one beer
5. wait for fermentation
6. see a quality or contamination result
7. bottle the batch
8. sell it
9. buy an upgrade
10. want to try another batch

If that loop is not fun, do not expand the simulation. Improve the loop first.
