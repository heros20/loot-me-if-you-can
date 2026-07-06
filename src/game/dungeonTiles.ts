import {
  BOSS_CELL,
  ENTRY_CELL,
  GRID_COLS,
  GRID_ROWS,
  TREASURE_CELL,
  cellKey,
  isInsideGrid,
  isProtectedCell,
  isSameCell,
} from './constants';
import type { DungeonTile, GridCell, RoomSpecialization, TileType } from './types';

// Initial Dungeon Layout V1.1: a hand-authored, deterministic ~50/50 dug/rock map.
// Seven real zones (entry, defense room, lateral branch, a gold-pocket dead end,
// treasure room, antichamber, boss room) connected by narrow corridors full of
// turns, so the entry -> treasure -> boss route is valid but never a straight
// "highway". See docs/INITIAL_DUNGEON_LAYOUT_V1.md for the design rationale and
// measured stats.

// Zone E: entry cavity around ENTRY_CELL (0,7). Large enough to place early defenses
// once the safe zone is cleared, but the safe zone itself stays free of hazards.
const ENTRY_ROOM_CELLS: GridCell[] = [
  ...rect(0, 4, 4, 10),
];

// Corridor from the entry room east, then a hard turn south into a narrow
// choke before the defense room.
const CORRIDOR_ENTRY_TO_DEFENSE: GridCell[] = [
  ...horizontal(7, 4, 6),
  ...vertical(6, 7, 9),
];

// Zone D: a defense room close to the entry (about 7 tiles away) but outside the
// SAFE_ZONE_RADIUS = 2 diamond, so it is the natural first choke point to fortify.
const DEFENSE_ROOM_CELLS: GridCell[] = [
  ...rect(5, 9, 10, 13),
];

// A lower alcove of the defense room itself (not a separate branch off the main
// corridor): the only way to reach it is through the defense room, so it can
// never shortcut around the door choke point at the defense room's exit.
const LATERAL_ROOM_CELLS: GridCell[] = [
  ...rect(5, 14, 10, 15),
];

// Corridor climbing north out of the defense room, with another turn, toward the
// fork that leads onward to the treasure.
const CORRIDOR_DEFENSE_TO_FORK: GridCell[] = [
  ...horizontal(11, 10, 13),
  ...vertical(13, 6, 11),
];

// Main branch continues east then north, with two more turns, into the treasure room.
const CORRIDOR_FORK_TO_TREASURE: GridCell[] = [
  ...horizontal(6, 13, 16),
  ...vertical(16, 2, 6),
];

// Zone T: treasure room, offset above the fork instead of sitting on a straight
// line between the entry and the boss.
const TREASURE_ROOM_CELLS: GridCell[] = [
  ...rect(12, 1, 17, 5),
];

// Long south-east corridor with more turns leading away from the treasure and down
// toward the boss side of the map. A short dead-end spur pokes north-east off this
// corridor into a rock pocket reserved for a future gold treasure or ambush spot,
// giving the player one more branch to exploit later.
const CORRIDOR_TREASURE_TO_ANTECHAMBER: GridCell[] = [
  ...vertical(17, 5, 9),
  ...horizontal(9, 17, 19),
  ...vertical(19, 9, 12),
];
const CORRIDOR_TO_GOLD_POCKET: GridCell[] = [
  ...horizontal(6, 17, 21),
];
const GOLD_POCKET_ROOM_CELLS: GridCell[] = [
  ...rect(20, 4, 22, 7),
];

// Zone A: antichamber the party must cross before reaching the throne room -
// a last real room, not just a corridor widening.
const ANTECHAMBER_CELLS: GridCell[] = [
  ...rect(16, 9, 20, 12),
];

// Final turn into the boss room.
const CORRIDOR_ANTECHAMBER_TO_BOSS: GridCell[] = [
  ...horizontal(12, 20, 22),
];

// Zone B: boss room, far from the entry and separated from the treasure by the
// antichamber and several turns.
const THRONE_ROOM_CELLS: GridCell[] = [
  ...rect(18, 11, 22, 15),
];

