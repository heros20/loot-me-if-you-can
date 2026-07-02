import type { BossAbilityType, DefenseType } from '../game/types';
import type { CountItem, DungeonSnapshot, UiSnapshot } from '../game/uiSnapshot';
import { emitUiAction, onUiState } from './uiEvents';

const BEST_WAVE_STORAGE_KEY = 'final-boss-dungeon.best-wave';

function loadBestWave(): number {
  try {
    return Number(window.localStorage.getItem(BEST_WAVE_STORAGE_KEY) ?? '0') || 0;
  } catch {
    return 0;
  }
}

function saveBestWave(value: number): void {
  try {
    window.localStorage.setItem(BEST_WAVE_STORAGE_KEY, String(value));
  } catch {
    // Stockage indisponible: le record reste purement moral.
  }
}

export class GameDomUi {
  private lastMarkup = '';
  private bestWave = loadBestWave();
  private readonly unsubscribe: () => void;

  constructor(private readonly root: HTMLElement) {
    this.unsubscribe = onUiState((snapshot) => this.render(snapshot));
  }

  destroy(): void {
    this.unsubscribe();
  }

  private render(snapshot: UiSnapshot): void {
    if (snapshot.phase !== 'menu' && snapshot.survivedWaves > this.bestWave) {
      this.bestWave = snapshot.survivedWaves;
      saveBestWave(this.bestWave);
    }

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

      ${this.renderNamedMinions(snapshot)}
      ${snapshot.report ? this.renderCompactReport(snapshot) : ''}
      ${snapshot.recentRumors.length > 0 ? this.renderRumors(snapshot.recentRumors) : ''}
      ${snapshot.recentJournal.length > 0 ? this.renderJournal(snapshot.recentJournal) : ''}
      ${snapshot.recentChronicles.length > 0 ? this.renderChronicles(snapshot.recentChronicles) : ''}
      ${this.bestWave > 0 ? `<div class="message">Record local: ${this.bestWave} vague${this.bestWave > 1 ? 's' : ''} repoussee${this.bestWave > 1 ? 's' : ''}.</div>` : ''}

      <div class="actions">
        <button class="button" data-action="launch-wave" ${snapshot.canLaunchWave ? '' : 'disabled'}>
          Lancer la vague
        </button>
      </div>
    `;
  }

  private renderNamedMinions(snapshot: DungeonSnapshot): string {
    if (snapshot.namedMinions.length === 0) {
      return '';
    }

    return `
      <div class="panel-section">
        <p class="section-title">Sbires notables</p>
        <ul class="minion-list">
          ${snapshot.namedMinions
            .map(
              (minion) => `
                <li>
                  <strong>${escapeHtml(minion.name)}</strong> (${escapeHtml(minion.typeName)}) -
                  ${minion.kills} kill${minion.kills > 1 ? 's' : ''}, ${minion.wavesSurvived} vague${minion.wavesSurvived > 1 ? 's' : ''}
                </li>
              `,
            )
            .join('')}
        </ul>
      </div>
    `;
  }

  private renderRumors(rumors: string[]): string {
    return this.renderTextList('Rumeurs de taverne', rumors.slice(-2));
  }

  private renderWavePanel(snapshot: DungeonSnapshot, bossPercent: number): string {
    return `
      <div class="panel-section">
        <p class="section-title">Vague en cours</p>
        <div class="wave-controls">
          <button class="control-button" data-action="toggle-pause">${snapshot.paused ? 'Reprendre' : 'Pause'}</button>
          ${[1, 2, 3]
            .map(
              (speed) => `
                <button class="control-button${snapshot.gameSpeed === speed ? ' is-selected' : ''}" data-speed="${speed}">
                  x${speed}
                </button>
              `,
            )
            .join('')}
        </div>
        ${this.renderTreasureStatus(snapshot)}
        <div class="roster">${this.renderCounts(snapshot.adventurersByRole)}</div>
        <div class="roster">${this.renderNameTags(snapshot.activeAdventurerNames)}</div>
        <div class="report__grid">
          <div class="report__metric"><span>Boss</span><strong>${bossPercent}%</strong></div>
          <div class="report__metric"><span>Infamie</span><strong>${snapshot.dungeonReputation}</strong></div>
        </div>
      </div>

      <div class="panel-section">
        <p class="section-title">Capacites du boss</p>
        <div class="ability-list">
          ${snapshot.bossAbilities
            .map((ability) => {
              const cooldownSeconds = Math.ceil(ability.cooldownRemainingMs / 1000);
              const status = ability.usesLeft === 0
                ? 'Epuise'
                : ability.ready
                  ? 'Pret'
                  : `${cooldownSeconds}s`;
              return `
                <button
                  class="ability-button${ability.ready ? ' is-ready' : ''}"
                  data-ability="${ability.type}"
                  ${ability.ready ? '' : 'disabled'}
                  title="${escapeHtml(ability.description)}"
                >
                  <strong>${escapeHtml(ability.name)}</strong>
                  <span>${escapeHtml(status)} - ${ability.usesLeft} restant${ability.usesLeft > 1 ? 's' : ''}</span>
                </button>
              `;
            })
            .join('')}
        </div>
      </div>

      ${snapshot.inspectedAdventurer ? this.renderInspection(snapshot) : '<div class="message">Clique sur un intrus pour l\'inspecter.</div>'}
    `;
  }

  private renderTreasureStatus(snapshot: DungeonSnapshot): string {
    if (snapshot.treasureStatus === 'carried') {
      return `<div class="message message--alert">Tresor porte par ${escapeHtml(snapshot.treasureCarrierName ?? 'un intrus')}. Ne le laisse pas sortir.</div>`;
    }

    if (snapshot.treasureStatus === 'dropped') {
      return '<div class="message message--alert">Le tresor traine par terre. Quelqu\'un va forcement le ramasser.</div>';
    }

    if (snapshot.treasureStatus === 'stolen') {
      return '<div class="message message--alert">Le tresor est VOLE. La honte sera comptabilisee au rapport.</div>';
    }

    return '';
  }

  private renderInspection(snapshot: DungeonSnapshot): string {
    const target = snapshot.inspectedAdventurer;

    if (!target) {
      return '';
    }

    const traits = target.traits.join(', ') || 'aucun';
    const injuries = target.injuries.length > 0 ? target.injuries.join(', ') : 'aucune';

    return `
      <div class="panel-section inspection">
        <p class="section-title">Dossier: ${escapeHtml(target.name)}</p>
        <ul class="inspection__facts">
          <li>${escapeHtml(target.className)} niveau ${target.level}, ${target.age} ans</li>
          <li>PV: ${target.hp} / ${target.maxHp}</li>
          <li>Personnalite: ${escapeHtml(target.personality)} (traits: ${escapeHtml(traits)})</li>
          <li>Expeditions: ${target.expeditionCount} (survies: ${target.survivedExpeditions})</li>
          <li>Monstres tues: ${target.monstersKilled}, pieges declenches: ${target.trapsTriggered}</li>
          <li>Blessures: ${escapeHtml(injuries)}</li>
          ${target.isHeir && target.heirNote ? `<li class="inspection__heir">${escapeHtml(target.heirNote)}</li>` : ''}
          ${target.carryingTreasure ? '<li class="inspection__heir">Porte le tresor du donjon.</li>' : ''}
          ${target.lastFeat ? `<li>Dernier fait: ${escapeHtml(target.lastFeat)}</li>` : ''}
        </ul>
        <button class="control-button" data-action="close-inspection">Fermer le dossier</button>
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
        <div class="report-budget">
          <p><span>Recompense de la vague</span><strong>+${report.goldAwarded} or</strong></p>
          <p><span>Or recupere (demontage des pieges)</span><strong>+${report.trapRefundGold} or</strong></p>
          ${report.treasurePenaltyGold > 0 ? `<p><span>Tresor vole (remplacement)</span><strong>-${report.treasurePenaltyGold} or</strong></p>` : ''}
          <p class="report-budget__total"><span>Budget pour la prochaine preparation</span><strong>${report.preparationBudget} or</strong></p>
        </div>
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
        <div class="report-budget">
          <p><span>Vagues repoussees cette fois</span><strong>${snapshot.survivedWaves}</strong></p>
          <p class="report-budget__total"><span>Record local</span><strong>${this.bestWave}</strong></p>
        </div>
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

        if (action === 'toggle-pause') {
          emitUiAction({ type: 'toggle-pause' });
        }

        if (action === 'close-inspection') {
          emitUiAction({ type: 'close-inspection' });
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

    this.root.querySelectorAll<HTMLButtonElement>('[data-ability]').forEach((button) => {
      button.addEventListener('click', () => {
        const abilityType = button.dataset.ability as BossAbilityType | undefined;

        if (abilityType) {
          emitUiAction({ type: 'use-ability', abilityType });
        }
      });
    });

    this.root.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach((button) => {
      button.addEventListener('click', () => {
        const speed = Number(button.dataset.speed);

        if (speed > 0) {
          emitUiAction({ type: 'set-speed', speed });
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
