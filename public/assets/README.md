# Runtime Assets

This V1 uses Kenney Tiny Dungeon CC0 sprites and selected CC0 audio packs through `src/assets/manifest.ts`.
Generated placeholder textures from `src/assets/placeholderTextures.ts` are still kept as runtime fallbacks.

Current runtime folders:

- `vendor/kenney/tiny-dungeon/` - CC0 Tiny Dungeon PNG tiles plus bundled license.
- `vendor/opengameart/profpatonildo/` - CC0 source/reference dungeon and character sheets.
- `vendor/opengameart/warlocks-gauntlet/` - CC-BY 3.0 animated top-down character/monster sheets.
- `generated/roles/` - project-generated role-specific adventurer sheets.
- `generated/dark-dungeon/` - project-generated dark dungeon tiles, doors, traps, objectives, remains, and transitions.
- `audio/ambience/` - dungeon ambience loops.
- `audio/music/` - boss and guardian combat music loops.
- `audio/tavern/` - tavern/report music bed.
- `audio/boss/` - boss and monster vocal accents.
- `audio/combat/` - melee, magic, impact, and creature feedback.
- `audio/construction/` - digging/build accents.
- `audio/doors/` - door, lock, latch, and picking feedback.
- `audio/footsteps/` - expedition footstep variations.
- `audio/interaction/` - paper, stone, metal, and wood accents.
- `audio/loot/` - coins, gems, and pickup sounds.
- `audio/magic/` - spell and ability accents.
- `audio/traps/` - chain and lock trap accents.
- `audio/ui/` - button and control feedback.

When replacing or adding assets, update `src/assets/manifest.ts` and keep `docs/THIRD_PARTY_ASSETS.md`, `CREDITS.md`, and `ASSET_LICENSES.md` current.
