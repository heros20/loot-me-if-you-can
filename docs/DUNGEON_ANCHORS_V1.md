# Dungeon Anchors V1

Date: 2026-07-06
Status: Implemented

## Scope

- Entry safe zone: `SAFE_ZONE_RADIUS = 2` around `ENTRY_CELL`.
- The safe zone refuses traps, monsters, doors, boss anchors, and treasure anchors. Digging is still allowed.
- Build tool `Deplacer boss`: moves the existing boss anchor/trone, never duplicates it.
- Build tool `Deplacer tresor`: moves the main treasure anchor.
- Build tool `Ajouter tresor d'or`: deposits `GOLD_TREASURE_DEFAULT_VALUE = 20` gold as a secondary treasure.
- Build tool `Retirer tresor`: refunds an unstolen gold treasure.
- V1 maximum: `MAX_TREASURES_V1 = 3` active treasures total.
- Route validation preserves entry -> treasure(s) -> boss. If there are no active treasures, entry -> boss must remain reachable.
- Adventurers target one accessible treasure among several. After one treasure is taken, the existing group objective decides escape with carrier or challenge boss.
- A stolen gold treasure disappears and does not create a second replacement penalty.

## Not In Scope

- Weapon, armor, or technique treasures.
- Survivor continuity into the next expedition beyond the current chronicle/profile systems.
- A true guild tavern scene.
- Cartography, Cartographer, sub-bosses, multiple levels, procedural run generation, or a new Kingdom AI.
- Looting every treasure before boss/escape.

## Follow-Ups

- Decide whether future treasure types are objectives, equipment hooks, or persistent legendary objects.
- Add richer survivor continuity only after the current chronicle loop is playtested.
- Build a tavern scene only when rumors, guild rosters, and expedition prep need a shared screen.
- Revisit initial dungeon density in a dedicated balance pass; Dungeon Anchors V1 keeps the existing map layout.
