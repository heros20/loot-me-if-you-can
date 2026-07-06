import {
  BOSS_CELL,
  DIG_COST,
  DOOR_COST,
  ENTRY_CELL,
  GOLD_TREASURE_DEFAULT_VALUE,
  MAX_TREASURES_V1,
  PARTY_SIZE,
  SAFE_ZONE_RADIUS,
  STARTING_GOLD,
  TREASURE_CELL,
  cellKey,
  isInEntrySafeZone,
  isInsideGrid,
  isSameCell,
} from './constants';
import {
  canEntityMoveBetween,
  createInitialDungeonTiles,
  getBlockedCellKeys,
  getTileAt,
  setDungeonTile,
  summarizeTiles,
} from './dungeonTiles';
import type {
  AdventurerEntity,
  AdventurerRole,
  BossAbilityType,
  BossEntity,
  ConstructionTool,
  DefenseEntity,
  DefenseStatsByType,
  DefenseType,
  DungeonDoor,
  DungeonTreasure,
  DungeonValidation,
  EffectStats,
  ExpeditionParticipantReport,
  GameState,
  GridCell,
  PartyPlan,
  ReportEntry,
  TreasureState,
  WaveReport,
  WaveRuntime,
  WaveStats,
} from './types';
import type {
  BossAbilityUiItem,
  ConstructionCategory,
  CountItem,
  DoorSummary,
  DungeonSnapshot,
  InspectedAdventurer,
  NamedMinionUiItem,
} from './uiSnapshot';
import {
  ADVENTURER_DEFINITIONS,
  ADVENTURER_ORDER,
  DEFENSE_DEFINITIONS,
  DEFENSE_ORDER,
  getDefenseDefinition,
} from '../entities/definitions';
import { buildWaveRoster, createAdventurer } from '../systems/waveDirector';
import { findPath, hasWalkablePath } from '../systems/pathfinding';
import {
  activateProfileForExpedition,
  addChronicle,
  advanceWorldDay,
  createInjury,
  createInitialWorldMemory,
  getReturningSurvivorCandidates,
  recordBossDefeatSurvivors,
  recordProfileBossEncounter,
  recordProfileDoorEncounter,
  recordProfileDoorPicked,
  recordProfileMonsterKill,
  recordProfileNemesis,
  recordProfileDeath,
  recordProfileSurvival,
  recordProfileTrapTriggered,
  recordTreasureTheft,
  releaseUndeployedExpedition,
  selectProfilesForWave,
  updateDungeonReputation,
} from '../systems/adventurerProfiles';
import { buildWaveStoryLines } from '../systems/narrativeReports';
import { buildSurvivorChronicle } from '../systems/survivorChronicleSystem';
import { chooseBossTarget, updateBossMovement } from '../systems/bossAISystem';
import { updateMonsterAI } from '../systems/monsterAISystem';
import {
  applyPartyDecisions,
  chooseTreasureGroupObjective,
  choosePostTreasureGoal,
  createPartyPlan,
  updatePartyPlan,
} from '../systems/partyAISystem';
import {
  BOSS_ABILITY_DEFINITIONS,
  BOSS_ABILITY_ORDER,
  canUseBossAbility,
  consumeBossAbility,
  createBossAbilities,
  resetBossAbilitiesForWave,
  tickBossAbilities,
} from '../systems/bossAbilities';
import { chooseBossAutopilotAbility } from '../systems/bossAutopilotSystem';
import { evaluateLocalAdventurerDecision } from '../systems/adventurerDecisionSystem';
import {
  COMBAT_ABILITY_BALANCE,
  buildCombatAbilityReportLines,
  createEmptyCombatAbilityStats,
  tickCombatAbilityCooldowns,
  tryUseAdventurerAbility,
  tryUseDefenseAbility,
} from '../systems/combatAbilitySystem';
import {
  computeExpeditionEconomy,
  computeDoorRemovalRefund,
} from '../systems/economyBalance';
import { tickAdventurerBarks, tickGlobalBarks, tryBark } from '../systems/barkSystem';
import type { BarkKind } from '../systems/barkSystem';
import { assignGroupRetreat } from '../systems/partyRetreatSystem';
import { applyRumorPressure, generateTavernRumor, recordRumor } from '../systems/tavernRumors';
import { createMinionName } from '../systems/minionNaming';
import {
  buildRejectionReason,
  canBuildDefenseAt,
  digRockTile,
  hasDefenseOnCell,
  markPlayerRoom,
} from '../systems/dungeonConstruction';
import {
  findActiveDoorAt,
  placeDoorAt,
  repairDoors,
  removeDoorAt,
} from '../systems/doorSystem';

const BOSS_TEMPLATE: Omit<BossEntity, 'hp' | 'attackTimerMs' | 'abilities'> = {
  homeCell: BOSS_CELL,
  x: BOSS_CELL.x,
  y: BOSS_CELL.y,
  maxHp: 340,
  damage: 16,
  attackRange: 1.25,
  // La detection doit depasser la portee du mage (2.55 + 0.3), sinon le boss se fait kiter sans riposter.
  detectionRange: 3.5,
  leashRange: 3.1,
  attackCooldownMs: 760,
  targetAdventurerId: null,
  tauntedByAdventurerId: null,
  tauntTimerMs: 0,
};

const ROOM_TOOL_LABELS: Record<'guardRoom' | 'crypt', string> = {
  guardRoom: 'Salle de garde',
  crypt: 'Crypte',
};

const CONSTRUCTION_TOOLS: Array<{
  type: ConstructionTool;
  name: string;
  description: string;
  category: ConstructionCategory;
  cost: number | null;
  disabled?: boolean;
}> = [
  {
    type: 'dig',
    name: 'Creuser',
    description: `Transforme une roche adjacente en sol. ${DIG_COST} or.`,
    category: 'construction',
    cost: DIG_COST,
  },
  {
    type: 'door',
    name: 'Porte renforcee',
    description: "Bloque un couloir jusqu'a crochetage par un voleur. Serrure reinitialisee entre expeditions.",
    category: 'construction',
    cost: DOOR_COST,
  },
  {
    type: 'removeDoor',
    name: 'Retirer porte',
    description: `Demonte volontairement une porte placee et recupere ${computeDoorRemovalRefund()} or.`,
    category: 'construction',
    cost: null,
  },
  {
    type: 'moveBoss',
    name: 'Deplacer boss',
    description: "Deplace l'ancre du boss sur une case creusee valide, sans casser la route du donjon.",
    category: 'objectives',
    cost: null,
  },
  {
    type: 'moveTreasure',
    name: 'Deplacer tresor',
    description: "Deplace le tresor principal sur une case creusee valide et accessible.",
    category: 'objectives',
    cost: null,
  },
  {
    type: 'addGoldTreasure',
    name: "Ajouter tresor d'or",
    description: `Depose ${GOLD_TREASURE_DEFAULT_VALUE} or comme objectif secondaire. Maximum ${MAX_TREASURES_V1} tresors.`,
    category: 'objectives',
    cost: GOLD_TREASURE_DEFAULT_VALUE,
  },
  {
    type: 'removeTreasure',
    name: 'Retirer tresor',
    description: "Retire un tresor d'or non vole et rembourse sa valeur.",
    category: 'objectives',
    cost: null,
  },
  {
    type: 'guardRoom',
    name: ROOM_TOOL_LABELS.guardRoom,
    description: 'Marque une zone creusee autour de la case.',
    category: 'rooms',
    cost: null,
  },
  {
    type: 'crypt',
    name: ROOM_TOOL_LABELS.crypt,
    description: 'Marque une zone creusee comme crypte.',
    category: 'rooms',
    cost: null,
  },
];

export class DungeonSimulation {
  private state: GameState;
  private nextDefenseId = 1;
  private nextAdventurerId = 1;
  private nextDoorId = 1;
  private nextTreasureId = 1;
  private minionNameCounters: Partial<Record<DefenseType, number>> = {};

  constructor() {
    this.state = this.createInitialState();
  }

  startNewGame(): void {
    this.nextDefenseId = 1;
    this.nextAdventurerId = 1;
    this.nextDoorId = 1;
    this.nextTreasureId = 1;
    this.minionNameCounters = {};
    this.state = this.createInitialState();
  }

  update(rawDeltaMs: number): void {
    if (this.state.phase !== 'wave' || !this.state.runtime || this.state.paused) {
      return;
    }

    const deltaMs = rawDeltaMs * this.state.gameSpeed;
    const runtime = this.state.runtime;
    runtime.elapsedMs += deltaMs;

    this.tickTimers(deltaMs);
    this.spawnAdventurers(deltaMs);
    this.updatePartyDecisions();
    this.updateBossAutopilot(deltaMs);
    this.updateMonsterMovement(deltaMs);
    this.updateDefenders(deltaMs);
    this.updateAdventurers(deltaMs);
    this.removeDeadMinions();
    this.state.adventurers = this.state.adventurers.filter((adventurer) => adventurer.alive && !adventurer.escaped);

    if (this.state.boss.hp <= 0) {
      this.finishDefeat();
      return;
    }

    if (runtime.spawnQueue.length === 0 && this.state.adventurers.length === 0) {
      this.finishWaveVictory();
    }
  }

  togglePause(): void {
    if (this.state.phase !== 'wave') {
      return;
    }

    this.state.paused = !this.state.paused;
    this.state.message = this.state.paused
      ? 'Pause. Meme le mal a besoin de reflechir.'
      : 'Reprise. Le carnage a horreur du vide.';
  }

  setGameSpeed(speed: number): void {
    this.state.gameSpeed = Math.min(3, Math.max(0.5, speed));
  }

  useBossAbility(type: BossAbilityType): boolean {
    if (this.state.phase !== 'wave' || !this.state.runtime || this.state.paused) {
      return false;
    }

    if (!canUseBossAbility(this.state.boss, type)) {
      this.state.message = 'Cette capacite recupere encore. Le talent a des horaires.';
      return false;
    }

    const definition = BOSS_ABILITY_DEFINITIONS[type];
    const boss = this.state.boss;

    if (type === 'shockwave') {
      let touched = 0;
      this.state.adventurers.forEach((adventurer) => {
        if (!adventurer.alive || distance(boss.x, boss.y, adventurer.x, adventurer.y) > definition.radius) {
          return;
        }

        touched += 1;
        adventurer.stunnedTimerMs = Math.max(adventurer.stunnedTimerMs, definition.stunMs ?? 0);
        this.damageAdventurer(adventurer, definition.damage ?? 0, 'boss', null, boss.homeCell);
      });

      this.state.message = touched > 0
        ? `Onde de choc: ${touched} intrus apprennent la gravite.`
        : 'Onde de choc dans le vide. Tres theatral, peu rentable.';
    }

    if (type === 'roar') {
      let feared = 0;
      this.state.adventurers.forEach((adventurer) => {
        if (
          !adventurer.alive ||
          adventurer.targetStage === 'exit' ||
          distance(boss.x, boss.y, adventurer.x, adventurer.y) > definition.radius
        ) {
          return;
        }

        feared += 1;
        adventurer.fearTimerMs = definition.fearMs ?? 0;
        adventurer.fearPreviousStage = adventurer.targetStage;
        adventurer.targetStage = 'exit';
        adventurer.path = [];
      });

      this.state.message = feared > 0
        ? `Rugissement: ${feared} heros redecouvrent la porte d'entree.`
        : 'Rugissement sans public. Le neant ne panique pas.';
    }

    if (type === 'summon') {
      const spawned = this.summonSkeletons(definition.summonCount ?? 2);
      this.state.message = spawned > 0
        ? `${spawned} squelettes interimaires repondent a l'appel.`
        : 'Aucune dalle libre pour les renforts. Probleme immobilier.';

      if (spawned === 0) {
        return false;
      }
    }

    consumeBossAbility(boss, type);
    this.state.bossLastAbilityName = definition.name;
    this.state.runtime.stats.abilityUses += 1;
    this.state.runtime.stats.bossAbilityUses += 1;
    this.state.runtime.stats.storyEvents.push(`Le boss utilise ${definition.name}.`);
    this.createPartyBark('bossAbility');
    return true;
  }

  inspectAdventurerAt(cell: GridCell): boolean {
    if (this.state.phase !== 'wave') {
      return false;
    }

    const found = this.state.adventurers
      .filter((adventurer) => adventurer.alive)
      .map((adventurer) => ({
        adventurer,
        distance: distance(cell.x, cell.y, adventurer.x, adventurer.y),
      }))
      .filter((entry) => entry.distance <= 0.75)
      .sort((a, b) => a.distance - b.distance)[0]?.adventurer ?? null;

    this.state.inspectedAdventurerId = found?.id ?? null;
    return found !== null;
  }

  clearInspection(): void {
    this.state.inspectedAdventurerId = null;
  }

  selectConstructionTool(type: ConstructionTool): void {
    const definition = CONSTRUCTION_TOOLS.find((tool) => tool.type === type);

    if (definition?.disabled) {
      this.state.message = `${definition.name} est prevue, mais pas encore taillee dans la pierre.`;
      return;
    }

    this.state.selectedConstructionTool = type;
    this.state.selectedDefense = null;
    this.state.message = `${definition?.name ?? 'Construction'} selectionne. Le donjon commence a ressembler a une mauvaise idee structuree.`;
  }

  selectDefense(type: DefenseType): void {
    this.state.selectedConstructionTool = null;
    this.state.selectedDefense = type;
    this.state.message = `${getDefenseDefinition(type).name} selectionne. La decoration devient enfin hostile.`;
  }

