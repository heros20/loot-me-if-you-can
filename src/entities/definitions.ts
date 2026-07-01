import type {
  AdventurerDefinition,
  AdventurerRole,
  DefenseDefinition,
  DefenseType,
} from '../game/types';

export const DEFENSE_ORDER: DefenseType[] = ['spikeTrap', 'fireTrap', 'slime', 'skeleton', 'goblin'];

export const ADVENTURER_ORDER: AdventurerRole[] = ['warrior', 'thief', 'mage', 'healer'];

export const DEFENSE_DEFINITIONS: Record<DefenseType, DefenseDefinition> = {
  spikeTrap: {
    type: 'spikeTrap',
    kind: 'trap',
    name: 'Piege a pics',
    shortName: 'Pics',
    description: 'Classique, mesquin, tres mauvais pour les chevilles.',
    cost: 4,
    color: '#c8c1ad',
    trapDamage: 24,
    trapCooldownMs: 1450,
  },
  fireTrap: {
    type: 'fireTrap',
    kind: 'trap',
    name: 'Piege de feu',
    shortName: 'Feu',
    description: 'Un barbecue defensif. Les heros detestent etre la garniture.',
    cost: 7,
    color: '#d85a32',
    trapDamage: 34,
    trapCooldownMs: 2100,
  },
  slime: {
    type: 'slime',
    kind: 'minion',
    name: 'Slime',
    shortName: 'Slime',
    description: 'Peu glorieux, tres collant, et deja plus loyal que toi.',
    cost: 5,
    color: '#6dbb5d',
    hp: 48,
    damage: 5,
    attackRange: 1.1,
    attackCooldownMs: 760,
  },
  skeleton: {
    type: 'skeleton',
    kind: 'minion',
    name: 'Squelette',
    shortName: 'Os',
    description: 'Aucun moral a gerer. Aucun salaire. Management parfait.',
    cost: 8,
    color: '#d8d0b8',
    hp: 38,
    damage: 12,
    attackRange: 1.25,
    attackCooldownMs: 1180,
  },
  goblin: {
    type: 'goblin',
    kind: 'minion',
    name: 'Gobelin',
    shortName: 'Gob',
    description: 'Rapide, bruyant, convaincu que le plan etait son idee.',
    cost: 6,
    color: '#9fbd4d',
    hp: 32,
    damage: 7,
    attackRange: 1.15,
    attackCooldownMs: 560,
  },
};

export const ADVENTURER_DEFINITIONS: Record<AdventurerRole, AdventurerDefinition> = {
  warrior: {
    role: 'warrior',
    name: 'Guerrier',
    shortName: 'G',
    color: '#c88b4a',
    hp: 72,
    damage: 7,
    speed: 0.00175,
    attackRange: 1.18,
    attackCooldownMs: 820,
    trapDamageMultiplier: 0.92,
  },
  thief: {
    role: 'thief',
    name: 'Voleur',
    shortName: 'V',
    color: '#7d94d6',
    hp: 44,
    damage: 5,
    speed: 0.00235,
    attackRange: 1.05,
    attackCooldownMs: 610,
    trapDamageMultiplier: 0.48,
  },
  mage: {
    role: 'mage',
    name: 'Mage',
    shortName: 'M',
    color: '#b873d6',
    hp: 34,
    damage: 13,
    speed: 0.00162,
    attackRange: 2.55,
    attackCooldownMs: 1160,
    trapDamageMultiplier: 1,
  },
  healer: {
    role: 'healer',
    name: 'Soigneur',
    shortName: 'S',
    color: '#79c7a1',
    hp: 40,
    damage: 3,
    speed: 0.00172,
    attackRange: 1.8,
    attackCooldownMs: 980,
    trapDamageMultiplier: 0.95,
    healAmount: 10,
    healRange: 2.4,
    healCooldownMs: 1200,
  },
};

export function getDefenseDefinition(type: DefenseType): DefenseDefinition {
  return DEFENSE_DEFINITIONS[type];
}

export function getAdventurerDefinition(role: AdventurerRole): AdventurerDefinition {
  return ADVENTURER_DEFINITIONS[role];
}
