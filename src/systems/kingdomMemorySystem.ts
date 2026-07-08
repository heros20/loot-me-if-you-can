import { cellKey } from '../game/constants';
import type {
  KingdomMemoryFact,
  KingdomMemoryObservation,
  KingdomMemoryPrecision,
  RunWorldMemory,
} from '../game/types';

export const CARTOGRAPHER_CONFIDENCE_BOOST = 0.22;
export const CARTOGRAPHER_OBSERVATION_RADIUS = 4.0;
export const BASE_OBSERVATION_RADIUS = 2.35;
export const CARTOGRAPHER_STALE_RESOLVE_BOOST = 0.12;
export const CARTOGRAPHER_SPECIAL_TREASURE_REPORT_BOOST = 0.08;
export const CARTOGRAPHER_TRAP_REPORT_BOOST = 0.07;
export const CARTOGRAPHER_ZONE_REPORT_BOOST = 0.08;

const STALE_AFTER_WAVES = 3;

export interface KingdomMemoryCommitResult {
  committedObservations: number;
  cartographerReports: number;
  lostCartographerReports: number;
  cartographerNames: string[];
  lostCartographerNames: string[];
  improvedFacts: KingdomMemoryFact[];
}

export function ageKingdomMemory(world: RunWorldMemory, wave: number): void {
  world.kingdomFacts.forEach((fact) => {
    fact.age = Math.max(0, wave - fact.lastSeenWave);
    fact.stale = fact.age >= STALE_AFTER_WAVES;

    if (fact.stale) {
      fact.confidence = clamp(fact.confidence - 0.02, 0.12, 0.98);
    }
  });
}

export function commitSurvivorObservations(
  world: RunWorldMemory,
  observations: KingdomMemoryObservation[],
  survivorProfileIds: string[],
  wave: number,
): KingdomMemoryCommitResult {
  ageKingdomMemory(world, wave);

  const survivorIds = new Set(survivorProfileIds);
  const lostCartographerNames = new Set<string>();
  const cartographerNames = new Set<string>();
  const improvedFacts: KingdomMemoryFact[] = [];
  let committedObservations = 0;
  let cartographerReports = 0;

  observations.forEach((observation) => {
    const survived = survivorIds.has(observation.observerProfileId);
    const fromCartographer = observation.observerRole === 'cartographer';

    if (!survived) {
      if (fromCartographer) {
        lostCartographerNames.add(observation.observerName);
      }

      return;
    }

    const fact = upsertFact(world, observation, wave);
    const boost = confidenceBoostFor(observation, fact.stale);
    const nextConfidence = clamp(observation.confidence + boost, 0.1, fromCartographer ? 0.94 : 0.78);
    const confirmationBoost = fromCartographer ? 0.18 : 0.08;

    fact.confidence = clamp(Math.max(fact.confidence, nextConfidence) + confirmationBoost, 0.1, fromCartographer ? 0.98 : 0.86);
    fact.confirmations += fromCartographer ? 2 : 1;
    fact.lastSeenWave = wave;
    fact.age = 0;
    fact.stale = false;
    fact.sourceSurvivorProfileId = observation.observerProfileId;
    fact.sourceRole = observation.observerRole;
    fact.precision = bestPrecision(fact.precision, fromCartographer ? upgradePrecision(observation.precision) : observation.precision);
    fact.confirmedByCartographer ||= fromCartographer;

    committedObservations += 1;
    improvedFacts.push({ ...fact, cell: fact.cell ? { ...fact.cell } : null });

    if (fromCartographer) {
      cartographerReports += 1;
      cartographerNames.add(observation.observerName);
    }
  });

  world.lostCartographerReports += lostCartographerNames.size;

  return {
    committedObservations,
    cartographerReports,
    lostCartographerReports: lostCartographerNames.size,
    cartographerNames: [...cartographerNames],
    lostCartographerNames: [...lostCartographerNames],
    improvedFacts,
  };
}

