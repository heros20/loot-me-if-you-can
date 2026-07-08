import { ENTRANCE_MAP_ID, ENTRY_CELL, PARTY_SIZE, THIEF_MAX_LOCKPICKS_PER_EXPEDITION, cellKey } from '../game/constants';
import type { AdventurerEntity, AdventurerProfile, AdventurerRole, AdaptationMemory } from '../game/types';
import { getAdventurerDefinition } from '../entities/definitions';
import { COMBAT_ABILITY_BALANCE } from './combatAbilitySystem';
import { computeSpecialTreasureModifiers } from './specialTreasuresSystem';

const ADAPTIVE_ROLE_ORDER: AdventurerRole[] = ['warrior', 'thief', 'mage', 'healer', 'cartographer'];
const BASE_ROLE_SCORE: Record<AdventurerRole, number> = {
  warrior: 1.34,
  thief: 0.96,
  mage: 1.02,
  healer: 0.88,
  cartographer: 0.06,
};

export function buildWaveRoster(
  wave: number,
  memory: AdaptationMemory,
  hasActiveLockedDoor = false,
  fixedRoles: AdventurerRole[] = [],
): AdventurerRole[] {
  const roles: AdventurerRole[] = fixedRoles.slice(0, PARTY_SIZE);

  while (roles.length < PARTY_SIZE) {
    const nextRole = ADAPTIVE_ROLE_ORDER
      .map((role) => ({
        role,
        score: roleScore(role, wave, memory, roles, hasActiveLockedDoor),
      }))
      .sort((a, b) => b.score - a.score || ADAPTIVE_ROLE_ORDER.indexOf(a.role) - ADAPTIVE_ROLE_ORDER.indexOf(b.role))[0]?.role ?? 'warrior';

    roles.push(nextRole);
  }

  return roles;
}

export function createAdventurer(profile: AdventurerProfile, id: string, wave: number, index: number): AdventurerEntity {
  const role = profile.role;
  const definition = getAdventurerDefinition(role);
  const hpScale = 1 + (wave - 1) * 0.13;
  const damageScale = 1 + (wave - 1) * 0.08;
  const speedScale = 1 + Math.min(0.22, (wave - 1) * 0.012);
  const veteranScale = 1 + profile.survivedExpeditions * 0.08 + Math.min(0.18, profile.reputation * 0.01);
  const heirScale = profile.heirOfProfileId ? 1.12 : 1;
  const levelScale = 1 + (profile.level - 1) * 0.06;
  const courageDamage = profile.traits.includes('courageous') ? 1.05 : 1;
  const cautionHp = profile.traits.includes('cautious') ? 1.04 : 1;
  const greedSpeed = profile.traits.includes('greedy') ? 1.04 : 1;
  const specialModifiers = computeSpecialTreasureModifiers(profile);
  const injuryPerformanceMultiplier = profile.injuries.reduce(
    (multiplier, injury) => multiplier * injury.performanceMultiplier,
    1,
  );
  const spawnOffset = ((index % 5) - 2) * 0.08;

  const baseMaxHp = Math.round(definition.hp * hpScale * veteranScale * levelScale * cautionHp * heirScale * injuryPerformanceMultiplier)
    + specialModifiers.maxHpBonus;
  const baseDamage = Math.max(
    1,
    Math.round(definition.damage * damageScale * veteranScale * levelScale * courageDamage * heirScale * injuryPerformanceMultiplier)
      + specialModifiers.damageBonus,
  );

  return {
    id,
    mapId: ENTRANCE_MAP_ID,
    profileId: profile.id,
    role,
    name: profile.name,
    level: profile.level,
    personality: profile.dominantPersonality,
    traits: [...profile.traits],
    nemesisDefenseType: profile.nemesisDefenseType,
    x: ENTRY_CELL.x,
    y: ENTRY_CELL.y + spawnOffset,
    hp: baseMaxHp,
    maxHp: baseMaxHp,
    damage: baseDamage,
    speed: definition.speed * speedScale * greedSpeed * injuryPerformanceMultiplier,
    attackRange: definition.attackRange,
    attackCooldownMs: definition.attackCooldownMs,
    attackTimerMs: 180 + index * 70,
    healTimerMs: definition.healCooldownMs ?? 1000,
    abilityCooldowns: {},
    abilityFxTimerMs: 0,
    damageReductionTimerMs: 0,
    thiefTrapInterventionsRemaining: role === 'thief' ? COMBAT_ABILITY_BALANCE.thiefTrapInterventionsPerExpedition : 0,
    lockpicksUsedThisExpedition: 0,
    maxLockpicksPerExpedition: role === 'thief' ? THIEF_MAX_LOCKPICKS_PER_EXPEDITION : 0,
    trapDamageMultiplier: definition.trapDamageMultiplier * (profile.dominantPersonality === 'cautious' ? 0.9 : 1),
    injuryPerformanceMultiplier,
    speedMultiplier: 1,
    slowedTimerMs: 0,
    targetStage: 'treasure',
    targetTreasureId: null,
    behaviorState: 'advancing',
    path: [],
    lastCellKey: cellKey(ENTRY_CELL),
    currentZoneId: null,
    lastImportantZoneId: null,
    lastEvaluatedRoomKey: null,
    alive: true,
    escaped: false,
    hasEnteredDungeon: false,
    carryingTreasure: false,
    stunnedTimerMs: 0,
    fearTimerMs: 0,
    fearPreviousStage: null,
    retreatIntent: 'none',
    retreatIntentTimerMs: 0,
    hesitationTimerMs: 0,
    decisionSpeedMultiplier: 1,
    barkText: null,
    barkTimerMs: 0,
    barkCooldownMs: index * 220,
    lastBarkKey: null,
    lastAvoidedTrapKey: null,
    lootFeedbackText: null,
    lootFeedbackTimerMs: 0,
    isHeir: profile.heirOfProfileId !== null,
    specialTreasureBonuses: [...profile.specialTreasureBonuses],
  };
}

function roleScore(
  role: AdventurerRole,
  wave: number,
  memory: AdaptationMemory,
  currentRoles: AdventurerRole[],
  hasActiveLockedDoor: boolean,
): number {
  const currentCount = currentRoles.filter((candidate) => candidate === role).length;

  if (role === 'cartographer' && currentCount >= 1) {
    return -100;
  }

  if (currentCount >= 2) {
    return -100;
  }

  const pressure = memory.rolePressure[role] ?? 0;
  const waveBias = ((wave + ADAPTIVE_ROLE_ORDER.indexOf(role)) % ADAPTIVE_ROLE_ORDER.length) * 0.045;
  const trapLearningBias = role === 'thief' ? Math.max(0, memory.trapAvoidance - 0.35) * 0.36 : 0;
  const cartographyBias = role === 'cartographer'
    ? Math.max(0, pressure) * 0.72 + (wave >= 2 ? 0.16 : 0)
    : 0;
  // Une porte verrouillee connue du Royaume doit quasi-garantir un voleur dans le prochain contrat (D-012).
  const lockedDoorBias = role === 'thief' && hasActiveLockedDoor && currentCount === 0 ? 0.9 : 0;
  const duplicatePenalty = currentCount * 1.08 + Math.max(0, currentCount - 1) * 0.68;

  return BASE_ROLE_SCORE[role] + pressure * 1.22 + waveBias + trapLearningBias + cartographyBias + lockedDoorBias - duplicatePenalty;
}
