# Third-Party Assets

Last updated: 2026-07-08

This project uses only licensed, non-AI third-party assets for the current runtime presentation pass. Bundled third-party assets are CC0 or CC-BY 3.0 with attribution documented below. No official D&D/Wizards of the Coast art, ripped commercial game assets, unclear-license assets, or AI-generated media are included.

## Runtime Visual Assets

### Kenney - Tiny Dungeon

| Field | Value |
| --- | --- |
| Source | https://kenney.nl/assets/tiny-dungeon |
| Author | Kenney |
| License | Creative Commons Zero (CC0) |
| License checked | 2026-07-08, official Kenney page and bundled `License.txt` |
| Local path | `public/assets/vendor/kenney/tiny-dungeon/` |

Bundled runtime files:

- `License.txt`
- `Tiles/tile_0000.png` through `Tiles/tile_0131.png`

Runtime use: retained as a legacy/backup CC0 sprite vendor pack. The current V2 presentation uses stronger generated tiles, generated role sheets, and Warlock creature sheets as primary runtime art.

Project modifications: Phaser runtime scaling, tinting, alpha changes, glow overlays, and generated fallback textures. Source PNG files are not edited.

### ProfPatoNildo - Pixel art top down dungeon tileset and rpg character with animations

| Field | Value |
| --- | --- |
| Source | https://opengameart.org/content/pixel-art-top-down-dungeon-tileset-and-rpg-character-with-animations |
| Author | ProfPatoNildo |
| License | Creative Commons Zero (CC0) |
| License checked | 2026-07-08, OpenGameArt asset page |
| Local path | `public/assets/vendor/opengameart/profpatonildo/top-down-dungeon-character/` |

Bundled runtime/source files:

- `dungeon.png`
- `top_down_character_v4.png`

Runtime use: source/reference for the V2 dark dungeon/character pass and retained for future CC0 sprite derivations. The main current dungeon tiles in `public/assets/generated/dark-dungeon/` are project-authored deterministic pixel textures informed by this pass, not AI-generated.

### Warlock's Gauntlet team - Top-down animated sprites

| Field | Value |
| --- | --- |
| Sources | https://opengameart.org/content/top-down-woodsman-animations, https://opengameart.org/content/top-down-demon-animations, https://opengameart.org/content/top-down-legged-hornet-animated, https://opengameart.org/content/top-down-gargant-monster-animated, https://opengameart.org/content/top-down-skeleton-fightermage-animated |
| Author | Warlock's Gauntlet team |
| Attribution | Warlock's Gauntlet artists - rAum, jackFlower, DrZoliparia, Neil2D |
| License | Creative Commons Attribution 3.0 (CC-BY 3.0) |
| License checked | 2026-07-08, OpenGameArt asset pages |
| Local path | `public/assets/vendor/opengameart/warlocks-gauntlet/` |

Bundled runtime/source files:

- `bandit-move.png`
- `bandit-attack.png`
- `bandit-death.png`
- `timberman-move.png`
- `timberman-attack.png`
- `timberman-death.png`
- `demon.png`
- `skeleton-mage.png`
- `hornet-move.png`
- `hornet-attack.png`
- `hornet-death.png`
- `gargant-boss-move.png`
- `gargant-boss-attack.png`
- `gargant-lord-move.png`
- `gargant-lord-attack.png`
- `gargant-berserker-move.png`
- `gargant-berserker-attack.png`

Runtime use: primary V2 animated silhouettes. `demon.png` is the final boss, `gargant-lord-move.png` is the guardian/sub-boss, `skeleton-mage.png`, `timberman-move.png`, and `hornet-move.png` support current defense visuals, and `bandit-move.png`/`timberman-move.png` are source sheets for role-specific adventurer derivatives.

Project modifications: `public/assets/generated/roles/*.png` are derived from Warlock woodsman/bandit movement frames with project-authored recoloring and role overlays for warrior, thief, mage, healer, and cartographer readability. Runtime scaling, animation playback, hit flash, bobbing, and VFX are handled in Phaser.

### Project-authored generated runtime art

| Field | Value |
| --- | --- |
| Local path | `public/assets/generated/` |
| License | Project-owned; not third-party |
| Generation method | Deterministic local image processing and hand-authored pixel overlays; no AI generation |

Runtime files:

