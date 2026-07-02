import type { BossAbilityType, ConstructionTool, DefenseType } from '../game/types';
import type { ConstructionUiItem, CountItem, DefenseUiItem, DungeonSnapshot, UiSnapshot } from '../game/uiSnapshot';
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
          ${this.renderStatus('Expedition', `${snapshot.wave}`)}
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
          ${snapshot.phase === 'report' && snapshot.report ? '<div class="message">Le debriefing complet est ouvert.</div>' : ''}
          ${snapshot.phase === 'defeat' && snapshot.report ? '<div class="message message--alert">Le boss est tombe. Rapport final ouvert.</div>' : ''}
        </aside>

        ${snapshot.phase === 'report' && snapshot.report ? this.renderReport(snapshot) : ''}
        ${snapshot.phase === 'defeat' && snapshot.report ? this.renderDefeat(snapshot) : ''}
      </section>
    `;
  }

  private renderBuildControls(snapshot: DungeonSnapshot): string {
    const constructionTools = snapshot.constructionTools.filter((item) => item.category === 'construction');
    const roomTools = snapshot.constructionTools.filter((item) => item.category === 'rooms');
    const traps = snapshot.availableDefenses.filter((item) => item.kind === 'trap');
    const minions = snapshot.availableDefenses.filter((item) => item.kind === 'minion');

    return `
      <div class="panel-section">
        <p class="section-title">Construction</p>
        <div class="tool-list">${constructionTools.map((item) => this.renderToolButton(item, snapshot)).join('')}</div>
        <div class="roster">${this.renderCounts(snapshot.territoryByType)}</div>
        <div class="message">Creuser coute ${snapshot.digCost} or. La roche bloque les expeditions; le sol et les salles les laissent passer.</div>
      </div>

      <div class="panel-section">
        <p class="section-title">Salles</p>
        <div class="tool-list">${roomTools.map((item) => this.renderToolButton(item, snapshot)).join('')}</div>
      </div>

      <div class="panel-section">
        <p class="section-title">Pieges</p>
        <div class="defense-list">${traps.map((item) => this.renderDefenseButton(item, snapshot)).join('')}</div>
      </div>

      <div class="panel-section">
        <p class="section-title">Monstres</p>
        <div class="defense-list">${minions.map((item) => this.renderDefenseButton(item, snapshot)).join('')}</div>
        ${this.renderNamedMinions(snapshot)}
      </div>

      <div class="panel-section">
        <p class="section-title">Boss</p>
        <div class="report__grid">
          <div class="report__metric"><span>Vie</span><strong>${snapshot.bossHp}/${snapshot.bossMaxHp}</strong></div>
          <div class="report__metric"><span>Pouvoirs</span><strong>${snapshot.bossAbilities.length}</strong></div>
          <div class="report__metric"><span>Salle</span><strong>Trone</strong></div>
        </div>
      </div>

      <div class="panel-section">
        <p class="section-title">Expedition</p>
        <div class="report__grid">
          <div class="report__metric"><span>Type</span><strong>${escapeHtml(snapshot.expeditionLabel)}</strong></div>
          <div class="report__metric"><span>Objectif</span><strong>${escapeHtml(snapshot.expeditionPrimaryGoal)}</strong></div>
          <div class="report__metric"><span>Taille</span><strong>${snapshot.nextWaveSize}</strong></div>
          <div class="report__metric"><span>Infamie</span><strong>${snapshot.dungeonReputation}</strong></div>
        </div>
        <div class="roster">${this.renderCounts(snapshot.adventurersByRole)}</div>
        <div class="message${snapshot.dungeonValidation.valid ? ' message--ok' : ' message--alert'}">
          ${snapshot.dungeonValidation.valid
            ? 'Donjon valide: entree, tresor et boss restent relies.'
            : escapeHtml(snapshot.dungeonValidation.reason ?? 'Donjon invalide.')}
        </div>
      </div>

      ${snapshot.report ? this.renderCompactReport(snapshot) : ''}
      ${snapshot.recentRumors.length > 0 ? this.renderRumors(snapshot.recentRumors) : ''}
      ${snapshot.recentJournal.length > 0 ? this.renderJournal(snapshot.recentJournal) : ''}
      ${snapshot.recentChronicles.length > 0 ? this.renderChronicles(snapshot.recentChronicles) : ''}
      ${this.bestWave > 0 ? `<div class="message">Record local: ${this.bestWave} vague${this.bestWave > 1 ? 's' : ''} repoussee${this.bestWave > 1 ? 's' : ''}.</div>` : ''}

      <div class="actions">
        <button class="button" data-action="launch-wave" ${snapshot.canLaunchWave ? '' : 'disabled'}>
          Lancer l expedition
        </button>
      </div>
    `;
  }

  private renderToolButton(item: ConstructionUiItem, snapshot: DungeonSnapshot): string {
    const selected = item.type === snapshot.selectedConstructionTool ? ' is-selected' : '';
    const cost = item.cost === null ? '' : `<em>${item.cost} or</em>`;

    return `
      <button
        class="tool-button${selected}"
        data-construction="${item.type}"
        ${item.disabled ? 'disabled' : ''}
      >
        <strong>${escapeHtml(item.name)}</strong>
        <small>${escapeHtml(item.description)}</small>
        ${cost}
      </button>
    `;
  }

  private renderDefenseButton(item: DefenseUiItem, snapshot: DungeonSnapshot): string {
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
  }

  private renderNamedMinions(snapshot: DungeonSnapshot): string {
    if (snapshot.namedMinions.length === 0) {
      return '';
    }

    return `
      <div class="named-minions">
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
        <div class="report__grid">
          <div class="report__metric"><span>Plan</span><strong>${escapeHtml(snapshot.expeditionLabel)}</strong></div>
          <div class="report__metric"><span>Objectif</span><strong>${escapeHtml(snapshot.expeditionPrimaryGoal)}</strong></div>
        </div>
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
      <div class="debrief-overlay">
        <section class="debrief">
          <header class="debrief__header">
            <div>
              <p class="section-title">Debriefing de vague</p>
              <h2>Vague ${report.wave}: ${report.cleared ? 'le donjon tient' : 'le boss tombe'}</h2>
              <p>${escapeHtml(report.verdict)}</p>
            </div>
            <div class="debrief__metrics">
              <span>${report.adventurersKilled} morts</span>
              <span>${report.adventurersEscaped} retours</span>
              <span>${report.durationSeconds}s</span>
            </div>
          </header>

          <div class="debrief__grid">
            ${this.renderDebriefSection('Resume', report.storyLines)}
            ${this.renderParticipantSection(snapshot)}
            ${this.renderDebriefSection('Ce qu ils ont appris', report.learnedLines)}
            ${this.renderDebriefSection('Ce qu ils ont partage', report.sharedLines)}
            ${this.renderDebriefSection('Gains et pertes', report.gainsLosses)}
            ${this.renderDebriefSection('Ce que la guilde change', report.guildChanges)}
            ${this.renderDebriefSection('Economie du donjon', report.economyLines)}
          </div>

          <div class="debrief__actions">
            <button class="button" data-action="continue-build">Preparer la suite</button>
          </div>
        </section>
      </div>
    `;
  }

  private renderDefeat(snapshot: DungeonSnapshot): string {
    const report = snapshot.report;

    if (!report) {
      return '';
    }

    return `
      <div class="debrief-overlay">
        <section class="debrief debrief--defeat">
          <header class="debrief__header">
            <div>
              <p class="section-title">Rapport final</p>
              <h2>Le boss est tombe</h2>
              <p>${escapeHtml(report.verdict)}</p>
            </div>
            <div class="debrief__metrics">
              <span>${snapshot.survivedWaves} vagues</span>
              <span>record ${this.bestWave}</span>
              <span>${report.durationSeconds}s</span>
            </div>
          </header>

          <div class="debrief__grid">
            ${this.renderDebriefSection('Resume', report.storyLines)}
            ${this.renderParticipantSection(snapshot)}
            ${this.renderDebriefSection('Ce qu ils ont appris', report.learnedLines)}
            ${this.renderDebriefSection('Ce que la guilde retient', report.sharedLines)}
            ${this.renderDebriefSection('Gains et pertes', report.gainsLosses)}
            ${this.renderDebriefSection('Economie du donjon', report.economyLines)}
          </div>

          <div class="debrief__actions">
            <button class="button" data-action="restart">Rebatir sur les cendres</button>
          </div>
        </section>
      </div>
    `;
  }

  private renderParticipantSection(snapshot: DungeonSnapshot): string {
    const participants = snapshot.report?.participants ?? [];

    return `
      <section class="debrief-section debrief-section--wide">
        <p class="section-title">Participants</p>
        <div class="participant-list">
          ${participants
            .map(
              (participant) => `
                <div class="participant">
                  <strong>${escapeHtml(participant.name)}</strong>
                  <span>${escapeHtml(roleLabel(participant.role))} niv. ${participant.level}</span>
                  <em>${escapeHtml(participant.status)}</em>
                  <small>${escapeHtml(participant.note)}</small>
                </div>
              `,
            )
            .join('')}
        </div>
      </section>
    `;
  }

  private renderDebriefSection(title: string, entries: string[]): string {
    return `
      <section class="debrief-section">
        <p class="section-title">${escapeHtml(title)}</p>
        <ul>${entries.map((entry) => `<li>${escapeHtml(entry)}</li>`).join('')}</ul>
      </section>
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

    this.root.querySelectorAll<HTMLButtonElement>('[data-construction]').forEach((button) => {
      button.addEventListener('click', () => {
        const constructionType = button.dataset.construction as ConstructionTool | undefined;

        if (constructionType) {
          emitUiAction({ type: 'select-construction', constructionType });
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

function roleLabel(role: string): string {
  switch (role) {
    case 'warrior':
      return 'Guerrier';
    case 'thief':
      return 'Voleur';
    case 'mage':
      return 'Mage';
    case 'healer':
      return 'Soigneur';
    default:
      return role;
  }
}
