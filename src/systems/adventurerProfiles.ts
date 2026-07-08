import type {
  AdventurerProfile,
  AdventurerRole,
  AdventurerTrait,
  AdventurerInjury,
  ExpeditionOutcome,
  ExpeditionRecord,
  RunWorldMemory,
  DefenseType,
  SurvivorAbsenceReport,
  SurvivorRecoveryState,
} from '../game/types';
import { ADVENTURER_DEFINITIONS } from '../entities/definitions';
import { PARTY_SIZE } from '../game/constants';
import { createInitialKingdomMemory } from './kingdomMemorySystem';

const GUILD_ID = 'guild-ashen-contract';
const REALM_ID = 'realm-candlemark';

const FIRST_NAMES: Record<AdventurerRole, string[]> = {
  warrior: ['Bravus', 'Casquor', 'Pavois', 'Martel', 'Bastion', 'Hachelin'],
  thief: ['Filou', 'Rapiat', 'Serrure', 'Velours', 'Griffe', 'Larcin'],
  mage: ['Pyrox', 'Runebert', 'Etincelle', 'Manuscrit', 'Cendrelin', 'Vortex'],
  healer: ['Pansement', 'Misericorde', 'Tisane', 'Baume', 'Clairbaume', 'Onguent'],
  cartographer: ['Atlasin', 'Croquis', 'Boussole', 'Marge', 'Calepin', 'Repere'],
};

const FAMILY_NAMES = ['de Suie', 'Roncefer', 'Clairfosse', 'Mornelune', 'Portecharme', 'Brisecrypte'];

const TRAIT_CYCLE: AdventurerTrait[] = [
  'courageous',
  'cautious',
  'vengeful',
  'greedy',
  'traumatized',
  'famous',
];

export const SURVIVOR_RECOVERY_BALANCE = {
  lowHpInjuryThreshold: 0.28,
  moderateHpRestThreshold: 0.55,
  highCasualtyShakenDeaths: 2,
  violentBossDamageThreshold: 90,
  injuredRecoveryExpeditions: 1,
  restingRecoveryExpeditions: 1,
  shakenRecoveryExpeditions: 1,
  veteranSurvivedExpeditions: 2,
} as const;

export interface SurvivorRecoveryContext {
  hpRatio: number;
  alliesKilled: number;
  groupRetreated: boolean;
  bossDamageTaken: number;
  escapedWithSpecialTreasure: boolean;
}

export function createInitialWorldMemory(): RunWorldMemory {
  return {
    profiles: {},
    usedNames: [],
    deadProfileIds: [],
    survivorProfileIds: [],
    expeditionHistory: [],
    chronicles: [],
    kingdomMemory: createInitialKingdomMemory(),
    dungeonReputation: {
      value: 0,
      title: 'Donjon oublie',
      lastChangeReason: 'Personne ne prend encore le donjon au serieux. Erreur classique.',
    },
    guilds: {
      [GUILD_ID]: {
        id: GUILD_ID,
        name: 'Guilde du Contrat Cendreux',
        reputation: 1,
      },
    },
    realms: {
      [REALM_ID]: {
        id: REALM_ID,
        name: 'Royaume de Ciremarque',
        alarm: 0,
      },
    },
    currentDay: 1,
    nextProfileNumber: 1,
    rumors: [],
    treasuresStolen: 0,
    kingdomFacts: [],
    lostCartographerReports: 0,
  };
}

export function advanceWorldDay(world: RunWorldMemory, days: number): number {
  world.currentDay += Math.max(1, Math.floor(days));
  return world.currentDay;
}

export function recoverAvailableProfiles(world: RunWorldMemory): void {
  Object.values(world.profiles).forEach((profile) => {
    if (!profile.recoveryState) {
      profile.recoveryState = profile.lifeStatus === 'injured' ? 'injured' : 'available';
      profile.recoveryExpeditionsRemaining = profile.lifeStatus === 'injured' ? 1 : 0;
      profile.lastRecoveryReason = null;
      profile.lastRecoveryWave = null;
    }

    if (profile.recoveryState !== 'available' && profile.recoveryExpeditionsRemaining <= 0) {
      markProfileAvailable(profile);
    }
  });
}

