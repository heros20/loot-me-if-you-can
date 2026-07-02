import type { AdaptationMemory, RumorEffect, RunWorldMemory, TavernRumor, WaveStats } from '../game/types';

interface RumorInput {
  wave: number;
  stats: WaveStats;
  trapKills: number;
  minionKills: number;
  bossKills: number;
  treasureStolen: boolean;
  cleared: boolean;
}

export function generateTavernRumor(input: RumorInput): TavernRumor {
  if (input.treasureStolen) {
    return {
      wave: input.wave,
      effect: 'greedSurge',
      text: 'On raconte que le tresor du donjon se vole comme une tourte sur un rebord de fenetre. Les cupides affluent.',
    };
  }

  if (!input.cleared) {
    return {
      wave: input.wave,
      effect: 'greedSurge',
      text: 'Le boss est tombe, dit-on. Chaque taverne vend deja des cartes du donjon "garanties authentiques".',
    };
  }

  if (input.trapKills >= 2) {
    return {
      wave: input.wave,
      effect: 'thiefRecruitment',
      text: 'Les tavernes bruissent d\'histoires de dalles tueuses. Les guildes paient des voleurs a prix d\'or.',
    };
  }

  if (input.bossKills >= 2 || input.stats.abilityUses >= 3) {
    return {
      wave: input.wave,
      effect: 'cautionSurge',
      text: 'Un survivant tremble en decrivant le rugissement du boss. Les prochains viendront avec un plan de fuite.',
    };
  }

  if (input.minionKills >= 2) {
    return {
      wave: input.wave,
      effect: 'warriorRecruitment',
      text: 'Les sbires du donjon ont mauvaise reputation dans les tavernes. Les guildes recrutent des guerriers epais.',
    };
  }

  if (input.stats.healingDone >= 30) {
    return {
      wave: input.wave,
      effect: 'healerRecruitment',
      text: 'On chuchote que seuls les groupes bien soignes reviennent. Les soigneurs doublent leurs tarifs.',
    };
  }

  return {
    wave: input.wave,
    effect: 'greedSurge',
    text: 'Une rumeur affirme que le donjon regorge d\'or mal garde. C\'est faux, mais tres motivant.',
  };
}

export function recordRumor(world: RunWorldMemory, rumor: TavernRumor): void {
  world.rumors.push(rumor);

  if (world.rumors.length > 12) {
    world.rumors = world.rumors.slice(-12);
  }
}

export function applyRumorPressure(rumor: TavernRumor, memory: AdaptationMemory): string | null {
  switch (rumor.effect) {
    case 'thiefRecruitment':
      memory.rolePressure.thief += 1;
      return 'La rumeur attire des voleurs supplementaires.';
    case 'warriorRecruitment':
      memory.rolePressure.warrior += 1;
      return 'La rumeur attire des guerriers supplementaires.';
    case 'healerRecruitment':
      memory.rolePressure.healer += 1;
      return 'La rumeur attire des soigneurs supplementaires.';
    case 'greedSurge':
    case 'cautionSurge':
      return null;
  }
}

export function rumorPlanBias(rumor: TavernRumor | null): RumorEffect | null {
  return rumor?.effect ?? null;
}
