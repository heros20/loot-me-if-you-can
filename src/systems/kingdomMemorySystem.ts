import { cellKey } from '../game/constants';
import type {
  AdventurerProfile,
  AdventurerRole,
  DungeonTile,
  DungeonTreasure,
  GridCell,
  KingdomMemory,
  KingdomMemoryFact,
  KingdomMemoryFactType,
  KingdomMemoryObservation,
  KingdomMemoryPrecision,
  LegacyKingdomMemoryFact,
  RunWorldMemory,
  WaveStats,
} from '../game/types';
import { getTileAt } from '../game/dungeonTiles';
import { isSpecialTreasureKind, specialKindFromTreasureKind, specialTreasureLabel } from './specialTreasuresSystem';

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

export const KINGDOM_MEMORY_BALANCE = {
  maxFacts: 32,
  baseConfidence: 0.56,
  strongConfidence: 0.72,
  weakConfidence: 0.32,
  confirmationBoost: 0.16,
  confidenceDecayPerExpedition: 0.025,
  stalePenalty: 0.28,
  lowConfidenceCutoff: 0.18,
  reliableFactConfidence: 0.62,
} as const;

export function createInitialKingdomMemory(): KingdomMemory {
  return {
    facts: [],
    nextFactId: 1,
  };
}

export function rememberExpeditionFromSurvivors(input: {
  world: RunWorldMemory;
  stats: WaveStats;
  wave: number;
  tiles: DungeonTile[];
  survivors: AdventurerProfile[];
}): string[] {
  decayLegacyKingdomMemory(input.world.kingdomMemory, input.wave);

  if (input.survivors.length === 0) {
    addLegacyKingdomFact(input.world.kingdomMemory, {
      type: 'partyWipedHere',
      cell: null,
      wave: input.wave,
      source: null,
      confidence: KINGDOM_MEMORY_BALANCE.weakConfidence,
      danger: input.stats.adventurersKilled,
      label: "Une expedition n'est pas revenue du donjon.",
      data: { killed: input.stats.adventurersKilled },
    });
    return summarizeKingdomMemory(input.world.kingdomMemory, input.wave, 3);
  }

  const source = pickLegacySource(input.survivors);

  input.stats.observedDoorCells.forEach((cell) => addLegacyKingdomFact(input.world.kingdomMemory, {
    type: 'lockedDoorSeen',
    cell,
    wave: input.wave,
    source,
    confidence: KINGDOM_MEMORY_BALANCE.baseConfidence + 0.08,
    danger: input.stats.doorNoThiefRetreats > 0 ? 3 : 1,
    label: 'Porte verrouillee signalee.',
    data: { locked: true },
  }));

  input.stats.observedTrapCells.forEach((cell) => addLegacyKingdomFact(input.world.kingdomMemory, {
    type: 'trapSeen',
    cell,
    wave: input.wave,
    source,
    confidence: KINGDOM_MEMORY_BALANCE.baseConfidence + 0.08,
    danger: input.stats.heavyDamageCells[cellKey(cell)] ?? 1,
    label: 'Piege signale par les survivants.',
    data: {},
  }));

  input.stats.observedDefenderCells.forEach((cell) => addLegacyKingdomFact(input.world.kingdomMemory, {
    type: 'defenderSeen',
    cell,
    wave: input.wave,
    source,
    confidence: KINGDOM_MEMORY_BALANCE.baseConfidence + 0.08,
    danger: input.stats.heavyDamageCells[cellKey(cell)] ?? 1,
    label: 'Defenseur signale.',
    data: {},
  }));

  Object.entries(input.stats.heavyDamageCells)
    .filter(([, damage]) => damage >= 18)
    .forEach(([key, damage]) => addLegacyKingdomFact(input.world.kingdomMemory, {
      type: 'heavyDamageArea',
      cell: parseLegacyCellKey(key),
      wave: input.wave,
      source,
      confidence: KINGDOM_MEMORY_BALANCE.baseConfidence + 0.08,
      danger: Number(damage),
      label: 'Zone dangereuse rapportee.',
      data: { damage: Number(damage) },
    }));

  if (input.stats.roomEvaluations > 0 && (input.stats.observedTrapCells.length > 0 || input.stats.observedDefenderCells.length > 0 || input.stats.observedBoss)) {
    addLegacyKingdomFact(input.world.kingdomMemory, {
      type: 'dangerousRoomSeen',
      cell: input.stats.observedTrapCells[0] ?? input.stats.observedDefenderCells[0] ?? null,
      wave: input.wave,
      source,
      confidence: KINGDOM_MEMORY_BALANCE.baseConfidence + 0.08,
      danger: input.stats.roomEvaluations,
      label: 'Salle dangereuse signalee.',
      data: { roomEvaluations: input.stats.roomEvaluations },
    });
  }

  input.stats.observedSpecialTreasures.forEach((treasure) => {
    const specialKind = specialKindFromTreasureKind(treasure.kind);
    addLegacyKingdomFact(input.world.kingdomMemory, {
      type: 'specialTreasureSeen',
      cell: treasure.cell,
      wave: input.wave,
      source,
      confidence: input.stats.specialTreasureLoots.length > 0 ? KINGDOM_MEMORY_BALANCE.strongConfidence : KINGDOM_MEMORY_BALANCE.baseConfidence + 0.08,
      danger: 0,
      label: specialKind ? `${specialTreasureLabel(specialKind)} signale.` : 'Tresor special signale.',
      data: { treasureKind: treasure.kind },
    });
  });

  if (input.stats.treasureStolen || input.stats.treasureValueStolen > 0) {
    addLegacyKingdomFact(input.world.kingdomMemory, {
      type: 'treasureSeen',
      cell: null,
      wave: input.wave,
      source,
      confidence: KINGDOM_MEMORY_BALANCE.strongConfidence,
      danger: 0,
      label: 'Route vers un tresor confirmee.',
      data: { stolenValue: input.stats.treasureValueStolen },
    });
  }

  if (input.stats.observedBoss || input.stats.bossDamageTaken > 0) {
    addLegacyKingdomFact(input.world.kingdomMemory, {
      type: input.stats.bossDamageTaken > 0 ? 'bossReached' : 'bossSeen',
      cell: null,
      wave: input.wave,
      source,
      confidence: KINGDOM_MEMORY_BALANCE.baseConfidence + 0.1,
      danger: input.stats.bossDamageTaken,
      label: input.stats.bossDamageTaken > 0 ? 'Boss atteint.' : 'Boss apercu.',
      data: { bossDamageTaken: input.stats.bossDamageTaken },
    });
  }

  if (input.stats.doorNoThiefRetreats > 0) {
    addLegacyKingdomFact(input.world.kingdomMemory, {
      type: 'routeBlocked',
      cell: input.stats.observedDoorCells[0] ?? null,
      wave: input.wave,
      source,
      confidence: KINGDOM_MEMORY_BALANCE.strongConfidence,
      danger: 3,
      label: 'Route bloquee sans voleur.',
      data: { reason: 'lockedDoorNoThief' },
    });
  }

  input.stats.observedRouteChanges.forEach((cell) => {
    markLegacyFactsNearCellStale(input.world.kingdomMemory, cell);
    addLegacyKingdomFact(input.world.kingdomMemory, {
      type: 'routeChangedSuspected',
      cell,
      wave: input.wave,
      source,
      confidence: KINGDOM_MEMORY_BALANCE.baseConfidence,
      danger: 1,
      label: 'Le donjon semble avoir change.',
      data: { blockedCell: cellKey(cell) },
    });
  });

  markLegacyContradictedFactsFromVisitedRock(input.world.kingdomMemory, input.tiles, input.stats.observedRouteChanges);
  trimLegacyKingdomMemory(input.world.kingdomMemory);
  return summarizeKingdomMemory(input.world.kingdomMemory, input.wave, 3);
}

