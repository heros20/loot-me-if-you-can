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
- The treasure is a physical object: the first hero to reach it carries it (slower), drops it on death, and steals it for good by escaping with it. Stolen treasure costs gold and reputation.
- Traps trigger when an adventurer steps on their tile. Traps are dismantled and refunded after each cleared wave; minions persist.
- Minions are named, count their kills, and become remembered veterans.
- The boss attacks nearby adventurers and has three player-activated abilities during waves: shockwave (area damage + stun), roar (fear), and skeleton summons.
- Click an intruder during a wave to open their dossier (level, traits, injuries, vendetta).
- Pause and x1/x2/x3 speed are available during waves.
- Temporary victory: all adventurers die or flee.
- Defeat: the boss dies.
- After each cleared wave, you get gold, a narrative report, and a tavern rumor that shapes the next wave.
- Adventurers adapt:
  - trap-heavy dungeons attract more thieves;
  - long fights attract more healers;
  - effective minions attract more warriors;
  - lethal trap tiles become less attractive to future pathfinding;
  - fallen heroes can inspire vengeful heirs who return with their family name and grudge.

## Simulation Tests

```bash
npm run smoke
```

Runs the headless simulation scripts in `scripts/` (waves, treasure theft, boss abilities, heirs, rumors) without a browser.

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
