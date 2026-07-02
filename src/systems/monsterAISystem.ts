import type { AdventurerEntity, DefenseEntity } from '../game/types';

export interface MonsterAITickResult {
  slowedAdventurerIds: string[];
}

interface MonsterMovementOptions {
  canMoveBetween: (fromX: number, fromY: number, toX: number, toY: number) => boolean;
  getNextWaypoint: (fromX: number, fromY: number, targetX: number, targetY: number) => { x: number; y: number } | null;
}

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
  const target = findNearestAdventurer(minion, adventurers, 2.7);

  if (target && distance(minion.x, minion.y, minion.homeCell.x, minion.homeCell.y) <= 3.4) {
    minion.aiState = 'chase';
    minion.targetAdventurerId = target.id;
    moveToward(minion, target.x, target.y, 0.00195 * deltaMs, movement);
    return;
  }

  minion.targetAdventurerId = null;
  if (distance(minion.x, minion.y, minion.homeCell.x, minion.homeCell.y) > 0.2) {
    minion.aiState = 'return';
    moveToward(minion, minion.homeCell.x, minion.homeCell.y, 0.0015 * deltaMs, movement);
    return;
  }

  minion.aiState = 'patrol';
  minion.patrolAngle += deltaMs * 0.0017;
  movePatrol(minion, minion.homeCell.x + Math.cos(minion.patrolAngle) * 0.32, minion.homeCell.y + Math.sin(minion.patrolAngle) * 0.32, movement);
}

function updateSkeleton(
  minion: DefenseEntity,
  adventurers: AdventurerEntity[],
  deltaMs: number,
  movement: MonsterMovementOptions,
): void {
  const target = findNearestAdventurer(minion, adventurers, 1.8);

  if (target && distance(minion.x, minion.y, minion.homeCell.x, minion.homeCell.y) <= 1.35) {
    minion.aiState = 'chase';
    minion.targetAdventurerId = target.id;
    moveToward(minion, target.x, target.y, 0.00078 * deltaMs, movement);
    return;
  }

  minion.targetAdventurerId = null;
  minion.aiState = 'return';
  moveToward(minion, minion.homeCell.x, minion.homeCell.y, 0.00092 * deltaMs, movement);
}

function updateSlime(
  minion: DefenseEntity,
  adventurers: AdventurerEntity[],
  deltaMs: number,
  slowedAdventurerIds: string[],
  movement: MonsterMovementOptions,
): void {
  const target = findNearestAdventurer(minion, adventurers, 1.35);
  minion.patrolAngle += deltaMs * 0.0012;

  if (target && distance(minion.x, minion.y, minion.homeCell.x, minion.homeCell.y) <= 1.05) {
    minion.aiState = 'chase';
    minion.targetAdventurerId = target.id;
    moveToward(minion, target.x, target.y, 0.00058 * deltaMs, movement);
  } else {
    minion.targetAdventurerId = null;
    minion.aiState = 'patrol';
    movePatrol(
      minion,
      minion.homeCell.x + Math.cos(minion.patrolAngle) * 0.14,
      minion.homeCell.y + Math.abs(Math.sin(minion.patrolAngle)) * 0.18,
      movement,
    );
  }

  adventurers.forEach((adventurer) => {
    if (adventurer.alive && !adventurer.escaped && distance(minion.x, minion.y, adventurer.x, adventurer.y) <= 0.82) {
      slowedAdventurerIds.push(adventurer.id);
    }
  });
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
): void {
  const dx = targetX - entity.x;
  const dy = targetY - entity.y;
  const remaining = Math.hypot(dx, dy);

  if (remaining <= 0.001) {
    return;
  }

  const directStep = computeStep(entity.x, entity.y, targetX, targetY, step);
  const waypoint = movement.canMoveBetween(entity.x, entity.y, directStep.x, directStep.y)
    ? { x: targetX, y: targetY }
    : movement.getNextWaypoint(entity.x, entity.y, targetX, targetY);

  if (!waypoint) {
    entity.targetAdventurerId = null;
    entity.aiState = 'return';
    return;
  }

  const nextStep = computeStep(entity.x, entity.y, waypoint.x, waypoint.y, step);
  const nextX = nextStep.x;
  const nextY = nextStep.y;

  if (!movement.canMoveBetween(entity.x, entity.y, nextX, nextY)) {
    entity.targetAdventurerId = null;
    entity.aiState = 'return';
    return;
  }

  entity.x = nextX;
  entity.y = nextY;
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
