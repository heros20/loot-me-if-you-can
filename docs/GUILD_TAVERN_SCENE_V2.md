# Guild Tavern Scene V2

Date: 2026-07-06
Status: Implemented
Supersedes: [Guild Tavern Scene V1](./GUILD_TAVERN_SCENE_V1.md) (same day)
Related decision: [`docs/DECISIONS.md`](./DECISIONS.md) D-017

## Why V1 was not enough

Guild Tavern Scene V1 successfully replaced the old plain-text survivor
chronicle with something visual, but in practice it still rendered as a
**stylized report overlay**: a row of survivor "cards" side by side, a strip
of stat badges, and a stacked list of dialogue lines with no spatial
relationship to anyone. The studio's feedback was explicit: it did not look
or feel like a scene happening inside a place, it looked like a document with
nicer CSS.

V2 keeps the same trigger point (between expedition and preparation, same
overlay slot, same underlying `WaveReport` data) but rebuilds the *content*
of that overlay around a real, positioned room instead of a list of report
widgets.

## Goal

Turn the debrief into something the player can read as "I am looking into
the guild's common room right now": a table with real chairs, a counter with
tavern staff, a wall board for the guild's missing, background onlookers,
and a short spoken exchange where a bubble appears above whoever is actually
talking. No image generation, no new external assets, no procedural
generation, no change to combat/economy/doors/Survivor Continuity/expedition
size (still exactly 5).

## Technical choice: DOM scenic overlay, not a dedicated Phaser Scene

Two options were on the table (see D-017):

- **Option A - dedicated Phaser Scene**: rejected for this pass. The current
  report/build flow (`DungeonSimulation` phases + `UiSnapshot` +
  `GameDomUi`) is entirely DOM-driven; introducing a second Phaser `Scene`
  just for this screen would mean a second rendering pipeline, a second
  input/lifecycle model, and a real risk of breaking the existing
  build/report/defeat state machine for a screen that is fundamentally a
  short, static-camera dialogue beat. Kept as a possible V3 if the tavern
  ever needs real character movement or camera work.
- **Option B - DOM overlay built as a real visual scene (chosen)**: same
  full-screen `.debrief-overlay` used since V1, but its content is now a
  positioned room (`.tavern-room`) with actors placed in named zones (table,
  counter, background) instead of a stack of report widgets.

## Architecture

Three-way split, as requested, to keep `domUi.ts` from growing an entire
scene engine inline:

- **`src/systems/guildTavernSceneSystem.ts`** (data + dialogue, pure,
  unchanged responsibility from V1, new internal shape): `buildGuildTavernScene(report)`
  produces a `GuildTavernScene` containing:
  - `layout: TavernSceneLayout` - `tableSlots` (always exactly `PARTY_SIZE`
    entries), `counterActors`, `backgroundActors`.
  - `beats: TavernBeat[]` - the 3-6 step dialogue sequence.
  - The already-existing factual fields (`hasSurvivors`, `dead`, `returning`,
    `newVolunteersCount`, `veteran`, `summaryFacts`, `sceneMood`, `title`,
    `subtitle`).
- **`src/ui/guildTavernView.ts`** (new): pure render functions
  (`renderGuildTavernScene`) that turn a `GuildTavernScene` plus a small
  `TavernSceneState` (how many beats are currently revealed) into HTML. Also
  owns the state-machine helpers (`createInitialTavernSceneState`,
  `advanceTavernSceneState`, `revealAllTavernBeats`,
  `isTavernSceneFullyRevealed`). This module knows nothing about game rules,
  `DungeonSimulation`, or UI actions - only about turning data into markup.
- **`src/ui/textFormatters.ts`** (new): `escapeHtml`/`roleLabel`/`roleInitial`
  extracted out of `domUi.ts` so both `domUi.ts` and `guildTavernView.ts` can
  share them without a circular import.
- **`src/ui/domUi.ts`**: owns exactly one `TavernSceneState` instance (reset
  whenever a new `WaveReport` object appears, by reference, so the same
  in-progress reveal survives re-renders but resets on the next expedition),
  wires the `Continuer`/`Passer` buttons (`data-action="tavern-advance"` /
  `"tavern-skip"`) and the Space/Enter/Escape hotkeys to that state machine,
  and still renders the collapsible "Rapport complet" section underneath
  exactly as in V1.

Types added to `src/game/types.ts`: `TavernActorKind`, `TavernActorPose`,
`TavernActor`, `TavernTableSlot`, `TavernSceneLayout`, `TavernBeat`. Removed
from `GuildTavernScene`: `survivors`, `dialogueLines`, `rumorLines`, `badges`
(the report's factual chronicle badges are untouched at `report.chronicle.badges`,
just no longer duplicated into the scene struct - see "What was removed").

## The room