  placeSelectedDefense(cell: GridCell): void {
    if (this.state.phase !== 'build') {
      this.state.message = 'Pendant la vague, on regarde ses mauvais choix agir.';
      return;
    }

    if (this.state.selectedConstructionTool) {
      this.placeConstructionTool(cell, this.state.selectedConstructionTool);
      return;
    }

    const selected = this.state.selectedDefense;

    if (!selected) {
      this.state.message = 'Choisis une horreur a poser avant de tapisser le sol de regrets.';
      return;
    }

    if (!canBuildDefenseAt(this.state.tiles, cell)) {
      this.state.message = buildRejectionReason(this.state.tiles, cell);
      return;
    }

    if (hasDefenseOnCell(this.state.defenses, cell)) {
      this.state.message = 'Une defense occupe deja cette dalle. Meme les monstres ont besoin de place.';
      return;
    }

    if (findActiveDoorAt(this.state.doors, cell)) {
      this.state.message = 'Une porte renforcee occupe deja cette case.';
      return;
    }

    const definition = getDefenseDefinition(selected);

    if (this.state.gold < definition.cost) {
      this.state.message = "Budget insuffisant. Le mal aussi a une comptabilite.";
      return;
    }

    this.state.gold -= definition.cost;
    const entity = this.createDefenseEntity(selected, cell, false);
    this.state.defenses.push(entity);
    this.state.message = definition.kind === 'minion'
      ? `${entity.name} le ${definition.name} prend son poste. Il a deja des exigences.`
      : `${definition.name} pose. C'est juridiquement discutable, donc parfait.`;
  }

  private placeConstructionTool(cell: GridCell, tool: ConstructionTool): void {
    if (!isInsideGrid(cell)) {
      this.state.message = 'Cette case est hors du domaine. Meme le donjon a des limites cadastrales.';
      return;
    }

    if (tool === 'dig') {
      this.digTile(cell);
      return;
    }

    if (tool === 'guardRoom' || tool === 'crypt') {
      this.markRoom(cell, tool);
      return;
    }

    if (tool === 'door') {
      this.placeDoor(cell);
      return;
    }

    if (tool === 'removeDoor') {
      this.removeDoor(cell);
      return;
    }

    if (tool === 'moveBoss') {
      this.moveBoss(cell);
      return;
    }

    if (tool === 'moveTreasure') {
      this.moveMainTreasure(cell);
      return;
    }

    if (tool === 'addGoldTreasure') {
      this.addGoldTreasure(cell);
      return;
    }

    if (tool === 'removeTreasure') {
      this.removeGoldTreasure(cell);
    }
  }

  private digTile(cell: GridCell): void {
    const result = digRockTile(this.state.tiles, cell, this.state.gold);
    this.state.message = result.message;

    if (!result.ok) {
      return;
    }

    this.state.gold -= result.cost;
    this.state.tiles = result.tiles;
  }

  private markRoom(center: GridCell, tool: 'guardRoom' | 'crypt'): void {
    const result = markPlayerRoom(this.state.tiles, center, tool, ROOM_TOOL_LABELS[tool]);
    this.state.message = result.message;

    if (result.ok) {
      this.state.tiles = result.tiles;
    }
  }

  private placeDoor(cell: GridCell): void {
    const result = placeDoorAt(
      this.state.tiles,
      this.state.doors,
      cell,
      this.state.gold,
      hasDefenseOnCell(this.state.defenses, cell),
      `door-${this.nextDoorId}`,
    );
    this.state.message = result.message;

    if (!result.ok) {
      return;
    }

    this.state.gold -= result.cost;
    this.state.doors = result.doors;
    this.nextDoorId += 1;
  }

  private removeDoor(cell: GridCell): void {
    const refund = computeDoorRemovalRefund();
    const result = removeDoorAt(this.state.doors, cell, refund);
    this.state.message = result.message;

    if (!result.ok) {
      return;
    }

    this.state.doors = result.doors;
    this.state.gold += result.refundGold;
  }

  private moveBoss(cell: GridCell): void {
    const rejection = this.describeObjectiveAnchorRejection(cell, 'boss');

    if (rejection) {
      this.state.message = rejection;
      return;
    }

    const oldCell = { ...this.state.boss.homeCell };
    const nextBossCell = { ...cell };
    const validation = this.validateDungeonLayout(this.state.treasures, nextBossCell);

    if (!validation.valid) {
      this.state.message = validation.reason ?? 'Deplacement refuse: la route du boss doit rester lisible.';
      return;
    }

    this.state.tiles = this.replaceAnchorTile(this.state.tiles, oldCell, nextBossCell, 'throne');
    this.state.boss.homeCell = nextBossCell;
    this.state.boss.x = nextBossCell.x;
    this.state.boss.y = nextBossCell.y;
    this.state.boss.targetAdventurerId = null;
    this.state.message = 'Boss deplace. Le trone suit, les menaces restent.';
  }

  private moveMainTreasure(cell: GridCell): void {
    const treasure = this.getMainTreasure();

    if (!treasure) {
      this.state.message = 'Aucun tresor principal a deplacer.';
      return;
    }

    const rejection = this.describeObjectiveAnchorRejection(cell, 'treasure', treasure.id);

    if (rejection) {
      this.state.message = rejection;
      return;
    }

    const movedTreasure = { ...treasure, cell: { ...cell }, status: 'secure' as const, holderAdventurerId: null, droppedCell: null };
    const nextTreasures = this.state.treasures.map((candidate) => (candidate.id === treasure.id ? movedTreasure : candidate));
    const validation = this.validateDungeonLayout(nextTreasures, this.getBossCell());

    if (!validation.valid) {
      this.state.message = validation.reason ?? 'Deplacement refuse: le tresor doit rester sur la route du boss.';
      return;
    }

    this.state.tiles = this.replaceAnchorTile(this.state.tiles, treasure.cell, cell, 'treasure');
    this.state.treasures = nextTreasures;
    this.state.treasure = this.toLegacyTreasureState(movedTreasure);
    this.state.message = 'Tresor principal deplace. La Guilde devra refaire ses cartes.';
  }

  private addGoldTreasure(cell: GridCell): void {
    if (this.state.treasures.length >= MAX_TREASURES_V1) {
      this.state.message = `Maximum atteint: ${MAX_TREASURES_V1} tresors suffisent a attirer les problemes.`;
      return;
    }

    if (this.state.gold < GOLD_TREASURE_DEFAULT_VALUE) {
      this.state.message = `Pas assez d'or: il faut deposer ${GOLD_TREASURE_DEFAULT_VALUE} or dans ce tresor.`;
      return;
    }

    const rejection = this.describeObjectiveAnchorRejection(cell, 'treasure');

    if (rejection) {
      this.state.message = rejection;
      return;
    }

    const treasure = this.createGoldTreasure(cell);
    const nextTreasures = [...this.state.treasures, treasure];
    const validation = this.validateDungeonLayout(nextTreasures, this.getBossCell());

    if (!validation.valid) {
      this.state.message = validation.reason ?? "Tresor d'or refuse: il doit rester accessible.";
      return;
    }

    this.state.gold -= GOLD_TREASURE_DEFAULT_VALUE;
    this.state.treasures = nextTreasures;
    this.state.message = `Tresor d'or depose: -${GOLD_TREASURE_DEFAULT_VALUE} or maintenant, pas de double punition s'il est vole.`;
  }

  private removeGoldTreasure(cell: GridCell): void {
    const treasure = this.state.treasures.find(
      (candidate) => candidate.kind === 'gold' && candidate.status !== 'stolen' && isSameCell(candidate.cell, cell),
    );

    if (!treasure) {
      this.state.message = "Aucun tresor d'or non vole a retirer ici.";
      return;
    }

    this.state.treasures = this.state.treasures.filter((candidate) => candidate.id !== treasure.id);
    this.state.gold += treasure.value;
    this.state.message = `Tresor d'or retire: ${treasure.value} or recuperes.`;
  }

  private createDefenseEntity(type: DefenseType, cell: GridCell, summoned: boolean): DefenseEntity {
    const definition = getDefenseDefinition(type);
    const name = definition.kind === 'minion' ? this.nextMinionName(type) : `${definition.shortName}-${this.nextDefenseId}`;
    const entity: DefenseEntity = {
      id: `defense-${this.nextDefenseId}`,
      type,
      kind: definition.kind,
      name,
      cell: { ...cell },
      homeCell: { ...cell },
      x: cell.x,
      y: cell.y,
      hp: definition.hp ?? 1,
      maxHp: definition.hp ?? 1,
      cooldownRemainingMs: 0,
      abilityCooldowns: {},
      abilityFxTimerMs: 0,
      slowedTimerMs: 0,
      tauntedByAdventurerId: null,
      tauntTimerMs: 0,
      alive: true,
      aiState: 'idle',
      targetAdventurerId: null,
      patrolAngle: this.nextDefenseId * 0.71,
      chaseTimerMs: 0,
      stuckTimerMs: 0,
      lastX: cell.x,
      lastY: cell.y,
      kills: 0,
      wavesSurvived: 0,
      summoned,
    };
    this.nextDefenseId += 1;
    return entity;
  }

  private nextMinionName(type: DefenseType): string {
    const counter = this.minionNameCounters[type] ?? 0;
    this.minionNameCounters[type] = counter + 1;
    return createMinionName(type, counter);
  }

  private summonSkeletons(count: number): number {
    const bossCell = { x: Math.round(this.state.boss.x), y: Math.round(this.state.boss.y) };
    let spawned = 0;

    for (let radius = 1; radius <= 2 && spawned < count; radius += 1) {
      for (let dy = -radius; dy <= radius && spawned < count; dy += 1) {
        for (let dx = -radius; dx <= radius && spawned < count; dx += 1) {
          const cell = { x: bossCell.x + dx, y: bossCell.y + dy };

          if (
            !canBuildDefenseAt(this.state.tiles, cell) ||
            hasDefenseOnCell(this.state.defenses, cell) ||
            findActiveDoorAt(this.state.doors, cell)
          ) {
            continue;
          }

          this.state.defenses.push(this.createDefenseEntity('skeleton', cell, true));
          spawned += 1;
        }
      }
    }

    return spawned;
  }

  launchWave(): void {
    if (this.state.phase !== 'build') {
      return;
    }

    const validation = this.validateDungeonLayout();

    if (!validation.valid) {
      this.state.message = validation.reason ?? 'Le donjon est invalide: la vague refuse poliment de se perdre pour rien.';
      return;
    }

    advanceWorldDay(this.state.world, 3 + this.state.wave);
    const roster = this.buildPlannedRoster(this.state.wave);
    const profiles = selectProfilesForWave(roster, this.state.world, this.state.wave);
    const lastRumor = this.state.world.rumors[this.state.world.rumors.length - 1] ?? null;

    this.state.phase = 'wave';
    this.state.treasures = this.state.treasures.map((treasure) => ({
      ...treasure,
      status: 'secure',
      holderAdventurerId: null,
      droppedCell: null,
    }));
    this.state.treasure = this.toLegacyTreasureState(this.getMainTreasure());
    const targetTreasure = this.chooseWaveTreasureTarget();
    this.state.runtime = {
      elapsedMs: 0,
      spawnTimerMs: 0,
      spawnQueue: [...profiles],
      partyProfiles: [...profiles],
      spawned: 0,
      partyPlan: createPartyPlan(this.state.wave, this.state.world.dungeonReputation.value, lastRumor?.effect ?? null),
      stats: createEmptyWaveStats(),
      doorsEngagedIds: new Set<string>(),
      bossAutopilotTimerMs: 0,
      targetTreasureId: targetTreasure?.id ?? null,
    };
    this.state.report = null;
    this.state.adventurers = [];
    this.state.paused = false;
    this.state.inspectedAdventurerId = null;
    this.state.bossAutopilotIntent = 'Attend une ouverture.';
    this.state.bossLastAbilityName = null;
    this.state.boss.tauntedByAdventurerId = null;
    this.state.boss.tauntTimerMs = 0;
    resetBossAbilitiesForWave(this.state.boss);
    this.state.defenses.forEach((defense) => {
      defense.cooldownRemainingMs = 0;
      defense.abilityCooldowns = {};
      defense.abilityFxTimerMs = 0;
      defense.slowedTimerMs = 0;
      defense.tauntedByAdventurerId = null;
      defense.tauntTimerMs = 0;
    });
    this.state.message = `${this.state.runtime.partyPlan.label}: ${PARTY_SIZE} heros arrivent avec une strategie, ce qui est nouveau et inquietant.`;
  }

  continueBuild(): void {
    if (this.state.phase !== 'report') {
      return;
    }

    const hadSurvivors = this.state.report?.chronicle.hasSurvivors ?? false;
    this.state.phase = 'build';
    this.state.treasures = this.state.treasures
      .filter((treasure) => treasure.kind === 'main' || treasure.status !== 'stolen')
      .map((treasure) => ({
        ...treasure,
        status: 'secure',
        holderAdventurerId: null,
        droppedCell: null,
      }));
    this.state.treasure = this.toLegacyTreasureState(this.getMainTreasure());
    this.state.defenses = this.state.defenses.filter((defense) => defense.alive && !defense.summoned);
    this.state.defenses.forEach((defense) => {
      if (defense.kind === 'minion') {
        defense.hp = Math.min(defense.maxHp, defense.hp + Math.ceil(defense.maxHp * 0.28));
        defense.wavesSurvived += 1;
      }

      defense.cooldownRemainingMs = 0;
      defense.abilityCooldowns = {};
      defense.abilityFxTimerMs = 0;
      defense.slowedTimerMs = 0;
      defense.tauntedByAdventurerId = null;
      defense.tauntTimerMs = 0;
    });
    this.state.doors = repairDoors(this.state.doors);
    this.state.message = hadSurvivors
      ? 'Nouvelle preparation. Les survivants racontent deja des mensonges tactiques.'
      : "Nouvelle preparation. Aucun survivant officiel: la taverne invente le reste.";
  }

  restart(): void {
    this.startNewGame();
  }

