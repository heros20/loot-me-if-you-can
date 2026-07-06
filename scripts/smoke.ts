/* Test de fumee headless: simule plusieurs vagues avec pieges, sbires et capacites du boss. */
import { DIG_COST, DOOR_COST, PARTY_SIZE, STARTING_GOLD } from '../src/game/constants';
import { DungeonSimulation } from '../src/game/DungeonSimulation';
import {
  COMBAT_ABILITY_BALANCE,
  createEmptyCombatAbilityStats,
  tryUseAdventurerAbility,
  tryUseDefenseAbility,
} from '../src/systems/combatAbilitySystem';
import { computeDoorRemovalRefund } from '../src/systems/economyBalance';
import { updateMonsterAI } from '../src/systems/monsterAISystem';
import { choosePostTreasureGoal, chooseTreasureGroupObjective, createPartyPlan } from '../src/systems/partyAISystem';
import type {
  AdventurerEntity,
  AdventurerRole,
  BossEntity,
  DefenseEntity,
  DefenseType,
  GridCell,
  WaveStats,
} from '../src/game/types';

function createSmokeStats(): WaveStats {
  return {
    adventurersKilled: 0,
    adventurersEscaped: 0,
    bossDamageTaken: 0,
    healingDone: 0,
    combatEngagementMs: 0,
    trapStats: {},
    minionStats: {},
    deaths: [],
    survivors: [],
    bossDamageByProfile: {},
    storyEvents: [],
    chronicleEvents: [],
    treasureStolen: false,
    abilityUses: 0,
    bossAbilityUses: 0,
    abilityStats: createEmptyCombatAbilityStats(),
    minionKillsByDefenseId: {},
    doorEncounters: 0,
    doorsPicked: 0,
    doorNoThiefRetreats: 0,
    fleeingTrapAvoidances: 0,
    groupRetreats: 0,
    coverRetreats: 0,
    panicRetreats: 0,
    disobeys: 0,
    tacticalHesitations: 0,
    thiefTrapMitigations: 0,
    thiefDoorLeads: 0,
    treasureCarrierName: null,
    treasureGroupDecision: null,
  };
}

function createSmokeAdventurer(role: AdventurerRole, id: string, x: number, y: number): AdventurerEntity {
  return {
    id,
    profileId: `${id}-profile`,
    role,
    name: id,
    level: 1,
    personality: 'cautious',
    traits: [],
    nemesisDefenseType: null,
    x,
    y,
    hp: role === 'warrior' ? 72 : 40,
    maxHp: role === 'warrior' ? 72 : 40,
    damage: role === 'mage' ? 13 : 6,
    speed: 0.002,
    attackRange: role === 'mage' ? 2.55 : 1.1,
    attackCooldownMs: 800,
    attackTimerMs: 0,
    healTimerMs: 0,
    abilityCooldowns: {},
    abilityFxTimerMs: 0,
    damageReductionTimerMs: 0,
    thiefTrapInterventionsRemaining: role === 'thief' ? COMBAT_ABILITY_BALANCE.thiefTrapInterventionsPerExpedition : 0,
    trapDamageMultiplier: role === 'thief' ? 0.48 : 1,
    injuryPerformanceMultiplier: 1,
    speedMultiplier: 1,
    slowedTimerMs: 0,
    targetStage: 'treasure',
    path: [],
    lastCellKey: '0,0',
    alive: true,
    escaped: false,
    hasEnteredDungeon: true,
    carryingTreasure: false,
    stunnedTimerMs: 0,
    fearTimerMs: 0,
    fearPreviousStage: null,
    retreatIntent: 'none',
    retreatIntentTimerMs: 0,
    hesitationTimerMs: 0,
    decisionSpeedMultiplier: 1,
    barkText: null,
    barkTimerMs: 0,
    barkCooldownMs: 0,
    lastBarkKey: null,
    lastAvoidedTrapKey: null,
    isHeir: false,
  };
}

