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