  getSnapshot(): DungeonSnapshot {
    const continuityPreview = this.buildContinuityPreview(this.state.wave);
    const previewRoster = this.state.phase === 'wave' && this.state.runtime
      ? this.state.runtime.spawnQueue.map((profile) => profile.role)
      : continuityPreview.plannedRoles;
    const allRoles = [
      ...this.state.adventurers.map((adventurer) => adventurer.role),
      ...previewRoster,
    ];
    const dungeonValidation = this.validateDungeonLayout();
    const expeditionPlan = this.previewPartyPlan();

    return {
      phase: this.state.phase === 'menu' ? 'build' : this.state.phase,
      wave: this.state.wave,
      gold: this.state.gold,
      selectedDefense: this.state.selectedDefense,
      selectedConstructionTool: this.state.selectedConstructionTool,
      bossHp: Math.ceil(this.state.boss.hp),
      bossMaxHp: this.state.boss.maxHp,
      message: this.state.message,
      constructionTools: CONSTRUCTION_TOOLS.map((tool) => ({
        ...tool,
        disabled:
          this.state.phase !== 'build' ||
          tool.disabled === true ||
          (tool.type === 'addGoldTreasure' && this.state.treasures.length >= MAX_TREASURES_V1) ||
          (tool.cost !== null && this.state.gold < tool.cost),
      })),
      availableDefenses: DEFENSE_ORDER.map((type) => {
        const definition = getDefenseDefinition(type);
        return {
          type,
          kind: definition.kind,
          name: definition.name,
          description: definition.description,
          cost: definition.cost,
          color: definition.color,
          disabled: this.state.phase !== 'build' || this.state.gold < definition.cost,
        };
      }),
      dungeonTiles: this.state.tiles,
      territoryByType: this.buildTerritorySummary(),
      digCost: DIG_COST,
      doorSummary: this.buildDoorSummary(),
      dungeonValidation,
      expeditionLabel: expeditionPlan.label,
      expeditionPrimaryGoal: expeditionPlan.primaryGoal === 'boss' ? 'Boss' : 'Tresor',
      adventurersByRole: countRoles(allRoles),
      defensesByKind: this.countDefensesByKind(),
      liveAdventurers: this.state.adventurers.length,
      nextWaveSize: previewRoster.length,
      nextExpeditionReturningNames: continuityPreview.returningNames,
      nextExpeditionNewVolunteers: continuityPreview.newVolunteerCount,
      nextExpeditionVeteranName: continuityPreview.veteranName,
      canLaunchWave: this.state.phase === 'build' && dungeonValidation.valid,
      report: this.state.report,
      survivedWaves: Math.max(0, this.state.wave - 1),
      dungeonReputation: this.state.world.dungeonReputation.value,
      dungeonReputationTitle: this.state.world.dungeonReputation.title,
      recentJournal: this.state.world.expeditionHistory.slice(-5).map((record) => record.note),
      recentChronicles: this.state.world.chronicles.slice(-5).map((entry) => `Jour ${entry.day}: ${entry.text}`),
      activeAdventurerNames: this.state.adventurers.map((adventurer) => adventurer.name),
      bossAbilities: this.buildAbilitySnapshot(),
      paused: this.state.paused,
      gameSpeed: this.state.gameSpeed,
      treasureStatus: this.state.treasure.status,
      treasureCarrierName: this.getTreasureCarrierName(),
      treasures: this.state.treasures,
      safeZoneRadius: SAFE_ZONE_RADIUS,
      recentRumors: this.state.world.rumors.slice(-3).map((rumor) => rumor.text),
      inspectedAdventurer: this.buildInspectedAdventurer(),
      namedMinions: this.buildNamedMinions(),
      bossAutopilotIntent: this.state.bossAutopilotIntent,
      bossLastAbilityName: this.state.bossLastAbilityName,
    };
  }

  getRenderState(): Pick<GameState, 'defenses' | 'adventurers' | 'boss' | 'phase' | 'gold' | 'selectedDefense' | 'selectedConstructionTool' | 'treasure' | 'treasures' | 'tiles' | 'doors'> {
    return {
      defenses: this.state.defenses,
      adventurers: this.state.adventurers,
      boss: this.state.boss,
      phase: this.state.phase,
      gold: this.state.gold,
      selectedDefense: this.state.selectedDefense,
      selectedConstructionTool: this.state.selectedConstructionTool,
      treasure: this.state.treasure,
      treasures: this.state.treasures,
      tiles: this.state.tiles,
      doors: this.state.doors,
    };
  }

  private previewPartyPlan(): PartyPlan {
    if (this.state.phase === 'wave' && this.state.runtime) {
      return this.state.runtime.partyPlan;
    }

    const lastRumor = this.state.world.rumors[this.state.world.rumors.length - 1] ?? null;
    return createPartyPlan(this.state.wave, this.state.world.dungeonReputation.value, lastRumor?.effect ?? null);
  }

  private buildPlannedRoster(wave: number): AdventurerRole[] {
    const returning = getReturningSurvivorCandidates(this.state.world, PARTY_SIZE);
    return buildWaveRoster(wave, this.state.memory, this.hasActiveDoor(), returning.map((profile) => profile.role));
  }

  private buildContinuityPreview(wave: number): {
    returningNames: string[];
    newVolunteerCount: number;
    veteranName: string | null;
    plannedRoles: AdventurerRole[];
  } {
    const returning = getReturningSurvivorCandidates(this.state.world, PARTY_SIZE);
    const plannedRoles = buildWaveRoster(wave, this.state.memory, this.hasActiveDoor(), returning.map((profile) => profile.role));
    const veteran = returning[0] ?? null;

    return {
      returningNames: returning.map((profile) => profile.name),
      newVolunteerCount: Math.max(0, PARTY_SIZE - returning.length),
      veteranName: veteran ? veteran.name : null,
      plannedRoles,
    };
  }

  private validateDungeonLayout(
    treasures = this.state.treasures,
    bossCell = this.getBossCell(),
  ): DungeonValidation {
    const blockedCellKeys = getBlockedCellKeys(this.state.tiles);
    const activeTreasures = this.getActiveTreasures(treasures);
    const entryToTreasure = activeTreasures.length === 0
      ? hasWalkablePath(ENTRY_CELL, bossCell, blockedCellKeys)
      : activeTreasures.every((treasure) => hasWalkablePath(ENTRY_CELL, treasure.cell, blockedCellKeys));
    const treasureToBoss = activeTreasures.length === 0
      ? entryToTreasure
      : activeTreasures.every((treasure) => hasWalkablePath(treasure.cell, bossCell, blockedCellKeys));
    const valid = entryToTreasure && treasureToBoss;

    return {
      valid,
      entryToTreasure,
      treasureToBoss,
      reason: valid
        ? null
        : !entryToTreasure
          ? "Chemin bloque: les aventuriers ne peuvent plus rejoindre tous les tresors depuis l'entree."
          : 'Chemin bloque: les tresors et la salle du boss ne sont plus relies.',
    };
  }

  private buildAbilitySnapshot(): BossAbilityUiItem[] {
    return BOSS_ABILITY_ORDER.map((type) => {
      const definition = BOSS_ABILITY_DEFINITIONS[type];
      const ability = this.state.boss.abilities[type];
      return {
        type,
        name: definition.name,
        shortName: definition.shortName,
        description: definition.description,
        cooldownRemainingMs: ability.cooldownRemainingMs,
        cooldownMs: definition.cooldownMs,
        usesLeft: Math.max(0, definition.maxUsesPerWave - ability.usesThisWave),
        ready: this.state.phase === 'wave' && canUseBossAbility(this.state.boss, type),
      };
    });
  }

  private getTreasureCarrierName(): string | null {
    const carriedTreasure = this.state.treasures.find((treasure) => treasure.status === 'carried' && treasure.holderAdventurerId);

    if (!carriedTreasure?.holderAdventurerId) {
      return null;
    }

    return (
      this.state.adventurers.find((adventurer) => adventurer.id === carriedTreasure.holderAdventurerId)?.name ?? null
    );
  }

  private buildInspectedAdventurer(): InspectedAdventurer | null {
    if (!this.state.inspectedAdventurerId) {
      return null;
    }

    const adventurer = this.state.adventurers.find((candidate) => candidate.id === this.state.inspectedAdventurerId);

    if (!adventurer) {
      return null;
    }

    const profile = this.state.world.profiles[adventurer.profileId];

    if (!profile) {
      return null;
    }

    const ancestor = profile.heirOfProfileId ? this.state.world.profiles[profile.heirOfProfileId] : null;
    const lastRecord = profile.expeditionHistory[profile.expeditionHistory.length - 1] ?? null;

    return {
      name: profile.name,
      className: profile.className,
      level: profile.level,
      age: profile.age,
      personality: profile.dominantPersonality,
      traits: profile.traits,
      hp: Math.ceil(adventurer.hp),
      maxHp: adventurer.maxHp,
      expeditionCount: profile.expeditionCount,
      survivedExpeditions: profile.survivedExpeditions,
      monstersKilled: profile.monstersKilled,
      trapsTriggered: profile.trapsTriggered,
      doorsEncountered: profile.doorsEncountered,
      doorsPicked: profile.doorsPicked,
      bossEncounters: profile.bossEncounters,
      totalLootedGold: profile.totalLootedGold,
      injuries: profile.injuries.map((injury) => injury.name),
      isHeir: adventurer.isHeir,
      heirNote: ancestor ? `Venge ${ancestor.name} (vague ${ancestor.deathWave ?? '?'})` : null,
      carryingTreasure: adventurer.carryingTreasure,
      lastFeat: lastRecord?.note ?? null,
    };
  }

  private buildNamedMinions(): NamedMinionUiItem[] {
    return this.state.defenses
      .filter((defense) => defense.kind === 'minion' && defense.alive && !defense.summoned)
      .sort((a, b) => b.kills - a.kills || b.wavesSurvived - a.wavesSurvived)
      .slice(0, 4)
      .map((defense) => ({
        name: defense.name,
        typeName: getDefenseDefinition(defense.type).name,
        kills: defense.kills,
        wavesSurvived: defense.wavesSurvived,
      }));
  }

  private describeObjectiveAnchorRejection(
    cell: GridCell,
    target: 'boss' | 'treasure',
    movingTreasureId: string | null = null,
  ): string | null {
    const tile = getTileAt(this.state.tiles, cell);

    if (!tile || tile.type === 'rock') {
      return 'Impossible ici: il faut une case deja creusee.';
    }

    if (isInEntrySafeZone(cell)) {
      return "Zone de surete : laisse une chance aux intrus d'entrer.";
    }

    if (tile.type === 'entrance') {
      return "Impossible pres de l'entree.";
    }

    if (target === 'boss' && tile.type === 'treasure') {
      return 'Impossible: le boss ne peut pas s empiler sur un tresor.';
    }

    if (target === 'treasure' && tile.type === 'throne') {
      return 'Impossible: le tresor ne peut pas remplacer le trone du boss.';
    }

    if (tile.type !== 'floor' && tile.type !== 'room') {
      return 'Impossible ici: choisis un sol ou une salle creusee.';
    }

    if (isSameCell(cell, ENTRY_CELL)) {
      return "Impossible pres de l'entree.";
    }

    if (target === 'treasure' && isSameCell(cell, this.getBossCell())) {
      return 'Impossible: le boss occupe deja cette dalle.';
    }

    if (
      target === 'boss' &&
      this.state.treasures.some((treasure) => treasure.id !== movingTreasureId && treasure.status !== 'stolen' && isSameCell(treasure.cell, cell))
    ) {
      return 'Impossible: un tresor occupe deja cette dalle.';
    }

    if (
      target === 'treasure' &&
      this.state.treasures.some((treasure) => treasure.id !== movingTreasureId && treasure.status !== 'stolen' && isSameCell(treasure.cell, cell))
    ) {
      return 'Impossible: un autre tresor occupe deja cette dalle.';
    }

    if (hasDefenseOnCell(this.state.defenses, cell)) {
      return 'Impossible: une defense occupe deja cette dalle.';
    }

    if (findActiveDoorAt(this.state.doors, cell)) {
      return 'Impossible: une porte occupe deja cette dalle.';
    }

    return null;
  }

  private replaceAnchorTile(
    tiles: GameState['tiles'],
    oldCell: GridCell,
    newCell: GridCell,
    type: 'treasure' | 'throne',
  ): GameState['tiles'] {
    const oldTile = getTileAt(tiles, oldCell);
    const newTile = getTileAt(tiles, newCell);
    const oldFallbackType = oldTile?.roomType ? 'room' : 'floor';
    const nextRoomType = newTile?.roomType ?? (type === 'treasure' ? 'treasureRoom' : 'throneRoom');

    return setDungeonTile(
      setDungeonTile(tiles, oldCell, oldFallbackType, oldTile?.roomType ?? null),
      newCell,
      type,
      nextRoomType,
    );
  }

  private getMainTreasure(): DungeonTreasure | null {
    return this.state.treasures.find((treasure) => treasure.kind === 'main') ?? null;
  }

  private getBossCell(): GridCell {
    return { x: Math.round(this.state.boss.homeCell.x), y: Math.round(this.state.boss.homeCell.y) };
  }

  private getActiveTreasures(treasures = this.state.treasures): DungeonTreasure[] {
    return treasures.filter((treasure) => treasure.status !== 'stolen');
  }

  private chooseWaveTreasureTarget(): DungeonTreasure | null {
    const blockedCellKeys = getBlockedCellKeys(this.state.tiles);

    return this.getActiveTreasures()
      .map((treasure) => ({
        treasure,
        accessible: hasWalkablePath(ENTRY_CELL, treasure.cell, blockedCellKeys),
        distance: Math.abs(ENTRY_CELL.x - treasure.cell.x) + Math.abs(ENTRY_CELL.y - treasure.cell.y),
      }))
      .filter((entry) => entry.accessible)
      .sort((a, b) => a.distance - b.distance || (a.treasure.kind === 'main' ? -1 : 1))[0]?.treasure ?? null;
  }

  private getRuntimeTreasureTarget(): DungeonTreasure | null {
    const runtime = this.state.runtime;
    const preferred = runtime?.targetTreasureId
      ? this.state.treasures.find((treasure) => treasure.id === runtime.targetTreasureId && treasure.status !== 'stolen') ?? null
      : null;

    if (preferred && (preferred.status === 'secure' || preferred.status === 'dropped')) {
      return preferred;
    }

    const fallback = this.chooseWaveTreasureTarget();

    if (runtime) {
      runtime.targetTreasureId = fallback?.id ?? null;
    }

    return fallback;
  }

