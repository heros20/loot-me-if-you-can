# Changelog

## Unreleased - Direction studio gameplay

- Fixed expedition size at exactly 5 adventurers via the new `PARTY_SIZE` constant; difficulty now shifts through class composition, levels, memory, and tactics instead of larger waves.
- Reworked class composition into a fixed-size adaptive roster: traps push the guild toward thieves, long fights toward healers, lethal minions toward warriors, boss pressure toward tanks/healers, and treasure theft toward more aggressive boss-capable teams.
- Replaced wall placement with the first Carve Your Kingdom vertical slice: the 23x16 dungeon now starts mostly as rock, with an initial carved route, treasure room, throne room, and branch rooms.
- Added explicit tile semantics (`rock`, `floor`, `room`, `entrance`, `treasure`, `throne`) and tile helpers for walkability, territory counts, room marking, and blocked pathfinding cells.
- Added the Creuser tool: adjacent rock can be dug into floor for `DIG_COST` (10 gold), with no-gold and invalid-dig feedback.
- Added a Salles UI category with visual guard-room and crypt marking on carved territory, plus a disabled door placeholder for later.
- Updated defense validation so traps, minions, and summoned skeletons require valid carved floor/room cells and cannot be placed on rock, entrance, treasure, or throne tiles.
- Stabilized special-room constructibility: the exact entrance, treasure, and boss/throne tiles stay protected, while carved tiles around the treasure and boss can now hold defenses.
- Added distinct placeholder textures for treasure rooms and throne rooms so strategic rooms are readable at a glance.
- Prevented boss and minion movement from cutting through rock by routing blocked short moves through the existing grid pathfinder.
- Extracted player construction helpers into `src/systems/dungeonConstruction.ts` for digging cost, placement validation, room marking, and build rejection messages.
- Updated dungeon route validation and adventurer pathfinding so rock blocks movement while floor, room, entrance, treasure, and throne tiles are traversable.
- Reorganized build UI into Construction, Salles, Traps, Monsters, Boss, and Expedition sections, including territory counts and dig cost.
- Replaced the small sidebar report with a full debrief overlay covering summary, all 5 participants, learned dangers, shared rumors, gains/losses, guild adaptation, and dungeon economy.
- Added independent `smoke-treasure` and `smoke-longrun` npm scripts while keeping `npm run smoke` as the aggregate.
- Added smoke assertions for fixed 5-adventurer reports, paid digging, no-gold digging refusal, protected exact tiles, special-room defense placement, and rock placement refusal.
- Added Portes V1: a Porte renforcee construction (20 gold, 60 HP) placeable on any dug floor/room cell, including around the treasure and throne rooms, but never on rock, the exact entrance/treasure/throne cells, or a cell already holding a trap, minion, or another door.
- Doors stay traversable for pathfinding but block movement at runtime: adventurers stop and attack a closed door until it breaks, then the expedition continues; thieves deal double damage to doors (`THIEF_DOOR_DAMAGE_MULTIPLIER`).
- Doors render as a distinct placeholder with their own HP bar, hit feedback, and a broken-door marker on destruction; undamaged doors persist between expeditions and damaged (non-destroyed) doors are fully repaired at the next build phase, while destroyed doors must be rebuilt.
- Debriefs now mention a door's impact (delay, thief efficiency, destruction before the treasure) when it mattered during the expedition.
- Added door smoke assertions: placement refusals on rock/entrance/treasure/throne, acceptance on floor and around the treasure room, gold cost and disabled-button feedback, occupied-cell refusal, thief damage multiplier, and end-to-end door damage/destruction across a full multi-wave run.

## 0.5.0 - Le boss devient un vrai boss

