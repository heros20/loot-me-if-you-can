import { PARTY_SIZE } from '../game/constants';
import type {
  ExpeditionParticipantReport,
  GuildSceneMood,
  GuildTavernScene,
  GuildTavernSummaryFact,
  TavernActor,
  TavernBeat,
  TavernSceneLayout,
  TavernTableSlot,
  WaveReport,
} from '../game/types';

type SceneSource = Omit<WaveReport, 'guildTavernScene'>;

const RETURNING_STATUS = new Set(['survivant', 'blesse', 'fuite']);

/**
 * Guild Tavern Scene V2: construit un vrai espace (table/comptoir/fond de
 * salle) peuple d'acteurs reels (survivants) et de PNJ generiques, plus une
 * courte sequence de dialogue factuelle (3 a 6 beats). Aucune donnee
 * inventee: chaque acteur/beat provient du rapport de vague.
 */
export function buildGuildTavernScene(report: SceneSource): GuildTavernScene {
  const survivorParticipants = report.participants.filter((participant) => RETURNING_STATUS.has(participant.status));
  const deadParticipants = report.participants.filter((participant) => participant.status === 'mort' || participant.status === 'disparu');
  const hasSurvivors = survivorParticipants.length > 0;

  const survivorActors = buildSurvivorActors(survivorParticipants, report);
  const dead = deadParticipants.map((participant) => participant.name);

  const layout = buildLayout(report, survivorActors);
  const beats = hasSurvivors
    ? buildSurvivorBeats(report, layout, dead)
    : buildNoSurvivorBeats(report, layout);

  return {
    title: hasSurvivors ? 'La Guilde, au retour' : 'La Guilde, dans le silence',
    subtitle: buildSubtitle(report, hasSurvivors),
    sceneMood: pickSceneMood(report, hasSurvivors),
    hasSurvivors,
    layout,
    dead,
    returning: report.returningSurvivorNames,
    newVolunteersCount: report.newVolunteerCount,
    veteran: report.veteranName,
    beats,
    summaryFacts: buildSummaryFacts(report),
  };
}

function buildSurvivorActors(participants: ExpeditionParticipantReport[], report: SceneSource): TavernActor[] {
  return participants.map((participant) => {
    const isVeteran = participant.name === report.veteranName;
    const isReturning = report.returningSurvivorNames.includes(participant.name);

    return {
      id: participant.name,
      name: participant.name,
      kind: 'survivor',
      role: participant.role,
      level: participant.level,
      isVeteran,
      isReturning,
      statusLabel: participant.status === 'blesse'
        ? 'Blesse'
        : isVeteran
          ? 'Veteran'
          : isReturning
            ? 'Revient'
            : 'Reste a la guilde',
      pose: participant.role === 'thief' ? 'shadow' : 'seated',
    };
  });
}

function npcActor(id: string, name: string, statusLabel: string, pose: TavernActor['pose'] = 'standing'): TavernActor {
  return {
    id,
    name,
    kind: 'npc',
    role: 'guild',
    level: null,
    isVeteran: false,
    isReturning: false,
    statusLabel,
    pose,
  };
}

/**
 * Place les acteurs dans la piece: la table garde toujours PARTY_SIZE places
 * (une par membre de l'expedition), les morts y laissent une chaise vide
 * nommee au lieu d'un simple compteur. Le comptoir et le fond de salle
 * restent peuples de PNJ generiques pour que la taverne ne semble jamais
 * vide, meme sans survivant.
 */
function buildLayout(report: SceneSource, survivorActors: TavernActor[]): TavernSceneLayout {
  const actorByName = new Map(survivorActors.map((actor) => [actor.id, actor]));

  const tableSlots: TavernTableSlot[] = report.participants.slice(0, PARTY_SIZE).map((participant) => {
    const actor = actorByName.get(participant.name) ?? null;
    return {
      actor,
      deadName: actor ? null : participant.name,
    };
  });

  while (tableSlots.length < PARTY_SIZE) {
    tableSlots.push({ actor: null, deadName: null });
  }

  const counterActors: TavernActor[] = [
    npcActor('tavernkeeper', 'Le tavernier', 'Sert a boire, ecoute tout'),
    npcActor('archivist', 'Archiviste de la Guilde', 'Tient le registre des expeditions'),
  ];

  const volunteerCount = Math.max(1, Math.min(4, report.newVolunteerCount));
  const backgroundActors: TavernActor[] = Array.from({ length: volunteerCount }, (_unused, index) =>
    npcActor(
      index === 0 ? 'anxious-volunteer' : `volunteer-${index}`,
      index === 0 ? 'Volontaire inquiet' : 'Volontaire',
      'Attend son tour de partir',
      'standing',
    ),
  );

  return { tableSlots, counterActors, backgroundActors };
}