export function computeCartographerRecruitmentPressure(world: RunWorldMemory): number {
  const facts = world.kingdomFacts;

  if (facts.length === 0) {
    return 0.2;
  }

  const staleCount = facts.filter((fact) => fact.stale).length;
  const lowConfidenceCount = facts.filter((fact) => fact.confidence < 0.48).length;
  const uncertainSpecialCount = facts.filter(
    (fact) =>
      (fact.kind === 'specialTreasureSeen' ||
        fact.kind === 'trapSeen' ||
        fact.kind === 'bossSeen' ||
        fact.kind === 'guardianSeen' ||
        fact.kind === 'antechamberSeen' ||
        fact.kind === 'bossApproachKnown' ||
        fact.kind === 'roomLockTrapSeen' ||
        fact.kind === 'dangerousRoomSeen') &&
      fact.confidence < 0.62,
  ).length;
  const routeConcernCount = facts.filter(
    (fact) => (fact.kind === 'routeBlocked' || fact.kind === 'routeChangedSuspected') && fact.confidence < 0.7,
  ).length;

  return Math.min(
    3.2,
    staleCount * 0.32 +
      lowConfidenceCount * 0.2 +
      uncertainSpecialCount * 0.34 +
      routeConcernCount * 0.55 +
      world.lostCartographerReports * 0.18,
  );
}

export function summarizeCartographyResult(result: KingdomMemoryCommitResult): string[] {
  const lines: string[] = [];

  if (result.cartographerReports > 0) {
    const names = result.cartographerNames.slice(0, 2).join(', ');
    lines.push(
      names
        ? `${names} remet un croquis: ${result.cartographerReports} fait${result.cartographerReports > 1 ? 's' : ''} gagne${result.cartographerReports > 1 ? 'nt' : ''} en confiance.`
        : `Un croquis fiable renforce ${result.cartographerReports} fait${result.cartographerReports > 1 ? 's' : ''}.`,
    );
  }

  if (result.lostCartographerReports > 0) {
    const names = result.lostCartographerNames.slice(0, 2).join(', ');
    lines.push(
      names
        ? `${names} n'est pas revenu. La carte non plus.`
        : "Le cartographe n'est pas revenu. La carte non plus.",
    );
  }

  return lines;
}

function upsertFact(world: RunWorldMemory, observation: KingdomMemoryObservation, wave: number): KingdomMemoryFact {
  const existing = world.kingdomFacts.find((fact) => sameFact(fact, observation));

  if (existing) {
    return existing;
  }

  const fact: KingdomMemoryFact = {
    id: `kingdom-fact-${world.kingdomFacts.length + 1}`,
    kind: observation.kind,
    label: observation.label,
    mapId: observation.mapId ?? null,
    cell: observation.cell ? { ...observation.cell } : null,
    precision: observation.precision,
    confidence: 0,
    confirmations: 0,
    firstSeenWave: wave,
    lastSeenWave: wave,
    age: 0,
    stale: false,
    sourceSurvivorProfileId: null,
    sourceRole: null,
    confirmedByCartographer: false,
  };

  world.kingdomFacts.push(fact);
  return fact;
}

function sameFact(fact: KingdomMemoryFact, observation: KingdomMemoryObservation): boolean {
  if (fact.kind !== observation.kind) {
    return false;
  }

  const factCell = fact.cell ? cellKey(fact.cell) : null;
  const observationCell = observation.cell ? cellKey(observation.cell) : null;

  return fact.mapId === (observation.mapId ?? null) && factCell === observationCell && fact.label === observation.label;
}

function confidenceBoostFor(observation: KingdomMemoryObservation, wasStale: boolean): number {
  if (observation.observerRole !== 'cartographer') {
    return 0;
  }

  const kindBoost =
    observation.kind === 'trapSeen'
      ? CARTOGRAPHER_TRAP_REPORT_BOOST
      : observation.kind === 'specialTreasureSeen'
        ? CARTOGRAPHER_SPECIAL_TREASURE_REPORT_BOOST
        : observation.kind === 'guardianSeen' ||
            observation.kind === 'guardianFought' ||
            observation.kind === 'zoneReached' ||
            observation.kind === 'antechamberSeen' ||
            observation.kind === 'bossApproachKnown' ||
            observation.kind === 'dangerousZoneSeen' ||
            observation.kind === 'roomLockTrapSeen' ||
            observation.kind === 'dangerousRoomSeen' ||
            observation.kind === 'trappedRoomSurvived'
          ? CARTOGRAPHER_ZONE_REPORT_BOOST
        : 0;

  return CARTOGRAPHER_CONFIDENCE_BOOST + kindBoost + (wasStale ? CARTOGRAPHER_STALE_RESOLVE_BOOST : 0);
}

function upgradePrecision(precision: KingdomMemoryPrecision): KingdomMemoryPrecision {
  if (precision === 'vague') {
    return 'room';
  }

  return 'exact';
}

function bestPrecision(a: KingdomMemoryPrecision, b: KingdomMemoryPrecision): KingdomMemoryPrecision {
  const score: Record<KingdomMemoryPrecision, number> = {
    vague: 0,
    room: 1,
    exact: 2,
  };

  return score[b] > score[a] ? b : a;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
