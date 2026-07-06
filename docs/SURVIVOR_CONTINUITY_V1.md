# Survivor Continuity V1

Date: 2026-07-06
Status: Implemented

## Rule

An adventurer who survives an expedition returns automatically in the next expedition unless they are dead, retired, or explicitly unavailable in a future system.

The party size remains exactly `PARTY_SIZE = 5`.

Selection order:

1. Take available returning survivors first.
2. Cap returning survivors at 5 if the pool is ever too large.
3. Fill remaining slots with the existing adaptive composition system.
4. Keep door, trap, boss, and role-pressure adaptation active for those remaining slots.

## Profile Memory

Survivors keep their profile identity:

- name, class, level, traits, personality;
- expedition and survival counts;
- injuries and trauma;
- monster kills and trap triggers;
- door encounters and picked doors;
- boss encounters;
- main treasure theft count;
- gold loot memory: `lastLootedGold`, `totalLootedGold`, `notableLootEscapeCount`.

In V1, injuries persist as performance modifiers but do not randomly remove a survivor from the next expedition.

## Narrative/UI

- The build sidebar previews returning adventurers, new volunteer count, and the likely veteran.
- The survivor chronicle says who will return, who guides the next group, and how many new volunteers are needed.
- If nobody survives, the chronicle does not invent a witness and says the Guild needs five new volunteers.

## Not In Scope

- Hospital/rest system.
- Manual recruitment or roster screen.
- Interactive tavern scene.
- Cartography, Cartographer, or complete Kingdom memory.
- Lootable weapons, armor, or techniques.
- New classes, monsters, traps, sub-bosses, or multiple levels.

## Future Hooks

- A heavily wounded survivor may later miss an expedition through an explicit availability system.
- A veteran may later become a mechanical party leader.
- Returning survivors can later carry imperfect map knowledge into The Kingdom Remembers.
