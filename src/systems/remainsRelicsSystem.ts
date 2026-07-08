import { cellKey } from '../game/constants';
import type {
  AdventurerEntity,
  AdventurerProfile,
  AdventurerRemains,
  AdventurerRole,
  DefenseType,
  GridCell,
  KingdomMemoryFactKind,
  RelicEmotionalTone,
  RelicType,
  RemainsLoot,
  RemainsLootKind,
} from '../game/types';

export const MAX_PERSISTENT_REMAINS = 80;
export const MAX_VISIBLE_REMAINS_PER_CELL = 3;

interface RelicTemplate {
  type: RelicType;
  noun: string;
  adjective: string;
  tone: RelicEmotionalTone;
  roleBias?: AdventurerRole;
}

interface LootTemplate {
  kind: RemainsLootKind;
  label: string;
  description: string;
  baseGold: number;
  roleBias?: AdventurerRole;
}

const RELIC_TEMPLATES: RelicTemplate[] = [
  { type: 'ring', noun: 'Bague', adjective: 'gravee', tone: 'grief' },
  { type: 'medallion', noun: 'Medaillon', adjective: 'fendu', tone: 'respect' },
  { type: 'letter', noun: 'Lettre', adjective: 'tachee', tone: 'grief', roleBias: 'healer' },
  { type: 'guildBadge', noun: 'Ecusson', adjective: 'brise', tone: 'warning' },
  { type: 'brokenWeapon', noun: 'Lame', adjective: 'rompue', tone: 'revenge', roleBias: 'warrior' },
  { type: 'mapFragment', noun: 'Morceau de carte', adjective: 'froisse', tone: 'warning', roleBias: 'cartographer' },
  { type: 'scarf', noun: 'Foulard', adjective: 'poussiereux', tone: 'fear', roleBias: 'thief' },
  { type: 'pendant', noun: 'Pendentif', adjective: 'noirci', tone: 'respect' },
  { type: 'notebook', noun: 'Carnet', adjective: 'humide', tone: 'warning', roleBias: 'mage' },
  { type: 'token', noun: 'Jeton de Guilde', adjective: 'raye', tone: 'respect' },
];

const LOOT_TEMPLATES: LootTemplate[] = [
  {
    kind: 'looseGold',
    label: 'Bourse eparpillee',
    description: 'Quelques pieces tombees entre deux dalles.',
    baseGold: 5,
  },
  {
    kind: 'sellableGear',
    label: 'Materiel revendable',
    description: 'Boucles, laniere et petite quincaillerie revendables.',
    baseGold: 7,
    roleBias: 'warrior',
  },
  {
    kind: 'guildSupplies',
    label: 'Provisions de Guilde',
    description: 'Bandages secs et fioles ordinaires repris comme fournitures.',
    baseGold: 6,
    roleBias: 'healer',
  },
  {
    kind: 'mapScrap',
    label: 'Fragment annote',
    description: "Un bout de croquis que l'archiviste paie sans poser de question.",
    baseGold: 8,
    roleBias: 'cartographer',
  },
  {
    kind: 'sellableGear',
    label: 'Outils abimes',
    description: 'Crochets tordus et etuis encore recuperables.',
    baseGold: 6,
    roleBias: 'thief',
  },
  {
    kind: 'guildSupplies',
    label: 'Composants mineurs',
    description: 'Poudre, craie et babioles arcanes sans proprietaire vivant.',
    baseGold: 7,
    roleBias: 'mage',
  },
];

export interface RemainsCauseInput {
  kind: 'trap' | 'minion' | 'boss';
  type: DefenseType | 'boss' | null;
  label: string;
}

