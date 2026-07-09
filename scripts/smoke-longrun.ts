/* Longue partie scriptee: depense tout l'or, utilise les capacites, verifie heritiers et rumeurs. */
import { DungeonSimulation } from '../src/game/DungeonSimulation';
import type { DefenseType, GridCell } from '../src/game/types';
import { BALANCE_SMOKE_TARGETS } from '../src/systems/progressionBalance';

const sim = new DungeonSimulation();
sim.startNewGame();

interface BalanceWaveMetric {
  wave: number;
  phase: string;
  kills: number;
  escaped: number;
  durationSeconds: number;
  treasureStolen: boolean;
  specialLoots: number;
  doorsPicked: number;
  cartographerSurvivors: number;
  cartographerDeaths: number;
  preparationBudget: number;
  gold: number;
  reputation: number;
  threat: number;
  tier: number;
  reputationDelta: number;
  threatDelta: number;
}

const metrics: BalanceWaveMetric[] = [];

const BUILD_SPOTS: Array<{ type: DefenseType; cell: GridCell }> = [
  { type: 'skeleton', cell: { x: 9, y: 4 } },
  { type: 'skeleton', cell: { x: 12, y: 4 } },
  { type: 'goblin', cell: { x: 5, y: 5 } },
  { type: 'slime', cell: { x: 5, y: 6 } },
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

    const s = sim.getSnapshot();

    if (s.phase === 'report' || s.phase === 'defeat') {
      break;
    }
  }

  const s = sim.getSnapshot();

  if (s.phase !== 'report' && s.phase !== 'defeat') {
    console.error(`ECHEC: longrun bloque vague ${wave}, phase=${s.phase}.`);
    process.exit(1);
  }

  if (s.report) {
    metrics.push({
      wave,
      phase: s.phase,
      kills: s.report.adventurersKilled,
      escaped: s.report.adventurersEscaped,
      durationSeconds: s.report.durationSeconds,
      treasureStolen: s.report.treasureStolen,
      specialLoots: s.report.specialTreasureLoots.length,
      doorsPicked: s.report.doorsPicked,
      cartographerSurvivors: s.report.cartographerSurvivors,
      cartographerDeaths: s.report.cartographerDeaths,
      preparationBudget: s.report.preparationBudget,
      gold: s.gold,
      reputation: s.dungeonReputation,
      threat: s.dungeonThreat,
      tier: s.dungeonReputationTier,
      reputationDelta: s.report.reputationDelta,
      threatDelta: s.report.threatDelta,
    });
  }

  console.log(
    `Vague ${wave}: phase=${s.phase} kills=${s.report?.adventurersKilled} escaped=${s.report?.adventurersEscaped}` +
      ` stolen=${s.report?.treasureStolen} bossHp=${s.bossHp} or=${s.gold}` +
      ` reputation=${s.dungeonReputation}/${s.dungeonThreat} (${s.dungeonReputationTitle})`,
  );

  if (s.phase === 'defeat') {
    break;
  }

  sim.continueBuild();
}

const state = (sim as unknown as {
  state: {
    gold: number;
    remains: Array<{ loot: { claimed: boolean; goldValue: number } }>;
    world: {
      profiles: Record<string, { heirOfProfileId: string | null; name: string; recoveryState?: string }>;
      deadProfileIds: string[];
      rumors: unknown[];
      treasuresStolen: number;
      dungeonReputation: { value: number; threat: number; tier: number; title: string };
      kingdomFacts: unknown[];
      kingdomMemory: { facts: unknown[] };
    };
  };
}).state;
const world = state.world;
const heirs = Object.values(world.profiles).filter((profile) => profile.heirOfProfileId);
const waves = Math.max(1, metrics.length);
const averageSurvivors = metrics.reduce((total, metric) => total + metric.escaped, 0) / waves;
const averageDeaths = metrics.reduce((total, metric) => total + metric.kills, 0) / waves;
const averageDurationSeconds = metrics.reduce((total, metric) => total + metric.durationSeconds, 0) / waves;
const maxGold = Math.max(...metrics.map((metric) => metric.gold), state.gold);
const specialLoots = metrics.reduce((total, metric) => total + metric.specialLoots, 0);
const cartographerSurvivors = metrics.reduce((total, metric) => total + metric.cartographerSurvivors, 0);
const cartographerDeaths = metrics.reduce((total, metric) => total + metric.cartographerDeaths, 0);
const doorsPicked = metrics.reduce((total, metric) => total + metric.doorsPicked, 0);
const claimedRemains = state.remains.filter((remains) => remains.loot.claimed);
const claimedRemainsGold = claimedRemains.reduce((total, remains) => total + remains.loot.goldValue, 0);
const unavailableSurvivors = Object.values(world.profiles).filter((profile) =>
  profile.recoveryState && profile.recoveryState !== 'available',
).length;
const unavailableShare = unavailableSurvivors / Math.max(1, Object.keys(world.profiles).length - world.deadProfileIds.length);
const knownFacts = world.kingdomFacts.length + world.kingdomMemory.facts.length;
const reputationGains = metrics.reduce((total, metric) => total + metric.reputationDelta, 0);
const threatGains = metrics.reduce((total, metric) => total + metric.threatDelta, 0);

