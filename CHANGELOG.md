# Changelog

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