  private createGoldTreasure(cell: GridCell): DungeonTreasure {
    const treasure: DungeonTreasure = {
      id: `gold-${this.nextTreasureId}`,
      kind: 'gold',
      cell: { ...cell },
      value: GOLD_TREASURE_DEFAULT_VALUE,
      status: 'secure',
      holderAdventurerId: null,
      droppedCell: null,
    };
    this.nextTreasureId += 1;
    return treasure;
  }

  private toLegacyTreasureState(treasure: DungeonTreasure | null): TreasureState {
    if (!treasure) {
      return createSecureTreasure();
    }

    return {
      status: treasure.status,
      holderAdventurerId: treasure.holderAdventurerId,
      droppedCell: treasure.droppedCell ? { ...treasure.droppedCell } : null,
    };
  }

  private createInitialState(): GameState {
    return {
      phase: 'build',
      wave: 1,
      gold: STARTING_GOLD,
      selectedDefense: 'spikeTrap',
      selectedConstructionTool: null,
      tiles: createInitialDungeonTiles(),
      doors: [],
      defenses: [],
      adventurers: [],
      boss: {
        ...BOSS_TEMPLATE,
        hp: BOSS_TEMPLATE.maxHp,
        attackTimerMs: 0,
        abilities: createBossAbilities(),
      },
      treasure: createSecureTreasure(),
      treasures: [createMainTreasure()],
      memory: {
        trapAvoidance: 0.35,
        trapDangerByCell: {},
        rolePressure: {
          warrior: 0,
          thief: 0,
          mage: 0,
          healer: 0,
        },
      },
      world: createInitialWorldMemory(),
      runtime: null,
      report: null,
      message: 'Ton donjon attend ses premieres victimes administratives.',
      paused: false,
      gameSpeed: 1,
      inspectedAdventurerId: null,
      bossAutopilotIntent: null,
      bossLastAbilityName: null,
    };
  }

  private tickTimers(deltaMs: number): void {
    tickGlobalBarks(deltaMs);

    this.state.defenses.forEach((defense) => {
      defense.cooldownRemainingMs = Math.max(0, defense.cooldownRemainingMs - deltaMs);
      defense.abilityFxTimerMs = Math.max(0, defense.abilityFxTimerMs - deltaMs);
      defense.slowedTimerMs = Math.max(0, defense.slowedTimerMs - deltaMs);
      defense.tauntTimerMs = Math.max(0, defense.tauntTimerMs - deltaMs);
      tickCombatAbilityCooldowns(defense.abilityCooldowns, deltaMs);

      if (defense.tauntTimerMs === 0) {
        defense.tauntedByAdventurerId = null;
      }
    });

    this.state.boss.attackTimerMs = Math.max(0, this.state.boss.attackTimerMs - deltaMs);
    this.state.boss.tauntTimerMs = Math.max(0, this.state.boss.tauntTimerMs - deltaMs);
    if (this.state.boss.tauntTimerMs === 0) {
      this.state.boss.tauntedByAdventurerId = null;
    }
    tickBossAbilities(this.state.boss, deltaMs);

    this.state.adventurers.forEach((adventurer) => {
      adventurer.attackTimerMs = Math.max(0, adventurer.attackTimerMs - deltaMs);
      adventurer.healTimerMs = Math.max(0, adventurer.healTimerMs - deltaMs);
      adventurer.abilityFxTimerMs = Math.max(0, adventurer.abilityFxTimerMs - deltaMs);
      adventurer.damageReductionTimerMs = Math.max(0, adventurer.damageReductionTimerMs - deltaMs);
      adventurer.stunnedTimerMs = Math.max(0, adventurer.stunnedTimerMs - deltaMs);
      adventurer.hesitationTimerMs = Math.max(0, adventurer.hesitationTimerMs - deltaMs);
      adventurer.retreatIntentTimerMs = Math.max(0, adventurer.retreatIntentTimerMs - deltaMs);
      tickCombatAbilityCooldowns(adventurer.abilityCooldowns, deltaMs);
      tickAdventurerBarks(adventurer, deltaMs);

      if (adventurer.fearTimerMs > 0) {
        adventurer.fearTimerMs = Math.max(0, adventurer.fearTimerMs - deltaMs);

        if (adventurer.fearTimerMs === 0 && adventurer.fearPreviousStage) {
          adventurer.targetStage = adventurer.fearPreviousStage;
          adventurer.fearPreviousStage = null;
          adventurer.path = [];
        }
      }
    });
  }

  private spawnAdventurers(deltaMs: number): void {
    const runtime = this.state.runtime;

    if (!runtime || runtime.spawnQueue.length === 0) {
      return;
    }

    runtime.spawnTimerMs -= deltaMs;

    while (runtime.spawnTimerMs <= 0 && runtime.spawnQueue.length > 0) {
      const profile = runtime.spawnQueue.shift();

      if (!profile) {
        return;
      }

      const activeProfile = activateProfileForExpedition(this.state.world, profile.id, this.state.wave);

      if (!activeProfile) {
        continue;
      }

      const adventurer = createAdventurer(activeProfile, `adventurer-${this.nextAdventurerId}`, this.state.wave, runtime.spawned);
      this.nextAdventurerId += 1;
      runtime.spawned += 1;
      this.state.adventurers.push(adventurer);

      if (activeProfile.survivedExpeditions > 0) {
        tryBark(adventurer, 'returningSurvivor', this.visibleBarkCount());
      }

      runtime.spawnTimerMs += 850;
    }
  }

  private updateDefenders(deltaMs: number): void {
    const runtime = this.state.runtime;

    if (!runtime) {
      return;
    }

    this.state.defenses.forEach((defense) => {
      if (!defense.alive || defense.kind !== 'minion' || defense.cooldownRemainingMs > 0) {
        return;
      }

      if (tryUseDefenseAbility(defense, {
        adventurers: this.state.adventurers,
        doors: this.state.doors,
        stats: runtime.stats,
        damageAdventurer: (target, damage, source) => this.damageAdventurer(target, damage, 'minion', source.type, source.cell, source),
        message: (text) => {
          this.state.message = text;
        },
      })) {
        runtime.stats.combatEngagementMs += deltaMs;
        return;
      }

      const definition = getDefenseDefinition(defense.type);
      const target = this.findNearestAdventurer(defense.x, defense.y, definition.attackRange ?? 1, defense.tauntedByAdventurerId);

      if (!target) {
        return;
      }

      const damage = definition.damage ?? 1;
      this.damageAdventurer(target, damage, 'minion', defense.type, defense.cell, defense);
      defense.cooldownRemainingMs = definition.attackCooldownMs ?? 900;
      runtime.stats.combatEngagementMs += deltaMs;
    });

    const bossTarget = chooseBossTarget(this.state.boss, this.state.adventurers);
    updateBossMovement(this.state.boss, bossTarget, deltaMs, this.entityMovementGuard());

    if (
      bossTarget &&
      this.state.boss.attackTimerMs <= 0 &&
      distance(this.state.boss.x, this.state.boss.y, bossTarget.x, bossTarget.y) <= this.state.boss.attackRange
    ) {
      this.damageAdventurer(bossTarget, this.state.boss.damage, 'boss', null, this.state.boss.homeCell);
      this.state.boss.attackTimerMs = this.state.boss.attackCooldownMs;
      runtime.stats.combatEngagementMs += deltaMs;
    }
  }

  private updateAdventurers(deltaMs: number): void {
    for (const adventurer of this.state.adventurers) {
      if (!adventurer.alive || adventurer.stunnedTimerMs > 0) {
        continue;
      }

      this.maybeStartRetreat(adventurer);

      if (adventurer.hesitationTimerMs > 0) {
        continue;
      }

      this.applyLocalDecision(adventurer);

      if (adventurer.hesitationTimerMs > 0) {
        continue;
      }

      if (adventurer.targetStage === 'exit' && adventurer.retreatIntentTimerMs <= 0) {
        this.moveAdventurer(adventurer, deltaMs);
        continue;
      }

      if (this.tryUseCombatAbility(adventurer)) {
        continue;
      }

      this.resolveTreasureStage(adventurer);
      const targetMinion = this.findTargetMinion(adventurer);
      const canAttackBoss =
        adventurer.targetStage === 'boss' &&
        distance(adventurer.x, adventurer.y, this.state.boss.x, this.state.boss.y) <= adventurer.attackRange + 0.3;

      if ((targetMinion || canAttackBoss) && adventurer.attackTimerMs <= 0) {
        if (targetMinion) {
          this.damageMinion(targetMinion, adventurer.damage, adventurer);
        } else {
          this.damageBoss(adventurer.damage, adventurer);
        }

        adventurer.attackTimerMs = adventurer.attackCooldownMs;
        this.state.runtime!.stats.combatEngagementMs += deltaMs;
        continue;
      }

      if (targetMinion || canAttackBoss) {
        this.state.runtime!.stats.combatEngagementMs += deltaMs;
        continue;
      }

      this.moveAdventurer(adventurer, deltaMs);
    }
  }

  private moveAdventurer(adventurer: AdventurerEntity, deltaMs: number): void {
    const targetCell = this.getTargetCell(adventurer);
    const currentCell = { x: Math.round(adventurer.x), y: Math.round(adventurer.y) };

    if (isSameCell(currentCell, targetCell)) {
      if (adventurer.targetStage === 'exit' && !adventurer.hasEnteredDungeon) {
        this.withdrawUndeployedAdventurer(adventurer);
        return;
      }

      this.handleObjectiveReached(adventurer);
      return;
    }

    if (adventurer.path.length === 0) {
      adventurer.path = findPath(currentCell, targetCell, {
        role: adventurer.role,
        trapAvoidance: this.state.memory.trapAvoidance * personalityTrapAvoidance(adventurer),
        trapDangerByCell: this.state.memory.trapDangerByCell,
        knownTrapCells: this.getKnownTrapCells(),
        blockedCellKeys: getBlockedCellKeys(this.state.tiles),
      });
    }

    const nextCell = adventurer.path[0];

    if (!nextCell) {
      return;
    }

    if (this.tryAvoidLethalRetreatTrap(adventurer, currentCell, targetCell, nextCell)) {
      return;
    }

    const blockingDoor = findActiveDoorAt(this.state.doors, nextCell);

    if (blockingDoor) {
      this.engageDoor(adventurer, blockingDoor, deltaMs);
      return;
    }

    const dx = nextCell.x - adventurer.x;
    const dy = nextCell.y - adventurer.y;
    const remaining = Math.hypot(dx, dy);
    const carryPenalty = adventurer.carryingTreasure ? 0.82 : 1;
    const retreatSpeed =
      adventurer.targetStage === 'exit' && adventurer.retreatIntent === 'panicRetreat'
        ? 1.18
        : adventurer.targetStage === 'exit' && adventurer.retreatIntent === 'coverRetreat'
          ? 0.86
          : 1;
    const step = adventurer.speed * adventurer.speedMultiplier * adventurer.decisionSpeedMultiplier * retreatSpeed * carryPenalty * deltaMs;

    if (step >= remaining) {
      adventurer.x = nextCell.x;
      adventurer.y = nextCell.y;
      adventurer.path.shift();
      adventurer.path = [];
      this.handleCellEntered(adventurer, nextCell);

      if (isSameCell(nextCell, targetCell)) {
        this.handleObjectiveReached(adventurer);
      }

      return;
    }

    adventurer.x += (dx / remaining) * step;
    adventurer.y += (dy / remaining) * step;
  }

  private tryAvoidLethalRetreatTrap(
    adventurer: AdventurerEntity,
    currentCell: GridCell,
    targetCell: GridCell,
    nextCell: GridCell,
  ): boolean {
    if (!this.state.runtime || adventurer.targetStage !== 'exit' || adventurer.hp / adventurer.maxHp > 0.38) {
      return false;
    }

    const trap = this.state.defenses.find(
      (defense) => defense.alive && defense.kind === 'trap' && defense.cooldownRemainingMs <= 0 && isSameCell(defense.cell, nextCell),
    );

    if (!trap) {
      adventurer.lastAvoidedTrapKey = null;
      return false;
    }

    const trapKey = cellKey(nextCell);

    if (adventurer.lastAvoidedTrapKey === trapKey) {
      return false;
    }

    const definition = getDefenseDefinition(trap.type);
    const expectedDamage = Math.max(1, Math.round((definition.trapDamage ?? 0) * adventurer.trapDamageMultiplier));
    const shouldAvoid =
      expectedDamage >= adventurer.hp ||
      adventurer.personality === 'cautious' ||
      adventurer.personality === 'traumatized' ||
      adventurer.role === 'thief';

    if (!shouldAvoid) {
      return false;
    }

    const blockedCellKeys = getBlockedCellKeys(this.state.tiles);
    blockedCellKeys.add(cellKey(nextCell));
    const alternative = findPath(currentCell, targetCell, {
      role: adventurer.role,
      trapAvoidance: this.state.memory.trapAvoidance * personalityTrapAvoidance(adventurer) * 1.6,
      trapDangerByCell: this.state.memory.trapDangerByCell,
      knownTrapCells: this.getKnownTrapCells(),
      blockedCellKeys,
    });

    if (alternative.length > 0 && alternative.length <= Math.max(3, adventurer.path.length + 3)) {
      adventurer.path = alternative;
      adventurer.lastAvoidedTrapKey = trapKey;
      this.state.runtime.stats.fleeingTrapAvoidances += 1;
      tryBark(adventurer, 'fleeTrap', this.visibleBarkCount());
      this.state.message = `${adventurer.name} evite un piege visible pendant sa fuite. Instinct de survie tardif, mais appreciable.`;
      return true;
    }

    if (adventurer.barkCooldownMs <= 0) {
      adventurer.hesitationTimerMs = Math.max(adventurer.hesitationTimerMs, 520);
      this.state.runtime.stats.tacticalHesitations += 1;
      tryBark(adventurer, 'fleeTrap', this.visibleBarkCount());
      return true;
    }

    return false;
  }

