import { cellKey } from '../game/constants';
import { getDefenseDefinition } from '../entities/definitions';
import { findVisibleTrap } from './adventurerDecisionSystem';
import { chooseThreatTarget } from './combatThreatSystem';
import { SPECIAL_TREASURE_BALANCE } from './specialTreasuresSystem';
import type {
  AdventurerEntity,
  BossEntity,
  CombatAbilityId,
  DefenseEntity,
  DungeonDoor,
  GridCell,
  WaveStats,
} from '../game/types';
import type { BarkKind } from './barkSystem';

export const COMBAT_ABILITY_BALANCE = {
  warriorTauntCooldownMs: 6400,
  warriorTauntDurationMs: 2600,
  warriorGuardDurationMs: 3200,
  warriorDamageReduction: 0.28,
  thiefTrapInterventionsPerExpedition: 2,
  thiefTrapMitigationCooldownMs: 3600,
  thiefTrapSuppressionMs: 3400,
  healerSingleCooldownMs: 2600,
  healerSingleAmount: 10,
  healerSingleRange: 2.45,
  healerGroupCooldownMs: 8200,
  healerGroupAmount: 5,
  healerGroupRange: 2.2,
  mageIceShardCooldownMs: 4600,
  mageIceShardDamage: 8,
  mageIceShardSlowMs: 2200,
  mageFrostZoneCooldownMs: 9000,
  mageFrostZoneSlowMs: 2600,
  mageFrostZoneRange: 3.0,
  goblinSneakCooldownMs: 2800,
  goblinSneakBonusDamage: 3,
  skeletonHeavyCooldownMs: 5600,
  skeletonHeavyBonusDamage: 5,
  skeletonHeavySlowMs: 900,
  slimeStickyCooldownMs: 3600,
  slimeStickySlowMs: 1800,
  abilityFxMs: 520,
};

export interface AdventurerAbilityContext {
  adventurers: AdventurerEntity[];
  defenses: DefenseEntity[];
  boss: BossEntity;
  doors: DungeonDoor[];
  stats: WaveStats;
  elapsedMs: number;
  damageMinion: (target: DefenseEntity, damage: number, attacker: AdventurerEntity) => void;
  damageBoss: (damage: number, attacker: AdventurerEntity) => void;
  healAdventurer: (target: AdventurerEntity, amount: number, healer?: AdventurerEntity) => number;
  suppressTrap: (trap: DefenseEntity, durationMs: number) => void;
  bark: (adventurer: AdventurerEntity, kind: BarkKind) => void;
  message: (text: string) => void;
  rememberTrap: (cell: GridCell, danger: number) => void;
}

export interface DefenseAbilityContext {
  adventurers: AdventurerEntity[];
  doors: DungeonDoor[];
  stats: WaveStats;
  damageAdventurer: (target: AdventurerEntity, damage: number, source: DefenseEntity) => number;
  message: (text: string) => void;
}

export function createEmptyCombatAbilityStats(): WaveStats['abilityStats'] {
  return {
    warriorTaunts: 0,
    warriorProtectedDamage: 0,
    thiefTrapMitigations: 0,
    thiefTrapOverwhelmed: 0,
    healerSingleHeals: 0,
    healerGroupHeals: 0,
    healerHealing: 0,
    mageIceShards: 0,
    mageFrostZones: 0,
    mageDamage: 0,
    mageSlows: 0,
    goblinSneakAttacks: 0,
    skeletonHeavyStrikes: 0,
    slimeStickyGels: 0,
    slimeStickyApplications: 0,
  };
}

export function tickCombatAbilityCooldowns(
  cooldowns: Partial<Record<CombatAbilityId, number>>,
  deltaMs: number,
): void {
  Object.entries(cooldowns).forEach(([ability, remainingMs]) => {
    cooldowns[ability as CombatAbilityId] = Math.max(0, (remainingMs ?? 0) - deltaMs);
  });
}

export function tryUseAdventurerAbility(
  adventurer: AdventurerEntity,
  context: AdventurerAbilityContext,
): boolean {
  if (!adventurer.alive || adventurer.escaped || adventurer.stunnedTimerMs > 0 || adventurer.hesitationTimerMs > 0) {
    return false;
  }

  if (adventurer.role === 'warrior') {
    return tryWarriorTaunt(adventurer, context);
  }

  if (adventurer.role === 'thief') {
    return tryThiefTrapMitigation(adventurer, context);
  }

  if (adventurer.role === 'healer') {
    return tryHealerGroupHeal(adventurer, context) || tryHealerSingleHeal(adventurer, context);
  }

  if (adventurer.role === 'mage') {
    return tryMageFrostZone(adventurer, context) || tryMageIceShard(adventurer, context);
  }

  return false;
}

