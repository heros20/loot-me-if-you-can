import type {
  BossAbilityType,
  ConstructionTool,
  DefenseType,
  WaveReport,
} from '../game/types';
import type {
  ConstructionUiItem,
  CountItem,
  DefenseUiItem,
  DoorSummary,
  DungeonSnapshot,
  UiSnapshot,
} from '../game/uiSnapshot';
import type { TavernProgressState } from '../game/uiSnapshot';
import { escapeHtml, roleLabel } from './textFormatters';
import { emitUiAction, onTavernProgress, onUiState } from './uiEvents';

const BEST_WAVE_STORAGE_KEY = 'final-boss-dungeon.best-wave';

type MessageTone = 'info' | 'warning' | 'error' | 'success';

const DEFAULT_OPEN_SECTIONS: readonly string[] = [];

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

/**
 * Passe UI/UX uniquement: ce fichier ne lit ni ne modifie aucune regle de jeu.
 * Il compose l'ecran a partir du DungeonSnapshot deja expose par la simulation.
 */
export class GameDomUi {
  private lastMarkup = '';
  private bestWave = loadBestWave();
  private lastSnapshot: UiSnapshot | null = null;
  private openSections = new Set<string>(DEFAULT_OPEN_SECTIONS);
  private creditsOpen = false;
  private tavernReportRef: WaveReport | null = null;
  private tavernProgress: TavernProgressState = { revealedCount: 0, totalBeats: 0, fullyRevealed: false };
  private readonly unsubscribe: () => void;
  private readonly unsubscribeTavern: () => void;

  constructor(private readonly root: HTMLElement) {
    this.unsubscribe = onUiState((snapshot) => this.render(snapshot));
    this.unsubscribeTavern = onTavernProgress((progress) => {
      this.tavernProgress = progress;
      this.refresh();
    });
    window.addEventListener('keydown', this.handleKeydown);
  }

