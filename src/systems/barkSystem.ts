import type { AdventurerEntity } from '../game/types';

export type BarkKind =
  | 'doorThief'
  | 'doorBlocked'
  | 'doorNoThief'
  | 'doorOpened'
  | 'trapSeen'
  | 'trapThief'
  | 'trapThiefOverwhelmed'
  | 'fleeTrap'
  | 'wounded'
  | 'retreat'
  | 'retreatFollow'
  | 'retreatCover'
  | 'retreatPanic'
  | 'retreatDisobey'
  | 'treasureTaken'
  | 'bossAbility'
  | 'warriorTaunt'
  | 'healerHeal'
  | 'healerGroupHeal'
  | 'mageIce';

const BARKS: Record<BarkKind, string[]> = {
  doorThief: ['Laissez-moi faire.', 'Cette serrure ne tiendra pas longtemps.', "Je m'en occupe."],
  doorBlocked: ['Laissez passer le voleur.', 'La serrure nous bloque.'],
  doorNoThief: ["On n'a personne pour ouvrir ca.", 'Sans voleur, cette porte nous arrete net.', "On reviendra avec quelqu'un capable de l'ouvrir."],
  doorOpened: ['Ouverte.', 'Passage libre.'],
  trapSeen: ['Attendez... le sol est bizarre.', 'Ne marchez pas la-dessus !'],
  trapThief: ['Je vois le mecanisme.', 'Pas si vite, je peux l affaiblir.', 'Celui-la, je le vois.'],
  trapThiefOverwhelmed: ['Trop de mecanismes, je ne pourrai pas tout neutraliser.', 'Plus le temps de desamorcer !'],
  fleeTrap: ['Pas par la, je vais y rester !', 'Autre chemin, tout de suite !'],
  wounded: ['Je ne tiendrai pas longtemps.', 'Soigneur ! Maintenant !'],
  retreat: ['On devrait sortir vivants.', 'La retraite reste une strategie.'],
  retreatFollow: ['Avec toi !', 'On se replie ensemble.'],
  retreatCover: ['Je couvre la retraite !', 'Sauvez le soigneur !'],
  retreatPanic: ['Repli ! Maintenant !', 'Je file !'],
  retreatDisobey: ['Hors de question, on est si proches !', 'Je garde le passage.'],
  treasureTaken: ['On a le butin, partez !', 'Pas question, on finit le boss !'],
  bossAbility: ['Il prepare quelque chose !', 'Le maitre du donjon bouge enfin.'],
  warriorTaunt: ['Derriere moi !', 'Je les retiens !', 'Touchez-moi plutot !'],
  healerHeal: ['Tiens bon !', 'Je vous soigne !'],
  healerGroupHeal: ['Restez groupes !', 'Je vous releve !'],
  mageIce: ['Le froid les ralentira.', 'Reculez, je lance un sort !'],
};

const GLOBAL_BARK_COOLDOWN_MS = 9000;
const phraseCooldownMs = new Map<string, number>();
let lastGlobalText: string | null = null;

export function tickGlobalBarks(deltaMs: number): void {
  phraseCooldownMs.forEach((remainingMs, phrase) => {
    const nextMs = Math.max(0, remainingMs - deltaMs);

    if (nextMs <= 0) {
      phraseCooldownMs.delete(phrase);
      return;
    }

    phraseCooldownMs.set(phrase, nextMs);
  });
}

export function tickAdventurerBarks(adventurer: AdventurerEntity, deltaMs: number): void {
  adventurer.barkCooldownMs = Math.max(0, adventurer.barkCooldownMs - deltaMs);
  adventurer.barkTimerMs = Math.max(0, adventurer.barkTimerMs - deltaMs);

  if (adventurer.barkTimerMs === 0) {
    adventurer.barkText = null;
  }
}

export function tryBark(adventurer: AdventurerEntity, kind: BarkKind, visibleBarkCount: number): string | null {
  if (adventurer.barkCooldownMs > 0 || visibleBarkCount >= 3) {
    return null;
  }

  const options = BARKS[kind];
  const previousIndex = Number(adventurer.lastBarkKey?.split(':')[1] ?? '-1');
  const seed = Math.abs(hashText(`${adventurer.id}:${kind}:${adventurer.name}`));
  const candidates = options
    .map((text, index) => ({ text, index }))
    .filter((entry) => entry.text !== lastGlobalText && !phraseCooldownMs.has(entry.text));
  const pool = candidates.length > 0 ? candidates : options.map((text, index) => ({ text, index }));
  const selected = pool[(seed + previousIndex + 1) % pool.length] ?? pool[0];
  const text = selected.text;

  adventurer.barkText = text;
  adventurer.barkTimerMs = 2900;
  adventurer.barkCooldownMs = 7200;
  adventurer.lastBarkKey = `${kind}:${selected.index}`;
  phraseCooldownMs.set(text, GLOBAL_BARK_COOLDOWN_MS);
  lastGlobalText = text;
  return text;
}

function hashText(value: string): number {
  let hash = 0;

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }

  return hash;
}
