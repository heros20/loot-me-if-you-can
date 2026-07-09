import type { AdventurerDefinition, AdventurerRole, DefenseDefinition, DefenseType } from '../game/types';

export const BOSS_BALANCE = {
  // Final threat: high enough to end a careless longrun, still killable by a prepared party.
  maxHp: 360,
  damage: 17,
  attackRange: 1.25,
  detectionRange: 3.5,
  leashRange: 3.1,
  attackCooldownMs: 780,
} as const;

export const ADVENTURER_SCALING_BALANCE = {
  hpPerWave: 0.115,
  damagePerWave: 0.065,
  speedPerWave: 0.01,
  maxSpeedScaleBonus: 0.18,
  veteranHpDamagePerSurvival: 0.07,
  reputationScalePerPoint: 0.008,
  maxReputationScaleBonus: 0.16,
  levelScalePerLevel: 0.055,
  heirScale: 1.1,
} as const;

export const DEFENSE_STAT_BALANCE: Record<DefenseType, Omit<DefenseDefinition, 'type' | 'kind' | 'name' | 'shortName' | 'description' | 'color'>> = {
  spikeTrap: {
    cost: 5,
    trapDamage: 22,
    trapCooldownMs: 1450,
  },
  fireTrap: {
    cost: 9,
    trapDamage: 31,
    trapCooldownMs: 2150,
  },
  roomLockTrap: {
    cost: 12,
    trapDamage: 0,
    trapCooldownMs: 0,
  },
  slime: {
    cost: 6,
    hp: 52,
    damage: 5,
    attackRange: 1.1,
    attackCooldownMs: 780,
  },
  skeleton: {
    cost: 9,
    hp: 42,
    damage: 11,
    attackRange: 1.25,
    attackCooldownMs: 1220,
  },
  goblin: {
    cost: 7,
    hp: 34,
    damage: 7,
    attackRange: 1.15,
    attackCooldownMs: 580,
  },
  guardian: {
    cost: 22,
    hp: 118,
    damage: 13,
    attackRange: 1.25,
    attackCooldownMs: 980,
  },
} as const;

export const ADVENTURER_STAT_BALANCE: Record<AdventurerRole, Omit<AdventurerDefinition, 'role' | 'name' | 'shortName' | 'color'>> = {
  warrior: {
    hp: 72,
    damage: 7,
    speed: 0.00175,
    attackRange: 1.18,
    attackCooldownMs: 820,
    trapDamageMultiplier: 0.92,
  },
  thief: {
    hp: 44,
    damage: 5,
    speed: 0.00235,
    attackRange: 1.05,
    attackCooldownMs: 610,
    trapDamageMultiplier: 0.48,
  },
  mage: {
    hp: 34,
    damage: 13,
    speed: 0.00162,
    attackRange: 2.55,
    attackCooldownMs: 1160,
    trapDamageMultiplier: 1,
  },
  healer: {
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
  cartographer: {
    hp: 38,
    damage: 4,
    speed: 0.00166,
    attackRange: 1.55,
    attackCooldownMs: 1040,
    trapDamageMultiplier: 1.02,
  },
} as const;
