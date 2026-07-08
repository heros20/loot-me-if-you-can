import {
  BOSS_CELL,
  ENTRANCE_MAP_ID,
  ENTRY_CELL,
  FINAL_MAP_ID,
  GRID_COLS,
  GRID_ROWS,
  INTERMEDIATE_MAP_ID,
  TREASURE_CELL,
} from '../game/constants';
import { createInitialDungeonTiles, getInitialDungeonZones, setDungeonTile } from '../game/dungeonTiles';
import type {
  DefenseEntity,
  DungeonMap,
  DungeonTile,
  DungeonTransition,
  DungeonTreasure,
  GridCell,
  RoomSpecialization,
  TileType,
} from '../game/types';
import { deriveDungeonZones } from './dungeonZoneSystem';

export const ENTRANCE_TO_INTERMEDIATE_TRANSITION_ID = 'stairs-floor-1-to-floor-2';
export const INTERMEDIATE_TO_ENTRANCE_TRANSITION_ID = 'stairs-floor-2-to-floor-1';
export const INTERMEDIATE_TO_FINAL_TRANSITION_ID = 'stairs-floor-2-to-floor-3';
export const FINAL_TO_INTERMEDIATE_TRANSITION_ID = 'stairs-floor-3-to-floor-2';

// Backward-compatible names for older smoke helpers/imports.
export const ENTRANCE_TO_FINAL_TRANSITION_ID = ENTRANCE_TO_INTERMEDIATE_TRANSITION_ID;
export const FINAL_TO_ENTRANCE_TRANSITION_ID = FINAL_TO_INTERMEDIATE_TRANSITION_ID;

export const FORWARD_TRANSITION_CELL: GridCell = BOSS_CELL;
export const ARRIVAL_CELL: GridCell = ENTRY_CELL;
export const ENTRANCE_TO_FINAL_CELL: GridCell = FORWARD_TRANSITION_CELL;
export const FINAL_ARRIVAL_CELL: GridCell = ARRIVAL_CELL;

let dungeonGenerationSerial = 0;

export function createInitialDungeonMaps(input: {
  defenses: DefenseEntity[];
  treasures: DungeonTreasure[];
  bossCell: GridCell;
}): DungeonMap[] {
  dungeonGenerationSerial += 1;
  const serial = dungeonGenerationSerial;
  const transitions = createInitialTransitions();
  const maps = [
    {
      id: ENTRANCE_MAP_ID,
      label: 'Etage 1',
      depth: 1,
      tiles: createGeneratedMapTiles('entry', serial % 3),
      hasBoss: false,
    },
    {
      id: INTERMEDIATE_MAP_ID,
      label: 'Etage 2',
      depth: 2,
      tiles: createGeneratedMapTiles('intermediate', (serial + randomInt(3)) % 3),
      hasBoss: false,
    },
    {
      id: FINAL_MAP_ID,
      label: 'Etage 3 - Boss',
      depth: 3,
      tiles: createGeneratedMapTiles('final', (serial * 2 + randomInt(3)) % 3),
      hasBoss: true,
    },
  ];

  return maps.map((map) => createDungeonMap({
    ...map,
    defenses: input.defenses.filter((defense) => defense.mapId === map.id),
    treasures: input.treasures.filter((treasure) => treasure.mapId === map.id),
    bossCell: map.hasBoss ? input.bossCell : FORWARD_TRANSITION_CELL,
    transitions: transitions.filter((transition) => transition.fromMapId === map.id),
  }));
}

export function recalculateDungeonMapZones(input: {
  maps: DungeonMap[];
  defenses: DefenseEntity[];
  treasures: DungeonTreasure[];
  bossMapId: string;
  bossCell: GridCell;
}): DungeonMap[] {
  return input.maps.map((map) => ({
    ...map,
    zones: deriveDungeonZones({
      mapId: map.id,
      tiles: map.tiles,
      defenses: input.defenses.filter((defense) => defense.mapId === map.id),
      treasures: input.treasures.filter((treasure) => treasure.mapId === map.id),
      bossCell: map.id === input.bossMapId ? input.bossCell : FORWARD_TRANSITION_CELL,
      hasBoss: map.id === input.bossMapId,
    }),
  }));
}

export function createInitialTransitions(): DungeonTransition[] {
  return [
    {
      id: ENTRANCE_TO_INTERMEDIATE_TRANSITION_ID,
      fromMapId: ENTRANCE_MAP_ID,
      fromCell: { ...FORWARD_TRANSITION_CELL },
      toMapId: INTERMEDIATE_MAP_ID,
      toCell: { ...ARRIVAL_CELL },
      label: 'Escalier descendant',
      locked: false,
      discoveredByKingdom: false,
    },
    {
      id: INTERMEDIATE_TO_ENTRANCE_TRANSITION_ID,
      fromMapId: INTERMEDIATE_MAP_ID,
      fromCell: { ...ARRIVAL_CELL },
      toMapId: ENTRANCE_MAP_ID,
      toCell: { ...FORWARD_TRANSITION_CELL },
      label: 'Escalier montant',
      locked: false,
      discoveredByKingdom: false,
    },
    {
      id: INTERMEDIATE_TO_FINAL_TRANSITION_ID,
      fromMapId: INTERMEDIATE_MAP_ID,
      fromCell: { ...FORWARD_TRANSITION_CELL },
      toMapId: FINAL_MAP_ID,
      toCell: { ...ARRIVAL_CELL },
      label: 'Escalier profond',
      locked: false,
      discoveredByKingdom: false,
    },
    {
      id: FINAL_TO_INTERMEDIATE_TRANSITION_ID,
      fromMapId: FINAL_MAP_ID,
      fromCell: { ...ARRIVAL_CELL },
      toMapId: INTERMEDIATE_MAP_ID,
      toCell: { ...FORWARD_TRANSITION_CELL },
      label: 'Escalier montant',
      locked: false,
      discoveredByKingdom: false,
    },
  ];
}

