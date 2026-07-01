import type { GridCell } from './types';

export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 640;

export const GRID_COLS = 12;
export const GRID_ROWS = 9;
export const TILE_SIZE = 48;
export const GRID_OFFSET_X = 40;
export const GRID_OFFSET_Y = 94;

export const ENTRY_CELL: GridCell = { x: 0, y: 4 };
export const TREASURE_CELL: GridCell = { x: 10, y: 2 };
export const BOSS_CELL: GridCell = { x: 11, y: 7 };

export const STARTING_GOLD = 30;

export const WALL_CELLS: GridCell[] = [
  { x: 2, y: 1 },
  { x: 2, y: 2 },
  { x: 2, y: 3 },
  { x: 2, y: 5 },
  { x: 2, y: 6 },
  { x: 2, y: 7 },
  { x: 6, y: 0 },
  { x: 6, y: 1 },
  { x: 6, y: 2 },
  { x: 6, y: 4 },
  { x: 6, y: 5 },
  { x: 6, y: 6 },
  { x: 9, y: 4 },
  { x: 9, y: 5 },
  { x: 9, y: 6 },
  { x: 9, y: 8 },
];

const WALL_KEYS = new Set(WALL_CELLS.map((cell) => cellKey(cell)));

export function cellKey(cell: GridCell): string {
  return `${cell.x},${cell.y}`;
}

export function isSameCell(a: GridCell, b: GridCell): boolean {
  return a.x === b.x && a.y === b.y;
}

export function isInsideGrid(cell: GridCell): boolean {
  return cell.x >= 0 && cell.y >= 0 && cell.x < GRID_COLS && cell.y < GRID_ROWS;
}

export function isWallCell(cell: GridCell): boolean {
  return WALL_KEYS.has(cellKey(cell));
}

export function isProtectedCell(cell: GridCell): boolean {
  return isSameCell(cell, ENTRY_CELL) || isSameCell(cell, TREASURE_CELL) || isSameCell(cell, BOSS_CELL);
}

export function cellToWorld(cell: GridCell): { x: number; y: number } {
  return {
    x: GRID_OFFSET_X + cell.x * TILE_SIZE + TILE_SIZE / 2,
    y: GRID_OFFSET_Y + cell.y * TILE_SIZE + TILE_SIZE / 2,
  };
}

export function gridPositionToWorld(x: number, y: number): { x: number; y: number } {
  return {
    x: GRID_OFFSET_X + x * TILE_SIZE + TILE_SIZE / 2,
    y: GRID_OFFSET_Y + y * TILE_SIZE + TILE_SIZE / 2,
  };
}

export function worldToCell(x: number, y: number): GridCell | null {
  const cell = {
    x: Math.floor((x - GRID_OFFSET_X) / TILE_SIZE),
    y: Math.floor((y - GRID_OFFSET_Y) / TILE_SIZE),
  };

  return isInsideGrid(cell) ? cell : null;
}
