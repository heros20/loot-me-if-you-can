import type { AdventurerRole, DefenseType, DungeonReputation, RunWorldMemory, WaveStats } from '../game/types';

export type DungeonReputationTier = 0 | 1 | 2 | 3 | 4;

export interface DungeonReputationTierInfo {
  tier: DungeonReputationTier;
  minReputation: number;
  title: string;
  threatLabel: string;
  description: string;
  rewardBonusGold: number;
  adventurerStatBonus: number;
  kingdomConfidenceBonus: number;
  rolePressure: Partial<Record<AdventurerRole, number>>;
}

export const RUN_PROGRESSION_BALANCE = {
  maxReputationGainPerExpedition: 13,
  maxThreatGainPerExpedition: 16,
  vagueWipeReputation: 2,
  vagueWipeThreat: 3,
  survivorReportReputation: 1,
  cartographerReportReputation: 2,
  killReputation: 1.35,
  killThreat: 2.1,
  trapKillThreat: 0.8,
  minionKillThreat: 0.65,
  guardianKillReputation: 2,
  guardianKillThreat: 2,
  bossSeenReputation: 1,
  bossReachedThreat: 2,
  bossSurvivedThreat: 2,
  bossDefeatedReputation: 3,
  specialTreasureLootReputation: 2,
  treasureStolenThreatPenalty: 2,
  expeditionBaselineReputation: 1,
  wealthReputationDivisor: 90,
  threatRolePressureDivisor: 30,
  threatStatBonusDivisor: 300,
  maxThreatStatBonus: 0.07,
} as const;

export const DUNGEON_REPUTATION_TIERS: DungeonReputationTierInfo[] = [
  {
    tier: 0,
    minReputation: 0,
    title: 'Donjon inconnu',
    threatLabel: 'negligeable',
    description: 'La Guilde envoie encore des curieux et des optimistes.',
    rewardBonusGold: 0,
    adventurerStatBonus: 0,
    kingdomConfidenceBonus: 0,
    rolePressure: {},
  },
  {
    tier: 1,
    minReputation: 8,
    title: 'Rumeur locale',
    threatLabel: 'prudente',
    description: 'Le nom circule assez pour attirer de meilleurs contrats.',
    rewardBonusGold: 3,
    adventurerStatBonus: 0.015,
    kingdomConfidenceBonus: 0.02,
    rolePressure: { thief: 0.1, healer: 0.12, cartographer: 0.18 },
  },
  {
    tier: 2,
    minReputation: 22,
    title: 'Donjon dangereux',
    threatLabel: 'serieuse',
    description: 'Les recruteurs commencent a choisir des gens qui lisent les avertissements.',
    rewardBonusGold: 6,
    adventurerStatBonus: 0.03,
    kingdomConfidenceBonus: 0.035,
    rolePressure: { warrior: 0.32, thief: 0.12, healer: 0.34, cartographer: 0.28 },
  },
  {
    tier: 3,
    minReputation: 40,
    title: 'Menace regionale',
    threatLabel: 'dangereuse',
    description: 'Les veterans demandent le plan avant de signer.',
    rewardBonusGold: 9,
    adventurerStatBonus: 0.045,
    kingdomConfidenceBonus: 0.05,
    rolePressure: { warrior: 0.5, mage: 0.38, healer: 0.5, cartographer: 0.32 },
  },
  {
    tier: 4,
    minReputation: 62,
    title: 'Donjon tristement celebre',
    threatLabel: 'notable',
    description: "On n'envoie plus des curieux. On envoie des survivants.",
    rewardBonusGold: 12,
    adventurerStatBonus: 0.06,
    kingdomConfidenceBonus: 0.065,
    rolePressure: { warrior: 0.72, thief: 0.22, mage: 0.58, healer: 0.7, cartographer: 0.38 },
  },
];

export const DEFENSE_REPUTATION_UNLOCKS: Record<DefenseType, { tier: DungeonReputationTier; wave: number; reason: string }> = {
  spikeTrap: { tier: 0, wave: 1, reason: 'Base du metier.' },
  slime: { tier: 0, wave: 1, reason: 'Assez repugnant pour commencer.' },
  skeleton: { tier: 0, wave: 1, reason: 'Premier defenseur structure.' },
  fireTrap: { tier: 1, wave: 2, reason: 'Les rumeurs financent des pieges plus sales.' },
  goblin: { tier: 1, wave: 3, reason: 'Les petits mercenaires sentent les contrats connus.' },
  roomLockTrap: { tier: 2, wave: 3, reason: 'La Guilde merite maintenant des salles verrouillees.' },
  guardian: { tier: 2, wave: 4, reason: 'Un donjon dangereux peut poster un vrai gardien.' },
};

