import type { ChronicleBadge, SurvivorChronicle, WaveReport } from '../game/types';

type ChronicleSource = Omit<WaveReport, 'chronicle'>;

export function buildSurvivorChronicle(report: ChronicleSource): SurvivorChronicle {
  const survivingParticipants = report.participants.filter((participant) =>
    participant.status === 'survivant' || participant.status === 'blesse' || participant.status === 'fuite',
  );
  const hasSurvivors = survivingParticipants.length > 0;
  const lines = hasSurvivors
    ? buildSurvivorLines(report, survivingParticipants.map((participant) => participant.name))
    : buildNoSurvivorLines(report);

  return {
    title: "Chronique de l'expedition",
    subtitle: hasSurvivors ? 'Les survivants racontent...' : "Personne n'est revenu.",
    hasSurvivors,
    lines: lines.slice(0, 6),
    badges: buildBadges(report),
    tacticalSummary: buildTacticalSummary(report),
  };
}

function buildSurvivorLines(report: ChronicleSource, survivorNames: string[]): string[] {
  const namedSurvivors = survivorNames.slice(0, 3).join(', ');
  const lines = [
    `${namedSurvivors} reviennent avec de la poussiere dans les bottes et une version tres personnelle des faits.`,
  ];

  if (report.adventurersKilled > 0) {
    lines.push(`${report.adventurersKilled} compagnon${report.adventurersKilled > 1 ? 's' : ''} manque${report.adventurersKilled > 1 ? 'nt' : ''} a l'appel.`);
  } else {
    lines.push('Ils reviennent tous vivants, ce qui rend leur confiance encore plus dangereuse.');
  }

  if (report.returningSurvivorNames.length > 0) {
    const returning = report.returningSurvivorNames.slice(0, 3).join(', ');
    lines.push(
      report.returningSurvivorNames.length === 1
        ? `${returning} reviendra dans la prochaine expedition.`
        : `${returning}${report.returningSurvivorNames.length > 3 ? ' et les autres' : ''} guideront la prochaine expedition.`,
    );
  }

  if (report.veteranName) {
    lines.push(`${report.veteranName} est deja traite comme veteran du groupe.`);
  }

  if (report.newVolunteerCount > 0) {
    lines.push(`${report.newVolunteerCount} nouveau${report.newVolunteerCount > 1 ? 'x' : ''} volontaire${report.newVolunteerCount > 1 ? 's' : ''} completeront le contrat.`);
  }

  if (report.treasureStolen) {
    lines.push('Le porteur du tresor refuse de lacher le coffre, meme loin du donjon.');
  } else if (report.storyLines.some((line) => line.includes('groupe couvre une retraite'))) {
    lines.push('Ils jurent que le coffre etait a portee, puis que survivre valait soudain plus cher.');
  } else if (report.storyLines.some((line) => line.includes('finir le boss'))) {
    lines.push('Ils racontent avoir choisi le boss au lieu de courir, ce qui sonne mieux a la taverne.');
  }

  if (report.doorsPicked > 0) {
    lines.push('Le voleur decrit les serrures comme une mauvaise plaisanterie taillee pour lui.');
  } else if (report.doorNoThiefRetreats > 0) {
    lines.push("La porte verrouillee devient le detail que personne n'arrive a oublier.");
  }

  if (report.trapHighlights.length > 0) {
    lines.push(`Les survivants montrent les dalles meurtrieres: ${report.trapHighlights[0].label} revient dans tous les recits.`);
  }

  if (report.minionHighlights.length > 0) {
    lines.push(`On parle aussi de ${report.minionHighlights[0].label}, assez fort pour faire baisser les voix.`);
  }

  if (report.bossAbilityUses > 0) {
    lines.push('Le boss bougeait sans attendre les ordres du maitre, detail que la Guilde note deux fois.');
  }

  lines.push(report.adaptationNotes[0] ?? 'La Guilde pretend garder son calme. Personne ne la croit vraiment.');
  return unique(lines);
}

function buildNoSurvivorLines(report: ChronicleSource): string[] {
  const lines = ["Personne n'est revenu."];
  lines.push(`La Guilde devra envoyer ${report.newVolunteerCount} nouveaux volontaires.`);

  if (report.deaths.length > 0) {
    lines.push('A la taverne, on repete les derniers noms inscrits au registre sans savoir ou les corps sont tombes.');
  } else {
    lines.push("La Guilde refuse d'admettre que l'expedition est perdue et parle encore de retard administratif.");
  }

  if (report.trapHighlights.length > 0) {
    lines.push(`Certains accusent les pieges, surtout ${report.trapHighlights[0].label}.`);
  }

  if (report.minionHighlights.length > 0) {
    lines.push(`D'autres murmurent le nom de ${report.minionHighlights[0].label} comme si le couloir pouvait l'entendre.`);
  }

  if (report.doorNoThiefRetreats > 0 || report.doorsPicked > 0) {
    lines.push('Les serrures deviennent une theorie commode: personne ne peut contredire une porte.');
  }

  if (report.bossDamageTaken === 0) {
    lines.push("Le boss n'a meme pas eu besoin de se montrer dans les recits.");
  } else {
    lines.push('Quelque chose pres du trone a resiste assez longtemps pour devenir une rumeur.');
  }

  lines.push(report.adaptationNotes[0] ?? 'Le Royaume prepare deja des volontaires plus prudents.');
  return unique(lines);
}

function buildBadges(report: ChronicleSource): ChronicleBadge[] {
  return [
    { label: 'Survivants', value: String(report.adventurersEscaped), tone: report.adventurersEscaped > 0 ? 'warning' : 'good' },
    { label: 'Morts', value: String(report.adventurersKilled), tone: report.adventurersKilled > 0 ? 'good' : 'neutral' },
    { label: 'Tresor', value: report.treasureStolen ? 'Vole' : 'Protege', tone: report.treasureStolen ? 'bad' : 'good' },
    { label: 'Boss', value: report.cleared ? 'Debout' : 'Tombe', tone: report.cleared ? 'good' : 'bad' },
    { label: 'Portes', value: report.doorsPicked > 0 ? `${report.doorsPicked} ouverte` : report.doorNoThiefRetreats > 0 ? 'Blocage' : 'RAS', tone: report.doorNoThiefRetreats > 0 ? 'good' : 'neutral' },
    { label: 'Pieges', value: report.trapHighlights.length > 0 ? report.trapHighlights[0].label : 'RAS', tone: report.trapHighlights.length > 0 ? 'good' : 'neutral' },
  ];
}

function buildTacticalSummary(report: ChronicleSource): string {
  if (report.groupRetreats > 0 || report.coverRetreats > 0 || report.panicRetreats > 0 || report.disobeys > 0) {
    return `Retraite: ${report.groupRetreats} ordre, ${report.coverRetreats} couverture, ${report.panicRetreats} panique, ${report.disobeys} desobeissance.`;
  }

  if (report.abilityUses > 0 || report.bossAbilityUses > 0) {
    return `Capacites vues: ${report.abilityUses} cote expedition, ${report.bossAbilityUses} cote boss.`;
  }

  return report.sharedLines[0] ?? 'La Guilde repart avec un recit court, donc probablement dangereux.';
}

function unique(lines: string[]): string[] {
  return [...new Set(lines.filter((line) => line.trim().length > 0))];
}