export function advanceUnavailableSurvivorRecoveries(world: RunWorldMemory, selectedProfileIds: Set<string>): void {
  world.survivorProfileIds
    .map((id) => world.profiles[id])
    .filter((profile): profile is AdventurerProfile => Boolean(profile))
    .forEach((profile) => {
      if (
        selectedProfileIds.has(profile.id) ||
        profile.lifeStatus === 'dead' ||
        profile.lifeStatus === 'retired' ||
        profile.recoveryState === 'available'
      ) {
        return;
      }

      profile.recoveryExpeditionsRemaining = Math.max(0, profile.recoveryExpeditionsRemaining - 1);

      if (profile.recoveryExpeditionsRemaining <= 0) {
        markProfileAvailable(profile);
      }
    });
}

export function releaseUndeployedExpedition(world: RunWorldMemory, profileId: string): void {
  const profile = world.profiles[profileId];

  if (!profile || profile.availability !== 'onExpedition') {
    return;
  }

  profile.availability = 'available';
  profile.availableNextExpedition = true;
  profile.expeditionCount = Math.max(0, profile.expeditionCount - 1);
}

export function activateProfileForExpedition(
  world: RunWorldMemory,
  profileId: string,
  wave: number,
): AdventurerProfile | null {
  const profile = world.profiles[profileId];

  if (!profile || profile.lifeStatus === 'dead' || profile.lifeStatus === 'retired') {
    return null;
  }

  if (!profile.availableNextExpedition || profile.availability === 'recovering' || profile.recoveryState !== 'available') {
    return null;
  }

  if (profile.availability === 'available' && profile.survivedExpeditions > 0) {
    profile.legacyHooks.push({
      type: 'returningSurvivor',
      description: `${profile.name} revient dans le donjon avec une tres mauvaise idee appelee experience.`,
      wave,
    });
  }

  profile.availability = 'onExpedition';
  profile.availableNextExpedition = false;
  profile.expeditionCount += 1;
  return profile;
}

export function recordProfileDeath(
  world: RunWorldMemory,
  profileId: string,
  wave: number,
  note: string,
): ExpeditionRecord | null {
  const profile = world.profiles[profileId];

  if (!profile || profile.lifeStatus === 'dead') {
    return null;
  }

  profile.deathWave = wave;
  profile.legacyHooks.push({
    type: 'inspiredRelative',
    description: `${profile.name} devient une histoire utile pour motiver un proche plus rancunier.`,
    wave,
  });
  if (!world.deadProfileIds.includes(profile.id)) {
    world.deadProfileIds.push(profile.id);
  }
  world.survivorProfileIds = world.survivorProfileIds.filter((id) => id !== profile.id);
  return completeProfileExpedition(world, profile, wave, 'died', note);
}

export function recordProfileSurvival(
  world: RunWorldMemory,
  profileId: string,
  wave: number,
  note: string,
  injury: AdventurerInjury | null = null,
  recoveryContext: SurvivorRecoveryContext | null = null,
): ExpeditionRecord | null {
  const profile = world.profiles[profileId];

  if (!profile || profile.lifeStatus === 'dead') {
    return null;
  }

  profile.reputation += 2;
  profile.trauma += injury ? 1 : 0;

  if (injury) {
    profile.injuries.push(injury);
  }

  const recovery = determineSurvivorRecovery(profile, injury, recoveryContext);
  applySurvivorRecovery(profile, recovery.state, wave, recovery.reason);

  return completeProfileExpedition(world, profile, wave, 'survived', note);
}

