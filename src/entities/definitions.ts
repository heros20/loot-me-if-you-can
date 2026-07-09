import type {
  AdventurerDefinition,
  AdventurerRole,
  DefenseDefinition,
  DefenseType,
} from '../game/types';
import { ADVENTURER_STAT_BALANCE, DEFENSE_STAT_BALANCE } from '../systems/combatBalance';

export const DEFENSE_ORDER: DefenseType[] = ['spikeTrap', 'fireTrap', 'roomLockTrap', 'slime', 'skeleton', 'goblin', 'guardian'];

export const ADVENTURER_ORDER: AdventurerRole[] = ['warrior', 'thief', 'mage', 'healer', 'cartographer'];

export const DEFENSE_DEFINITIONS: Record<DefenseType, DefenseDefinition> = {
  spikeTrap: {
    type: 'spikeTrap',
    kind: 'trap',
    name: 'Piege a pics',
    shortName: 'Pics',
    description: 'Classique, mesquin, tres mauvais pour les chevilles.',
    color: '#c8c1ad',
    ...DEFENSE_STAT_BALANCE.spikeTrap,
  },
  fireTrap: {
    type: 'fireTrap',
    kind: 'trap',
    name: 'Piege de feu',
    shortName: 'Feu',
    description: 'Un barbecue defensif. Les heros detestent etre la garniture.',
    color: '#d85a32',
    ...DEFENSE_STAT_BALANCE.fireTrap,
  },
  roomLockTrap: {
    type: 'roomLockTrap',
    kind: 'trap',
    name: 'Piege de verrouillage',
    shortName: 'Lock',
    description: 'Ferme une salle occupee: les issues se rouvrent quand ses defenseurs tombent.',
    color: '#6f7f91',
    ...DEFENSE_STAT_BALANCE.roomLockTrap,
  },
  slime: {
    type: 'slime',
    kind: 'minion',
    name: 'Slime',
    shortName: 'Slime',
    description: 'Peu glorieux, tres collant, et deja plus loyal que toi.',
    color: '#6dbb5d',
    ...DEFENSE_STAT_BALANCE.slime,
  },
  skeleton: {
    type: 'skeleton',
    kind: 'minion',
    name: 'Squelette',
    shortName: 'Os',
    description: 'Aucun moral a gerer. Aucun salaire. Management parfait.',
    color: '#d8d0b8',
    ...DEFENSE_STAT_BALANCE.skeleton,
  },
  goblin: {
    type: 'goblin',
    kind: 'minion',
    name: 'Gobelin',
    shortName: 'Gob',
    description: 'Rapide, bruyant, convaincu que le plan etait son idee.',
    color: '#9fbd4d',
    ...DEFENSE_STAT_BALANCE.goblin,
  },
  guardian: {
    type: 'guardian',
    kind: 'minion',
    name: 'Gardien de zone',
    shortName: 'Gard',
    description: "Elite unique: tient une salle importante sans remplacer le boss.",
    color: '#d65f5f',
    ...DEFENSE_STAT_BALANCE.guardian,
  },
};

export const ADVENTURER_DEFINITIONS: Record<AdventurerRole, AdventurerDefinition> = {
  warrior: {
    role: 'warrior',
    name: 'Guerrier',
    shortName: 'G',
    color: '#c88b4a',
    ...ADVENTURER_STAT_BALANCE.warrior,
  },
  thief: {
    role: 'thief',
    name: 'Voleur',
    shortName: 'V',
    color: '#7d94d6',
    ...ADVENTURER_STAT_BALANCE.thief,
  },
  mage: {
    role: 'mage',
    name: 'Mage',
    shortName: 'M',
    color: '#b873d6',
    ...ADVENTURER_STAT_BALANCE.mage,
  },
  healer: {
    role: 'healer',
    name: 'Soigneur',
    shortName: 'S',
    color: '#79c7a1',
    ...ADVENTURER_STAT_BALANCE.healer,
  },
  cartographer: {
    role: 'cartographer',
    name: 'Cartographe',
    shortName: 'C',
    color: '#d6b15f',
    ...ADVENTURER_STAT_BALANCE.cartographer,
  },
};

export function getDefenseDefinition(type: DefenseType): DefenseDefinition {
  return DEFENSE_DEFINITIONS[type];
}

export function getAdventurerDefinition(role: AdventurerRole): AdventurerDefinition {
  return ADVENTURER_DEFINITIONS[role];
}
