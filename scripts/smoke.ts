/* Test de fumee headless: simule plusieurs vagues avec pieges, sbires et capacites du boss. */
import { PARTY_SIZE } from '../src/game/constants';
import { DungeonSimulation } from '../src/game/DungeonSimulation';

const sim = new DungeonSimulation();
sim.startNewGame();

function buildPhase(): void {
  const snapshot = sim.getSnapshot();

  if (snapshot.phase !== 'build') {
    return;
  }

  sim.selectDefense('spikeTrap');
  sim.placeSelectedDefense({ x: 3, y: 4 });
  sim.placeSelectedDefense({ x: 4, y: 4 });
  sim.selectDefense('skeleton');
  sim.placeSelectedDefense({ x: 7, y: 3 });
  sim.selectDefense('goblin');
  sim.placeSelectedDefense({ x: 5, y: 2 });
}

let abilityFired = 0;

for (let wave = 1; wave <= 6; wave += 1) {
  buildPhase();
  const buildSnapshot = sim.getSnapshot();

  if (buildSnapshot.phase === 'build' && buildSnapshot.nextWaveSize !== PARTY_SIZE) {
    console.error(`ECHEC: vague ${wave} annonce ${buildSnapshot.nextWaveSize} aventuriers au lieu de ${PARTY_SIZE}`);
    process.exit(1);
  }

  sim.launchWave();

  let elapsed = 0;
  const maxMs = 240000;

  while (elapsed < maxMs) {
    sim.update(50);
    elapsed += 50;

    if (elapsed % 8000 === 0) {
      sim.useBossAbility('shockwave');
      sim.useBossAbility('roar');
      sim.useBossAbility('summon');
      abilityFired += 1;
    }

    const snapshot = sim.getSnapshot();

    if (snapshot.phase === 'report' || snapshot.phase === 'defeat') {
      break;
    }
  }

  const snapshot = sim.getSnapshot();
  const report = snapshot.report;

  if (!report) {
    console.error(`ECHEC: pas de rapport apres la vague ${wave} (phase=${snapshot.phase}, ${elapsed}ms)`);
    process.exit(1);
  }

  if (report.participants.length !== PARTY_SIZE) {
    console.error(`ECHEC: rapport vague ${wave} contient ${report.participants.length} participants au lieu de ${PARTY_SIZE}`);
    process.exit(1);
  }

  console.log(
    `Vague ${report.wave}: cleared=${report.cleared} kills=${report.adventurersKilled} escaped=${report.adventurersEscaped}` +
      ` treasureStolen=${report.treasureStolen} penalty=${report.treasurePenaltyGold} budget=${report.preparationBudget}` +
      ` or=${snapshot.gold} bossHp=${snapshot.bossHp}`,
  );
  console.log(`  Rumeurs: ${snapshot.recentRumors[snapshot.recentRumors.length - 1] ?? '(aucune)'}`);
  console.log(`  Sbires notables: ${snapshot.namedMinions.map((minion) => `${minion.name}(${minion.kills}k/${minion.wavesSurvived}v)`).join(', ') || '(aucun)'}`);

  if (snapshot.phase === 'defeat') {
    console.log('Defaite du boss: fin de partie atteinte proprement.');
    break;
  }

  sim.continueBuild();
}

console.log(`Capacites declenchees ${abilityFired} fois. Test termine sans crash.`);
