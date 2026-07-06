/* Test de fumee headless: simule plusieurs vagues avec pieges, sbires et capacites du boss. */
import { DIG_COST, DOOR_COST, PARTY_SIZE, STARTING_GOLD } from '../src/game/constants';
import { DungeonSimulation } from '../src/game/DungeonSimulation';
import { computeDoorRemovalRefund } from '../src/systems/economyBalance';
import type { GridCell } from '../src/game/types';

function validateDiggingRules(): void {
  const digSim = new DungeonSimulation();
  digSim.startNewGame();
  const startingGold = digSim.getSnapshot().gold;

  digSim.selectConstructionTool('dig');
  [{ x: 7, y: 7 }, { x: 8, y: 7 }, { x: 9, y: 7 }].forEach((cell) => digSim.placeSelectedDefense(cell));

  const afterDigging = digSim.getSnapshot();

  if (afterDigging.gold !== startingGold - DIG_COST * 3) {
    console.error(`ECHEC: trois creusements devraient couter ${DIG_COST * 3} or, obtenu ${startingGold - afterDigging.gold}`);
    process.exit(1);
  }

  (digSim as unknown as { state: { gold: number } }).state.gold = 0;
  digSim.placeSelectedDefense({ x: 10, y: 7 });
  const afterInsufficientDig = digSim.getSnapshot();

  if (afterInsufficientDig.gold !== 0 || !afterInsufficientDig.message.includes('Il faut')) {
    console.error('ECHEC: le creusement sans or devrait etre refuse avec feedback.');
    process.exit(1);
  }

  const digTool = afterInsufficientDig.constructionTools.find((tool) => tool.type === 'dig');

  if (!digTool?.disabled) {
    console.error('ECHEC: le bouton Creuser devrait etre desactive quand l or est insuffisant.');
    process.exit(1);
  }

  digSim.selectDefense('spikeTrap');
  digSim.placeSelectedDefense({ x: 12, y: 12 });

  if (digSim.getSnapshot().gold !== 0) {
    console.error('ECHEC: une defense a ete posee sur la roche.');
    process.exit(1);
  }
}

function validateSpecialRoomBuildRules(): void {
  const buildSim = new DungeonSimulation();
  buildSim.startNewGame();
  const startingGold = buildSim.getSnapshot().gold;

  buildSim.selectDefense('spikeTrap');
  buildSim.placeSelectedDefense({ x: 12, y: 12 });

  if (buildSim.getSnapshot().gold !== startingGold) {
    console.error('ECHEC: un piege a ete accepte sur la roche.');
    process.exit(1);
  }

  buildSim.placeSelectedDefense({ x: 0, y: 7 });

  if (buildSim.getSnapshot().gold !== startingGold) {
    console.error('ECHEC: un piege a ete accepte sur l entree exacte.');
    process.exit(1);
  }

  buildSim.placeSelectedDefense({ x: 16, y: 4 });

  if (buildSim.getSnapshot().gold !== startingGold) {
    console.error('ECHEC: un piege a ete accepte sur le tresor exact.');
    process.exit(1);
  }

  buildSim.placeSelectedDefense({ x: 15, y: 4 });
  const afterTreasureRoomTrap = buildSim.getSnapshot();

  if (afterTreasureRoomTrap.gold !== startingGold - 4) {
    console.error('ECHEC: un piege devrait etre accepte dans la salle du tresor autour du tresor.');
    process.exit(1);
  }

  buildSim.selectDefense('skeleton');
  buildSim.placeSelectedDefense({ x: 21, y: 12 });
  const afterThroneRoomMinion = buildSim.getSnapshot();

  if (afterThroneRoomMinion.gold !== startingGold - 4 - 8) {
    console.error('ECHEC: un monstre devrait etre accepte dans la salle du trone autour du boss.');
    process.exit(1);
  }

  buildSim.placeSelectedDefense({ x: 22, y: 12 });

  if (buildSim.getSnapshot().gold !== startingGold - 4 - 8) {
    console.error('ECHEC: une defense a ete acceptee sur la case boss exacte.');
    process.exit(1);
  }
}