export function tryUseDefenseAbility(
  defense: DefenseEntity,
  context: DefenseAbilityContext,
): boolean {
  if (!defense.alive || defense.kind !== 'minion') {
    return false;
  }

  if (defense.type === 'goblin') {
    return tryGoblinSneakAttack(defense, context);
  }

  if (defense.type === 'skeleton') {
    return trySkeletonHeavyStrike(defense, context);
  }

  if (defense.type === 'slime') {
    return trySlimeStickyGel(defense, context);
  }

  return false;
}

export function buildCombatAbilityReportLines(stats: WaveStats): string[] {
  const ability = stats.abilityStats;
  const lines: string[] = [];

  if (ability.warriorTaunts > 0 || ability.warriorProtectedDamage > 0) {
    lines.push(`Le guerrier a protege le groupe ${ability.warriorTaunts} fois, absorbant ${Math.round(ability.warriorProtectedDamage)} degats.`);
  }

  if (ability.thiefTrapMitigations > 0) {
    lines.push(`Le voleur a reduit l'impact de ${ability.thiefTrapMitigations} piege${ability.thiefTrapMitigations > 1 ? 's' : ''}.`);
  }

  if (ability.thiefTrapOverwhelmed > 0) {
    lines.push(`Le voleur a ete deborde par trop de mecanismes ${ability.thiefTrapOverwhelmed} fois.`);
  }

  if (ability.healerSingleHeals + ability.healerGroupHeals > 0) {
    lines.push(`Le soigneur a rendu ${Math.round(ability.healerHealing)} PV sans rendre l'expedition immortelle.`);
  }

  if (ability.mageIceShards + ability.mageFrostZones > 0) {
    lines.push(`Le mage a ralenti ${ability.mageSlows} menace${ability.mageSlows > 1 ? 's' : ''} avec la glace.`);
  }

  if (ability.slimeStickyApplications > 0) {
    lines.push(`Le slime a colle ${ability.slimeStickyApplications} aventurier${ability.slimeStickyApplications > 1 ? 's' : ''} dans les couloirs.`);
  }

  if (ability.goblinSneakAttacks > 0) {
    lines.push(`Un gobelin a profite d'une cible occupee pour frapper sournoisement ${ability.goblinSneakAttacks} fois.`);
  }

  if (ability.skeletonHeavyStrikes > 0) {
    lines.push(`Le squelette a impose ${ability.skeletonHeavyStrikes} coup${ability.skeletonHeavyStrikes > 1 ? 's' : ''} lourd${ability.skeletonHeavyStrikes > 1 ? 's' : ''}.`);
  }

  return lines.slice(0, 4);
}

function tryWarriorTaunt(adventurer: AdventurerEntity, context: AdventurerAbilityContext): boolean {
  if ((adventurer.abilityCooldowns.warriorTaunt ?? 0) > 0) {
    return false;
  }

  const fragileAlly = context.adventurers.find(
    (ally) =>
      ally.id !== adventurer.id &&
      ally.alive &&
      !ally.escaped &&
      (ally.role === 'healer' || ally.role === 'mage' || ally.role === 'cartographer' || ally.hp / ally.maxHp < 0.42) &&
      distance(adventurer.x, adventurer.y, ally.x, ally.y) <= 2.4,
  );

  if (!fragileAlly) {
    return false;
  }

  const minion = context.defenses.find(
    (defense) =>
      defense.alive &&
      defense.kind === 'minion' &&
      distance(defense.x, defense.y, fragileAlly.x, fragileAlly.y) <= 1.65 &&
      distance(defense.x, defense.y, adventurer.x, adventurer.y) <= 3.1,
  );
  const bossThreatens = distance(context.boss.x, context.boss.y, fragileAlly.x, fragileAlly.y) <= context.boss.attackRange + 1.1 &&
    distance(context.boss.x, context.boss.y, adventurer.x, adventurer.y) <= context.boss.detectionRange;

  if (!minion && !bossThreatens) {
    return false;
  }

  if (minion) {
    minion.tauntedByAdventurerId = adventurer.id;
    minion.tauntTimerMs = COMBAT_ABILITY_BALANCE.warriorTauntDurationMs;
  }

  if (bossThreatens) {
    context.boss.tauntedByAdventurerId = adventurer.id;
    context.boss.tauntTimerMs = COMBAT_ABILITY_BALANCE.warriorTauntDurationMs;
  }

  adventurer.damageReductionTimerMs = Math.max(adventurer.damageReductionTimerMs, COMBAT_ABILITY_BALANCE.warriorGuardDurationMs);
  adventurer.abilityCooldowns.warriorTaunt = COMBAT_ABILITY_BALANCE.warriorTauntCooldownMs;
  adventurer.abilityFxTimerMs = COMBAT_ABILITY_BALANCE.abilityFxMs;
  context.stats.abilityStats.warriorTaunts += 1;
  context.stats.abilityUses += 1;
  context.bark(adventurer, 'warriorTaunt');
  context.message(`${adventurer.name} provoque la menace pour couvrir ${fragileAlly.name}.`);
  return true;
}

