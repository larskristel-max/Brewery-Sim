import type { BatchStep, EquipmentId, InventoryMovementType, SalesChannelId } from './schema.js';

export type OperonProcessKey =
  | 'process.mash'
  | 'process.boil'
  | 'process.knockout_transfer'
  | 'process.primary_fermentation'
  | 'process.packaging'
  | 'process.release_for_consumption';

export type OperonEquipmentKey =
  | 'equipment.kettle'
  | 'equipment.fv'
  | 'equipment.bbt'
  | 'equipment.mash_tun';

export type OperonMovementKey =
  | 'movement.order_created'
  | 'movement.order_received'
  | 'movement.ingredients_consumed'
  | 'movement.beer_packaged'
  | 'movement.cases_sold'
  | 'movement.loss_recorded';

export type OperonSalesRisk = 'informal_private' | 'informal_event' | 'formal_trade';

export const batchStepOperonProcess: Record<BatchStep, OperonProcessKey> = {
  brewing: 'process.boil',
  'awaiting-transfer': 'process.knockout_transfer',
  fermenting: 'process.primary_fermentation',
  'awaiting-packaging': 'process.packaging',
  packaging: 'process.packaging',
  'bottle-conditioning': 'process.packaging',
  ready: 'process.release_for_consumption'
};

export const equipmentOperonType: Record<EquipmentId, OperonEquipmentKey> = {
  kettle: 'equipment.kettle',
  fermenter: 'equipment.fv',
  bottler: 'equipment.bbt',
  mill: 'equipment.mash_tun'
};

export const inventoryMovementOperonType: Record<InventoryMovementType, OperonMovementKey> = {
  'order-created': 'movement.order_created',
  'order-received': 'movement.order_received',
  'ingredients-consumed': 'movement.ingredients_consumed',
  'beer-packaged': 'movement.beer_packaged',
  'cases-sold': 'movement.cases_sold',
  'loss-recorded': 'movement.loss_recorded'
};

export const salesChannelOperonRisk: Record<SalesChannelId, OperonSalesRisk> = {
  'friends-family': 'informal_private',
  'private-event': 'informal_event',
  'local-bar': 'formal_trade',
  restaurant: 'formal_trade'
};
