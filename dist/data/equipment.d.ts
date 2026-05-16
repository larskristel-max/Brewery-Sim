import type { Equipment, EquipmentCatalogItem, EquipmentId, EquipmentItemId, OwnedEquipment } from '../game/schema.js';
export declare const equipmentCatalog: EquipmentCatalogItem[];
export declare const getEquipmentCatalogItem: (itemId: EquipmentItemId) => EquipmentCatalogItem;
export declare const createOwnedEquipment: (itemId: EquipmentItemId, instanceNumber?: number, installed?: boolean) => OwnedEquipment;
export declare const equipmentByStation: (equipmentId: EquipmentId) => EquipmentCatalogItem[];
export declare const topGarageTier: (equipmentId: EquipmentId) => number;
export declare const starterEquipment: Equipment[];
export declare const starterOwnedEquipment: OwnedEquipment[];
