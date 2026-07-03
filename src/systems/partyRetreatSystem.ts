import type { AdventurerEntity, AdventurerRetreatIntent, ExpeditionPlanType } from '../game/types';

export interface PartyRetreatAssignment {
  adventurerId: string;
  intent: AdventurerRetreatIntent;
  bark:
    | 'retreatFollow'
    | 'retreatCover'
    | 'retreatPanic'
    | 'retreatDisobey'
    | null;
}

export function assignGroupRetreat(
  adventurers: AdventurerEntity[],
  planType: ExpeditionPlanType,
  reason: 'lockedDoorNoThief' | 'danger' | 'treasure',
): PartyRetreatAssignment[] {
  const active = adventurers.filter((adventurer) => adventurer.alive && !adventurer.escaped);

  return active.map((adventurer, index) => {
    const intent = chooseRetreatIntent(adventurer, planType, reason, index);
    adventurer.retreatIntent = intent;
    adventurer.retreatIntentTimerMs = intent === 'coverRetreat' ? 1700 : 0;

    if (intent !== 'disobey') {
      adventurer.targetStage = 'exit';
      adventurer.path = [];
    }

    return {
      adventurerId: adventurer.id,
      intent,
      bark: intentToBark(intent),
    };
  });
}

function chooseRetreatIntent(
  adventurer: AdventurerEntity,
  planType: ExpeditionPlanType,
  reason: 'lockedDoorNoThief' | 'danger' | 'treasure',
  index: number,
): AdventurerRetreatIntent {
  if (
    reason !== 'lockedDoorNoThief' &&
    (planType === 'fanatic' || adventurer.personality === 'vengeful' || adventurer.traits.includes('vengeful')) &&
    adventurer.hp / adventurer.maxHp > 0.42
  ) {
    return 'disobey';
  }

  if (adventurer.carryingTreasure || adventurer.hp / adventurer.maxHp < 0.3 || adventurer.personality === 'traumatized') {
    return 'panicRetreat';
  }

  if ((adventurer.role === 'warrior' || adventurer.role === 'healer') && index % 2 === 0) {
    return 'coverRetreat';
  }

  return 'followRetreat';
}

function intentToBark(intent: AdventurerRetreatIntent): PartyRetreatAssignment['bark'] {
  switch (intent) {
    case 'followRetreat':
      return 'retreatFollow';
    case 'coverRetreat':
      return 'retreatCover';
    case 'panicRetreat':
      return 'retreatPanic';
    case 'disobey':
      return 'retreatDisobey';
    default:
      return null;
  }
}

