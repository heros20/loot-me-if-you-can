import { DOOR_COST, DOOR_HP, THIEF_DOOR_DAMAGE_MULTIPLIER, isSameCell } from '../game/constants';
import { getTileAt } from '../game/dungeonTiles';
import type { AdventurerRole, DungeonDoor, DungeonTile, GridCell } from '../game/types';

/*
 * Portes V1: une porte est un simple overlay pose sur une case deja creusee
 * (floor/room, y compris les anneaux treasureRoom/throneRoom). Elle ne remplace
 * jamais rock/entrance/treasure/throne et reste traversable pour le pathfinding;
 * elle bloque et ralentit uniquement en runtime, jusqu'a sa destruction.
 */

export interface DoorPlacementResult {
  ok: boolean;
  doors: DungeonDoor[];
  cost: number;
  message: string;
}

export function isDoorPlaceableTile(tile: DungeonTile | null): boolean {
  if (tile === null) {
    return false;
  }

  return (
    tile.type !== 'rock' &&
    tile.type !== 'entrance' &&
    tile.type !== 'treasure' &&
    tile.type !== 'throne'
  );
}

export function canPlaceDoorAt(tiles: DungeonTile[], cell: GridCell): boolean {
  return isDoorPlaceableTile(getTileAt(tiles, cell));
}

export function findActiveDoorAt(doors: DungeonDoor[], cell: GridCell): DungeonDoor | null {
  return doors.find((door) => !door.destroyed && isSameCell(door.cell, cell)) ?? null;
}

export function placeDoorAt(
  tiles: DungeonTile[],
  doors: DungeonDoor[],
  cell: GridCell,
  gold: number,
  cellOccupiedByDefense: boolean,
  id: string,
): DoorPlacementResult {
  if (!canPlaceDoorAt(tiles, cell)) {
    return blocked(doors, 'Porte impossible ici: il faut un sol creuse, hors entree, tresor et trone exacts.');
  }

  if (findActiveDoorAt(doors, cell)) {
    return blocked(doors, 'Une porte occupe deja cette case.');
  }

  if (cellOccupiedByDefense) {
    return blocked(doors, 'Cette case est deja occupee par un piege ou un monstre.');
  }

  if (gold < DOOR_COST) {
    return blocked(doors, `Il faut ${DOOR_COST} or pour renforcer une porte.`);
  }

  return {
    ok: true,
    doors: [...doors, createDoor(id, cell)],
    cost: DOOR_COST,
    message: 'Porte renforcee installee. Les couloirs deviennent nettement moins accueillants.',
  };
}

export function createDoor(id: string, cell: GridCell): DungeonDoor {
  return {
    id,
    cell: { ...cell },
    hp: DOOR_HP,
    maxHp: DOOR_HP,
    destroyed: false,
  };
}

export function computeDoorDamage(baseDamage: number, role: AdventurerRole): number {
  const multiplier = role === 'thief' ? THIEF_DOOR_DAMAGE_MULTIPLIER : 1;
  return Math.max(1, Math.round(baseDamage * multiplier));
}

/*
 * Persistance V1 (voir TODO.md): une porte non detruite reste en place et est
 * reparee integralement entre deux expeditions. Une porte detruite disparait
 * pour de bon; il n'y a pas encore d'economie de reparation partielle.
 */
export function repairDoors(doors: DungeonDoor[]): DungeonDoor[] {
  return doors.filter((door) => !door.destroyed).map((door) => ({ ...door, hp: door.maxHp }));
}

function blocked(doors: DungeonDoor[], message: string): DoorPlacementResult {
  return { ok: false, doors, cost: 0, message };
}
