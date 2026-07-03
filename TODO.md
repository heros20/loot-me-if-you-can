# TODO

## Near Term

- Replace generated placeholders with verified CC0 Kenney assets.
- Add sound effects and a mute toggle.
- Add clearer placement previews for trap range and minion attack range.
- Add visual effects for boss abilities (shockwave ring, roar cone, summon puff).
- Add hotkey for pause (space).

## Gameplay

- Doors V1 (reinforced door) are in: placement rules, gold cost, locked/picking/open states, thief lockpicking, no-thief group retreat, reset between expeditions, voluntary build-phase removal with partial refund, and debrief mentions. Not yet built: one-way doors, portcullises, magic/secret doors, keys, or any advanced door variants.
- Add room ownership and named room behaviors on top of the Carve Your Kingdom V1 tile model.
- Add trap upgrades between waves.
- Add more boss abilities and an ability upgrade path funded by infamy.
- Add adventurer equipment traits after repeated deaths.
- Future class abilities pass, not started yet: warrior taunt/protection, thief lockpicking/trap detection polish, healer targeted and group heals, mage offensive ice/slow spell, defensive monster role abilities.
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
- Doors V1 persistence limit: a picked door opens only for the current expedition, then resets locked between expeditions. It cannot be damaged or destroyed by adventurers, and there is no repair economy because there is no door damage model. Players can still voluntarily remove a placed door during build phase for a partial refund.
- Doors V1 pathfinding limit: doors are fully traversable for the A* cost model (no extra weight), so on layouts with multiple equal-length routes the guild may occasionally path around a door instead of through it. Fine for V1 corridors/choke points; revisit if the Royaume's future pathing needs to actively avoid or route through known doors.
- Doors future: give pathfinding a small extra cost for door cells once maps grow wide enough for equal-length bypass routes to be common, so a placed door reliably matters instead of being silently routed around.
- Doors future: richer lock interactions or upgrades only if V1 needs more depth; no repair economy is needed while doors are non-destructible.
- Doors future: advanced door variants (locks, one-way doors, portcullises) once Portes V1 needs more depth — none of this is started yet.
- Doors future: revisit door placement/readability once dungeons include larger open rooms rather than mostly corridors, since a single door overlay reads less clearly in a wide-open specialized room than in a narrow passage.
- Doors cleanup: `WaveStats`/`WaveReport` still carry `doorDamageTotal`, `doorDamageByThief`, `doorsDestroyed`, `doorDestroyedBeforeTreasure`, and `doorSalvageGold` from the pre-lockpicking combat model. They are dead (never incremented, always render as hidden/zero) now that doors are locked/picked instead of damaged. Safe to remove in a dedicated cleanup pass; left alone here to avoid unrelated churn.

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
- Portes V1.1 polish: documented the door's design intent as D-011, added a build-panel door summary (active count + average HP), and gave door placement refusals a specific reason instead of one generic message.
- Expedition Intelligence & Early Strategy: added local adventurer hesitation/formation/retreat behavior, contextual barks above units, thief trap mitigation and door leadership, boss autopilot for existing powers, richer starting economy, locked-door crochetage, and clearer tactical debrief lines.
- Follow-up polish: pre-emptive thief bias whenever a locked door exists (not just after a failed retreat), and debrief narration for disobedience/cover-retreat moments.
