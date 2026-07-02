import type { AdventurerRole, DefenseType } from '../game/types';

export const TEXTURE_KEYS = {
  tileFloor: 'tile-floor',
  tileRock: 'tile-rock',
  tileRoom: 'tile-room',
  tileGuardRoom: 'tile-guard-room',
  tileCrypt: 'tile-crypt',
  tileTreasureRoom: 'tile-treasure-room',
  tileThroneRoom: 'tile-throne-room',
  tileEntry: 'tile-entry',
  tileTreasure: 'tile-treasure',
  tileBoss: 'tile-boss',
  boss: 'boss-final',
  defense: {
    spikeTrap: 'defense-spike-trap',
    fireTrap: 'defense-fire-trap',
    slime: 'defense-slime',
    skeleton: 'defense-skeleton',
    goblin: 'defense-goblin',
  } satisfies Record<DefenseType, string>,
  adventurer: {
    warrior: 'adventurer-warrior',
    thief: 'adventurer-thief',
    mage: 'adventurer-mage',
    healer: 'adventurer-healer',
  } satisfies Record<AdventurerRole, string>,
} as const;
