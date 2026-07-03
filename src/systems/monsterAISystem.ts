import type { AdventurerEntity, DefenseEntity } from '../game/types';

export interface MonsterAITickResult {
  slowedAdventurerIds: string[];
}

interface MonsterMovementOptions {
  canMoveBetween: (fromX: number, fromY: number, toX: number, toY: number) => boolean;
  getNextWaypoint: (fromX: number, fromY: number, targetX: number, targetY: number) => { x: number; y: number } | null;
}

interface ChaseConfig {
  acquireRange: number;
  maxHomeDistance: number;
  chaseMs: number;
  speed: number;
  returnSpeed: number;
  patrolRadius: number;
}

const CHASE_CONFIG: Record<'goblin' | 'skeleton' | 'slime', ChaseConfig> = {
  goblin: {
    acquireRange: 3.05,
    maxHomeDistance: 4.2,
    chaseMs: 5200,
    speed: 0.00205,
    returnSpeed: 0.00155,
    patrolRadius: 0.32,
  },
  skeleton: {
    acquireRange: 2.1,
    maxHomeDistance: 2.25,
    chaseMs: 3300,
    speed: 0.0009,
    returnSpeed: 0.00098,
    patrolRadius: 0.08,
  },
  slime: {
    acquireRange: 1.55,
    maxHomeDistance: 1.45,
    chaseMs: 2100,
    speed: 0.00062,
    returnSpeed: 0.0005,
    patrolRadius: 0.14,
  },
};

export function updateMonsterAI(
  minions: DefenseEntity[],
  adventurers: AdventurerEntity[],
  deltaMs: number,
  movement: MonsterMovementOptions,
): MonsterAITickResult {
  const slowedAdventurerIds: string[] = [];

  minions.forEach((minion) => {
    if (!minion.alive || minion.kind !== 'minion') {
      return;
    }

    if (minion.type === 'goblin') {
      updateGoblin(minion, adventurers, deltaMs, movement);
      return;
    }

    if (minion.type === 'skeleton') {
      updateSkeleton(minion, adventurers, deltaMs, movement);
      return;
    }

    if (minion.type === 'slime') {
      updateSlime(minion, adventurers, deltaMs, slowedAdventurerIds, movement);
    }
  });

  return { slowedAdventurerIds };
}

function updateGoblin(
  minion: DefenseEntity,
  adventurers: AdventurerEntity[],
  deltaMs: number,
  movement: MonsterMovementOptions,
): void {
  updateChaser(minion, adventurers, deltaMs, movement, CHASE_CONFIG.goblin);
}

function updateSkeleton(
  minion: DefenseEntity,
  adventurers: AdventurerEntity[],
  deltaMs: number,
  movement: MonsterMovementOptions,
): void {
  updateChaser(minion, adventurers, deltaMs, movement, CHASE_CONFIG.skeleton);
}

function updateSlime(
  minion: DefenseEntity,
  adventurers: AdventurerEntity[],
  deltaMs: number,
  slowedAdventurerIds: string[],
  movement: MonsterMovementOptions,
): void {
  const target = findNearestAdventurer(minion, adventurers, 1.35);
  if (target || minion.targetAdventurerId) {
    updateChaser(minion, adventurers, deltaMs, movement, CHASE_CONFIG.slime);
  } else {
    updatePatrol(minion, deltaMs, movement, CHASE_CONFIG.slime);
  }

  adventurers.forEach((adventurer) => {
    if (adventurer.alive && !adventurer.escaped && distance(minion.x, minion.y, adventurer.x, adventurer.y) <= 0.82) {
      slowedAdventurerIds.push(adventurer.id);
    }
  });
}

