/* Longue partie scriptee: depense tout l'or, utilise les capacites, verifie heritiers et rumeurs. */
import { DungeonSimulation } from '../src/game/DungeonSimulation';
import type { DefenseType, GridCell } from '../src/game/types';

const sim = new DungeonSimulation();
sim.startNewGame();

const BUILD_SPOTS: Array<{ type: DefenseType; cell: GridCell }> = [
  { type: 'skeleton', cell: { x: 11, y: 6 } },
  { type: 'skeleton', cell: { x: 12, y: 6 } },
  { type: 'goblin', cell: { x: 10, y: 3 } },
  { type: 'slime', cell: { x: 2, y: 8 } },
  { type: 'fireTrap', cell: { x: 3, y: 7 } },
  { type: 'spikeTrap', cell: { x: 4, y: 7 } },
  { type: 'spikeTrap', cell: { x: 6, y: 5 } },
  { type: 'spikeTrap', cell: { x: 11, y: 4 } },
  { type: 'spikeTrap', cell: { x: 14, y: 4 } },
  { type: 'spikeTrap', cell: { x: 18, y: 6 } },
];

for (let wave = 1; wave <= 10; wave += 1) {
  if (sim.getSnapshot().phase !== 'build') {
    break;
  }

  for (const spot of BUILD_SPOTS) {
    sim.selectDefense(spot.type);
    sim.placeSelectedDefense(spot.cell);
  }

  sim.launchWave();
  let t = 0;

  while (t < 300000) {
    sim.update(50);
    t += 50;

    if (t % 4000 === 0) {
      sim.useBossAbility('shockwave');
      sim.useBossAbility('roar');
      sim.useBossAbility('summon');
    }

    const s = sim.getSnapshot();

    if (s.phase === 'report' || s.phase === 'defeat') {
      break;
    }
  }

  const s = sim.getSnapshot();
  console.log(
    `Vague ${wave}: phase=${s.phase} kills=${s.report?.adventurersKilled} escaped=${s.report?.adventurersEscaped}` +
      ` stolen=${s.report?.treasureStolen} bossHp=${s.bossHp} or=${s.gold} infamie=${s.dungeonReputation} (${s.dungeonReputationTitle})`,
  );

  if (s.phase === 'defeat') {
    break;
  }

  sim.continueBuild();
}

const world = (sim as unknown as { state: { world: { profiles: Record<string, { heirOfProfileId: string | null; name: string }>; deadProfileIds: string[]; rumors: unknown[]; treasuresStolen: number } } }).state.world;
const heirs = Object.values(world.profiles).filter((profile) => profile.heirOfProfileId);
console.log(
  `profils=${Object.keys(world.profiles).length} morts=${world.deadProfileIds.length} heritiers=${heirs.length}` +
    ` rumeurs=${world.rumors.length} tresorsVoles=${world.treasuresStolen}`,
);
heirs.slice(0, 4).forEach((heir) => console.log(`  heritier: ${heir.name}`));