function createSmokeDefense(type: DefenseType, id: string, x: number, y: number): DefenseEntity {
  const kind = type === 'spikeTrap' || type === 'fireTrap' ? 'trap' : 'minion';
  return {
    id,
    type,
    kind,
    name: id,
    cell: { x: Math.round(x), y: Math.round(y) },
    homeCell: { x: Math.round(x), y: Math.round(y) },
    x,
    y,
    hp: 40,
    maxHp: 40,
    cooldownRemainingMs: 0,
    abilityCooldowns: {},
    abilityFxTimerMs: 0,
    slowedTimerMs: 0,
    tauntedByAdventurerId: null,
    tauntTimerMs: 0,
    alive: true,
    aiState: 'idle',
    targetAdventurerId: null,
    patrolAngle: 0,
    chaseTimerMs: 0,
    stuckTimerMs: 0,
    lastX: x,
    lastY: y,
    kills: 0,
    wavesSurvived: 0,
    summoned: false,
  };
}

function createSmokeBoss(): BossEntity {
  return {
    homeCell: { x: 20, y: 8 },
    x: 20,
    y: 8,
    hp: 340,
    maxHp: 340,
    damage: 16,
    attackRange: 1.25,
    detectionRange: 3.2,
    leashRange: 5,
    attackCooldownMs: 760,
    attackTimerMs: 0,
    targetAdventurerId: null,
    tauntedByAdventurerId: null,
    tauntTimerMs: 0,
    abilities: {
      shockwave: { type: 'shockwave', cooldownRemainingMs: 0, usesThisWave: 0 },
      roar: { type: 'roar', cooldownRemainingMs: 0, usesThisWave: 0 },
      summon: { type: 'summon', cooldownRemainingMs: 0, usesThisWave: 0 },
    },
  };
}

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

function validateDefensiveUnitsRespectClosedDoors(): void {
  const goblin = createSmokeDefense('goblin', 'door-goblin', 9, 4);
  const target = createSmokeAdventurer('mage', 'door-target', 11, 4);
  const closedDoorCell = { x: 10, y: 4 };
  const closedDoorKey = `${closedDoorCell.x},${closedDoorCell.y}`;
  const closedMovement = {
    canMoveBetween: (_fromX: number, _fromY: number, toX: number, toY: number) =>
      `${Math.round(toX)},${Math.round(toY)}` !== closedDoorKey,
    getNextWaypoint: () => null,
  };

  for (let elapsed = 0; elapsed < 2200; elapsed += 100) {
    updateMonsterAI([goblin], [target], 100, closedMovement);
  }

  if (goblin.x >= 9.55) {
    console.error('ECHEC: un gobelin ne devrait pas traverser une porte fermee.');
    process.exit(1);
  }

  const openedDoorGoblin = createSmokeDefense('goblin', 'open-door-goblin', 9, 4);
  const openMovement = {
    canMoveBetween: () => true,
    getNextWaypoint: (_fromX: number, _fromY: number, targetX: number, targetY: number) => ({ x: targetX, y: targetY }),
  };

  for (let elapsed = 0; elapsed < 1500; elapsed += 100) {
    updateMonsterAI([openedDoorGoblin], [target], 100, openMovement);
  }

  if (openedDoorGoblin.x <= 10) {
    console.error('ECHEC: un gobelin devrait pouvoir passer quand la porte est ouverte.');
    process.exit(1);
  }
}

function validateTreasureGroupDecisionRules(): void {
  const cautiousPlan = createPartyPlan(1, 0, 'cautionSurge');
  const treasureCarrier = createSmokeAdventurer('thief', 'carrier', 16, 4);
  treasureCarrier.carryingTreasure = true;
  const cautiousDecision = chooseTreasureGroupObjective(
    cautiousPlan,
    treasureCarrier,
    [
      treasureCarrier,
      createSmokeAdventurer('warrior', 'escort-warrior', 16, 5),
      createSmokeAdventurer('healer', 'escort-healer', 15, 4),
    ],
    createSmokeStats(),
    0.9,
  );
  cautiousPlan.groupObjective = cautiousDecision;

  if (cautiousDecision !== 'escapeWithTreasure' || choosePostTreasureGoal(cautiousPlan, treasureCarrier) !== 'exit') {
    console.error('ECHEC: un groupe prudent avec tresor doit prendre une decision collective de fuite lisible.');
    process.exit(1);
  }

  const heroicPlan = createPartyPlan(2, 0, null);
  heroicPlan.type = 'heroic';
  heroicPlan.primaryGoal = 'boss';
  heroicPlan.groupObjective = 'challengeBoss';
  const heroicCarrier = createSmokeAdventurer('warrior', 'heroic-carrier', 16, 4);
  heroicCarrier.carryingTreasure = true;
  const heroicDecision = chooseTreasureGroupObjective(
    heroicPlan,
    heroicCarrier,
    [
      heroicCarrier,
      createSmokeAdventurer('mage', 'heroic-mage', 17, 4),
      createSmokeAdventurer('healer', 'heroic-healer', 15, 4),
    ],
    createSmokeStats(),
    0.5,
  );
  heroicPlan.groupObjective = heroicDecision;

  if (heroicDecision !== 'challengeBoss' || choosePostTreasureGoal(heroicPlan, heroicCarrier) !== 'boss') {
    console.error('ECHEC: un groupe heroique en etat de combattre doit assumer collectivement le boss apres le tresor.');
    process.exit(1);
  }
}

