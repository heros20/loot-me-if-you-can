export type GamePhase = 'menu' | 'build' | 'wave' | 'report' | 'defeat';

export type DefenseKind = 'trap' | 'minion';

export type DefenseType =
  | 'spikeTrap'
  | 'fireTrap'
  | 'roomLockTrap'
  | 'slime'
  | 'skeleton'
  | 'goblin'
  | 'guardian';

export type TileType = 'rock' | 'floor' | 'room' | 'entrance' | 'treasure' | 'throne';

export type RoomSpecialization = 'guardRoom' | 'crypt' | 'treasureRoom' | 'throneRoom';

export type ConstructionTool =
  | 'dig'
  | 'reseal'
  | 'guardRoom'
  | 'crypt'
  | 'door'
  | 'removeDoor'
  | 'moveBoss'
  | 'moveTreasure'
  | 'addGoldTreasure'
  | 'addWeaponTreasure'
  | 'addArmorTreasure'
  | 'addTechniqueTreasure'
  | 'removeTreasure'
  | 'collectRemainsLoot';

export type AdventurerRole = 'warrior' | 'thief' | 'mage' | 'healer' | 'cartographer';

export type AdventurerTargetStage = 'treasure' | 'boss' | 'exit';
export type AdventurerRetreatIntent = 'none' | 'followRetreat' | 'coverRetreat' | 'panicRetreat' | 'disobey';
export type AdventurerBehaviorState =
  | 'advancing'
  | 'regrouping'
  | 'evaluatingRoom'
  | 'exploring'
  | 'waitingForTank'
  | 'securingArea'
  | 'opportunisticLoot'
  | 'mapping'
  | 'bossPreparation'
  | 'backlineHold'
  | 'flankAfterEngage'
  | 'retreating';

export type CombatAbilityId =
  | 'warriorTaunt'
  | 'thiefTrapMitigation'
  | 'healerSingleHeal'
  | 'healerGroupHeal'
  | 'mageIceShard'
  | 'mageFrostZone'
  | 'goblinSneakAttack'
  | 'skeletonHeavyStrike'
  | 'slimeStickyGel';

export type CombatAbilityCooldowns = Partial<Record<CombatAbilityId, number>>;

export type ExpeditionPlanType = 'greedy' | 'heroic' | 'cautious' | 'fanatic' | 'mercenary';
export type PartyGroupObjective = 'seekTreasure' | 'escapeWithTreasure' | 'challengeBoss' | 'retreat' | 'panic';

export type DefenseAIState = 'idle' | 'patrol' | 'chase' | 'return';

export type AdventurerTrait =
  | 'courageous'
  | 'cautious'
  | 'vengeful'
  | 'greedy'
  | 'traumatized'
  | 'famous';

export type AdventurerPersonality = AdventurerTrait;

export type RelationshipKind =
  | 'parent'
  | 'child'
  | 'mentor'
  | 'rival'
  | 'formerCompanion';

export type AdventurerLifeStatus = 'alive' | 'injured' | 'missing' | 'dead' | 'retired';

export type BossAbilityType = 'shockwave' | 'roar' | 'summon';

export type RumorEffect =
  | 'greedSurge'
  | 'cautionSurge'
  | 'thiefRecruitment'
  | 'warriorRecruitment'
  | 'healerRecruitment';

export interface TavernRumor {
  wave: number;
  text: string;
  effect: RumorEffect;
}

export type TreasureStatus = 'secure' | 'carried' | 'dropped' | 'stolen';
export type SpecialTreasureKind = 'weapon' | 'armor' | 'technique';
export type DungeonTreasureKind = 'main' | 'gold' | 'specialWeapon' | 'specialArmor' | 'specialTechnique';

export interface SpecialTreasureBonus {
  kind: SpecialTreasureKind;
  label: string;
  sourceTreasureId: string;
  acquiredWave: number;
}

export interface TreasureState {
  status: TreasureStatus;
  holderAdventurerId: string | null;
  droppedCell: GridCell | null;
}

export interface DungeonTreasure {
  id: string;
  mapId: string;
  kind: DungeonTreasureKind;
  cell: GridCell;
  value: number;
  status: TreasureStatus;
  holderAdventurerId: string | null;
  droppedCell: GridCell | null;
}

