import type { GridCell } from './types';
import { ECONOMY_BALANCE } from '../systems/economyBalance';

export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 640;

export const PARTY_SIZE = 5;

export const GRID_COLS = 23;
export const GRID_ROWS = 16;
export const TILE_SIZE = 28;
export const GRID_OFFSET_X = 14;
export const GRID_OFFSET_Y = 92;

export const ENTRY_CELL: GridCell = { x: 0, y: 7 };
export const TREASURE_CELL: GridCell = { x: 16, y: 4 };
export const BOSS_CELL: GridCell = { x: 22, y: 12 };

export const STARTING_GOLD = ECONOMY_BALANCE.startingGold;
export const DIG_COST = ECONOMY_BALANCE.digCost;

export const DOOR_COST = ECONOMY_BALANCE.doorCost;
export const DOOR_HP = ECONOMY_BALANCE.doorHp;
export const THIEF_DOOR_DAMAGE_MULTIPLIER = 2;

export function cellKey(cell: GridCell): string {
  return `${cell.x},${cell.y}`;
}

export function isSameCell(a: GridCell, b: GridCell): boolean {
  return a.x === b.x && a.y === b.y;
}

export function isInsideGrid(cell: GridCell): boolean {
  return cell.x >= 0 && cell.y >= 0 && cell.x < GRID_COLS && cell.y < GRID_ROWS;
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
