import { campaignNextStep, campaignView, isMissionSeen } from '../game/campaign.js';
import type { GameState } from '../game/schema.js';
import {
  formatClock,
  formatCurrency,
  objectiveProgress,
  orderCost,
  recipeMissingIngredients,
  recipeMissingOrderSummary,
  recipeRequirementSummary,
  recipeSupplyBreakdown,
  visibleRecipes
} from '../game/selectors.js';
import { renderPhoneEconomyCard } from './tutorialGuidance.js';

export const renderFirstLoopObjective = (state: GameState, guidanceDismissed: boolean): string =>
  guidanceDismissed
    ? ''
    : `
  <div class="first-loop-objective scene-pill" aria-label="Current garage-floor objective">
    <span>Next step</span>
    <strong>${campaignNextStep(state)}</strong>
    <button class="guidance-close" data-action="dismiss-guidance" type="button" aria-label="Dismiss guidance"></button>
  </div>
`;

export const renderStoryMissionCard = (state: GameState): string => {
  const mission = campaignView(state);
  const speaker = mission.characterRole ? `${mission.character}, ${mission.characterRole.toLowerCase()}` : mission.character;
  return `
    <aside class="glass-panel story-mission-card" data-tutorial-mission-id="${mission.id}" aria-label="Story mission">
      <header class="story-mission-header">
        <span class="eyebrow gold">${mission.act}</span>
        <strong>${mission.title}</strong>
      </header>
      <p><b>${speaker}:</b> ${mission.message}</p>
      <div class="story-mission-progress">
        <span>${mission.progressLabel}</span>
        <progress value="${mission.progress}" max="100"></progress>
      </div>
      <button class="story-mission-action" data-action="toggle-missions" type="button">Open notebook</button>
    </aside>
  `;
};

const garageBlondeRecipe = () => visibleRecipes().find((recipe) => recipe.id === 'garage-blonde') ?? visibleRecipes()[0];

const renderPhoneSupplyCard = (state: GameState): string => {
  if (state.campaign.missionId !== 'empty-shelf') return '';
  const recipe = garageBlondeRecipe();
  const missing = recipeSupplyBreakdown(state, recipe).filter((item) => item.missingAmount > 0);
  return `
    <div class="phone-recipe-card">
      <strong>Garage Blonde supply bill</strong>
      <span>${recipeRequirementSummary(recipe)}</span>
      <span>${recipeMissingOrderSummary(state, recipe)}</span>
      ${
        missing.length > 0
          ? `<em>${missing.map((item) => item.orderLabel).join(' + ')} - about ${formatCurrency(orderCost(recipeMissingIngredients(state, recipe)))}</em>`
          : '<em>Nothing to order right now.</em>'
      }
    </div>
  `;
};

export const renderStoryIntroCard = (state: GameState): string => {
  const mission = campaignView(state);
  if (isMissionSeen(state)) return '';
  const role = mission.characterRole ? `<span>${mission.characterRole}</span>` : '';
  return `
    <div class="story-intro-layer" data-tutorial-card="intro" data-tutorial-mission-id="${mission.id}" role="dialog" aria-modal="true" aria-label="${mission.title}">
      <button class="story-intro-scrim" data-action="dismiss-story-card" type="button" aria-label="Continue"></button>
      <article class="glass-panel story-phone">
        <header class="phone-header">
          <span class="phone-signal" aria-hidden="true"></span>
          <div>
            <strong>${mission.character}</strong>
            ${role}
          </div>
          <small>${mission.act}</small>
        </header>
        <div class="phone-thread">
          <p class="phone-thread-title">${mission.title}</p>
          ${mission.phoneThread.map((message) => `<p class="phone-bubble incoming">${message}</p>`).join('')}
          ${renderPhoneEconomyCard(state)}
          ${renderPhoneSupplyCard(state)}
          <div class="phone-task-card">
            <strong>Task</strong>
            <span>${mission.goal}</span>
            <em>${mission.reward}</em>
          </div>
        </div>
        <div class="phone-reply-bar">
          <button class="phone-reply-button" data-action="dismiss-story-card" type="button" aria-label="Reply: ${mission.replyText}">
            <span>Reply</span>
            <strong>${mission.replyText}</strong>
          </button>
        </div>
      </article>
    </div>
  `;
};

export const renderMissionsControl = (state: GameState, missionsOpen: boolean): string => {
  const mission = campaignView(state);
  const objective = objectiveProgress(state);
  return `
    <div class="missions-control">
      <button class="scene-pill missions-button ${missionsOpen ? 'open' : ''}" data-action="toggle-missions" type="button" aria-expanded="${missionsOpen}">
        <span>Story</span>
        <strong>${mission.progress}%</strong>
      </button>
      ${
        missionsOpen
          ? `
            <aside class="glass-panel popover mission-popover" aria-label="Missions">
              <span class="eyebrow gold">${mission.act}</span>
              <strong>${mission.title}</strong>
              <p>${mission.character}${mission.characterRole ? `, ${mission.characterRole.toLowerCase()}` : ''}: ${mission.message}</p>
              <div class="story-goal compact"><strong>Goal</strong><span>${mission.goal}</span></div>
              <div class="objective-demand">
                <span>${mission.progressLabel}</span>
                <span>${Math.min(state.demand.casesSold, state.demand.casesRequested)}/${state.demand.casesRequested}</span>
              </div>
              <progress value="${mission.progress}" max="100"></progress>
              <small>${objective.label}</small>
            </aside>
          `
          : ''
      }
    </div>
  `;
};

export const renderNotificationControl = (state: GameState, notificationsOpen: boolean): string => {
  const eventCount = Math.min(9, state.events.length);
  return `
    <div class="notification-control">
      <button class="scene-pill bell-button ${notificationsOpen ? 'open' : ''}" data-action="toggle-notifications" type="button" aria-label="Notifications" aria-expanded="${notificationsOpen}">
        <span class="bell-icon" aria-hidden="true"></span>
        <strong class="notification-badge" aria-label="${eventCount} notifications">${eventCount}</strong>
      </button>
      ${
        notificationsOpen
          ? `
            <aside class="glass-panel popover notification-popover" aria-label="Notifications">
              <span class="eyebrow gold">Notifications</span>
              <ol>
                ${state.events.slice(0, 5).map((event) => `<li><time>${formatClock(event.minute)}</time><span>${event.message}</span></li>`).join('')}
              </ol>
              <button data-action="open-overlay" data-overlay="log" type="button">Open floor notes</button>
            </aside>
          `
          : ''
      }
    </div>
  `;
};
