import type { GuildTavernScene, TavernBeat } from '../game/types';
import type { DialogueLine } from './tavernDialoguePools';
import { resolveLine } from './tavernDialoguePools';

export interface TavernSceneState {
  revealedCount: number;
}

const RECENT_DIALOGUE_LIMIT = 24;
const recentDialogueIds: string[] = [];

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

export function rememberDialogueIds(ids: string[]): void {
  ids.forEach((id) => {
    recentDialogueIds.push(id);
  });

  while (recentDialogueIds.length > RECENT_DIALOGUE_LIMIT) {
    recentDialogueIds.shift();
  }
}

export function resetRecentDialogueMemory(): void {
  recentDialogueIds.length = 0;
}

export function pickDialogueLine(
  pool: DialogueLine[],
  _ctx: Parameters<typeof resolveLine>[1],
  excludeIds: Set<string> = new Set(),
): DialogueLine | null {
  const recent = new Set([...recentDialogueIds, ...excludeIds]);
  const candidates = pool.filter((entry) => !recent.has(entry.id));

  if (candidates.length === 0) {
    const fallback = pool.filter((entry) => !excludeIds.has(entry.id));
    return fallback[Math.floor(Math.random() * fallback.length)] ?? pool[0] ?? null;
  }

  return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
}

export function makeBeat(
  actorId: string,
  speakerName: string,
  role: TavernBeat['role'],
  line: DialogueLine,
  ctx: Parameters<typeof resolveLine>[1],
): TavernBeat {
  return {
    id: line.id,
    actorId,
    speakerName,
    role,
    text: resolveLine(line, ctx),
  };
}

export function finalizeBeats(beats: TavernBeat[]): TavernBeat[] {
  const seenText = new Set<string>();
  const unique = beats.filter((entry) => {
    if (seenText.has(entry.text)) {
      return false;
    }

    seenText.add(entry.text);
    return true;
  });

  rememberDialogueIds(unique.map((entry) => entry.id));

  if (unique.length < 3) {
    return unique;
  }

  return unique.slice(0, 6);
}