export type AdventurerAvailability = 'available' | 'onExpedition' | 'recovering';
export type SurvivorRecoveryState = 'available' | 'injured' | 'resting' | 'shaken';

export type ExpeditionOutcome = 'survived' | 'died' | 'bossDefeated';

export type InjurySeverity = 'minor' | 'serious';

export interface GridCell {
  x: number;
  y: number;
}

export type KingdomMemoryFactKind =
  | 'doorSeen'
  | 'trapSeen'
  | 'treasureSeen'
  | 'specialTreasureSeen'
  | 'defenderSeen'
  | 'bossSeen'
  | 'bossReached'
  | 'dangerZone'
  | 'routeBlocked'
  | 'routeChangedSuspected'
  | 'expeditionLost'
  | 'remainsSeen'
  | 'relicRecognized'
  | 'deathSiteKnown'
  | 'dangerousDeathSite'
  | 'bossKilledAdventurerHere'
  | 'trapKilledAdventurerHere'
  | 'zoneReached'
  | 'antechamberSeen'
  | 'guardianSeen'
  | 'guardianFought'
  | 'guardianKilledAdventurer'
  | 'roomLockTrapSeen'
  | 'trappedRoomSurvived'
  | 'dangerousRoomSeen'
  | 'treasureRoomSeen'
  | 'bossApproachKnown'
  | 'dangerousZoneSeen'
  | 'transitionSeen'
  | 'floorReached';

export type KingdomMemoryPrecision = 'vague' | 'room' | 'exact';

export interface KingdomMemoryFact {
  id: string;
  kind: KingdomMemoryFactKind;
  label: string;
  mapId: string | null;
  cell: GridCell | null;
  precision: KingdomMemoryPrecision;
  confidence: number;
  confirmations: number;
  firstSeenWave: number;
  lastSeenWave: number;
  age: number;
  stale: boolean;
  sourceSurvivorProfileId: string | null;
  sourceRole: AdventurerRole | null;
  confirmedByCartographer: boolean;
}

export interface KingdomMemoryObservation {
  kind: KingdomMemoryFactKind;
  label: string;
  mapId?: string | null;
  cell: GridCell | null;
  precision: KingdomMemoryPrecision;
  confidence: number;
  observerProfileId: string;
  observerName: string;
  observerRole: AdventurerRole;
  wave: number;
}

export interface DungeonTile {
  cell: GridCell;
  type: TileType;
  roomType: RoomSpecialization | null;
}

export interface DungeonTransition {
  id: string;
  fromMapId: string;
  fromCell: GridCell;
  toMapId: string;
  toCell: GridCell;
  label: string;
  locked: boolean;
  discoveredByKingdom: boolean;
}

export interface DungeonMap {
  id: string;
  label: string;
  depth: number;
  width: number;
  height: number;
  tiles: DungeonTile[];
  zones: DungeonZone[];
  transitions: DungeonTransition[];
}

export type DungeonZoneType = 'entrance' | 'defense' | 'secondary' | 'antechamber' | 'treasure' | 'boss' | 'corridor';

export interface DungeonZone {
  id: string;
  mapId: string;
  type: DungeonZoneType;
  label: string;
  cells: GridCell[];
  center: GridCell;
  dangerLevel: number;
  optional: boolean;
  required: boolean;
  discoveredByKingdom: boolean;
  guardianId: string | null;
}

export type RelicType =
  | 'ring'
  | 'medallion'
  | 'letter'
  | 'guildBadge'
  | 'brokenWeapon'
  | 'mapFragment'
  | 'scarf'
  | 'pendant'
  | 'notebook'
  | 'token';

export type RelicEmotionalTone = 'fear' | 'revenge' | 'grief' | 'respect' | 'warning';

export type RemainsVisualState = 'fresh' | 'bones' | 'old';

export type RemainsLootKind = 'looseGold' | 'sellableGear' | 'guildSupplies' | 'mapScrap';

export interface RemainsLoot {
  kind: RemainsLootKind;
  label: string;
  description: string;
  goldValue: number;
  claimed: boolean;
}