export interface ExpeditionProgressionInput {
  wave: number;
  cleared: boolean;
  treasureStolen: boolean;
  stats: WaveStats;
  currentGold: number;
}

export interface ExpeditionProgressionResult {
  reputationDelta: number;
  threatDelta: number;
  previousTier: DungeonReputationTierInfo;
  currentTier: DungeonReputationTierInfo;
  lines: string[];
}

export function createInitialDungeonReputation(): DungeonReputation {
  const tier = getReputationTierInfo(0);

  return {
    value: 0,
    threat: 0,
    tier: tier.tier,
    title: tier.title,
    lastChangeReason: 'Personne ne prend encore le donjon au serieux. Erreur classique.',
    lastThreatReason: 'Aucune disparition utile a vendre en taverne.',
  };
}

export function getReputationTierInfo(value: number): DungeonReputationTierInfo {
  return [...DUNGEON_REPUTATION_TIERS]
    .reverse()
    .find((tier) => value >= tier.minReputation) ?? DUNGEON_REPUTATION_TIERS[0];
}

export function normalizeDungeonReputation(reputation: DungeonReputation): DungeonReputation {
  const tier = getReputationTierInfo(reputation.value);

  return {
    ...reputation,
    threat: reputation.threat ?? 0,
    tier: tier.tier,
    title: tier.title,
    lastThreatReason: reputation.lastThreatReason ?? 'Menace encore floue.',
  };
}

export function isDefenseUnlockedByReputation(type: DefenseType, reputation: DungeonReputation, wave: number): boolean {
  const unlock = DEFENSE_REPUTATION_UNLOCKS[type];
  const tier = getReputationTierInfo(reputation.value).tier;
  return tier >= unlock.tier || wave >= unlock.wave;
}

export function describeDefenseUnlock(type: DefenseType): string {
  const unlock = DEFENSE_REPUTATION_UNLOCKS[type];
  const tier = DUNGEON_REPUTATION_TIERS.find((entry) => entry.tier === unlock.tier) ?? DUNGEON_REPUTATION_TIERS[0];
  return `Debloque: ${tier.title} ou vague ${unlock.wave}. ${unlock.reason}`;
}

export function computeReputationRolePressure(world: RunWorldMemory): Partial<Record<AdventurerRole, number>> {
  const reputation = normalizeDungeonReputation(world.dungeonReputation);
  const tier = getReputationTierInfo(reputation.value);
  const threatPressure = Math.min(1.1, reputation.threat / RUN_PROGRESSION_BALANCE.threatRolePressureDivisor);

  return {
    warrior: (tier.rolePressure.warrior ?? 0) + threatPressure * 0.35,
    thief: tier.rolePressure.thief ?? 0,
    mage: (tier.rolePressure.mage ?? 0) + threatPressure * 0.2,
    healer: (tier.rolePressure.healer ?? 0) + threatPressure * 0.38,
    cartographer: tier.rolePressure.cartographer ?? 0,
  };
}

export function computeReputationAdventurerStatBonus(reputation: DungeonReputation): number {
  const normalized = normalizeDungeonReputation(reputation);
  const tier = getReputationTierInfo(normalized.value);
  const threatBonus = Math.min(
    RUN_PROGRESSION_BALANCE.maxThreatStatBonus,
    normalized.threat / RUN_PROGRESSION_BALANCE.threatStatBonusDivisor,
  );
  return tier.adventurerStatBonus + threatBonus;
}

export function computeReputationRewardBonus(reputation: DungeonReputation): number {
  return getReputationTierInfo(reputation.value).rewardBonusGold;
}

export function applyRunProgressionFromExpedition(
  world: RunWorldMemory,
  input: ExpeditionProgressionInput,
): ExpeditionProgressionResult {
  world.dungeonReputation = normalizeDungeonReputation(world.dungeonReputation);
  const previousTier = getReputationTierInfo(world.dungeonReputation.value);
  const { reputationDelta, threatDelta, reputationReason, threatReason } = computeProgressionDeltas(input);
  const previousReputation = world.dungeonReputation.value;
  const previousThreat = world.dungeonReputation.threat;

  world.dungeonReputation.value = Math.max(0, previousReputation + reputationDelta);
  world.dungeonReputation.threat = Math.max(0, previousThreat + threatDelta);
  const currentTier = getReputationTierInfo(world.dungeonReputation.value);
  world.dungeonReputation.tier = currentTier.tier;
  world.dungeonReputation.title = currentTier.title;
  world.dungeonReputation.lastChangeReason = reputationReason;
  world.dungeonReputation.lastThreatReason = threatReason;

  return {
    reputationDelta: world.dungeonReputation.value - previousReputation,
    threatDelta: world.dungeonReputation.threat - previousThreat,
    previousTier,
    currentTier,
    lines: buildProgressionLines(previousTier, currentTier, world.dungeonReputation, reputationDelta, threatDelta),
  };
}

