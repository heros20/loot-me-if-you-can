import { cellKey } from '../game/constants';
import type {
  AdventurerEntity,
  AdventurerBehaviorState,
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
    | 'stayTogether'
    | 'backlineHold'
    | 'secureArea'
    | 'mapping'
    | null;
  forceExit: boolean;
  clearPath: boolean;
  reason: string | null;
  behaviorState: AdventurerBehaviorState;
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
  const livingWarrior = context.adventurers.find((ally) => ally.alive && !ally.escaped && ally.role === 'warrior') ?? null;
  const warriorCloserToTarget = livingWarrior
    ? distance(livingWarrior.x, livingWarrior.y, context.targetCell.x, context.targetCell.y) <=
      distance(adventurer.x, adventurer.y, context.targetCell.x, context.targetCell.y) + 0.35
    : false;
  const fanatical = context.partyPlan.type === 'fanatic' || adventurer.personality === 'courageous';
  const cautious = context.partyPlan.type === 'cautious' || adventurer.personality === 'cautious' || adventurer.personality === 'traumatized';
  const formationSpeed = computeFormationSpeed(adventurer, context.adventurers);
  const leadResponse = computeLeadResponse(adventurer, context.adventurers, context.targetCell, visibleTrap !== null || nearbyDoor !== null);

  if (nearbyDoor && !anyLivingThief && adventurer.targetStage !== 'exit') {
    return {
      hesitateMs: 900,
      speedMultiplier: 0.35,
      bark: 'doorNoThief',
      forceExit: true,
      clearPath: true,
      reason: null,
      behaviorState: 'regrouping',
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
      behaviorState: cautious ? 'retreating' : 'securingArea',
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
      behaviorState: 'securingArea',
    };
  }

  if (leadResponse) {
    return {
      hesitateMs: leadResponse.hesitateMs,
      speedMultiplier: Math.min(formationSpeed, leadResponse.speedMultiplier),
      bark: leadResponse.bark,
      forceExit: false,
      clearPath: false,
      reason: null,
      behaviorState: leadResponse.behaviorState,
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
      behaviorState: 'regrouping',
    };
  }

  if ((visibleTrap || nearbyDoor) && adventurer.role === 'thief') {
    return {
      hesitateMs: 0,
      speedMultiplier: dangerousMinionNear && livingWarrior ? Math.min(formationSpeed, 0.82) : Math.max(formationSpeed, 1.18),
      bark: visibleTrap ? 'trapThief' : 'doorThief',
      forceExit: false,
      clearPath: false,
      reason: null,
      behaviorState: dangerousMinionNear && livingWarrior ? 'securingArea' : 'advancing',
    };
  }

  if (
    livingWarrior &&
    warriorCloserToTarget &&
    (adventurer.role === 'mage' || adventurer.role === 'healer' || adventurer.role === 'cartographer') &&
    (visibleTrap || dangerousMinionNear)
  ) {
    return {
      hesitateMs: adventurer.role === 'healer' || adventurer.role === 'cartographer' ? 320 : 220,
      speedMultiplier: Math.min(
        formationSpeed,
        adventurer.role === 'healer' ? 0.58 : adventurer.role === 'cartographer' ? 0.62 : 0.68,
      ),
      bark: visibleTrap ? 'trapSeen' : null,
      forceExit: false,
      clearPath: false,
      reason: null,
      behaviorState: 'backlineHold',
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
      behaviorState: 'evaluatingRoom',
    };
  }

  return {
    hesitateMs: 0,
    speedMultiplier: formationSpeed,
    bark: null,
    forceExit: false,
    clearPath: false,
    reason: null,
    behaviorState: formationSpeed < 0.9 ? 'regrouping' : 'advancing',
  };
}