`renderGuildTavernScene` always draws, in this order:

1. **Back row**: the "Ne sont pas revenus" wall board (only if `dead.length >
   0`) plus the background silhouettes (`layout.backgroundActors`, generic
   volunteer NPCs, dimmed and slightly scaled down).
2. **Counter**: two fixed guild NPCs (`Le tavernier`, `Archiviste de la
   Guilde`) standing at a CSS bar shape. They exist in every scene,
   survivors or not, so the room never looks empty.
2. **Table**: an actual elliptical CSS surface (`.tavern-table__surface`)
   with exactly `PARTY_SIZE` (5) chairs around it (`layout.tableSlots`).

All of it is CSS shapes/gradients and existing role-tinted avatar circles -
no new image assets.

## Real survivors, real chairs

Each of the `PARTY_SIZE` table slots corresponds to one expedition
participant, in order:

- If the participant's status is `survivant`/`blesse`/`fuite`, the slot
  holds a `TavernActor` (`kind: 'survivor'`): name, role-colored avatar
  (initial), level, and a tag (`Blesse`, `Veteran`, `Revient`, or `Reste a la
  guilde`). Thieves get `pose: 'shadow'` (a slightly darker, dimmed chair
  style) as a small nod to "voleur dans l'ombre" without a separate spatial
  zone.
- If the participant's status is `mort`/`disparu`, the slot is an **empty,
  named chair** (`TavernTableSlot.deadName`) instead of a card or a bare
  counter. The same names are echoed on the wall board, so a death is felt
  in two places in the same room, not just counted.

This means the table is always literally the party: no invented survivor,
no invented death, and the 5-seat shape doubles as a constant visual
reminder of D-001 (fixed 5-adventurer expeditions).

## NPCs and new volunteers

New volunteers do not have real profiles yet at debrief time (they are only
generated the next time a wave launches), so - exactly like V1 - they are
never named. Unlike V1's dashed "Volontaire" placeholder cards, they are now
physically present in the room as background `TavernActor`s
(`kind: 'npc'`): `Volontaire inquiet` (used as a speaker slot, see below)
plus up to 3 additional plain `Volontaire` silhouettes, count derived from
`newVolunteerCount` (clamped 1-4 so the background is never fully empty).
`Le tavernier` and `Archiviste de la Guilde` are always-present fixtures at
the counter.

## Dynamic dialogue (beats)

`beats: TavernBeat[]` (3-6 entries) replaces V1's flat `dialogueLines`. Each
beat has an `actorId` that always points at a real `TavernActor` already
placed in `layout` (a table survivor or an NPC) - a beat is never spoken by
someone who isn't visible in the room.

- **`TavernSceneState`** (`{ revealedCount }`) tracks how many beats are
  currently shown. It starts at 1 (the first beat is visible immediately so
  the scene never opens on total silence) and lives in `GameDomUi`, reset
  whenever a new `WaveReport` reference appears.
- The **currently active beat** (the last revealed one) gets an anchored
  speech bubble (`.tavern-bubble`, with a CSS pointer/tail) positioned
  directly above that actor's box in the room - this is the actual "bulle
  au-dessus du personnage" requirement, not a floating card.
- All beats revealed so far are also listed in a small caption log
  ("Ce qui se dit") under the room, grouped by consecutive speaker, so
  players who skip past a bubble quickly can still catch up on what was
  said without the log looking like a report card.
- **Continuer** (`tavern-advance`): if beats remain, reveals the next one; if
  the sequence is finished, moves on (`continue-build` on the report phase;
  no-op on the defeat phase, which has no "next expedition"). Its label
  switches from "Continuer" to "Vers la preparation" once the sequence is
  done, so the player always knows what the button will do next.
- **Passer** (`tavern-skip`): on the report phase, skips straight to
  preparation regardless of how many beats were shown, matching V1's
  behavior; on the defeat phase, reveals every remaining beat locally
  instead (there is nothing to skip *to* after a defeat other than
  restarting, which stays a separate, deliberate button).
- **Hotkeys**: Space/Enter call the same logic as Continuer; Escape calls
  the same logic as Passer. Both now work during the defeat phase too (they
  did not in V1), purely for beat reveal - the terminal "Rebatir sur les
  cendres" action is never triggered by a keypress.

### Survivors example (matches the brief's example beats)

1. A survivor (preferably the thief, for the "portes/pieges" flavor)
   describes the run's main hazard.
2. Another survivor describes the outcome (treasure taken and who did not
   make it, treasure left alone, boss survived, or a costly retreat).
