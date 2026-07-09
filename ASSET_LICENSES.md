# Asset Licenses

The canonical runtime asset inventory is maintained in `docs/THIRD_PARTY_ASSETS.md`.
This file is kept as the short top-level credit/license summary.

## Visual Assets

### Kenney Tiny Dungeon

| Field | Value |
| --- | --- |
| Pack | Tiny Dungeon 1.0 |
| Author | Kenney |
| Source | https://kenney.nl/assets/tiny-dungeon |
| License | Creative Commons Zero, CC0 |
| Integrated | 2026-07-06, expanded 2026-07-08 |
| License verified | 2026-07-08 against the official Kenney asset page and bundled `License.txt` |
| Local folder | `public/assets/vendor/kenney/tiny-dungeon/` |

Bundled files:

- `License.txt`
- `Tiles/tile_0000.png` through `Tiles/tile_0131.png`

The included `License.txt` states Creative Commons Zero (CC0) and allows use in personal, educational, and commercial projects. Crediting Kenney is appreciated but not mandatory.

### OpenGameArt visual assets

Additional V2 visual assets are documented per-file in `docs/THIRD_PARTY_ASSETS.md`:

- ProfPatoNildo, Pixel art top down dungeon tileset and rpg character with animations - CC0.
- Warlock's Gauntlet team, top-down animated woodsman/demon/hornet/gargant/skeleton assets - CC-BY 3.0, attribution required: Warlock's Gauntlet artists - rAum, jackFlower, DrZoliparia, Neil2D.
- Project-authored generated runtime role/tile sheets in `public/assets/generated/`, derived from licensed/source pixels plus local deterministic overlays; no AI generation.

## Audio Assets

Runtime audio files are bundled under `public/assets/audio/` from these CC0 sources:

- Kenney RPG Audio: https://kenney.nl/assets/rpg-audio
- Kenney Interface Sounds: https://kenney.nl/assets/interface-sounds
- Kenney Impact Sounds: https://kenney.nl/assets/impact-sounds
- rubberduck, 80 CC0 RPG SFX: https://opengameart.org/content/80-cc0-rpg-sfx
- JaggedStone, Loopable Dungeon Ambience: https://opengameart.org/content/loopable-dungeon-ambience
- Paul Wortmann, Dark Cavern Ambient: https://opengameart.org/content/dark-cavern-ambient
- RandomMind, Medieval: The Old Tower Inn: https://opengameart.org/content/medieval-the-old-tower-inn
- SubspaceAudio / Juhani Junkala, Boss Battle Music: https://opengameart.org/content/boss-battle-music
- cynicmusic, Battle Theme A: https://opengameart.org/content/battle-theme-a

Per-file attribution and runtime usage are documented in `docs/THIRD_PARTY_ASSETS.md`.

## Internal Fallbacks

Generated fallback textures remain in `src/assets/placeholderTextures.ts`. They are project-owned runtime placeholders used only when an external texture key is missing or fails to load.
