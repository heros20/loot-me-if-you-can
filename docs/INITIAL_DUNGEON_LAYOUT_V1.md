# Initial Dungeon Layout V1.1

Date: 2026-07-06
Status: Implemented

## Goal

The initial dungeon is a hand-authored, deterministic layout with real rooms,
winding corridors, and choke points instead of either a nearly-prepared network
or a bare, over-carved skeleton. This is deterministic layout work only: no
procedural generation, no run seeding, no multi-level structure, no wall/backfill
construction, no new mechanics.

## Why the previous (10.9%) layout was rejected

The prior pass reduced the dug ratio from ~19% to ~10.9% by shrinking every zone
down to a tiny cavity around the entry, a compact treasure pocket, and a compact
throne pocket, joined by 1-wide corridors. In play this produced the opposite of
the intended effect:

- fewer dug cells meant fewer *choices*, not more tension: there was essentially
  one route and nothing to defend in depth;
- entry, treasure, and boss ended up connected by a short, mostly straight
  "highway" with almost no real rooms to fortify;
- there was no defense room, no lateral branch, and no antichamber, so traps,
  doors, and monsters had very few interesting places to go.

The lesson: dug ratio alone does not determine whether a dungeon feels
strategic. Topology (rooms, turns, branches, distance) matters more than the
raw percentage of carved floor.

## New ratio and structure

- Grid size: 23 x 16 = 368 cells (unchanged).
- Dug cells: 177 (rock: 191, floor/corridor: 19, room: 155, special: 3).
- Dug ratio: ~48.1%. Rock ratio: ~51.9%.
- Target band: 40%-60% dug, enforced by a smoke test (see below).

Seven named zones (see `getInitialDungeonZones()` in `src/game/dungeonTiles.ts`):

| Zone | Approx. size | Role |
|---|---|---|
| Entry | 34 cells | Starting cavity around `ENTRY_CELL` (0,7); mostly inside the safe zone. |
| Defense room | 30 cells | First real room outside the safe zone (~7 tiles from entry); the mandatory choke point every expedition must cross. |
| Lateral | 12 cells | A lower alcove of the defense room itself, so it can never be used to bypass the defense-room choke point. Optional dig target for a secondary defense. |
| Gold pocket | 12 cells | A dead-end spur off the treasure corridor, reserved for a future gold treasure or ambush spot. |
| Treasure | 29 cells | Real room around `TREASURE_CELL` (16,4), offset above the main corridor rather than sitting on a straight line to the boss. |
| Antechamber | 20 cells | A last real room the party must cross before the throne room. |
| Throne | 24 cells | Boss room around `BOSS_CELL` (22,12), the farthest zone from the entry. |

## Route shape

- entry -> treasure: 27 steps.
- treasure -> boss: 14 steps.
- entry -> boss: 37 steps, with 11 direction changes (turns).
- The three anchors (entry, treasure, boss) are not aligned on anything close
  to a straight line (checked with a cross-product heuristic).
- The only way from the entry to the treasure or the boss is through the
  defense room and its single 1-wide exit corridor (around cells (10,11)-(13,11)):
  a door or trap placed there affects every expedition.
- The treasure sits in its own room above the main corridor, not on the direct
  route to the boss; reaching the boss still requires passing the treasure
  room's corridor, the antechamber, and several turns south-east.
- The lateral pocket and the gold pocket are true dead ends: removing them
  entirely would not disconnect the entry -> treasure -> boss route, and
  neither can be used to skip the defense-room choke point.

## Preserved Rules

- `ENTRY_CELL`, `TREASURE_CELL`, `BOSS_CELL` are unchanged.
- `SAFE_ZONE_RADIUS = 2` is unchanged; the treasure and boss anchors stay
  outside the safe zone.
- Entry -> treasure -> boss validation passes at game start.
- Boss and treasure still move through Dungeon Anchors V1; gold treasures
  still deposit, move through targeting, and refund correctly; the V1 cap of
  3 active treasures is unchanged.
- Expedition size remains exactly 5; Survivor Continuity V1 is untouched.
- Locked doors, thief lock-picking, and the "no thief, retreat" behavior all
  still work against the new layout's choke point.

## Test Guards

`scripts/smoke.ts` now checks the initial layout's *topology*, not just its
dug ratio:

1. Dug ratio between 0.40 and 0.60.
2. Entry -> treasure and treasure -> boss stay connected.
3. Entry -> boss path length is at least 25 cells (currently 37).
4. Entry -> boss path has at least 4 direction changes (currently 11).
5. Entry, treasure, and boss are not roughly aligned on a straight line.
6. At least 4 named zones of 6+ cells exist (currently 7).
7. Treasure and boss stay outside the entry safe zone.

Several other smoke tests that used to reference specific "always floor"
coordinates from the old layout were moved to equivalent cells in the new
rooms/corridors (defense room, gold pocket) so they keep exercising the same
mechanics (dig cost, door placement/removal/locking, gold treasure cap, the
door choke point during a real wave) against the new geometry.

## Future Work

- Procedural generation by run (Dungeon Structure V2, V2.0) can use this
  layout's room/corridor/choke-point shape as its deterministic baseline and
  validation target, not just its dug ratio.
- The future `Mur` action should remain a backfill/rebouchage tool consistent
  with D-009.
- The lateral and gold-pocket dead ends are intentionally left as rock-adjacent
  pockets for players to dig into; no gameplay effect is attached to them yet.
