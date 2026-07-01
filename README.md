# Final Boss Dungeon

Web game V0 in TypeScript, Vite, and Phaser 3.

You play the final boss. Adventurers enter the dungeon, steal the treasure, learn from their deaths, and eventually come back better prepared. Your job is not to win forever. Your job is to make losing expensive.

## Install

```bash
npm install
```

## Run Locally

```bash
npm run dev
```

Vite prints the local URL, usually `http://127.0.0.1:5173/`.

## Build

```bash
npm run build
```

The static production build is generated in `dist/`.

## Deploy On Vercel

1. Import the repository in Vercel.
2. Use the default Vite settings:
   - Build command: `npm run build`
   - Output directory: `dist`
3. Deploy.

No server runtime is required for this V0.

## Rules

- Build phase: spend gold to place traps and minions on the dungeon grid.
- Wave phase: launch the adventurers and watch the dungeon resolve automatically.
- Adventurers first path to the treasure, then to the boss.
- Traps trigger when an adventurer steps on their tile.
- Minions and adventurers fight automatically when in range.
- The boss attacks nearby adventurers.
- Temporary victory: all adventurers die.
- Defeat: the boss dies.
- After each cleared wave, you get more gold and a report.
- Adventurers adapt:
  - trap-heavy dungeons attract more thieves;
  - long fights attract more healers;
  - effective minions attract more warriors;
  - lethal trap tiles become less attractive to future pathfinding.

## Assets

This V0 ships with generated placeholders only. No external asset is bundled.

Asset replacement is prepared through:

- `src/assets/manifest.ts`
- `src/assets/placeholderTextures.ts`
- `public/assets/`
- `CREDITS.md`
- `ASSET_LICENSES.md`

Prefer Kenney CC0 packs for future art.

## Architecture

- `src/main.ts`: Phaser and DOM UI bootstrap.
- `src/scenes/`: Phaser scenes.
- `src/game/`: simulation state, constants, UI snapshots.
- `src/entities/`: adventurer and defense definitions.
- `src/systems/`: pathfinding and wave generation.
- `src/assets/`: manifest and generated placeholder textures.
- `public/assets/`: future runtime asset location.

The simulation owns gameplay rules. Phaser scenes render state and forward input.
