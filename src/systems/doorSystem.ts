import { DOOR_COST, DOOR_HP, isInEntrySafeZone, isSameCell } from '../game/constants';
import { getTileAt } from '../game/dungeonTiles';
import { ECONOMY_BALANCE } from './economyBalance';
import type { DungeonDoor, DungeonTile, GridCell } from '../game/types';

/*
 * Portes V1: une porte est un simple overlay pose sur une case deja creusee
 * (floor/room, y compris les anneaux treasureRoom/throneRoom). Elle ne remplace
 * jamais rock/entrance/treasure/throne et reste traversable pour le pathfinding;
 * elle bloque et ralentit uniquement en runtime, jusqu'a ce qu'un voleur
 * la crochete. Elle se referme automatiquement entre deux expeditions.
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
  return !isInEntrySafeZone(cell) && isDoorPlaceableTile(getTileAt(tiles, cell));
}

export function describeDoorTileRejection(tile: DungeonTile | null): string {
  if (tile === null) {
    return 'Impossible de placer une porte ici: cette case est hors du donjon.';
  }

  switch (tile.type) {
    case 'rock':
      return 'Impossible de placer une porte sur la roche: creuse cette case avant.';
    case 'entrance':
      return "Impossible de placer une porte sur la case d'entree.";
    case 'treasure':
      return 'Impossible de placer une porte exactement sur le tresor.';
    case 'throne':
      return 'Impossible de placer une porte exactement sur le trone du boss.';
    default:
      return 'Porte impossible ici.';
  }
}

export function findActiveDoorAt(doors: DungeonDoor[], cell: GridCell): DungeonDoor | null {
  return doors.find((door) => !door.destroyed && !door.openedForExpedition && isSameCell(door.cell, cell)) ?? null;
}

export interface DoorRemovalResult {
  ok: boolean;
  doors: DungeonDoor[];
  refundGold: number;
  message: string;
}

export function findDoorAt(doors: DungeonDoor[], cell: GridCell): DungeonDoor | null {
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
  if (isInEntrySafeZone(cell)) {
    return blocked(doors, "Zone de surete : laisse une chance aux intrus d'entrer.");
  }

  if (!canPlaceDoorAt(tiles, cell)) {
    return blocked(doors, describeDoorTileRejection(getTileAt(tiles, cell)));
  }

  if (findDoorAt(doors, cell)) {
    return blocked(doors, 'Cette case est deja occupee par une porte.');
  }

  if (cellOccupiedByDefense) {
    return blocked(doors, 'Cette case est deja occupee par un piege ou un monstre.');
  }

  if (gold < DOOR_COST) {
    return blocked(doors, `Pas assez d'or: il faut ${DOOR_COST} or pour renforcer une porte.`);
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
    locked: true,
    openedForExpedition: false,
    beingPickedById: null,
    pickProgressMs: 0,
    pickRequiredMs: ECONOMY_BALANCE.doorPickRequiredMs,
    hp: DOOR_HP,
    maxHp: DOOR_HP,
    destroyed: false,
    salvageClaimed: false,
  };
}

export function removeDoorAt(doors: DungeonDoor[], cell: GridCell, refundGold: number): DoorRemovalResult {
  const door = findDoorAt(doors, cell);

  if (!door) {
    return {
      ok: false,
      doors,
      refundGold: 0,
      message: 'Aucune porte a retirer ici.',
    };
  }

  return {
    ok: true,
    doors: doors.filter((candidate) => candidate.id !== door.id),
    refundGold,
    message: `Porte retiree. ${refundGold} or recuperes en quincaillerie sinistre.`,
  };
}

/*
 * Persistance V1 verrouillee: une porte reste en place, ne perd pas de PV,
 * et se referme entre deux expeditions.
 */
export function repairDoors(doors: DungeonDoor[]): DungeonDoor[] {
  return doors
    .filter((door) => !door.destroyed)
    .map((door) => ({
      ...door,
      locked: true,
      openedForExpedition: false,
      beingPickedById: null,
      pickProgressMs: 0,
      hp: door.maxHp,
    }));
}

function blocked(doors: DungeonDoor[], message: string): DoorPlacementResult {
  return { ok: false, doors, cost: 0, message };
}
