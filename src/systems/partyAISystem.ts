import type {
  AdventurerEntity,
  ExpeditionPlanType,
  PartyPlan,
  RumorEffect,
  WaveStats,
} from '../game/types';

const PLAN_LABELS: Record<ExpeditionPlanType, string> = {
  greedy: 'Expedition cupide',
  heroic: 'Expedition heroique',
  cautious: 'Expedition prudente',
  fanatic: 'Expedition fanatique',
  mercenary: 'Expedition mercenaire',
};

const PLAN_CYCLE: ExpeditionPlanType[] = ['greedy', 'heroic', 'cautious', 'mercenary', 'fanatic'];

export function createPartyPlan(
  wave: number,
  dungeonReputation: number,
  rumorBias: RumorEffect | null = null,
): PartyPlan {
  let type = PLAN_CYCLE[(wave + Math.floor(dungeonReputation / 8)) % PLAN_CYCLE.length] ?? 'greedy';

  if (rumorBias === 'greedSurge' && wave % 2 === 0) {
    type = 'greedy';
  }

  if (rumorBias === 'cautionSurge' && type !== 'fanatic') {
    type = 'cautious';
  }
  return {
    type,
    label: PLAN_LABELS[type],
    primaryGoal: type === 'greedy' || type === 'cautious' || type === 'mercenary' ? 'treasure' : 'boss',
    groupObjective: type === 'greedy' || type === 'cautious' || type === 'mercenary' ? 'seekTreasure' : 'challengeBoss',
    retreating: false,
    treasureClaimed: false,
    retreatReason: null,
  };
}

export function updatePartyPlan(
  plan: PartyPlan,
  adventurers: AdventurerEntity[],
  stats: WaveStats,
  elapsedMs: number,
  pendingSpawns: number,
): string | null {
  if (plan.type === 'fanatic' || plan.retreating || pendingSpawns > 0) {
    return null;
  }

  const livingCount = adventurers.filter((adventurer) => adventurer.alive && !adventurer.escaped).length;
  const woundedCount = adventurers.filter(
    (adventurer) => adventurer.alive && !adventurer.escaped && adventurer.hp / adventurer.maxHp < 0.38,
  ).length;

  if (livingCount === 0) {
    return null;
  }

  if (plan.type === 'cautious' && stats.adventurersKilled >= 2) {
    return startRetreat(plan, 'Deux morts suffisent: les survivants appellent ca une etude de terrain terminee.');
  }

  if (plan.type === 'greedy' && plan.treasureClaimed && stats.adventurersKilled > 0) {
    return startRetreat(plan, 'Le tresor est pris et les pertes deviennent embarrassantes: retraite cupide.');
  }

  if (plan.type === 'mercenary' && (woundedCount >= 2 || (plan.treasureClaimed && elapsedMs > 9000))) {
    return startRetreat(plan, 'Le calcul risque/recompense devient soudain tres mathematique.');
  }

  if (livingCount <= 1 && plan.type !== 'heroic') {
    return startRetreat(plan, 'Le groupe decouvre que survivre seul reste une option strategique.');
  }

  return null;
}

export function applyPartyDecisions(plan: PartyPlan, adventurers: AdventurerEntity[]): void {
  adventurers.forEach((adventurer) => {
    if (!adventurer.alive || adventurer.escaped) {
      return;
    }

    if (plan.retreating) {
      if (plan.groupObjective !== 'panic' && plan.groupObjective !== 'escapeWithTreasure') {
        plan.groupObjective = 'retreat';
      }

      if (adventurer.retreatIntent === 'disobey') {
        return;
      }

      adventurer.targetStage = 'exit';
      adventurer.path = [];
      return;
    }

    if (plan.groupObjective === 'escapeWithTreasure') {
      if (adventurer.retreatIntent === 'disobey') {
        return;
      }

      adventurer.targetStage = 'exit';
      adventurer.path = [];
      return;
    }

    if (
      plan.groupObjective === 'challengeBoss' &&
      adventurer.targetStage === 'treasure' &&
      adventurer.targetTreasureId
    ) {
      return;
    }

    if (plan.groupObjective === 'challengeBoss' && adventurer.targetStage !== 'boss') {
      adventurer.targetStage = 'boss';
      adventurer.path = [];
      return;
    }

    if (plan.primaryGoal === 'boss' && adventurer.targetStage === 'treasure' && !adventurer.targetTreasureId) {
      adventurer.targetStage = 'boss';
      adventurer.path = [];
    }
  });
}

export function chooseTreasureGroupObjective(
  plan: PartyPlan,
  carrier: AdventurerEntity,
  adventurers: AdventurerEntity[],
  stats: WaveStats,
  bossHpRatio: number,
): 'escapeWithTreasure' | 'challengeBoss' {
  const active = adventurers.filter((adventurer) => adventurer.alive && !adventurer.escaped);
  const woundedCount = active.filter((adventurer) => adventurer.hp / adventurer.maxHp < 0.42).length;
  const combatReadyCount = active.filter((adventurer) => adventurer.hp / adventurer.maxHp >= 0.5).length;
  const hasTreasureEnoughPlan = plan.type === 'greedy' || plan.type === 'cautious';

  if (hasTreasureEnoughPlan || stats.adventurersKilled > 0 || woundedCount >= 2 || carrier.hp / carrier.maxHp < 0.62) {
    return 'escapeWithTreasure';
  }

  if ((plan.type === 'heroic' || plan.type === 'fanatic') && combatReadyCount >= 3) {
    return 'challengeBoss';
  }

  if (bossHpRatio <= 0.55 && combatReadyCount >= 3 && plan.type !== 'cautious') {
    return 'challengeBoss';
  }

  return plan.type === 'mercenary' ? 'escapeWithTreasure' : 'challengeBoss';
}

export function choosePostTreasureGoal(plan: PartyPlan, adventurer: AdventurerEntity): 'boss' | 'exit' {
  if (plan.groupObjective === 'escapeWithTreasure' || plan.groupObjective === 'retreat' || plan.groupObjective === 'panic') {
    return adventurer.retreatIntent === 'disobey' ? 'boss' : 'exit';
  }

  if (plan.groupObjective === 'challengeBoss') {
    return 'boss';
  }

  if (plan.type === 'fanatic' || plan.type === 'heroic') {
    return 'boss';
  }

  if (plan.type === 'greedy' && adventurer.personality === 'greedy') {
    return 'exit';
  }

  if (plan.type === 'mercenary' && adventurer.hp / adventurer.maxHp < 0.68) {
    return 'exit';
  }

  if (adventurer.personality === 'cautious' || adventurer.personality === 'traumatized') {
    return 'exit';
  }

  return 'boss';
}

function startRetreat(plan: PartyPlan, reason: string): string {
  plan.retreating = true;
  plan.retreatReason = reason;
  plan.groupObjective = 'retreat';
  return reason;
}
