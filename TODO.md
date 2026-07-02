# TODO

## Near Term

- Replace generated placeholders with verified CC0 Kenney assets.
- Add sound effects and a mute toggle.
- Add clearer placement previews for trap range and minion attack range.
- Add visual effects for boss abilities (shockwave ring, roar cone, summon puff).
- Add hotkeys for boss abilities (1/2/3) and pause (space).

## Gameplay

- Doors V1 (reinforced door) are in: placement rules, gold cost, HP, thief bonus damage, and debrief mentions. Not yet built: lockpicking, one-way doors, portcullises, magic/secret doors, or any partial-repair economy (see Technical limits below).
- Add room ownership and named room behaviors on top of the Carve Your Kingdom V1 tile model.
- Add trap upgrades between waves.
- Add more boss abilities and an ability upgrade path funded by infamy.
- Add adventurer equipment traits after repeated deaths.
- Let escaped treasure thieves come back richer and better equipped (bounty pressure).
- Give named rooms persistent titles based on what happened there.
- Improve injuries with recovery timers, permanent scars, and visible behavior changes.
- Expand vengeful targeting: heirs should hunt the specific minion type that killed their ancestor.
- Build a living guild system with recruiters, preferred tactics, grudges, and limited rosters.
- Let heirs inherit lost equipment hooks and legendary items, not only grudges.
- Expand tavern rumors into a taverne screen with multiple competing rumors.
- Expand dungeon reputation into regional fear, greed, fame, and bounty pressure.
- Add collective adventurer adaptation beyond role counts, including learned paths and shared trap maps.
- Track legendary objects recovered from the dungeon or lost inside it.

## Technical

- Add automated browser smoke tests (the headless simulation suite lives in `scripts/`, run with `npm run smoke`).
- Turn the smoke scripts into deterministic assertions with a proper test runner.
- Split combat resolution into a dedicated system when the rule set grows.
- Add asset loading from a JSON manifest once external art is introduced.
- Split profile memory, expedition resolution, and report generation into smaller simulation modules if they grow.
- Doors V1 persistence limit: a damaged-but-not-destroyed door is fully repaired for free at the next build phase, and a destroyed door simply disappears (no partial-repair economy, no gold cost to fix). This keeps the first pass simple and stable; a real repair/upgrade economy is a deliberate follow-up, not an oversight.
- Doors V1 pathfinding limit: doors are fully traversable for the A* cost model (no extra weight), so on layouts with multiple equal-length routes the guild may occasionally path around a door instead of through it. Fine for V1 corridors/choke points; revisit if the Royaume's future pathing needs to actively avoid or route through known doors.

## Done in 0.5.0

- Boss abilities with cooldowns (shockwave, roar, summon).
- Treasure as a physical, stealable object with gold/reputation loss.
- Adventurer inspection panel.
- Named minions with kill counters and veteran chronicles.
- Families and heirs inheriting grudges, names, and nemesis memories.
- Tavern rumors influencing future waves.
- Pause and speed controls.
- Best wave saved in local storage.

## Done in current studio pass

- Fixed every expedition at exactly 5 adventurers.
- Added adaptive class composition without increasing party size.
- Replaced wall editing with a mostly-rock 23x16 dungeon and explicit rock/floor/room/special tile semantics.
- Added paid adjacent digging with no-gold feedback.
- Stabilized constructibility around treasure and throne rooms while keeping exact entrance, treasure, and boss cells protected.
- Added distinct treasure-room and throne-room placeholders.
- Routed short boss and minion movement through carved tiles when direct movement would cross rock.
- Extracted construction validation helpers into `src/systems/dungeonConstruction.ts`.
- Added independent `npm run smoke-treasure` and `npm run smoke-longrun` scripts.
- Added simple guard-room and crypt marking on carved tiles.
- Added route validation and pathfinding over rock-blocked, carved-walkable tiles.
- Reorganized build UI by construction, rooms, traps, monsters, boss, and expedition.
- Added a full post-wave debrief screen with participants, learning, rumors, adaptation, and economy.
- Added Portes V1 (reinforced door): a tactical, non-tile construction overlay that slows expeditions, gives the thief a clear role, and reinforces the treasure/throne rooms.