function computeProgressionDeltas(input: ExpeditionProgressionInput): {
  reputationDelta: number;
  threatDelta: number;
  reputationReason: string;
  threatReason: string;
} {
  const survivors = input.stats.adventurersEscaped;
  const kills = input.stats.adventurersKilled;
  const trapKills = sumKills(input.stats.trapStats);
  const minionKills = sumKills(input.stats.minionStats);
  const wipe = kills > 0 && survivors === 0;
  const bossReached = input.stats.observedBoss || input.stats.bossDamageTaken > 0;
  const wealthSignal = Math.floor(input.currentGold / RUN_PROGRESSION_BALANCE.wealthReputationDivisor);

  let reputation =
    RUN_PROGRESSION_BALANCE.expeditionBaselineReputation +
    Math.round(kills * RUN_PROGRESSION_BALANCE.killReputation) +
    Math.min(3, survivors) * RUN_PROGRESSION_BALANCE.survivorReportReputation +
    input.stats.cartographerSurvivors * RUN_PROGRESSION_BALANCE.cartographerReportReputation +
    input.stats.guardianKills * RUN_PROGRESSION_BALANCE.guardianKillReputation +
    input.stats.specialTreasureLoots.length * RUN_PROGRESSION_BALANCE.specialTreasureLootReputation +
    wealthSignal;

  if (bossReached) {
    reputation += RUN_PROGRESSION_BALANCE.bossSeenReputation;
  }

  if (!input.cleared) {
    reputation += RUN_PROGRESSION_BALANCE.bossDefeatedReputation;
  }

  if (wipe) {
    reputation += RUN_PROGRESSION_BALANCE.vagueWipeReputation;
  }

  let threat =
    Math.round(kills * RUN_PROGRESSION_BALANCE.killThreat) +
    Math.round(trapKills * RUN_PROGRESSION_BALANCE.trapKillThreat) +
    Math.round(minionKills * RUN_PROGRESSION_BALANCE.minionKillThreat) +
    input.stats.guardianKills * RUN_PROGRESSION_BALANCE.guardianKillThreat;

  if (wipe) {
    threat += RUN_PROGRESSION_BALANCE.vagueWipeThreat;
  }

  if (bossReached) {
    threat += RUN_PROGRESSION_BALANCE.bossReachedThreat;
  }

  if (input.cleared && bossReached) {
    threat += RUN_PROGRESSION_BALANCE.bossSurvivedThreat;
  }

  if (input.treasureStolen) {
    threat = Math.max(0, threat - RUN_PROGRESSION_BALANCE.treasureStolenThreatPenalty);
  }

  return {
    reputationDelta: Math.min(RUN_PROGRESSION_BALANCE.maxReputationGainPerExpedition, Math.max(0, reputation)),
    threatDelta: Math.min(RUN_PROGRESSION_BALANCE.maxThreatGainPerExpedition, Math.max(0, threat)),
    reputationReason: wipe
      ? 'Une expedition disparait: la rumeur monte, mais les details restent faux.'
      : survivors > 0
        ? 'Les survivants vendent le nom du donjon a toute la taverne.'
        : 'Le registre ajoute un nouveau silence inquiet au dossier.',
    threatReason: input.treasureStolen
      ? 'Le tresor vole reduit la peur, meme si les morts comptent encore.'
      : 'Les pertes et defenses observees font monter la menace estimee.',
  };
}

function buildProgressionLines(
  previousTier: DungeonReputationTierInfo,
  currentTier: DungeonReputationTierInfo,
  reputation: DungeonReputation,
  reputationDelta: number,
  threatDelta: number,
): string[] {
  const lines = [
    `Reputation du donjon: +${reputationDelta} (${reputation.value}) - ${currentTier.title}.`,
    `Menace estimee: +${threatDelta} (${reputation.threat}) - ${currentTier.threatLabel}.`,
  ];

  if (currentTier.tier > previousTier.tier) {
    lines.push(`Nouveau palier: ${currentTier.title}. ${currentTier.description}`);
  }

  return lines;
}

function sumKills(stats: Partial<Record<DefenseType, { damage: number; kills: number }>>): number {
  return Object.values(stats).reduce((total, entry) => total + (entry?.kills ?? 0), 0);
}