  private engageDoor(adventurer: AdventurerEntity, door: DungeonDoor, deltaMs: number): void {
    if (!this.state.runtime || door.openedForExpedition) {
      return;
    }

    const stats = this.state.runtime.stats;

    if (!this.state.runtime.doorsEngagedIds.has(door.id)) {
      this.state.runtime.doorsEngagedIds.add(door.id);
      stats.doorEncounters += 1;
      recordProfileDoorEncounter(this.state.world, adventurer.profileId);
      this.state.message = `${adventurer.name} trouve une porte verrouillee. La force brute signe sa demission.`;
    }

    const livingThief = this.state.adventurers.find((candidate) => candidate.alive && !candidate.escaped && candidate.role === 'thief') ?? null;

    if (!livingThief) {
      this.retreatFromDoorWithoutThief(adventurer);
      return;
    }

    if (adventurer.role !== 'thief') {
      adventurer.hesitationTimerMs = Math.max(adventurer.hesitationTimerMs, 260);
      tryBark(adventurer, 'doorBlocked', this.visibleBarkCount());
      return;
    }

    door.beingPickedById = adventurer.id;
    door.pickProgressMs = Math.min(door.pickRequiredMs, door.pickProgressMs + deltaMs);
    adventurer.hesitationTimerMs = Math.max(adventurer.hesitationTimerMs, 80);
    stats.thiefDoorLeads += 1;
    tryBark(adventurer, 'doorThief', this.visibleBarkCount());
    this.state.message = `${adventurer.name} crochète la porte verrouillee...`;

    if (door.pickProgressMs >= door.pickRequiredMs) {
      door.locked = false;
      door.openedForExpedition = true;
      door.beingPickedById = null;
      door.pickProgressMs = door.pickRequiredMs;
      stats.doorsPicked += 1;
      recordProfileDoorPicked(this.state.world, adventurer.profileId);
      stats.storyEvents.push(`${adventurer.name} crochete une porte verrouillee et ouvre le passage.`);
      tryBark(adventurer, 'doorOpened', this.visibleBarkCount());
      this.state.message = `${adventurer.name} ouvre la porte. Le groupe peut passer.`;
    }
  }

  private retreatFromDoorWithoutThief(adventurer: AdventurerEntity): void {
    if (!this.state.runtime) {
      return;
    }

    if (this.state.runtime.stats.doorNoThiefRetreats === 0) {
      this.state.runtime.stats.storyEvents.push("L'expedition abandonne devant une porte verrouillee faute de voleur.");
      this.state.memory.rolePressure.thief += 3;
      this.state.runtime.stats.doorNoThiefRetreats = 1;
      this.startGroupRetreat('Porte verrouillee sans voleur.', 'lockedDoorNoThief');
    }

    adventurer.hesitationTimerMs = Math.max(adventurer.hesitationTimerMs, 900);
    tryBark(adventurer, 'doorNoThief', this.visibleBarkCount());
    this.state.message = 'Sans voleur, la serrure gagne par forfait. Retraite.';
  }

  private startGroupRetreat(reason: string, kind: 'lockedDoorNoThief' | 'danger' | 'treasure'): void {
    if (!this.state.runtime) {
      return;
    }

    this.state.runtime.partyPlan.retreating = true;
    this.state.runtime.partyPlan.retreatReason = reason;
    this.state.runtime.partyPlan.groupObjective = kind === 'treasure' ? 'escapeWithTreasure' : 'retreat';
    this.state.runtime.stats.groupRetreats += 1;

    const assignments = assignGroupRetreat(
      this.state.adventurers,
      this.state.runtime.partyPlan.type,
      kind,
    );

    assignments.forEach((assignment) => {
      const adventurer = this.state.adventurers.find((candidate) => candidate.id === assignment.adventurerId);

      if (!adventurer) {
        return;
      }

      if (assignment.intent === 'coverRetreat') {
        this.state.runtime!.stats.coverRetreats += 1;
      }

      if (assignment.intent === 'panicRetreat') {
        this.state.runtime!.stats.panicRetreats += 1;
      }

      if (assignment.intent === 'disobey') {
        this.state.runtime!.stats.disobeys += 1;
      }

      if (assignment.bark) {
        tryBark(adventurer, assignment.bark, this.visibleBarkCount());
      }
    });
  }

  private handleObjectiveReached(adventurer: AdventurerEntity): void {
    if (adventurer.targetStage === 'treasure') {
      const treasure = this.getRuntimeTreasureTarget();

      if (!treasure || (treasure.status !== 'secure' && treasure.status !== 'dropped')) {
        this.resolveTreasureStage(adventurer);
        return;
      }

      treasure.status = 'carried';
      treasure.holderAdventurerId = adventurer.id;
      treasure.droppedCell = null;
      this.state.treasure = this.toLegacyTreasureState(treasure);
      adventurer.carryingTreasure = true;

      if (this.state.runtime) {
        const runtime = this.state.runtime;
        runtime.partyPlan.treasureClaimed = true;
        runtime.stats.treasureCarrierName = adventurer.name;
        runtime.stats.treasureTargetId = treasure.id;
        runtime.stats.storyEvents.push(
          treasure.kind === 'gold'
            ? `${adventurer.name} s'empare d'un tresor d'or (${treasure.value} or).`
            : `${adventurer.name} s'empare du tresor du donjon.`,
        );
        const groupObjective = chooseTreasureGroupObjective(
          runtime.partyPlan,
          adventurer,
          this.state.adventurers,
          runtime.stats,
          this.state.boss.hp / this.state.boss.maxHp,
        );
        runtime.partyPlan.groupObjective = groupObjective;
        runtime.stats.treasureGroupDecision = groupObjective;

        if (groupObjective === 'escapeWithTreasure') {
          runtime.stats.storyEvents.push("Decision collective: le groupe protege le porteur et fuit avec le tresor.");
          this.startGroupRetreat('Tresor pris: le groupe couvre la fuite du porteur.', 'treasure');
          tryBark(adventurer, 'treasureEscape', this.visibleBarkCount());
          this.barkRoleNearTreasureCarrier(adventurer, 'protectCarrier');
        } else {
          runtime.stats.storyEvents.push('Decision collective: le groupe pousse vers le boss avec le tresor en main.');
          tryBark(adventurer, 'treasureChallenge', this.visibleBarkCount());
          this.barkRoleNearTreasureCarrier(adventurer, 'stayTogether');
        }
      }

      adventurer.targetStage = this.state.runtime
        ? choosePostTreasureGoal(this.state.runtime.partyPlan, adventurer)
        : 'boss';
      adventurer.path = [];
      this.state.message = treasure.kind === 'gold'
        ? `${adventurer.name} empoche ${treasure.value} or de depot. Rattrape-le avant la sortie.`
        : `${adventurer.name} empoche le Tresor du Donjon. Rattrape-le ou paie l'addition.`;
      this.createPartyBark('treasureTaken');

      if (!this.state.world.chronicles.some((entry) => entry.text.includes('atteint la salle du boss'))) {
        addChronicle(this.state.world, 'Le premier aventurier atteint la salle du boss.');
      }

      return;
    }

    if (adventurer.targetStage === 'exit') {
      this.recordEscape(adventurer);
    }
  }

  private resolveTreasureStage(adventurer: AdventurerEntity): void {
    if (adventurer.targetStage !== 'treasure') {
      return;
    }

    const treasure = this.getRuntimeTreasureTarget();

    if (treasure && (treasure.status === 'secure' || treasure.status === 'dropped')) {
      return;
    }

    adventurer.targetStage = this.state.runtime
      ? choosePostTreasureGoal(this.state.runtime.partyPlan, adventurer)
      : 'boss';
    adventurer.path = [];
  }

  private dropTreasure(adventurer: AdventurerEntity): void {
    if (!adventurer.carryingTreasure) {
      return;
    }

    adventurer.carryingTreasure = false;
    const treasure = this.state.treasures.find((candidate) => candidate.holderAdventurerId === adventurer.id);
    const droppedCell = { x: Math.round(adventurer.x), y: Math.round(adventurer.y) };

    if (treasure) {
      treasure.status = 'dropped';
      treasure.holderAdventurerId = null;
      treasure.droppedCell = droppedCell;
      this.state.treasure = this.toLegacyTreasureState(treasure);
    }

    this.state.adventurers.forEach((other) => {
      if (other.alive && !other.escaped && other.targetStage === 'treasure') {
        other.path = [];
      }
    });

    if (this.state.runtime) {
      this.state.runtime.stats.storyEvents.push(`${adventurer.name} lache le tresor en tombant.`);
    }

    this.state.message = `${adventurer.name} tombe et le tresor roule sur la dalle. Recuperation possible.`;
  }

  private handleCellEntered(adventurer: AdventurerEntity, cell: GridCell): void {
    const key = cellKey(cell);

    if (adventurer.lastCellKey === key || !adventurer.alive) {
      return;
    }

    adventurer.lastCellKey = key;

    if (!isSameCell(cell, ENTRY_CELL)) {
      adventurer.hasEnteredDungeon = true;
    }

    const trap = this.state.defenses.find(
      (defense) => defense.alive && defense.kind === 'trap' && defense.cooldownRemainingMs <= 0 && isSameCell(defense.cell, cell),
    );

    if (!trap) {
      return;
    }

    const definition = getDefenseDefinition(trap.type);
    const baseDamage = definition.trapDamage ?? 0;
    const damage = Math.max(1, Math.round(baseDamage * adventurer.trapDamageMultiplier));
    recordProfileTrapTriggered(this.state.world, adventurer.profileId);
    this.damageAdventurer(adventurer, damage, 'trap', trap.type, cell, trap);
    trap.cooldownRemainingMs = definition.trapCooldownMs ?? 1500;
  }

  private damageAdventurer(
    adventurer: AdventurerEntity,
    damage: number,
    source: 'trap' | 'minion' | 'boss',
    sourceType: DefenseType | null,
    sourceCell: GridCell,
    sourceDefense: DefenseEntity | null = null,
  ): number {
    if (!this.state.runtime || !adventurer.alive) {
      return 0;
    }

    const reduction = adventurer.damageReductionTimerMs > 0
      ? Math.max(0, Math.round(damage * COMBAT_ABILITY_BALANCE.warriorDamageReduction))
      : 0;
    const mitigatedDamage = Math.max(0, damage - reduction);
    const actualDamage = Math.min(adventurer.hp, mitigatedDamage);
    adventurer.hp -= actualDamage;

    if (reduction > 0) {
      this.state.runtime.stats.abilityStats.warriorProtectedDamage += Math.min(damage, reduction);
    }

    if (source === 'trap' && sourceType) {
      recordStats(this.state.runtime.stats.trapStats, sourceType, actualDamage, 0);
    }

    if (source === 'minion' && sourceType) {
      recordStats(this.state.runtime.stats.minionStats, sourceType, actualDamage, 0);
      recordProfileNemesis(this.state.world, adventurer.profileId, sourceType);
    }

    if (adventurer.hp > 0) {
      return actualDamage;
    }

    adventurer.alive = false;
    this.dropTreasure(adventurer);
    this.state.runtime.stats.adventurersKilled += 1;
    const cause = describeDeathCause(source, sourceType, sourceDefense);
    const deathRecord = recordProfileDeath(this.state.world, adventurer.profileId, this.state.wave, `${adventurer.name} meurt: ${cause}.`);

    if (deathRecord) {
      this.state.runtime.stats.deaths.push(deathRecord);
    }

    if (sourceDefense) {
      sourceDefense.kills += 1;

      if (sourceDefense.kind === 'minion') {
        this.state.runtime.stats.minionKillsByDefenseId[sourceDefense.id] =
          (this.state.runtime.stats.minionKillsByDefenseId[sourceDefense.id] ?? 0) + 1;
      }
    }

    if (source === 'trap' && sourceType) {
      recordStats(this.state.runtime.stats.trapStats, sourceType, 0, 1);
      const key = cellKey(sourceCell);
      this.state.memory.trapDangerByCell[key] = (this.state.memory.trapDangerByCell[key] ?? 0) + 1.25;
      this.state.message = `${adventurer.name} decouvre le concept de dalle regrettable.`;
    }

    if (source === 'minion' && sourceType) {
      recordStats(this.state.runtime.stats.minionStats, sourceType, 0, 1);
      this.state.message = sourceDefense
        ? `${adventurer.name} est neutralise par ${sourceDefense.name}. Prime de rendement refusee.`
        : `${adventurer.name} est neutralise par un employe sous-paye.`;
    }

    if (source === 'boss') {
      this.state.message = `${adventurer.name} rencontre le patron. Reunion courte.`;
    }

    return actualDamage;
  }

  private damageMinion(minion: DefenseEntity, damage: number, attacker: AdventurerEntity): void {
    minion.hp -= damage;

    if (minion.hp <= 0) {
      minion.alive = false;
      recordProfileMonsterKill(this.state.world, attacker.profileId);
      const label = `${minion.name} le ${getDefenseDefinition(minion.type).name}`;
      this.state.runtime?.stats.storyEvents.push(`${attacker.name} abat ${label}.`);

      if (minion.kills >= 3 || minion.wavesSurvived >= 2) {
        addChronicle(this.state.world, `${label} tombe apres ${minion.kills} victoires. Une minute de silence syndicale.`);
      }

      this.state.message = `${label} tombe. Il sera remplace par quelqu'un de moins syndique.`;
    }
  }

  private damageBoss(damage: number, attacker: AdventurerEntity): void {
    if (!this.state.runtime) {
      return;
    }

    const actualDamage = Math.min(this.state.boss.hp, damage);
    const previousProfileDamage = this.state.runtime.stats.bossDamageByProfile[attacker.profileId] ?? 0;
    this.state.boss.hp -= actualDamage;
    this.state.runtime.stats.bossDamageTaken += actualDamage;
    this.state.runtime.stats.bossDamageByProfile[attacker.profileId] =
      previousProfileDamage + actualDamage;

    if (previousProfileDamage === 0 && actualDamage > 0) {
      recordProfileBossEncounter(this.state.world, attacker.profileId);
    }

    if (this.state.boss.hp <= 0) {
      this.state.message = 'Le boss final tombe. Les heros appellent ca une fin heureuse. Degoutant.';
    }
  }

