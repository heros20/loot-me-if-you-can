import { canUseBossAbility, BOSS_ABILITY_DEFINITIONS } from './bossAbilities';
import type {
  AdventurerEntity,
  BossAbilityType,
  BossEntity,
  DefenseEntity,
  DungeonDoor,
  WaveStats,
} from '../game/types';

export interface BossAutopilotContext {
  adventurers: AdventurerEntity[];
  defenses: DefenseEntity[];
  doors: DungeonDoor[];
  stats: WaveStats;
}

export interface BossAutopilotDecision {
  ability: BossAbilityType | null;
  intent: string | null;
}

export function chooseBossAutopilotAbility(
  boss: BossEntity,
  context: BossAutopilotContext,
): BossAutopilotDecision {
  const active = context.adventurers.filter((adventurer) => adventurer.alive && !adventurer.escaped);
  const nearBoss = active.filter((adventurer) => distance(boss.x, boss.y, adventurer.x, adventurer.y) <= boss.detectionRange + 0.4);
  const carrier = active.find((adventurer) => adventurer.carryingTreasure || adventurer.targetStage === 'exit') ?? null;
  const healerNear = nearBoss.find((adventurer) => adventurer.role === 'healer') ?? null;
  const slowedNear = nearBoss.find((adventurer) => adventurer.slowedTimerMs > 0) ?? null;
  const clustered = countClusteredAdventurers(boss, active, BOSS_ABILITY_DEFINITIONS.shockwave.radius);
  const doorPressure = context.doors.some((door) => !door.destroyed && !door.openedForExpedition && door.beingPickedById !== null && active.some(
    (adventurer) => distance(adventurer.x, adventurer.y, door.cell.x, door.cell.y) <= 1.6,
  ));
  const bossHealthRatio = boss.hp / boss.maxHp;

  if (canUseBossAbility(boss, 'roar') && carrier && distance(boss.x, boss.y, carrier.x, carrier.y) <= BOSS_ABILITY_DEFINITIONS.roar.radius) {
    return { ability: 'roar', intent: 'Intercepter un porteur ou une fuite.' };
  }

  if (canUseBossAbility(boss, 'shockwave') && (clustered >= 2 || healerNear || doorPressure || slowedNear)) {
    return {
      ability: 'shockwave',
      intent: healerNear
        ? 'Punir le soigneur expose.'
        : doorPressure
          ? 'Exploiter le ralentissement d une porte.'
          : slowedNear
            ? 'Profiter d un intrus ralenti.'
            : 'Casser un groupe trop serre.',
    };
  }

  if (canUseBossAbility(boss, 'summon') && bossHealthRatio < 0.5 && nearBoss.length > 0) {
    return { ability: 'summon', intent: 'Gagner du temps autour du trone.' };
  }

  if (canUseBossAbility(boss, 'shockwave') && nearBoss.length >= 2) {
    return { ability: 'shockwave', intent: 'Defendre la salle du trone.' };
  }

  return {
    ability: null,
    intent: active.length > 0 ? 'Surveille les intrus proches du trone.' : null,
  };
}

function countClusteredAdventurers(boss: BossEntity, adventurers: AdventurerEntity[], radius: number): number {
  return adventurers.filter((adventurer) => distance(boss.x, boss.y, adventurer.x, adventurer.y) <= radius).length;
}

function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}