export function summarizeKingdomMemory(memory: KingdomMemory, currentWave: number, limit = 3): string[] {
  return memory.facts
    .filter((fact) => fact.confidence >= KINGDOM_MEMORY_BALANCE.lowConfidenceCutoff)
    .sort((a, b) => b.confidence - a.confidence || b.lastSeenWave - a.lastSeenWave)
    .slice(0, limit)
    .map((fact) => `${legacyConfidenceLabel(fact.confidence)} rumeur : ${legacyFactSummary(fact, currentWave)}`);
}

export function kingdomMemoryRolePressure(memory: KingdomMemory, currentWave: number): Partial<Record<AdventurerRole, number>> {
  const pressure: Partial<Record<AdventurerRole, number>> = {};

  reliableLegacyFacts(memory, currentWave).forEach((fact) => {
    switch (fact.type) {
      case 'lockedDoorSeen':
      case 'routeBlocked':
        pressure.thief = (pressure.thief ?? 0) + 2.2;
        break;
      case 'trapSeen':
        pressure.thief = (pressure.thief ?? 0) + 1.3;
        break;
      case 'dangerousRoomSeen':
      case 'heavyDamageArea':
        pressure.warrior = (pressure.warrior ?? 0) + 0.9;
        pressure.healer = (pressure.healer ?? 0) + 1.1;
        break;
      case 'defenderSeen':
        pressure.warrior = (pressure.warrior ?? 0) + 0.6;
        pressure.mage = (pressure.mage ?? 0) + 0.8;
        break;
      case 'bossReached':
      case 'bossSeen':
        pressure.warrior = (pressure.warrior ?? 0) + 0.9;
        pressure.healer = (pressure.healer ?? 0) + 0.9;
        break;
      case 'specialTreasureSeen':
        addLegacySpecialTreasurePressure(pressure, fact.data.treasureKind);
        break;
      default:
        break;
    }
  });

  return pressure;
}

