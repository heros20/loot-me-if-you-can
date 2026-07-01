import type { AdventurerEntity, BossEntity } from '../game/types';

export function chooseBossTarget(boss: BossEntity, adventurers: AdventurerEntity[]): AdventurerEntity | null {
  return adventurers
    .filter((adventurer) => adventurer.alive && !adventurer.escaped)
    .map((adventurer) => ({
      adventurer,
      distance: distance(boss.x, boss.y, adventurer.x, adventurer.y),
      healthRatio: adventurer.hp / adventurer.maxHp,
    }))
    .filter((entry) => entry.distance <= boss.detectionRange)
    .sort((a, b) => a.healthRatio - b.healthRatio || a.distance - b.distance)[0]?.adventurer ?? null;
}

export function updateBossMovement(boss: BossEntity, target: AdventurerEntity | null, deltaMs: number): void {
  if (target && distance(boss.homeCell.x, boss.homeCell.y, target.x, target.y) <= boss.leashRange) {
    boss.targetAdventurerId = target.id;
    moveBossToward(boss, target.x, target.y, 0.00092 * deltaMs);
    return;
  }

  boss.targetAdventurerId = null;
  moveBossToward(boss, boss.homeCell.x, boss.homeCell.y, 0.0007 * deltaMs);
}

function moveBossToward(boss: BossEntity, targetX: number, targetY: number, step: number): void {
  const dx = targetX - boss.x;
  const dy = targetY - boss.y;
  const remaining = Math.hypot(dx, dy);

  if (remaining <= 0.001) {
    return;
  }

  const clampedStep = Math.min(step, remaining);
  boss.x += (dx / remaining) * clampedStep;
  boss.y += (dy / remaining) * clampedStep;
}

function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}