function validateDoorRules(): void {
  const rejectSim = new DungeonSimulation();
  rejectSim.startNewGame();
  const startGold = rejectSim.getSnapshot().gold;
  rejectSim.selectConstructionTool('door');

  const rejectionCells: GridCell[] = [
    { x: 12, y: 12 }, // roche
    { x: 0, y: 7 }, // entree exacte
    { x: 16, y: 4 }, // tresor exact
    { x: 22, y: 12 }, // trone/boss exact
  ];

  rejectionCells.forEach((cell) => rejectSim.placeSelectedDefense(cell));

  if (rejectSim.getSnapshot().gold !== startGold || rejectSim.getRenderState().doors.length !== 0) {
    console.error('ECHEC: une porte a ete acceptee sur une case interdite (roche/entree/tresor/trone).');
    process.exit(1);
  }

  const acceptSim = new DungeonSimulation();
  acceptSim.startNewGame();
  acceptSim.selectConstructionTool('door');
  acceptSim.placeSelectedDefense({ x: 10, y: 4 });
  const afterAccept = acceptSim.getSnapshot();

  if (afterAccept.gold !== STARTING_GOLD - DOOR_COST || acceptSim.getRenderState().doors.length !== 1) {
    console.error('ECHEC: une porte sur une case creusee valide devrait etre acceptee et couter DOOR_COST.');
    process.exit(1);
  }

  const doorButton = afterAccept.constructionTools.find((tool) => tool.type === 'door');

  if (!doorButton || doorButton.cost !== DOOR_COST) {
    console.error('ECHEC: le bouton Porte renforcee devrait afficher son cout.');
    process.exit(1);
  }

  acceptSim.placeSelectedDefense({ x: 10, y: 4 });

  if (acceptSim.getRenderState().doors.length !== 1) {
    console.error('ECHEC: une deuxieme porte a ete posee sur une case deja occupee par une porte.');
    process.exit(1);
  }

  (acceptSim as unknown as { state: { gold: number } }).state.gold = DOOR_COST * 2;
  [{ x: 11, y: 4 }, { x: 12, y: 4 }].forEach((cell) => acceptSim.placeSelectedDefense(cell));
  const afterMoreDoors = acceptSim.getSnapshot();
  acceptSim.placeSelectedDefense({ x: 13, y: 4 });
  const afterInsufficientGold = acceptSim.getSnapshot();

  if (afterInsufficientGold.gold !== afterMoreDoors.gold || acceptSim.getRenderState().doors.length !== 3) {
    console.error('ECHEC: une porte a ete posee malgre un or insuffisant.');
    process.exit(1);
  }

  const insufficientGoldDoorButton = afterInsufficientGold.constructionTools.find((tool) => tool.type === 'door');

  if (!insufficientGoldDoorButton?.disabled) {
    console.error('ECHEC: le bouton Porte renforcee devrait etre desactive quand l or est insuffisant.');
    process.exit(1);
  }

  const treasureRingSim = new DungeonSimulation();
  treasureRingSim.startNewGame();
  treasureRingSim.selectConstructionTool('door');
  treasureRingSim.placeSelectedDefense({ x: 15, y: 4 });

  if (treasureRingSim.getRenderState().doors.length !== 1) {
    console.error('ECHEC: une porte valide autour du tresor a ete refusee.');
    process.exit(1);
  }

  const trapOverlapSim = new DungeonSimulation();
  trapOverlapSim.startNewGame();
  trapOverlapSim.selectDefense('spikeTrap');
  trapOverlapSim.placeSelectedDefense({ x: 10, y: 4 });
  trapOverlapSim.selectConstructionTool('door');
  trapOverlapSim.placeSelectedDefense({ x: 10, y: 4 });

  if (trapOverlapSim.getRenderState().doors.length !== 0) {
    console.error('ECHEC: une porte a ete posee sur une case deja occupee par un piege.');
    process.exit(1);
  }
}

function validateDoorLockRules(): void {
  const lockSim = new DungeonSimulation();
  lockSim.startNewGame();
  lockSim.selectConstructionTool('door');
  lockSim.placeSelectedDefense({ x: 10, y: 4 });
  const door = lockSim.getRenderState().doors[0];

  if (!door?.locked || door.openedForExpedition || door.pickProgressMs !== 0 || door.destroyed) {
    console.error('ECHEC: une porte devrait demarrer verrouillee, fermee et intacte.');
    process.exit(1);
  }
}