- `roles/warrior.png`
- `roles/thief.png`
- `roles/mage.png`
- `roles/healer.png`
- `roles/cartographer.png`
- `dark-dungeon/floor.png`
- `dark-dungeon/rock.png`
- `dark-dungeon/room.png`
- `dark-dungeon/guard-room.png`
- `dark-dungeon/crypt.png`
- `dark-dungeon/treasure-room.png`
- `dark-dungeon/throne-room.png`
- `dark-dungeon/entry.png`
- `dark-dungeon/door-closed.png`
- `dark-dungeon/door-open.png`
- `dark-dungeon/spike-trap.png`
- `dark-dungeon/fire-trap.png`
- `dark-dungeon/room-lock-trap.png`
- `dark-dungeon/stairs-down.png`
- `dark-dungeon/stairs-up.png`
- `dark-dungeon/treasure-gold.png`
- `dark-dungeon/treasure-weapon.png`
- `dark-dungeon/treasure-armor.png`
- `dark-dungeon/treasure-technique.png`
- `dark-dungeon/remains.png`
- `dark-dungeon/relic.png`

Runtime use: primary V2 dark dungeon tiles, doors, trap/object markers, transition markers, remains/relics, and role-distinct adventurer sheets.

## Runtime Audio Assets

### Kenney - RPG Audio

| Field | Value |
| --- | --- |
| Source | https://kenney.nl/assets/rpg-audio |
| Author | Kenney |
| License | Creative Commons Zero (CC0) |
| License checked | 2026-07-08, official Kenney page and bundled license |

Bundled runtime files:

- `combat/chop.ogg`
- `combat/drawKnife1.ogg`
- `combat/drawKnife2.ogg`
- `combat/knifeSlice.ogg`
- `combat/knifeSlice2.ogg`
- `doors/creak1.ogg`
- `doors/creak2.ogg`
- `doors/doorClose_1.ogg`
- `doors/doorClose_2.ogg`
- `doors/doorOpen_1.ogg`
- `doors/doorOpen_2.ogg`
- `doors/metalClick.ogg`
- `doors/metalLatch.ogg`
- `footsteps/footstep00.ogg` through `footsteps/footstep04.ogg`
- `interaction/bookClose.ogg`
- `interaction/bookFlip1.ogg`
- `interaction/bookFlip2.ogg`
- `interaction/bookOpen.ogg`
- `interaction/metal_01.ogg`
- `interaction/metal_02.ogg`
- `interaction/stones_01.ogg`
- `interaction/stones_02.ogg`
- `interaction/wood_01.ogg`
- `interaction/wood_02.ogg`
- `loot/handleCoins.ogg`
- `loot/handleCoins2.ogg`

Runtime use: door movement, lock picking, footsteps, coins, paper/book interactions, and physical construction/interaction accents.

### Kenney - Interface Sounds

| Field | Value |
| --- | --- |
| Source | https://kenney.nl/assets/interface-sounds |
| Author | Kenney |
| License | Creative Commons Zero (CC0) |
| License checked | 2026-07-08, official Kenney page and bundled license |

Bundled runtime files:

- `ui/click_001.ogg`
- `ui/click_002.ogg`
- `ui/close_001.ogg`
- `ui/confirmation_001.ogg`
- `ui/confirmation_002.ogg`
- `ui/error_001.ogg`
- `ui/error_002.ogg`
- `ui/open_001.ogg`
- `ui/select_001.ogg`
- `ui/select_002.ogg`
- `ui/tick_001.ogg`
- `ui/toggle_001.ogg`

Runtime use: sidebar controls, buttons, phase changes, toggles, and confirmation/error feedback.

### Kenney - Impact Sounds

| Field | Value |
| --- | --- |
| Source | https://kenney.nl/assets/impact-sounds |
| Author | Kenney |
| License | Creative Commons Zero (CC0) |
| License checked | 2026-07-08, official Kenney page and bundled license |

Bundled runtime files:

- `combat/impactGeneric_light_000.ogg`
- `combat/impactGeneric_light_001.ogg`
- `combat/impactMetal_heavy_000.ogg`
- `combat/impactMetal_heavy_001.ogg`
- `combat/impactMetal_medium_000.ogg`
- `combat/impactMetal_medium_001.ogg`
- `combat/impactPunch_heavy_000.ogg`
- `combat/impactPunch_heavy_001.ogg`
- `combat/impactPunch_medium_000.ogg`
- `combat/impactPunch_medium_001.ogg`
- `combat/impactWood_heavy_000.ogg`
- `combat/impactWood_medium_000.ogg`
- `construction/impactMining_000.ogg`
- `construction/impactMining_001.ogg`
- `construction/impactMining_002.ogg`
- `footsteps/footstep_concrete_000.ogg` through `footsteps/footstep_concrete_004.ogg`

Runtime use: melee impacts, shield/metal impacts, construction hits, trap impacts, and heavier footstep variants.

### rubberduck - 80 CC0 RPG SFX

