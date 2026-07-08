import type {
  AdventurerRole,
  AdventurerTrait,
  BossAbilityType,
  ConstructionTool,
  DungeonTile,
  DungeonTreasure,
  DefenseKind,
  DefenseType,
  DungeonValidation,
  GamePhase,
  SpecialTreasureBonus,
  TreasureStatus,
  WaveReport,
} from './types';

export type ConstructionCategory = 'construction' | 'rooms' | 'objectives';

export interface DefenseUiItem {
  type: DefenseType;
  kind: DefenseKind;
  name: string;
  description: string;
  cost: number;
  color: string;
  disabled: boolean;
}

export interface ConstructionUiItem {
  type: ConstructionTool;
  name: string;
  description: string;
  category: ConstructionCategory;
  cost: number | null;
  disabled: boolean;
}

export interface CountItem {
  label: string;
  count: number;
}

export interface DoorSummary {
  active: number;
  locked: number;
  opened: number;
  beingPicked: number;
}

export interface DungeonFloorUiItem {
  id: string;
  label: string;
  depth: number;
}

export interface BossAbilityUiItem {
  type: BossAbilityType;
  name: string;
  shortName: string;
  description: string;
  cooldownRemainingMs: number;
  cooldownMs: number;
  usesLeft: number;
  ready: boolean;
}

export interface InspectedAdventurer {
  name: string;
  className: string;
  level: number;
  age: number;
  personality: string;
  traits: AdventurerTrait[];
  hp: number;
  maxHp: number;
  damage: number;
  expeditionCount: number;
  survivedExpeditions: number;
  monstersKilled: number;
  trapsTriggered: number;
  doorsEncountered: number;
  doorsPicked: number;
  bossEncounters: number;
  totalLootedGold: number;
  injuries: string[];
  isHeir: boolean;
  heirNote: string | null;
  carryingTreasure: boolean;
  specialTreasureBonuses: SpecialTreasureBonus[];
  specialTreasureEffects: string[];
  lastFeat: string | null;
}

export interface NamedMinionUiItem {
  name: string;
  typeName: string;
  kills: number;
  wavesSurvived: number;
}

export interface MenuSnapshot {
  phase: 'menu';
}

export interface DungeonSnapshot {
  phase: Exclude<GamePhase, 'menu'>;
  wave: number;
  gold: number;
  dungeonMaps: DungeonFloorUiItem[];
  currentMapId: string;
  currentMapLabel: string;
  expeditionMapId: string;
  selectedDefense: DefenseType | null;
  selectedConstructionTool: ConstructionTool | null;
  bossHp: number;
  bossMaxHp: number;
  message: string;
  dungeonReputation: number;
  dungeonReputationTitle: string;
  constructionTools: ConstructionUiItem[];
  availableDefenses: DefenseUiItem[];
  dungeonTiles: DungeonTile[];
  territoryByType: CountItem[];
  digCost: number;
  doorSummary: DoorSummary;
  dungeonValidation: DungeonValidation;
  expeditionLabel: string;
  expeditionPrimaryGoal: string;
  adventurersByRole: CountItem[];
  defensesByKind: CountItem[];
  activeAdventurerNames: string[];
  recentJournal: string[];
  recentChronicles: string[];
  liveAdventurers: number;
  nextWaveSize: number;
  nextExpeditionReturningNames: string[];
  nextExpeditionHeldBackNames: string[];
  nextExpeditionImposedRoleNote: string | null;
  nextExpeditionNewVolunteers: number;
  nextExpeditionVeteranName: string | null;
  canLaunchWave: boolean;
  report: WaveReport | null;
  survivedWaves: number;
  bossAbilities: BossAbilityUiItem[];
  paused: boolean;
  gameSpeed: number;
  treasureStatus: TreasureStatus;
  treasureCarrierName: string | null;
  treasures: DungeonTreasure[];
  safeZoneRadius: number;
  recentRumors: string[];
  inspectedAdventurer: InspectedAdventurer | null;
  namedMinions: NamedMinionUiItem[];
  bossAutopilotIntent: string | null;
  bossLastAbilityName: string | null;
}

export type UiSnapshot = MenuSnapshot | DungeonSnapshot;

export type UiAction =
  | { type: 'start-game' }
  | { type: 'select-map'; mapId: string }
  | { type: 'select-construction'; constructionType: ConstructionTool }
  | { type: 'select-defense'; defenseType: DefenseType }
  | { type: 'launch-wave' }
  | { type: 'continue-build' }
  | { type: 'restart' }
  | { type: 'use-ability'; abilityType: BossAbilityType }
  | { type: 'toggle-pause' }
  | { type: 'set-speed'; speed: number }
  | { type: 'close-inspection' }
  | { type: 'tavern-advance' }
  | { type: 'tavern-skip' };

export interface TavernProgressState {
  revealedCount: number;
  totalBeats: number;
  fullyRevealed: boolean;
}

export type RoleCountMap = Record<AdventurerRole, number>;
