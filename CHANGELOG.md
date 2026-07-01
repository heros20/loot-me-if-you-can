# Changelog

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

## 0.4.0 - Organic Gameplay Pass

- Added party-level expedition plans: greedy, heroic, cautious, fanatic, and mercenary groups now make simple retreat or boss/treasure decisions.
- Added local monster AI: goblins patrol and chase, skeletons guard with shorter pursuit and heavier hits, and slimes hop locally while slowing nearby adventurers.
- Reworked the boss as a territorial defender that selects weak targets, attacks on cooldown, pursues only inside its room, and returns home.
- Made the Dungeon Treasure a decision point: some adventurers flee after taking it while others press toward the boss.
- Added light game-feel feedback for hits, boss impacts, and deaths.
