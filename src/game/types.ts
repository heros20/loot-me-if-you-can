export type GamePhase = 'menu' | 'build' | 'wave' | 'report' | 'defeat';

export type DefenseKind = 'trap' | 'minion';

export type DefenseType =
  | 'spikeTrap'
  | 'fireTrap'
  | 'slime'
  | 'skeleton'
  | 'goblin';

export type TileType = 'rock' | 'floor' | 'room' | 'entrance' | 'treasure' | 'throne';

export type RoomSpecialization = 'guardRoom' | 'crypt' | 'treasureRoom' | 'throneRoom';

export type ConstructionTool =
  | 'dig'
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
  | 'removeTreasure';

export type AdventurerRole = 'warrior' | 'thief' | 'mage' | 'healer';

export type AdventurerTargetStage = 'treasure' | 'boss' | 'exit';
export type AdventurerRetreatIntent = 'none' | 'followRetreat' | 'coverRetreat' | 'panicRetreat' | 'disobey';

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
  kind: DungeonTreasureKind;
  cell: GridCell;
  value: number;
  status: TreasureStatus;
  holderAdventurerId: string | null;
  droppedCell: GridCell | null;
}

export type AdventurerAvailability = 'available' | 'onExpedition' | 'recovering';

export type ExpeditionOutcome = 'survived' | 'died' | 'bossDefeated';

export type InjurySeverity = 'minor' | 'serious';

export interface GridCell {
  x: number;
  y: number;
}

export interface DungeonTile {
  cell: GridCell;
  type: TileType;
  roomType: RoomSpecialization | null;
}

export interface DungeonDoor {
  id: string;
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
  title: string;
  lastChangeReason: string;
}

export interface RunWorldMemory {
  profiles: Record<string, AdventurerProfile>;
  usedNames: string[];
  deadProfileIds: string[];
  survivorProfileIds: string[];
  expeditionHistory: ExpeditionRecord[];
  chronicles: ChronicleEntry[];
  dungeonReputation: DungeonReputation;
  guilds: Record<string, GuildProfile>;
  realms: Record<string, RealmProfile>;
  currentDay: number;
  nextProfileNumber: number;
  rumors: TavernRumor[];
  treasuresStolen: number;
}

export interface DefenseEntity {
  id: string;
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
}

export interface AdventurerEntity {
  id: string;
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
  trapDamageMultiplier: number;
  injuryPerformanceMultiplier: number;
  speedMultiplier: number;
  slowedTimerMs: number;
  targetStage: AdventurerTargetStage;
  path: GridCell[];
  lastCellKey: string;
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
  isHeir: boolean;
  specialTreasureBonuses: SpecialTreasureBonus[];
}

export interface BossAbilityState {
  type: BossAbilityType;
  cooldownRemainingMs: number;
  usesThisWave: number;
}

export interface BossEntity {
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
  combatFeedbackEvents: number;
}

export type CombatFeedbackKind = 'damage' | 'heal';
export type CombatFeedbackFaction = 'adventurer' | 'monster' | 'boss' | 'trap';
export type CombatFeedbackStyle = 'tank' | 'rogue' | 'caster' | 'healer' | 'monster' | 'boss' | 'trap' | 'heal';

export interface CombatFeedbackEvent {
  id: string;
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
  ageMs: number;
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
  combatFeedbackEvents: CombatFeedbackEvent[];
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
  dungeonReputation: number;
  reputationDelta: number;
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
  returningSurvivorNames: string[];
  heldBackSurvivorNames: string[];
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
  selectedDefense: DefenseType | null;
  selectedConstructionTool: ConstructionTool | null;
  tiles: DungeonTile[];
  doors: DungeonDoor[];
  defenses: DefenseEntity[];
  adventurers: AdventurerEntity[];
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
