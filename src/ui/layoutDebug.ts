import {
  garageEquipmentLayoutByItem,
  garageEquipmentLayoutBySlot,
  garageEquipmentLayoutByTier,
  garageSellPointLayout,
  type GarageEquipmentLayoutTier,
  type GarageEquipmentPlacement,
  type GarageEquipmentSlotId,
  type GarageSellPointId
} from '../data/garageLayout.js';
import type { GarageLayoutDraft, GarageSceneEquipmentInstance, GarageSellPointLayoutDraft } from './types.js';

export type LayoutDebugModel = {
  enabled: boolean;
  equipmentDraft: GarageLayoutDraft;
  sellPointDraft: GarageSellPointLayoutDraft;
};

export const createLayoutDebugModel = (activeGarageLayoutTier: GarageEquipmentLayoutTier, enabled: boolean): LayoutDebugModel => ({
  enabled,
  equipmentDraft: Object.fromEntries(
    Object.entries(garageEquipmentLayoutByTier[activeGarageLayoutTier] ?? garageEquipmentLayoutBySlot).map(([slotId, placement]) => [
      slotId,
      structuredClone(placement)
    ])
  ) as GarageLayoutDraft,
  sellPointDraft: Object.fromEntries(
    Object.entries(garageSellPointLayout).map(([sellPointId, visual]) => [sellPointId, structuredClone(visual.placement)])
  ) as GarageSellPointLayoutDraft
});

export const garageLayoutJson = (model: LayoutDebugModel): string =>
  JSON.stringify({ ...model.equipmentDraft, ...model.sellPointDraft }, null, 2);

const applySpritePlacement = (root: HTMLElement, model: LayoutDebugModel, slotId: GarageEquipmentSlotId) => {
  const placement = model.equipmentDraft[slotId];
  root.querySelectorAll<HTMLElement>(`[data-layout-slot-id="${slotId}"]`).forEach((object) => {
    if (object.classList.contains('equipment-object')) {
      object.style.left = `${placement.x}%`;
      object.style.top = `${placement.y}%`;
      object.style.width = `${placement.width}%`;
      return;
    }
    object.style.setProperty('--x', `${placement.x}%`);
    object.style.setProperty('--y', `${placement.y}%`);
  });
};

const applySellPointPlacement = (root: HTMLElement, model: LayoutDebugModel, sellPointId: GarageSellPointId) => {
  const placement = model.sellPointDraft[sellPointId];
  const object = root.querySelector<HTMLElement>(`[data-sell-point-id="${sellPointId}"]`);
  if (!object) return;
  object.style.left = `${placement.x}%`;
  object.style.top = `${placement.y}%`;
  object.style.width = `${placement.width}%`;
};

const updateLayoutDebugJson = (root: HTMLElement, model: LayoutDebugModel) => {
  const output = root.querySelector<HTMLTextAreaElement>('[data-layout-json]');
  if (output) output.value = garageLayoutJson(model);
};

const clampPlacementValue = (value: number): number => Math.min(100, Math.max(0, value));

export const handleLayoutDebugInput = (root: HTMLElement, model: LayoutDebugModel, event: Event): boolean => {
  if (!model.enabled) return false;
  const sellPointInput = (event.target as HTMLElement).closest<HTMLInputElement>('[data-sell-point-layout-id][data-sell-point-layout-field]');
  if (sellPointInput) {
    const sellPointId = sellPointInput.dataset.sellPointLayoutId as GarageSellPointId;
    const field = sellPointInput.dataset.sellPointLayoutField as keyof GarageEquipmentPlacement;
    const nextValue = sellPointInput.valueAsNumber;
    if (!Number.isFinite(nextValue)) return true;
    const placementValue = clampPlacementValue(nextValue);
    const displayValue = String(placementValue);
    model.sellPointDraft[sellPointId][field] = placementValue;
    root.querySelectorAll<HTMLInputElement>(`[data-sell-point-layout-id="${sellPointId}"][data-sell-point-layout-field="${field}"]`).forEach((control) => {
      if (control.value !== displayValue) control.value = displayValue;
    });
    applySellPointPlacement(root, model, sellPointId);
    updateLayoutDebugJson(root, model);
    return true;
  }

  const input = (event.target as HTMLElement).closest<HTMLInputElement>('[data-layout-slot-id][data-layout-field]');
  if (!input) return false;
  const slotId = input.dataset.layoutSlotId as GarageEquipmentSlotId;
  const field = input.dataset.layoutField as keyof GarageEquipmentPlacement;
  const nextValue = input.valueAsNumber;
  if (!Number.isFinite(nextValue)) return true;
  const placementValue = clampPlacementValue(nextValue);
  const displayValue = String(placementValue);
  model.equipmentDraft[slotId][field] = placementValue;
  root.querySelectorAll<HTMLInputElement>(`[data-layout-slot-id="${slotId}"][data-layout-field="${field}"]`).forEach((control) => {
    if (control.value !== displayValue) control.value = displayValue;
  });
  applySpritePlacement(root, model, slotId);
  updateLayoutDebugJson(root, model);
  return true;
};