function tryThiefTrapMitigation(adventurer: AdventurerEntity, context: AdventurerAbilityContext): boolean {
  if ((adventurer.abilityCooldowns.thiefTrapMitigation ?? 0) > 0 || adventurer.targetStage === 'exit') {
    return false;
  }

  const trap = findVisibleTrap(adventurer, context.defenses);

  if (!trap || trap.cooldownRemainingMs > 0) {
    return false;
  }

  if (adventurer.thiefTrapInterventionsRemaining <= 0) {
    adventurer.abilityCooldowns.thiefTrapMitigation = 2200;
    context.stats.abilityStats.thiefTrapOverwhelmed += 1;
    context.bark(adventurer, 'trapThiefOverwhelmed');
    context.message(`${adventurer.name} voit le piege, mais trop tard pour tout neutraliser.`);
    return false;
  }

  context.suppressTrap(trap, COMBAT_ABILITY_BALANCE.thiefTrapSuppressionMs);
  trap.trapState = 'disarmed';
  trap.roomLockMinionIds = [];
  trap.roomLockZoneId = null;
  adventurer.thiefTrapInterventionsRemaining -= 1;
  adventurer.abilityCooldowns.thiefTrapMitigation = COMBAT_ABILITY_BALANCE.thiefTrapMitigationCooldownMs;
  adventurer.attackTimerMs = Math.max(adventurer.attackTimerMs, Math.round(adventurer.attackCooldownMs * 0.55));
  adventurer.abilityFxTimerMs = COMBAT_ABILITY_BALANCE.abilityFxMs;
  context.stats.abilityStats.thiefTrapMitigations += 1;
  context.stats.thiefTrapMitigations += 1;
  context.stats.abilityUses += 1;
  context.stats.storyEvents.push(`${adventurer.name} desamorce le ${getDefenseDefinition(trap.type).name}.`);
  context.rememberTrap(trap.cell, 0.35);
  context.bark(adventurer, 'trapThief');
  context.message(`${adventurer.name}: Piege desamorce.`);
  return true;
}

function tryHealerSingleHeal(adventurer: AdventurerEntity, context: AdventurerAbilityContext): boolean {
  if ((adventurer.abilityCooldowns.healerSingleHeal ?? 0) > 0) {
    return false;
  }

  const target = context.adventurers
    .filter((ally) => ally.alive && !ally.escaped && ally.hp / ally.maxHp <= 0.62)
    .map((ally) => ({ ally, distance: distance(adventurer.x, adventurer.y, ally.x, ally.y) }))
    .filter((entry) => entry.distance <= COMBAT_ABILITY_BALANCE.healerSingleRange)
    .sort((a, b) => a.ally.hp / a.ally.maxHp - b.ally.hp / b.ally.maxHp)[0]?.ally ?? null;

  if (!target) {
    return false;
  }

  const amount = COMBAT_ABILITY_BALANCE.healerSingleAmount + healerTechniqueBonus(adventurer);
  const healed = context.healAdventurer(target, amount, adventurer);

  if (healed <= 0) {
    return false;
  }

  adventurer.abilityCooldowns.healerSingleHeal = COMBAT_ABILITY_BALANCE.healerSingleCooldownMs;
  adventurer.abilityFxTimerMs = COMBAT_ABILITY_BALANCE.abilityFxMs;
  context.stats.abilityStats.healerSingleHeals += 1;
  context.stats.abilityStats.healerHealing += healed;
  context.stats.healingDone += healed;
  context.stats.abilityUses += 1;
  context.bark(adventurer, 'healerHeal');
  return true;
}