function buildSubtitle(report: SceneSource, hasSurvivors: boolean): string {
  if (!hasSurvivors) {
    return "Personne n'a franchi la porte de la guilde ce soir.";
  }

  if (!report.cleared) {
    return 'Le boss est tombe. La taverne ne sait pas encore quoi en penser.';
  }

  return report.treasureStolen
    ? 'Ils reviennent fatigues, le tresor sous le bras.'
    : 'Ils reviennent fatigues, les mains vides mais entiers.';
}

function pickSceneMood(report: SceneSource, hasSurvivors: boolean): GuildSceneMood {
  if (!hasSurvivors) {
    return 'grim';
  }

  if (!report.cleared) {
    return 'somber';
  }

  if (report.treasureStolen || report.adventurersKilled > 0) {
    return 'tense';
  }

  return 'triumphant';
}

function beat(actor: TavernActor, text: string): TavernBeat {
  return { id: `${actor.id}-${text.length}-${text.charCodeAt(0)}`, actorId: actor.id, speakerName: actor.name, role: actor.role, text };
}

function buildSurvivorBeats(report: SceneSource, layout: TavernSceneLayout, dead: string[]): TavernBeat[] {
  const speakers = layout.tableSlots
    .map((slot) => slot.actor)
    .filter((actor): actor is TavernActor => actor !== null);

  if (speakers.length === 0) {
    return [];
  }

  const beats: TavernBeat[] = [];

  const hazardSpeaker = speakers.find((actor) => actor.role === 'thief') ?? speakers[0];
  beats.push(beat(hazardSpeaker, hazardLine(report)));

  const secondSpeaker = speakers.find((actor) => actor.id !== hazardSpeaker.id) ?? hazardSpeaker;
  beats.push(beat(secondSpeaker, outcomeLine(report, dead)));

  const volunteerNpc = layout.backgroundActors[0];

  if (volunteerNpc) {
    beats.push(beat(volunteerNpc, "Vous repartez quand meme ?"));
  }

  const archivist = layout.counterActors.find((actor) => actor.id === 'archivist');

  if (archivist && report.heldBackSurvivorNames.length > 0) {
    beats.push(beat(archivist, heldBackLine(report)));
  } else if (archivist && report.imposedRoleNote) {
    beats.push(beat(archivist, report.imposedRoleNote));
  }

  const veteranSpeaker = speakers.find((actor) => actor.isVeteran && actor.isReturning);

  if (veteranSpeaker) {
    beats.push(beat(veteranSpeaker, 'Oui. Cette fois, je connais le chemin.'));
  } else {
    const closingSpeaker = speakers[speakers.length - 1];
    beats.push(beat(closingSpeaker, dead.length > 0
      ? "On n'a pas pu tous les ramener. On reviendra quand meme."
      : 'On rentre. Ca suffira pour ce soir.'));
  }

  return dedupeBeats(beats).slice(0, 6);
}

function heldBackLine(report: SceneSource): string {
  const heldBack = report.heldBackSurvivorNames[0];

  if (report.doorNoThiefRetreats > 0 && heldBack) {
    return `La Guilde impose un voleur cette fois. ${heldBack} restera au rapport.`;
  }

  if (heldBack) {
    return `Un survivant est retenu a la guilde pour laisser place a un role indispensable.`;
  }

  return 'La Guilde reserve un slot a un role indispensable appris la derniere fois.';
}

function hazardLine(report: SceneSource): string {
  if (report.doorNoThiefRetreats > 0) {
    return "Les portes nous ont ralentis. Sans voleur, on n'a pas insiste.";
  }

  if (report.doorsPicked > 0) {
    return 'Le voleur a ouvert les serrures comme des coffres a bonbons.';
  }

  if (report.trapHighlights.length > 0) {
    return `${report.trapHighlights[0].label} nous a bloques dans le couloir.`;
  }

  if (report.minionHighlights.length > 0) {
    return `On parle encore de ${report.minionHighlights[0].label}. Assez fort pour faire baisser les voix.`;
  }

  if (report.bossAbilityUses > 0) {
    return "Le boss bougeait sans attendre les ordres du maitre du donjon. Personne n'avait vu ca.";
  }

  return 'Le boss etait plus proche que je croyais.';
}