export const renderLayoutDebugPanel = (model: LayoutDebugModel, equipment: GarageSceneEquipmentInstance[]): string =>
  model.enabled
    ? `
      <aside class="layout-debug-panel" aria-label="Equipment sprite layout debugger">
        <div class="layout-debug-heading">
          <strong>Layout debug</strong>
          <span>Percent values inside .garage-scene</span>
        </div>
        <div class="layout-debug-controls">
          ${equipment
            .map((item) => {
              const placement = model.equipmentDraft[item.slotId];
              const tapPadding = garageEquipmentLayoutByItem[item.itemId].tapPadding;
              return `
                <fieldset class="layout-debug-fieldset">
                  <legend>${item.label} / ${item.itemId}</legend>
                  ${(['x', 'y', 'width'] as const)
                    .map(
                      (field) => `
                        <label class="layout-debug-field-row">
                          <span>${field}</span>
                          <input
                            class="layout-debug-number"
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value="${placement[field]}"
                            data-layout-slot-id="${item.slotId}"
                            data-layout-field="${field}"
                            aria-label="${item.label} ${field} value"
                          />
                          <input
                            class="layout-debug-slider"
                            type="range"
                            min="0"
                            max="100"
                            step="0.1"
                            value="${placement[field]}"
                            data-layout-slot-id="${item.slotId}"
                            data-layout-field="${field}"
                            aria-label="${item.label} ${field} slider"
                          />
                        </label>
                      `
                    )
                    .join('')}
                  ${tapPadding ? `<small>Tap zone preview: +${tapPadding.x}% x, +${tapPadding.y}% y</small>` : ''}
                </fieldset>
              `;
            })
            .join('')}
          ${Object.entries(model.sellPointDraft)
            .map(([sellPointId, placement]) => {
              const sellPointLabel = sellPointId === 'finished-beer-pallet' ? 'Finished beer pallet' : sellPointId;
              return `
                <fieldset class="layout-debug-fieldset">
                  <legend>${sellPointLabel} / sell point</legend>
                  ${(['x', 'y', 'width'] as const)
                    .map(
                      (field) => `
                        <label class="layout-debug-field-row">
                          <span>${field}</span>
                          <input
                            class="layout-debug-number"
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value="${placement[field]}"
                            data-sell-point-layout-id="${sellPointId}"
                            data-sell-point-layout-field="${field}"
                            aria-label="${sellPointLabel} ${field} value"
                          />
                          <input
                            class="layout-debug-slider"
                            type="range"
                            min="0"
                            max="100"
                            step="0.1"
                            value="${placement[field]}"
                            data-sell-point-layout-id="${sellPointId}"
                            data-sell-point-layout-field="${field}"
                            aria-label="${sellPointLabel} ${field} slider"
                          />
                        </label>
                      `
                    )
                    .join('')}
                  <small>Permanent sell target placement</small>
                </fieldset>
              `;
            })
            .join('')}
        </div>
        <label class="layout-debug-json-label" for="layout-debug-json">Copyable JSON</label>
        <textarea id="layout-debug-json" data-layout-json readonly>${garageLayoutJson(model)}</textarea>
      </aside>
    `
    : '';