export interface AdventurerRemains {
  id: string;
  mapId: string;
  ownerProfileId: string;
  ownerName: string;
  ownerRole: AdventurerRole;
  cell: GridCell;
  x: number;
  y: number;
  deathWave: number;
  deathDay: number;
  causeKind: 'trap' | 'minion' | 'boss';
  causeType: DefenseType | 'boss' | null;
  causeLabel: string;
  relicType: RelicType;
  relicLabel: string;
  relicDescription: string;
  emotionalTone: RelicEmotionalTone;
  visualState: RemainsVisualState;
  loot: RemainsLoot;
  discoveredByFutureParty: boolean;
  recognizedByProfileIds: string[];
  reactionCount: number;
}

export interface DungeonDoor {
  id: string;
  mapId: string;
  cell: GridCell;
  locked: boolean;
  openedForExpedition: boolean;
  beingPickedById: string | null;
  pickProgressMs: number;
  pickRequiredMs: number;
  hp: number;
  maxHp: number;
  destroyed: boolean;
  salvageClaimed: boolean;
}

export interface DefenseDefinition {
  type: DefenseType;
  kind: DefenseKind;
  name: string;
  shortName: string;
  description: string;
  cost: number;
  color: string;
  hp?: number;
  damage?: number;
  attackRange?: number;
  attackCooldownMs?: number;
  trapDamage?: number;
  trapCooldownMs?: number;
}

export type DefenseTrapState = 'armed' | 'triggered' | 'disarmed' | 'cleared';

export interface AdventurerDefinition {
  role: AdventurerRole;
  name: string;
  shortName: string;
  color: string;
  hp: number;
  damage: number;
  speed: number;
  attackRange: number;
  attackCooldownMs: number;
  trapDamageMultiplier: number;
  healAmount?: number;
  healRange?: number;
  healCooldownMs?: number;
}

export interface AdventurerRelation {
  kind: RelationshipKind;
  targetProfileId: string;
  note: string;
}

export interface AdventurerLegacyHook {
  type: 'inspiredRelative' | 'returningSurvivor' | 'lostItem';
  description: string;
  wave: number;
}

export interface AdventurerInjury {
  name: string;
  severity: InjurySeverity;
  performanceMultiplier: number;
  recoveryDays: number;
  causedBy: string;
}

export interface AdventurerProfile {
  id: string;
  role: AdventurerRole;
  firstName: string;
  name: string;
  className: string;
  age: number;
  level: number;
  experience: number;
  dominantPersonality: AdventurerPersonality;
  lifeStatus: AdventurerLifeStatus;
  availability: AdventurerAvailability;
  availableNextExpedition: boolean;
  recoveryState: SurvivorRecoveryState;
  recoveryExpeditionsRemaining: number;
  lastRecoveryReason: string | null;
  lastRecoveryWave: number | null;
  traits: AdventurerTrait[];
  guildId: string;
  realmId: string;
  reputation: number;
  firstAppearanceDay: number;
  expeditionCount: number;
  survivedExpeditions: number;
  victories: number;
  defeats: number;
  monstersKilled: number;
  trapsTriggered: number;
  doorsEncountered: number;
  doorsPicked: number;
  bossEncounters: number;
  trauma: number;
  returnAvailableDay: number;
  injuries: AdventurerInjury[];
  nemesisDefenseType: DefenseType | null;
  deathWave: number | null;
  relations: AdventurerRelation[];
  legacyHooks: AdventurerLegacyHook[];
  expeditionHistory: ExpeditionRecord[];
  heirOfProfileId: string | null;
  heirSpawned: boolean;
  treasureStolenCount: number;
  lastLootedGold: number;
  totalLootedGold: number;
  notableLootEscapeCount: number;
  specialTreasureBonuses: SpecialTreasureBonus[];
}

export interface GuildProfile {
  id: string;
  name: string;
  reputation: number;
}

export interface RealmProfile {
  id: string;
  name: string;
  alarm: number;
}

export interface ExpeditionRecord {
  wave: number;
  day: number;
  profileId: string;
  adventurerName: string;
  role: AdventurerRole;
  outcome: ExpeditionOutcome;
  note: string;
}

export interface ChronicleEntry {
  day: number;
  text: string;
}

export interface DungeonReputation {
  value: number;
  threat: number;
  tier: 0 | 1 | 2 | 3 | 4;
  title: string;
  lastChangeReason: string;
  lastThreatReason: string;
}