export function createAdventurerRemains(input: {
  id: string;
  adventurer: AdventurerEntity;
  profile: AdventurerProfile | null;
  cell: GridCell;
  wave: number;
  day: number;
  cause: RemainsCauseInput;
}): AdventurerRemains {
  const profile = input.profile;
  const ownerName = profile?.name ?? input.adventurer.name;
  const template = pickRelicTemplate(ownerName, input.adventurer.role, input.wave);
  const loot = createRemainsLoot(ownerName, input.adventurer.role, input.adventurer.level, input.wave, input.cause.kind);
  const relicLabel = `${template.noun} ${template.adjective} de ${ownerName}`;
  const roleLabel = roleNoun(input.adventurer.role);

  return {
    id: input.id,
    mapId: input.adventurer.mapId,
    ownerProfileId: input.adventurer.profileId,
    ownerName,
    ownerRole: input.adventurer.role,
    cell: { ...input.cell },
    x: input.cell.x,
    y: input.cell.y,
    deathWave: input.wave,
    deathDay: input.day,
    causeKind: input.cause.kind,
    causeType: input.cause.type,
    causeLabel: input.cause.label,
    relicType: template.type,
    relicLabel,
    relicDescription: `${relicLabel}. Un signe simple laisse par un ${roleLabel} tombe ici.`,
    emotionalTone: template.tone,
    visualState: 'fresh',
    loot,
    discoveredByFutureParty: false,
    recognizedByProfileIds: [],
    reactionCount: 0,
  };
}

export function describeRemainsLoot(loot: RemainsLoot): string {
  return loot.claimed ? `${loot.label} deja recupere.` : `${loot.label}: ${loot.goldValue} or. ${loot.description}`;
}

export function updateRemainsVisualState(remains: AdventurerRemains, currentWave: number): AdventurerRemains {
  const age = Math.max(0, currentWave - remains.deathWave);
  const visualState = age >= 5 ? 'old' : age >= 2 ? 'bones' : 'fresh';

  return remains.visualState === visualState ? remains : { ...remains, visualState };
}

export function compressRemains(remains: AdventurerRemains[]): AdventurerRemains[] {
  return remains.length <= MAX_PERSISTENT_REMAINS
    ? remains
    : remains.slice(remains.length - MAX_PERSISTENT_REMAINS);
}

export function shouldReactToRemains(input: {
  adventurer: AdventurerEntity;
  remains: AdventurerRemains;
  wave: number;
  alreadyReacted: boolean;
  immediateDanger: boolean;
}): boolean {
  if (input.alreadyReacted || input.immediateDanger || input.adventurer.targetStage === 'exit') {
    return false;
  }

  if (input.remains.ownerProfileId === input.adventurer.profileId || input.remains.deathWave >= input.wave) {
    return false;
  }

  const score = Math.abs(hashText(`${input.adventurer.profileId}:${input.remains.id}:react:${input.wave}`)) % 100;
  const threshold =
    16 +
    (input.adventurer.role === input.remains.ownerRole ? 12 : 0) +
    (input.adventurer.traits.includes('cautious') || input.adventurer.traits.includes('traumatized') ? 8 : 0) +
    (input.adventurer.role === 'cartographer' ? 10 : 0) +
    Math.min(10, input.adventurer.level * 2);

  return score < threshold;
}

export function shouldRecognizeRelic(input: {
  adventurer: AdventurerEntity;
  profile: AdventurerProfile | null;
  remains: AdventurerRemains;
  kingdomAlreadyKnows: boolean;
  cartographerInParty: boolean;
  alreadyRecognized: boolean;
}): boolean {
  if (input.alreadyRecognized || input.remains.recognizedByProfileIds.includes(input.adventurer.profileId)) {
    return false;
  }

  const relicBonus =
    input.remains.relicType === 'guildBadge' || input.remains.relicType === 'medallion' || input.remains.relicType === 'letter'
      ? 8
      : input.remains.relicType === 'mapFragment' && input.adventurer.role === 'cartographer'
        ? 16
        : 0;
  const veteranBonus = Math.min(16, (input.profile?.survivedExpeditions ?? 0) * 5 + input.adventurer.level * 2);
  const threshold =
    8 +
    relicBonus +
    veteranBonus +
    (input.adventurer.role === input.remains.ownerRole ? 14 : 0) +
    (input.kingdomAlreadyKnows ? 10 : 0) +
    (input.cartographerInParty ? 5 : 0);
  const score = Math.abs(hashText(`${input.adventurer.profileId}:${input.remains.id}:recognize`)) % 100;

  return score < Math.min(58, threshold);
}