export function recordBossDefeatSurvivors(world: RunWorldMemory, profileIds: string[], wave: number): ExpeditionRecord[] {
  return profileIds
    .map((profileId) => {
      const profile = world.profiles[profileId];

      if (!profile || profile.lifeStatus === 'dead') {
        return null;
      }

      profile.reputation += 3;
      applySurvivorRecovery(profile, 'available', wave, `${profile.name} insiste pour rester dans les contrats apres la chute du boss.`);
      profile.legacyHooks.push({
        type: 'lostItem',
        description: `${profile.name} jure avoir laisse quelque chose d'important dans le donjon.`,
        wave,
      });

      return completeProfileExpedition(
        world,
        profile,
        wave,
        'bossDefeated',
        `${profile.name} survit a la chute du boss.`,
      );
    })
    .filter((record): record is ExpeditionRecord => record !== null);
}

export function updateDungeonReputation(world: RunWorldMemory, delta: number, reason: string): number {
  const previous = world.dungeonReputation.value;
  world.dungeonReputation.value = Math.max(0, previous + delta);
  world.dungeonReputation.title = reputationTitle(world.dungeonReputation.value);
  world.dungeonReputation.lastChangeReason = reason;
  return world.dungeonReputation.value - previous;
}

export function addChronicle(world: RunWorldMemory, text: string): void {
  const line: string = text.trim();

  if (!line || world.chronicles.some((entry) => entry.day === world.currentDay && entry.text === line)) {
    return;
  }

  world.chronicles.push({ day: world.currentDay, text: line });
}

export function recordProfileTrapTriggered(world: RunWorldMemory, profileId: string): void {
  const profile = world.profiles[profileId];

  if (!profile) {
    return;
  }

  profile.trapsTriggered += 1;
  profile.experience += 1;
  updateLevel(profile);
}

export function recordProfileMonsterKill(world: RunWorldMemory, profileId: string): void {
  const profile = world.profiles[profileId];

  if (!profile) {
    return;
  }

  profile.monstersKilled += 1;
  profile.experience += 3;
  updateLevel(profile);
}

export function recordProfileNemesis(world: RunWorldMemory, profileId: string, defenseType: DefenseType): void {
  const profile = world.profiles[profileId];

  if (profile) {
    profile.nemesisDefenseType = defenseType;
  }
}

export function createInjury(profileName: string, causedBy: string, hpRatio: number): AdventurerInjury | null {
  if (hpRatio > 0.55) {
    return null;
  }

  const serious = hpRatio < 0.28;
  return {
    name: serious ? 'Blessure grave' : 'Blessure legere',
    severity: serious ? 'serious' : 'minor',
    performanceMultiplier: serious ? 0.86 : 0.94,
    recoveryDays: serious ? 9 : 4,
    causedBy: `${causedBy} a laisse ${profileName} dans un etat narrativement rentable.`,
  };
}

export function createAdventurerProfile(
  role: AdventurerRole,
  world: RunWorldMemory,
  wave: number,
  index: number,
): AdventurerProfile {
  const profileNumber = world.nextProfileNumber;
  world.nextProfileNumber += 1;
  const firstName = createUniqueFirstName(role, world, wave, index, profileNumber);
  const familyName = FAMILY_NAMES[(wave + index + profileNumber) % FAMILY_NAMES.length] ?? 'Sansnom';
  const traits = createTraits(role, wave, index, profileNumber);
  const dominantPersonality = traits[0] ?? 'courageous';

  return {
    id: `profile-${profileNumber}`,
    role,
    firstName,
    name: `${firstName} ${familyName}`,
    className: ADVENTURER_DEFINITIONS[role].name,
    age: 18 + ((profileNumber * 7 + wave + index) % 38),
    level: 1,
    experience: 0,
    dominantPersonality,
    lifeStatus: 'alive',
    availability: 'available',
    availableNextExpedition: true,
    recoveryState: 'available',
    recoveryExpeditionsRemaining: 0,
    lastRecoveryReason: null,
    lastRecoveryWave: null,
    traits,
    guildId: GUILD_ID,
    realmId: REALM_ID,
    reputation: wave > 3 ? 1 : 0,
    firstAppearanceDay: world.currentDay,
    expeditionCount: 0,
    survivedExpeditions: 0,
    victories: 0,
    defeats: 0,
    monstersKilled: 0,
    trapsTriggered: 0,
    doorsEncountered: 0,
    doorsPicked: 0,
    bossEncounters: 0,
    trauma: 0,
    returnAvailableDay: world.currentDay,
    injuries: [],
    nemesisDefenseType: null,
    deathWave: null,
    relations: [],
    legacyHooks: [],
    expeditionHistory: [],
    heirOfProfileId: null,
    heirSpawned: false,
    treasureStolenCount: 0,
    lastLootedGold: 0,
    totalLootedGold: 0,
    notableLootEscapeCount: 0,
    specialTreasureBonuses: [],
  };
}