function outcomeLine(report: SceneSource, dead: string[]): string {
  if (report.treasureStolen && dead.length > 0) {
    return `On a le tresor... mais ${dead[0]} n'est pas ressorti.`;
  }

  if (report.treasureStolen) {
    return "On est reparti avec le tresor. Ne demandez pas comment.";
  }

  if (!report.cleared) {
    return 'Le boss ne se relevera pas. On dirait presque un exploit.';
  }

  if (report.adventurersKilled > 0) {
    return "Le tresor est reste au fond. On n'a pas pu l'approcher, et ca a coute cher.";
  }

  return 'Le tresor est reste au fond, intact. On verra la prochaine fois.';
}

function buildNoSurvivorBeats(report: SceneSource, layout: TavernSceneLayout): TavernBeat[] {
  const archivist = layout.counterActors.find((actor) => actor.id === 'archivist') ?? layout.counterActors[0];
  const tavernkeeper = layout.counterActors.find((actor) => actor.id === 'tavernkeeper') ?? layout.counterActors[0];
  const anxiousVolunteer = layout.backgroundActors[0] ?? tavernkeeper;
  const rumor = npcActor('rumor', 'Une rumeur', 'Voix anonyme dans la salle', 'shadow');

  const beats: TavernBeat[] = [
    beat(archivist, 'Ils etaient cinq.'),
    beat(tavernkeeper, "Personne n'a franchi la porte depuis l'aube."),
    beat(anxiousVolunteer, 'Alors qui ira verifier ?'),
  ];

  if (report.trapHighlights.length > 0) {
    beats.push(beat(rumor, `Certains accusent surtout ${report.trapHighlights[0].label}.`));
  } else if (report.minionHighlights.length > 0) {
    beats.push(beat(rumor, `D'autres murmurent le nom de ${report.minionHighlights[0].label}.`));
  } else {
    beats.push(beat(rumor, 'On dit que le donjon garde les voix.'));
  }

  if (report.bossDamageTaken === 0) {
    beats.push(beat(archivist, "Le boss n'a meme pas eu besoin de se montrer."));
  } else {
    beats.push(beat(rumor, 'Le boss les a peut-etre atteints avant le tresor.'));
  }

  return dedupeBeats(beats).slice(0, 6);
}

function buildSummaryFacts(report: SceneSource): GuildTavernSummaryFact[] {
  const nextExpeditionValue = report.returningSurvivorNames.length > 0
    ? `${report.returningSurvivorNames.length} revenant${report.returningSurvivorNames.length > 1 ? 's' : ''}, ${report.newVolunteerCount} volontaire${report.newVolunteerCount > 1 ? 's' : ''}`
    : `${report.newVolunteerCount} nouveaux volontaires`;

  return [
    { label: 'Survivants', value: String(report.adventurersEscaped), tone: report.adventurersEscaped > 0 ? 'good' : 'bad' },
    { label: 'Morts', value: String(report.adventurersKilled), tone: report.adventurersKilled > 0 ? 'warning' : 'neutral' },
    { label: 'Tresor', value: report.treasureStolen ? 'Vole' : 'Protege', tone: report.treasureStolen ? 'bad' : 'good' },
    { label: 'Boss', value: report.cleared ? 'Toujours debout' : 'Vaincu', tone: report.cleared ? 'good' : 'bad' },
    { label: 'Or perdu', value: report.treasurePenaltyGold > 0 ? `${report.treasurePenaltyGold} or` : 'Aucun', tone: report.treasurePenaltyGold > 0 ? 'bad' : 'neutral' },
    { label: 'Prochaine expedition', value: nextExpeditionValue, tone: 'neutral' },
  ];
}

function dedupeBeats(beats: TavernBeat[]): TavernBeat[] {
  const seen = new Set<string>();
  return beats.filter((entry) => {
    if (seen.has(entry.text)) {
      return false;
    }

    seen.add(entry.text);
    return true;
  });
}
