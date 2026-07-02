export type GamePhase = 'menu' | 'build' | 'wave' | 'report' | 'defeat';

export type DefenseKind = 'trap' | 'minion';

export type DefenseType =
  | 'spikeTrap'
  | 'fireTrap'
  | 'slime'
  | 'skeleton'
  | 'goblin';

export type AdventurerRole = 'warrior' | 'thief' | 'mage' | 'healer';

export type AdventurerTargetStage = 'treasure' | 'boss' | 'exit';

export type ExpeditionPlanType = 'greedy' | 'heroic' | 'cautious' | 'fanatic' | 'mercenary';

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

export interface TreasureState {
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
  alive: boolean;
  aiState: DefenseAIState;
  targetAdventurerId: string | null;
  patrolAngle: number;
  kills: number;
  wavesSurvived: number;
  summoned: boolean;
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
  isHeir: boolean;
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
  abilities: Record<BossAbilityType, BossAbilityState>;
}

export interface AdaptationMemory {
  trapAvoidance: number;
  trapDangerByCell: Record<string, number>;
  rolePressure: Record<AdventurerRole, number>;
}

export interface EffectStats {
  damage: number;
  kills: number;
}

export type DefenseStatsByType = Partial<Record<DefenseType, EffectStats>>;

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
  minionKillsByDefenseId: Record<string, number>;
}

export interface WaveRuntime {
  elapsedMs: number;
  spawnTimerMs: number;
  spawnQueue: AdventurerProfile[];
  spawned: number;
  partyPlan: PartyPlan;
  stats: WaveStats;
}

export interface PartyPlan {
  type: ExpeditionPlanType;
  label: string;
  primaryGoal: AdventurerTargetStage;
  retreating: boolean;
  treasureClaimed: boolean;
  retreatReason: string | null;
}

export interface ReportEntry {
  label: string;
  damage: number;
  kills: number;
}

export interface WaveReport {
  wave: number;
  cleared: boolean;
  durationSeconds: number;
  adventurersKilled: number;
  adventurersEscaped: number;
  bossDamageTaken: number;
  goldAwarded: number;
  trapRefundGold: number;
  treasurePenaltyGold: number;
  preparationBudget: number;
  treasureStolen: boolean;
  dungeonReputation: number;
  reputationDelta: number;
  trapHighlights: ReportEntry[];
  minionHighlights: ReportEntry[];
  storyLines: string[];
  notableAdventurers: string[];
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
  defenses: DefenseEntity[];
  adventurers: AdventurerEntity[];
  boss: BossEntity;
  treasure: TreasureState;
  memory: AdaptationMemory;
  world: RunWorldMemory;
  runtime: WaveRuntime | null;
  report: WaveReport | null;
  message: string;
  paused: boolean;
  gameSpeed: number;
  inspectedAdventurerId: string | null;
}
