import { PARTY_SIZE } from '../game/constants';
import type { AdventurerProfile, AdventurerRole, AdaptationMemory, RunWorldMemory } from '../game/types';
import {
  createAdventurerProfile,
  createHeirProfile,
  getReturningSurvivorCandidates,
  pickFallenForHeir,
  recoverAvailableProfiles,
} from './adventurerProfiles';

/** Roles que la Guilde impose avant de remplir avec des survivants. Extensible. */
export type MandatoryRoleRequirements = Partial<Record<AdventurerRole, number>>;

export interface ExpeditionCompositionContext {
  wave: number;
  hasActiveLockedDoor: boolean;
  doorBlockedWithoutThief: boolean;
  rolePressure: AdaptationMemory['rolePressure'];
}

export interface ExpeditionCompositionPlan {
  returningProfiles: AdventurerProfile[];
  benchedProfiles: AdventurerProfile[];
  mandatoryRoles: MandatoryRoleRequirements;
  recruitRoles: AdventurerRole[];
  imposedRoleLabel: string | null;
  heldBackReason: string | null;
}

/**
 * Detecte les roles que la Guilde doit imposer avant de privilegier les survivants.
 * V1 : au moins un voleur si une porte bloque encore le donjon ou si la derniere
 * expedition a du rebrousser chemin faute de specialiste.
 */
export function resolveMandatoryRoles(
  survivors: AdventurerProfile[],
  context: ExpeditionCompositionContext,
): MandatoryRoleRequirements {
  const mandatory: MandatoryRoleRequirements = {};

  if (survivors.some((profile) => profile.role === 'thief')) {
    return mandatory;
  }

  const learnedThiefNeed =
    survivors.length > 0 &&
    (context.doorBlockedWithoutThief || (context.rolePressure.thief ?? 0) >= 3);
  const needsThief = context.hasActiveLockedDoor || learnedThiefNeed;

  if (needsThief) {
    mandatory.thief = 1;
  }

  return mandatory;
}

function countUnmetMandatoryRoles(
  survivors: AdventurerProfile[],
  mandatoryRoles: MandatoryRoleRequirements,
): number {
  let slots = 0;

  (Object.entries(mandatoryRoles) as Array<[AdventurerRole, number | undefined]>).forEach(([role, required]) => {
    if (!required || required <= 0) {
      return;
    }

    const covered = survivors.filter((profile) => profile.role === role).length;

    slots += Math.max(0, required - covered);
  });

  return slots;
}

function retentionScore(
  profile: AdventurerProfile,
  candidates: AdventurerProfile[],
  veteranId: string | null,
): number {
  const duplicateRoleCount = candidates.filter((candidate) => candidate.role === profile.role).length;
  let score =
    profile.survivedExpeditions * 12 +
    profile.expeditionCount * 4 +
    profile.reputation +
    profile.level;

  if (profile.id === veteranId) {
    score += 60;
  }

  if (duplicateRoleCount > 1) {
    score -= 18;
  }

  if (profile.lifeStatus === 'injured') {
    score -= 22;
  }

  if (profile.trauma > 0) {
    score -= profile.trauma * 3;
  }

  return score;
}

function pickReturningSurvivors(
  candidates: AdventurerProfile[],
  limit: number,
): { retained: AdventurerProfile[]; benched: AdventurerProfile[] } {
  if (candidates.length <= limit) {
    return { retained: candidates, benched: [] };
  }

  const veteranId = candidates[0]?.id ?? null;
  const ranked = [...candidates].sort(
    (a, b) => retentionScore(b, candidates, veteranId) - retentionScore(a, candidates, veteranId),
  );

  return {
    retained: ranked.slice(0, limit),
    benched: ranked.slice(limit),
  };
}

function consumeFixedRoleSlots(roles: AdventurerRole[], fixedRoles: AdventurerRole[]): AdventurerRole[] {
  const remaining = [...roles];

  fixedRoles.forEach((role) => {
    const index = remaining.indexOf(role);

    if (index >= 0) {
      remaining.splice(index, 1);
    } else if (remaining.length > 0) {
      remaining.shift();
    }
  });

  return remaining;
}

