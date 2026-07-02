import {
  cellKey,
  GRID_COLS,
  GRID_ROWS,
  isInsideGrid,
  isSameCell,
} from '../game/constants';
import type { AdventurerRole, GridCell } from '../game/types';

interface PathOptions {
  role: AdventurerRole;
  trapAvoidance: number;
  trapDangerByCell: Record<string, number>;
  knownTrapCells: Set<string>;
  blockedCellKeys: Set<string>;
}

interface OpenNode {
  cell: GridCell;
  key: string;
  costFromStart: number;
  estimatedTotal: number;
}

export function findPath(start: GridCell, goal: GridCell, options: PathOptions): GridCell[] {
  if (isSameCell(start, goal)) {
    return [];
  }

  const open: OpenNode[] = [
    {
      cell: start,
      key: cellKey(start),
      costFromStart: 0,
      estimatedTotal: heuristic(start, goal),
    },
  ];
  const cameFrom = new Map<string, string>();
  const costByKey = new Map<string, number>([[cellKey(start), 0]]);

  while (open.length > 0) {
    open.sort((a, b) => a.estimatedTotal - b.estimatedTotal);
    const current = open.shift();

    if (!current) {
      break;
    }

    if (isSameCell(current.cell, goal)) {
      return rebuildPath(cameFrom, current.key).slice(1);
    }

    for (const neighbor of neighbors(current.cell)) {
      if (!isWalkable(neighbor, options.blockedCellKeys)) {
        continue;
      }

      const neighborKey = cellKey(neighbor);
      const nextCost = current.costFromStart + traversalCost(neighbor, options);
      const knownCost = costByKey.get(neighborKey);

      if (knownCost !== undefined && nextCost >= knownCost) {
        continue;
      }

      costByKey.set(neighborKey, nextCost);
      cameFrom.set(neighborKey, current.key);
      open.push({
        cell: neighbor,
        key: neighborKey,
        costFromStart: nextCost,
        estimatedTotal: nextCost + heuristic(neighbor, goal),
      });
    }
  }

  return [];
}

export function hasWalkablePath(start: GridCell, goal: GridCell, blockedCellKeys: Set<string>): boolean {
  if (isSameCell(start, goal)) {
    return true;
  }

  if (!isWalkable(start, blockedCellKeys) || !isWalkable(goal, blockedCellKeys)) {
    return false;
  }

  const visited = new Set<string>([cellKey(start)]);
  const queue: GridCell[] = [start];

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current) {
      break;
    }

    for (const neighbor of neighbors(current)) {
      const key = cellKey(neighbor);

      if (!isWalkable(neighbor, blockedCellKeys) || visited.has(key)) {
        continue;
      }

      if (isSameCell(neighbor, goal)) {
        return true;
      }

      visited.add(key);
      queue.push(neighbor);
    }
  }

  return false;
}

function rebuildPath(cameFrom: Map<string, string>, endKey: string): GridCell[] {
  const pathKeys = [endKey];
  let currentKey = endKey;

  while (cameFrom.has(currentKey)) {
    const previous = cameFrom.get(currentKey);

    if (!previous) {
      break;
    }

    pathKeys.unshift(previous);
    currentKey = previous;
  }

  return pathKeys.map((key) => {
    const [x, y] = key.split(',').map(Number);
    return { x, y };
  });
}

function traversalCost(cell: GridCell, options: PathOptions): number {
  const key = cellKey(cell);
  const learnedDanger = options.trapDangerByCell[key] ?? 0;
  const visibleTrapPenalty = options.knownTrapCells.has(key) ? 0.18 : 0;
  const roleModifier = options.role === 'thief' ? 0.42 : 1;
  return 1 + visibleTrapPenalty + learnedDanger * options.trapAvoidance * roleModifier;
}

function neighbors(cell: GridCell): GridCell[] {
  return [
    { x: cell.x + 1, y: cell.y },
    { x: cell.x - 1, y: cell.y },
    { x: cell.x, y: cell.y + 1 },
    { x: cell.x, y: cell.y - 1 },
  ].filter((candidate) => candidate.x >= 0 && candidate.y >= 0 && candidate.x < GRID_COLS && candidate.y < GRID_ROWS);
}

function isWalkable(cell: GridCell, blockedCellKeys: Set<string>): boolean {
  return isInsideGrid(cell) && !blockedCellKeys.has(cellKey(cell));
}

function heuristic(a: GridCell, b: GridCell): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
