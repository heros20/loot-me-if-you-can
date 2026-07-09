# TODO

## Near Term

- Run Progression / Reputation du Donjon V1 is implemented: reputation and threat now rise over a run, drive five readable tiers, add modest reward/preparation/role-pressure effects, gate current advanced defenses by tier or wave, appear in HUD/tavern/report, and stay compatible with survivor-gated Kingdom facts. Future work: manual playtest tier pacing, then tune only `runProgressionSystem.ts` thresholds/effects before adding any larger world or faction system.
- Equilibrage global V1 is implemented: key economy/combat/pacing values are centralized in `economyBalance.ts`, `combatBalance.ts`, `progressionBalance.ts`, and local balance tables; rewards, trap salvage, treasure penalties, special treasure costs/bonuses, survivor scaling, injury/refusal thresholds, Kingdom fact caps, exploration choices, remains loot, and bark cooldowns were tuned together. Future work: manual playtest the new numbers, then adjust only through the balance tables before adding new content.
- Multi-map / Etages V1 is implemented: at least three generated floors per new run, `DungeonMap` records, `mapId` on important entities/facts, depth-aware stair routing, global route validation across transitions, build actions scoped to the active floor, auto-follow during expeditions, per-map zones/guardian/remains/treasures, and smoke coverage. Future work: richer transition art, explicit transition placement/editing rules, floor naming in rumors, and later deeper procedural floor sets.
- Dungeon Structure V2 (see `docs/DUNGEON_STRUCTURE_V2.md`, `docs/DUNGEON_ANCHORS_V1.md`, and `docs/INITIAL_DUNGEON_LAYOUT_V1.md`):
  - V1.2 Dungeon Anchors V1 is implemented: safe zone, movable boss, movable main treasure, and gold treasures.
  - V1.3 rebouchage is implemented: a `Reboucher` build tool restores a dug floor/room tile to rock for 2 gold, refuses visible remains, occupied cells, transitions, anchors, and any edit that would break the global multi-map route.
  - V1.4 Initial Dungeon Layout V1.1 is implemented: corrected the over-carved V1 (10.9% dug, straight highway) into a ~48% dug / ~52% rock layout with 7 real rooms/corridors, an 11-turn 37-cell entry -> boss route, and a mandatory defense-room choke point.
  - V2.0 baseline generation is implemented for the active run: each new game creates varied room/topology variants for the three-floor chain while preserving the V1.1 room/corridor/choke-point constraints. Future work: expose seeds/debug labels and broaden the generator.
  - V2.1 base is implemented as Zones/Guardian V1, now recalculated per floor by Multi-map V1: automatic `DungeonZone` derivation, antechamber/treasure/boss reporting, one unique guardian elite defense, survivor-gated zone/guardian Kingdom facts, and no visual minimap. Future work: richer zone-specific behavior, better hover/debug presentation, and more sub-boss variants.
- Special Treasures V1 is implemented and corrected after manual playtest: role-aware targeting now makes weapon, armor, and technique treasures real objectives. Future work: tune weights after manual runs, then decide later whether any of them become named legendary objects, relationship hooks, or visible inventory, without expanding V1 into a full inventory now.
- Human Adventurer Behavior V0 is implemented: tank-first boss engagement lock, opportunistic loot on/near path, short room evaluation, group lead limits, backline hold, rogue flank/wait behavior, and visible special-item impact. Future work: tune delays/weights after manual runs; keep Cartographer V1 as a light utility layer, not a full squad AI, hospital, inventory, sub-boss, or Kingdom Remembers V2 expansion.
- Art/Assets/Animation/VFX/Audio/Tavern V2 is implemented as the current presentation baseline: primary dungeon tiles are darker generated runtime art, adventurer roles use distinct animated Warlock-derived sheets, defenses/guardian use stronger animated creature sheets, the boss is now a demon sheet rather than the old crab-like sprite, boss/guardian music exists, tavern audio unlock works from DOM interactions, and the tavern is an opaque living scene. Future work: human audio-mix pass, crowded-wave readability review, and licensed art expansion only when new gameplay types such as archer/mounted/flying actually exist.
- Future survivor continuity: connect survivor chronicle consequences into the next expedition only after the current profile/chronicle loop is playtested.
- Future survivor availability: explicit rest/refusal/hospital rules only after Survivor Continuity V1 has enough playtest data.
- Future veteran leadership: turn the current narrative veteran into a mechanical leader only if repeated returnees need gameplay weight.
- Guild Tavern Scene V2 is implemented (see `docs/GUILD_TAVERN_SCENE_V2.md`): future work is portrait art instead of role-initial avatars, per-actor movement/animation instead of static positions, relationship-aware dialogue between recurring characters, naming new volunteers before the expedition instead of generic NPC placeholders, richer empty-chair relic staging, and feeding survivor/witness lines into a future full Kingdom Remembers memory once that chantier starts.
- Add clearer placement previews for trap range and minion attack range.
- Add richer boss ability readability only if the V1 runtime VFX pass is still unclear after playtest.
- Add hotkey for pause (space).
- UI follow-ups from the menu/sidebar pass: wire boss abilities to manual `use-ability` clicks if manual casting returns, add small icons/symbols to tool and defense cards once art budget allows, and consider a proper options/credits route if the menu grows beyond a single overlay panel.
- Cartographer V1 follow-up: manual-read the role in motion, tune recruitment pressure/observation radius, and keep future work focused on better rumor/fact presentation before any visual map, fog of war, or Kingdom Remembers V2.
- Remains & Relics V1 is implemented: adventurer deaths only leave persistent non-blocking remains with simple personal relics, one small preparation-phase salvage loot claimable through `Fouiller restes`, rare safe reactions/recognition, survivor-gated Kingdom facts, and factual tavern/chronicle mentions. Monster corpses do not persist, and `Reboucher` refuses remains cells. Future work: manual-read visual density, tune loot values/reaction odds/shaken impact, and add better art.
- Zones/Guardian V1 follow-up: manual-read the guardian in real waves, tune its HP/damage/cost and preferred placement rules, add clearer zone debug/tooltip treatment if useful, and keep guardian facts survivor-gated. Do not expand this into procedural generation, a minimap, or multi-floor structure until the map-generation chantier starts.

