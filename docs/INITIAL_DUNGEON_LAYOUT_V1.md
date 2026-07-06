# Initial Dungeon Layout V1

Date: 2026-07-06
Status: Implemented

## Goal

The initial dungeon now starts as a rough carved core instead of a nearly prepared network.

This is deterministic layout work only. It is not procedural generation, not run seeding, not multi-level structure, and not wall/backfill construction.

## Before

- Grid size: 23 x 16 = 368 cells.
- Dug cells: 70.
- Dug ratio: about 19.0%.
- Rock ratio: about 81.0%.
- The map included multiple free side rooms and a broad open route toward treasure and boss.

## After

- Dug cells: 40.
- Dug ratio: about 10.9%.
- Rock ratio: about 89.1%.
- Initial rooms are reduced to a tiny entry-side cavity, a compact treasure pocket, and a compact throne pocket.
- The starting route remains valid but narrower:
  - entry -> short entry path -> small bend;
  - upper corridor to the main treasure;
  - separate lower/side route from treasure toward the throne.

## Preserved Rules

- `ENTRY_CELL` remains the entry.
- `TREASURE_CELL` remains the initial main treasure anchor.
- `BOSS_CELL` remains the initial boss anchor.
- `SAFE_ZONE_RADIUS = 2` remains unchanged.
- Entry -> treasure -> boss validation passes at game start.
- Boss and treasure still move through Dungeon Anchors V1.
- Gold treasures still deposit, move through targeting, and refund correctly.
- Expedition size remains exactly 5.
- Survivor Continuity V1 is untouched.

## Test Guards

Smoke tests now assert:

- dug ratio <= 12%;
- rock ratio >= 85%;
- entry -> treasure -> boss is connected;
- treasure and boss are outside the safe zone;
- initial paths are not trivially short;
- the first expedition can still launch;
- movable boss, movable treasure, and gold treasures still work.

## Future Work

- Procedural generation by run can use this layout as the deterministic baseline.
- The future `Mur` action should remain a backfill/rebouchage tool consistent with D-009.
- Any later random generator must keep equivalent density and route-validation constraints.
