import type { AdventurerEntity } from '../game/types';

export function addThreat(table: Record<string, number>, adventurer: AdventurerEntity, amount: number): void {
  if (!adventurer.alive || adventurer.escaped || amount <= 0) {
    return;
  }

  const roleMultiplier = adventurer.role === 'warrior' ? 1.18 : adventurer.role === 'healer' ? 0.72 : 1;
  table[adventurer.id] = Math.min(250, (table[adventurer.id] ?? 0) + amount * roleMultiplier);
}

export function decayThreat(table: Record<string, number>, adventurers: AdventurerEntity[], deltaMs: number): void {
  const aliveIds = new Set(adventurers.filter((adventurer) => adventurer.alive && !adventurer.escaped).map((adventurer) => adventurer.id));
  const decay = deltaMs * 0.0009;

  Object.keys(table).forEach((id) => {
    if (!aliveIds.has(id)) {
      delete table[id];
      return;
    }

    table[id] = Math.max(0, (table[id] ?? 0) - decay);

    if ((table[id] ?? 0) <= 0.01) {
      delete table[id];
    }
  });
}

export function chooseThreatTarget(
  sourceX: number,
  sourceY: number,
  adventurers: AdventurerEntity[],
  maxRange: number,
  threatByAdventurerId: Record<string, number>,
  preferredId: string | null = null,
): AdventurerEntity | null {
  const active = adventurers.filter((adventurer) => adventurer.alive && !adventurer.escaped);
  const preferred = preferredId ? active.find((adventurer) => adventurer.id === preferredId) ?? null : null;

  if (preferred && distance(sourceX, sourceY, preferred.x, preferred.y) <= maxRange + 0.8) {
    return preferred;
  }

  return active
    .map((adventurer) => {
      const targetDistance = distance(sourceX, sourceY, adventurer.x, adventurer.y);
      const roleScore =
        adventurer.role === 'warrior'
          ? 42
          : adventurer.role === 'thief'
            ? 18
            : adventurer.role === 'mage'
              ? -12
              : -18;
      const damagedFrontlineBonus = adventurer.role === 'warrior' && adventurer.hp > 0 ? 10 : 0;
      const lowHealthPenalty = adventurer.hp / adventurer.maxHp < 0.28 ? -8 : 0;
      const threat = threatByAdventurerId[adventurer.id] ?? 0;

      return {
        adventurer,
        distance: targetDistance,
        score: threat + roleScore + damagedFrontlineBonus + lowHealthPenalty - targetDistance * 9,
      };
    })
    .filter((entry) => entry.distance <= maxRange)
    .sort((a, b) => b.score - a.score || a.distance - b.distance)[0]?.adventurer ?? null;
}

function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}