## Gameplay

- Doors V1 (reinforced door) are in: placement rules, gold cost, locked/picking/open states, thief lockpicking, no-thief group retreat, reset between expeditions, voluntary build-phase removal with partial refund, and debrief mentions. Not yet built: one-way doors, portcullises, magic/secret doors, keys, or any advanced door variants.
- Add room ownership and named room behaviors on top of the Carve Your Kingdom V1 tile model.
- Add trap upgrades between waves.
- Add more boss abilities and an ability upgrade path funded by infamy.
- Add adventurer equipment traits after repeated deaths.
- Combat Roles & Abilities V0 is in: future work should tune cooldowns/readability only after more playtest data, not add new classes or ability trees yet.
- Combat Damage Feedback V0, Formation/Aggro Logic V0, and Human Adventurer Behavior V0 are in with attributed damage pops, boosted-damage markers, tank-first boss opening, opportunistic loot, and safer backline movement. Future work should tune readability/threat/behavior weights only after playtest data, not add new abilities or classes yet.
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

- Fixed Survivor Continuity composition arbitration: mandatory strategic roles (V1 thief for active locked doors or prior no-thief retreat) can temporarily bench one survivor while keeping party size at 5; see `src/systems/expeditionComposition.ts` and D-018.
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
- Guild Tavern Scene V1: the between-expeditions debrief now opens on a visual tavern/guild scene (seated survivors with role/level/veteran badges, an empty-table "no survivors" variant, a named "ne sont pas revenus" panel, short fact-based dialogue lines, rumor lines when nobody returns, and a compact facts row) instead of a plain text chronicle block; the previous full debrief detail is preserved underneath in a collapsible "Rapport complet" section, and Space/Enter/Escape now skip past the report screen. See `docs/GUILD_TAVERN_SCENE_V1.md`.
- Guild Tavern Scene V2: refonded V1 (which still read as a stylized report overlay) into a real positioned scene - a taverne room with a table, bar counter, and wall board; real survivors seated in their chair with an empty named chair per dead/missing adventurer; always-present generic NPCs (tavernier, archiviste, volontaires) at the counter/background; and a 3-6 beat dialogue sequence with a speech bubble anchored above the currently speaking character plus a caption log for earlier beats. Continuer/Passer and Space/Enter/Escape now drive the beat sequence before handing off to preparation. See `docs/GUILD_TAVERN_SCENE_V2.md`.
- Human Adventurer Behavior V0: adventurers now behave less like objective-rush robots through boss engagement lock (frontliner opens before rogue/DPS/backline), opportunistic pickup of safe adjacent/on-path treasures, visible special treasure pickup/effects, short room evaluation, cohesion limits, and cautious healer/caster staging.
- Multi-map / Etages V1: added three generated connected dungeon floors with per-map construction, transitions, global route validation, auto-following expedition view, per-map zones/guardian/remains/special treasures/Kingdom facts, and smoke coverage. Rebouchage is active as `Reboucher` with multi-map path validation and remains refusal.
