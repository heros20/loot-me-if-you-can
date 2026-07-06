import type { AdventurerEntity } from '../game/types';

export type BarkKind =
  | 'doorThief'
  | 'doorBlocked'
  | 'doorNoThief'
  | 'doorOpened'
  | 'trapSeen'
  | 'trapThief'
  | 'trapThiefOverwhelmed'
  | 'treasureEscape'
  | 'treasureChallenge'
  | 'protectCarrier'
  | 'stayTogether'
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
  treasureEscape: ["On a le tresor, sortons d'ici !", 'Protegez le porteur !'],
  treasureChallenge: ['Non, le boss est affaibli, on termine ca !', 'On ne s eparpille pas !'],
  protectCarrier: ['Protegez le porteur !', 'Couvrez notre retraite !'],
  stayTogether: ['On ne s eparpille pas !', 'Restez groupes !'],
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
const MAX_VISIBLE_BARKS = 2;
const BARK_PRIORITY: Partial<Record<BarkKind, number>> = {
  doorNoThief: 3,
  doorOpened: 3,
  treasureTaken: 3,
  treasureEscape: 3,
  treasureChallenge: 3,
  protectCarrier: 3,
  retreat: 3,
  retreatFollow: 2,
  retreatCover: 2,
  retreatPanic: 3,
  retreatDisobey: 3,
  healerHeal: 2,
  healerGroupHeal: 3,
  trapThiefOverwhelmed: 3,
  trapThief: 2,
  warriorTaunt: 2,
};
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
  const priority = BARK_PRIORITY[kind] ?? 1;

  if (adventurer.barkCooldownMs > 0 || (visibleBarkCount >= MAX_VISIBLE_BARKS && priority < 3)) {
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
  adventurer.barkTimerMs = priority >= 3 ? 2500 : 2000;
  adventurer.barkCooldownMs = priority >= 3 ? 5400 : 7600;
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