export interface RunWorldMemory {
  profiles: Record<string, AdventurerProfile>;
  usedNames: string[];
  deadProfileIds: string[];
  survivorProfileIds: string[];
  expeditionHistory: ExpeditionRecord[];
  chronicles: ChronicleEntry[];
  kingdomMemory: KingdomMemory;
  dungeonReputation: DungeonReputation;
  guilds: Record<string, GuildProfile>;
  realms: Record<string, RealmProfile>;
  currentDay: number;
  nextProfileNumber: number;
  rumors: TavernRumor[];
  treasuresStolen: number;
  kingdomFacts: KingdomMemoryFact[];
  lostCartographerReports: number;
}

export type KingdomMemoryFactType =
  | 'lockedDoorSeen'
  | 'trapSeen'
  | 'dangerousRoomSeen'
  | 'treasureSeen'
  | 'specialTreasureSeen'
  | 'bossSeen'
  | 'bossReached'
  | 'defenderSeen'
  | 'partyWipedHere'
  | 'heavyDamageArea'
  | 'routeBlocked'
  | 'routeChangedSuspected';

export interface LegacyKingdomMemoryFact {
  id: string;
  type: KingdomMemoryFactType;
  cell: GridCell | null;
  confidence: number;
  firstSeenWave: number;
  lastSeenWave: number;
  sourceProfileId: string | null;
  sourceName: string;
  confirmations: number;
  danger: number;
  stale: boolean;
  label: string;
  data: Record<string, string | number | boolean | null>;
}

export interface KingdomMemory {
  facts: LegacyKingdomMemoryFact[];
  nextFactId: number;
}

export interface DefenseEntity {
  id: string;
  mapId: string;
  type: DefenseType;
  kind: DefenseKind;
  name: string;
  cell: GridCell;
  homeCell: GridCell;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  cooldownRemainingMs: number;
  abilityCooldowns: CombatAbilityCooldowns;
  abilityFxTimerMs: number;
  slowedTimerMs: number;
  tauntedByAdventurerId: string | null;
  tauntTimerMs: number;
  alive: boolean;
  aiState: DefenseAIState;
  targetAdventurerId: string | null;
  patrolAngle: number;
  chaseTimerMs: number;
  stuckTimerMs: number;
  lastX: number;
  lastY: number;
  kills: number;
  wavesSurvived: number;
  summoned: boolean;
  threatByAdventurerId: Record<string, number>;
  trapState: DefenseTrapState | null;
  roomLockZoneId: string | null;
  roomLockMinionIds: string[];
}

export interface AdventurerEntity {
  id: string;
  mapId: string;
  profileId: string;
  role: AdventurerRole;
  name: string;
  level: number;
  personality: AdventurerPersonality;
  traits: AdventurerTrait[];
  nemesisDefenseType: DefenseType | null;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  attackRange: number;
  attackCooldownMs: number;
  attackTimerMs: number;
  healTimerMs: number;
  abilityCooldowns: CombatAbilityCooldowns;
  abilityFxTimerMs: number;
  damageReductionTimerMs: number;
  thiefTrapInterventionsRemaining: number;
  lockpicksUsedThisExpedition: number;
  maxLockpicksPerExpedition: number;
  trapDamageMultiplier: number;
  injuryPerformanceMultiplier: number;
  speedMultiplier: number;
  slowedTimerMs: number;
  targetStage: AdventurerTargetStage;
  targetTreasureId: string | null;
  behaviorState: AdventurerBehaviorState;
  path: GridCell[];
  lastCellKey: string;
  currentZoneId: string | null;
  lastImportantZoneId: string | null;
  lastEvaluatedRoomKey: string | null;
  alive: boolean;
  escaped: boolean;
  hasEnteredDungeon: boolean;
  carryingTreasure: boolean;
  stunnedTimerMs: number;
  fearTimerMs: number;
  fearPreviousStage: AdventurerTargetStage | null;
  retreatIntent: AdventurerRetreatIntent;
  retreatIntentTimerMs: number;
  hesitationTimerMs: number;
  decisionSpeedMultiplier: number;
  barkText: string | null;
  barkTimerMs: number;
  barkCooldownMs: number;
  lastBarkKey: string | null;
  lastAvoidedTrapKey: string | null;
  lootFeedbackText: string | null;
  lootFeedbackTimerMs: number;
  isHeir: boolean;
  specialTreasureBonuses: SpecialTreasureBonus[];
}

