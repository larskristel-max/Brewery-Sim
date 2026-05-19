export const batchStepOperonProcess = {
    brewing: 'process.boil',
    'awaiting-transfer': 'process.knockout_transfer',
    fermenting: 'process.primary_fermentation',
    'awaiting-packaging': 'process.packaging',
    packaging: 'process.packaging',
    'bottle-conditioning': 'process.packaging',
    ready: 'process.release_for_consumption'
};
export const equipmentOperonType = {
    kettle: 'equipment.kettle',
    fermenter: 'equipment.fv',
    bottler: 'equipment.bbt',
    mill: 'equipment.mash_tun'
};
export const inventoryMovementOperonType = {
    'order-created': 'movement.order_created',
    'order-received': 'movement.order_received',
    'ingredients-consumed': 'movement.ingredients_consumed',
    'beer-packaged': 'movement.beer_packaged',
    'cases-sold': 'movement.cases_sold',
    'loss-recorded': 'movement.loss_recorded'
};
export const salesChannelOperonRisk = {
    'friends-family': 'informal_private',
    'private-event': 'informal_event',
    'local-bar': 'formal_trade',
    restaurant: 'formal_trade'
};
//# sourceMappingURL=operonMappings.js.map