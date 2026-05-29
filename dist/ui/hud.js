import { formatClock, formatCurrency, formatGameDate } from '../game/selectors.js';
import { renderNotificationControl } from './storyPanels.js';
export const renderTopHud = (state, notificationsOpen) => `
  <header class="top-hud" aria-label="Brewery status">
    <div class="hud-cluster brand-lockup">
      <span class="brand-mark" aria-hidden="true">HH</span>
      <div><strong>HOP HAVEN</strong><span>Garage floor</span></div>
    </div>
    <div class="hud-cluster hud-stat time-stat"><span class="eyebrow">${formatGameDate(state.day)}</span><strong>${formatClock(state.minute)}</strong></div>
    <div class="hud-cluster hud-resources">
      <div><span class="eyebrow">Cash</span><strong>${formatCurrency(state.cash)}</strong></div>
      <div class="rep-stat"><span class="eyebrow">Energy</span><strong>${state.energy}</strong><span class="mini-meter"><i style="width: ${state.energy}%"></i></span></div>
      <div class="rep-stat"><span class="eyebrow">Rep</span><strong>${state.reputation}</strong><span class="mini-meter"><i style="width: ${Math.min(100, state.reputation * 8)}%"></i></span></div>
    </div>
    ${renderNotificationControl(state, notificationsOpen)}
  </header>
`;
//# sourceMappingURL=hud.js.map