function validateDoorRemovalRules(): void {
  const removeSim = new DungeonSimulation();
  removeSim.startNewGame();
  removeSim.selectConstructionTool('door');
  removeSim.placeSelectedDefense({ x: 10, y: 4 });
  const afterPlaceGold = removeSim.getSnapshot().gold;

  removeSim.selectConstructionTool('removeDoor');
  removeSim.placeSelectedDefense({ x: 10, y: 4 });
  const afterRemove = removeSim.getSnapshot();

  if (removeSim.getRenderState().doors.length !== 0) {
    console.error('ECHEC: Retirer porte devrait enlever la porte volontairement en preparation.');
    process.exit(1);
  }

  if (afterRemove.gold !== afterPlaceGold + computeDoorRemovalRefund()) {
    console.error('ECHEC: Retirer porte devrait rembourser partiellement la porte.');
    process.exit(1);
  }
}

function validateDoorNoThiefRetreat(): void {
  const noThiefSim = new DungeonSimulation();
  noThiefSim.startNewGame();
  noThiefSim.selectConstructionTool('door');
  noThiefSim.placeSelectedDefense({ x: 10, y: 4 });
  noThiefSim.launchWave();

  let elapsed = 0;
  let thiefRemoved = false;
  let sawGroupRetreat = false;
  let furthestXAtRetreat = 0;
  let movedTowardExitAfterRetreat = false;

  while (elapsed < 180000) {
    noThiefSim.update(50);
    elapsed += 50;
    const state = (noThiefSim as unknown as {
      state: {
        adventurers: Array<{ role: string; alive: boolean; hp: number; targetStage: string; x: number }>;
        memory: { rolePressure: { thief: number } };
      };
    }).state;
    const thief = state.adventurers.find((adventurer) => adventurer.role === 'thief' && adventurer.alive);

    if (thief) {
      thief.alive = false;
      thief.hp = 0;
      thiefRemoved = true;
    }

    const snapshot = noThiefSim.getSnapshot();
    const active = state.adventurers.filter((adventurer) => adventurer.alive);

    if ((snapshot.report?.doorNoThiefRetreats ?? 0) > 0 || active.some((adventurer) => adventurer.targetStage === 'exit')) {
      const exitTargets = active.filter((adventurer) => adventurer.targetStage === 'exit').length;

      if (!sawGroupRetreat && exitTargets >= 2) {
        sawGroupRetreat = true;
        furthestXAtRetreat = Math.max(...active.map((adventurer) => adventurer.x));
      }

      if (sawGroupRetreat && active.some((adventurer) => adventurer.x < furthestXAtRetreat - 0.7)) {
        movedTowardExitAfterRetreat = true;
      }
    }

    if (snapshot.phase === 'report' || snapshot.phase === 'defeat') {
      const pressure = state.memory.rolePressure.thief;

      if (!thiefRemoved || (snapshot.report?.doorNoThiefRetreats ?? 0) <= 0 || pressure < 3 || !sawGroupRetreat || !movedTowardExitAfterRetreat) {
        console.error('ECHEC: une expedition sans voleur vivant devrait abandonner devant la porte et pousser le recrutement de voleur.');
        process.exit(1);
      }

      return;
    }
  }

  console.error('ECHEC: le scenario porte sans voleur n a pas produit de rapport.');
  process.exit(1);
}

function validateGoblinChaseRules(): void {
  const goblinSim = new DungeonSimulation();
  goblinSim.startNewGame();
  goblinSim.selectDefense('goblin');
  goblinSim.placeSelectedDefense({ x: 6, y: 6 });
  const testGoblin = (goblinSim as unknown as {
    state: { defenses: Array<{ type: string; hp: number; maxHp: number }> };
  }).state.defenses.find((defense) => defense.type === 'goblin');

  if (testGoblin) {
    testGoblin.hp = 9999;
    testGoblin.maxHp = 9999;
  }

  goblinSim.launchWave();

  let movedFromHome = false;
  let returnedNearHome = false;

  for (let elapsed = 0; elapsed < 90000; elapsed += 50) {
    goblinSim.update(50);
    const state = (goblinSim as unknown as {
      state: {
        defenses: Array<{ type: string; x: number; y: number; homeCell: { x: number; y: number }; aiState: string }>;
      };
    }).state;
    const goblin = state.defenses.find((defense) => defense.type === 'goblin');

    if (!goblin) {
      break;
    }

    const homeDistance = Math.hypot(goblin.x - goblin.homeCell.x, goblin.y - goblin.homeCell.y);

    if (homeDistance > 0.35 || goblin.aiState === 'chase') {
      movedFromHome = true;
    }

    if (movedFromHome && homeDistance < 0.28 && elapsed > 8000) {
      returnedNearHome = true;
      break;
    }
  }

  if (!movedFromHome || !returnedNearHome) {
    console.error('ECHEC: le gobelin devrait poursuivre temporairement puis revenir pres de son poste.');
    process.exit(1);
  }
}

