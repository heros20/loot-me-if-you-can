import type { AdventurerEntity } from '../game/types';

export type BarkKind =
  | 'doorThief'
  | 'doorBlocked'
  | 'doorNoThief'
  | 'doorNoLockpicks'
  | 'doorOpened'
  | 'trapSeen'
  | 'trapThief'
  | 'trapThiefOverwhelmed'
  | 'roomLockTriggered'
  | 'roomLockCleared'
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
  | 'opportunisticLoot'
  | 'waitTank'
  | 'bossPrepare'
  | 'backlineHold'
  | 'secureArea'
  | 'mapping'
  | 'mapTrap'
  | 'mapBoss'
  | 'mapChanged'
  | 'remainsSeen'
  | 'relicRecognized'
  | 'returningSurvivor'
  | 'bossAbility'
  | 'warriorTaunt'
  | 'healerHeal'
  | 'healerGroupHeal'
  | 'mageIce';

const BARKS: Record<BarkKind, string[]> = {
  doorThief: ['Je crochete cette porte.', 'Cette serrure ne tiendra pas longtemps.', "Je m'en occupe."],
  doorBlocked: ['Laissez passer le voleur.', 'La serrure nous bloque.'],
  doorNoThief: ["On n'a personne pour ouvrir ca.", 'Sans voleur, cette porte nous arrete net.', "On reviendra avec quelqu'un capable de l'ouvrir."],
  doorNoLockpicks: ['Plus de crochets.', 'Deux portes, pas trois.', "Je n'en ouvrirai pas une troisieme."],
  doorOpened: ["C'est ouvert.", 'Passage libre.'],
  trapSeen: ['Attendez... le sol est bizarre.', 'Ne marchez pas la-dessus !'],
  trapThief: ['Piege desamorce.', 'Celui-la ne sautera plus.', "J'ai neutralise le mecanisme."],
  trapThiefOverwhelmed: ['Trop de mecanismes, je ne pourrai pas tout neutraliser.', 'Plus le temps de desamorcer !'],
  roomLockTriggered: ['Les issues se verrouillent !', 'La salle se ferme !'],
  roomLockCleared: ['Le verrou cede.', 'La salle se rouvre.'],
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
  opportunisticLoot: ['Je prends ca.', 'Je vois quelque chose.', 'Ca, on ne le laisse pas.'],
  waitTank: ['Pas sans le guerrier.', 'Attendez le tank !', 'On ouvre derriere lui.'],
  bossPrepare: ['Le boss... preparez-vous.', 'Derriere moi.', 'On se place.'],
  backlineHold: ['Je reste derriere.', 'Restez devant moi.', 'Je garde la distance.'],
  secureArea: ["On securise d'abord.", 'Pas de loot avant la ligne.', 'Nettoyez la salle.'],
  mapping: ['Je note ce passage.', 'Laissez-moi relever la salle.', 'Cette route merite une marge.'],
  mapTrap: ['Ce piege sera sur la carte.', 'Dalle dangereuse, reperee.'],
  mapBoss: ["J'ai vu le boss. Il faut rentrer avec ca.", 'Le trone est confirme.'],
  mapChanged: ['La salle ne correspond pas aux recits.', 'Le passage a change.'],
  remainsSeen: ["C'est l'un des notres...", 'Ne regardez pas trop longtemps.', 'Le donjon garde ses morts.'],
  relicRecognized: ['Je reconnais cet ecusson.', "Cette relique... je l'ai deja vue.", 'Un nom connu est tombe ici.'],
  returningSurvivor: ['Je connais ce couloir.', 'Restez pres de moi.', "J'ai deja survecu a ce trou."],
  bossAbility: ['Il prepare quelque chose !', 'Le maitre du donjon bouge enfin.'],
  warriorTaunt: ['Derriere moi !', 'Je les retiens !', 'Touchez-moi plutot !'],
  healerHeal: ['Tiens bon !', 'Je vous soigne !'],
  healerGroupHeal: ['Restez groupes !', 'Je vous releve !'],
  mageIce: ['Le froid les ralentira.', 'Reculez, je lance un sort !'],
};

export const BARK_BALANCE = {
  globalCooldownMs: 11000,
  highPriorityCooldownMs: 5600,
  normalCooldownMs: 8600,
  highPriorityTimerMs: 2400,
  normalTimerMs: 1900,
  maxVisibleBarks: 2,
} as const;

const GLOBAL_BARK_COOLDOWN_MS = BARK_BALANCE.globalCooldownMs;
const MAX_VISIBLE_BARKS = BARK_BALANCE.maxVisibleBarks;
const BARK_PRIORITY: Partial<Record<BarkKind, number>> = {
  doorNoThief: 3,
  doorNoLockpicks: 3,
  doorOpened: 3,
  treasureTaken: 3,
  opportunisticLoot: 2,
  waitTank: 3,
  bossPrepare: 3,
  backlineHold: 2,
  secureArea: 2,
  mapping: 2,
  mapTrap: 3,
  mapBoss: 3,
  mapChanged: 3,
  remainsSeen: 2,
  relicRecognized: 3,
  treasureEscape: 3,
  treasureChallenge: 3,
  returningSurvivor: 2,
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
  roomLockTriggered: 3,
  roomLockCleared: 3,
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
  adventurer.barkTimerMs = priority >= 3 ? BARK_BALANCE.highPriorityTimerMs : BARK_BALANCE.normalTimerMs;
  adventurer.barkCooldownMs = priority >= 3 ? BARK_BALANCE.highPriorityCooldownMs : BARK_BALANCE.normalCooldownMs;
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
