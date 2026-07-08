import { DIG_COST, RESEAL_TILE_COST, cellKey, isInEntrySafeZone, isInsideGrid, isSameCell } from '../game/constants';
import {
  getTileAt,
  hasAdjacentDugTile,
  markSpecializedRoom,
  setDungeonTile,
} from '../game/dungeonTiles';
import type { AdventurerEntity, DefenseEntity, DungeonDoor, DungeonTile, DungeonTreasure, DungeonValidation, GridCell, RoomSpecialization } from '../game/types';

export interface ConstructionResult {
  ok: boolean;
  tiles: DungeonTile[];
  cost: number;
  changed: number;
  message: string;
}

export function digRockTile(tiles: DungeonTile[], cell: GridCell, gold: number): ConstructionResult {
  const tile = getTileAt(tiles, cell);

  if (!tile || tile.type !== 'rock') {
    return blocked(tiles, 'Cette case est deja creusee ou reservee. La pioche demande de la vraie roche.');
  }

  if (!hasAdjacentDugTile(tiles, cell)) {
    return blocked(tiles, 'Creusement refuse: commence depuis une case deja creusee ou possedee.');
  }

  if (gold < DIG_COST) {
    return blocked(tiles, `Il faut ${DIG_COST} or pour creuser. La roche refuse les promesses de paiement.`);
  }

  return {
    ok: true,
    tiles: setDungeonTile(tiles, cell, 'floor'),
    cost: DIG_COST,
    changed: 1,
    message: `Roche creusee pour ${DIG_COST} or. Le territoire du donjon gagne une dent.`,
  };
}

export function markPlayerRoom(
  tiles: DungeonTile[],
  center: GridCell,
  roomType: Extract<RoomSpecialization, 'guardRoom' | 'crypt'>,
  label: string,
): ConstructionResult {
  const { tiles: nextTiles, changed } = markSpecializedRoom(tiles, center, roomType);

  if (changed === 0) {
    return blocked(tiles, 'Aucune zone creusee valide a specialiser ici. Il faut du sol, pas de la roche.');
  }

  return {
    ok: true,
    tiles: nextTiles,
    cost: 0,
    changed,
    message: `${label} tracee sur ${changed} dalle${changed > 1 ? 's' : ''}. Les effets viendront plus tard.`,
  };
}

export function canBuildDefenseOnTile(tile: DungeonTile | null): boolean {
  if (tile === null) {
    return false;
  }

  if (tile.type === 'floor' || tile.type === 'room') {
    return true;
  }

  return false;
}

export function canBuildDefenseAt(tiles: DungeonTile[], cell: GridCell): boolean {
  return isInsideGrid(cell) && !isInEntrySafeZone(cell) && canBuildDefenseOnTile(getTileAt(tiles, cell));
}

export interface ResealTileContext {
  tiles: DungeonTile[];
  cell: GridCell;
  gold: number;
  doors: DungeonDoor[];
  defenses: DefenseEntity[];
  adventurers: AdventurerEntity[];
  treasures: DungeonTreasure[];
  bossCell: GridCell;
  validateLayout: (tiles: DungeonTile[]) => DungeonValidation;
}

export function resealDugTile(context: ResealTileContext): ConstructionResult {
  const rejection = describeResealTileRejection(context);

  if (rejection) {
    return blocked(context.tiles, rejection);
  }

  if (context.gold < RESEAL_TILE_COST) {
    return blocked(context.tiles, `Il faut ${RESEAL_TILE_COST} or pour reboucher cette case.`);
  }

  const nextTiles = setDungeonTile(context.tiles, context.cell, 'rock');
  const validation = context.validateLayout(nextTiles);

  if (!validation.valid) {
    return blocked(context.tiles, validation.reason ?? 'Impossible : cela bloque le chemin.');
  }

  return {
    ok: true,
    tiles: nextTiles,
    cost: RESEAL_TILE_COST,
    changed: 1,
    message: `Case rebouchee pour ${RESEAL_TILE_COST} or. Le donjon reprend une mauvaise forme.`,
  };
}