console.log(
  `profils=${Object.keys(world.profiles).length} morts=${world.deadProfileIds.length} heritiers=${heirs.length}` +
    ` rumeurs=${world.rumors.length} tresorsVoles=${world.treasuresStolen}`,
);
console.log(
  `progression: reputation=${world.dungeonReputation.value} menace=${world.dungeonReputation.threat}` +
    ` tier=${world.dungeonReputation.tier} (${world.dungeonReputation.title}) gains=${reputationGains}/${threatGains}`,
);
console.log(
  `balance: vagues=${waves} survMoy=${averageSurvivors.toFixed(2)} mortsMoy=${averageDeaths.toFixed(2)}` +
    ` dureeMoy=${averageDurationSeconds.toFixed(1)}s orFinal=${state.gold} orMax=${maxGold}` +
    ` budgets=${metrics.map((metric) => metric.preparationBudget).join('/')}`,
);
console.log(
  `balance: specialLoot=${specialLoots} cartoSurv=${cartographerSurvivors} cartoMorts=${cartographerDeaths}` +
    ` portes=${doorsPicked} restesFouilles=${claimedRemains.length}(${claimedRemainsGold}or)` +
    ` facts=${knownFacts} indisponibles=${unavailableSurvivors}`,
);
heirs.slice(0, 4).forEach((heir) => console.log(`  heritier: ${heir.name}`));

if (maxGold > BALANCE_SMOKE_TARGETS.maxGoldAfterTenWaves) {
  console.error(`ECHEC: economie trop riche en longrun (orMax=${maxGold}).`);
  process.exit(1);
}

if (averageDurationSeconds > BALANCE_SMOKE_TARGETS.maxAverageDurationSeconds) {
  console.error(`ECHEC: expeditions trop longues en moyenne (${averageDurationSeconds.toFixed(1)}s).`);
  process.exit(1);
}

if (averageSurvivors < BALANCE_SMOKE_TARGETS.minAverageSurvivors) {
  console.error(`ECHEC: la Guilde s'effondre trop vite (survMoy=${averageSurvivors.toFixed(2)}).`);
  process.exit(1);
}

if (knownFacts > BALANCE_SMOKE_TARGETS.maxKingdomFactsAfterTenWaves) {
  console.error(`ECHEC: Kingdom Remembers devient trop dense/omniscient (${knownFacts} faits).`);
  process.exit(1);
}

if (unavailableShare > BALANCE_SMOKE_TARGETS.maxUnavailableSurvivorShare) {
  console.error(`ECHEC: trop de survivants indisponibles (${Math.round(unavailableShare * 100)}%).`);
  process.exit(1);
}

if (world.dungeonReputation.value < BALANCE_SMOKE_TARGETS.minReputationAfterLongrun) {
  console.error(`ECHEC: reputation longrun trop faible (${world.dungeonReputation.value}).`);
  process.exit(1);
}

if (world.dungeonReputation.threat < BALANCE_SMOKE_TARGETS.minThreatAfterLongrun) {
  console.error(`ECHEC: menace longrun trop faible (${world.dungeonReputation.threat}).`);
  process.exit(1);
}

if (world.dungeonReputation.tier < BALANCE_SMOKE_TARGETS.minReputationTierAfterLongrun) {
  console.error(`ECHEC: palier reputation longrun trop faible (${world.dungeonReputation.tier}).`);
  process.exit(1);
}
