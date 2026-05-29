import { campaignAllowsCleaning, campaignAllowsTemperature, campaignPrimaryTarget } from '../game/campaign.js';
import { caseCountLabel, contaminationRiskTier, currentWorkflowStage, equipmentConditionLabel, equipmentConditionTier, formatBatchRemainingTime, recipeMissingIngredients, visibleRecipes } from '../game/selectors.js';
import { renderRecipeSelectionPanel } from './recipePanel.js';
import { displayEquipmentName } from './sceneEquipment.js';
export const equipmentCapacityLabel = (equipment) => {
    const liters = equipment.capacityLiters;
    if (equipment.id === 'mill')
        return 'Milling prep station';
    if (equipment.id === 'bottler')
        return liters > 0 ? `${liters} L packaging run` : 'Packaging capacity pending';
    return liters > 0 ? `${liters} L capacity` : 'Capacity pending';
};
const stepLabel = (step) => ({
    brewing: 'Brewing',
    'awaiting-transfer': 'Awaiting transfer',
    fermenting: 'Fermenting',
    'awaiting-packaging': 'Awaiting packaging',
    packaging: 'Packaging',
    'bottle-conditioning': 'Bottle conditioning',
    ready: 'Ready'
})[step] ?? step;
export const createStationViewModel = (context) => {
    const { state } = context;
    const garageSpaceUsed = () => state.garageSpaceUsed;
    const garageSpaceLimit = () => state.garageSpaceLimit;
    const recipeForBatch = (batch) => visibleRecipes().find((item) => item.id === batch.recipeId);
    const batchRemainingLabel = (batch) => {
        const recipe = recipeForBatch(batch);
        return recipe ? formatBatchRemainingTime(state, batch, recipe) : batch.stepProgress >= 100 ? 'Ready now' : 'Waiting for player input';
    };
    const brewingBatch = () => state.batches.find((batch) => batch.step === 'brewing');
    const awaitingTransferBatch = () => state.batches.find((batch) => batch.step === 'awaiting-transfer');
    const fermenterReservation = () => {
        const openSlots = state.ownedEquipment.filter((item) => item.equipmentId === 'fermenter' && !item.occupiedBatchId).length;
        const occupyingBatch = state.batches.find((batch) => batch.step === 'fermenting' || batch.step === 'awaiting-packaging');
        if (occupyingBatch) {
            return {
                blocked: openSlots === 0,
                label: openSlots === 0 ? 'Fermenters occupied' : `${openSlots} fermenter slot open`,
                detail: `${occupyingBatch.recipeName} is ${stepLabel(occupyingBatch.step).toLowerCase()}.`
            };
        }
        const reservedBatch = state.batches.find((batch) => batch.step === 'brewing' || batch.step === 'awaiting-transfer');
        if (reservedBatch) {
            return {
                blocked: openSlots === 0,
                label: openSlots === 0 ? 'Fermenters reserved' : `${openSlots} fermenter slot open`,
                detail: `${reservedBatch.recipeName} has a fermenter reserved after mash.`
            };
        }
        return {
            blocked: false,
            label: `${openSlots} fermenter slot${openSlots === 1 ? '' : 's'} open`,
            detail: `${displayEquipmentName(state.equipment.fermenter)} ready for the next transfer.`
        };
    };
    const recipeStartBlocker = (recipe) => {
        const reservation = fermenterReservation();
        if (!recipe.enabled)
            return 'Recipe locked';
        if (state.inventory.water < recipe.waterCost)
            return `Need ${recipe.waterCost} L water`;
        if (recipeMissingIngredients(state, recipe).length > 0)
            return 'Missing ingredients';
        if (state.energy < 35)
            return 'Low energy';
        if (state.batches.some((batch) => batch.step === 'brewing'))
            return 'Brewhouse busy';
        if (reservation.blocked)
            return reservation.label;
        return '';
    };
    const fermenterTemperatureHint = () => {
        const fermenting = state.batches.find((batch) => batch.step === 'fermenting');
        const recipe = fermenting ? visibleRecipes().find((item) => item.id === fermenting.recipeId) : null;
        if (!recipe)
            return 'Set for next batch';
        const ingredientIds = recipe.ingredients.map((ingredient) => ingredient.ingredientId);
        const target = ingredientIds.includes('lager-yeast')
            ? { label: 'lager', min: 9, max: 14 }
            : ingredientIds.includes('kveik-yeast') || recipe.style.toLowerCase().includes('kveik')
                ? { label: 'kveik', min: 28, max: 40 }
                : ingredientIds.includes('saison-yeast')
                    ? { label: 'saison', min: 20, max: 30 }
                    : ingredientIds.includes('wheat-yeast')
                        ? { label: 'wheat ale', min: 18, max: 24 }
                        : { label: 'ale', min: 17, max: 22 };
        if (state.fermenterTemperatureC < target.min)
            return `Too cool for ${target.label} - slower fermentation`;
        if (state.fermenterTemperatureC > target.max)
            return `Too warm for ${target.label} - off-flavor risk`;
        return `${target.label[0].toUpperCase()}${target.label.slice(1)} target ${target.min}-${target.max} C`;
    };
    const activeForEquipment = (equipmentId) => {
        const stepByEquipment = { kettle: 'brewing', fermenter: 'fermenting', bottler: 'packaging' };
        const step = stepByEquipment[equipmentId];
        if (!step)
            return false;
        return state.batches.some((batch) => batch.step === step);
    };
    const batchForEquipment = (equipmentId) => {
        const stepByEquipment = { kettle: 'brewing', fermenter: 'fermenting', bottler: 'packaging' };
        const step = stepByEquipment[equipmentId];
        if (!step)
            return undefined;
        return state.batches.find((batch) => batch.step === step);
    };
    const isNextTapTarget = (target) => {
        const campaignTarget = campaignPrimaryTarget(state);
        if (campaignTarget === 'shop' || campaignTarget === 'ops' || campaignTarget === 'notebook')
            return false;
        return campaignTarget === target || currentWorkflowStage(state).tapTarget === target;
    };
    const equipmentMetaLine = (equipment) => `${equipmentCapacityLabel(equipment)} - ${equipment.spaceUsed || '?'} space`;
    const equipmentSceneStatus = (equipmentId) => {
        const equipment = state.equipment[equipmentId];
        const activeBatch = batchForEquipment(equipmentId);
        const conditionLabel = equipmentConditionLabel(equipment.condition);
        const conditionDetail = `Cleanliness: ${conditionLabel}`;
        if (equipmentId === 'kettle') {
            const brewing = brewingBatch();
            const waitingTransfer = awaitingTransferBatch();
            if (waitingTransfer) {
                return {
                    label: 'Ready to transfer',
                    detail: `Brew check: clear wort, ${caseCountLabel(waitingTransfer.casesExpected)} expected. Transfer when the fermenter is ready.`,
                    toneClass: 'risk-low'
                };
            }
            if (brewing) {
                return {
                    label: 'Brewing',
                    detail: `${brewing.recipeName} - ${batchRemainingLabel(brewing)}`,
                    toneClass: 'risk-low'
                };
            }
            return {
                label: 'Idle',
                detail: `${conditionDetail} - ready to brew`,
                toneClass: `condition-${equipmentConditionTier(equipment.condition)}`
            };
        }
        if (equipmentId === 'fermenter') {
            const waitingTransfer = state.batches.find((batch) => batch.step === 'awaiting-transfer');
            if (waitingTransfer) {
                return {
                    label: 'Waiting at kettle',
                    detail: `${waitingTransfer.recipeName} is still in the stock pot`,
                    toneClass: 'risk-high'
                };
            }
            const fermenting = activeBatch ?? state.batches.find((batch) => batch.step === 'fermenting');
            if (fermenting) {
                const tier = contaminationRiskTier(fermenting.contaminationRisk);
                const detailParts = [fermenting.recipeName, batchRemainingLabel(fermenting)];
                if (campaignAllowsTemperature(state))
                    detailParts.splice(1, 0, `${state.fermenterTemperatureC} C`);
                if (campaignAllowsCleaning(state))
                    detailParts.push(`infection chance ${fermenting.contaminationRisk}%`);
                return {
                    label: 'Fermenting',
                    detail: detailParts.join(' - '),
                    toneClass: `risk-${tier}`
                };
            }
            return {
                label: 'Empty',
                detail: `${state.fermenterTemperatureC} C - ${equipmentMetaLine(equipment)}`,
                toneClass: `condition-${equipmentConditionTier(equipment.condition)}`
            };
        }
        if (equipmentId === 'bottler') {
            const readyBatch = state.batches.find((batch) => batch.step === 'awaiting-packaging');
            const packagingBatch = state.batches.find((batch) => batch.step === 'packaging' || batch.step === 'bottle-conditioning');
            const conditioningBatch = state.batches.find((batch) => batch.step === 'bottle-conditioning');
            const tier = equipmentConditionTier(equipment.condition);
            if (readyBatch) {
                return {
                    label: 'Package available',
                    detail: tier === 'dirty' || tier === 'critical' ? `${caseCountLabel(readyBatch.casesExpected)} - packaging loss risk` : `${caseCountLabel(readyBatch.casesExpected)} ready`,
                    toneClass: tier === 'dirty' || tier === 'critical' ? 'risk-high' : 'risk-low'
                };
            }
            if (packagingBatch) {
                return {
                    label: 'Bottling',
                    detail: `${packagingBatch.recipeName} - ${batchRemainingLabel(packagingBatch)} - ${caseCountLabel(packagingBatch.casesExpected)} headed to the pallet`,
                    toneClass: 'risk-low'
                };
            }
            if (conditioningBatch) {
                return {
                    label: 'Packaging / conditioning complete',
                    detail: `${conditioningBatch.recipeName} - ${batchRemainingLabel(conditioningBatch)}`,
                    toneClass: 'risk-low'
                };
            }
            if (state.inventory.cases > 0) {
                return {
                    label: 'Packaging / conditioning complete',
                    detail: `${caseCountLabel(state.inventory.cases)} on pallet`,
                    toneClass: 'risk-low'
                };
            }
            if (tier !== 'dirty' && tier !== 'critical') {
                return {
                    label: 'Idle',
                    detail: `${conditionDetail} - no batch at the bottling bench`,
                    toneClass: `condition-${tier}`
                };
            }
            if (tier === 'dirty' || tier === 'critical') {
                return {
                    label: 'Packaging loss risk',
                    detail: conditionDetail,
                    toneClass: 'risk-high'
                };
            }
        }
        if (activeBatch) {
            return {
                label: stepLabel(activeBatch.step),
                detail: `${Math.round(activeBatch.stepProgress)}% complete`,
                toneClass: 'risk-low'
            };
        }
        return {
            label: conditionLabel,
            detail: `${conditionDetail} - ${equipmentMetaLine(equipment)}`,
            toneClass: `condition-${equipmentConditionTier(equipment.condition)}`
        };
    };
    const batchForEquipmentInstance = (equipment) => {
        if (equipment.equipmentId !== 'fermenter')
            return batchForEquipment(equipment.equipmentId);
        return state.batches.find((batch) => batch.fermenterInstanceId === equipment.instanceId);
    };
    const activeForEquipmentInstance = (equipment) => {
        const batch = batchForEquipmentInstance(equipment);
        if (equipment.equipmentId === 'fermenter')
            return batch?.step === 'fermenting';
        return activeForEquipment(equipment.equipmentId);
    };
    const isNextTapTargetForInstance = (equipment) => {
        if (equipment.equipmentId === 'kettle')
            return isNextTapTarget('kettle') && (state.batches.length === 0 || state.batches.some((batch) => batch.step === 'brewing' || batch.step === 'awaiting-transfer'));
        if (equipment.equipmentId === 'bottler')
            return isNextTapTarget('bottler') && state.batches.some((batch) => batch.step === 'packaging' || batch.step === 'bottle-conditioning');
        if (equipment.equipmentId !== 'fermenter')
            return isNextTapTarget(equipment.equipmentId);
        if (!isNextTapTarget('fermenter'))
            return false;
        const packageBatch = state.batches.find((batch) => batch.step === 'awaiting-packaging');
        if (packageBatch)
            return packageBatch.fermenterInstanceId === equipment.instanceId;
        return false;
    };
    const equipmentInstanceStatus = (equipment) => {
        if (equipment.equipmentId !== 'fermenter')
            return equipmentSceneStatus(equipment.equipmentId);
        const conditionTier = equipmentConditionTier(equipment.condition);
        const batch = batchForEquipmentInstance(equipment);
        const detailBase = `${equipment.capacityLiters} L capacity - ${equipment.spaceUsed || '?'} space`;
        if (batch?.step === 'awaiting-transfer') {
            return {
                label: 'Waiting for kettle',
                detail: `${batch.recipeName} is still at the stock pot`,
                toneClass: 'risk-high'
            };
        }
        if (batch?.step === 'fermenting') {
            const tier = contaminationRiskTier(batch.contaminationRisk);
            const detailParts = [batch.recipeName, batchRemainingLabel(batch)];
            if (campaignAllowsTemperature(state))
                detailParts.splice(1, 0, `${state.fermenterTemperatureC} C`);
            if (campaignAllowsCleaning(state))
                detailParts.push(`infection chance ${batch.contaminationRisk}%`);
            return {
                label: 'Fermenting',
                detail: detailParts.join(' - '),
                toneClass: `risk-${tier}`
            };
        }
        if (batch?.step === 'awaiting-packaging') {
            return {
                label: 'Ready to package',
                detail: `${batch.recipeName} finished fermenting`,
                toneClass: 'risk-low'
            };
        }
        if (batch) {
            return {
                label: 'Reserved',
                detail: `${batch.recipeName} - ${stepLabel(batch.step)}`,
                toneClass: 'risk-low'
            };
        }
        return {
            label: 'Empty',
            detail: `${equipmentConditionLabel(equipment.condition)} - ${detailBase}`,
            toneClass: `condition-${conditionTier}`
        };
    };
    const renderRecipePanelContent = () => {
        const result = renderRecipeSelectionPanel({
            state,
            selectedRecipeCategoryId: context.selectedRecipeCategoryId,
            recipePage: context.recipePage,
            recipeStartBlocker
        });
        context.setRecipePage(result.recipePage);
        return result.html;
    };
    const stationPanelContext = () => ({
        state,
        recipePanelOpen: context.recipePanelOpen,
        selectedRecipeCategoryId: context.selectedRecipeCategoryId,
        expandedTarget: context.expandedTarget,
        expandedEquipmentInstanceId: context.expandedEquipmentInstanceId,
        renderRecipeSelectionPanel: renderRecipePanelContent,
        recipeStartBlocker,
        fermenterTemperatureHint,
        equipmentInstanceStatus,
        batchForEquipmentInstance,
        batchRemainingLabel,
        stepLabel
    });
    return {
        activeForEquipment,
        activeForEquipmentInstance,
        batchForEquipmentInstance,
        batchRemainingLabel,
        equipmentInstanceStatus,
        isNextTapTarget,
        isNextTapTargetForInstance,
        stationPanelContext,
        stepLabel,
        garageSpaceUsed,
        garageSpaceLimit
    };
};
//# sourceMappingURL=stationViewModel.js.map