import type { AdventurerEntity, DefenseEntity } from '../game/types';

export interface MonsterAITickResult {
  slowedAdventurerIds: string[];
}

export function updateMonsterAI(
  minions: DefenseEntity[],
  adventurers: AdventurerEntity[],
  deltaMs: number,
): MonsterAITickResult {
  const slowedAdventurerIds: string[] = [];

  minions.forEach((minion) => {
    if (!minion.alive || minion.kind !== 'minion') {
      return;
    }

    if (minion.type === 'goblin') {
      updateGoblin(minion, adventurers, deltaMs);
      return;
    }

    if (minion.type === 'skeleton') {
      updateSkeleton(minion, adventurers, deltaMs);
      return;
    }

    if (minion.type === 'slime') {
      updateSlime(minion, adventurers, deltaMs, slowedAdventurerIds);
    }
  });

  return { slowedAdventurerIds };
}

function updateGoblin(minion: DefenseEntity, adventurers: AdventurerEntity[], deltaMs: number): void {
  const target = findNearestAdventurer(minion, adventurers, 2.7);

  if (target && distance(minion.x, minion.y, minion.homeCell.x, minion.homeCell.y) <= 3.4) {
    minion.aiState = 'chase';
    minion.targetAdventurerId = target.id;
    moveToward(minion, target.x, target.y, 0.00195 * deltaMs);
    return;
  }

  minion.targetAdventurerId = null;
  if (distance(minion.x, minion.y, minion.homeCell.x, minion.homeCell.y) > 0.2) {
    minion.aiState = 'return';
    moveToward(minion, minion.homeCell.x, minion.homeCell.y, 0.0015 * deltaMs);
    return;
  }

  minion.aiState = 'patrol';
  minion.patrolAngle += deltaMs * 0.0017;
  minion.x = minion.homeCell.x + Math.cos(minion.patrolAngle) * 0.32;
  minion.y = minion.homeCell.y + Math.sin(minion.patrolAngle) * 0.32;
}

function updateSkeleton(minion: DefenseEntity, adventurers: AdventurerEntity[], deltaMs: number): void {
  const target = findNearestAdventurer(minion, adventurers, 1.8);

  if (target && distance(minion.x, minion.y, minion.homeCell.x, minion.homeCell.y) <= 1.35) {
    minion.aiState = 'chase';
    minion.targetAdventurerId = target.id;
    moveToward(minion, target.x, target.y, 0.00078 * deltaMs);
    return;
  }

  minion.targetAdventurerId = null;
  minion.aiState = 'return';
  moveToward(minion, minion.homeCell.x, minion.homeCell.y, 0.00092 * deltaMs);
}

function updateSlime(
  minion: DefenseEntity,
  adventurers: AdventurerEntity[],
  deltaMs: number,
  slowedAdventurerIds: string[],
): void {
  const target = findNearestAdventurer(minion, adventurers, 1.35);
  minion.patrolAngle += deltaMs * 0.0012;

  if (target && distance(minion.x, minion.y, minion.homeCell.x, minion.homeCell.y) <= 1.05) {
    minion.aiState = 'chase';
    minion.targetAdventurerId = target.id;
    moveToward(minion, target.x, target.y, 0.00058 * deltaMs);
  } else {
    minion.targetAdventurerId = null;
    minion.aiState = 'patrol';
    minion.x = minion.homeCell.x + Math.cos(minion.patrolAngle) * 0.14;
    minion.y = minion.homeCell.y + Math.abs(Math.sin(minion.patrolAngle)) * 0.18;
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

function moveToward(entity: DefenseEntity, targetX: number, targetY: number, step: number): void {
  const dx = targetX - entity.x;
  const dy = targetY - entity.y;
  const remaining = Math.hypot(dx, dy);

  if (remaining <= 0.001) {
    return;
  }

  const clampedStep = Math.min(step, remaining);
  entity.x += (dx / remaining) * clampedStep;
  entity.y += (dy / remaining) * clampedStep;
}

function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}