const HEIR_FIRST_NAMES: Record<AdventurerRole, string[]> = {
  warrior: ['Vindictus', 'Represaille', 'Serment'],
  thief: ['Revanche', 'Ombrage', 'Rancoeur'],
  mage: ['Memoriam', 'Cendrier', 'Requiem'],
  healer: ['Promesse', 'Relique', 'Veillee'],
  cartographer: ['Palimpseste', 'Releve', 'Retrouve'],
};

export function createHeirProfile(
  world: RunWorldMemory,
  fallen: AdventurerProfile,
  wave: number,
): AdventurerProfile {
  const profileNumber = world.nextProfileNumber;
  world.nextProfileNumber += 1;
  const pool = HEIR_FIRST_NAMES[fallen.role];
  const baseName = pool[profileNumber % pool.length] ?? fallen.firstName;
  let firstName = baseName;
  let suffix = 2;

  while (world.usedNames.includes(firstName)) {
    firstName = `${baseName}${suffix}`;
    suffix += 1;
  }

  world.usedNames.push(firstName);
  const familyName = fallen.name.split(' ').slice(1).join(' ') || 'Sansnom';
  const traits: AdventurerTrait[] = ['vengeful'];

  if (fallen.traits.includes('famous')) {
    traits.push('famous');
  }

  const heir: AdventurerProfile = {
    id: `profile-${profileNumber}`,
    role: fallen.role,
    firstName,
    name: `${firstName} ${familyName}`,
    className: ADVENTURER_DEFINITIONS[fallen.role].name,
    age: Math.max(16, fallen.age - 12),
    level: Math.max(1, Math.min(6, fallen.level - 1)),
    experience: Math.max(0, Math.floor(fallen.experience / 2)),
    dominantPersonality: 'vengeful',
    lifeStatus: 'alive',
    availability: 'available',
    availableNextExpedition: true,
    recoveryState: 'available',
    recoveryExpeditionsRemaining: 0,
    lastRecoveryReason: null,
    lastRecoveryWave: null,
    traits,
    guildId: fallen.guildId,
    realmId: fallen.realmId,
    reputation: Math.floor(fallen.reputation / 2) + 1,
    firstAppearanceDay: world.currentDay,
    expeditionCount: 0,
    survivedExpeditions: 0,
    victories: 0,
    defeats: 0,
    monstersKilled: 0,
    trapsTriggered: 0,
    doorsEncountered: 0,
    doorsPicked: 0,
    bossEncounters: 0,
    trauma: 0,
    returnAvailableDay: world.currentDay,
    injuries: [],
    nemesisDefenseType: fallen.nemesisDefenseType,
    deathWave: null,
    relations: [
      {
        kind: 'parent',
        targetProfileId: fallen.id,
        note: `${firstName} vient venger ${fallen.name}, tombe vague ${fallen.deathWave ?? wave}.`,
      },
    ],
    legacyHooks: [],
    expeditionHistory: [],
    heirOfProfileId: fallen.id,
    heirSpawned: false,
    treasureStolenCount: 0,
    lastLootedGold: 0,
    totalLootedGold: 0,
    notableLootEscapeCount: 0,
    specialTreasureBonuses: [],
  };

  fallen.heirSpawned = true;
  fallen.relations.push({
    kind: 'child',
    targetProfileId: heir.id,
    note: `${heir.name} a jure vengeance.`,
  });
  world.profiles[heir.id] = heir;
  addChronicle(world, `${heir.name} entre dans le donjon pour venger ${fallen.name}.`);
  return heir;
}

