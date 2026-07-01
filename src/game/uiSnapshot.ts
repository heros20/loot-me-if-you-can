import type { AdventurerRole, DefenseKind, DefenseType, GamePhase, WaveReport } from './types';

export interface DefenseUiItem {
  type: DefenseType;
  kind: DefenseKind;
  name: string;
  description: string;
  cost: number;
  color: string;
  disabled: boolean;
}

export interface CountItem {
  label: string;
  count: number;
}

export interface MenuSnapshot {
  phase: 'menu';
}

export interface DungeonSnapshot {
  phase: Exclude<GamePhase, 'menu'>;
  wave: number;
  gold: number;
  selectedDefense: DefenseType | null;
  bossHp: number;
  bossMaxHp: number;
  message: string;
  dungeonReputation: number;
  dungeonReputationTitle: string;
  availableDefenses: DefenseUiItem[];
  adventurersByRole: CountItem[];
  defensesByKind: CountItem[];
  activeAdventurerNames: string[];
  recentJournal: string[];
  recentChronicles: string[];
  liveAdventurers: number;
  nextWaveSize: number;
  canLaunchWave: boolean;
  report: WaveReport | null;
  survivedWaves: number;
}

export type UiSnapshot = MenuSnapshot | DungeonSnapshot;

export type UiAction =
  | { type: 'start-game' }
  | { type: 'select-defense'; defenseType: DefenseType }
  | { type: 'launch-wave' }
  | { type: 'continue-build' }
  | { type: 'restart' };

export type RoleCountMap = Record<AdventurerRole, number>;
