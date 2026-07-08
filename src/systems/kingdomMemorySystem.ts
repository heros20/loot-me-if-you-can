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
  RunWorldMemory,
  WaveStats,
} from '../game/types';
import { getTileAt } from '../game/dungeonTiles';
import { isSpecialTreasureKind, specialKindFromTreasureKind, specialTreasureLabel } from './specialTreasuresSystem';

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
  decayKingdomMemory(input.world.kingdomMemory, input.wave);

  if (input.survivors.length === 0) {
    addKingdomFact(input.world.kingdomMemory, {
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

  const source = pickSource(input.survivors);

  input.stats.observedDoorCells.forEach((cell) => addKingdomFact(input.world.kingdomMemory, {
    type: 'lockedDoorSeen',
    cell,
    wave: input.wave,
    source,
    confidence: KINGDOM_MEMORY_BALANCE.baseConfidence + 0.08,
    danger: input.stats.doorNoThiefRetreats > 0 ? 3 : 1,
    label: 'Porte verrouillee signalee.',
    data: { locked: true },
  }));

  input.stats.observedTrapCells.forEach((cell) => addKingdomFact(input.world.kingdomMemory, {
    type: 'trapSeen',
    cell,
    wave: input.wave,
    source,
    confidence: KINGDOM_MEMORY_BALANCE.baseConfidence + 0.08,
    danger: input.stats.heavyDamageCells[cellKey(cell)] ?? 1,
    label: 'Piege signale par les survivants.',
    data: {},
  }));

  input.stats.observedDefenderCells.forEach((cell) => addKingdomFact(input.world.kingdomMemory, {
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
    .forEach(([key, damage]) => addKingdomFact(input.world.kingdomMemory, {
      type: 'heavyDamageArea',
      cell: parseCellKey(key),
      wave: input.wave,
      source,
      confidence: KINGDOM_MEMORY_BALANCE.baseConfidence + 0.08,
      danger: Number(damage),
      label: 'Zone dangereuse rapportee.',
      data: { damage: Number(damage) },
    }));

  if (input.stats.roomEvaluations > 0 && (input.stats.observedTrapCells.length > 0 || input.stats.observedDefenderCells.length > 0 || input.stats.observedBoss)) {
    addKingdomFact(input.world.kingdomMemory, {
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
    addKingdomFact(input.world.kingdomMemory, {
      type: 'specialTreasureSeen',
      cell: treasure.cell,
      wave: input.wave,
      source,
      confidence: input.stats.specialTreasureLoots.length > 0
        ? KINGDOM_MEMORY_BALANCE.strongConfidence
        : KINGDOM_MEMORY_BALANCE.baseConfidence + 0.08,
      danger: 0,
      label: specialKind ? `${specialTreasureLabel(specialKind)} signale.` : 'Tresor special signale.',
      data: { treasureKind: treasure.kind },
    });
  });

  if (input.stats.treasureStolen || input.stats.treasureValueStolen > 0) {
    addKingdomFact(input.world.kingdomMemory, {
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
    addKingdomFact(input.world.kingdomMemory, {
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
    addKingdomFact(input.world.kingdomMemory, {
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
    markFactsNearCellStale(input.world.kingdomMemory, cell);
    addKingdomFact(input.world.kingdomMemory, {
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

  markContradictedFactsFromVisitedRock(input.world.kingdomMemory, input.tiles, input.stats.observedRouteChanges);
  trimKingdomMemory(input.world.kingdomMemory);
  return summarizeKingdomMemory(input.world.kingdomMemory, input.wave, 3);
}

export function summarizeKingdomMemory(memory: KingdomMemory, currentWave: number, limit = 3): string[] {
  return memory.facts
    .filter((fact) => fact.confidence >= KINGDOM_MEMORY_BALANCE.lowConfidenceCutoff)
    .sort((a, b) => b.confidence - a.confidence || b.lastSeenWave - a.lastSeenWave)
    .slice(0, limit)
    .map((fact) => `${confidenceLabel(fact.confidence)} rumeur : ${factSummary(fact, currentWave)}`);
}

export function kingdomMemoryRolePressure(memory: KingdomMemory, currentWave: number): Partial<Record<AdventurerRole, number>> {
  const pressure: Partial<Record<AdventurerRole, number>> = {};

  reliableFacts(memory, currentWave).forEach((fact) => {
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
        addSpecialTreasurePressure(pressure, fact.data.treasureKind);
        break;
      default:
        break;
    }
  });

  return pressure;
}

export function kingdomMemorySuggestsLockedDoor(memory: KingdomMemory, currentWave: number): boolean {
  return reliableFacts(memory, currentWave).some((fact) => fact.type === 'lockedDoorSeen' || fact.type === 'routeBlocked');
}

export function knownTrapCellsFromKingdomMemory(memory: KingdomMemory, currentWave: number): Set<string> {
  return new Set(
    reliableFacts(memory, currentWave)
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

  const relevant = reliableFacts(memory, currentWave).some((fact) =>
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

export function nearbyRememberedRouteFact(memory: KingdomMemory, cell: GridCell, currentWave: number): KingdomMemoryFact | null {
  return reliableFacts(memory, currentWave)
    .filter((fact) => fact.cell !== null && fact.type !== 'routeChangedSuspected')
    .find((fact) => fact.cell && Math.abs(fact.cell.x - cell.x) + Math.abs(fact.cell.y - cell.y) <= 1) ?? null;
}

function addKingdomFact(
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
): KingdomMemoryFact {
  const existing = memory.facts.find((fact) =>
    fact.type === input.type &&
    sameOptionalCell(fact.cell, input.cell) &&
    fact.data.treasureKind === input.data.treasureKind &&
    fact.data.reason === input.data.reason,
  );

  if (existing) {
    existing.confirmations += 1;
    existing.lastSeenWave = input.wave;
    existing.confidence = clamp01(existing.confidence + KINGDOM_MEMORY_BALANCE.confirmationBoost + input.confidence * 0.12);
    existing.danger = Math.max(existing.danger, input.danger);
    existing.stale = false;
    existing.sourceProfileId = input.source?.id ?? existing.sourceProfileId;
    existing.sourceName = input.source?.name ?? existing.sourceName;
    existing.label = input.label;
    existing.data = { ...existing.data, ...input.data };
    return existing;
  }

  const fact: KingdomMemoryFact = {
    id: `kingdom-fact-${memory.nextFactId}`,
    type: input.type,
    cell: input.cell ? { ...input.cell } : null,
    confidence: clamp01(input.confidence),
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
  trimKingdomMemory(memory);
  return fact;
}

function decayKingdomMemory(memory: KingdomMemory, currentWave: number): void {
  memory.facts.forEach((fact) => {
    const age = Math.max(0, currentWave - fact.lastSeenWave);
    fact.confidence = clamp01(fact.confidence - age * KINGDOM_MEMORY_BALANCE.confidenceDecayPerExpedition);

    if (fact.confidence < KINGDOM_MEMORY_BALANCE.lowConfidenceCutoff) {
      fact.stale = true;
    }
  });
}

function markFactsNearCellStale(memory: KingdomMemory, cell: GridCell): void {
  memory.facts.forEach((fact) => {
    if (
      fact.type === 'routeChangedSuspected' ||
      !fact.cell ||
      Math.abs(fact.cell.x - cell.x) + Math.abs(fact.cell.y - cell.y) > 1
    ) {
      return;
    }

    fact.stale = true;
    fact.confidence = clamp01(fact.confidence - KINGDOM_MEMORY_BALANCE.stalePenalty);
  });
}

function markContradictedFactsFromVisitedRock(memory: KingdomMemory, tiles: DungeonTile[], cells: GridCell[]): void {
  cells.forEach((cell) => {
    const tile = getTileAt(tiles, cell);

    if (tile?.type === 'rock') {
      markFactsNearCellStale(memory, cell);
    }
  });
}

function trimKingdomMemory(memory: KingdomMemory): void {
  memory.facts = memory.facts
    .filter((fact) => fact.confidence >= KINGDOM_MEMORY_BALANCE.lowConfidenceCutoff || !fact.stale)
    .sort((a, b) => b.confidence - a.confidence || b.lastSeenWave - a.lastSeenWave)
    .slice(0, KINGDOM_MEMORY_BALANCE.maxFacts);
}

function reliableFacts(memory: KingdomMemory, currentWave: number): KingdomMemoryFact[] {
  return memory.facts.filter((fact) =>
    !fact.stale &&
    fact.confidence - Math.max(0, currentWave - fact.lastSeenWave) * KINGDOM_MEMORY_BALANCE.confidenceDecayPerExpedition >=
      KINGDOM_MEMORY_BALANCE.reliableFactConfidence,
  );
}

function pickSource(survivors: AdventurerProfile[]): AdventurerProfile | null {
  return [...survivors].sort(
    (a, b) =>
      b.survivedExpeditions - a.survivedExpeditions ||
      b.reputation - a.reputation ||
      b.level - a.level,
  )[0] ?? null;
}

function addSpecialTreasurePressure(pressure: Partial<Record<AdventurerRole, number>>, treasureKind: unknown): void {
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

function factSummary(fact: KingdomMemoryFact, currentWave: number): string {
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

function confidenceLabel(confidence: number): string {
  if (confidence >= 0.76) {
    return 'Forte';
  }

  if (confidence >= 0.48) {
    return 'Moyenne';
  }

  return 'Faible';
}

function parseCellKey(key: string): GridCell {
  const [x, y] = key.split(',').map(Number);
  return { x, y };
}

function sameOptionalCell(a: GridCell | null, b: GridCell | null): boolean {
  if (!a || !b) {
    return a === b;
  }

  return a.x === b.x && a.y === b.y;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