function ensureMandatoryRecruitRoles(
  remainingRoles: AdventurerRole[],
  retained: AdventurerProfile[],
  mandatoryRoles: MandatoryRoleRequirements,
): AdventurerRole[] {
  const roles = [...remainingRoles];

  (Object.entries(mandatoryRoles) as Array<[AdventurerRole, number | undefined]>).forEach(([role, required]) => {
    if (!required || required <= 0) {
      return;
    }

    const covered = retained.filter((profile) => profile.role === role).length;
    const missing = Math.max(0, required - covered);

    for (let index = 0; index < missing; index += 1) {
      const existingIndex = roles.indexOf(role);

      if (existingIndex >= 0) {
        roles.splice(existingIndex, 1);
      }

      roles.unshift(role);
    }
  });

  return roles;
}

function buildHeldBackReason(
  benched: AdventurerProfile[],
  mandatoryRoles: MandatoryRoleRequirements,
): string | null {
  if (benched.length === 0) {
    return null;
  }

  const imposedRoles = (Object.entries(mandatoryRoles) as Array<[AdventurerRole, number | undefined]>)
    .filter(([, count]) => (count ?? 0) > 0)
    .map(([role]) => roleLabel(role));

  if (imposedRoles.length === 0) {
    return null;
  }

  const names = benched.map((profile) => profile.name).join(', ');
  const roleLabelText = imposedRoles.join(', ');

  return benched.length === 1
    ? `La Guilde impose ${roleLabelText} cette fois. ${names} reste au rapport.`
    : `La Guilde impose ${roleLabelText} cette fois. ${names} restent au rapport.`;
}

function buildImposedRoleLabel(mandatoryRoles: MandatoryRoleRequirements): string | null {
  const imposedRoles = (Object.entries(mandatoryRoles) as Array<[AdventurerRole, number | undefined]>)
    .filter(([, count]) => (count ?? 0) > 0)
    .map(([role]) => roleLabel(role));

  if (imposedRoles.length === 0) {
    return null;
  }

  return imposedRoles.length === 1
    ? `${imposedRoles[0]} impose par la Guilde`
    : `${imposedRoles.join(', ')} imposes par la Guilde`;
}

function roleLabel(role: AdventurerRole): string {
  switch (role) {
    case 'warrior':
      return 'guerrier';
    case 'thief':
      return 'voleur';
    case 'mage':
      return 'mage';
    case 'healer':
      return 'soigneur';
    default:
      return role;
  }
}

export function planExpeditionComposition(
  roles: AdventurerRole[],
  world: RunWorldMemory,
  context: ExpeditionCompositionContext,
): ExpeditionCompositionPlan {
  const candidates = getReturningSurvivorCandidates(world, PARTY_SIZE);
  const mandatoryRoles = resolveMandatoryRoles(candidates, context);
  const reservedSlots = countUnmetMandatoryRoles(candidates, mandatoryRoles);
  const maxReturning = Math.max(0, PARTY_SIZE - reservedSlots);
  const { retained, benched } = pickReturningSurvivors(candidates, maxReturning);
  const recruitRoles = ensureMandatoryRecruitRoles(
    consumeFixedRoleSlots(roles, retained.map((profile) => profile.role)),
    retained,
    mandatoryRoles,
  );

  return {
    returningProfiles: retained,
    benchedProfiles: benched,
    mandatoryRoles,
    recruitRoles,
    imposedRoleLabel: buildImposedRoleLabel(mandatoryRoles),
    heldBackReason: buildHeldBackReason(benched, mandatoryRoles),
  };
}

export function selectProfilesForWave(
  roles: AdventurerRole[],
  world: RunWorldMemory,
  wave: number,
  context: ExpeditionCompositionContext,
): { profiles: AdventurerProfile[]; plan: ExpeditionCompositionPlan } {
  recoverAvailableProfiles(world);
  const plan = planExpeditionComposition(roles, world, context);
  const selected: AdventurerProfile[] = [...plan.returningProfiles];
  const remainingRoles = [...plan.recruitRoles];

  while (selected.length < PARTY_SIZE) {
    const role = remainingRoles.shift() ?? 'warrior';
    const index = selected.length;

    if (index % 4 === 1) {
      const fallen = pickFallenForHeir(world, role, wave);

      if (fallen) {
        const heir = createHeirProfile(world, fallen, wave);
        selected.push(heir);
        continue;
      }
    }

    const profile = createAdventurerProfile(role, world, wave, index);
    world.profiles[profile.id] = profile;
    selected.push(profile);
  }

  return {
    profiles: selected.slice(0, PARTY_SIZE),
    plan,
  };
}