function validateCombatAbilityRules(): void {
  const warrior = createSmokeAdventurer('warrior', 'warrior', 4, 4);
  const healer = createSmokeAdventurer('healer', 'healer', 4.7, 4);
  healer.hp = 20;
  const skeletonThreat = createSmokeDefense('skeleton', 'skeleton-threat', 5.1, 4);
  const warriorStats = createSmokeStats();
  const warriorUsed = tryUseAdventurerAbility(warrior, {
    adventurers: [warrior, healer],
    defenses: [skeletonThreat],
    boss: createSmokeBoss(),
    doors: [],
    stats: warriorStats,
    elapsedMs: 0,
    damageMinion: (target, damage) => {
      target.hp -= damage;
    },
    damageBoss: () => undefined,
    healAdventurer: (target, amount) => {
      const healed = Math.min(amount, target.maxHp - target.hp);
      target.hp += healed;
      return healed;
    },
    suppressTrap: (trap, durationMs) => {
      trap.cooldownRemainingMs = durationMs;
    },
    bark: () => undefined,
    message: () => undefined,
    rememberTrap: () => undefined,
  });

  if (!warriorUsed || warriorStats.abilityStats.warriorTaunts !== 1 || skeletonThreat.tauntedByAdventurerId !== warrior.id) {
    console.error('ECHEC: le guerrier devrait pouvoir provoquer une menace proche pour proteger un allie fragile.');
    process.exit(1);
  }

  const thief = createSmokeAdventurer('thief', 'thief', 2, 2);
  thief.path = [{ x: 3, y: 2 }];
  const trap = createSmokeDefense('spikeTrap', 'trap-visible', 3, 2);
  const thiefStats = createSmokeStats();
  const thiefUsed = tryUseAdventurerAbility(thief, {
    adventurers: [thief],
    defenses: [trap],
    boss: createSmokeBoss(),
    doors: [],
    stats: thiefStats,
    elapsedMs: 0,
    damageMinion: () => undefined,
    damageBoss: () => undefined,
    healAdventurer: () => 0,
    suppressTrap: (target, durationMs) => {
      target.cooldownRemainingMs = durationMs;
    },
    bark: () => undefined,
    message: () => undefined,
    rememberTrap: () => undefined,
  });

  if (!thiefUsed || thiefStats.abilityStats.thiefTrapMitigations !== 1 || trap.cooldownRemainingMs < COMBAT_ABILITY_BALANCE.thiefTrapSuppressionMs) {
    console.error('ECHEC: le voleur devrait conserver son role de mitigation de piege.');
    process.exit(1);
  }

  thief.abilityCooldowns.thiefTrapMitigation = 0;
  trap.cooldownRemainingMs = 0;
  const thiefSecondUse = tryUseAdventurerAbility(thief, {
    adventurers: [thief],
    defenses: [trap],
    boss: createSmokeBoss(),
    doors: [],
    stats: thiefStats,
    elapsedMs: 0,
    damageMinion: () => undefined,
    damageBoss: () => undefined,
    healAdventurer: () => 0,
    suppressTrap: (target, durationMs) => {
      target.cooldownRemainingMs = durationMs;
    },
    bark: () => undefined,
    message: () => undefined,
    rememberTrap: () => undefined,
  });
  thief.abilityCooldowns.thiefTrapMitigation = 0;
  trap.cooldownRemainingMs = 0;
  const thiefThirdUse = tryUseAdventurerAbility(thief, {
    adventurers: [thief],
    defenses: [trap],
    boss: createSmokeBoss(),
    doors: [],
    stats: thiefStats,
    elapsedMs: 0,
    damageMinion: () => undefined,
    damageBoss: () => undefined,
    healAdventurer: () => 0,
    suppressTrap: (target, durationMs) => {
      target.cooldownRemainingMs = durationMs;
    },
    bark: () => undefined,
    message: () => undefined,
    rememberTrap: () => undefined,
  });

  if (!thiefSecondUse || thiefThirdUse || thiefStats.abilityStats.thiefTrapMitigations !== 2 || thiefStats.abilityStats.thiefTrapOverwhelmed !== 1) {
    console.error('ECHEC: le voleur devrait etre limite a deux mitigations de piege par expedition.');
    process.exit(1);
  }

  const groupHealer = createSmokeAdventurer('healer', 'group-healer', 5, 5);
  const woundedA = createSmokeAdventurer('warrior', 'wounded-a', 5.4, 5);
  const woundedB = createSmokeAdventurer('mage', 'wounded-b', 4.8, 5.3);
  const woundedC = createSmokeAdventurer('thief', 'wounded-c', 5.1, 4.7);
  [woundedA, woundedB, woundedC].forEach((ally) => {
    ally.hp = Math.floor(ally.maxHp * 0.45);
  });
  const healerStats = createSmokeStats();
  const healerUsed = tryUseAdventurerAbility(groupHealer, {
    adventurers: [groupHealer, woundedA, woundedB, woundedC],
    defenses: [],
    boss: createSmokeBoss(),
    doors: [],
    stats: healerStats,
    elapsedMs: 0,
    damageMinion: () => undefined,
    damageBoss: () => undefined,
    healAdventurer: (target, amount) => {
      const healed = Math.min(amount, target.maxHp - target.hp);
      target.hp += healed;
      return healed;
    },
    suppressTrap: () => undefined,
    bark: () => undefined,
    message: () => undefined,
    rememberTrap: () => undefined,
  });

  if (!healerUsed || healerStats.abilityStats.healerGroupHeals !== 1 || healerStats.abilityStats.healerHealing <= 0) {
    console.error('ECHEC: le soigneur devrait pouvoir lancer un soin de groupe leger sur plusieurs blesses.');
    process.exit(1);
  }

  const singleHealer = createSmokeAdventurer('healer', 'single-healer', 5, 5);
  const woundedSingle = createSmokeAdventurer('mage', 'wounded-single', 5.3, 5);
  woundedSingle.hp = 12;
  const singleStats = createSmokeStats();
  const singleHealUsed = tryUseAdventurerAbility(singleHealer, {
    adventurers: [singleHealer, woundedSingle],
    defenses: [],
    boss: createSmokeBoss(),
    doors: [],
    stats: singleStats,
    elapsedMs: 0,
    damageMinion: () => undefined,
    damageBoss: () => undefined,
    healAdventurer: (target, amount) => {
      const healed = Math.min(amount, target.maxHp - target.hp);
      target.hp += healed;
      return healed;
    },
    suppressTrap: () => undefined,
    bark: () => undefined,
    message: () => undefined,
    rememberTrap: () => undefined,
  });

  if (!singleHealUsed || singleStats.abilityStats.healerSingleHeals !== 1) {
    console.error('ECHEC: le soigneur devrait pouvoir lancer un soin cible.');
    process.exit(1);
  }

  const mage = createSmokeAdventurer('mage', 'mage', 8, 8);
  const goblinA = createSmokeDefense('goblin', 'goblin-a', 8.8, 8);
  const goblinB = createSmokeDefense('goblin', 'goblin-b', 9.2, 8.2);
  const mageStats = createSmokeStats();
  const mageUsed = tryUseAdventurerAbility(mage, {
    adventurers: [mage],
    defenses: [goblinA, goblinB],
    boss: createSmokeBoss(),
    doors: [],
    stats: mageStats,
    elapsedMs: 0,
    damageMinion: (target, damage) => {
      target.hp -= damage;
    },
    damageBoss: () => undefined,
    healAdventurer: () => 0,
    suppressTrap: () => undefined,
    bark: () => undefined,
    message: () => undefined,
    rememberTrap: () => undefined,
  });

  if (!mageUsed || mageStats.abilityStats.mageFrostZones !== 1 || goblinA.slowedTimerMs <= 0 || goblinB.slowedTimerMs <= 0) {
    console.error('ECHEC: le mage devrait pouvoir ralentir plusieurs monstres proches.');
    process.exit(1);
  }

  const iceMage = createSmokeAdventurer('mage', 'ice-mage', 8, 8);
  const loneSlime = createSmokeDefense('slime', 'lone-slime', 8.8, 8);
  const iceStats = createSmokeStats();
  const iceUsed = tryUseAdventurerAbility(iceMage, {
    adventurers: [iceMage],
    defenses: [loneSlime],
    boss: createSmokeBoss(),
    doors: [],
    stats: iceStats,
    elapsedMs: 0,
    damageMinion: (target, damage) => {
      target.hp -= damage;
    },
    damageBoss: () => undefined,
    healAdventurer: () => 0,
    suppressTrap: () => undefined,
    bark: () => undefined,
    message: () => undefined,
    rememberTrap: () => undefined,
  });

  if (!iceUsed || iceStats.abilityStats.mageIceShards !== 1 || loneSlime.slowedTimerMs <= 0) {
    console.error('ECHEC: le mage devrait pouvoir lancer un eclat de glace sur une cible.');
    process.exit(1);
  }

  const slowedTarget = createSmokeAdventurer('warrior', 'slowed-target', 10, 10);
  slowedTarget.slowedTimerMs = 1200;
  const goblin = createSmokeDefense('goblin', 'sneaky-goblin', 10.6, 10);
  const goblinStats = createSmokeStats();
  const goblinUsed = tryUseDefenseAbility(goblin, {
    adventurers: [slowedTarget],
    doors: [],
    stats: goblinStats,
    damageAdventurer: (target, damage) => {
      target.hp -= damage;
      return damage;
    },
    message: () => undefined,
  });

  if (!goblinUsed || goblinStats.abilityStats.goblinSneakAttacks !== 1) {
    console.error('ECHEC: le gobelin devrait pouvoir utiliser Coup sournois sur une cible ralentie.');
    process.exit(1);
  }

  const heavyTarget = createSmokeAdventurer('warrior', 'heavy-target', 12, 12);
  const skeleton = createSmokeDefense('skeleton', 'heavy-skeleton', 12.7, 12);
  const skeletonStats = createSmokeStats();
  const skeletonUsed = tryUseDefenseAbility(skeleton, {
    adventurers: [heavyTarget],
    doors: [],
    stats: skeletonStats,
    damageAdventurer: (target, damage) => {
      target.hp -= damage;
      return damage;
    },
    message: () => undefined,
  });

  if (!skeletonUsed || skeletonStats.abilityStats.skeletonHeavyStrikes !== 1 || heavyTarget.slowedTimerMs <= 0) {
    console.error('ECHEC: le squelette devrait pouvoir utiliser un coup lourd ralentissant.');
    process.exit(1);
  }

  const stickyTarget = createSmokeAdventurer('thief', 'sticky-target', 14, 14);
  const slime = createSmokeDefense('slime', 'sticky-slime', 14.8, 14);
  const slimeStats = createSmokeStats();
  const slimeUsed = tryUseDefenseAbility(slime, {
    adventurers: [stickyTarget],
    doors: [],
    stats: slimeStats,
    damageAdventurer: () => 0,
    message: () => undefined,
  });

  if (!slimeUsed || slimeStats.abilityStats.slimeStickyGels !== 1 || stickyTarget.slowedTimerMs <= 0) {
    console.error('ECHEC: le slime devrait pouvoir appliquer Gelee collante.');
    process.exit(1);
  }
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
validateDefensiveUnitsRespectClosedDoors();
validateTreasureGroupDecisionRules();
validateCombatAbilityRules();
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

  if (report.chronicle.lines.length < 3 || report.chronicle.lines.length > 6 || report.chronicle.badges.length < 6) {
    console.error(`ECHEC: chronique vague ${wave} invalide (lignes=${report.chronicle.lines.length}, badges=${report.chronicle.badges.length}).`);
    process.exit(1);
  }

  if (report.chronicle.hasSurvivors !== (report.adventurersEscaped > 0)) {
    console.error(`ECHEC: chronique vague ${wave} incoherente avec les survivants (${report.adventurersEscaped}).`);
    process.exit(1);
  }

  abilityFired += report.bossAbilityUses;
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
console.log(`Pouvoirs automatiques du boss declenches ${abilityFired} fois. Test termine sans crash.`);