function tryHealerGroupHeal(adventurer: AdventurerEntity, context: AdventurerAbilityContext): boolean {
  if ((adventurer.abilityCooldowns.healerGroupHeal ?? 0) > 0) {
    return false;
  }

  const wounded = context.adventurers
    .filter((ally) => ally.alive && !ally.escaped && ally.hp / ally.maxHp <= 0.76)
    .filter((ally) => distance(adventurer.x, adventurer.y, ally.x, ally.y) <= COMBAT_ABILITY_BALANCE.healerGroupRange);

  if (wounded.length < 3) {
    return false;
  }

  const amount = COMBAT_ABILITY_BALANCE.healerGroupAmount + healerTechniqueBonus(adventurer);
  const healed = wounded.reduce((total, ally) => total + context.healAdventurer(ally, amount, adventurer), 0);

  if (healed <= 0) {
    return false;
  }

  adventurer.abilityCooldowns.healerGroupHeal = COMBAT_ABILITY_BALANCE.healerGroupCooldownMs;
  adventurer.abilityCooldowns.healerSingleHeal = Math.max(adventurer.abilityCooldowns.healerSingleHeal ?? 0, 1100);
  adventurer.abilityFxTimerMs = COMBAT_ABILITY_BALANCE.abilityFxMs;
  context.stats.abilityStats.healerGroupHeals += 1;
  context.stats.abilityStats.healerHealing += healed;
  context.stats.healingDone += healed;
  context.stats.abilityUses += 1;
  context.bark(adventurer, 'healerGroupHeal');
  return true;
}

function tryMageIceShard(adventurer: AdventurerEntity, context: AdventurerAbilityContext): boolean {
  if ((adventurer.abilityCooldowns.mageIceShard ?? 0) > 0 || adventurer.attackTimerMs > 0) {
    return false;
  }

  const target = context.defenses
    .filter((defense) => defense.alive && defense.kind === 'minion')
    .map((defense) => ({ defense, distance: distance(adventurer.x, adventurer.y, defense.x, defense.y) }))
    .filter((entry) => entry.distance <= adventurer.attackRange + 0.55)
    .sort((a, b) => a.distance - b.distance)[0]?.defense ?? null;

  if (!target) {
    return false;
  }

  context.damageMinion(target, COMBAT_ABILITY_BALANCE.mageIceShardDamage, adventurer);
  target.slowedTimerMs = Math.max(target.slowedTimerMs, COMBAT_ABILITY_BALANCE.mageIceShardSlowMs);
  target.abilityFxTimerMs = COMBAT_ABILITY_BALANCE.abilityFxMs;
  adventurer.abilityCooldowns.mageIceShard = COMBAT_ABILITY_BALANCE.mageIceShardCooldownMs;
  adventurer.attackTimerMs = Math.max(adventurer.attackTimerMs, Math.round(adventurer.attackCooldownMs * 0.65));
  adventurer.abilityFxTimerMs = COMBAT_ABILITY_BALANCE.abilityFxMs;
  context.stats.abilityStats.mageIceShards += 1;
  context.stats.abilityStats.mageDamage += COMBAT_ABILITY_BALANCE.mageIceShardDamage;
  context.stats.abilityStats.mageSlows += 1;
  context.stats.abilityUses += 1;
  context.bark(adventurer, 'mageIce');
  return true;
}

function tryMageFrostZone(adventurer: AdventurerEntity, context: AdventurerAbilityContext): boolean {
  if ((adventurer.abilityCooldowns.mageFrostZone ?? 0) > 0) {
    return false;
  }

  const targets = context.defenses
    .filter((defense) => defense.alive && defense.kind === 'minion')
    .filter((defense) => distance(adventurer.x, adventurer.y, defense.x, defense.y) <= COMBAT_ABILITY_BALANCE.mageFrostZoneRange);

  if (targets.length < 2) {
    return false;
  }

  targets.forEach((target) => {
    target.slowedTimerMs = Math.max(target.slowedTimerMs, COMBAT_ABILITY_BALANCE.mageFrostZoneSlowMs);
    target.abilityFxTimerMs = COMBAT_ABILITY_BALANCE.abilityFxMs;
  });
  adventurer.abilityCooldowns.mageFrostZone = COMBAT_ABILITY_BALANCE.mageFrostZoneCooldownMs;
  adventurer.abilityFxTimerMs = COMBAT_ABILITY_BALANCE.abilityFxMs;
  context.stats.abilityStats.mageFrostZones += 1;
  context.stats.abilityStats.mageSlows += targets.length;
  context.stats.abilityUses += 1;
  context.bark(adventurer, 'mageIce');
  context.message(`${adventurer.name} ralentit ${targets.length} monstres avec un gel bref.`);
  return true;
}

