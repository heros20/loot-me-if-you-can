import type { DefenseType } from '../game/types';
import type { CountItem, DungeonSnapshot, UiSnapshot } from '../game/uiSnapshot';
import { emitUiAction, onUiState } from './uiEvents';

export class GameDomUi {
  private lastMarkup = '';
  private readonly unsubscribe: () => void;

  constructor(private readonly root: HTMLElement) {
    this.unsubscribe = onUiState((snapshot) => this.render(snapshot));
  }

  destroy(): void {
    this.unsubscribe();
  }

  private render(snapshot: UiSnapshot): void {
    const markup = snapshot.phase === 'menu' ? this.renderMenu() : this.renderDungeon(snapshot);

    if (markup === this.lastMarkup) {
      return;
    }

    this.lastMarkup = markup;
    this.root.innerHTML = markup;
    this.bindActions(snapshot);
  }

  private renderMenu(): string {
    return `
      <section class="menu">
        <p class="menu__eyebrow">V0 jouable</p>
        <h1 class="menu__title">Final Boss Dungeon</h1>
        <p class="menu__copy">
          Tu es le boss final. Des aventuriers entrent, meurent, apprennent, puis reviennent avec encore moins de respect pour la propriete privee.
        </p>
        <button class="button" data-action="start-game">Installer la tyrannie</button>
      </section>
    `;
  }

  private renderDungeon(snapshot: DungeonSnapshot): string {
    const bossPercent = Math.max(0, Math.round((snapshot.bossHp / snapshot.bossMaxHp) * 100));
    const title = snapshot.phase === 'defeat' ? 'Chute du proprietaire' : 'Salle de controle';

    return `
      <section class="hud">
        <div class="status-strip">
          ${this.renderStatus('Or', `${snapshot.gold}`)}
          ${this.renderStatus('Vague', `${snapshot.wave}`)}
          ${this.renderStatus('Boss', `${Math.max(0, snapshot.bossHp)} / ${snapshot.bossMaxHp}`)}
          ${this.renderStatus('Intrus', `${snapshot.liveAdventurers || snapshot.nextWaveSize}`)}
          ${this.renderStatus('Infamie', `${snapshot.dungeonReputation}`)}
        </div>

        <aside class="side-panel">
          <div class="panel-section">
            <p class="section-title">${title}</p>
            <div class="message">${escapeHtml(snapshot.message)}</div>
          </div>

          ${snapshot.phase === 'build' ? this.renderBuildControls(snapshot) : ''}
          ${snapshot.phase === 'wave' ? this.renderWavePanel(snapshot, bossPercent) : ''}
          ${snapshot.phase === 'report' && snapshot.report ? this.renderReport(snapshot) : ''}
          ${snapshot.phase === 'defeat' && snapshot.report ? this.renderDefeat(snapshot) : ''}
        </aside>
      </section>
    `;
  }

  private renderBuildControls(snapshot: DungeonSnapshot): string {
    return `
      <div class="panel-section">
        <p class="section-title">Defenses disponibles</p>
        <div class="defense-list">
          ${snapshot.availableDefenses
            .map((item) => {
              const selected = item.type === snapshot.selectedDefense ? ' is-selected' : '';
              return `
                <button
                  class="defense-button${selected}"
                  data-defense="${item.type}"
                  ${item.disabled ? 'disabled' : ''}
                >
                  <span class="defense-button__swatch" style="--swatch:${item.color}"></span>
                  <span>
                    <strong>${escapeHtml(item.name)}</strong>
                    <small>${escapeHtml(item.description)}</small>
                  </span>
                  <em>${item.cost} or</em>
                </button>
              `;
            })
            .join('')}
        </div>
      </div>

      <div class="panel-section">
        <p class="section-title">Effectifs ennemis prevus</p>
        <div class="roster">${this.renderCounts(snapshot.adventurersByRole)}</div>
        <div class="message">Reputation: ${escapeHtml(snapshot.dungeonReputationTitle)} (${snapshot.dungeonReputation}).</div>
      </div>

      ${snapshot.report ? this.renderCompactReport(snapshot) : ''}
      ${snapshot.recentJournal.length > 0 ? this.renderJournal(snapshot.recentJournal) : ''}
      ${snapshot.recentChronicles.length > 0 ? this.renderChronicles(snapshot.recentChronicles) : ''}

      <div class="actions">
        <button class="button" data-action="launch-wave" ${snapshot.canLaunchWave ? '' : 'disabled'}>
          Lancer la vague
        </button>
      </div>
    `;
  }