const INITIAL_FLOOR_CELLS: GridCell[] = [
  ...CORRIDOR_ENTRY_TO_DEFENSE,
  ...CORRIDOR_DEFENSE_TO_FORK,
  ...CORRIDOR_FORK_TO_TREASURE,
  ...CORRIDOR_TREASURE_TO_ANTECHAMBER,
  ...CORRIDOR_TO_GOLD_POCKET,
  ...CORRIDOR_ANTECHAMBER_TO_BOSS,
];

const INITIAL_ROOM_CELLS: GridCell[] = [
  ...ENTRY_ROOM_CELLS,
  ...DEFENSE_ROOM_CELLS,
  ...LATERAL_ROOM_CELLS,
  ...GOLD_POCKET_ROOM_CELLS,
  ...ANTECHAMBER_CELLS,
];

/**
 * Named room zones for the deterministic V1.1 layout, exposed purely for
 * topology tests and documentation/tooling. Not used by gameplay logic.
 */
export interface NamedDungeonZone {
  name: string;
  cells: GridCell[];
}

export function getInitialDungeonZones(): NamedDungeonZone[] {
  return [
    { name: 'entry', cells: ENTRY_ROOM_CELLS },
    { name: 'defense', cells: DEFENSE_ROOM_CELLS },
    { name: 'lateral', cells: LATERAL_ROOM_CELLS },
    { name: 'goldPocket', cells: GOLD_POCKET_ROOM_CELLS },
    { name: 'treasure', cells: TREASURE_ROOM_CELLS },
    { name: 'antechamber', cells: ANTECHAMBER_CELLS },
    { name: 'throne', cells: THRONE_ROOM_CELLS },
  ];
}

export function createInitialDungeonTiles(): DungeonTile[] {
  const tiles = new Map<string, DungeonTile>();

  for (let y = 0; y < GRID_ROWS; y += 1) {
    for (let x = 0; x < GRID_COLS; x += 1) {
      setTile(tiles, { x, y }, 'rock');
    }
  }

  INITIAL_FLOOR_CELLS.forEach((cell) => setTile(tiles, cell, 'floor'));
  INITIAL_ROOM_CELLS.forEach((cell) => setTile(tiles, cell, 'room'));
  TREASURE_ROOM_CELLS.forEach((cell) => setTile(tiles, cell, 'room', 'treasureRoom'));
  THRONE_ROOM_CELLS.forEach((cell) => setTile(tiles, cell, 'room', 'throneRoom'));
  setTile(tiles, ENTRY_CELL, 'entrance');
  setTile(tiles, TREASURE_CELL, 'treasure', 'treasureRoom');
  setTile(tiles, BOSS_CELL, 'throne', 'throneRoom');

  return sortTiles([...tiles.values()]);
}

export function getTileAt(tiles: DungeonTile[], cell: GridCell): DungeonTile | null {
  return tiles.find((tile) => isSameCell(tile.cell, cell)) ?? null;
}

export function setDungeonTile(
  tiles: DungeonTile[],
  cell: GridCell,
  type: TileType,
  roomType: RoomSpecialization | null = null,
): DungeonTile[] {
  const nextTiles = tiles.map((tile) => (
    isSameCell(tile.cell, cell)
      ? { cell: { ...cell }, type, roomType }
      : tile
  ));

  return sortTiles(nextTiles);
}

export function markSpecializedRoom(
  tiles: DungeonTile[],
  center: GridCell,
  roomType: RoomSpecialization,
): { tiles: DungeonTile[]; changed: number } {
  let changed = 0;
  const roomCells = new Set(rect(center.x - 1, center.y - 1, center.x + 1, center.y + 1).map((cell) => cellKey(cell)));
  const nextTiles = tiles.map((tile) => {
    if (
      !roomCells.has(cellKey(tile.cell)) ||
      !isRoomMarkableBaseTile(tile) ||
      tile.roomType === 'treasureRoom' ||
      tile.roomType === 'throneRoom'
    ) {
      return tile;
    }

    if (tile.type === 'room' && tile.roomType === roomType) {
      return tile;
    }

    changed += 1;
    return {
      cell: { ...tile.cell },
      type: 'room' as const,
      roomType,
    };
  });

  return { tiles: sortTiles(nextTiles), changed };
}