export function pickFallenForHeir(
  world: RunWorldMemory,
  role: AdventurerRole,
  wave: number,
): AdventurerProfile | null {
  if (wave < 3) {
    return null;
  }

  return (
    world.deadProfileIds
      .map((id) => world.profiles[id])
      .filter((profile): profile is AdventurerProfile => Boolean(profile))
      .filter(
        (profile) =>
          profile.role === role &&
          !profile.heirSpawned &&
          profile.deathWave !== null &&
          profile.deathWave <= wave - 1,
      )
      .sort(
        (a, b) =>
          b.reputation - a.reputation ||
          b.expeditionCount - a.expeditionCount ||
          (a.deathWave ?? 0) - (b.deathWave ?? 0),
      )[0] ?? null
  );
}

export function recordTreasureTheft(world: RunWorldMemory, profileId: string, lootedGold = 0): void {
  const profile = world.profiles[profileId];
  world.treasuresStolen += 1;

  if (!profile) {
    return;
  }

  profile.treasureStolenCount += 1;
  profile.reputation += 4;
  profile.experience += 6;

  if (lootedGold > 0) {
    profile.lastLootedGold = lootedGold;
    profile.totalLootedGold += lootedGold;
    profile.notableLootEscapeCount += 1;
  }

  updateLevel(profile);
  addChronicle(
    world,
    lootedGold > 0
      ? `${profile.name} s'enfuit avec ${lootedGold} or du donjon. La Guilde appelle ca une preuve de competence.`
      : `${profile.name} s'enfuit avec le tresor du donjon. Humiliation comptable.`,
  );
}

export function recordProfileDoorEncounter(world: RunWorldMemory, profileId: string): void {
  const profile = world.profiles[profileId];

  if (profile) {
    profile.doorsEncountered += 1;
  }
}

export function recordProfileDoorPicked(world: RunWorldMemory, profileId: string): void {
  const profile = world.profiles[profileId];

  if (!profile) {
    return;
  }

  profile.doorsPicked += 1;
  profile.experience += 1;
  updateLevel(profile);
}

export function recordProfileBossEncounter(world: RunWorldMemory, profileId: string): void {
  const profile = world.profiles[profileId];

  if (profile) {
    profile.bossEncounters += 1;
  }
}

export function getReturningSurvivorCandidates(
  world: RunWorldMemory,
  limit = PARTY_SIZE,
): AdventurerProfile[] {
  recoverAvailableProfiles(world);

  return (
    world.survivorProfileIds
      .map((id) => world.profiles[id])
      .filter((profile): profile is AdventurerProfile => Boolean(profile))
      .filter((profile) =>
        profile.availableNextExpedition &&
        profile.availability === 'available' &&
        profile.recoveryState === 'available' &&
        profile.lifeStatus !== 'dead' &&
        profile.lifeStatus !== 'retired',
      )
      .sort(
        (a, b) =>
          b.survivedExpeditions - a.survivedExpeditions ||
          b.expeditionCount - a.expeditionCount ||
          b.reputation - a.reputation,
      )
      .slice(0, limit)
  );
}

export function getUnavailableSurvivorReports(world: RunWorldMemory): SurvivorAbsenceReport[] {
  recoverAvailableProfiles(world);

  return world.survivorProfileIds
    .map((id) => world.profiles[id])
    .filter((profile): profile is AdventurerProfile => Boolean(profile))
    .filter((profile) =>
      profile.lifeStatus !== 'dead' &&
      profile.lifeStatus !== 'retired' &&
      profile.recoveryState !== 'available',
    )
    .map((profile) => ({
      profileId: profile.id,
      name: profile.name,
      role: profile.role,
      state: profile.recoveryState as Exclude<SurvivorRecoveryState, 'available'>,
      label: recoveryLabel(profile.recoveryState),
      remainingExpeditions: profile.recoveryExpeditionsRemaining,
      note: profile.lastRecoveryReason ?? recoveryFallbackNote(profile),
    }));
}