validateDiggingRules();
validateSpecialRoomBuildRules();
validateDoorRules();
validateDoorLockRules();
validateDoorRemovalRules();
validateDoorNoThiefRetreat();
validateGoblinChaseRules();

const sim = new DungeonSimulation();
sim.startNewGame();

function buildPhase(): void {
  const snapshot = sim.getSnapshot();

  if (snapshot.phase !== 'build') {
    return;
  }

  sim.selectDefense('spikeTrap');
  sim.placeSelectedDefense({ x: 3, y: 7 });
  sim.placeSelectedDefense({ x: 4, y: 7 });
  sim.selectDefense('skeleton');
  sim.placeSelectedDefense({ x: 8, y: 4 });
  sim.selectDefense('goblin');
  sim.placeSelectedDefense({ x: 6, y: 6 });
  sim.selectConstructionTool('door');
  sim.placeSelectedDefense({ x: 10, y: 4 });
}

let abilityFired = 0;
let doorEverPicked = false;
let doorEverRetreatedNoThief = false;
let doorEverLostIntegrity = false;

for (let wave = 1; wave <= 6; wave += 1) {
  buildPhase();
  const buildSnapshot = sim.getSnapshot();

  if (buildSnapshot.phase === 'build' && buildSnapshot.nextWaveSize !== PARTY_SIZE) {
    console.error(`ECHEC: vague ${wave} annonce ${buildSnapshot.nextWaveSize} aventuriers au lieu de ${PARTY_SIZE}`);
    process.exit(1);
  }

  const hasDoorOnPath = sim
    .getRenderState()
    .doors.some((door) => !door.destroyed && door.cell.x === 10 && door.cell.y === 4);

  if (hasDoorOnPath && (!buildSnapshot.dungeonValidation.valid || !buildSnapshot.canLaunchWave)) {
    console.error('ECHEC: une porte renforcee sur le chemin ne devrait pas empecher le lancement de l expedition.');
    process.exit(1);
  }

  sim.launchWave();

  let elapsed = 0;
  const maxMs = 240000;

  while (elapsed < maxMs) {
    sim.update(50);
    elapsed += 50;

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

  abilityFired += report.abilityUses;
  doorEverPicked ||= report.doorsPicked > 0;
  doorEverRetreatedNoThief ||= report.doorNoThiefRetreats > 0;

  const doorsAfterWave = sim.getRenderState().doors;

  if (doorsAfterWave.some((door) => door.hp < door.maxHp)) {
    doorEverLostIntegrity = true;
  }

  if (doorsAfterWave.some((door) => door.destroyed)) {
    doorEverLostIntegrity = true;
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

  const resetDoor = sim.getRenderState().doors.find((door) => door.cell.x === 10 && door.cell.y === 4);

  if (resetDoor && (!resetDoor.locked || resetDoor.openedForExpedition || resetDoor.pickProgressMs !== 0)) {
    console.error('ECHEC: une porte crochetee devrait etre reverrouillee entre expeditions.');
    process.exit(1);
  }
}

if (!doorEverPicked) {
  console.error('ECHEC: une porte sur le chemin devrait etre crochetee par un voleur vivant.');
  process.exit(1);
}

if (doorEverLostIntegrity) {
  console.error('ECHEC: les portes verrouillees doivent rester intactes pendant les expeditions.');
  process.exit(1);
}

if (abilityFired <= 0) {
  console.error('ECHEC: le boss devrait declencher au moins une capacite automatiquement.');
  process.exit(1);
}

console.log(`Portes verrouillees: crochetee=${doorEverPicked} retraiteSansVoleur=${doorEverRetreatedNoThief} intactes=${!doorEverLostIntegrity}`);
console.log(`Capacites automatiques declenchees ${abilityFired} fois. Test termine sans crash.`);