| Field | Value |
| --- | --- |
| Source | https://opengameart.org/content/80-cc0-rpg-sfx |
| Author | rubberduck |
| License | Creative Commons Zero (CC0) |
| License checked | 2026-07-08, OpenGameArt asset page |

Bundled runtime files:

- `boss/creature_monster_01.ogg`
- `boss/creature_monster_02.ogg`
- `boss/creature_roar_01.ogg`
- `boss/creature_roar_02.ogg`
- `boss/creature_roar_03.ogg`
- `combat/blade_01.ogg`
- `combat/blade_02.ogg`
- `combat/blade_03.ogg`
- `combat/creature_die_01.ogg`
- `combat/creature_hurt_01.ogg`
- `combat/creature_hurt_02.ogg`
- `combat/creature_slime_01.ogg`
- `combat/creature_slime_02.ogg`
- `combat/creature_slime_03.ogg`
- `loot/item_coins_01.ogg`
- `loot/item_coins_02.ogg`
- `loot/item_coins_03.ogg`
- `loot/item_gem_01.ogg`
- `loot/item_gem_02.ogg`
- `loot/item_misc_01.ogg`
- `magic/spell_01.ogg`
- `magic/spell_02.ogg`
- `magic/spell_fire_01.ogg`
- `magic/spell_fire_02.ogg`
- `magic/spell_fire_03.ogg`
- `traps/chain_01.ogg`
- `traps/chain_02.ogg`
- `traps/chain_03.ogg`
- `traps/lock_01.ogg`
- `traps/lock_02.ogg`
- `traps/lock_03.ogg`

Runtime use: boss roars, creature hits/deaths, blades, spells, loot pickups, chains, locks, and trap state feedback.

### JaggedStone - Loopable Dungeon Ambience

| Field | Value |
| --- | --- |
| Source | https://opengameart.org/content/loopable-dungeon-ambience |
| Author | JaggedStone |
| License | Creative Commons Zero (CC0) |
| License checked | 2026-07-08, OpenGameArt asset page |
| Local file | `public/assets/audio/ambience/dungeon_ambient_1.ogg` |

Runtime use: main dungeon ambience loop during build and expedition phases.

### Paul Wortmann - Dark Cavern Ambient

| Field | Value |
| --- | --- |
| Source | https://opengameart.org/content/dark-cavern-ambient |
| Author | Paul Wortmann |
| License | Creative Commons Zero (CC0) |
| License checked | 2026-07-08, OpenGameArt asset page |
| Local file | `public/assets/audio/ambience/dark_cavern_ambient_002.ogg` |

Runtime use: deeper/final-floor dungeon ambience loop.

### RandomMind - Medieval: The Old Tower Inn

| Field | Value |
| --- | --- |
| Source | https://opengameart.org/content/medieval-the-old-tower-inn |
| Author | RandomMind |
| License | Creative Commons Zero (CC0) |
| License checked | 2026-07-08, OpenGameArt asset page |
| Local file | `public/assets/audio/tavern/The_Old_Tower_Inn.mp3` |

Runtime use: low-volume guild tavern/report ambience.

### SubspaceAudio - Boss Battle Music

| Field | Value |
| --- | --- |
| Source | https://opengameart.org/content/boss-battle-music |
| Author | SubspaceAudio / Juhani Junkala |
| License | Creative Commons Zero (CC0) |
| License checked | 2026-07-08, OpenGameArt asset page |
| Local file | `public/assets/audio/music/epic_boss_battle_loop.wav` |

Runtime use: boss combat music selected by `DungeonScene.syncAmbience()` while the boss is engaged or approached.

### cynicmusic - Battle Theme A

| Field | Value |
| --- | --- |
| Source | https://opengameart.org/content/battle-theme-a |
| Author | cynicmusic |
| License | Creative Commons Zero (CC0) |
| License checked | 2026-07-08, OpenGameArt asset page |
| Local file | `public/assets/audio/music/guardian_battle_theme.mp3` |

Runtime use: guardian/sub-boss combat music selected by `DungeonScene.syncAmbience()` when the guardian is engaged or approached.

## Runtime Processing

Audio is loaded through `AUDIO_ASSETS` in `src/assets/manifest.ts` and played through `src/systems/audioSystem.ts`. Runtime changes are limited to volume, mute state, random selection, cooldowns, small rate variation, fade-in/fade-out, loop control, and scene-based ambience/music selection.

Visual VFX such as glows, shockwaves, slashes, projectile lines, trap bursts, loot glints, fog overlays, and door/lock pips are drawn at runtime with Phaser graphics in `src/scenes/DungeonScene.ts`. Character and creature animations are registered in `src/assets/animationManifest.ts`; media paths are verified by `npm run verify-media`.
