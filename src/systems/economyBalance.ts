import type { BossEntity } from '../game/types';

export const ECONOMY_BALANCE = {
  startingGold: 115,
  digCost: 8,
  resealTileCost: 2,
  doorCost: 18,
  doorRefundRatio: 0.5,
  trapSalvageRatio: 0.35,
  doorHp: 82,
  doorPickRequiredMs: 2300,
  waveRewardBase: 20,
  waveRewardPerWave: 5,
  treasureProtectedBaseBonus: 10,
  treasureProtectedPerWaveBonus: 2,
  bossAliveBaseBonus: 6,
  bossAliveMaxBonus: 7,
  treasureReplacementPenaltyBase: 10,
  treasureReplacementPenaltyPerWave: 3,
  goldTreasureDefaultValue: 24,
  goldTreasureMinValue: 10,
  goldTreasureMaxValue: 52,
  maxTreasuresV1: 3,
} as const;

export function computeDoorRemovalRefund(): number {
  return Math.floor(ECONOMY_BALANCE.doorCost * ECONOMY_BALANCE.doorRefundRatio);
}

export function computeTrapSalvageValue(cost: number): number {
  return Math.max(0, Math.floor(cost * ECONOMY_BALANCE.trapSalvageRatio));
}

export function computeTreasureReplacementPenalty(input: {
  wave: number;
  goldAwarded: number;
  trapRefundGold: number;
}): number {
  const targetPenalty = ECONOMY_BALANCE.treasureReplacementPenaltyBase + input.wave * ECONOMY_BALANCE.treasureReplacementPenaltyPerWave;
  return Math.min(input.goldAwarded + input.trapRefundGold, targetPenalty);
}

export interface ExpeditionEconomyResult {
  goldAwarded: number;
  reputationBonusGold: number;
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
  reputationBonusGold?: number;
}): ExpeditionEconomyResult {
  const goldAwarded = ECONOMY_BALANCE.waveRewardBase + input.wave * ECONOMY_BALANCE.waveRewardPerWave;
  const reputationBonusGold = Math.max(0, Math.floor(input.reputationBonusGold ?? 0));
  const treasureProtectedBonusGold = input.treasureStolen
    ? 0
    : ECONOMY_BALANCE.treasureProtectedBaseBonus + input.wave * ECONOMY_BALANCE.treasureProtectedPerWaveBonus;
  const bossHealthRatio = Math.max(0, input.boss.hp / input.boss.maxHp);
  const bossSurvivalBonusGold = input.boss.hp > 0
    ? ECONOMY_BALANCE.bossAliveBaseBonus + Math.round(ECONOMY_BALANCE.bossAliveMaxBonus * bossHealthRatio)
    : 0;

  return {
    goldAwarded,
    reputationBonusGold,
    treasureProtectedBonusGold,
    bossSurvivalBonusGold,
    preparationBudget:
      goldAwarded +
      reputationBonusGold +
      treasureProtectedBonusGold +
      bossSurvivalBonusGold +
      input.trapRefundGold -
      input.treasurePenaltyGold,
  };
}