export function describeResealTileRejection(context: Omit<ResealTileContext, 'validateLayout'>): string | null {
  const tile = getTileAt(context.tiles, context.cell);

  if (!tile || tile.type === 'rock') {
    return 'Impossible : il faut une case deja creusee a reboucher.';
  }

  if (tile.type === 'entrance') {
    return "Impossible : l'entree doit rester ouverte.";
  }

  if (tile.type === 'treasure') {
    return 'Impossible : le tresor doit rester accessible.';
  }

  if (tile.type === 'throne') {
    return 'Impossible : le boss doit rester accessible.';
  }

  if (tile.type !== 'floor' && tile.type !== 'room') {
    return 'Cette case est critique.';
  }

  if (isSameCell(context.cell, context.bossCell)) {
    return 'Impossible : le boss occupe cette case.';
  }

  if (context.doors.some((door) => !door.destroyed && isSameCell(door.cell, context.cell))) {
    return 'Impossible : retire la porte avant de reboucher.';
  }

  if (context.defenses.some((defense) => defense.alive && isSameCell(defense.cell, context.cell))) {
    return 'Impossible : une defense occupe cette case.';
  }

  if (
    context.adventurers.some((adventurer) => (
      adventurer.alive &&
      !adventurer.escaped &&
      isSameCell({ x: Math.round(adventurer.x), y: Math.round(adventurer.y) }, context.cell)
    ))
  ) {
    return 'Impossible : un aventurier occupe cette case.';
  }

  if (
    context.treasures.some((treasure) => (
      treasure.status !== 'stolen' &&
      (isSameCell(treasure.cell, context.cell) || (treasure.droppedCell !== null && isSameCell(treasure.droppedCell, context.cell)))
    ))
  ) {
    return 'Impossible : un tresor occupe cette case.';
  }

  return null;
}

export function canMarkRoomTile(tile: DungeonTile | null): boolean {
  if (!canBuildDefenseOnTile(tile)) {
    return false;
  }

  return tile?.roomType !== 'treasureRoom' && tile?.roomType !== 'throneRoom';
}

export function isExactReservedBuildCell(tiles: DungeonTile[], cell: GridCell): boolean {
  const tile = getTileAt(tiles, cell);
  return tile?.type === 'entrance' || tile?.type === 'treasure' || tile?.type === 'throne';
}

export function buildRejectionReason(tiles: DungeonTile[], cell: GridCell): string {
  const tile = getTileAt(tiles, cell);

  if (!tile || tile.type === 'rock') {
    return 'Cette defense exige un sol creuse: la roche refuse de cooperer.';
  }

  if (isInEntrySafeZone(cell)) {
    return "Zone de surete : laisse une chance aux intrus d'entrer.";
  }

  if (tile.type === 'entrance') {
    return 'Impossible de pieger l entree exacte: les expeditions doivent pouvoir entrer dans le drame.';
  }

  if (tile.type === 'treasure') {
    return 'Le tresor lui-meme reste intouchable. Protege plutot sa salle.';
  }

  if (tile.type === 'throne') {
    return 'Le point central du boss reste reserve. La salle autour, elle, peut saigner.';
  }

  return 'Cette case refuse ton autorite de construction.';
}

export function hasDefenseOnCell(defenses: Array<{ alive: boolean; cell: GridCell }>, cell: GridCell): boolean {
  return defenses.some((defense) => defense.alive && isSameCell(defense.cell, cell));
}

export function hasDefenseOnKey(defenses: Array<{ alive: boolean; cell: GridCell }>, key: string): boolean {
  return defenses.some((defense) => defense.alive && cellKey(defense.cell) === key);
}

function blocked(tiles: DungeonTile[], message: string): ConstructionResult {
  return {
    ok: false,
    tiles,
    cost: 0,
    changed: 0,
    message,
  };
}