function createUniqueFirstName(
  role: AdventurerRole,
  world: RunWorldMemory,
  wave: number,
  index: number,
  profileNumber: number,
): string {
  const firstNames = FIRST_NAMES[role];
  const baseName = firstNames[(index + profileNumber + wave) % firstNames.length] ?? ADVENTURER_DEFINITIONS[role].name;
  let name = baseName;
  let suffix = 2;

  while (world.usedNames.includes(name)) {
    name = `${baseName}${suffix}`;
    suffix += 1;
  }

  world.usedNames.push(name);
  return name;
}

function createTraits(
  role: AdventurerRole,
  wave: number,
  index: number,
  profileNumber: number,
): AdventurerTrait[] {
  const traits = new Set<AdventurerTrait>();
  traits.add(TRAIT_CYCLE[(wave + index + profileNumber) % TRAIT_CYCLE.length] ?? 'courageous');

  if (role === 'thief') {
    traits.add('greedy');
  }

  if (role === 'warrior' && wave >= 2) {
    traits.add('courageous');
  }

  if (role === 'healer') {
    traits.add('cautious');
  }

  if (role === 'cartographer') {
    traits.add('cautious');
  }

  return [...traits];
}

function completeProfileExpedition(
  world: RunWorldMemory,
  profile: AdventurerProfile,
  wave: number,
  outcome: ExpeditionOutcome,
  note: string,
): ExpeditionRecord {
  if (outcome === 'died') {
    profile.lifeStatus = 'dead';
    profile.availability = 'available';
    profile.availableNextExpedition = false;
    profile.recoveryState = 'available';
    profile.recoveryExpeditionsRemaining = 0;
    profile.defeats += 1;
  } else {
    if (profile.recoveryState === 'available') {
      profile.lifeStatus = 'alive';
      profile.availability = 'available';
      profile.availableNextExpedition = true;
    } else if (profile.recoveryState === 'injured') {
      profile.lifeStatus = 'injured';
      profile.availability = 'recovering';
      profile.availableNextExpedition = false;
    } else {
      profile.lifeStatus = 'alive';
      profile.availability = 'recovering';
      profile.availableNextExpedition = false;
    }

    profile.survivedExpeditions += 1;
    profile.victories += outcome === 'bossDefeated' ? 1 : 0;
    profile.experience += outcome === 'bossDefeated' ? 5 : 2;
    updateLevel(profile);

    if (!world.survivorProfileIds.includes(profile.id)) {
      world.survivorProfileIds.push(profile.id);
    }
  }

  const record: ExpeditionRecord = {
    wave,
    day: world.currentDay,
    profileId: profile.id,
    adventurerName: profile.name,
    role: profile.role,
    outcome,
    note,
  };

  profile.expeditionHistory.push(record);
  world.expeditionHistory.push(record);
  return record;
}

function determineSurvivorRecovery(
  profile: AdventurerProfile,
  injury: AdventurerInjury | null,
  context: SurvivorRecoveryContext | null,
): { state: SurvivorRecoveryState; reason: string | null } {
  if (!context) {
    return injury
      ? {
        state: 'injured',
        reason: `${profile.name} restera a l'infirmerie pour la prochaine expedition.`,
      }
      : { state: 'available', reason: null };
  }

  const veteran = profile.survivedExpeditions >= SURVIVOR_RECOVERY_BALANCE.veteranSurvivedExpeditions || profile.level >= 3;

  if (context.hpRatio <= SURVIVOR_RECOVERY_BALANCE.lowHpInjuryThreshold || injury?.severity === 'serious') {
    return {
      state: 'injured',
      reason: `${profile.name} tient a peine debout. Une expedition de repos medical s'impose.`,
    };
  }

  if (context.hpRatio <= SURVIVOR_RECOVERY_BALANCE.moderateHpRestThreshold || injury) {
    if (veteran || context.escapedWithSpecialTreasure) {
      return {
        state: 'available',
        reason: `${profile.name} insiste pour repartir malgre les bandages.`,
      };
    }

    return {
      state: 'resting',
      reason: `${profile.name} survivra mieux en ratant le prochain contrat.`,
    };
  }

  const traumatic =
    context.alliesKilled >= SURVIVOR_RECOVERY_BALANCE.highCasualtyShakenDeaths ||
    context.groupRetreated ||
    context.bossDamageTaken >= SURVIVOR_RECOVERY_BALANCE.violentBossDamageThreshold;

  if (traumatic && !veteran && !context.escapedWithSpecialTreasure) {
    return {
      state: 'shaken',
      reason: `${profile.name} refuse de redescendre tout de suite apres ce qu'il a vu.`,
    };
  }

  if (traumatic && veteran) {
    return {
      state: 'available',
      reason: `${profile.name} a vu pire et insiste pour repartir.`,
    };
  }

  return { state: 'available', reason: null };
}