export interface BossAbilityState {
  type: BossAbilityType;
  cooldownRemainingMs: number;
  usesThisWave: number;
}

export interface BossEntity {
  mapId: string;
  homeCell: GridCell;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  damage: number;
  attackRange: number;
  detectionRange: number;
  leashRange: number;
  attackCooldownMs: number;
  attackTimerMs: number;
  targetAdventurerId: string | null;
  tauntedByAdventurerId: string | null;
  tauntTimerMs: number;
  abilities: Record<BossAbilityType, BossAbilityState>;
  threatByAdventurerId: Record<string, number>;
}

export interface AdaptationMemory {
  trapAvoidance: number;
  trapDangerByCell: Record<string, number>;
  rolePressure: Record<AdventurerRole, number>;
  /** Derniere expedition bloquee par une porte faute de voleur vivant. */
  doorBlockedWithoutThief: boolean;
}

export interface EffectStats {
  damage: number;
  kills: number;
}

export type DefenseStatsByType = Partial<Record<DefenseType, EffectStats>>;

export interface CombatAbilityStats {
  warriorTaunts: number;
  warriorProtectedDamage: number;
  thiefTrapMitigations: number;
  thiefTrapOverwhelmed: number;
  healerSingleHeals: number;
  healerGroupHeals: number;
  healerHealing: number;
  mageIceShards: number;
  mageFrostZones: number;
  mageDamage: number;
  mageSlows: number;
  goblinSneakAttacks: number;
  skeletonHeavyStrikes: number;
  slimeStickyGels: number;
  slimeStickyApplications: number;
}

export interface WaveStats {
  adventurersKilled: number;
  adventurersEscaped: number;
  bossDamageTaken: number;
  healingDone: number;
  combatEngagementMs: number;
  trapStats: DefenseStatsByType;
  minionStats: DefenseStatsByType;
  deaths: ExpeditionRecord[];
  survivors: ExpeditionRecord[];
  bossDamageByProfile: Record<string, number>;
  storyEvents: string[];
  chronicleEvents: ChronicleEntry[];
  treasureStolen: boolean;
  abilityUses: number;
  bossAbilityUses: number;
  abilityStats: CombatAbilityStats;
  minionKillsByDefenseId: Record<string, number>;
  doorEncounters: number;
  doorsPicked: number;
  doorNoThiefRetreats: number;
  fleeingTrapAvoidances: number;
  groupRetreats: number;
  coverRetreats: number;
  panicRetreats: number;
  disobeys: number;
  tacticalHesitations: number;
  thiefTrapMitigations: number;
  thiefDoorLeads: number;
  treasureCarrierName: string | null;
  treasureGroupDecision: 'escapeWithTreasure' | 'challengeBoss' | null;
  treasureTargetId: string | null;
  treasureValueStolen: number;
  goldTreasureValueStolen: number;
  specialTreasureLoots: string[];
  observedDoorCells: GridCell[];
  observedTrapCells: GridCell[];
  observedDefenderCells: GridCell[];
  observedSpecialTreasures: Array<{ kind: DungeonTreasureKind; cell: GridCell }>;
  observedBoss: boolean;
  observedRouteChanges: GridCell[];
  heavyDamageCells: Record<string, number>;
  combatFeedbackEvents: number;
  bossEngagementLocks: number;
  opportunisticLoots: number;
  roomEvaluations: number;
  backlineHolds: number;
  cartographyObservations: KingdomMemoryObservation[];
  cartographerObservedFacts: number;
  cartographerSurvivors: number;
  cartographerDeaths: number;
  cartographerReports: number;
  cartographerLostReports: number;
  zoneObservations: number;
  guardianSightings: number;
  guardianFights: number;
  guardianKills: number;
  guardianDeaths: number;
  remainsSeen: number;
  relicsRecognized: number;
  remainsReactionEvents: string[];
}

export type CombatFeedbackKind = 'damage' | 'heal';
export type CombatFeedbackFaction = 'adventurer' | 'monster' | 'boss' | 'trap';
export type CombatFeedbackStyle = 'tank' | 'rogue' | 'caster' | 'healer' | 'cartographer' | 'monster' | 'guardian' | 'boss' | 'trap' | 'heal';