  private renderWavePanel(snapshot: DungeonSnapshot, bossPercent: number): string {
    return `
      <div class="panel-section">
        <p class="section-title">Vague en cours</p>
        <div class="roster">${this.renderCounts(snapshot.adventurersByRole)}</div>
        <div class="roster">${this.renderNameTags(snapshot.activeAdventurerNames)}</div>
        <div class="report__grid">
          <div class="report__metric"><span>Boss</span><strong>${bossPercent}%</strong></div>
          <div class="report__metric"><span>Infamie</span><strong>${snapshot.dungeonReputation}</strong></div>
        </div>
      </div>
    `;
  }

  private renderReport(snapshot: DungeonSnapshot): string {
    const report = snapshot.report;

    if (!report) {
      return '';
    }

    return `
      <div class="report">
        <h3>Rapport de la vague ${report.wave}</h3>
        ${this.renderTextList('Ce dont on se souviendra', report.storyLines)}
        <div class="actions">
          <button class="button" data-action="continue-build">Preparer la suite</button>
        </div>
      </div>
    `;
  }

  private renderDefeat(snapshot: DungeonSnapshot): string {
    const report = snapshot.report;

    if (!report) {
      return '';
    }

    return `
      <div class="report">
        <h3>Le boss est tombe</h3>
        ${this.renderTextList('Ce dont on se souviendra', report.storyLines)}
        <div class="actions">
          <button class="button" data-action="restart">Rebatir sur les cendres</button>
        </div>
      </div>
    `;
  }

  private renderCompactReport(snapshot: DungeonSnapshot): string {
    const report = snapshot.report;

    if (!report) {
      return '';
    }

    return `
      <div class="report">
        <p class="section-title">Dernier carnage</p>
        <p>Vague ${report.wave}: ${report.adventurersKilled} heros punis, ${report.adventurersEscaped} temoins problematiques. ${escapeHtml(report.adaptationNotes[0] ?? 'Ils reviendront quand meme. Evidemment.')}</p>
      </div>
    `;
  }

  private renderJournal(entries: string[]): string {
    return this.renderTextList('Journal recent', entries.slice(-3));
  }

  private renderChronicles(entries: string[]): string {
    return this.renderTextList('Chroniques', entries.slice(-4));
  }

  private renderStatus(label: string, value: string): string {
    return `
      <div class="status-item">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </div>
    `;
  }

  private renderCounts(items: CountItem[]): string {
    return items
      .filter((item) => item.count > 0)
      .map((item) => `<span class="tag">${escapeHtml(item.label)} x${item.count}</span>`)
      .join('') || '<span class="tag">Aucun. Moment suspect.</span>';
  }

  private renderNameTags(names: string[]): string {
    return names
      .slice(0, 6)
      .map((name) => `<span class="tag">${escapeHtml(name)}</span>`)
      .join('') || '<span class="tag">Aucun nom a retenir.</span>';
  }

  private renderTextList(title: string, entries: string[]): string {
    if (entries.length === 0) {
      return '';
    }

    return `
      <p class="section-title">${escapeHtml(title)}</p>
      <ul>${entries.map((entry) => `<li>${escapeHtml(entry)}</li>`).join('')}</ul>
    `;
  }

  private bindActions(snapshot: UiSnapshot): void {
    this.root.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.dataset.action;

        if (action === 'start-game') {
          emitUiAction({ type: 'start-game' });
        }

        if (action === 'launch-wave') {
          emitUiAction({ type: 'launch-wave' });
        }

        if (action === 'continue-build') {
          emitUiAction({ type: 'continue-build' });
        }

        if (action === 'restart') {
          emitUiAction({ type: 'restart' });
        }
      });
    });

    if (snapshot.phase === 'menu') {
      return;
    }

    this.root.querySelectorAll<HTMLButtonElement>('[data-defense]').forEach((button) => {
      button.addEventListener('click', () => {
        const defenseType = button.dataset.defense as DefenseType | undefined;

        if (defenseType) {
          emitUiAction({ type: 'select-defense', defenseType });
        }
      });
    });
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
