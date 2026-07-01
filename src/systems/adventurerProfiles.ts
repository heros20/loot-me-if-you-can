import type {
  AdventurerProfile,
  AdventurerRole,
  AdventurerTrait,
  AdventurerInjury,
  ExpeditionOutcome,
  ExpeditionRecord,
  RunWorldMemory,
  DefenseType,
} from '../game/types';
import { ADVENTURER_DEFINITIONS } from '../entities/definitions';

const GUILD_ID = 'guild-ashen-contract';
const REALM_ID = 'realm-candlemark';

const FIRST_NAMES: Record<AdventurerRole, string[]> = {
  warrior: ['Bravus', 'Casquor', 'Pavois', 'Martel', 'Bastion', 'Hachelin'],
  thief: ['Filou', 'Rapiat', 'Serrure', 'Velours', 'Griffe', 'Larcin'],
  mage: ['Pyrox', 'Runebert', 'Etincelle', 'Manuscrit', 'Cendrelin', 'Vortex'],
  healer: ['Pansement', 'Misericorde', 'Tisane', 'Baume', 'Clairbaume', 'Onguent'],
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

export function createInitialWorldMemory(): RunWorldMemory {
  return {
    profiles: {},
    usedNames: [],
    deadProfileIds: [],
    survivorProfileIds: [],
    expeditionHistory: [],
    chronicles: [],
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
  };
}

export function advanceWorldDay(world: RunWorldMemory, days: number): number {
  world.currentDay += Math.max(1, Math.floor(days));
  return world.currentDay;
}

export function selectProfilesForWave(
  roles: AdventurerRole[],
  world: RunWorldMemory,
  wave: number,
): AdventurerProfile[] {
  recoverAvailableProfiles(world);
  const selectedIds = new Set<string>();

  return roles.map((role, index) => {
    const survivor = pickReturningSurvivor(role, world, selectedIds, wave, index);

    if (survivor) {
      selectedIds.add(survivor.id);
      return survivor;
    }

    const profile = createAdventurerProfile(role, world, wave, index);
    selectedIds.add(profile.id);
    world.profiles[profile.id] = profile;
    return profile;
  });
}

function recoverAvailableProfiles(world: RunWorldMemory): void {
  Object.values(world.profiles).forEach((profile) => {
    if (
      profile.availability === 'recovering' &&
      profile.lifeStatus === 'injured' &&
      profile.returnAvailableDay <= world.currentDay
    ) {
      profile.availability = 'available';
      profile.lifeStatus = 'alive';
    }
  });
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

  if (profile.availability === 'recovering' && profile.returnAvailableDay > world.currentDay) {
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
): ExpeditionRecord | null {
  const profile = world.profiles[profileId];

  if (!profile || profile.lifeStatus === 'dead') {
    return null;
  }

  profile.reputation += 2;
  profile.trauma += injury ? 1 : 0;

  if (injury) {
    profile.injuries.push(injury);
    profile.lifeStatus = 'injured';
    profile.availability = 'recovering';
    profile.returnAvailableDay = world.currentDay + injury.recoveryDays;
  }

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

function createAdventurerProfile(
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
    trauma: 0,
    returnAvailableDay: world.currentDay,
    injuries: [],
    nemesisDefenseType: null,
    deathWave: null,
    relations: [],
    legacyHooks: [],
    expeditionHistory: [],
  };
}

function pickReturningSurvivor(
  role: AdventurerRole,
  world: RunWorldMemory,
  selectedIds: Set<string>,
  wave: number,
  index: number,
): AdventurerProfile | null {
  if (wave < 2 || index % 3 !== 0) {
    return null;
  }

  return (
    world.survivorProfileIds
      .map((id) => world.profiles[id])
      .filter((profile): profile is AdventurerProfile => Boolean(profile))
      .filter((profile) => profile.role === role && profile.availability === 'available' && !selectedIds.has(profile.id))
      .sort((a, b) => b.survivedExpeditions - a.survivedExpeditions || b.reputation - a.reputation)[0] ?? null
  );
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
    profile.defeats += 1;
  } else {
    if (profile.lifeStatus !== 'injured') {
      profile.lifeStatus = 'alive';
      profile.availability = 'available';
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