function createDungeonMap(input: {
  id: string;
  label: string;
  depth: number;
  tiles: DungeonTile[];
  defenses: DefenseEntity[];
  treasures: DungeonTreasure[];
  bossCell: GridCell;
  hasBoss: boolean;
  transitions: DungeonTransition[];
}): DungeonMap {
  return {
    id: input.id,
    label: input.label,
    depth: input.depth,
    width: GRID_COLS,
    height: GRID_ROWS,
    tiles: input.tiles,
    zones: deriveDungeonZones({
      mapId: input.id,
      tiles: input.tiles,
      defenses: input.defenses,
      treasures: input.treasures,
      bossCell: input.bossCell,
      hasBoss: input.hasBoss,
    }),
    transitions: input.transitions,
  };
}

function createGeneratedMapTiles(kind: 'entry' | 'intermediate' | 'final', variant: number): DungeonTile[] {
  let tiles = createInitialDungeonTiles();

  if (kind !== 'final') {
    tiles = setDungeonTile(tiles, TREASURE_CELL, 'floor');
    tiles = setDungeonTile(tiles, BOSS_CELL, 'floor');
  }

  if (kind === 'entry') {
    tiles = paintNamedZone(tiles, 'defense', 'room', variant === 2 ? 'crypt' : 'guardRoom');
    tiles = paintNamedZone(tiles, 'lateral', 'room', variant === 1 ? 'crypt' : null);

    if (variant === 0) {
      tiles = paintNamedZone(tiles, 'goldPocket', 'rock');
    } else if (variant === 2) {
      tiles = paintCells(tiles, roomRect(21, 8, 22, 9), 'room', 'crypt');
      tiles = paintCells(tiles, horizontal(12, 4, 5), 'floor');
    }
  }

  if (kind === 'intermediate') {
    tiles = paintNamedZone(tiles, 'defense', 'room', 'guardRoom');
    tiles = paintNamedZone(tiles, 'antechamber', 'room', variant === 0 ? 'guardRoom' : 'crypt');
    tiles = paintCells(tiles, roomRect(2, 2, 6, 4), 'room', variant === 1 ? 'crypt' : 'guardRoom');
    tiles = paintCells(tiles, vertical(6, 4, 7), 'floor');

    if (variant === 2) {
      tiles = paintCells(tiles, roomRect(18, 2, 21, 3), 'room', 'crypt');
      tiles = paintCells(tiles, horizontal(4, 17, 20), 'floor');
    }
  }

  if (kind === 'final') {
    tiles = paintNamedZone(tiles, 'antechamber', 'room', 'crypt');
    tiles = paintNamedZone(tiles, 'throne', 'room', 'throneRoom');
    tiles = setDungeonTile(tiles, BOSS_CELL, 'throne', 'throneRoom');
    tiles = setDungeonTile(tiles, TREASURE_CELL, 'treasure', 'treasureRoom');

    if (variant === 0) {
      tiles = paintCells(tiles, [{ x: 20, y: 13 }, { x: 21, y: 14 }], 'rock');
    } else if (variant === 1) {
      tiles = paintCells(tiles, roomRect(14, 12, 16, 14), 'room', 'crypt');
      tiles = paintCells(tiles, horizontal(12, 16, 18), 'floor');
    } else {
      tiles = paintCells(tiles, roomRect(19, 2, 22, 5), 'room', 'treasureRoom');
      tiles = paintCells(tiles, horizontal(5, 17, 19), 'floor');
    }
  }

  return tiles;
}

function paintNamedZone(
  tiles: DungeonTile[],
  name: string,
  type: TileType,
  roomType: RoomSpecialization | null = null,
): DungeonTile[] {
  const cells = getInitialDungeonZones().find((zone) => zone.name === name)?.cells ?? [];
  return paintCells(tiles, cells, type, roomType);
}

function paintCells(
  tiles: DungeonTile[],
  cells: GridCell[],
  type: TileType,
  roomType: RoomSpecialization | null = null,
): DungeonTile[] {
  return cells.reduce((nextTiles, cell) => setDungeonTile(nextTiles, cell, type, roomType), tiles);
}

function roomRect(startX: number, startY: number, endX: number, endY: number): GridCell[] {
  const cells: GridCell[] = [];

  for (let y = startY; y <= endY; y += 1) {
    for (let x = startX; x <= endX; x += 1) {
      if (
        x >= 0 &&
        y >= 0 &&
        x < GRID_COLS &&
        y < GRID_ROWS &&
        !(x === ENTRY_CELL.x && y === ENTRY_CELL.y) &&
        !(x === TREASURE_CELL.x && y === TREASURE_CELL.y) &&
        !(x === BOSS_CELL.x && y === BOSS_CELL.y)
      ) {
        cells.push({ x, y });
      }
    }
  }

  return cells;
}

function horizontal(y: number, startX: number, endX: number): GridCell[] {
  return Array.from({ length: endX - startX + 1 }, (_, index) => ({ x: startX + index, y }));
}

function vertical(x: number, startY: number, endY: number): GridCell[] {
  return Array.from({ length: endY - startY + 1 }, (_, index) => ({ x, y: startY + index }));
}

function randomInt(max: number): number {
  return Math.floor(Math.random() * max);
}
