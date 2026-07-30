import { campaignPrimaryTarget } from '../game/campaign.js';
import type { GameState } from '../game/schema.js';
import { currentWorkflowStage } from '../game/selectors.js';
import type { SceneTarget } from './types.js';

const tutorialTargetLabel = (target: SceneTarget): string => {
  if (target === 'kettle') return 'Stock pot';
  if (target === 'fermenter') return 'Fermenter';
  if (target === 'bottler') return 'Bottling';
  if (target === 'mill') return 'Mill';
  return 'Pallet';
};

export const renderNextTapBadge = (nextTap: boolean, target: SceneTarget): string =>
  nextTap ? `<span class="next-tap-badge"><b>Next</b>${tutorialTargetLabel(target)}</span>` : '';

const tutorialLesson = (state: GameState): { step: string; title: string; detail: string; payoff: string } => {
  const workflow = currentWorkflowStage(state);
  if (campaignPrimaryTarget(state) === 'shop') {
    return {
      step: 'Supplies',
      title: 'Order what the next batch needs',
      detail: 'Cash buys malt, hops, yeast, bottles, and future equipment.',
      payoff: 'Supplies arrive after you end the day.'
    };
  }
  if (campaignPrimaryTarget(state) === 'ops') {
    return {
      step: 'Time',
      title: 'End the day to receive deliveries',
      detail: 'Ending the day restores energy and moves incoming orders forward.',
      payoff: 'Energy returns to 100 each morning.'
    };
  }
  if (workflow.stage === 'Mash') {
    return {
      step: 'Mash',
      title: 'Start with the stock pot',
      detail: 'Brew day turns water and ingredients into wort for the fermenter.',
      payoff: 'Energy is spent on work and comes back when you end the day.'
    };
  }
  if (workflow.stage === 'Ferment') {
    return {
      step: 'Ferment',
      title: 'Move wort into the fermenter',
      detail: 'Fermentation takes time. Skipping ahead advances the batch without waiting.',
      payoff: 'Cleaner gear and temperature control matter more in later missions.'
    };
  }
  if (workflow.stage === 'Package') {
    return {
      step: 'Package',
      title: 'Bottle the finished beer',
      detail: 'Packaging moves beer from a batch into sellable cases on the pallet.',
      payoff: 'One case is 12 bottles, enough to start filling local orders.'
    };
  }
  return {
    step: 'Sell',
    title: 'Sell cases to complete the loop',
    detail: 'Sales bring in cash for supplies and reputation for better buyers.',
    payoff: 'Samira wants 4 cases before Rudy opens the supply loop.'
  };
};

export const renderTutorialLesson = (state: GameState, guidanceDismissed: boolean): string => {
  if (guidanceDismissed || !['barbecue-text', 'empty-shelf'].includes(state.campaign.missionId)) return '';
  const lesson = tutorialLesson(state);
  return `
    <aside class="tutorial-lesson scene-pill" aria-label="Tutorial lesson">
      <span>${lesson.step}</span>
      <strong>${lesson.title}</strong>
      <small>${lesson.detail}</small>
      <em>${lesson.payoff}</em>
    </aside>
  `;
};

export const renderPhoneEconomyCard = (state: GameState): string => {
  if (state.campaign.missionId !== 'barbecue-text') return '';
  return `
    <div class="phone-recipe-card">
      <strong>Why this order matters</strong>
      <span>Four cases is enough to prove the garage can handle a real promise.</span>
      <span>The cash covers the next ingredients, and a clean delivery gives Samira a reason to talk you up.</span>
      <em>Do this well and the next order will not feel like a favor.</em>
    </div>
  `;
};
