import type { ReportEntry, WaveStats } from '../game/types';

interface BuildWaveStoryInput {
  cleared: boolean;
  wave: number;
  stats: WaveStats;
  trapHighlights: ReportEntry[];
  minionHighlights: ReportEntry[];
  dungeonTitle: string;
  reputationDelta: number;
}

export function buildWaveStoryLines(input: BuildWaveStoryInput): string[] {
  const lines: string[] = [];

  lines.push(
    input.cleared
      ? `Vague ${input.wave}: le donjon tient encore debout, avec une modestie absolument absente.`
      : `Vague ${input.wave}: le boss tombe, ce qui est tres mauvais pour l'image de marque.`,
  );

  if (input.stats.treasureStolen) {
    lines.push('Le tresor du donjon a quitte le batiment. Les tavernes en riront pendant des semaines.');
  }

  if (input.stats.treasureCarrierName && input.stats.treasureGroupDecision === 'escapeWithTreasure') {
    lines.push(`${input.stats.treasureCarrierName} prend le tresor et le groupe couvre une retraite collective.`);
  }

  if (input.stats.treasureCarrierName && input.stats.treasureGroupDecision === 'challengeBoss') {
    lines.push(`${input.stats.treasureCarrierName} garde le tresor pendant que le groupe choisit de finir le boss.`);
  }

  if (input.stats.doorEncounters > 0) {
    if (input.stats.doorsPicked > 0) {
      lines.push(`Le voleur crochete ${input.stats.doorsPicked} porte${input.stats.doorsPicked > 1 ? 's' : ''} verrouillee${input.stats.doorsPicked > 1 ? 's' : ''}.`);
    } else {
      lines.push("La porte verrouillee a stoppe l'expedition dans les couloirs.");
    }

    if (input.stats.doorNoThiefRetreats > 0) {
      lines.push("L'expedition a abandonne devant une porte verrouillee faute de voleur.");
    }

    if (input.stats.trapStats && Object.values(input.stats.trapStats).some((entry) => (entry?.damage ?? 0) > 0)) {
      lines.push('La porte a retenu le groupe assez longtemps pour laisser les pieges travailler.');
    }
  }

  if (input.stats.thiefTrapMitigations > 0) {
    lines.push(`Le voleur neutralise ${input.stats.thiefTrapMitigations} piege${input.stats.thiefTrapMitigations > 1 ? 's' : ''} avant le pire.`);
  }

  if (input.stats.bossAbilityUses > 0) {
    lines.push(`Le boss lance ${input.stats.bossAbilityUses} pouvoir${input.stats.bossAbilityUses > 1 ? 's' : ''} automatiquement.`);
  }

  if (input.stats.disobeys > 0) {
    lines.push(
      input.stats.disobeys > 1
        ? `${input.stats.disobeys} aventuriers desobeissent a l'ordre de repli et tiennent la ligne.`
        : "Un aventurier desobeit a l'ordre de repli et tient la ligne seul.",
    );
  } else if (input.stats.coverRetreats > 0) {
    lines.push('Un couvreur retarde sa propre fuite pour proteger le repli du groupe.');
  }

  lines.push(...input.stats.storyEvents);
  lines.push(...input.stats.survivors.slice(-2).map((record) => record.note));
  lines.push(...input.stats.deaths.slice(-2).map((record) => record.note));

  const bestMinion = input.minionHighlights[0];
  if (bestMinion && bestMinion.kills > 0) {
    lines.push(`${bestMinion.label} elimine ${bestMinion.kills} aventurier${bestMinion.kills > 1 ? 's' : ''}.`);
  }

  const bestTrap = input.trapHighlights[0];
  if (bestTrap && bestTrap.kills > 0) {
    lines.push(`${bestTrap.label} est responsable de ${bestTrap.kills} mort${bestTrap.kills > 1 ? 's' : ''}.`);
  }

  if (input.reputationDelta > 0) {
    lines.push(`La reputation grimpe: ${input.dungeonTitle}. Les cartographes soupirent deja.`);
  }

  return [...new Set(lines)].slice(0, 7);
}