export function getBlockedCellKeys(tiles: DungeonTile[]): Set<string> {
  return new Set(tiles.filter((tile) => tile.type === 'rock').map((tile) => cellKey(tile.cell)));
}

export function isWalkableTile(tile: DungeonTile | null): boolean {
  return tile !== null && tile.type !== 'rock';
}

export function hasAdjacentDugTile(tiles: DungeonTile[], cell: GridCell): boolean {
  return cardinalNeighbors(cell).some((neighbor) => isWalkableTile(getTileAt(tiles, neighbor)));
}

export function canEntityMoveTo(tiles: DungeonTile[], x: number, y: number): boolean {
  return isWalkableTile(getTileAt(tiles, { x: Math.round(x), y: Math.round(y) }));
}

export function canEntityMoveBetween(
  tiles: DungeonTile[],
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): boolean {
  const distance = Math.hypot(toX - fromX, toY - fromY);
  const steps = Math.max(1, Math.ceil(distance / 0.2));

  for (let index = 1; index <= steps; index += 1) {
    const ratio = index / steps;
    const x = fromX + (toX - fromX) * ratio;
    const y = fromY + (toY - fromY) * ratio;

    if (!canEntityMoveTo(tiles, x, y)) {
      return false;
    }
  }

  return true;
}

export function summarizeTiles(tiles: DungeonTile[]): {
  rock: number;
  floor: number;
  rooms: number;
  special: number;
} {
  return tiles.reduce(
    (summary, tile) => {
      if (tile.type === 'rock') {
        summary.rock += 1;
        return summary;
      }

      if (tile.type === 'floor') {
        summary.floor += 1;
        return summary;
      }

      if (tile.type === 'room') {
        summary.rooms += 1;
        return summary;
      }

      summary.special += 1;
      return summary;
    },
    { rock: 0, floor: 0, rooms: 0, special: 0 },
  );
}

function setTile(
  tiles: Map<string, DungeonTile>,
  cell: GridCell,
  type: TileType,
  roomType: RoomSpecialization | null = null,
): void {
  if (!isInsideGrid(cell)) {
    return;
  }

  tiles.set(cellKey(cell), { cell: { ...cell }, type, roomType });
}

function isRoomMarkableBaseTile(tile: DungeonTile): boolean {
  return tile.type === 'floor' || tile.type === 'room';
}

function cardinalNeighbors(cell: GridCell): GridCell[] {
  return [
    { x: cell.x + 1, y: cell.y },
    { x: cell.x - 1, y: cell.y },
    { x: cell.x, y: cell.y + 1 },
    { x: cell.x, y: cell.y - 1 },
  ].filter((candidate) => isInsideGrid(candidate));
}

function horizontal(y: number, startX: number, endX: number): GridCell[] {
  return Array.from({ length: endX - startX + 1 }, (_, index) => ({ x: startX + index, y }));
}

function vertical(x: number, startY: number, endY: number): GridCell[] {
  return Array.from({ length: endY - startY + 1 }, (_, index) => ({ x, y: startY + index }));
}

function rect(startX: number, startY: number, endX: number, endY: number): GridCell[] {
  const cells: GridCell[] = [];

  for (let y = startY; y <= endY; y += 1) {
    for (let x = startX; x <= endX; x += 1) {
      const cell = { x, y };

      if (isInsideGrid(cell) && !isProtectedCell(cell)) {
        cells.push(cell);
      }
    }
  }

  return cells;
}

function sortTiles(tiles: DungeonTile[]): DungeonTile[] {
  return [...tiles].sort((a, b) => a.cell.y - b.cell.y || a.cell.x - b.cell.x);
}