  private finishWaveVictory(): void {
    const runtime = this.state.runtime;

    if (!runtime) {
      return;
    }

    const currentWave = this.state.wave;
    const treasureStolen = runtime.stats.treasureStolen;
    const trapRefundGold = this.dismantleRemainingTraps();
    const rawGoldAwarded = 22 + currentWave * 6;
    const treasurePenaltyGold = treasureStolen ? Math.min(rawGoldAwarded + trapRefundGold, 8 + currentWave * 2) : 0;
    const economy = computeExpeditionEconomy({
      wave: currentWave,
      boss: this.state.boss,
      treasureStolen,
      trapRefundGold,
      treasurePenaltyGold,
    });
    const goldAwarded = economy.goldAwarded;
    const preparationBudget = economy.preparationBudget;
    const adaptationNotes = this.applyAdaptation(runtime.stats, runtime.elapsedMs);
    this.recordTopMinionFeat(runtime.stats);

    const rumor = generateTavernRumor({
      wave: currentWave,
      stats: runtime.stats,
      trapKills: sumStats(runtime.stats.trapStats, 'kills'),
      minionKills: sumStats(runtime.stats.minionStats, 'kills'),
      bossKills: runtime.stats.deaths.filter((record) => record.note.includes('entretien direct')).length,
      treasureStolen,
      cleared: true,
    });
    recordRumor(this.state.world, rumor);
    const rumorPressureNote = applyRumorPressure(rumor, this.state.memory);
    adaptationNotes.push(`Rumeur de taverne: ${rumor.text}`);

    if (rumorPressureNote) {
      adaptationNotes.push(rumorPressureNote);
    }

    if (treasureStolen) {
      adaptationNotes.push('Le tresor vole alimente toutes les conversations. Un tresor de remplacement est commande.');
    }

    if (runtime.stats.goldTreasureValueStolen > 0) {
      adaptationNotes.push(`${runtime.stats.goldTreasureValueStolen} or de tresors secondaires ont ete emportes sans nouvelle facture.`);
    }

    if (this.state.treasures.some((treasure) => treasure.status === 'dropped' || treasure.status === 'carried') && !treasureStolen) {
      addChronicle(this.state.world, 'Le tresor est recupere sur les depouilles et remis sur son socle.');
    }

    const previousTitle = this.state.world.dungeonReputation.title;
    const reputationDelta = updateDungeonReputation(
      this.state.world,
      runtime.stats.adventurersKilled * 2 + runtime.stats.adventurersEscaped + currentWave - (treasureStolen ? 6 : 0),
      treasureStolen
        ? 'Un tresor vole fait rire les tavernes. Tres mauvais pour le prestige.'
        : 'Les morts et survivants bavards ameliorent la notoriete du donjon.',
    );
    this.addReputationChronicle(previousTitle);
    const bossHeal = 24 + currentWave * 2;
    this.state.boss.hp = Math.min(this.state.boss.maxHp, this.state.boss.hp + bossHeal);
    this.state.gold += Math.max(0, preparationBudget);
    this.state.report = this.createReport(
      true,
      currentWave,
      runtime,
      goldAwarded,
      trapRefundGold,
      treasurePenaltyGold,
      economy.treasureProtectedBonusGold,
      economy.bossSurvivalBonusGold,
      Math.max(0, preparationBudget),
      adaptationNotes,
      reputationDelta,
    );
    this.state.wave += 1;
    this.state.phase = 'report';
    this.state.runtime = null;
    this.state.inspectedAdventurerId = null;
    this.state.message = treasureStolen
      ? 'Vague repoussee, mais le tresor est parti en vadrouille. Humiliant.'
      : 'Vague repoussee. La paperasse de necromancie commence.';
  }

  private recordTopMinionFeat(stats: WaveStats): void {
    const topEntry = Object.entries(stats.minionKillsByDefenseId).sort((a, b) => b[1] - a[1])[0];

    if (!topEntry || topEntry[1] < 2) {
      return;
    }

    const defense = this.state.defenses.find((candidate) => candidate.id === topEntry[0]);

    if (!defense) {
      return;
    }

    const label = `${defense.name} le ${getDefenseDefinition(defense.type).name}`;
    stats.storyEvents.push(`${label} signe ${topEntry[1]} eliminations cette vague.`);

    if (defense.kills >= 3) {
      addChronicle(this.state.world, `${label} devient un veteran du donjon (${defense.kills} victimes).`);
    }
  }

  private finishDefeat(): void {
    const runtime = this.state.runtime;

    if (!runtime) {
      return;
    }

    const adaptationNotes = ['Les aventuriers apprennent surtout a poser pour la statue commemorative.'];
    const survivorRecords = recordBossDefeatSurvivors(
      this.state.world,
      this.state.adventurers.filter((adventurer) => adventurer.alive && !adventurer.escaped).map((adventurer) => adventurer.profileId),
      this.state.wave,
    );
    runtime.stats.survivors.push(...survivorRecords);
    runtime.stats.adventurersEscaped += survivorRecords.length;
    const previousTitle = this.state.world.dungeonReputation.title;
    const reputationDelta = updateDungeonReputation(
      this.state.world,
      runtime.stats.adventurersKilled + survivorRecords.length,
      'La chute du boss fera parler les tavernes. Tres mauvais pour la confidentialite.',
    );
    this.addReputationChronicle(previousTitle);
    this.state.report = this.createReport(
      false,
      this.state.wave,
      runtime,
      0,
      0,
      0,
      0,
      0,
      0,
      adaptationNotes,
      reputationDelta,
    );
    this.state.phase = 'defeat';
    this.state.runtime = null;
    this.state.inspectedAdventurerId = null;
  }

  private createReport(
    cleared: boolean,
    wave: number,
    runtime: WaveRuntime,
    goldAwarded: number,
    trapRefundGold: number,
    treasurePenaltyGold: number,
    treasureProtectedBonusGold: number,
    bossSurvivalBonusGold: number,
    preparationBudget: number,
    adaptationNotes: string[],
    reputationDelta: number,
  ): WaveReport {
    const trapHighlights = statsToReportEntries(runtime.stats.trapStats, 'trap');
    const minionHighlights = statsToReportEntries(runtime.stats.minionStats, 'minion');
    const participants = this.buildParticipantReports(runtime, cleared);
    const continuity = this.buildContinuityPreview(wave + 1);
    const storyLines = buildWaveStoryLines({
      cleared,
      wave,
      stats: runtime.stats,
      trapHighlights,
      minionHighlights,
      dungeonTitle: this.state.world.dungeonReputation.title,
      reputationDelta,
    });

    const report: Omit<WaveReport, 'chronicle'> = {
      wave,
      cleared,
      partyLabel: runtime.partyPlan.label,
      durationSeconds: Math.round(runtime.elapsedMs / 1000),
      adventurersKilled: runtime.stats.adventurersKilled,
      adventurersEscaped: runtime.stats.adventurersEscaped,
      bossDamageTaken: Math.round(runtime.stats.bossDamageTaken),
      goldAwarded,
      trapRefundGold,
      treasurePenaltyGold,
      treasureProtectedBonusGold,
      bossSurvivalBonusGold,
      preparationBudget,
      abilityUses: runtime.stats.abilityUses,
      bossAbilityUses: runtime.stats.bossAbilityUses,
      doorsPicked: runtime.stats.doorsPicked,
      doorNoThiefRetreats: runtime.stats.doorNoThiefRetreats,
      fleeingTrapAvoidances: runtime.stats.fleeingTrapAvoidances,
      groupRetreats: runtime.stats.groupRetreats,
      coverRetreats: runtime.stats.coverRetreats,
      panicRetreats: runtime.stats.panicRetreats,
      disobeys: runtime.stats.disobeys,
      treasureStolen: runtime.stats.treasureStolen,
      dungeonReputation: this.state.world.dungeonReputation.value,
      reputationDelta,
      trapHighlights,
      minionHighlights,
      storyLines,
      learnedLines: this.buildLearnedLines(runtime, trapHighlights, minionHighlights),
      sharedLines: this.buildSharedLines(runtime, storyLines),
      gainsLosses: this.buildGainsLosses(runtime, participants),
      guildChanges: this.buildGuildChanges(wave, adaptationNotes),
      economyLines: this.buildEconomyLines(
        goldAwarded,
        trapRefundGold,
        treasurePenaltyGold,
        treasureProtectedBonusGold,
        bossSurvivalBonusGold,
        preparationBudget,
      ),
      participants,
      notableAdventurers: buildNotableAdventurers(runtime.stats),
      returningSurvivorNames: continuity.returningNames,
      newVolunteerCount: continuity.newVolunteerCount,
      veteranName: continuity.veteranName,
      deaths: runtime.stats.deaths.slice(-5).map((record) => record.note),
      survivors: runtime.stats.survivors.slice(-5).map((record) => record.note),
      adaptationNotes,
      verdict: cleared
        ? 'Tous les aventuriers sont morts. Ils reviendront, parce que les heros confondent obstination et scenario.'
        : 'Le boss est mort. Le donjon passe sous gestion heroique, donc probablement en open space.',
    };

    return {
      ...report,
      chronicle: buildSurvivorChronicle(report),
    };
  }

  private buildParticipantReports(runtime: WaveRuntime, cleared: boolean): ExpeditionParticipantReport[] {
    const deathByProfile = new Map(runtime.stats.deaths.map((record) => [record.profileId, record]));
    const survivorByProfile = new Map(runtime.stats.survivors.map((record) => [record.profileId, record]));

    return runtime.partyProfiles.map((profile) => {
      const death = deathByProfile.get(profile.id);

      if (death) {
        return {
          name: profile.name,
          role: profile.role,
          level: profile.level,
          status: 'mort',
          note: death.note,
        };
      }

      const survivor = survivorByProfile.get(profile.id);

      if (survivor) {
        const currentProfile = this.state.world.profiles[profile.id] ?? profile;
        const injured = currentProfile.lifeStatus === 'injured';
        return {
          name: currentProfile.name,
          role: currentProfile.role,
          level: currentProfile.level,
          status: injured ? 'blesse' : cleared ? 'fuite' : 'survivant',
          note: survivor.note,
        };
      }

      return {
        name: profile.name,
        role: profile.role,
        level: profile.level,
        status: 'disparu',
        note: 'Aucun temoin fiable ne sait ou ce dossier s est termine.',
      };
    });
  }

  private buildLearnedLines(
    runtime: WaveRuntime,
    trapHighlights: ReportEntry[],
    minionHighlights: ReportEntry[],
  ): string[] {
    const lines: string[] = [];
    const bestTrap = trapHighlights[0];
    const bestMinion = minionHighlights[0];
    const bossKills = runtime.stats.deaths.filter((record) => record.note.includes('entretien direct')).length;

    if (bestTrap) {
      lines.push(`${bestTrap.label}: ${bestTrap.damage} degats observes, ${bestTrap.kills} mort${bestTrap.kills > 1 ? 's' : ''}. Les voleurs marquent ces dalles.`);
    } else {
      lines.push('Aucun piege n a domine le rapport. La guilde cherchera le danger ailleurs.');
    }

    if (bestMinion) {
      lines.push(`${bestMinion.label}: menace prioritaire, ${bestMinion.damage} degats et ${bestMinion.kills} elimination${bestMinion.kills > 1 ? 's' : ''}.`);
    } else {
      lines.push('Les monstres n ont pas signe de massacre clair, mais leurs positions sont notees.');
    }

    if (runtime.stats.bossDamageTaken > 0 || bossKills > 0) {
      lines.push(`Le boss est observe: ${Math.round(runtime.stats.bossDamageTaken)} degats infliges, ${bossKills} mort${bossKills > 1 ? 's' : ''} au contact.`);
    } else {
      lines.push('La salle du boss reste surtout une rumeur couteuse.');
    }

    if (runtime.stats.tacticalHesitations > 0 || runtime.stats.thiefTrapMitigations > 0 || runtime.stats.thiefDoorLeads > 0) {
      lines.push(
        `Lecture terrain: ${runtime.stats.tacticalHesitations} hesitation${runtime.stats.tacticalHesitations > 1 ? 's' : ''}, ` +
          `${runtime.stats.thiefTrapMitigations} piege${runtime.stats.thiefTrapMitigations > 1 ? 's' : ''} affaibli${runtime.stats.thiefTrapMitigations > 1 ? 's' : ''}, ` +
          `${runtime.stats.thiefDoorLeads} intervention${runtime.stats.thiefDoorLeads > 1 ? 's' : ''} de voleur sur porte.`,
      );
    }

    if (runtime.stats.doorNoThiefRetreats > 0) {
      lines.push("La Guilde retient qu'une porte verrouillee exige un voleur vivant.");
    } else if (runtime.stats.doorsPicked > 0) {
      lines.push(`Crochetage observe: ${runtime.stats.doorsPicked} porte${runtime.stats.doorsPicked > 1 ? 's' : ''} verrouillee${runtime.stats.doorsPicked > 1 ? 's' : ''} ouverte${runtime.stats.doorsPicked > 1 ? 's' : ''}.`);
    }

    lines.push(...buildCombatAbilityReportLines(runtime.stats));

    if (runtime.stats.treasureStolen) {
      lines.push('Le chemin vers le tresor est confirme et vendable en taverne.');
    } else if (runtime.stats.goldTreasureValueStolen > 0) {
      lines.push(`Un tresor d'or est sorti (${runtime.stats.goldTreasureValueStolen} or), mais le tresor principal reste protege.`);
    } else {
      lines.push('Le tresor n est pas sorti: la route existe, mais le prix a payer reste dissuasif.');
    }

    return lines;
  }

  private buildSharedLines(runtime: WaveRuntime, storyLines: string[]): string[] {
    const survivorNames = runtime.stats.survivors.map((record) => record.adventurerName);
    const lines: string[] = [];

    if (survivorNames.length > 0) {
      lines.push(`${survivorNames.slice(0, 3).join(', ')} transmet${survivorNames.length > 1 ? 'tent' : ''} cartes, blessures et exagerations a la guilde.`);
    } else {
      lines.push('Aucun survivant officiel, mais les effets personnels recuperes alimentent deja les hypotheses.');
    }

    const rumor = this.state.world.rumors[this.state.world.rumors.length - 1] ?? null;

    if (rumor) {
      lines.push(`Rumeur diffusee: ${rumor.text}`);
    }

    lines.push(storyLines[0] ?? 'Le royaume classe cette expedition comme instructive et tres mal payee.');
    return lines;
  }

