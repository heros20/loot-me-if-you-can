/* Verifie la mecanique de tresor: pickup, drop, vol, penalite. */
import { DungeonSimulation } from '../src/game/DungeonSimulation';
import type { GameState } from '../src/game/types';

const specialTargetSim = new DungeonSimulation();
specialTargetSim.startNewGame();
specialTargetSim.selectConstructionTool('addWeaponTreasure');
specialTargetSim.placeSelectedDefense({ x: 20, y: 5 });
specialTargetSim.launchWave();

const specialTargetState = (specialTargetSim as unknown as { state: GameState }).state;
const selectedTreasure = specialTargetState.treasures.find((treasure) => treasure.id === specialTargetState.runtime?.targetTreasureId);

if (!selectedTreasure || selectedTreasure.kind !== 'specialWeapon') {
  console.error(`ECHEC: smoke-treasure attend qu'un tresor special accessible soit cible, obtenu ${selectedTreasure?.kind ?? 'aucun'}.`);
  process.exit(1);
}

const sim = new DungeonSimulation();
sim.startNewGame();

let sawCarried = false;
let sawDropped = false;
let sawStolen = false;

for (let wave = 1; wave <= 8; wave += 1) {
  const buildSnapshot = sim.getSnapshot();

  if (buildSnapshot.phase !== 'build') {
    break;
  }

  sim.selectDefense('spikeTrap');
  sim.placeSelectedDefense({ x: 3, y: 7 });
  sim.placeSelectedDefense({ x: 4, y: 7 });
  sim.placeSelectedDefense({ x: 10, y: 4 });
  sim.selectDefense('skeleton');
  sim.placeSelectedDefense({ x: 8, y: 4 });
  sim.selectDefense('goblin');
  sim.placeSelectedDefense({ x: 5, y: 6 });
  sim.launchWave();

  let t = 0;

  while (t < 240000) {
    sim.update(50);
    t += 50;

    const s = sim.getSnapshot();

    if (s.treasureStatus === 'carried') {
      sawCarried = true;
    }

    if (s.treasureStatus === 'dropped') {
      sawDropped = true;
    }

    if (s.treasureStatus === 'stolen') {
      sawStolen = true;
    }

    if (s.phase === 'report' || s.phase === 'defeat') {
      console.log(
        `Vague ${wave}: phase=${s.phase} stolen=${s.report?.treasureStolen} penalty=${s.report?.treasurePenaltyGold}` +
          ` budget=${s.report?.preparationBudget} infamie=${s.dungeonReputation}`,
      );
      break;
    }
  }

  const s = sim.getSnapshot();

  if (s.phase === 'defeat') {
    break;
  }

  sim.continueBuild();
}

console.log(`carried=${sawCarried} dropped=${sawDropped} stolen=${sawStolen}`);
