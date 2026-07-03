import { cellKey } from '../game/constants';
import type {
  AdventurerEntity,
  DefenseEntity,
  DungeonDoor,
  GridCell,
  PartyPlan,
} from '../game/types';

export interface LocalDecisionContext {
  partyPlan: PartyPlan;
  adventurers: AdventurerEntity[];
  defenses: DefenseEntity[];
  doors: DungeonDoor[];
  targetCell: GridCell;
}

export interface LocalDecisionResult {
  hesitateMs: number;
  speedMultiplier: number;
  bark:
    | 'doorThief'
    | 'doorBlocked'
    | 'doorNoThief'
    | 'trapSeen'
    | 'trapThief'
    | 'wounded'
    | 'retreat'
    | null;
  forceExit: boolean;
  clearPath: boolean;
  reason: string | null;
}

export function evaluateLocalAdventurerDecision(
  adventurer: AdventurerEntity,
  context: LocalDecisionContext,
): LocalDecisionResult {
  const healthRatio = adventurer.hp / adventurer.maxHp;
  const woundedAllies = context.adventurers.filter(
    (ally) => ally.alive && !ally.escaped && ally.hp / ally.maxHp < 0.42,
  ).length;
  const visibleTrap = findVisibleTrap(adventurer, context.defenses);
  const nearbyDoor = findNearbyDoor(adventurer, context.doors);
  const thief = context.adventurers.find(
    (ally) => ally.alive && !ally.escaped && ally.role === 'thief' && distance(ally.x, ally.y, adventurer.x, adventurer.y) <= 2.7,
  );
  const anyLivingThief = context.adventurers.some((ally) => ally.alive && !ally.escaped && ally.role === 'thief');
  const dangerousMinionNear = context.defenses.some(
    (defense) => defense.alive && defense.kind === 'minion' && distance(defense.x, defense.y, adventurer.x, adventurer.y) <= 2.1,
  );
  const fanatical = context.partyPlan.type === 'fanatic' || adventurer.personality === 'courageous';
  const cautious = context.partyPlan.type === 'cautious' || adventurer.personality === 'cautious' || adventurer.personality === 'traumatized';
  const formationSpeed = computeFormationSpeed(adventurer, context.adventurers);

  if (nearbyDoor && !anyLivingThief) {
    return {
      hesitateMs: 900,
      speedMultiplier: 0.35,
      bark: 'doorNoThief',
      forceExit: true,
      clearPath: true,
      reason: null,
    };
  }

  if (!fanatical && healthRatio < 0.2) {
    return {
      hesitateMs: cautious ? 900 : 450,
      speedMultiplier: 0.72,
      bark: cautious ? 'retreat' : 'wounded',
      forceExit: cautious,
      clearPath: cautious,
      reason: cautious ? `${adventurer.name} propose une retraite avant de devenir une statistique.` : null,
    };
  }

  if (!fanatical && woundedAllies >= 2 && healthRatio < 0.55) {
    return {
      hesitateMs: cautious ? 720 : 420,
      speedMultiplier: 0.76,
      bark: 'wounded',
      forceExit: false,
      clearPath: false,
      reason: null,
    };
  }

  if ((visibleTrap || nearbyDoor) && adventurer.role !== 'thief' && thief) {
    return {
      hesitateMs: 620,
      speedMultiplier: Math.min(formationSpeed, 0.65),
      bark: visibleTrap ? 'trapSeen' : 'doorBlocked',
      forceExit: false,
      clearPath: false,
      reason: null,
    };
  }

  if ((visibleTrap || nearbyDoor) && adventurer.role === 'thief') {
    return {
      hesitateMs: 0,
      speedMultiplier: Math.max(formationSpeed, 1.18),
      bark: visibleTrap ? 'trapThief' : 'doorThief',
      forceExit: false,
      clearPath: false,
      reason: null,
    };
  }

  if (!fanatical && (visibleTrap || dangerousMinionNear) && cautious) {
    return {
      hesitateMs: visibleTrap ? 540 : 360,
      speedMultiplier: Math.min(formationSpeed, 0.78),
      bark: visibleTrap ? 'trapSeen' : null,
      forceExit: false,
      clearPath: false,
      reason: null,
    };
  }

  return {
    hesitateMs: 0,
    speedMultiplier: formationSpeed,
    bark: null,
    forceExit: false,
    clearPath: false,
    reason: null,
  };
}

export function findVisibleTrap(adventurer: AdventurerEntity, defenses: DefenseEntity[]): DefenseEntity | null {
  const current = { x: Math.round(adventurer.x), y: Math.round(adventurer.y) };
  const nextPathKeys = new Set(adventurer.path.slice(0, 3).map((cell) => cellKey(cell)));

  return defenses
    .filter((defense) => defense.alive && defense.kind === 'trap')
    .map((defense) => ({
      defense,
      distance: distance(adventurer.x, adventurer.y, defense.cell.x, defense.cell.y),
      onPath: nextPathKeys.has(cellKey(defense.cell)) || cellKey(current) === cellKey(defense.cell),
    }))
    .filter((entry) => entry.distance <= 1.85 || entry.onPath)
    .sort((a, b) => Number(b.onPath) - Number(a.onPath) || a.distance - b.distance)[0]?.defense ?? null;
}

function findNearbyDoor(adventurer: AdventurerEntity, doors: DungeonDoor[]): DungeonDoor | null {
  const nextPathKeys = new Set(adventurer.path.slice(0, 3).map((cell) => cellKey(cell)));

  return doors
    .filter((door) => !door.destroyed && !door.openedForExpedition)
    .map((door) => ({
      door,
      distance: distance(adventurer.x, adventurer.y, door.cell.x, door.cell.y),
      onPath: nextPathKeys.has(cellKey(door.cell)),
    }))
    .filter((entry) => entry.distance <= 1.75 || entry.onPath)
    .sort((a, b) => Number(b.onPath) - Number(a.onPath) || a.distance - b.distance)[0]?.door ?? null;
}

function computeFormationSpeed(adventurer: AdventurerEntity, adventurers: AdventurerEntity[]): number {
  const active = adventurers
    .filter((candidate) => candidate.alive && !candidate.escaped && candidate.targetStage === adventurer.targetStage)
    .sort((a, b) => b.x - a.x);
  const rank = active.findIndex((candidate) => candidate.id === adventurer.id);

  if (rank < 0 || active.length <= 1 || adventurer.targetStage === 'exit') {
    return 1;
  }

  const desiredRank = adventurer.role === 'warrior' ? 0 : adventurer.role === 'thief' ? 1 : adventurer.role === 'mage' ? 3 : 4;

  if (rank < desiredRank - 1) {
    return 0.82;
  }

  if (rank > desiredRank + 1) {
    return 1.12;
  }

  return 1;
}

function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}
