import { BOSS_CELL, DEFAULT_MAP_ID, ENTRY_CELL, TREASURE_CELL, cellKey, isSameCell } from '../game/constants';
import { getInitialDungeonZones, getTileAt } from '../game/dungeonTiles';
import type { DefenseEntity, DungeonTile, DungeonTreasure, DungeonZone, DungeonZoneType, GridCell } from '../game/types';

export function deriveDungeonZones(input: {
  mapId?: string;
  tiles: DungeonTile[];
  defenses: DefenseEntity[];
  treasures: DungeonTreasure[];
  bossCell: GridCell;
  hasBoss?: boolean;
}): DungeonZone[] {
  const baseZones = getInitialDungeonZones()
    .map((zone) => {
      const rawType = zoneTypeForInitialName(zone.name);
      const hasMainTreasure = input.treasures.some((treasure) => treasure.kind === 'main' && treasure.status !== 'stolen');
      const type =
        rawType === 'boss' && input.hasBoss === false
          ? 'secondary'
          : rawType === 'treasure' && !hasMainTreasure
            ? 'secondary'
            : rawType;

      return {
        name: zone.name,
        type,
        cells: zone.cells.filter((cell) => getTileAt(input.tiles, cell)?.type !== 'rock'),
      };
    })
    .filter((zone) => zone.cells.length > 0);

  const zones = baseZones.map((zone, index): DungeonZone => {
    const type = refineZoneType(zone.type, zone.cells, input);
    const guardian = input.defenses.find((defense) =>
      defense.alive &&
      defense.type === 'guardian' &&
      zone.cells.some((cell) => isSameCell(cell, defense.cell)),
    ) ?? null;
    const dangerLevel = computeDangerLevel(zone.cells, input.defenses, guardian?.id ?? null);

    return {
      id: `zone-${type}-${index}`,
      mapId: input.mapId ?? DEFAULT_MAP_ID,
      type,
      label: labelForZoneType(type),
      cells: zone.cells.map((cell) => ({ ...cell })),
      center: centerOf(zone.cells),
      dangerLevel,
      optional: type === 'secondary' || type === 'defense',
      required: type === 'entrance' || type === 'treasure' || type === 'antechamber' || type === 'boss',
      discoveredByKingdom: false,
      guardianId: guardian?.id ?? null,
    };
  });

  return ensureAnchorZones(zones, input);
}

export function findZoneForCell(zones: DungeonZone[], cell: GridCell): DungeonZone | null {
  return zones.find((zone) => zone.cells.some((candidate) => isSameCell(candidate, cell))) ?? null;
}

export function isGuardianPreferredCell(zones: DungeonZone[], cell: GridCell): boolean {
  const zone = findZoneForCell(zones, cell);
  return zone?.type === 'antechamber' || zone?.type === 'secondary' || zone?.type === 'defense';
}

function zoneTypeForInitialName(name: string): DungeonZoneType {
  switch (name) {
    case 'entry':
      return 'entrance';
    case 'defense':
      return 'defense';
    case 'treasure':
      return 'treasure';
    case 'antechamber':
      return 'antechamber';
    case 'throne':
      return 'boss';
    case 'lateral':
    case 'goldPocket':
      return 'secondary';
    default:
      return 'corridor';
  }
}

function refineZoneType(
  fallback: DungeonZoneType,
  cells: GridCell[],
  input: { treasures: DungeonTreasure[]; bossCell: GridCell; defenses: DefenseEntity[]; hasBoss?: boolean },
): DungeonZoneType {
  if (cells.some((cell) => isSameCell(cell, ENTRY_CELL))) {
    return 'entrance';
  }

  if (input.hasBoss !== false && cells.some((cell) => isSameCell(cell, input.bossCell) || isSameCell(cell, BOSS_CELL))) {
    return 'boss';
  }

  if (input.treasures.some((treasure) => treasure.kind === 'main' && treasure.status !== 'stolen' && cells.some((cell) => isSameCell(cell, treasure.cell) || isSameCell(cell, TREASURE_CELL)))) {
    return 'treasure';
  }

  const defenseWeight = cells.reduce((total, cell) => {
    return total + input.defenses.filter((defense) => defense.alive && isSameCell(defense.cell, cell)).reduce(
      (sum, defense) => sum + (defense.type === 'guardian' ? 3 : defense.kind === 'trap' ? 1.2 : 1.5),
      0,
    );
  }, 0);

  if (fallback === 'secondary' && defenseWeight >= 3) {
    return 'defense';
  }

  return fallback;
}

function computeDangerLevel(cells: GridCell[], defenses: DefenseEntity[], guardianId: string | null): number {
  const keys = new Set(cells.map((cell) => cellKey(cell)));
  return Math.min(
    5,
    defenses
      .filter((defense) => defense.alive && keys.has(cellKey(defense.cell)))
      .reduce((total, defense) => total + (defense.id === guardianId ? 2.4 : defense.kind === 'trap' ? 0.9 : 1.15), 0),
  );
}

function ensureAnchorZones(zones: DungeonZone[], input: { mapId?: string; bossCell: GridCell; treasures: DungeonTreasure[]; hasBoss?: boolean }): DungeonZone[] {
  const withAnchors = [...zones];

  if (!withAnchors.some((zone) => zone.type === 'entrance')) {
    withAnchors.push(singleCellZone('entrance', ENTRY_CELL, 0, input.mapId ?? DEFAULT_MAP_ID));
  }

  if (input.treasures.some((treasure) => treasure.kind === 'main' && treasure.status !== 'stolen') && !withAnchors.some((zone) => zone.type === 'treasure')) {
    withAnchors.push(singleCellZone('treasure', TREASURE_CELL, 1, input.mapId ?? DEFAULT_MAP_ID));
  }

  if (input.hasBoss !== false && !withAnchors.some((zone) => zone.type === 'boss')) {
    withAnchors.push(singleCellZone('boss', input.bossCell, 2, input.mapId ?? DEFAULT_MAP_ID));
  }

  return withAnchors;
}

function singleCellZone(type: DungeonZoneType, cell: GridCell, index: number, mapId: string): DungeonZone {
  return {
    id: `zone-${type}-anchor-${index}`,
    mapId,
    type,
    label: labelForZoneType(type),
    cells: [{ ...cell }],
    center: { ...cell },
    dangerLevel: 0,
    optional: false,
    required: true,
    discoveredByKingdom: false,
    guardianId: null,
  };
}

function centerOf(cells: GridCell[]): GridCell {
  const center = cells.reduce(
    (sum, cell) => ({ x: sum.x + cell.x, y: sum.y + cell.y }),
    { x: 0, y: 0 },
  );

  return {
    x: Math.round(center.x / Math.max(1, cells.length)),
    y: Math.round(center.y / Math.max(1, cells.length)),
  };
}

function labelForZoneType(type: DungeonZoneType): string {
  switch (type) {
    case 'entrance':
      return 'Entree';
    case 'defense':
      return 'Zone de defense';
    case 'secondary':
      return 'Salle secondaire';
    case 'antechamber':
      return 'Antichambre';
    case 'treasure':
      return 'Salle du tresor';
    case 'boss':
      return 'Salle du boss';
    case 'corridor':
    default:
      return 'Couloir';
  }
}