- Added active boss abilities usable by the player during waves: `Onde de choc` (area damage + stun), `Rugissement` (fear that sends nearby heroes running to the exit), and `Renforts osseux` (summons temporary skeletons near the boss for the current wave).
- Made the Dungeon Treasure a physical object: the first adventurer to reach it carries it (slowed), drops it on death (another hero can pick it up), and steals it for good by escaping with it. Stolen treasures cost gold, reputation, and pride at the report.
- Added vengeful heirs: fallen adventurers can inspire a relative who returns in later waves with inherited family name, nemesis, half the ancestor's reputation, and a stat bonus fueled by grief.
- Named every minion (Clavicule the skeleton, Grattouille the goblin...): minions track kills and waves survived, appear in reports and chronicles, and veterans get commemorated when they fall.
- Added tavern rumors generated after each wave that mechanically influence the next one (extra thieves/warriors/healers, greedy or cautious party plans) and are visible in the build panel.
- Added an adventurer inspection panel: click an intruder during a wave to see level, age, personality, traits, injuries, expedition history, heir vendetta, and whether they carry your treasure.
- Added pause and x1/x2/x3 speed controls during waves.
- Best survived wave is now saved in local storage and displayed in the build panel and defeat screen.
- Fixed boss kiting: mages could shoot the boss from outside its detection range while it stood still. Detection and leash ranges now cover ranged attackers.
- Buffed the boss (340 HP, 16 damage) to compensate for the new player toolkit.
- Added headless simulation smoke tests (`npm run smoke`) covering waves, treasure theft, abilities, heirs, and rumors.

## 0.2.0 - Emergent Simulation Foundations

- Added persistent in-run `AdventurerProfile` data with unique names, traits, guild/realm links, relations, legacy hooks, expedition history, survivor memory, death memory, and dungeon reputation.
- Added a profile generation and reuse system that can bring selected surviving adventurers back in later waves.
- Added cautious or traumatized adventurer retreats as a small foundation for survivors without introducing a world simulation yet.
- Added wave reports that cite notable adventurers, recent deaths, memorized survivors, and reputation changes.
- Added visible adventurer names in the active wave UI and short names on the battlefield.
- Kept the core V0 loop stable: build defenses, launch waves, resolve combat, report, continue, lose if the boss dies.

## 0.2.1 - Technical Audit Cleanup

- Delayed persistent adventurer profile activation until the character actually spawns, preventing queued-but-unspawned profiles from getting stuck `onExpedition`.
- Centralized expedition completion for deaths, escapes, and boss-defeat survivors.
- Copied profile traits into runtime adventurer entities to avoid accidental mutation of persistent profile data.

## 0.3.0 - Memorable Adventurers Foundations

- Expanded persistent adventurer profiles with unique first names, age, level, dominant personality, first appearance day, expedition counts, victories, defeats, monster kills, trap triggers, injuries, trauma, and life status.
- Added simple injury and recovery foundations so survivors can return later with persistent penalties and memories.
- Added personality hooks: cautious adventurers avoid learned trap danger more strongly, greedy adventurers take more risks, and vengeful adventurers prioritize their remembered monster nemesis.
- Added chronicle entries for important run events and reputation tier changes.
- Replaced the detailed wave report UI with a short narrative report capped to memorable story lines.
- Reworked reputation titles into progression tiers from `Donjon oublie` to `Fleau du Royaume`.

## 0.4.1 - Stabilisation Vague 2 + Economie des pieges

- Fixed a critical wave 2+ bug where adventurers could vanish before appearing: party retreat (`livingCount <= 1`) fired while the spawn queue was still deploying, and retreating units treated the entry tile as an instant escape.
- Party AI now waits until all adventurers are spawned before evaluating retreat.
- Adventurers must enter the dungeon before an exit counts as a real escape; undeployed units are released cleanly instead of inflating escape stats.
- Traps are now temporary defenses: all remaining traps are dismantled at the end of each cleared wave, refunded in gold, and removed from the dungeon.
- Minions still persist while alive.
- Wave reports now show wave reward, trap refund, and total preparation budget for the next build phase.

## 0.4.0 - Organic Gameplay Pass

- Added party-level expedition plans: greedy, heroic, cautious, fanatic, and mercenary groups now make simple retreat or boss/treasure decisions.
- Added local monster AI: goblins patrol and chase, skeletons guard with shorter pursuit and heavier hits, and slimes hop locally while slowing nearby adventurers.
- Reworked the boss as a territorial defender that selects weak targets, attacks on cooldown, pursues only inside its room, and returns home.
- Made the Dungeon Treasure a decision point: some adventurers flee after taking it while others press toward the boss.
- Added light game-feel feedback for hits, boss impacts, and deaths.
