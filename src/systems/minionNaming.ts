import type { DefenseType } from '../game/types';

const MINION_NAMES: Partial<Record<DefenseType, string[]>> = {
  slime: ['Gluant', 'Flaque', 'Bulle', 'Visqueux', 'Ectoplasme', 'Morve'],
  goblin: ['Grattouille', 'Krik', 'Mordicus', 'Fourbe', 'Ricanou', 'Chapardeur'],
  skeleton: ['Clavicule', 'Tibia', 'Vertebre', 'Phalange', 'Sternum', 'Rotule'],
};

export function createMinionName(type: DefenseType, counter: number): string {
  const pool = MINION_NAMES[type];

  if (!pool || pool.length === 0) {
    return `${type}-${counter}`;
  }

  const base = pool[counter % pool.length] ?? pool[0]!;
  const generation = Math.floor(counter / pool.length);
  return generation === 0 ? base : `${base} ${toRoman(generation + 1)}`;
}

function toRoman(value: number): string {
  const table: Array<[number, string]> = [
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];
  let remaining = value;
  let result = '';

  for (const [amount, glyph] of table) {
    while (remaining >= amount) {
      result += glyph;
      remaining -= amount;
    }
  }

  return result || 'I';
}
