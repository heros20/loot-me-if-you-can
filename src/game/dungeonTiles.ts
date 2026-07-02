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

const INITIAL_FLOOR_CELLS: GridCell[] = [
  ...horizontal(7, 0, 6),
  ...vertical(6, 4, 7),
  ...horizontal(4, 6, 14),
  ...vertical(12, 4, 6),
  ...horizontal(4, 17, 18),
  ...vertical(18, 4, 7),
  ...horizontal(7, 18, 20),
  ...vertical(20, 7, 11),
  ...horizontal(11, 20, 22),
];

const INITIAL_ROOM_CELLS: GridCell[] = [
  ...rect(2, 8, 4, 10),
  ...rect(8, 2, 10, 3),
  ...rect(11, 6, 13, 8),
];

const TREASURE_ROOM_CELLS = rect(15, 3, 17, 5);
const THRONE_ROOM_CELLS = rect(20, 11, 22, 13);

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
