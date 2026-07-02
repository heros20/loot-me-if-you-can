# TODO

## Near Term

- Replace generated placeholders with verified CC0 Kenney assets.
- Add sound effects and a mute toggle.
- Add clearer placement previews for trap range and minion attack range.
- Add visual effects for boss abilities (shockwave ring, roar cone, summon puff).
- Add hotkeys for boss abilities (1/2/3) and pause (space).

## Gameplay

- Add rooms and doors instead of a fixed wall layout.
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

## Done in 0.5.0

- Boss abilities with cooldowns (shockwave, roar, summon).
- Treasure as a physical, stealable object with gold/reputation loss.
- Adventurer inspection panel.
- Named minions with kill counters and veteran chronicles.
- Families and heirs inheriting grudges, names, and nemesis memories.
- Tavern rumors influencing future waves.
- Pause and speed controls.
- Best wave saved in local storage.
