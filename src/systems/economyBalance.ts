import type { BossEntity } from '../game/types';

export const ECONOMY_BALANCE = {
  startingGold: 120,
  digCost: 8,
  resealTileCost: 2,
  doorCost: 18,
  doorRefundRatio: 0.5,
  doorHp: 82,
  doorPickRequiredMs: 2300,
  waveRewardBase: 22,
  waveRewardPerWave: 6,
  treasureProtectedBaseBonus: 12,
  treasureProtectedPerWaveBonus: 2,
  bossAliveBaseBonus: 8,
  bossAliveMaxBonus: 8,
} as const;

export function computeDoorRemovalRefund(): number {
  return Math.floor(ECONOMY_BALANCE.doorCost * ECONOMY_BALANCE.doorRefundRatio);
}

export interface ExpeditionEconomyResult {
  goldAwarded: number;
  treasureProtectedBonusGold: number;
  bossSurvivalBonusGold: number;
  preparationBudget: number;
}

export function computeExpeditionEconomy(input: {
  wave: number;
  boss: BossEntity;
  treasureStolen: boolean;
  trapRefundGold: number;
  treasurePenaltyGold: number;
}): ExpeditionEconomyResult {
  const goldAwarded = ECONOMY_BALANCE.waveRewardBase + input.wave * ECONOMY_BALANCE.waveRewardPerWave;
  const treasureProtectedBonusGold = input.treasureStolen
    ? 0
    : ECONOMY_BALANCE.treasureProtectedBaseBonus + input.wave * ECONOMY_BALANCE.treasureProtectedPerWaveBonus;
  const bossHealthRatio = Math.max(0, input.boss.hp / input.boss.maxHp);
  const bossSurvivalBonusGold = input.boss.hp > 0
    ? ECONOMY_BALANCE.bossAliveBaseBonus + Math.round(ECONOMY_BALANCE.bossAliveMaxBonus * bossHealthRatio)
    : 0;

  return {
    goldAwarded,
    treasureProtectedBonusGold,
    bossSurvivalBonusGold,
    preparationBudget:
      goldAwarded +
      treasureProtectedBonusGold +
      bossSurvivalBonusGold +
      input.trapRefundGold -
      input.treasurePenaltyGold,
  };
}