  private buildGainsLosses(
    runtime: WaveRuntime,
    participants: ExpeditionParticipantReport[],
  ): string[] {
    const injuredCount = participants.filter((participant) => participant.status === 'blesse').length;
    const highestLevel = Math.max(...participants.map((participant) => participant.level));
    const losses = runtime.stats.adventurersKilled;
    const escaped = runtime.stats.adventurersEscaped;

    const lines = [
      `${participants.length} dossiers traites: ${losses} mort${losses > 1 ? 's' : ''}, ${escaped} retour${escaped > 1 ? 's' : ''} ou fuite${escaped > 1 ? 's' : ''}.`,
      `${injuredCount} blessure${injuredCount > 1 ? 's' : ''} durable${injuredCount > 1 ? 's' : ''}; les survivants gagnent experience, trauma et mauvaises idees.`,
      `Niveau maximum observe dans l equipe: ${highestLevel}.`,
    ];

    if (runtime.stats.goldTreasureValueStolen > 0) {
      lines.push(`Tresors d'or voles: ${runtime.stats.goldTreasureValueStolen} or deja deposes, aucune penalite de remplacement.`);
    }

    if (runtime.stats.treasureValueStolen > 0 && runtime.stats.treasureCarrierName) {
      lines.push(`Butin sorti par ${runtime.stats.treasureCarrierName}: ${runtime.stats.treasureValueStolen} valeur d'objectif.`);
    }

    return lines;
  }

  private buildGuildChanges(wave: number, adaptationNotes: string[]): string[] {
    const continuity = this.buildContinuityPreview(wave + 1);
    const lines = [
      continuity.returningNames.length > 0
        ? `Revenants garantis: ${continuity.returningNames.slice(0, 3).join(', ')}${continuity.returningNames.length > 3 ? '...' : ''}.`
        : 'Aucun temoin fiable: cinq nouveaux volontaires seront requis.',
      continuity.veteranName ? `Veteran pressenti: ${continuity.veteranName}.` : `Nouveaux volontaires: ${continuity.newVolunteerCount}.`,
      `Composition probable: ${formatRoster(continuity.plannedRoles)}.`,
      ...adaptationNotes,
    ];

    return lines.slice(0, 6);
  }

  private buildEconomyLines(
    goldAwarded: number,
    trapRefundGold: number,
    treasurePenaltyGold: number,
    treasureProtectedBonusGold: number,
    bossSurvivalBonusGold: number,
    preparationBudget: number,
  ): string[] {
    const lines = [
      `Or gagne par notoriete: +${goldAwarded}.`,
      `Or recupere via demontage des pieges: +${trapRefundGold}.`,
    ];

    if (treasureProtectedBonusGold > 0) {
      lines.push(`Tresor protege: +${treasureProtectedBonusGold}.`);
    }

    if (bossSurvivalBonusGold > 0) {
      lines.push(`Boss encore debout: +${bossSurvivalBonusGold}.`);
    }

    if (treasurePenaltyGold > 0) {
      lines.push(`Tresor vole: -${treasurePenaltyGold} pour remplacer l humiliation brillante.`);
    }

    lines.push(`Budget ajoute pour la prochaine preparation: ${preparationBudget}.`);
    lines.push(`Tresorerie actuelle du donjon: ${this.state.gold} or.`);
    return lines;
  }

  private maybeStartRetreat(adventurer: AdventurerEntity): void {
    if (adventurer.targetStage === 'exit') {
      return;
    }

    const healthRatio = adventurer.hp / adventurer.maxHp;
    const retreatThreshold = adventurer.traits.includes('traumatized') ? 0.34 : 0.24;

    if (!adventurer.traits.includes('cautious') && !adventurer.traits.includes('traumatized')) {
      return;
    }

    if (healthRatio > retreatThreshold) {
      return;
    }

    this.startGroupRetreat(`${adventurer.name} appelle la retraite avant de devenir une statistique.`, 'danger');
    this.state.message = `${adventurer.name} choisit la strategie heroique dite "sortir vivant".`;
  }

  private getTargetCell(adventurer: AdventurerEntity): GridCell {
    if (adventurer.targetStage === 'treasure') {
      const treasure = this.getRuntimeTreasureTarget();

      if (treasure?.status === 'dropped' && treasure.droppedCell) {
        return treasure.droppedCell;
      }

      return treasure?.cell ?? this.getBossCell();
    }

    if (adventurer.targetStage === 'exit') {
      return ENTRY_CELL;
    }

    return { x: Math.round(this.state.boss.x), y: Math.round(this.state.boss.y) };
  }

  private recordEscape(adventurer: AdventurerEntity): void {
    if (!this.state.runtime || adventurer.escaped || !adventurer.alive) {
      return;
    }

    adventurer.escaped = true;
    this.state.runtime.stats.adventurersEscaped += 1;

    if (adventurer.carryingTreasure) {
      adventurer.carryingTreasure = false;
      const treasure = this.state.treasures.find((candidate) => candidate.holderAdventurerId === adventurer.id);

      if (treasure) {
        treasure.status = 'stolen';
        treasure.holderAdventurerId = null;
        treasure.droppedCell = null;
        this.state.treasure = this.toLegacyTreasureState(treasure);
        this.state.runtime.stats.treasureValueStolen += treasure.value;

        if (treasure.kind === 'gold') {
          this.state.runtime.stats.goldTreasureValueStolen += treasure.value;
        } else {
          this.state.runtime.stats.treasureStolen = true;
        }
      } else {
        this.state.runtime.stats.treasureStolen = true;
        this.state.treasure = { status: 'stolen', holderAdventurerId: null, droppedCell: null };
      }

      recordTreasureTheft(this.state.world, adventurer.profileId, treasure?.kind === 'gold' ? treasure.value : 0);
      this.state.runtime.stats.storyEvents.push(
        treasure?.kind === 'gold'
          ? `${adventurer.name} s'echappe avec ${treasure.value} or deja deposes.`
          : `${adventurer.name} s'echappe avec le tresor du donjon.`,
      );
      this.state.message = treasure?.kind === 'gold'
        ? `${adventurer.name} sort avec un tresor d'or. L'or etait deja depose: pas de double facture.`
        : `${adventurer.name} sort avec TON tresor. La comptabilite exige des represailles.`;
    }

    const injury = createInjury(
      adventurer.name,
      'la derniere expedition',
      adventurer.hp / adventurer.maxHp,
    );
    const record = recordProfileSurvival(
      this.state.world,
      adventurer.profileId,
      this.state.wave,
      this.describeSurvival(adventurer, injury !== null),
      injury,
    );

    if (record) {
      this.state.runtime.stats.survivors.push(record);
      this.state.runtime.stats.storyEvents.push(record.note);
    }
  }

  private updatePartyDecisions(): void {
    if (!this.state.runtime) {
      return;
    }

    const decision = updatePartyPlan(
      this.state.runtime.partyPlan,
      this.state.adventurers,
      this.state.runtime.stats,
      this.state.runtime.elapsedMs,
      this.state.runtime.spawnQueue.length,
    );

    if (decision) {
      this.state.message = decision;
      this.state.runtime.stats.storyEvents.push(decision);
      this.startGroupRetreat(decision, decision.includes('tresor') ? 'treasure' : 'danger');
    }

    applyPartyDecisions(this.state.runtime.partyPlan, this.state.adventurers);
  }

  private updateMonsterMovement(deltaMs: number): void {
    const result = updateMonsterAI(this.state.defenses, this.state.adventurers, deltaMs, this.monsterMovementGuard());
    const slowedIds = new Set(result.slowedAdventurerIds);

    this.state.adventurers.forEach((adventurer) => {
      adventurer.slowedTimerMs = Math.max(0, adventurer.slowedTimerMs - deltaMs);

      if (slowedIds.has(adventurer.id)) {
        adventurer.slowedTimerMs = Math.max(adventurer.slowedTimerMs, 620);
      }

      adventurer.speedMultiplier = adventurer.slowedTimerMs > 0 ? 0.58 : 1;
    });
  }

  private updateBossAutopilot(deltaMs: number): void {
    const runtime = this.state.runtime;

    if (!runtime || this.state.adventurers.length === 0) {
      this.state.bossAutopilotIntent = null;
      return;
    }

    runtime.bossAutopilotTimerMs = Math.max(0, runtime.bossAutopilotTimerMs - deltaMs);

    if (runtime.bossAutopilotTimerMs > 0) {
      return;
    }

    runtime.bossAutopilotTimerMs = 620;
    const decision = chooseBossAutopilotAbility(this.state.boss, {
      adventurers: this.state.adventurers,
      defenses: this.state.defenses,
      doors: this.state.doors,
      stats: runtime.stats,
    });
    this.state.bossAutopilotIntent = decision.intent;

    if (!decision.ability) {
      return;
    }

    if (this.useBossAbility(decision.ability)) {
      runtime.stats.storyEvents.push(`Autopilote du boss: ${decision.intent ?? 'reaction instinctive'}`);
      this.state.message = `${this.state.bossLastAbilityName ?? 'Pouvoir du boss'} automatique: ${decision.intent ?? 'le trone se defend tout seul.'}`;
    }
  }

  private entityMovementGuard(): {
    canMoveBetween: (fromX: number, fromY: number, toX: number, toY: number) => boolean;
    getNextWaypoint: (fromX: number, fromY: number, targetX: number, targetY: number) => GridCell | null;
  } {
    return {
      canMoveBetween: (fromX, fromY, toX, toY) => canEntityMoveBetween(this.state.tiles, fromX, fromY, toX, toY),
      getNextWaypoint: (fromX, fromY, targetX, targetY) => {
        const start = { x: Math.round(fromX), y: Math.round(fromY) };
        const goal = { x: Math.round(targetX), y: Math.round(targetY) };

        if (isSameCell(start, goal)) {
          return goal;
        }

        return findPath(start, goal, {
          role: 'warrior',
          trapAvoidance: 0,
          trapDangerByCell: {},
          knownTrapCells: new Set(),
          blockedCellKeys: getBlockedCellKeys(this.state.tiles),
        })[0] ?? null;
      },
    };
  }

  private monsterMovementGuard(): {
    canMoveBetween: (fromX: number, fromY: number, toX: number, toY: number) => boolean;
    getNextWaypoint: (fromX: number, fromY: number, targetX: number, targetY: number) => GridCell | null;
  } {
    return {
      canMoveBetween: (fromX, fromY, toX, toY) =>
        canEntityMoveBetween(this.state.tiles, fromX, fromY, toX, toY) &&
        !this.closedDoorBlocksMovementBetween(fromX, fromY, toX, toY),
      getNextWaypoint: (fromX, fromY, targetX, targetY) => {
        const start = { x: Math.round(fromX), y: Math.round(fromY) };
        const goal = { x: Math.round(targetX), y: Math.round(targetY) };

        if (isSameCell(start, goal)) {
          return goal;
        }

        return findPath(start, goal, {
          role: 'warrior',
          trapAvoidance: 0,
          trapDangerByCell: {},
          knownTrapCells: new Set(),
          blockedCellKeys: new Set([...getBlockedCellKeys(this.state.tiles), ...this.getClosedDoorCellKeys()]),
        })[0] ?? null;
      },
    };
  }

  private closedDoorBlocksMovementBetween(fromX: number, fromY: number, toX: number, toY: number): boolean {
    const closedDoorKeys = this.getClosedDoorCellKeys();
    const travelDistance = Math.hypot(toX - fromX, toY - fromY);
    const steps = Math.max(1, Math.ceil(travelDistance / 0.2));

    for (let index = 1; index <= steps; index += 1) {
      const ratio = index / steps;
      const cell = {
        x: Math.round(fromX + (toX - fromX) * ratio),
        y: Math.round(fromY + (toY - fromY) * ratio),
      };

      if (closedDoorKeys.has(cellKey(cell))) {
        return true;
      }
    }

    return false;
  }

  private getClosedDoorCellKeys(): Set<string> {
    return new Set(
      this.state.doors
        .filter((door) => !door.destroyed && !door.openedForExpedition)
        .map((door) => cellKey(door.cell)),
    );
  }

  private describeSurvival(adventurer: AdventurerEntity, injured: boolean): string {
    const profile = this.state.world.profiles[adventurer.profileId];
    const expeditionCount = profile?.expeditionCount ?? 1;
    const expeditionLabel = expeditionCount === 1 ? 'premiere expedition' : `${expeditionCount}e expedition`;

    if (injured) {
      return `${adventurer.name} survit a sa ${expeditionLabel}, mais repart blesse.`;
    }

    return `${adventurer.name} survit a sa ${expeditionLabel}. C'est exactement comme ca que naissent les problemes recurrents.`;
  }

  private tryUseCombatAbility(adventurer: AdventurerEntity): boolean {
    const runtime = this.state.runtime;

    if (!runtime) {
      return false;
    }

    return tryUseAdventurerAbility(adventurer, {
      adventurers: this.state.adventurers,
      defenses: this.state.defenses,
      boss: this.state.boss,
      doors: this.state.doors,
      stats: runtime.stats,
      elapsedMs: runtime.elapsedMs,
      damageMinion: (target, damage, attacker) => this.damageMinion(target, damage, attacker),
      damageBoss: (damage, attacker) => this.damageBoss(damage, attacker),
      healAdventurer: (target, amount) => this.healAdventurer(target, amount),
      suppressTrap: (trap, durationMs) => {
        trap.cooldownRemainingMs = Math.max(trap.cooldownRemainingMs, durationMs);
        trap.abilityFxTimerMs = COMBAT_ABILITY_BALANCE.abilityFxMs;
      },
      bark: (target, kind) => {
        tryBark(target, kind, this.visibleBarkCount());
      },
      message: (text) => {
        this.state.message = text;
      },
      rememberTrap: (cell, danger) => {
        this.state.memory.trapDangerByCell[cellKey(cell)] = Math.max(
          this.state.memory.trapDangerByCell[cellKey(cell)] ?? 0,
          danger,
        );
      },
    });
  }

