export type BatchStep = 'mashing' | 'fermenting' | 'packaging' | 'ready';
export type EquipmentId = 'kettle' | 'fermenter' | 'bottler';
export type UpgradeId = 'larger-kettle' | 'temp-control' | 'labeler';
export interface Recipe {
    id: string;
    name: string;
    style: string;
    grainCost: number;
    hopCost: number;
    yeastCost: number;
    waterCost: number;
    salePricePerCase: number;
    batchSizeCases: number;
    qualityBase: number;
    stepDurations: Record<Exclude<BatchStep, 'ready'>, number>;
}
export interface Inventory {
    grain: number;
    hops: number;
    yeast: number;
    water: number;
    cases: number;
}
export interface Batch {
    id: string;
    recipeId: string;
    recipeName: string;
    step: BatchStep;
    stepProgress: number;
    quality: number;
    casesExpected: number;
    contaminationRisk: number;
}
export interface Equipment {
    id: EquipmentId;
    name: string;
    description: string;
    level: number;
    condition: number;
    x: number;
    y: number;
}
export interface Upgrade {
    id: UpgradeId;
    name: string;
    description: string;
    cost: number;
    purchased: boolean;
}
export interface LocalDemand {
    accountName: string;
    casesRequested: number;
    casesSold: number;
    reputationReward: number;
}
export interface EventLogEntry {
    id: string;
    minute: number;
    message: string;
}
export interface GameState {
    cash: number;
    reputation: number;
    day: number;
    dayElapsedSeconds: number;
    minute: number;
    inventory: Inventory;
    batches: Batch[];
    equipment: Record<EquipmentId, Equipment>;
    upgrades: Record<UpgradeId, Upgrade>;
    demand: LocalDemand;
    events: EventLogEntry[];
    selectedEquipmentId: EquipmentId;
    salesToday: number;
}
export type GameAction = {
    type: 'tick';
    seconds: number;
} | {
    type: 'select-equipment';
    equipmentId: EquipmentId;
} | {
    type: 'use-equipment';
    equipmentId: EquipmentId;
} | {
    type: 'start-batch';
    recipeId: string;
} | {
    type: 'package-batch';
    batchId: string;
} | {
    type: 'sell-cases';
    cases: number;
} | {
    type: 'buy-upgrade';
    upgradeId: UpgradeId;
} | {
    type: 'clean-equipment';
    equipmentId: EquipmentId;
};