function tryGoblinSneakAttack(defense: DefenseEntity, context: DefenseAbilityContext): boolean {
  if ((defense.abilityCooldowns.goblinSneakAttack ?? 0) > 0) {
    return false;
  }

  const target = findMinionTarget(defense, context.adventurers, 1.2, (adventurer) =>
    adventurer.slowedTimerMs > 0 ||
    adventurer.hesitationTimerMs > 0 ||
    adventurer.stunnedTimerMs > 0 ||
    isNearLockedDoor(adventurer, context.doors) ||
    context.adventurers.some((ally) => ally.id !== adventurer.id && ally.alive && !ally.escaped && distance(ally.x, ally.y, adventurer.x, adventurer.y) < 0.7),
  );

  if (!target) {
    return false;
  }

  const damage = (getDefenseDefinition(defense.type).damage ?? 1) + COMBAT_ABILITY_BALANCE.goblinSneakBonusDamage;
  context.damageAdventurer(target, damage, defense);
  defense.abilityCooldowns.goblinSneakAttack = COMBAT_ABILITY_BALANCE.goblinSneakCooldownMs;
  defense.cooldownRemainingMs = Math.max(defense.cooldownRemainingMs, 420);
  defense.abilityFxTimerMs = COMBAT_ABILITY_BALANCE.abilityFxMs;
  context.stats.abilityStats.goblinSneakAttacks += 1;
  context.stats.abilityUses += 1;
  context.message(`${defense.name} place un coup sournois.`);
  return true;
}

function trySkeletonHeavyStrike(defense: DefenseEntity, context: DefenseAbilityContext): boolean {
  if ((defense.abilityCooldowns.skeletonHeavyStrike ?? 0) > 0) {
    return false;
  }

  const target = findMinionTarget(defense, context.adventurers, 1.25);

  if (!target) {
    return false;
  }

  const damage = (getDefenseDefinition(defense.type).damage ?? 1) + COMBAT_ABILITY_BALANCE.skeletonHeavyBonusDamage;
  context.damageAdventurer(target, damage, defense);
  target.slowedTimerMs = Math.max(target.slowedTimerMs, COMBAT_ABILITY_BALANCE.skeletonHeavySlowMs);
  defense.abilityCooldowns.skeletonHeavyStrike = COMBAT_ABILITY_BALANCE.skeletonHeavyCooldownMs;
  defense.cooldownRemainingMs = Math.max(defense.cooldownRemainingMs, 720);
  defense.abilityFxTimerMs = COMBAT_ABILITY_BALANCE.abilityFxMs;
  context.stats.abilityStats.skeletonHeavyStrikes += 1;
  context.stats.abilityUses += 1;
  context.message(`${defense.name} assene un coup lourd.`);
  return true;
}

function trySlimeStickyGel(defense: DefenseEntity, context: DefenseAbilityContext): boolean {
  if ((defense.abilityCooldowns.slimeStickyGel ?? 0) > 0) {
    return false;
  }

  const target = findMinionTarget(defense, context.adventurers, 1.35);

  if (!target) {
    return false;
  }

  target.slowedTimerMs = Math.max(target.slowedTimerMs, COMBAT_ABILITY_BALANCE.slimeStickySlowMs);
  defense.abilityCooldowns.slimeStickyGel = COMBAT_ABILITY_BALANCE.slimeStickyCooldownMs;
  defense.abilityFxTimerMs = COMBAT_ABILITY_BALANCE.abilityFxMs;
  context.stats.abilityStats.slimeStickyGels += 1;
  context.stats.abilityStats.slimeStickyApplications += 1;
  context.stats.abilityUses += 1;
  context.message(`${defense.name} englue ${target.name}.`);
  return true;
}

function findMinionTarget(
  defense: DefenseEntity,
  adventurers: AdventurerEntity[],
  range: number,
  predicate: (adventurer: AdventurerEntity) => boolean = () => true,
): AdventurerEntity | null {
  return chooseThreatTarget(
    defense.x,
    defense.y,
    adventurers.filter((adventurer) => predicate(adventurer)),
    range,
    defense.threatByAdventurerId,
    defense.tauntedByAdventurerId,
  );
}

function isNearLockedDoor(adventurer: AdventurerEntity, doors: DungeonDoor[]): boolean {
  return doors.some(
    (door) =>
      !door.destroyed &&
      !door.openedForExpedition &&
      (door.beingPickedById !== null || adventurer.path.slice(0, 2).some((cell) => cellKey(cell) === cellKey(door.cell))),
  );
}

function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

function healerTechniqueBonus(adventurer: AdventurerEntity): number {
  return adventurer.specialTreasureBonuses.some((bonus) => bonus.kind === 'technique')
    ? SPECIAL_TREASURE_BALANCE.techniqueHealingBonus
    : 0;
}