export interface CombatFeedbackEvent {
  id: string;
  mapId: string;
  kind: CombatFeedbackKind;
  amount: number;
  x: number;
  y: number;
  sourceId: string | null;
  sourceName: string;
  sourceFaction: CombatFeedbackFaction;
  sourceRole: AdventurerRole | null;
  sourceType: DefenseType | 'boss' | 'trap' | null;
  targetId: string;
  targetName: string;
  style: CombatFeedbackStyle;
  boostedBySpecial: boolean;
  ageMs: number;
}

export interface BossEngagementState {
  frontlineAdventurerId: string | null;
  firstBossAttackerId: string | null;
  firstBossAttackerRole: AdventurerRole | null;
  lockedForFrontline: boolean;
  preparationAnnounced: boolean;
  fallbackReason: string | null;
}

export interface ExpeditionExplorationTarget {
  mapId: string;
  zoneId: string;
  cell: GridCell;
}

export interface WaveRuntime {
  elapsedMs: number;
  spawnTimerMs: number;
  spawnQueue: AdventurerProfile[];
  partyProfiles: AdventurerProfile[];
  spawned: number;
  partyPlan: PartyPlan;
  stats: WaveStats;
  doorsEngagedIds: Set<string>;
  bossAutopilotTimerMs: number;
  targetTreasureId: string | null;
  bossEngagement: BossEngagementState;
  combatFeedbackEvents: CombatFeedbackEvent[];
  remainsReactedKeys: Set<string>;
  remainsRecognizedKeys: Set<string>;
  roomsSeenThisExpedition: Set<string>;
  roomsEnteredThisExpedition: Set<string>;
  unexploredRooms: Set<string>;
  frontierRooms: Set<string>;
  explorationTarget: ExpeditionExplorationTarget | null;
  explorationChoicesRemaining: number;
}

export interface PartyPlan {
  type: ExpeditionPlanType;
  label: string;
  primaryGoal: AdventurerTargetStage;
  groupObjective: PartyGroupObjective;
  retreating: boolean;
  treasureClaimed: boolean;
  retreatReason: string | null;
}

export interface ReportEntry {
  label: string;
  damage: number;
  kills: number;
}

export interface DungeonValidation {
  valid: boolean;
  reason: string | null;
  entryToTreasure: boolean;
  treasureToBoss: boolean;
}

export interface ExpeditionParticipantReport {
  name: string;
  role: AdventurerRole;
  level: number;
  status: 'mort' | 'survivant' | 'blesse' | 'fuite' | 'disparu';
  note: string;
}

export interface SurvivorAbsenceReport {
  profileId: string;
  name: string;
  role: AdventurerRole;
  state: Exclude<SurvivorRecoveryState, 'available'> | 'tacticalReserve';
  label: string;
  remainingExpeditions: number;
  note: string;
}

export interface ChronicleBadge {
  label: string;
  value: string;
  tone: 'neutral' | 'good' | 'bad' | 'warning';
}

export interface SurvivorChronicle {
  title: string;
  subtitle: string;
  hasSurvivors: boolean;
  lines: string[];
  badges: ChronicleBadge[];
  tacticalSummary: string;
}

export type GuildSceneMood = 'triumphant' | 'grim' | 'somber' | 'tense' | 'neutral';

export type GuildTavernSpeakerRole = AdventurerRole | 'guild' | 'rumor';

/**
 * Guild Tavern Scene V2: la scene n'affiche plus des "cartes" de rapport mais
 * des acteurs places dans un vrai espace (table, comptoir, fond de salle).
 */
export type TavernActorKind = 'survivor' | 'npc';

export type TavernActorPose = 'seated' | 'standing' | 'shadow';

export interface TavernActor {
  id: string;
  name: string;
  kind: TavernActorKind;
  role: GuildTavernSpeakerRole;
  level: number | null;
  isVeteran: boolean;
  isReturning: boolean;
  statusLabel: string;
  pose: TavernActorPose;
}

/** Une place a la table de la guilde: soit un survivant assis, soit une chaise vide nommee. */
export interface TavernTableSlot {
  actor: TavernActor | null;
  deadName: string | null;
}

