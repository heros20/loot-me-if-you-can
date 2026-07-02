import type { BossAbilityState, BossAbilityType, BossEntity } from '../game/types';

export interface BossAbilityDefinition {
  type: BossAbilityType;
  name: string;
  shortName: string;
  description: string;
  cooldownMs: number;
  radius: number;
  damage?: number;
  stunMs?: number;
  fearMs?: number;
  summonCount?: number;
  maxUsesPerWave: number;
}

export const BOSS_ABILITY_ORDER: BossAbilityType[] = ['shockwave', 'roar', 'summon'];

export const BOSS_ABILITY_DEFINITIONS: Record<BossAbilityType, BossAbilityDefinition> = {
  shockwave: {
    type: 'shockwave',
    name: 'Onde de choc',
    shortName: 'Onde',
    description: 'Le sol tremble. Les genoux des heros aussi. Degats de zone autour du boss.',
    cooldownMs: 9000,
    radius: 2.9,
    damage: 22,
    stunMs: 900,
    maxUsesPerWave: 3,
  },
  roar: {
    type: 'roar',
    name: 'Rugissement',
    shortName: 'Cri',
    description: 'Un argument sonore. Les intrus proches fuient vers la sortie un court instant.',
    cooldownMs: 14000,
    radius: 4.2,
    fearMs: 2600,
    maxUsesPerWave: 2,
  },
  summon: {
    type: 'summon',
    name: 'Renforts osseux',
    shortName: 'Os+',
    description: 'Deux squelettes interimaires surgissent pres du boss. Contrat: une vague.',
    cooldownMs: 20000,
    radius: 1.6,
    summonCount: 2,
    maxUsesPerWave: 1,
  },
};

export function createBossAbilities(): Record<BossAbilityType, BossAbilityState> {
  return {
    shockwave: { type: 'shockwave', cooldownRemainingMs: 0, usesThisWave: 0 },
    roar: { type: 'roar', cooldownRemainingMs: 0, usesThisWave: 0 },
    summon: { type: 'summon', cooldownRemainingMs: 0, usesThisWave: 0 },
  };
}

export function tickBossAbilities(boss: BossEntity, deltaMs: number): void {
  BOSS_ABILITY_ORDER.forEach((type) => {
    const ability = boss.abilities[type];
    ability.cooldownRemainingMs = Math.max(0, ability.cooldownRemainingMs - deltaMs);
  });
}

export function resetBossAbilitiesForWave(boss: BossEntity): void {
  BOSS_ABILITY_ORDER.forEach((type) => {
    const ability = boss.abilities[type];
    ability.cooldownRemainingMs = 0;
    ability.usesThisWave = 0;
  });
}

export function canUseBossAbility(boss: BossEntity, type: BossAbilityType): boolean {
  const ability = boss.abilities[type];
  const definition = BOSS_ABILITY_DEFINITIONS[type];
  return ability.cooldownRemainingMs <= 0 && ability.usesThisWave < definition.maxUsesPerWave;
}

export function consumeBossAbility(boss: BossEntity, type: BossAbilityType): void {
  const ability = boss.abilities[type];
  ability.cooldownRemainingMs = BOSS_ABILITY_DEFINITIONS[type].cooldownMs;
  ability.usesThisWave += 1;
}