export function describeRemains(remains: AdventurerRemains): string {
  return `Restes de ${remains.ownerName} - ${roleNoun(remains.ownerRole)}. ${remains.causeLabel}. ${remains.relicLabel}.`;
}

export function reactionLineFor(remains: AdventurerRemains, recognized: boolean): string {
  if (recognized) {
    return `On a reconnu ${remains.relicLabel} pres des restes de ${remains.ownerName}.`;
  }

  switch (remains.emotionalTone) {
    case 'revenge':
      return `Des restes de ${remains.ownerName} raniment une envie de vengeance.`;
    case 'respect':
      return `Le groupe marque un silence devant les restes de ${remains.ownerName}.`;
    case 'grief':
      return `Les restes de ${remains.ownerName} refroidissent l'expedition.`;
    case 'fear':
      return `Les restes de ${remains.ownerName} font ralentir les pas.`;
    case 'warning':
    default:
      return `Les restes de ${remains.ownerName} deviennent un avertissement concret.`;
  }
}

export function deathSiteFactKinds(remains: AdventurerRemains, recognized: boolean): KingdomMemoryFactKind[] {
  const kinds: KingdomMemoryFactKind[] = ['remainsSeen', 'deathSiteKnown'];

  if (recognized) {
    kinds.push('relicRecognized');
  }

  if (remains.causeKind === 'boss') {
    kinds.push('bossKilledAdventurerHere', 'dangerousDeathSite');
  } else if (remains.causeKind === 'trap') {
    kinds.push('trapKilledAdventurerHere', 'dangerousDeathSite');
  }

  return kinds;
}

export function hasVisibleRemainsAt(remains: AdventurerRemains[], cell: GridCell): boolean {
  return remains.some((entry) => cellKey(entry.cell) === cellKey(cell));
}

function pickRelicTemplate(ownerName: string, role: AdventurerRole, wave: number): RelicTemplate {
  const biased = RELIC_TEMPLATES.filter((template) => !template.roleBias || template.roleBias === role);
  const pool = biased.length > 0 ? biased : RELIC_TEMPLATES;
  return pool[Math.abs(hashText(`${ownerName}:${role}:${wave}:relic`)) % pool.length];
}

function createRemainsLoot(
  ownerName: string,
  role: AdventurerRole,
  level: number,
  wave: number,
  causeKind: RemainsCauseInput['kind'],
): RemainsLoot {
  const biased = LOOT_TEMPLATES.filter((template) => !template.roleBias || template.roleBias === role);
  const pool = biased.length > 0 ? biased : LOOT_TEMPLATES;
  const template = pool[Math.abs(hashText(`${ownerName}:${role}:${wave}:loot`)) % pool.length];
  const causeBonus = causeKind === 'boss' ? 2 : causeKind === 'minion' ? 1 : 0;
  const variance = Math.abs(hashText(`${ownerName}:${template.kind}:${wave}:value`)) % 4;

  return {
    kind: template.kind,
    label: template.label,
    description: template.description,
    goldValue: Math.max(2, template.baseGold + Math.min(4, level) + causeBonus + variance),
    claimed: false,
  };
}

function roleNoun(role: AdventurerRole): string {
  switch (role) {
    case 'warrior':
      return 'guerrier';
    case 'thief':
      return 'voleur';
    case 'mage':
      return 'mage';
    case 'healer':
      return 'soigneur';
    case 'cartographer':
      return 'cartographe';
    default:
      return 'aventurier';
  }
}

function hashText(value: string): number {
  let hash = 0;

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }

  return hash;
}