export function kingdomMemorySuggestsLockedDoor(memory: KingdomMemory, currentWave: number): boolean {
  return reliableLegacyFacts(memory, currentWave).some((fact) => fact.type === 'lockedDoorSeen' || fact.type === 'routeBlocked');
}

export function knownTrapCellsFromKingdomMemory(memory: KingdomMemory, currentWave: number): Set<string> {
  return new Set(
    reliableLegacyFacts(memory, currentWave)
      .filter((fact) => fact.type === 'trapSeen' && fact.cell)
      .map((fact) => cellKey(fact.cell as GridCell)),
  );
}

export function kingdomTreasureAttractionBonus(
  memory: KingdomMemory,
  treasure: DungeonTreasure,
  role: AdventurerRole | null,
  currentWave: number,
): number {
  if (!isSpecialTreasureKind(treasure.kind)) {
    return 0;
  }

  const relevant = reliableLegacyFacts(memory, currentWave).some((fact) =>
    fact.type === 'specialTreasureSeen' &&
    fact.data.treasureKind === treasure.kind &&
    (!fact.cell || cellKey(fact.cell) === cellKey(treasure.cell)),
  );

  if (!relevant) {
    return 0;
  }

  if (treasure.kind === 'specialArmor') {
    return role === 'warrior' ? 16 : 7;
  }

  if (treasure.kind === 'specialWeapon') {
    return role === 'warrior' || role === 'thief' ? 14 : 5;
  }

  if (treasure.kind === 'specialTechnique') {
    return role === 'mage' || role === 'healer' || role === 'thief' ? 15 : 5;
  }

  return 6;
}

export function nearbyRememberedRouteFact(memory: KingdomMemory, cell: GridCell, currentWave: number): LegacyKingdomMemoryFact | null {
  return reliableLegacyFacts(memory, currentWave)
    .filter((fact) => fact.cell !== null && fact.type !== 'routeChangedSuspected')
    .find((fact) => fact.cell && Math.abs(fact.cell.x - cell.x) + Math.abs(fact.cell.y - cell.y) <= 1) ?? null;
}

function addLegacyKingdomFact(
  memory: KingdomMemory,
  input: {
    type: KingdomMemoryFactType;
    cell: GridCell | null;
    wave: number;
    source: AdventurerProfile | null;
    confidence: number;
    danger: number;
    label: string;
    data: Record<string, string | number | boolean | null>;
  },
): LegacyKingdomMemoryFact {
  const existing = memory.facts.find((fact) =>
    fact.type === input.type &&
    sameLegacyOptionalCell(fact.cell, input.cell) &&
    fact.data.treasureKind === input.data.treasureKind &&
    fact.data.reason === input.data.reason,
  );

  if (existing) {
    existing.confirmations += 1;
    existing.lastSeenWave = input.wave;
    existing.confidence = clamp(existing.confidence + KINGDOM_MEMORY_BALANCE.confirmationBoost + input.confidence * 0.12, 0, 1);
    existing.danger = Math.max(existing.danger, input.danger);
    existing.stale = false;
    existing.sourceProfileId = input.source?.id ?? existing.sourceProfileId;
    existing.sourceName = input.source?.name ?? existing.sourceName;
    existing.label = input.label;
    existing.data = { ...existing.data, ...input.data };
    return existing;
  }

  const fact: LegacyKingdomMemoryFact = {
    id: `kingdom-fact-${memory.nextFactId}`,
    type: input.type,
    cell: input.cell ? { ...input.cell } : null,
    confidence: clamp(input.confidence, 0, 1),
    firstSeenWave: input.wave,
    lastSeenWave: input.wave,
    sourceProfileId: input.source?.id ?? null,
    sourceName: input.source?.name ?? 'Une rumeur',
    confirmations: 1,
    danger: input.danger,
    stale: false,
    label: input.label,
    data: input.data,
  };
  memory.nextFactId += 1;
  memory.facts.push(fact);
  trimLegacyKingdomMemory(memory);
  return fact;
}

function decayLegacyKingdomMemory(memory: KingdomMemory, currentWave: number): void {
  memory.facts.forEach((fact) => {
    const age = Math.max(0, currentWave - fact.lastSeenWave);
    fact.confidence = clamp(fact.confidence - age * KINGDOM_MEMORY_BALANCE.confidenceDecayPerExpedition, 0, 1);

    if (fact.confidence < KINGDOM_MEMORY_BALANCE.lowConfidenceCutoff) {
      fact.stale = true;
    }
  });
}

