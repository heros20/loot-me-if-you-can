# TODO

## Near Term

- Dungeon Structure V2 (see `docs/DUNGEON_STRUCTURE_V2.md`, `docs/DUNGEON_ANCHORS_V1.md`, and `docs/INITIAL_DUNGEON_LAYOUT_V1.md`):
  - V1.2 Dungeon Anchors V1 is implemented: safe zone, movable boss, movable main treasure, and gold treasures.
  - V1.3 mur constructible (rebouchage d'une case creusee, coherent avec D-009) + validation de chemin bidirectionnelle.
  - V1.4 Initial Dungeon Layout V1.1 is implemented: corrected the over-carved V1 (10.9% dug, straight highway) into a ~48% dug / ~52% rock layout with 7 real rooms/corridors, an 11-turn 37-cell entry -> boss route, and a mandatory defense-room choke point.
  - V2.0 generation aleatoire de la carte au lancement d'un run (seed, une seule fois par partie, jamais par expedition) should use the V1.1 room/corridor/choke-point shape as its baseline, not just its dug ratio.
  - V2.1 zones/antichambres sur une meme carte, V3.0 plusieurs niveaux + sous-boss.
- Future treasure types: weapon, armor, and technique treasures are not started; decide later whether they are loot, equipment hooks, or named legendary objects.
- Future survivor continuity: connect survivor chronicle consequences into the next expedition only after the current profile/chronicle loop is playtested.
- Future survivor availability: explicit rest/refusal/hospital rules only after Survivor Continuity V1 has enough playtest data.
- Future veteran leadership: turn the current narrative veteran into a mechanical leader only if repeated returnees need gameplay weight.
- Future guild tavern scene: expand rumors into a true tavern screen only when expedition prep needs it.
- Expand Kenney-based asset coverage for ability-specific particles/icons if V1 readability needs more than tint/pulse feedback.
- Add sound effects and a mute toggle.
- Add clearer placement previews for trap range and minion attack range.
- Add visual effects for boss abilities (shockwave ring, roar cone, summon puff).
- Add hotkey for pause (space).
- UI follow-ups from the menu/sidebar pass: wire boss abilities to manual `use-ability` clicks if manual casting returns, add small icons/symbols to tool and defense cards once art budget allows, and consider a proper options/credits route if the menu grows beyond a single overlay panel.
- Survivor Chronicle follow-up: tune the exact narrative line pool after playtests, and later decide how much of it feeds The Kingdom Remembers without adding cartography in this V1.

## Gameplay

- Doors V1 (reinforced door) are in: placement rules, gold cost, locked/picking/open states, thief lockpicking, no-thief group retreat, reset between expeditions, voluntary build-phase removal with partial refund, and debrief mentions. Not yet built: one-way doors, portcullises, magic/secret doors, keys, or any advanced door variants.
- Add room ownership and named room behaviors on top of the Carve Your Kingdom V1 tile model.
- Add trap upgrades between waves.
- Add more boss abilities and an ability upgrade path funded by infamy.
- Add adventurer equipment traits after repeated deaths.
- Combat Roles & Abilities V0 is in: future work should tune cooldowns/readability only after more playtest data, not add new classes or ability trees yet.
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
- Continue extracting combat resolution if V0 abilities grow beyond the current `combatAbilitySystem` boundary.
- Consider moving `src/assets/manifest.ts` to data/JSON only if the external asset list grows beyond the current Kenney V1 set.
- Split profile memory, expedition resolution, and report generation into smaller simulation modules if they grow.
- Doors V1 persistence limit: a picked door opens only for the current expedition, then resets locked between expeditions. It cannot be damaged or destroyed by adventurers, and there is no repair economy because there is no door damage model. Players can still voluntarily remove a placed door during build phase for a partial refund.
- Doors V1 pathfinding limit: doors are fully traversable for the A* cost model (no extra weight), so on layouts with multiple equal-length routes the guild may occasionally path around a door instead of through it. Fine for V1 corridors/choke points; revisit if the Royaume's future pathing needs to actively avoid or route through known doors.
- Doors future: give pathfinding a small extra cost for door cells once maps grow wide enough for equal-length bypass routes to be common, so a placed door reliably matters instead of being silently routed around.
- Doors future: richer lock interactions or upgrades only if V1 needs more depth; no repair economy is needed while doors are non-destructible.
- Doors future: advanced door variants (locks, one-way doors, portcullises) once Portes V1 needs more depth — none of this is started yet.
- Doors future: revisit door placement/readability once dungeons include larger open rooms rather than mostly corridors, since a single door overlay reads less clearly in a wide-open specialized room than in a narrow passage.
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
- Bugfix + Asset Integration V1: defensive units now respect closed reinforced doors, thieves have 2 trap interventions per expedition with overwhelmed feedback, Kenney Tiny Dungeon CC0 sprites are wired through `src/assets/manifest.ts`, and generated placeholders remain as load-failure fallbacks.
- Menu & sidebar UI/UX pass: redesigned the home menu (title, subtitle, ambiance copy, disabled Continue, credits toggle, prototype badge) and rebuilt the "Salle de controle" sidebar with a sticky header, one contextual message at a time, collapsible sections, compact cards with a selected-tool detail fiche, pill counters, and a compact scrollable journal feed. Presentation only; no snapshot, simulation, or balance changes.
- Expedition Clarity & Survivor Chronicle V1: treasure pickup now produces a collective group objective, combat readability uses short role/intent/ability labels, barks are shorter and spatially de-overlapped, and the post-wave report starts with a skippable survivor/no-survivor chronicle.
- Full-viewport layout pass: the app shell now fills the real browser window (docked play area + docked sidebar via `--sidebar-width`/`--hud-height` CSS custom properties) instead of a small fixed-size box centered on the page, and the existing Phaser `Scale.FIT` config scales the unchanged 960x640 game resolution to fill the larger canvas area. `src/styles.css` only; no grid, coordinate, or gameplay constant was touched.
- Sidebar audit & cleanup pass: primary build tools (dig/door/remove-door) are now always visible instead of hidden in an accordion, the header/next-expedition summaries were compressed from stat-card grids and 5-pill rows down to single compact lines, territory/door counters moved into a secondary "Salles & terrain" accordion, and every accordion defaults to closed unless its tool/defense is already selected. The remaining disabled "Bientot" placeholder is Mur; Deplacer boss is live in Objectifs. The survivor chronicle/debrief overlay was left untouched. See `docs/DUNGEON_STRUCTURE_V2.md` for the design spec this prepares the UI for.
- Dungeon Anchors V1: added entry safe zone, movable boss, movable main treasure, gold treasure deposit/removal, multi-treasure targeting, route validation over active anchors, rendered treasure markers, and smoke coverage. Deplacer boss is no longer a placeholder; Mur remains future.
- Survivor Continuity V1: survivors return automatically next expedition, keep profile memory, fill party slots before new adaptive recruits, preview as revenants in the sidebar, and appear in the survivor chronicle. Group size remains exactly 5.
- Initial Dungeon Layout V1: reduced the deterministic starting map from about 19.0% dug to about 10.9% dug, kept entry -> treasure -> boss valid, and added smoke guards for density, safe-zone compatibility, and non-trivial path length.
- Initial Dungeon Layout V1.1: corrected the V1 map (too linear despite the low dug ratio) into a hand-authored ~48% dug / ~52% rock layout with 7 named rooms/corridors (entry, defense room, lateral alcove, gold pocket, treasure room, antechamber, throne room), an 11-turn 37-cell entry -> boss route, and a mandatory defense-room choke point that cannot be bypassed. Smoke tests now check path length, turn count, alignment, and named-zone count in addition to the dug-ratio band. See `docs/INITIAL_DUNGEON_LAYOUT_V1.md`.
