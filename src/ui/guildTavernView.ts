import type {
  GuildTavernScene,
  GuildTavernSummaryFact,
  TavernActor,
  TavernBeat,
  TavernTableSlot,
} from '../game/types';
import { escapeHtml, roleInitial, roleLabel } from './textFormatters';

/**
 * Guild Tavern Scene V2 - rendu.
 *
 * Ce module ne connait aucune regle de jeu: il transforme une GuildTavernScene
 * (deja calculee par guildTavernSceneSystem.ts) et un TavernSceneState local
 * (progression de la sequence de dialogue) en HTML. domUi.ts se contente de
 * gerer le TavernSceneState (avancer / tout reveler) et de brancher les
 * boutons/raccourcis clavier.
 */
export interface TavernSceneState {
  revealedCount: number;
}

export function createInitialTavernSceneState(scene: GuildTavernScene): TavernSceneState {
  return { revealedCount: Math.min(1, scene.beats.length) };
}

export function advanceTavernSceneState(scene: GuildTavernScene, state: TavernSceneState): TavernSceneState {
  return { revealedCount: Math.min(scene.beats.length, state.revealedCount + 1) };
}

export function revealAllTavernBeats(scene: GuildTavernScene): TavernSceneState {
  return { revealedCount: scene.beats.length };
}

export function isTavernSceneFullyRevealed(scene: GuildTavernScene, state: TavernSceneState): boolean {
  return state.revealedCount >= scene.beats.length;
}

export interface RenderTavernSceneOptions {
  wave: number;
  final?: boolean;
}

export function renderGuildTavernScene(
  scene: GuildTavernScene,
  state: TavernSceneState,
  options: RenderTavernSceneOptions,
): string {
  const revealedBeats = scene.beats.slice(0, state.revealedCount);
  const activeBeat = revealedBeats[revealedBeats.length - 1] ?? null;
  const title = options.final ? 'Chronique finale' : scene.title;

  return `
    <section class="tavern-scene tavern-scene--${scene.sceneMood}${options.final ? ' tavern-scene--final' : ''}" data-testid="tavern-scene">
      <header class="tavern-scene__header">
        <p class="section-title">${escapeHtml(title)}</p>
        <h2>Vague ${options.wave}: ${escapeHtml(scene.subtitle)}</h2>
      </header>

      <div class="tavern-room" data-testid="tavern-room">
        <div class="tavern-room__glow" aria-hidden="true"></div>

        <div class="tavern-room__back-row">
          ${scene.dead.length > 0 ? renderBoard(scene.dead) : ''}
          <div class="tavern-room__silhouettes" data-testid="tavern-background">
            ${scene.layout.backgroundActors.map((actor) => renderActor(actor, activeBeat)).join('')}
          </div>
        </div>

        <div class="tavern-room__counter" data-testid="tavern-counter">
          <div class="tavern-counter__bar" aria-hidden="true"></div>
          <div class="tavern-counter__actors">
            ${scene.layout.counterActors.map((actor) => renderActor(actor, activeBeat)).join('')}
          </div>
        </div>

        <div class="tavern-room__table" data-testid="tavern-table">
          <div class="tavern-table__surface" aria-hidden="true"></div>
          <div class="tavern-table__seats">
            ${scene.layout.tableSlots.map((slot) => renderTableSlot(slot, activeBeat)).join('')}
          </div>
        </div>
      </div>

      <div class="tavern-scene__log" data-testid="tavern-log">
        <p class="section-title">Ce qui se dit</p>
        ${groupBeats(revealedBeats).map((group) => renderLogGroup(group)).join('') || '<p class="tavern-scene__log-empty">...</p>'}
      </div>

      <div class="tavern-scene__facts">
        ${scene.summaryFacts.map((fact) => renderFact(fact)).join('')}
      </div>
    </section>
  `;
}

function renderActor(actor: TavernActor, activeBeat: TavernBeat | null): string {
  const isSpeaking = activeBeat !== null && activeBeat.actorId === actor.id;
  const veteranClass = actor.isVeteran ? ' tavern-actor--veteran' : '';
  const meta = actor.kind === 'survivor' && actor.level !== null
    ? `<span class="tavern-actor__meta">${escapeHtml(roleLabel(actor.role))} niv. ${actor.level}</span>`
    : '';

  return `
    <div class="tavern-actor tavern-actor--${actor.pose} tavern-actor--${actor.role}${veteranClass}" data-testid="tavern-actor" data-actor-id="${escapeHtml(actor.id)}">
      ${isSpeaking ? renderBubble(activeBeat.text) : ''}
      <span class="tavern-actor__avatar" aria-hidden="true">${escapeHtml(roleInitial(actor.role))}</span>
      <strong class="tavern-actor__name">${escapeHtml(actor.name)}</strong>
      ${meta}
      <span class="tavern-actor__tag">${escapeHtml(actor.statusLabel)}</span>
    </div>
  `;
}

function renderTableSlot(slot: TavernTableSlot, activeBeat: TavernBeat | null): string {
  if (slot.actor) {
    return renderActor(slot.actor, activeBeat);
  }

  return `
    <div class="tavern-actor tavern-actor--empty" data-testid="tavern-empty-seat">
      <span class="tavern-actor__avatar" aria-hidden="true">-</span>
      <span class="tavern-actor__tag tavern-actor__tag--dead">${slot.deadName ? escapeHtml(slot.deadName) : 'Chaise vide'}</span>
    </div>
  `;
}

function renderBubble(text: string): string {
  return `<div class="tavern-bubble" data-testid="tavern-bubble">${escapeHtml(text)}</div>`;
}

function renderBoard(deadNames: string[]): string {
  return `
    <div class="tavern-board" data-testid="tavern-board">
      <p class="tavern-board__title">${deadNames.length === 1 ? 'Absent' : 'Ne sont pas revenus'}</p>
      <ul class="tavern-board__names">${deadNames.map((name) => `<li>${escapeHtml(name)}</li>`).join('')}</ul>
    </div>
  `;
}

interface BeatGroup {
  speakerName: string;
  role: string;
  texts: string[];
}

function groupBeats(beats: TavernBeat[]): BeatGroup[] {
  const groups: BeatGroup[] = [];

  beats.forEach((entry) => {
    const lastGroup = groups[groups.length - 1];

    if (lastGroup && lastGroup.speakerName === entry.speakerName) {
      lastGroup.texts.push(entry.text);
      return;
    }

    groups.push({ speakerName: entry.speakerName, role: entry.role, texts: [entry.text] });
  });

  return groups;
}

function renderLogGroup(group: BeatGroup): string {
  return `
    <div class="tavern-log__entry tavern-log__entry--${group.role}">
      <strong>${escapeHtml(group.speakerName)}</strong>
      ${group.texts.map((text) => `<p>${escapeHtml(text)}</p>`).join('')}
    </div>
  `;
}

function renderFact(fact: GuildTavernSummaryFact): string {
  return `
    <span class="tavern-fact tavern-fact--${fact.tone}">
      <small>${escapeHtml(fact.label)}</small>
      <strong>${escapeHtml(fact.value)}</strong>
    </span>
  `;
}