3. The `Volontaire inquiet` NPC reacts ("Vous repartez quand meme ?").
4. The returning veteran closes the beat ("Oui. Cette fois, je connais le
   chemin.") if one exists; otherwise another survivor gives a shorter
   closing line.

### No-survivors example (matches the brief's example beats)

1. `Archiviste de la Guilde`: "Ils etaient cinq."
2. `Le tavernier`: "Personne n'a franchi la porte depuis l'aube."
3. `Volontaire inquiet`: "Alors qui ira verifier ?"
4. `Une rumeur` (an ambient shadow-posed NPC, not tied to a specific
   silhouette): a rumor line, fact-driven when a notable trap/minion exists,
   generic otherwise.
5. A closing archivist/rumor line depending on whether the boss ever took
   damage.

No adventurer role ever speaks in the no-survivor case; `beats` are always
attributed to `guild`/`rumor` roles only, checked in smoke tests.

## What was removed from the old "report card" look

- Per-survivor stat cards laid out as a grid of tiles -> replaced by chairs
  around a table, one of which can be empty.
- The dominant six-badge row (`chronicle.badges` duplicated into the scene)
  -> removed from `GuildTavernScene` entirely; the scene now shows a smaller,
  curated `summaryFacts` strip only, and the full chronicle badges are still
  reachable through `report.chronicle` / the collapsible full report.
  underneath.
- The flat stacked dialogue block -> replaced by one anchored bubble per
  active beat plus a compact caption log, not a wall of static text.
- A separate "Rumeurs" panel (V1) -> folded into the beat sequence itself
  (an `Une rumeur` NPC speaks a beat like anyone else) instead of a bolted-on
  list.

## Integration with existing systems

- **Survivor Continuity V1**: `returning`/`veteran`/`newVolunteersCount` are
  still the exact values Survivor Continuity already computed; a dead
  participant can never become a `TavernActor` with `kind: 'survivor'`, so it
  can never appear seated or as `returning` by construction.
- **Rapport complet**: the full original debrief grid (participants list,
  tactical reading, economy or "ce que la guilde retient"/bilan) is
  untouched and still lives in the same collapsible `<details>` element.
- **Dungeon Anchors V1 / Initial Dungeon Layout V1.1 / Combat Roles &
  Abilities V0**: not touched by this pass; the scene only reads the
  already-computed `WaveReport`.

## Test Guards

`scripts/smoke.ts`:

1. `validateGuildTavernSceneRules()` (rewritten for V2): builds a synthetic
   survivor report (3 survivors incl. a returning veteran, 2 dead) and a
   synthetic all-dead report, and asserts: the table always has exactly
   `PARTY_SIZE` slots; occupied/empty slot counts match the participants;
   empty slots carry the correct dead names; `dead`/`returning`/`veteran`/
   `newVolunteersCount` match the source report; every beat's `actorId`
   points at an actor actually present in `layout`; no-survivor beats are
   always `guild`/`rumor` roled; beat counts stay within the 3-6 range.
2. In-loop checks on every real simulated wave: table slot count stays at
   `PARTY_SIZE`, occupied slot count matches non-dead participants,
   no-survivor waves never let an adventurer role speak, and beat counts
   stay within 1-6.
3. The existing cross-phase check that `returning` matches
   `nextExpeditionReturningNames` on the very next build snapshot is
   preserved unchanged.

Also re-verified manually with a scripted Playwright pass (dev server,
`npm run dev`): a wiped wave 1 (grim, empty-table, wall board, background
volunteers, archivist bubble) and a wave 2 with 3 survivors (seated
warrior/healer/veteran thief, two empty named chairs, an anchored bubble
above the speaking veteran) both rendered correctly with zero console
errors; Space advanced a beat, Escape skipped straight to the build phase.

## Limits (V2)

- Still no character movement or animation beyond the existing CSS fade-in
  and the bubble's small pop-in; actors are static positioned boxes, not
  sprites that walk around a Phaser scene.
- Avatars remain a single role-letter glyph on a tinted circle, not portrait
  art.
- New volunteers are still nameless/class-less placeholders (`Volontaire`,
  `Volontaire inquiet`) since their real profiles do not exist until the
  next wave launches - naming them before the expedition is future work.
- Beats are a small deterministic template pool driven by report facts, not
  a generative narrative system, and do not yet reference relationships
  between adventurers.
- No Remains & Relics: empty chairs and the wall board show names only, no
  persistent skeletons or recognized personal items.

## Future Work

- A dedicated Phaser Scene (Option A) if the tavern ever needs real
  character movement, a camera, or click-to-inspect actors.
- Portrait art instead of role-letter avatars.
- Naming new volunteers before the expedition launches, once that data
  exists earlier in the flow, so background NPCs can become real
  `TavernActor`s with names/classes instead of generic placeholders.
- Relationship-aware beats once `AdventurerRelation` data is used
  narratively elsewhere.
- Remains & Relics: personal items shown on the empty chair or the wall
  board once that system starts.
- Feed beats/witness lines from this scene into a future full Kingdom
  Remembers memory system.
