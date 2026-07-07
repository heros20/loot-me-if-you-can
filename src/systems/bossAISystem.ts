import type { AdventurerEntity, BossEntity } from '../game/types';
import { chooseThreatTarget } from './combatThreatSystem';

interface BossMovementOptions {
  canMoveBetween: (fromX: number, fromY: number, toX: number, toY: number) => boolean;
  getNextWaypoint: (fromX: number, fromY: number, targetX: number, targetY: number) => { x: number; y: number } | null;
}

export function chooseBossTarget(boss: BossEntity, adventurers: AdventurerEntity[]): AdventurerEntity | null {
  const active = adventurers.filter((adventurer) => adventurer.alive && !adventurer.escaped);
  const taunter = boss.tauntedByAdventurerId
    ? active.find((adventurer) => adventurer.id === boss.tauntedByAdventurerId) ?? null
    : null;

  if (taunter && distance(boss.x, boss.y, taunter.x, taunter.y) <= boss.detectionRange + 0.8) {
    return taunter;
  }

  return chooseThreatTarget(
    boss.x,
    boss.y,
    active,
    boss.detectionRange,
    boss.threatByAdventurerId,
    null,
  );
}

export function updateBossMovement(
  boss: BossEntity,
  target: AdventurerEntity | null,
  deltaMs: number,
  movement: BossMovementOptions,
): void {
  if (target && distance(boss.homeCell.x, boss.homeCell.y, target.x, target.y) <= boss.leashRange) {
    boss.targetAdventurerId = target.id;
    moveBossToward(boss, target.x, target.y, 0.00092 * deltaMs, movement);
    return;
  }

  boss.targetAdventurerId = null;
  moveBossToward(boss, boss.homeCell.x, boss.homeCell.y, 0.0007 * deltaMs, movement);
}

function moveBossToward(
  boss: BossEntity,
  targetX: number,
  targetY: number,
  step: number,
  movement: BossMovementOptions,
): void {
  const dx = targetX - boss.x;
  const dy = targetY - boss.y;
  const remaining = Math.hypot(dx, dy);

  if (remaining <= 0.001) {
    return;
  }

  const directStep = computeStep(boss.x, boss.y, targetX, targetY, step);
  const waypoint = movement.canMoveBetween(boss.x, boss.y, directStep.x, directStep.y)
    ? { x: targetX, y: targetY }
    : movement.getNextWaypoint(boss.x, boss.y, targetX, targetY);

  if (!waypoint) {
    boss.targetAdventurerId = null;
    return;
  }

  const nextStep = computeStep(boss.x, boss.y, waypoint.x, waypoint.y, step);
  const nextX = nextStep.x;
  const nextY = nextStep.y;

  if (!movement.canMoveBetween(boss.x, boss.y, nextX, nextY)) {
    boss.targetAdventurerId = null;
    return;
  }

  boss.x = nextX;
  boss.y = nextY;
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