export function findVisibleTrap(adventurer: AdventurerEntity, defenses: DefenseEntity[]): DefenseEntity | null {
  const current = { x: Math.round(adventurer.x), y: Math.round(adventurer.y) };
  const nextPathKeys = new Set(adventurer.path.slice(0, 3).map((cell) => cellKey(cell)));

  return defenses
    .filter((defense) => defense.alive && defense.kind === 'trap' && (defense.trapState === null || defense.trapState === 'armed'))
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

  const desiredRank =
    adventurer.role === 'warrior'
      ? 0
      : adventurer.role === 'thief'
        ? 1
        : adventurer.role === 'cartographer'
          ? 3
          : adventurer.role === 'mage'
            ? 3
            : 4;

  if (rank < desiredRank - 1) {
    return adventurer.role === 'healer'
      ? 0.62
      : adventurer.role === 'cartographer'
        ? 0.66
        : adventurer.role === 'mage'
          ? 0.7
          : adventurer.role === 'thief'
            ? 0.86
            : 0.82;
  }

  if (rank > desiredRank + 1) {
    return adventurer.role === 'warrior' ? 1.22 : 1.12;
  }

  return 1;
}

function computeLeadResponse(
  adventurer: AdventurerEntity,
  adventurers: AdventurerEntity[],
  targetCell: GridCell,
  hasUtilityReason: boolean,
): {
  speedMultiplier: number;
  hesitateMs: number;
  bark: 'stayTogether' | 'backlineHold' | 'secureArea' | 'mapping' | null;
  behaviorState: AdventurerBehaviorState;
} | null {
  if (adventurer.targetStage === 'exit') {
    return null;
  }

  const active = adventurers.filter((ally) => ally.alive && !ally.escaped && ally.targetStage === adventurer.targetStage);

  if (active.length <= 1) {
    return null;
  }

  const ownDistanceToGoal = distance(adventurer.x, adventurer.y, targetCell.x, targetCell.y);
  const averageDistanceToGoal = active.reduce(
    (total, ally) => total + distance(ally.x, ally.y, targetCell.x, targetCell.y),
    0,
  ) / active.length;
  const leadDistance = averageDistanceToGoal - ownDistanceToGoal;
  const warrior = active.find((ally) => ally.role === 'warrior') ?? null;
  const warriorBehind =
    warrior &&
    adventurer.id !== warrior.id &&
    distance(warrior.x, warrior.y, targetCell.x, targetCell.y) > ownDistanceToGoal + 1.35;
  const roleLeadLimit =
    adventurer.role === 'warrior'
      ? 4.2
      : adventurer.role === 'thief' && hasUtilityReason
        ? 3.4
        : adventurer.role === 'thief'
          ? 2.25
          : adventurer.role === 'cartographer'
            ? 2.35
            : 2.55;

  if ((adventurer.role === 'mage' || adventurer.role === 'healer' || adventurer.role === 'cartographer') && warriorBehind) {
    return {
      speedMultiplier: adventurer.role === 'healer' ? 0.46 : adventurer.role === 'cartographer' ? 0.52 : 0.58,
      hesitateMs: adventurer.role === 'healer' || adventurer.role === 'cartographer' ? 260 : 180,
      bark: adventurer.role === 'cartographer' ? 'mapping' : 'backlineHold',
      behaviorState: 'backlineHold',
    };
  }

  if (leadDistance <= roleLeadLimit) {
    return null;
  }

  if (adventurer.role === 'thief' && hasUtilityReason && leadDistance <= roleLeadLimit + 0.8) {
    return null;
  }

  return {
    speedMultiplier: adventurer.role === 'warrior' ? 0.72 : adventurer.role === 'thief' ? 0.58 : adventurer.role === 'cartographer' ? 0.52 : 0.5,
    hesitateMs: adventurer.role === 'warrior' ? 120 : 240,
    bark: adventurer.role === 'thief' ? 'stayTogether' : adventurer.role === 'warrior' ? 'secureArea' : adventurer.role === 'cartographer' ? 'mapping' : 'backlineHold',
    behaviorState: adventurer.role === 'warrior' ? 'securingArea' : adventurer.role === 'thief' ? 'regrouping' : 'backlineHold',
  };
}

function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}