  private healAdventurer(target: AdventurerEntity, amount: number): number {
    if (!target.alive || target.escaped) {
      return 0;
    }

    const healed = Math.min(amount, target.maxHp - target.hp);
    target.hp += healed;
    target.abilityFxTimerMs = Math.max(target.abilityFxTimerMs, COMBAT_ABILITY_BALANCE.abilityFxMs);
    return healed;
  }

  private applyLocalDecision(adventurer: AdventurerEntity): void {
    if (!this.state.runtime) {
      return;
    }

    const decision = evaluateLocalAdventurerDecision(adventurer, {
      partyPlan: this.state.runtime.partyPlan,
      adventurers: this.state.adventurers,
      defenses: this.state.defenses,
      doors: this.state.doors,
      targetCell: this.getTargetCell(adventurer),
    });

    adventurer.decisionSpeedMultiplier = decision.speedMultiplier;
    const canReactNow = adventurer.barkCooldownMs <= 0;

    if (decision.bark) {
      tryBark(adventurer, decision.bark, this.visibleBarkCount());
    }

    if (decision.forceExit && decision.bark === 'doorNoThief') {
      this.retreatFromDoorWithoutThief(adventurer);
      return;
    }

    if (decision.forceExit) {
      adventurer.targetStage = 'exit';
      adventurer.path = [];
    }

    if (decision.clearPath) {
      adventurer.path = [];
    }

    if (decision.reason) {
      this.state.message = decision.reason;
      this.state.runtime.stats.storyEvents.push(decision.reason);
    }

    if (decision.hesitateMs > 0 && canReactNow) {
      adventurer.hesitationTimerMs = Math.max(adventurer.hesitationTimerMs, decision.hesitateMs);
      this.state.runtime.stats.tacticalHesitations += 1;
    }
  }

  private createPartyBark(kind: 'bossAbility' | 'treasureTaken'): void {
    const speaker = this.state.adventurers.find((adventurer) => adventurer.alive && !adventurer.escaped && adventurer.barkCooldownMs <= 0)
      ?? this.state.adventurers.find((adventurer) => adventurer.alive && !adventurer.escaped);

    if (speaker) {
      tryBark(speaker, kind, this.visibleBarkCount());
    }
  }

  private barkRoleNearTreasureCarrier(carrier: AdventurerEntity, kind: BarkKind): void {
    const speaker = this.state.adventurers
      .filter((adventurer) => adventurer.id !== carrier.id && adventurer.alive && !adventurer.escaped && adventurer.barkCooldownMs <= 0)
      .sort((a, b) => {
        const priorityA = a.role === 'warrior' ? 0 : a.role === 'healer' ? 1 : a.role === 'thief' ? 2 : 3;
        const priorityB = b.role === 'warrior' ? 0 : b.role === 'healer' ? 1 : b.role === 'thief' ? 2 : 3;
        return priorityA - priorityB || distance(a.x, a.y, carrier.x, carrier.y) - distance(b.x, b.y, carrier.x, carrier.y);
      })[0] ?? null;

    if (speaker) {
      tryBark(speaker, kind, this.visibleBarkCount());
    }
  }

  private visibleBarkCount(): number {
    return this.state.adventurers.filter((adventurer) => adventurer.barkText && adventurer.barkTimerMs > 0).length;
  }

  private addReputationChronicle(previousTitle: string): void {
    const currentTitle = this.state.world.dungeonReputation.title;

    if (currentTitle !== previousTitle) {
      addChronicle(this.state.world, `Le donjon gagne un nouveau titre: ${currentTitle}.`);
    }
  }

  private applyAdaptation(stats: WaveStats, durationMs: number): string[] {
    const notes: string[] = [];
    const trapDamage = sumStats(stats.trapStats, 'damage');
    const trapKills = sumStats(stats.trapStats, 'kills');
    const minionDamage = sumStats(stats.minionStats, 'damage');
    const minionKills = sumStats(stats.minionStats, 'kills');
    const trapCount = this.state.defenses.filter((defense) => defense.kind === 'trap').length;
    const bossKills = stats.deaths.filter((record) => record.note.includes('entretien direct')).length;

    if (trapCount >= 3 || trapDamage >= 55 || trapKills >= 2) {
      this.state.memory.rolePressure.thief += 1;
      this.state.memory.trapAvoidance = Math.min(2.75, this.state.memory.trapAvoidance + 0.28);
      notes.push('Ils recrutent plus de voleurs et notent les dalles meurtrieres. Delation cartographique.');
    }

    if (stats.doorNoThiefRetreats > 0) {
      this.state.memory.rolePressure.thief += 3;
      notes.push('Porte verrouillee sans specialiste: la Guilde inscrit "voleur requis" en haut du prochain contrat.');
    }

    if (durationMs >= 26000 || stats.combatEngagementMs >= 9000) {
      this.state.memory.rolePressure.healer += 1;
      notes.push('Les combats durent trop longtemps: un soigneur supplementaire prepare des pansements pretentieux.');
    }

    if (minionDamage >= 70 || minionKills >= 2) {
      this.state.memory.rolePressure.warrior += 1;
      notes.push('Tes sbires font mal: ils enverront plus de guerriers epais comme des portes de crypte.');
    }

    if (bossKills >= 2 || stats.bossDamageTaken >= 90) {
      this.state.memory.rolePressure.healer += 1;
      this.state.memory.rolePressure.warrior += 1;
      notes.push('Le boss devient le probleme officiel: plus de tanks et de soigneurs sont requis pour le prochain dossier.');
    }

    if (stats.treasureStolen && stats.bossDamageTaken < 45) {
      this.state.memory.rolePressure.warrior += 1;
      this.state.memory.rolePressure.mage += 1;
      notes.push('Ils ont vole le tresor sans regler le boss: la prochaine equipe cherchera davantage la confrontation.');
    }

    if (stats.adventurersKilled >= PARTY_SIZE - 1 && durationMs < 18000) {
      this.state.memory.rolePressure.healer += 1;
      this.state.memory.rolePressure.thief += 1;
      notes.push('Expedition decimee trop tot: la guilde prepare une approche plus prudente et mieux eclairee.');
    }

    if (notes.length === 0) {
      this.state.memory.rolePressure.mage += 1;
      notes.push('Ils improvisent avec plus de magie. Quand on manque de plan, on ajoute des etincelles.');
    }

    return notes;
  }

  private withdrawUndeployedAdventurer(adventurer: AdventurerEntity): void {
    releaseUndeployedExpedition(this.state.world, adventurer.profileId);
    adventurer.alive = false;
  }

  private dismantleRemainingTraps(): number {
    let refund = 0;
    const remaining: DefenseEntity[] = [];

    this.state.defenses.forEach((defense) => {
      if (defense.kind === 'trap') {
        refund += getDefenseDefinition(defense.type).cost;
        return;
      }

      remaining.push(defense);
    });

    this.state.defenses = remaining;
    return refund;
  }

  private removeDeadMinions(): void {
    this.state.defenses = this.state.defenses.filter((defense) => defense.kind === 'trap' || defense.alive);
  }

  private findNearestAdventurer(x: number, y: number, maxRange: number, preferredId: string | null = null): AdventurerEntity | null {
    const alive = this.state.adventurers.filter((adventurer) => adventurer.alive && !adventurer.escaped);
    const preferred = preferredId ? alive.find((adventurer) => adventurer.id === preferredId) ?? null : null;

    if (preferred && distance(x, y, preferred.x, preferred.y) <= maxRange + 0.8) {
      return preferred;
    }

    return alive
      .map((adventurer) => ({
        adventurer,
        distance: distance(x, y, adventurer.x, adventurer.y),
      }))
      .filter((entry) => entry.distance <= maxRange)
      .sort((a, b) => a.distance - b.distance)[0]?.adventurer ?? null;
  }

  private findTargetMinion(adventurer: AdventurerEntity): DefenseEntity | null {
    return this.state.defenses
      .filter((defense) => defense.alive && defense.kind === 'minion')
      .map((defense) => ({
        defense,
        distance: distance(adventurer.x, adventurer.y, defense.x, defense.y),
        nemesisPriority:
          adventurer.personality === 'vengeful' && defense.type === adventurer.nemesisDefenseType ? 0 : 1,
      }))
      .filter((entry) => entry.distance <= adventurer.attackRange)
      .sort((a, b) => a.nemesisPriority - b.nemesisPriority || a.distance - b.distance)[0]?.defense ?? null;
  }

  private getKnownTrapCells(): Set<string> {
    return new Set(
      this.state.defenses
        .filter((defense) => defense.alive && defense.kind === 'trap')
        .map((defense) => cellKey(defense.cell)),
    );
  }

  private countDefensesByKind(): CountItem[] {
    const traps = this.state.defenses.filter((defense) => defense.kind === 'trap').length;
    const minions = this.state.defenses.filter((defense) => defense.kind === 'minion').length;

    return [
      { label: 'Pieges', count: traps },
      { label: 'Sbires', count: minions },
    ];
  }

  private hasActiveDoor(): boolean {
    return this.state.doors.some((door) => !door.destroyed);
  }

  private buildDoorSummary(): DoorSummary {
    const activeDoors = this.state.doors.filter((door) => !door.destroyed);
    const locked = activeDoors.filter((door) => !door.openedForExpedition).length;
    const opened = activeDoors.filter((door) => door.openedForExpedition).length;
    const beingPicked = activeDoors.filter((door) => door.beingPickedById !== null).length;

    return {
      active: activeDoors.length,
      locked,
      opened,
      beingPicked,
    };
  }

  private buildTerritorySummary(): CountItem[] {
    const summary = summarizeTiles(this.state.tiles);
    return [
      { label: 'Roche', count: summary.rock },
      { label: 'Sol creuse', count: summary.floor },
      { label: 'Salles', count: summary.rooms + summary.special },
    ];
  }
}

function createEmptyWaveStats(): WaveStats {
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
    treasureTargetId: null,
    treasureValueStolen: 0,
    goldTreasureValueStolen: 0,
  };
}

function createSecureTreasure(): TreasureState {
  return {
    status: 'secure',
    holderAdventurerId: null,
    droppedCell: null,
  };
}

function createMainTreasure(): DungeonTreasure {
  return {
    id: 'main-treasure',
    kind: 'main',
    cell: { ...TREASURE_CELL },
    value: 0,
    status: 'secure',
    holderAdventurerId: null,
    droppedCell: null,
  };
}

function formatRoster(roles: AdventurerRole[]): string {
  return roles.map((role) => ADVENTURER_DEFINITIONS[role].name).join(', ');
}

function recordStats(stats: DefenseStatsByType, type: DefenseType, damage: number, kills: number): void {
  const entry = stats[type] ?? { damage: 0, kills: 0 };
  entry.damage += damage;
  entry.kills += kills;
  stats[type] = entry;
}

function statsToReportEntries(stats: DefenseStatsByType, expectedKind: 'trap' | 'minion'): ReportEntry[] {
  return Object.entries(stats)
    .map(([type, entry]) => {
      const defenseType = type as DefenseType;
      const definition = DEFENSE_DEFINITIONS[defenseType];
      return {
        label: definition.name,
        damage: Math.round((entry as EffectStats).damage),
        kills: (entry as EffectStats).kills,
        kind: definition.kind,
      };
    })
    .filter((entry) => entry.kind === expectedKind && (entry.damage > 0 || entry.kills > 0))
    .sort((a, b) => b.kills - a.kills || b.damage - a.damage)
    .map(({ label, damage, kills }) => ({ label, damage, kills }));
}

function countRoles(roles: AdventurerRole[]): CountItem[] {
  return ADVENTURER_ORDER.map((role) => ({
    label: ADVENTURER_DEFINITIONS[role].name,
    count: roles.filter((candidate) => candidate === role).length,
  }));
}

function sumStats(stats: DefenseStatsByType, field: keyof EffectStats): number {
  return Object.values(stats).reduce((total, entry) => total + (entry?.[field] ?? 0), 0);
}

function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

function personalityTrapAvoidance(adventurer: AdventurerEntity): number {
  if (adventurer.personality === 'cautious') {
    return 1.45;
  }

  if (adventurer.personality === 'traumatized') {
    return 1.25 + adventurer.level * 0.03;
  }

  if (adventurer.personality === 'greedy') {
    return 0.82;
  }

  return 1;
}

function describeDeathCause(
  source: 'trap' | 'minion' | 'boss',
  sourceType: DefenseType | null,
  sourceDefense: DefenseEntity | null = null,
): string {
  if (sourceDefense && sourceDefense.kind === 'minion') {
    return `${sourceDefense.name} le ${getDefenseDefinition(sourceDefense.type).name}`;
  }

  if (sourceType) {
    return getDefenseDefinition(sourceType).name;
  }

  return source === 'boss' ? 'entretien direct avec le boss' : 'circonstances administrativement floues';
}

function buildNotableAdventurers(stats: WaveStats): string[] {
  const notes: string[] = [];
  const bossDamageEntries = Object.entries(stats.bossDamageByProfile)
    .filter(([, damage]) => damage > 0)
    .sort((a, b) => b[1] - a[1]);

  if (stats.survivors.length > 0) {
    notes.push(...stats.survivors.slice(-3).map((record) => `${record.adventurerName}: survivant, donc futur probleme.`));
  }

  if (stats.deaths.length > 0) {
    notes.push(...stats.deaths.slice(-3).map((record) => `${record.adventurerName}: mort, excellent pour la reputation.`));
  }

  bossDamageEntries.slice(0, 2).forEach(([profileId, damage]) => {
    const record = [...stats.deaths, ...stats.survivors].find((entry) => entry.profileId === profileId);
    notes.push(`${record?.adventurerName ?? profileId}: ${Math.round(damage)} degats au boss.`);
  });

  return [...new Set(notes)].slice(0, 5);
}