function markLegacyFactsNearCellStale(memory: KingdomMemory, cell: GridCell): void {
  memory.facts.forEach((fact) => {
    if (fact.type === 'routeChangedSuspected' || !fact.cell || Math.abs(fact.cell.x - cell.x) + Math.abs(fact.cell.y - cell.y) > 1) {
      return;
    }

    fact.stale = true;
    fact.confidence = clamp(fact.confidence - KINGDOM_MEMORY_BALANCE.stalePenalty, 0, 1);
  });
}

function markLegacyContradictedFactsFromVisitedRock(memory: KingdomMemory, tiles: DungeonTile[], cells: GridCell[]): void {
  cells.forEach((cell) => {
    const tile = getTileAt(tiles, cell);

    if (tile?.type === 'rock') {
      markLegacyFactsNearCellStale(memory, cell);
    }
  });
}

function trimLegacyKingdomMemory(memory: KingdomMemory): void {
  memory.facts = memory.facts
    .filter((fact) => fact.confidence >= KINGDOM_MEMORY_BALANCE.lowConfidenceCutoff || !fact.stale)
    .sort((a, b) => b.confidence - a.confidence || b.lastSeenWave - a.lastSeenWave)
    .slice(0, KINGDOM_MEMORY_BALANCE.maxFacts);
}

function reliableLegacyFacts(memory: KingdomMemory, currentWave: number): LegacyKingdomMemoryFact[] {
  return memory.facts.filter((fact) =>
    !fact.stale &&
    fact.confidence - Math.max(0, currentWave - fact.lastSeenWave) * KINGDOM_MEMORY_BALANCE.confidenceDecayPerExpedition >=
      KINGDOM_MEMORY_BALANCE.reliableFactConfidence,
  );
}

function pickLegacySource(survivors: AdventurerProfile[]): AdventurerProfile | null {
  return [...survivors].sort(
    (a, b) =>
      b.survivedExpeditions - a.survivedExpeditions ||
      b.reputation - a.reputation ||
      b.level - a.level,
  )[0] ?? null;
}

function addLegacySpecialTreasurePressure(pressure: Partial<Record<AdventurerRole, number>>, treasureKind: unknown): void {
  if (treasureKind === 'specialArmor') {
    pressure.warrior = (pressure.warrior ?? 0) + 1.1;
    return;
  }

  if (treasureKind === 'specialWeapon') {
    pressure.warrior = (pressure.warrior ?? 0) + 0.6;
    pressure.thief = (pressure.thief ?? 0) + 0.9;
    return;
  }

  if (treasureKind === 'specialTechnique') {
    pressure.mage = (pressure.mage ?? 0) + 0.8;
    pressure.healer = (pressure.healer ?? 0) + 0.8;
    pressure.thief = (pressure.thief ?? 0) + 0.4;
  }
}

function legacyFactSummary(fact: LegacyKingdomMemoryFact, currentWave: number): string {
  const age = currentWave - fact.lastSeenWave;
  const ageText = age > 0 ? ` (${age} expedition${age > 1 ? 's' : ''})` : '';

  switch (fact.type) {
    case 'lockedDoorSeen':
      return `porte verrouillee signalee${ageText}.`;
    case 'trapSeen':
      return `piege signale${ageText}.`;
    case 'defenderSeen':
      return `defenseur signale${ageText}.`;
    case 'dangerousRoomSeen':
      return `salle dangereuse rapportee${ageText}.`;
    case 'heavyDamageArea':
      return `zone dangereuse rapportee${ageText}.`;
    case 'specialTreasureSeen':
      return `${fact.label}${ageText}`;
    case 'bossSeen':
    case 'bossReached':
      return `boss localise par des survivants${ageText}.`;
    case 'routeChangedSuspected':
      return `le donjon aurait change${ageText}.`;
    case 'routeBlocked':
      return `route bloquee rapportee${ageText}.`;
    case 'partyWipedHere':
      return `expedition disparue${ageText}.`;
    default:
      return `${fact.label}${ageText}`;
  }
}

function legacyConfidenceLabel(confidence: number): string {
  if (confidence >= 0.76) {
    return 'Forte';
  }

  if (confidence >= 0.48) {
    return 'Moyenne';
  }

  return 'Faible';
}

function parseLegacyCellKey(key: string): GridCell {
  const [x, y] = key.split(',').map(Number);
  return { x, y };
}

function sameLegacyOptionalCell(a: GridCell | null, b: GridCell | null): boolean {
  if (!a || !b) {
    return a === b;
  }

  return a.x === b.x && a.y === b.y;
}
