# Guild Tavern Scene V1

Date: 2026-07-06
Status: Superseded by [Guild Tavern Scene V2](./GUILD_TAVERN_SCENE_V2.md) (same day). Kept for history: V1
shipped the "scene instead of text" idea but still rendered as a stylized
report overlay (survivor cards, a badge row, stacked dialogue lines). V2
replaces the internal `GuildTavernScene` shape (`survivors`/`dialogueLines`/
`rumorLines`/`badges` -> `layout`/`beats`) with a real positioned space and a
revealed-beat dialogue sequence. Everything below describes the original V1
implementation and no longer matches the current code.

## Goal

Between expeditions, the game used to show a purely textual survivor chronicle:
a title, a subtitle, a handful of narrative lines, and six small badges. It was
functional but read like a report overlay, not a place. Guild Tavern Scene V1
turns that same data into a visual, skippable scene: survivors seated at a
table, empty chairs for the dead, generic guild voices when nobody returns,
short fact-based dialogue, and a compact facts row, all layered above the
existing full debrief (which is preserved, just collapsed by default).

This is presentation and narrative-generation work only: no new gameplay
mechanic, no change to combat, economy, expedition size (still exactly 5), or
Survivor Continuity V1's selection rules. It reuses the same `WaveReport` data
that already powered the old chronicle.

## Architecture

- `src/systems/guildTavernSceneSystem.ts` (new): a pure function,
  `buildGuildTavernScene(report)`, turns a `WaveReport` (minus its own field)
  into a `GuildTavernScene` value: title/subtitle/mood, the list of seated
  survivors, the list of names who did not come back, the returning names and
  veteran already computed by Survivor Continuity, generated dialogue lines,
  rumor lines (no-survivor case only), the existing chronicle badges, and a
  small set of summary facts. It does not touch `RunWorldMemory` or any other
  system; it is a read-only transform of report data, exactly like
  `survivorChronicleSystem.ts`.
- `src/systems/survivorChronicleSystem.ts` is unchanged in behavior and still
  runs first; the tavern scene reuses its `badges` output as its own "badges"
  field instead of recomputing the same six facts twice.
- `src/game/types.ts`: added `GuildSceneMood`, `GuildTavernCharacter`,
  `GuildTavernDialogueLine`, `GuildTavernSummaryFact`, `GuildTavernScene`, and
  a new `guildTavernScene: GuildTavernScene` field on `WaveReport`.
- `src/game/DungeonSimulation.ts`: `createReport()` builds the chronicle first
  (as before), then calls `buildGuildTavernScene()` on the report-with-chronicle
  so the scene can reuse chronicle badges. No other simulation logic changed.
