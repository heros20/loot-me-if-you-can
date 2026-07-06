# Survivor Continuity V1

Date: 2026-07-06
Status: Implemented

## Rule

An adventurer who survives an expedition returns automatically in the next expedition unless they are dead, retired, or explicitly unavailable in a future system.

The party size remains exactly `PARTY_SIZE = 5`.

Selection order:

1. Keep the party at exactly `PARTY_SIZE = 5`.
2. Impose learned mandatory strategic roles when survivors do not cover them (V1: at least one thief if an active locked door exists, or if the previous expedition retreated without a thief while survivors are available).
3. Take as many available returning survivors as slots remain.
4. Bench excess survivors temporarily (profile preserved, not dead) when a mandatory role needs a slot.
5. Fill remaining slots with the existing adaptive composition system.
6. Keep door, trap, boss, and role-pressure adaptation active for those remaining slots.

Survivors return first in spirit, but not absolutely: the guild may hold one back at the report when a learned indispensable role must be recruited.

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

- The build sidebar previews returning adventurers, held-back survivors, imposed roles, new volunteer count, and the likely veteran.
- The survivor chronicle says who will return, who stays at the report for a mandatory role, who guides the next group, and how many new volunteers are needed.
- If nobody survives, the chronicle does not invent a witness and says the Guild needs five new volunteers.
- Since Guild Tavern Scene V2 (see `docs/GUILD_TAVERN_SCENE_V2.md`), this same continuity data (returning names, veteran, new volunteer count) also drives the visual tavern scene shown between expeditions: returning survivors are seated at the table with a "Veteran"/"Revient" tag, dead/missing adventurers leave an empty named chair, and the scene never shows a dead adventurer as returning.

## Not In Scope

- Hospital/rest system.
- Manual recruitment or roster screen.
- A fully interactive tavern scene (clickable characters, branching dialogue, animated movement) — Guild Tavern Scene V2 is a positioned, skippable, data-driven scene with a short revealed dialogue sequence, not an interactive location.
- Cartography, Cartographer, or complete Kingdom memory.
- Lootable weapons, armor, or techniques.
- New classes, monsters, traps, sub-bosses, or multiple levels.

## Future Hooks

- A heavily wounded survivor may later miss an expedition through an explicit availability system.
- A veteran may later become a mechanical party leader.
- Returning survivors can later carry imperfect map knowledge into The Kingdom Remembers.
