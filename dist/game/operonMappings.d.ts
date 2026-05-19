import type { BatchStep, EquipmentId, InventoryMovementType, SalesChannelId } from './schema.js';
export type OperonProcessKey = 'process.mash' | 'process.boil' | 'process.knockout_transfer' | 'process.primary_fermentation' | 'process.packaging' | 'process.release_for_consumption';
export type OperonEquipmentKey = 'equipment.kettle' | 'equipment.fv' | 'equipment.bbt' | 'equipment.mash_tun';
export type OperonMovementKey = 'movement.order_created' | 'movement.order_received' | 'movement.ingredients_consumed' | 'movement.beer_packaged' | 'movement.cases_sold' | 'movement.loss_recorded';
export type OperonSalesRisk = 'informal_private' | 'informal_event' | 'formal_trade';
export declare const batchStepOperonProcess: Record<BatchStep, OperonProcessKey>;
export declare const equipmentOperonType: Record<EquipmentId, OperonEquipmentKey>;
export declare const inventoryMovementOperonType: Record<InventoryMovementType, OperonMovementKey>;
export declare const salesChannelOperonRisk: Record<SalesChannelId, OperonSalesRisk>;