- `src/ui/domUi.ts`: `renderReport()`/`renderDefeat()` now render
  `renderGuildTavernScene()` instead of the old `renderChronicle()`. The rest
  of the previous debrief (full participant list, tactical reading, "suite
  probable"/economy panels) is kept, wrapped in a `<details class="debrief-
  details">Rapport complet</details>` so the scene is the first thing seen but
  nothing is lost. Space/Enter/Escape now trigger the same `continue-build`
  action as the Continuer/Passer buttons while the report screen is open.
- `src/styles.css`: new `.tavern-scene*`, `.tavern-seat*`, `.tavern-bubble*`,
  `.tavern-fact*`, and `.debrief-details` rules (dark-fantasy palette
  consistent with the rest of the debrief overlay). The old, now-unused
  `.chronicle-card*`/`.chronicle-badge*`/`.chronicle-lines*` rules were
  removed since nothing renders them anymore.

## Survivors case

- Every participant whose status is `survivant`, `blesse`, or `fuite` becomes
  a seat at the table: name, role-colored avatar (initial), level, and a tag
  (`Veteran`, `Revient`, `Blesse`, or `Reste a la guilde`).
- Up to 3 survivors speak, in order: a line about the expedition's core
  outcome (treasure stolen and who did not make it back, treasure left alone,
  boss down, or a costly retreat), a line about the most notable hazard (door
  choke point, picked lock, trap, notable minion, or boss autopilot power),
  and — if a veteran who is confirmed to return is among the speakers — a
  closing veteran line ("Je repars. Cette fois, je connais le chemin.").
  Consecutive lines from the same speaker are grouped into one speech bubble.
- Empty slots up to 5 are shown as dashed "Volontaire" placeholders when new
  recruits are still needed to complete the next party; the actual new
  recruits do not exist yet at this point (they are only generated the next
  time a wave launches), so no invented names are shown for them.
- Dead or missing participants are named in a "Ne sont pas revenus" panel
  (singular "Absent" for one name), never reduced to a bare kill counter.

## No-survivors case

- No adventurer is invented as a witness. The seat row shows 5 dashed
  "Chaise vide" placeholders instead of any character.
- Dialogue comes from generic guild voices only (`La Guilde`, `Un archiviste
  de la Guilde`, `Le tableau des contrats`, `Une rumeur`), built from the same
  report facts (traps, minions, boss damage taken). No line role is ever an
  adventurer class in this case; smoke tests check this explicitly.
- A separate "Rumeurs" panel adds a couple of unattributed rumor lines
  ("On dit que le donjon a garde leurs voix.", ...), reinforcing the dungeon's
  legend without any new mechanic behind it.
- New volunteers count is always the full party size in this case.

## Facts row

Six compact facts stay visible under the scene at all times: Survivants,
Morts, Tresor (Vole/Protege), Boss (Toujours debout/Vaincu), Or perdu (the
treasure-theft penalty gold, if any), and Prochaine expedition (revenants +
new volunteers, or new volunteers alone). All are derived from existing
`WaveReport` fields; no new stat tracking was added to preserve the existing
economy/combat systems untouched.

## Integration with Survivor Continuity V1

`returning`, `veteran`, and `newVolunteersCount` in the scene are the exact
same values Survivor Continuity V1 already computed for the chronicle and the
sidebar preview (`buildContinuityPreview` / `getReturningSurvivorCandidates`).
A dead or missing participant can never appear in `returning` by construction
(the scene only marks participants with a "still alive" status as
`isReturning`), and a smoke check confirms the announced returning names match
`nextExpeditionReturningNames` in the very next build-phase snapshot.

## Test Guards

`scripts/smoke.ts` adds:

1. A standalone `validateGuildTavernSceneRules()` unit check that builds two
   synthetic reports (3 survivors including a returning veteran and 2 dead;
   an all-dead wipe) and asserts: survivor/dead counts match participants,
   a dead name never appears in `returning`, `newVolunteersCount` and
   `veteran` match the source report, survivors-case dialogue only comes from
   seated survivors, and no-survivors-case dialogue never uses an adventurer
   role.
2. In-loop checks on every real wave: `hasSurvivors` matches
   `adventurersEscaped > 0`, no dead name leaks into `returning`, the seated
   survivor count matches non-dead participants, and — when there are no
   survivors — no dialogue line is attributed to an adventurer role.
3. A cross-phase check that the returning names shown in the report equal the
   `nextExpeditionReturningNames` of the very next build-phase snapshot after
   `continueBuild()`.

## Limits (V1)

- Not a real animated cutscene: a short CSS fade-in only, no character
  movement, no lip sync.
- New volunteers are shown as placeholder silhouettes (no name, no class)
  since their profiles do not exist until the next wave is launched.
- Avatars are a single role-letter glyph on a tinted circle, not portrait art;
  no new assets were added or requested for this pass.
- Dialogue is a small deterministic template pool driven by report facts, not
  a full generative narrative system; it does not yet reference relationships
  between adventurers.
- Rumor lines shown in the no-survivor case are scene flavor only; they are
  not the same object as `TavernRumor` (the existing gameplay rumor system
  that biases future wave composition), which keeps running unchanged.

## Future Work

- Replace role-letter avatars with small portrait sprites once art budget
  allows.
- Feed survivor/witness lines from this scene into a future full Kingdom
  Remembers memory system.
- Consider relationship-aware dialogue once `AdventurerRelation` data is used
  narratively elsewhere.
- Consider a slightly richer entrance animation (staggered seat fade-in)
  if playtests show the current instant layout feels flat.