function updateChaser(
  minion: DefenseEntity,
  adventurers: AdventurerEntity[],
  deltaMs: number,
  movement: MonsterMovementOptions,
  config: ChaseConfig,
): void {
  const homeDistance = distance(minion.x, minion.y, minion.homeCell.x, minion.homeCell.y);
  const returningToPost = minion.aiState === 'return' && homeDistance > 0.26;
  const previousTarget = !returningToPost && minion.targetAdventurerId
    ? adventurers.find((adventurer) => adventurer.id === minion.targetAdventurerId && adventurer.alive && !adventurer.escaped) ?? null
    : null;
  const target = returningToPost ? null : previousTarget ?? findNearestAdventurer(minion, adventurers, config.acquireRange);

  if (
    target &&
    homeDistance <= config.maxHomeDistance &&
    minion.chaseTimerMs < config.chaseMs &&
    minion.stuckTimerMs < 900
  ) {
    minion.aiState = 'chase';
    minion.targetAdventurerId = target.id;
    minion.chaseTimerMs += deltaMs;
    const moved = moveToward(minion, target.x, target.y, config.speed * deltaMs, movement);
    updateStuckState(minion, moved, deltaMs);
    return;
  }

  minion.targetAdventurerId = null;
  minion.chaseTimerMs = 0;
  minion.stuckTimerMs = 0;

  if (homeDistance > 0.18) {
    minion.aiState = 'return';
    moveToward(minion, minion.homeCell.x, minion.homeCell.y, config.returnSpeed * deltaMs, movement);
    return;
  }

  updatePatrol(minion, deltaMs, movement, config);
}

function updatePatrol(
  minion: DefenseEntity,
  deltaMs: number,
  movement: MonsterMovementOptions,
  config: ChaseConfig,
): void {
  minion.aiState = 'patrol';
  minion.patrolAngle += deltaMs * 0.0013;
  movePatrol(
    minion,
    minion.homeCell.x + Math.cos(minion.patrolAngle) * config.patrolRadius,
    minion.homeCell.y + Math.sin(minion.patrolAngle) * config.patrolRadius,
    movement,
  );
}

function findNearestAdventurer(
  minion: DefenseEntity,
  adventurers: AdventurerEntity[],
  range: number,
): AdventurerEntity | null {
  return adventurers
    .filter((adventurer) => adventurer.alive && !adventurer.escaped)
    .map((adventurer) => ({
      adventurer,
      distance: distance(minion.x, minion.y, adventurer.x, adventurer.y),
    }))
    .filter((entry) => entry.distance <= range)
    .sort((a, b) => a.distance - b.distance)[0]?.adventurer ?? null;
}

function moveToward(
  entity: DefenseEntity,
  targetX: number,
  targetY: number,
  step: number,
  movement: MonsterMovementOptions,
): boolean {
  const dx = targetX - entity.x;
  const dy = targetY - entity.y;
  const remaining = Math.hypot(dx, dy);

  if (remaining <= 0.001) {
    return false;
  }

  const directStep = computeStep(entity.x, entity.y, targetX, targetY, step);
  const waypoint = movement.canMoveBetween(entity.x, entity.y, directStep.x, directStep.y)
    ? { x: targetX, y: targetY }
    : movement.getNextWaypoint(entity.x, entity.y, targetX, targetY);

  if (!waypoint) {
    entity.targetAdventurerId = null;
    entity.aiState = 'return';
    return false;
  }

  const nextStep = computeStep(entity.x, entity.y, waypoint.x, waypoint.y, step);
  const nextX = nextStep.x;
  const nextY = nextStep.y;

  if (!movement.canMoveBetween(entity.x, entity.y, nextX, nextY)) {
    entity.targetAdventurerId = null;
    entity.aiState = 'return';
    return false;
  }

  entity.x = nextX;
  entity.y = nextY;
  return Math.hypot(entity.x - entity.lastX, entity.y - entity.lastY) > 0.002;
}

function movePatrol(
  entity: DefenseEntity,
  targetX: number,
  targetY: number,
  movement: MonsterMovementOptions,
): void {
  if (!movement.canMoveBetween(entity.x, entity.y, targetX, targetY)) {
    return;
  }

  entity.x = targetX;
  entity.y = targetY;
}

function updateStuckState(entity: DefenseEntity, moved: boolean, deltaMs: number): void {
  if (moved) {
    entity.stuckTimerMs = 0;
  } else {
    entity.stuckTimerMs += deltaMs;
  }

  entity.lastX = entity.x;
  entity.lastY = entity.y;
}

function computeStep(fromX: number, fromY: number, targetX: number, targetY: number, step: number): { x: number; y: number } {
  const dx = targetX - fromX;
  const dy = targetY - fromY;
  const remaining = Math.hypot(dx, dy);

  if (remaining <= 0.001) {
    return { x: fromX, y: fromY };
  }

  const clampedStep = Math.min(step, remaining);
  return {
    x: fromX + (dx / remaining) * clampedStep,
    y: fromY + (dy / remaining) * clampedStep,
  };
}

function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}