function applySurvivorRecovery(
  profile: AdventurerProfile,
  state: SurvivorRecoveryState,
  wave: number,
  reason: string | null,
): void {
  profile.recoveryState = state;
  profile.lastRecoveryReason = reason;
  profile.lastRecoveryWave = reason ? wave : null;

  switch (state) {
    case 'injured':
      profile.lifeStatus = 'injured';
      profile.availability = 'recovering';
      profile.availableNextExpedition = false;
      profile.recoveryExpeditionsRemaining = SURVIVOR_RECOVERY_BALANCE.injuredRecoveryExpeditions;
      profile.trauma += 1;
      break;
    case 'resting':
      profile.lifeStatus = 'alive';
      profile.availability = 'recovering';
      profile.availableNextExpedition = false;
      profile.recoveryExpeditionsRemaining = SURVIVOR_RECOVERY_BALANCE.restingRecoveryExpeditions;
      break;
    case 'shaken':
      profile.lifeStatus = 'alive';
      profile.availability = 'recovering';
      profile.availableNextExpedition = false;
      profile.recoveryExpeditionsRemaining = SURVIVOR_RECOVERY_BALANCE.shakenRecoveryExpeditions;
      profile.trauma += 1;
      break;
    case 'available':
    default:
      profile.lifeStatus = 'alive';
      profile.availability = 'available';
      profile.availableNextExpedition = true;
      profile.recoveryExpeditionsRemaining = 0;
      break;
  }
}

function markProfileAvailable(profile: AdventurerProfile): void {
  if (profile.lifeStatus !== 'dead' && profile.lifeStatus !== 'retired') {
    profile.lifeStatus = 'alive';
    profile.availability = 'available';
    profile.availableNextExpedition = true;
  }

  profile.recoveryState = 'available';
  profile.recoveryExpeditionsRemaining = 0;
}

function recoveryLabel(state: SurvivorRecoveryState): string {
  switch (state) {
    case 'injured':
      return 'Blesse';
    case 'resting':
      return 'Au repos';
    case 'shaken':
      return 'Refuse';
    default:
      return 'Disponible';
  }
}

function recoveryFallbackNote(profile: AdventurerProfile): string {
  switch (profile.recoveryState) {
    case 'injured':
      return `${profile.name} reste a l'infirmerie.`;
    case 'resting':
      return `${profile.name} reprend son souffle pour une expedition.`;
    case 'shaken':
      return `${profile.name} refuse de repartir tout de suite.`;
    default:
      return `${profile.name} est disponible.`;
  }
}

function reputationTitle(value: number): string {
  if (value >= 60) {
    return 'Fleau du Royaume';
  }

  if (value >= 42) {
    return 'Le Donjon Noir';
  }

  if (value >= 28) {
    return 'Forteresse maudite';
  }

  if (value >= 16) {
    return 'Donjon dangereux';
  }

  if (value >= 6) {
    return 'Petit repaire';
  }

  return 'Donjon oublie';
}

function updateLevel(profile: AdventurerProfile): void {
  const nextLevel = Math.min(12, 1 + Math.floor(profile.experience / 8));
  profile.level = Math.max(profile.level, nextLevel);
}