  destroy(): void {
    this.unsubscribe();
    this.unsubscribeTavern();
    window.removeEventListener('keydown', this.handleKeydown);
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    const snapshot = this.lastSnapshot;

    if (!snapshot || (snapshot.phase !== 'report' && snapshot.phase !== 'defeat')) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      emitUiAction({ type: 'tavern-skip' });
      return;
    }

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      emitUiAction({ type: 'tavern-advance' });
    }
  };

  private render(snapshot: UiSnapshot): void {
    this.lastSnapshot = snapshot;

    if (snapshot.phase !== 'menu' && snapshot.survivedWaves > this.bestWave) {
      this.bestWave = snapshot.survivedWaves;
      saveBestWave(this.bestWave);
    }

    const inTavern = snapshot.phase === 'report' || snapshot.phase === 'defeat';
    document.body.classList.toggle('tavern-active', inTavern);

    if (inTavern && snapshot.report && snapshot.report !== this.tavernReportRef) {
      this.tavernReportRef = snapshot.report;
      this.tavernProgress = {
        revealedCount: Math.min(1, snapshot.report.guildTavernScene.beats.length),
        totalBeats: snapshot.report.guildTavernScene.beats.length,
        fullyRevealed: snapshot.report.guildTavernScene.beats.length === 0,
      };
    }

    if (!inTavern) {
      this.tavernReportRef = null;
    }

    const markup = snapshot.phase === 'menu' ? this.renderMenu() : this.renderDungeon(snapshot);

    if (markup === this.lastMarkup) {
      return;
    }

    this.lastMarkup = markup;
    this.root.innerHTML = markup;
    this.bindActions(snapshot);
  }

  /** Redessine avec le dernier snapshot connu, pour les etats purement locaux (accordeons, credits). */
  private refresh(): void {
    if (this.lastSnapshot) {
      this.render(this.lastSnapshot);
    }
  }

  private toggleSection(id: string): void {
    if (this.openSections.has(id)) {
      this.openSections.delete(id);
    } else {
      this.openSections.add(id);
    }

    this.refresh();
  }

  private toggleCredits(): void {
    this.creditsOpen = !this.creditsOpen;
    this.refresh();
  }

  // ---------------------------------------------------------------------
  // Menu d'accueil
  // ---------------------------------------------------------------------

  private renderMenu(): string {
    return `
      <section class="menu">
        <div class="menu__panel">
          <p class="menu__eyebrow">Prototype jouable</p>
          <h1 class="menu__title">Loot Me If You Can</h1>
          <p class="menu__subtitle">Creuse ton donjon. Defends ton tresor. Survis au Royaume.</p>
          <p class="menu__copy">
            Tu es la derniere ligne de defense d'un tresor que tout le royaume convoite.
            Creuse des couloirs, pose des pieges, arme tes salles, puis regarde les aventuriers
            apprendre de leurs erreurs. Ou en mourir.
          </p>

          <div class="menu__actions">
            <button class="button button--primary" data-action="start-game">Nouvelle partie</button>
            <button class="button button--ghost" data-action="noop" disabled title="Aucune sauvegarde disponible pour le moment.">
              Continuer
            </button>
            <button class="button button--link" data-action="toggle-credits">
              ${this.creditsOpen ? 'Fermer les credits' : 'Credits & licences'}
            </button>
          </div>

          ${this.creditsOpen ? this.renderCredits() : ''}
        </div>

        <p class="menu__version">Prototype en developpement</p>
      </section>
    `;
  }

  private renderCredits(): string {
    return `
      <div class="menu__credits">
        <p class="section-title">Credits &amp; licences</p>
        <ul>
          <li>Conception et developpement: le studio, avec Codex.</li>
          <li>Decors, unites et objets: pack Kenney Tiny Dungeon (CC0) - kenney.nl.</li>
          <li>Solutions de repli visuelles generees en interne si un visuel externe manque.</li>
        </ul>
        <p class="menu__credits__note">Details complets dans CREDITS.md et ASSET_LICENSES.md.</p>
      </div>
    `;
  }

  // ---------------------------------------------------------------------
  // Ecran de jeu (HUD haut + sidebar "Salle de controle")
  // ---------------------------------------------------------------------

  private renderDungeon(snapshot: DungeonSnapshot): string {
    const inTavern = snapshot.phase === 'report' || snapshot.phase === 'defeat';

    return `
      <section class="hud${inTavern ? ' hud--tavern' : ''}">
        ${inTavern ? '' : `
        <div class="status-strip">
          ${this.renderStatus('Or', `${snapshot.gold}`)}
          ${this.renderStatus('Expedition', `${snapshot.wave}`)}
          ${this.renderStatus('Boss', `${Math.max(0, snapshot.bossHp)} / ${snapshot.bossMaxHp}`)}
          ${this.renderStatus('Intrus', `${snapshot.liveAdventurers || snapshot.nextWaveSize}`)}
          ${this.renderStatus('Infamie', `${snapshot.dungeonReputation}`)}
        </div>

        <aside class="side-panel">
          ${this.renderControlHeader(snapshot)}
          ${this.renderContextMessage(snapshot)}
          ${snapshot.phase === 'build' ? this.renderBuildControls(snapshot) : ''}
          ${snapshot.phase === 'wave' ? this.renderWavePanel(snapshot) : ''}
        </aside>
        `}

        ${snapshot.phase === 'report' && snapshot.report ? this.renderReport(snapshot) : ''}
        ${snapshot.phase === 'defeat' && snapshot.report ? this.renderDefeat(snapshot) : ''}
      </section>
    `;
  }

  private renderControlHeader(snapshot: DungeonSnapshot): string {
    const phase = describePhase(snapshot.phase);

    return `
      <header class="control-header">
        <div class="control-header__top">
          <p class="control-header__eyebrow">Salle de controle</p>
          <span class="phase-pill phase-pill--${phase.tone}">${phase.label}</span>
        </div>
        <p class="control-header__meta"><strong>${snapshot.gold} or</strong> &middot; Expedition ${snapshot.wave}</p>
      </header>
    `;
  }

  private renderContextMessage(snapshot: DungeonSnapshot): string {
    const { tone, text } = snapshot.phase === 'build'
      ? classifyBuildMessage(snapshot)
      : snapshot.phase === 'wave'
        ? classifyWaveMessage(snapshot)
        : { tone: 'info' as MessageTone, text: snapshot.message };

    return `
      <div class="context-message context-message--${tone}">
        <span class="context-message__icon" aria-hidden="true">${toneIcon(tone)}</span>
        <p>${escapeHtml(text)}</p>
      </div>
    `;
  }

  // ---------------------------------------------------------------------
  // Phase de preparation (build)
  // ---------------------------------------------------------------------

  private renderBuildControls(snapshot: DungeonSnapshot): string {
    const constructionTools = snapshot.constructionTools.filter((item) => item.category === 'construction');
    const roomTools = snapshot.constructionTools.filter((item) => item.category === 'rooms');
    const objectiveTools = snapshot.constructionTools.filter((item) => item.category === 'objectives');
    const traps = snapshot.availableDefenses.filter((item) => item.kind === 'trap');
    const minions = snapshot.availableDefenses.filter((item) => item.kind === 'minion');
    const defensesActive = snapshot.defensesByKind.reduce((total, item) => total + item.count, 0);
    const journalCount = snapshot.recentRumors.length + snapshot.kingdomMemoryRumors.length + snapshot.recentJournal.length + snapshot.recentChronicles.length
      + (snapshot.report ? 1 : 0);
    const roomsOpen = snapshot.selectedConstructionTool === 'guardRoom' || snapshot.selectedConstructionTool === 'crypt';
    const objectivesOpen = objectiveTools.some((item) => item.type === snapshot.selectedConstructionTool);

    return `
      <p class="side-panel__meta">
        Prochaine expedition : ${escapeHtml(snapshot.expeditionLabel)} vers ${escapeHtml(snapshot.expeditionPrimaryGoal)}
        &middot; ${snapshot.nextWaveSize} intrus
      </p>
      ${this.renderContinuityPreview(snapshot)}

      <div class="primary-actions">
        ${constructionTools.map((item) => this.renderToolCard(item, snapshot)).join('')}
      </div>

      ${this.renderSelectedToolDetail(snapshot)}

      <div class="accordion">
        ${this.renderAccordion(
          'objectives',
          'Objectifs',
          String(snapshot.treasures.length),
          `
            <div class="tool-grid">${objectiveTools.map((item) => this.renderToolCard(item, snapshot)).join('')}</div>
            <p class="accordion__subtitle">Ancres</p>
            <div class="pill-row">
              <span class="pill">Zone sure entree: ${snapshot.safeZoneRadius}</span>
              <span class="pill">${snapshot.treasures.length} tresor${snapshot.treasures.length > 1 ? 's' : ''}</span>
              <span class="pill">${snapshot.treasures.filter((treasure) => treasure.kind === 'gold').length} or</span>
            </div>
          `,
          objectivesOpen,
        )}

        ${this.renderAccordion(
          'rooms',
          'Salles & terrain',
          roomTools.length > 0 ? String(roomTools.length) : null,
          `
            <div class="tool-grid">${roomTools.map((item) => this.renderToolCard(item, snapshot)).join('')}</div>
            <p class="accordion__subtitle">Terrain</p>
            <div class="pill-row">${this.renderCounts(snapshot.territoryByType)}</div>
            ${this.renderDoorPills(snapshot.doorSummary)}
          `,
          roomsOpen,
        )}

        ${this.renderAccordion(
          'defenses',
          'Defenses',
          defensesActive > 0 ? String(defensesActive) : null,
          `
            <p class="accordion__subtitle">Pieges</p>
            <div class="card-grid">${traps.map((item) => this.renderDefenseCard(item, snapshot)).join('')}</div>
            <p class="accordion__subtitle">Monstres</p>
            <div class="card-grid">${minions.map((item) => this.renderDefenseCard(item, snapshot)).join('')}</div>
            ${this.renderSelectedDefenseDetail(snapshot)}
            ${this.renderNamedMinions(snapshot)}
          `,
        )}

        ${this.renderAccordion(
          'journal',
          'Journal',
          journalCount > 0 ? String(Math.min(9, journalCount)) : null,
          this.renderJournalFeed(snapshot),
        )}
      </div>

      <div class="actions actions--sticky">
        <button class="button button--primary" data-action="launch-wave" ${snapshot.canLaunchWave ? '' : 'disabled'}>
          Lancer l'expedition
        </button>
        ${!snapshot.canLaunchWave
          ? `<p class="actions__hint">${escapeHtml(snapshot.dungeonValidation.reason ?? 'Le donjon doit rester accessible.')}</p>`
          : ''}
      </div>
    `;
  }

  private renderAccordion(id: string, title: string, badge: string | null, bodyHtml: string, forceOpen = false): string {
    const isOpen = forceOpen || this.openSections.has(id);

    return `
      <div class="accordion__item${isOpen ? ' is-open' : ''}">
        <button class="accordion__summary" type="button" data-section="${id}" aria-expanded="${isOpen}">
          <span class="accordion__chevron" aria-hidden="true">&rsaquo;</span>
          <span class="accordion__title">${escapeHtml(title)}</span>
          ${badge ? `<span class="accordion__badge">${escapeHtml(badge)}</span>` : ''}
        </button>
        <div class="accordion__body">${bodyHtml}</div>
      </div>
    `;
  }

  private renderToolCard(item: ConstructionUiItem, snapshot: DungeonSnapshot): string {
    const selected = item.type === snapshot.selectedConstructionTool ? ' is-selected' : '';
    const cost = item.cost === null ? 'Gratuit' : `${item.cost} or`;

    return `
      <button class="tool-card${selected}" data-construction="${item.type}" ${item.disabled ? 'disabled' : ''}>
        <strong>${escapeHtml(item.name)}</strong>
        <span class="tool-card__cost">${cost}</span>
      </button>
    `;
  }

  private renderDefenseCard(item: DefenseUiItem, snapshot: DungeonSnapshot): string {
    const selected = item.type === snapshot.selectedDefense ? ' is-selected' : '';

    return `
      <button class="defense-card${selected}" data-defense="${item.type}" ${item.disabled ? 'disabled' : ''}>
        <span class="defense-card__swatch" style="--swatch:${item.color}"></span>
        <strong>${escapeHtml(item.name)}</strong>
        <span class="defense-card__cost">${item.cost} or</span>
      </button>
    `;
  }

  private renderSelectedToolDetail(snapshot: DungeonSnapshot): string {
    const tool = snapshot.constructionTools.find((item) => item.type === snapshot.selectedConstructionTool);

    if (!tool) {
      return '';
    }

    const cost = tool.cost === null ? 'Gratuit' : `${tool.cost} or`;

    return `
      <div class="detail-card">
        <p class="detail-card__title">Outil : ${escapeHtml(tool.name)}</p>
        <div class="detail-card__row"><span>Cout</span><strong>${cost}</strong></div>
        <p class="detail-card__effect">${escapeHtml(tool.description)}</p>
        <p class="detail-card__hint">${escapeHtml(placementHintFor(tool.type))}</p>
      </div>
    `;
  }

  private renderSelectedDefenseDetail(snapshot: DungeonSnapshot): string {
    const item = snapshot.availableDefenses.find((candidate) => candidate.type === snapshot.selectedDefense);

    if (!item) {
      return '';
    }

    return `
      <div class="detail-card">
        <p class="detail-card__title">Outil : ${escapeHtml(item.name)}</p>
        <div class="detail-card__row"><span>Cout</span><strong>${item.cost} or</strong></div>
        <p class="detail-card__effect">${escapeHtml(item.description)}</p>
        <p class="detail-card__hint">Placement : sol creuse, hors entree, tresor et trone.</p>
      </div>
    `;
  }

  private renderContinuityPreview(snapshot: DungeonSnapshot): string {
    const returning = snapshot.nextExpeditionReturningNames;

    if (returning.length === 0) {
      const imposed = snapshot.nextExpeditionImposedRoleNote
        ? ` &middot; ${escapeHtml(snapshot.nextExpeditionImposedRoleNote)}`
        : '';
      const unavailable = snapshot.nextExpeditionUnavailableSurvivors.length > 0
        ? ` &middot; Absents : ${escapeHtml(snapshot.nextExpeditionUnavailableSurvivors.map((survivor) => `${survivor.name} (${survivor.label})`).join(', '))}`
        : '';
      return `<p class="side-panel__meta side-panel__meta--continuity">Revenants : aucun &middot; Nouveaux volontaires : ${snapshot.nextExpeditionNewVolunteers}${unavailable}${imposed}</p>`;
    }

    const names = returning.slice(0, 3).join(', ');
    const suffix = returning.length > 3 ? ` +${returning.length - 3}` : '';
    const veteran = snapshot.nextExpeditionVeteranName ? ` &middot; Veteran : ${escapeHtml(snapshot.nextExpeditionVeteranName)}` : '';
    const heldBack = snapshot.nextExpeditionHeldBackNames.length > 0
      ? ` &middot; Retenus au rapport : ${escapeHtml(snapshot.nextExpeditionHeldBackNames.join(', '))}`
      : '';
    const unavailable = snapshot.nextExpeditionUnavailableSurvivors.length > 0
      ? ` &middot; Absents : ${escapeHtml(snapshot.nextExpeditionUnavailableSurvivors.map((survivor) => `${survivor.name} (${survivor.label})`).join(', '))}`
      : '';
    const imposed = snapshot.nextExpeditionImposedRoleNote
      ? ` &middot; ${escapeHtml(snapshot.nextExpeditionImposedRoleNote)}`
      : '';

    return `
      <p class="side-panel__meta side-panel__meta--continuity">
        Revenants : ${escapeHtml(names)}${suffix}
        &middot; Nouveaux volontaires : ${snapshot.nextExpeditionNewVolunteers}${veteran}${heldBack}${unavailable}${imposed}
      </p>
    `;
  }

  private renderDoorPills(summary: DoorSummary): string {
    if (summary.active === 0) {
      return '';
    }

    return `
      <div class="pill-row">
        <span class="pill pill--muted">Portes</span>
        <span class="pill">${summary.active} active${summary.active > 1 ? 's' : ''}</span>
        <span class="pill">${summary.locked} verrouillee${summary.locked > 1 ? 's' : ''}</span>
        ${summary.opened > 0 ? `<span class="pill">${summary.opened} ouverte${summary.opened > 1 ? 's' : ''}</span>` : ''}
      </div>
    `;
  }

  private renderNamedMinions(snapshot: DungeonSnapshot): string {
    if (snapshot.namedMinions.length === 0) {
      return '';
    }

    return `
      <div class="named-minions">
        <p class="accordion__subtitle">Sbires notables</p>
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

  private renderJournalFeed(snapshot: DungeonSnapshot): string {
    const entries: Array<{ tag: string; text: string }> = [];

    if (snapshot.report) {
      entries.push({
        tag: 'Rapport',
        text: `Vague ${snapshot.report.wave}: ${snapshot.report.adventurersKilled} morts, ${snapshot.report.adventurersEscaped} retours. ${
          snapshot.report.adaptationNotes[0] ?? ''
        }`.trim(),
      });
    }

    snapshot.recentRumors.slice(-2).forEach((text) => entries.push({ tag: 'Rumeur', text }));
    snapshot.kingdomMemoryRumors.slice(0, 3).forEach((text) => entries.push({ tag: 'Guilde', text }));
    snapshot.recentJournal.slice(-3).forEach((text) => entries.push({ tag: 'Journal', text }));
    snapshot.recentChronicles.slice(-3).forEach((text) => entries.push({ tag: 'Chronique', text }));

    if (this.bestWave > 0) {
      entries.push({
        tag: 'Record',
        text: `${this.bestWave} vague${this.bestWave > 1 ? 's' : ''} repoussee${this.bestWave > 1 ? 's' : ''} localement.`,
      });
    }

    if (entries.length === 0) {
      return '<p class="journal-feed__empty">Rien a raconter pour le moment.</p>';
    }

    return `
      <ul class="journal-feed">
        ${entries
          .map(
            (entry) => `
              <li>
                <span class="journal-feed__tag">${escapeHtml(entry.tag)}</span>
                <span>${escapeHtml(entry.text)}</span>
              </li>
            `,
          )
          .join('')}
      </ul>
    `;
  }

  // ---------------------------------------------------------------------
  // Phase d'expedition (wave)
  // ---------------------------------------------------------------------

  private renderWavePanel(snapshot: DungeonSnapshot): string {
    return `
      <p class="side-panel__meta">
        ${escapeHtml(snapshot.expeditionLabel)} vers ${escapeHtml(snapshot.expeditionPrimaryGoal)}
      </p>

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

      <div class="panel-block">
        <p class="panel-block__title">Intrus en approche</p>
        <div class="pill-row">${this.renderCounts(snapshot.adventurersByRole)}</div>
        <div class="pill-row">${this.renderNameTags(snapshot.activeAdventurerNames)}</div>
      </div>

      <div class="panel-block">
        <p class="panel-block__title">Boss autonome</p>
        <p class="panel-block__text">
          ${snapshot.bossAutopilotIntent ? escapeHtml(snapshot.bossAutopilotIntent) : 'Le boss attend que les intrus approchent du trone.'}
          ${snapshot.bossLastAbilityName ? ` Dernier pouvoir : ${escapeHtml(snapshot.bossLastAbilityName)}.` : ''}
        </p>
        <div class="pill-row">
          ${snapshot.bossAbilities.map((ability) => this.renderAbilityPill(ability)).join('')}
        </div>
      </div>

      ${snapshot.inspectedAdventurer
        ? this.renderInspection(snapshot)
        : '<p class="side-panel__hint">Clique sur un intrus pour l\'inspecter.</p>'}
    `;
  }

  private renderAbilityPill(ability: DungeonSnapshot['bossAbilities'][number]): string {
    const cooldownSeconds = Math.ceil(ability.cooldownRemainingMs / 1000);
    const status = ability.usesLeft === 0 ? 'Epuise' : ability.ready ? 'Pret' : `${cooldownSeconds}s`;
    const readyClass = ability.ready ? ' pill--ready' : '';

    return `
      <span class="pill pill--ability${readyClass}" title="${escapeHtml(ability.description)}">
        ${escapeHtml(ability.shortName)} : ${escapeHtml(status)}
      </span>
    `;
  }

  private renderInspection(snapshot: DungeonSnapshot): string {
    const target = snapshot.inspectedAdventurer;

    if (!target) {
      return '';
    }

    const traits = target.traits.join(', ') || 'aucun';
    const injuries = target.injuries.length > 0 ? target.injuries.join(', ') : 'aucune';
    const specialTreasures = target.specialTreasureEffects.length > 0
      ? target.specialTreasureEffects.join(', ')
      : 'aucun';

    return `
      <div class="panel-block inspection">
        <p class="panel-block__title">Dossier : ${escapeHtml(target.name)}</p>
        <ul class="inspection__facts">
          <li>${escapeHtml(target.className)} niveau ${target.level}, ${target.age} ans</li>
          <li>PV : ${target.hp} / ${target.maxHp} - Degats : ${target.damage}</li>
          <li>Personnalite : ${escapeHtml(target.personality)} (traits : ${escapeHtml(traits)})</li>
          <li>Tresors appris/equipes : ${escapeHtml(specialTreasures)}</li>
          <li>Expeditions : ${target.expeditionCount} (survies : ${target.survivedExpeditions})</li>
          <li>Monstres tues : ${target.monstersKilled}, pieges declenches : ${target.trapsTriggered}</li>
          <li>Portes : ${target.doorsEncountered} rencontree${target.doorsEncountered > 1 ? 's' : ''}, ${target.doorsPicked} ouverte${target.doorsPicked > 1 ? 's' : ''}</li>
          <li>Boss affrontes : ${target.bossEncounters}, or rapporte : ${target.totalLootedGold}</li>
          <li>Blessures : ${escapeHtml(injuries)}</li>
          ${target.isHeir && target.heirNote ? `<li class="inspection__heir">${escapeHtml(target.heirNote)}</li>` : ''}
          ${target.carryingTreasure ? '<li class="inspection__heir">Porte le tresor du donjon.</li>' : ''}
          ${target.lastFeat ? `<li>Dernier fait : ${escapeHtml(target.lastFeat)}</li>` : ''}
        </ul>
        <button class="control-button" data-action="close-inspection">Fermer le dossier</button>
      </div>
    `;
  }

  // ---------------------------------------------------------------------
  // Debriefing (rapport / defaite) - overlays plein ecran, inchanges
  // ---------------------------------------------------------------------

  private renderReport(snapshot: DungeonSnapshot): string {
    const report = snapshot.report;

    if (!report) {
      return '';
    }

    const canAdvance = !this.tavernProgress.fullyRevealed;

    return `
      <div class="tavern-hud" data-testid="tavern-hud">
        <details class="debrief-details debrief-details--tavern">
          <summary>Rapport complet</summary>
          <div class="debrief__grid debrief__grid--compact">
            ${this.renderParticipantSection(snapshot)}
            ${this.renderDebriefSection('Lecture tactique', report.learnedLines.slice(0, 3))}
            ${this.renderDebriefSection('Suite probable', report.guildChanges.slice(0, 3))}
            ${this.renderDebriefSection('Economie', report.economyLines.slice(-3))}
          </div>
        </details>

        <div class="tavern-hud__actions debrief__actions">
          <span class="tavern-hud__hint">Espace/Entree: avancer | Echap: passer</span>
          <button class="button button--ghost" data-action="tavern-skip">Passer</button>
          <button class="button button--primary" data-action="tavern-advance">${canAdvance ? 'Continuer' : 'Vers la preparation'}</button>
        </div>
      </div>
    `;
  }

  private renderDefeat(snapshot: DungeonSnapshot): string {
    const report = snapshot.report;

    if (!report) {
      return '';
    }

    const canAdvance = !this.tavernProgress.fullyRevealed;

    return `
      <div class="tavern-hud tavern-hud--defeat" data-testid="tavern-hud">
        <details class="debrief-details debrief-details--tavern">
          <summary>Rapport complet</summary>
          <div class="debrief__grid debrief__grid--compact">
            ${this.renderParticipantSection(snapshot)}
            ${this.renderDebriefSection('Ce que la guilde retient', report.sharedLines.slice(0, 3))}
            ${this.renderDebriefSection('Bilan', report.gainsLosses.slice(0, 3))}
          </div>
        </details>

        <div class="tavern-hud__actions debrief__actions">
          <span class="tavern-hud__hint">Espace/Entree: avancer | Echap: passer</span>
          ${canAdvance ? '<button class="button button--ghost" data-action="tavern-skip">Passer</button><button class="button button--primary" data-action="tavern-advance">Continuer</button>' : ''}
          <button class="button" data-action="restart">Rebatir sur les cendres</button>
        </div>
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

  // ---------------------------------------------------------------------
  // Petits helpers d'affichage partages
  // ---------------------------------------------------------------------

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
      .map((item) => `<span class="pill">${escapeHtml(item.label)} x${item.count}</span>`)
      .join('') || '<span class="pill pill--muted">Aucun</span>';
  }

  private renderNameTags(names: string[]): string {
    return names
      .slice(0, 6)
      .map((name) => `<span class="pill">${escapeHtml(name)}</span>`)
      .join('') || '<span class="pill pill--muted">Aucun nom a retenir</span>';
  }

  // ---------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------

  private bindActions(snapshot: UiSnapshot): void {
    this.root.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.dataset.action;

        if (action === 'start-game') {
          emitUiAction({ type: 'start-game' });
        }

        if (action === 'toggle-credits') {
          this.toggleCredits();
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

        if (action === 'tavern-advance') {
          emitUiAction({ type: 'tavern-advance' });
        }

        if (action === 'tavern-skip') {
          emitUiAction({ type: 'tavern-skip' });
        }
      });
    });

    this.root.querySelectorAll<HTMLButtonElement>('[data-section]').forEach((button) => {
      button.addEventListener('click', () => {
        const section = button.dataset.section;

        if (section) {
          this.toggleSection(section);
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

// ---------------------------------------------------------------------
// Fonctions pures (aucun etat, aucune regle de jeu)
// ---------------------------------------------------------------------

function describePhase(phase: DungeonSnapshot['phase']): { label: string; tone: string } {
  switch (phase) {
    case 'build':
      return { label: 'Preparation', tone: 'build' };
    case 'wave':
      return { label: 'Expedition en cours', tone: 'wave' };
    case 'report':
      return { label: 'Debriefing', tone: 'report' };
    case 'defeat':
      return { label: 'Defaite', tone: 'defeat' };
    default:
      return { label: phase, tone: 'build' };
  }
}

function toneIcon(tone: MessageTone): string {
  switch (tone) {
    case 'error':
      return '!';
    case 'warning':
      return '*';
    case 'success':
      return 'v';
    default:
      return 'i';
  }
}

const ERROR_MESSAGE_HINTS = ['pas assez', 'insuffisant', 'refuse', 'impossible', 'zone de surete', 'aucune porte', 'aucun outil', 'aucune defense'];
const SUCCESS_MESSAGE_HINTS = ['recupere', 'demonte', 'deplace', 'depose', 'rebouchee'];

function classifyMessageTone(message: string): MessageTone {
  const lower = message.toLowerCase();

  if (ERROR_MESSAGE_HINTS.some((hint) => lower.includes(hint))) {
    return 'error';
  }

  if (SUCCESS_MESSAGE_HINTS.some((hint) => lower.includes(hint))) {
    return 'success';
  }

  return 'info';
}

function classifyBuildMessage(snapshot: DungeonSnapshot): { tone: MessageTone; text: string } {
  if (!snapshot.dungeonValidation.valid) {
    return { tone: 'warning', text: snapshot.dungeonValidation.reason ?? "Le donjon n'est pas valide." };
  }

  return { tone: classifyMessageTone(snapshot.message), text: snapshot.message };
}

function classifyWaveMessage(snapshot: DungeonSnapshot): { tone: MessageTone; text: string } {
  if (snapshot.treasureStatus === 'stolen') {
    return { tone: 'error', text: 'Le tresor est VOLE. La honte sera comptabilisee au rapport.' };
  }

  if (snapshot.treasureStatus === 'dropped') {
    return { tone: 'warning', text: "Le tresor traine par terre. Quelqu'un va forcement le ramasser." };
  }

  if (snapshot.treasureStatus === 'carried') {
    return {
      tone: 'warning',
      text: `Tresor porte par ${snapshot.treasureCarrierName ?? 'un intrus'}. Ne le laisse pas sortir.`,
    };
  }

  return { tone: classifyMessageTone(snapshot.message), text: snapshot.message };
}

function placementHintFor(type: ConstructionTool): string {
  switch (type) {
    case 'dig':
      return 'Placement : case de roche adjacente a une zone deja creusee.';
    case 'reseal':
      return 'Placement : sol ou salle deja creusee, sans porte, defense, tresor, boss ni chemin obligatoire coupe.';
    case 'door':
      return 'Placement : couloir creuse, sans piege ni monstre sur la case.';
    case 'removeDoor':
      return 'Placement : clique sur une porte existante pour la retirer.';
    case 'moveBoss':
      return 'Placement : sol ou salle creusee, hors entree, tresors, portes, defenses et zone de surete.';
    case 'moveTreasure':
      return 'Placement : sol ou salle creusee accessible, hors boss, portes, defenses et zone de surete.';
    case 'addGoldTreasure':
      return "Placement : sol ou salle creusee accessible. Le depot coute 20 or et ne sera pas penalise deux fois.";
    case 'addWeaponTreasure':
    case 'addArmorTreasure':
    case 'addTechniqueTreasure':
      return 'Placement : sol ou salle creusee accessible. Si le porteur survit, le bonus reste sur son profil.';
    case 'removeTreasure':
      return 'Placement : clique sur un tresor secondaire non vole pour recuperer sa valeur.';
    case 'guardRoom':
    case 'crypt':
      return 'Placement : case deja creusee.';
    default:
      return '';
  }
}
