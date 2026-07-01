import { ENTRY_CELL, cellKey } from '../game/constants';
import type { AdventurerEntity, AdventurerProfile, AdventurerRole, AdaptationMemory } from '../game/types';
import { getAdventurerDefinition } from '../entities/definitions';

const ROLE_CYCLE: AdventurerRole[] = ['warrior', 'thief', 'mage', 'warrior', 'healer', 'mage'];

export function buildWaveRoster(wave: number, memory: AdaptationMemory): AdventurerRole[] {
  const roles: AdventurerRole[] = ['warrior', 'thief', 'mage'];

  if (wave >= 2) {
    roles.push('warrior');
  }

  if (wave >= 3) {
    roles.push('healer');
  }

  addRoles(roles, 'thief', memory.rolePressure.thief);
  addRoles(roles, 'healer', memory.rolePressure.healer);
  addRoles(roles, 'warrior', memory.rolePressure.warrior);

  const targetCount = Math.min(18, 3 + wave + Math.floor(wave / 2));
  let cycleIndex = wave % ROLE_CYCLE.length;

  while (roles.length < targetCount) {
    roles.push(ROLE_CYCLE[cycleIndex] ?? 'warrior');
    cycleIndex = (cycleIndex + 1) % ROLE_CYCLE.length;
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
  const levelScale = 1 + (profile.level - 1) * 0.06;
  const courageDamage = profile.traits.includes('courageous') ? 1.05 : 1;
  const cautionHp = profile.traits.includes('cautious') ? 1.04 : 1;
  const greedSpeed = profile.traits.includes('greedy') ? 1.04 : 1;
  const injuryPerformanceMultiplier = profile.injuries.reduce(
    (multiplier, injury) => multiplier * injury.performanceMultiplier,
    1,
  );
  const spawnOffset = ((index % 5) - 2) * 0.08;

  return {
    id,
    profileId: profile.id,
    role,
    name: profile.name,
    level: profile.level,
    personality: profile.dominantPersonality,
    traits: [...profile.traits],
    nemesisDefenseType: profile.nemesisDefenseType,
    x: ENTRY_CELL.x,
    y: ENTRY_CELL.y + spawnOffset,
    hp: Math.round(definition.hp * hpScale * veteranScale * levelScale * cautionHp * injuryPerformanceMultiplier),
    maxHp: Math.round(definition.hp * hpScale * veteranScale * levelScale * cautionHp * injuryPerformanceMultiplier),
    damage: Math.max(1, Math.round(definition.damage * damageScale * veteranScale * levelScale * courageDamage * injuryPerformanceMultiplier)),
    speed: definition.speed * speedScale * greedSpeed * injuryPerformanceMultiplier,
    attackRange: definition.attackRange,
    attackCooldownMs: definition.attackCooldownMs,
    attackTimerMs: 180 + index * 70,
    healTimerMs: definition.healCooldownMs ?? 1000,
    trapDamageMultiplier: definition.trapDamageMultiplier * (profile.dominantPersonality === 'cautious' ? 0.9 : 1),
    injuryPerformanceMultiplier,
    speedMultiplier: 1,
    slowedTimerMs: 0,
    targetStage: 'treasure',
    path: [],
    lastCellKey: cellKey(ENTRY_CELL),
    alive: true,
    escaped: false,
  };
}

function addRoles(roles: AdventurerRole[], role: AdventurerRole, pressure: number): void {
  const count = Math.min(4, pressure);

  for (let i = 0; i < count; i += 1) {
    roles.push(role);
  }
}
