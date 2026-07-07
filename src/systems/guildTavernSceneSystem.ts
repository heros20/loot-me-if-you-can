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
} from '../game/types';
import {
  ARCHIVIST_LINES,
  BOSS_FACED_LINES,
  BOSS_NOT_REACHED_LINES,
  DESPERATION_LINES,
  DISOBEY_LINES,
  DOOR_LINES,
  NO_SURVIVOR_LINES,
  RECRUITER_LINES,
  ROLE_LINES,
  SURVIVOR_GENERIC,
  TAVERNKEEPER_LINES,
  TRAP_LINES,
  TREASURE_NOT_TAKEN_LINES,
  TREASURE_TAKEN_LINES,
  VOLUNTEER_LINES,
  VETERAN_LINES,
  type DialogueContext,
  type SceneSource,
} from './tavernDialoguePools';
import { finalizeBeats, makeBeat, pickDialogueLine } from './tavernDialogueSequence';

const RETURNING_STATUS = new Set(['survivant', 'blesse', 'fuite']);

/**
 * Guild Tavern Scene V3: espace in-game (Phaser) + acteurs reels + dialogues
 * contextualises issus de pools larges. Chaque beat provient du rapport.
 */
export function buildGuildTavernScene(report: SceneSource): GuildTavernScene {
  const survivorParticipants = report.participants.filter((participant) => RETURNING_STATUS.has(participant.status));
  const deadParticipants = report.participants.filter((participant) => participant.status === 'mort' || participant.status === 'disparu');
  const hasSurvivors = survivorParticipants.length > 0;

  const survivorActors = buildSurvivorActors(survivorParticipants, report);
  const dead = deadParticipants.map((participant) => participant.name);
  const layout = buildLayout(report, survivorActors);
  const ctx = buildDialogueContext(report, dead);

  const beats = hasSurvivors
    ? buildSurvivorBeats(report, layout, ctx)
    : buildNoSurvivorBeats(report, layout, ctx);

  return {
    title: hasSurvivors ? 'La Guilde, au retour' : 'La Guilde, dans le silence',
    subtitle: buildSubtitle(report, hasSurvivors, dead),
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

function buildDialogueContext(report: SceneSource, dead: string[]): DialogueContext {
  return {
    report,
    dead,
    speakerName: '',
    firstDead: dead[0] ?? null,
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
    npcActor('tavernkeeper', 'Le tavernier', 'Comptoir'),
    npcActor('archivist', 'Archiviste', 'Registre'),
    npcActor('recruiter', 'Recruteur', 'Contrats'),
  ];

  const volunteerCount = Math.max(1, Math.min(4, report.newVolunteerCount));
  const backgroundActors: TavernActor[] = Array.from({ length: volunteerCount }, (_unused, index) =>
    npcActor(
      index === 0 ? 'anxious-volunteer' : `volunteer-${index}`,
      index === 0 ? 'Volontaire inquiet' : 'Volontaire',
      'Attend son tour',
      'standing',
    ),
  );

  return { tableSlots, counterActors, backgroundActors };
}

function buildSubtitle(report: SceneSource, hasSurvivors: boolean, dead: string[]): string {
  if (!hasSurvivors) {
    return 'Les chaises sont vides. La salle attend des noms qui ne viendront pas.';
  }

  if (!report.cleared) {
    return 'Le boss est tombe. Personne ne sait encore quoi en faire.';
  }

  if (dead.length > 0) {
    return `${report.adventurersEscaped} revenus. ${dead.length} noms a rayer.`;
  }

  return report.treasureStolen
    ? 'Ils reviennent avec le tresor. Fatigues.'
    : 'Ils reviennent entiers. Le tresor est reste la-bas.';
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

function buildSurvivorBeats(report: SceneSource, layout: TavernSceneLayout, ctx: DialogueContext): TavernBeat[] {
  const speakers = layout.tableSlots
    .map((slot) => slot.actor)
    .filter((actor): actor is TavernActor => actor !== null);

  if (speakers.length === 0) {
    return [];
  }

  const beats: TavernBeat[] = [];
  const usedIds = new Set<string>();
  const hazardSpeaker = pickSpeaker(speakers, ['thief', 'warrior']) ?? speakers[0];
  const secondSpeaker = speakers.find((actor) => actor.id !== hazardSpeaker.id) ?? hazardSpeaker;
  const thirdSpeaker = speakers.find((actor) => actor.id !== hazardSpeaker.id && actor.id !== secondSpeaker.id) ?? secondSpeaker;

  const hazardLine = pickHazardLine(hazardSpeaker, ctx, usedIds);

  if (hazardLine) {
    beats.push(makeBeat(hazardSpeaker.id, hazardSpeaker.name, hazardSpeaker.role, hazardLine, { ...ctx, speakerName: hazardSpeaker.name }));
    usedIds.add(hazardLine.id);
  }

  const outcomeLine = pickOutcomeLine(secondSpeaker, ctx, usedIds);

  if (outcomeLine) {
    beats.push(makeBeat(secondSpeaker.id, secondSpeaker.name, secondSpeaker.role, outcomeLine, { ...ctx, speakerName: secondSpeaker.name }));
    usedIds.add(outcomeLine.id);
  }

  const recruiter = layout.counterActors.find((actor) => actor.id === 'recruiter');
  const recruiterLine = pickRecruiterResponse(report, ctx, usedIds);

  if (recruiter && recruiterLine) {
    beats.push(makeBeat(recruiter.id, recruiter.name, recruiter.role, recruiterLine, { ...ctx, speakerName: recruiter.name }));
    usedIds.add(recruiterLine.id);
  }

  const volunteer = layout.backgroundActors[0];

  if (volunteer) {
    const volunteerLine = pickDialogueLine(VOLUNTEER_LINES, { ...ctx, speakerName: volunteer.name }, usedIds);

    if (volunteerLine) {
      beats.push(makeBeat(volunteer.id, volunteer.name, volunteer.role, volunteerLine, { ...ctx, speakerName: volunteer.name }));
      usedIds.add(volunteerLine.id);
    }
  }

  if (report.disobeys > 0) {
    const disobeySpeaker = speakers.find((actor) => actor.role === 'healer') ?? thirdSpeaker;
    const disobeyLine = pickDialogueLine(DISOBEY_LINES, { ...ctx, speakerName: disobeySpeaker.name }, usedIds);

    if (disobeyLine) {
      beats.push(makeBeat(disobeySpeaker.id, disobeySpeaker.name, disobeySpeaker.role, disobeyLine, { ...ctx, speakerName: disobeySpeaker.name }));
      usedIds.add(disobeyLine.id);
    }
  } else if (report.groupRetreats > 0 && report.bossDamageTaken > 40 && report.cleared) {
    const desperateSpeaker = speakers.find((actor) => actor.role === 'warrior') ?? hazardSpeaker;
    const desperateLine = pickDialogueLine(DESPERATION_LINES, { ...ctx, speakerName: desperateSpeaker.name }, usedIds);

    if (desperateLine) {
      beats.push(makeBeat(desperateSpeaker.id, desperateSpeaker.name, desperateSpeaker.role, desperateLine, { ...ctx, speakerName: desperateSpeaker.name }));
      usedIds.add(desperateLine.id);
    }
  }

  const archivist = layout.counterActors.find((actor) => actor.id === 'archivist');

  if (archivist && report.specialTreasureLoots.length > 0) {
    beats.push({
      id: 'special-treasure-loot',
      actorId: archivist.id,
      speakerName: archivist.name,
      role: archivist.role,
      text: report.specialTreasureLoots[0],
    });
  }

  if (archivist && report.heldBackSurvivorNames.length > 0) {
    const heldBack = report.heldBackSurvivorNames[0];
    const text = report.doorNoThiefRetreats > 0 && heldBack
      ? `La Guilde impose un voleur. ${heldBack} reste au rapport.`
      : 'Un survivant est retenu pour laisser place a un role indispensable.';

    beats.push({
      id: `heldback-${heldBack ?? 'role'}`,
      actorId: archivist.id,
      speakerName: archivist.name,
      role: archivist.role,
      text,
    });
  } else if (archivist && report.imposedRoleNote) {
    beats.push({
      id: 'imposed-role',
      actorId: archivist.id,
      speakerName: archivist.name,
      role: archivist.role,
      text: report.imposedRoleNote,
    });
  }

  const veteranSpeaker = speakers.find((actor) => actor.isVeteran && actor.isReturning);

  if (veteranSpeaker) {
    const veteranLine = pickDialogueLine(VETERAN_LINES, { ...ctx, speakerName: veteranSpeaker.name }, usedIds);

    if (veteranLine) {
      beats.push(makeBeat(veteranSpeaker.id, veteranSpeaker.name, veteranSpeaker.role, veteranLine, { ...ctx, speakerName: veteranSpeaker.name }));
    }
  } else if (ctx.dead.length > 0) {
    const tavernkeeper = layout.counterActors.find((actor) => actor.id === 'tavernkeeper');

    if (tavernkeeper) {
      const tkLine = pickDialogueLine(TAVERNKEEPER_LINES, { ...ctx, speakerName: tavernkeeper.name }, usedIds);

      if (tkLine) {
        beats.push(makeBeat(tavernkeeper.id, tavernkeeper.name, tavernkeeper.role, tkLine, { ...ctx, speakerName: tavernkeeper.name }));
      }
    }
  }

  return finalizeBeats(beats);
}

function buildNoSurvivorBeats(report: SceneSource, layout: TavernSceneLayout, ctx: DialogueContext): TavernBeat[] {
  const archivist = layout.counterActors.find((actor) => actor.id === 'archivist') ?? layout.counterActors[0];
  const tavernkeeper = layout.counterActors.find((actor) => actor.id === 'tavernkeeper') ?? layout.counterActors[0];
  const recruiter = layout.counterActors.find((actor) => actor.id === 'recruiter') ?? layout.counterActors[0];
  const anxiousVolunteer = layout.backgroundActors[0] ?? tavernkeeper;
  const usedIds = new Set<string>();
  const beats: TavernBeat[] = [];

  const openLine = pickDialogueLine(NO_SURVIVOR_LINES, { ...ctx, speakerName: archivist.name }, usedIds);

  if (openLine) {
    beats.push(makeBeat(archivist.id, archivist.name, archivist.role, openLine, { ...ctx, speakerName: archivist.name }));
    usedIds.add(openLine.id);
  }

  const waitLine = pickDialogueLine(
    NO_SURVIVOR_LINES.filter((entry) => entry.id !== openLine?.id),
    { ...ctx, speakerName: tavernkeeper.name },
    usedIds,
  );

  if (waitLine) {
    beats.push(makeBeat(tavernkeeper.id, tavernkeeper.name, tavernkeeper.role, waitLine, { ...ctx, speakerName: tavernkeeper.name }));
    usedIds.add(waitLine.id);
  }

  const volunteerLine = pickDialogueLine(VOLUNTEER_LINES, { ...ctx, speakerName: anxiousVolunteer.name }, usedIds);

  if (volunteerLine) {
    beats.push(makeBeat(anxiousVolunteer.id, anxiousVolunteer.name, anxiousVolunteer.role, volunteerLine, { ...ctx, speakerName: anxiousVolunteer.name }));
    usedIds.add(volunteerLine.id);
  }

  if (report.doorNoThiefRetreats > 0) {
    const doorLine = pickDialogueLine(DOOR_LINES, { ...ctx, speakerName: recruiter.name }, usedIds);

    if (doorLine) {
      beats.push(makeBeat(recruiter.id, recruiter.name, recruiter.role, doorLine, { ...ctx, speakerName: recruiter.name }));
      usedIds.add(doorLine.id);
    }
  } else if (report.trapHighlights.length > 0) {
    const trapLine = pickDialogueLine(TRAP_LINES, { ...ctx, speakerName: archivist.name }, usedIds);

    if (trapLine) {
      beats.push(makeBeat(archivist.id, archivist.name, archivist.role, trapLine, { ...ctx, speakerName: archivist.name }));
      usedIds.add(trapLine.id);
    }
  } else if (report.minionHighlights.length > 0) {
    const minionLabel = report.minionHighlights[0].label;
    beats.push({
      id: 'minion-rumor',
      actorId: anxiousVolunteer.id,
      speakerName: anxiousVolunteer.name,
      role: anxiousVolunteer.role,
      text: `On murmure surtout le nom de ${minionLabel}.`,
    });
  }

  const recruitLine = pickDialogueLine(RECRUITER_LINES, { ...ctx, speakerName: recruiter.name }, usedIds);

  if (recruitLine) {
    beats.push(makeBeat(recruiter.id, recruiter.name, recruiter.role, recruitLine, { ...ctx, speakerName: recruiter.name }));
  }

  return finalizeBeats(beats);
}

function pickSpeaker(speakers: TavernActor[], preferredRoles: TavernActor['role'][]): TavernActor | null {
  for (const role of preferredRoles) {
    const match = speakers.find((actor) => actor.role === role);

    if (match) {
      return match;
    }
  }

  return speakers[0] ?? null;
}

function pickHazardLine(speaker: TavernActor, ctx: DialogueContext, usedIds: Set<string>) {
  if (ctx.report.doorNoThiefRetreats > 0) {
    return pickDialogueLine(DOOR_LINES, { ...ctx, speakerName: speaker.name }, usedIds);
  }

  if (ctx.report.doorsPicked > 0) {
    return pickDialogueLine(DOOR_LINES.filter((entry) => entry.id === 'door-04' || entry.id === 'door-05'), { ...ctx, speakerName: speaker.name }, usedIds)
      ?? pickDialogueLine(DOOR_LINES, { ...ctx, speakerName: speaker.name }, usedIds);
  }

  if (ctx.report.trapHighlights.length > 0) {
    return pickDialogueLine(TRAP_LINES, { ...ctx, speakerName: speaker.name }, usedIds);
  }

  if (ctx.report.bossAbilityUses > 0 || ctx.report.bossDamageTaken > 0) {
    return pickDialogueLine(BOSS_FACED_LINES, { ...ctx, speakerName: speaker.name }, usedIds);
  }

  const rolePool = ROLE_LINES[speaker.role as keyof typeof ROLE_LINES];

  if (rolePool) {
    return pickDialogueLine(rolePool, { ...ctx, speakerName: speaker.name }, usedIds);
  }

  return pickDialogueLine(SURVIVOR_GENERIC, { ...ctx, speakerName: speaker.name }, usedIds);
}

function pickOutcomeLine(speaker: TavernActor, ctx: DialogueContext, usedIds: Set<string>) {
  if (ctx.report.treasureStolen) {
    return pickDialogueLine(TREASURE_TAKEN_LINES, { ...ctx, speakerName: speaker.name }, usedIds);
  }

  if (!ctx.report.cleared) {
    return pickDialogueLine(BOSS_FACED_LINES.filter((entry) => entry.id === 'boss-y-02'), { ...ctx, speakerName: speaker.name }, usedIds)
      ?? pickDialogueLine(BOSS_FACED_LINES, { ...ctx, speakerName: speaker.name }, usedIds);
  }

  if (ctx.dead.length > 0) {
    const rolePool = ROLE_LINES[speaker.role as keyof typeof ROLE_LINES];
    const roleLine = rolePool ? pickDialogueLine(rolePool, { ...ctx, speakerName: speaker.name }, usedIds) : null;

    if (roleLine) {
      return roleLine;
    }
  }

  if (ctx.report.bossDamageTaken === 0) {
    return pickDialogueLine(BOSS_NOT_REACHED_LINES, { ...ctx, speakerName: speaker.name }, usedIds);
  }

  return pickDialogueLine(TREASURE_NOT_TAKEN_LINES, { ...ctx, speakerName: speaker.name }, usedIds);
}

function pickRecruiterResponse(report: SceneSource, ctx: DialogueContext, usedIds: Set<string>) {
  if (report.doorNoThiefRetreats > 0) {
    return pickDialogueLine(RECRUITER_LINES.filter((entry) => entry.id === 'rec-01'), { ...ctx, speakerName: 'Recruteur' }, usedIds)
      ?? pickDialogueLine(RECRUITER_LINES, { ...ctx, speakerName: 'Recruteur' }, usedIds);
  }

  if (report.imposedRoleNote) {
    return pickDialogueLine(ARCHIVIST_LINES.filter((entry) => entry.id === 'arc-04'), { ...ctx, speakerName: 'Recruteur' }, usedIds)
      ?? pickDialogueLine(RECRUITER_LINES, { ...ctx, speakerName: 'Recruteur' }, usedIds);
  }

  if (report.newVolunteerCount >= PARTY_SIZE) {
    return pickDialogueLine(RECRUITER_LINES.filter((entry) => entry.id === 'rec-05'), { ...ctx, speakerName: 'Recruteur' }, usedIds);
  }

  return pickDialogueLine(RECRUITER_LINES, { ...ctx, speakerName: 'Recruteur' }, usedIds);
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