/**
 * Repartition physique des acteurs dans la piece. Produite par
 * guildTavernSceneSystem.ts, consommee telle quelle par le rendu (aucune
 * logique de jeu dans la couche d'affichage).
 */
export interface TavernSceneLayout {
  tableSlots: TavernTableSlot[];
  counterActors: TavernActor[];
  backgroundActors: TavernActor[];
}

/** Un beat de la sequence de dialogue jouee dans la scene. */
export interface TavernBeat {
  id: string;
  actorId: string;
  speakerName: string;
  role: GuildTavernSpeakerRole;
  text: string;
}

export interface GuildTavernSummaryFact {
  label: string;
  value: string;
  tone: 'neutral' | 'good' | 'bad' | 'warning';
}

export interface GuildTavernScene {
  title: string;
  subtitle: string;
  sceneMood: GuildSceneMood;
  hasSurvivors: boolean;
  layout: TavernSceneLayout;
  dead: string[];
  returning: string[];
  newVolunteersCount: number;
  veteran: string | null;
  beats: TavernBeat[];
  summaryFacts: GuildTavernSummaryFact[];
}

export interface WaveReport {
  wave: number;
  cleared: boolean;
  partyLabel: string;
  durationSeconds: number;
  adventurersKilled: number;
  adventurersEscaped: number;
  bossDamageTaken: number;
  goldAwarded: number;
  reputationBonusGold: number;
  trapRefundGold: number;
  treasurePenaltyGold: number;
  treasureProtectedBonusGold: number;
  bossSurvivalBonusGold: number;
  preparationBudget: number;
  abilityUses: number;
  bossAbilityUses: number;
  doorsPicked: number;
  doorNoThiefRetreats: number;
  fleeingTrapAvoidances: number;
  groupRetreats: number;
  coverRetreats: number;
  panicRetreats: number;
  disobeys: number;
  treasureStolen: boolean;
  specialTreasureLoots: string[];
  cartographerSurvivors: number;
  cartographerDeaths: number;
  cartographerReports: number;
  cartographerLostReports: number;
  cartographerLines: string[];
  zoneObservations: number;
  guardianSightings: number;
  guardianFights: number;
  guardianKills: number;
  guardianDeaths: number;
  zoneLines: string[];
  guardianLines: string[];
  remainsSeen: number;
  relicsRecognized: number;
  remainsLines: string[];
  dungeonReputation: number;
  dungeonThreat: number;
  reputationTier: 0 | 1 | 2 | 3 | 4;
  reputationTierName: string;
  reputationDelta: number;
  threatDelta: number;
  runProgressionLines: string[];
  trapHighlights: ReportEntry[];
  minionHighlights: ReportEntry[];
  storyLines: string[];
  learnedLines: string[];
  sharedLines: string[];
  gainsLosses: string[];
  guildChanges: string[];
  economyLines: string[];
  participants: ExpeditionParticipantReport[];
  chronicle: SurvivorChronicle;
  guildTavernScene: GuildTavernScene;
  notableAdventurers: string[];
  kingdomMemoryLines: string[];
  returningSurvivorNames: string[];
  heldBackSurvivorNames: string[];
  unavailableSurvivors: SurvivorAbsenceReport[];
  imposedRoleNote: string | null;
  newVolunteerCount: number;
  veteranName: string | null;
  deaths: string[];
  survivors: string[];
  adaptationNotes: string[];
  verdict: string;
}

export interface GameState {
  phase: GamePhase;
  wave: number;
  gold: number;
  dungeonMaps: DungeonMap[];
  currentMapId: string;
  expeditionMapId: string;
  selectedDefense: DefenseType | null;
  selectedConstructionTool: ConstructionTool | null;
  tiles: DungeonTile[];
  doors: DungeonDoor[];
  defenses: DefenseEntity[];
  adventurers: AdventurerEntity[];
  remains: AdventurerRemains[];
  zones: DungeonZone[];
  boss: BossEntity;
  treasure: TreasureState;
  treasures: DungeonTreasure[];
  memory: AdaptationMemory;
  world: RunWorldMemory;
  runtime: WaveRuntime | null;
  report: WaveReport | null;
  message: string;
  paused: boolean;
  gameSpeed: number;
  inspectedAdventurerId: string | null;
  bossAutopilotIntent: string | null;
  bossLastAbilityName: string | null;
}
