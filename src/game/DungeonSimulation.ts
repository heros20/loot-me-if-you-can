import {
  BOSS_CELL,
  DIG_COST,
  DOOR_COST,
  ENTRANCE_MAP_ID,
  ENTRY_CELL,
  FINAL_MAP_ID,
  GOLD_TREASURE_DEFAULT_VALUE,
  MAX_TREASURES_V1,
  PARTY_SIZE,
  RESEAL_TILE_COST,
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
  getBlockedCellKeys,
  getTileAt,
  setDungeonTile,
  summarizeTiles,
} from './dungeonTiles';
import type {
  AdventurerEntity,
  AdventurerProfile,
  AdventurerRemains,
  AdventurerRole,
  BossAbilityType,
  BossEngagementState,
  BossEntity,
  CombatFeedbackEvent,
  CombatFeedbackStyle,
  ConstructionTool,
  DefenseEntity,
  DefenseStatsByType,
  DefenseType,
  DungeonDoor,
  DungeonMap,
  DungeonTransition,
  DungeonTreasure,
  DungeonTreasureKind,
  DungeonZone,
  DungeonValidation,
  EffectStats,
  ExpeditionExplorationTarget,
  ExpeditionParticipantReport,
  GameState,
  GridCell,
  KingdomMemoryFactKind,
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
  updateDungeonReputation,
} from '../systems/adventurerProfiles';
import {
  planExpeditionComposition,
  selectProfilesForWave,
  type ExpeditionCompositionContext,
} from '../systems/expeditionComposition';
import { buildWaveStoryLines } from '../systems/narrativeReports';
import { buildSurvivorChronicle } from '../systems/survivorChronicleSystem';
import { buildGuildTavernScene } from '../systems/guildTavernSceneSystem';
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
  resealDugTile,
} from '../systems/dungeonConstruction';
import {
  findActiveDoorAt,
  placeDoorAt,
  repairDoors,
  removeDoorAt,
} from '../systems/doorSystem';
import {
  SPECIAL_TREASURE_BALANCE,
  computeSpecialTreasureModifiersFromBonuses,
  describeSpecialTreasureBonus,
  formatSpecialTreasureBonuses,
  grantSpecialTreasureBonus,
  isSpecialTreasureKind,
  specialKindFromTreasureKind,
  specialTreasureLabel,
  specialTreasurePickupText,
  specialTreasureValue,
} from '../systems/specialTreasuresSystem';
import {
  addThreat,
  chooseThreatTarget,
  decayThreat,
} from '../systems/combatThreatSystem';
import {
  BASE_OBSERVATION_RADIUS,
  CARTOGRAPHER_OBSERVATION_RADIUS,
  commitSurvivorObservations,
  computeCartographerRecruitmentPressure,
  summarizeCartographyResult,
} from '../systems/kingdomMemorySystem';
import {
  compressRemains,
  createAdventurerRemains,
  deathSiteFactKinds,
  describeRemainsLoot,
  reactionLineFor,
  shouldReactToRemains,
  shouldRecognizeRelic,
  updateRemainsVisualState,
} from '../systems/remainsRelicsSystem';
import {
  findZoneForCell,
  isGuardianPreferredCell,
} from '../systems/dungeonZoneSystem';
import {
  createInitialDungeonMaps,
  recalculateDungeonMapZones,
} from '../systems/dungeonMapSystem';

const BOSS_TEMPLATE: Omit<BossEntity, 'hp' | 'attackTimerMs' | 'abilities'> = {
  mapId: FINAL_MAP_ID,
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
  threatByAdventurerId: {},
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
    type: 'reseal',
    name: 'Reboucher',
    description: `Rebouche une case creusee non critique. ${RESEAL_TILE_COST} or.`,
    category: 'construction',
    cost: RESEAL_TILE_COST,
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
    type: 'addWeaponTreasure',
    name: "Tresor d'arme",
    description: `Attire les cupides. Si un survivant le vole, il garde +${SPECIAL_TREASURE_BALANCE.weaponDamageBonus} degats.`,
    category: 'objectives',
    cost: SPECIAL_TREASURE_BALANCE.weaponCost,
  },
  {
    type: 'addArmorTreasure',
    name: "Tresor d'armure",
    description: `Si un survivant le vole, il garde +${SPECIAL_TREASURE_BALANCE.armorMaxHpBonus} PV et encaisse un peu mieux.`,
    category: 'objectives',
    cost: SPECIAL_TREASURE_BALANCE.armorCost,
  },
  {
    type: 'addTechniqueTreasure',
    name: 'Tresor de technique',
    description: 'Si un survivant le vole, il garde un passif simple adapte a son role.',
    category: 'objectives',
    cost: SPECIAL_TREASURE_BALANCE.techniqueCost,
  },
  {
    type: 'removeTreasure',
    name: 'Retirer tresor',
    description: "Retire un tresor secondaire non vole et rembourse sa valeur.",
    category: 'objectives',
    cost: null,
  },
  {
    type: 'collectRemainsLoot',
    name: 'Fouiller restes',
    description: "Recupere le petit butin laisse par les aventuriers morts. Le marqueur de restes demeure.",
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
  private nextCombatFeedbackId = 1;
  private nextRemainsId = 1;
  private minionNameCounters: Partial<Record<DefenseType, number>> = {};

  constructor() {
    this.state = this.createInitialState();
  }

  startNewGame(): void {
    this.nextDefenseId = 1;
    this.nextAdventurerId = 1;
    this.nextDoorId = 1;
    this.nextTreasureId = 1;
    this.nextCombatFeedbackId = 1;
    this.nextRemainsId = 1;
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
    this.updateBossEngagementLock();
    this.updateBossAutopilot(deltaMs);
    this.updateMonsterMovement(deltaMs);
    this.updateDefenders(deltaMs);
    this.updateAdventurers(deltaMs);
    this.removeDeadMinions();
    this.updateRoomLocks();
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
    const adventurersOnBossMap = this.state.adventurers.filter((adventurer) => adventurer.mapId === boss.mapId);

    if (type === 'shockwave') {
      let touched = 0;
      adventurersOnBossMap.forEach((adventurer) => {
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
      adventurersOnBossMap.forEach((adventurer) => {
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

  selectMap(mapId: string): void {
    if (this.state.phase !== 'build') {
      this.state.message = "Pendant l'expedition, la vue suit le groupe principal en V1.";
      return;
    }

    const map = this.state.dungeonMaps.find((candidate) => candidate.id === mapId) ?? null;

    if (!map) {
      return;
    }

    this.setDisplayedMap(map.id);
    this.state.message = `${map.label} selectionne. Les outils s'appliquent uniquement a cet etage.`;
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

    if (hasDefenseOnCell(this.visibleDefenses(), cell)) {
      this.state.message = 'Une defense occupe deja cette dalle. Meme les monstres ont besoin de place.';
      return;
    }

    if (findActiveDoorAt(this.visibleDoors(), cell)) {
      this.state.message = 'Une porte renforcee occupe deja cette case.';
      return;
    }

    const guardianRejection = selected === 'guardian' ? this.describeGuardianPlacementRejection(cell) : null;

    if (guardianRejection) {
      this.state.message = guardianRejection;
      return;
    }

    const roomLockRejection = selected === 'roomLockTrap' ? this.describeRoomLockTrapPlacementRejection(cell) : null;

    if (roomLockRejection) {
      this.state.message = roomLockRejection;
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
    this.recalculateZones();
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

    if (tool === 'reseal') {
      this.resealTile(cell);
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

    if (tool === 'addWeaponTreasure') {
      this.addSpecialTreasure(cell, 'specialWeapon');
      return;
    }

    if (tool === 'addArmorTreasure') {
      this.addSpecialTreasure(cell, 'specialArmor');
      return;
    }

    if (tool === 'addTechniqueTreasure') {
      this.addSpecialTreasure(cell, 'specialTechnique');
      return;
    }

    if (tool === 'removeTreasure') {
      this.removeGoldTreasure(cell);
      return;
    }

    if (tool === 'collectRemainsLoot') {
      this.collectRemainsLoot(cell);
    }
  }

  private digTile(cell: GridCell): void {
    const result = digRockTile(this.state.tiles, cell, this.state.gold);
    this.state.message = result.message;

    if (!result.ok) {
      return;
    }

    this.state.gold -= result.cost;
    this.updateActiveMapTiles(result.tiles);
    this.recalculateZones();
  }

  private resealTile(cell: GridCell): void {
    const baseRejection = this.describeResealRejection(cell);

    if (baseRejection) {
      this.state.message = baseRejection;
      return;
    }

    const result = resealDugTile(this.state.tiles, cell, this.state.gold);
    this.state.message = result.message;

    if (!result.ok) {
      return;
    }

    const nextMaps = this.state.dungeonMaps.map((map) => (
      map.id === this.state.currentMapId ? { ...map, tiles: result.tiles } : map
    ));
    const validation = this.validateDungeonLayoutOnMaps(nextMaps);

    if (!validation.valid) {
      this.state.message = validation.reason ?? 'Rebouchage refuse: cette roche condamnerait une route obligatoire.';
      return;
    }

    this.state.gold -= result.cost;
    this.updateActiveMapTiles(result.tiles);
    this.recalculateZones();
  }

  private markRoom(center: GridCell, tool: 'guardRoom' | 'crypt'): void {
    const result = markPlayerRoom(this.state.tiles, center, tool, ROOM_TOOL_LABELS[tool]);
    this.state.message = result.message;

    if (result.ok) {
      this.updateActiveMapTiles(result.tiles);
      this.recalculateZones();
    }
  }

  private placeDoor(cell: GridCell): void {
    const result = placeDoorAt(
      this.state.tiles,
      this.visibleDoors(),
      cell,
      this.state.gold,
      hasDefenseOnCell(this.visibleDefenses(), cell),
      `door-${this.nextDoorId}`,
    );
    this.state.message = result.message;

    if (!result.ok) {
      return;
    }

    this.state.gold -= result.cost;
    this.state.doors = [
      ...this.state.doors.filter((door) => door.mapId !== this.state.currentMapId),
      ...result.doors.map((door) => ({ ...door, mapId: this.state.currentMapId })),
    ];
    this.nextDoorId += 1;
    this.recalculateZones();
  }

  private removeDoor(cell: GridCell): void {
    const refund = computeDoorRemovalRefund();
    const result = removeDoorAt(this.visibleDoors(), cell, refund);
    this.state.message = result.message;

    if (!result.ok) {
      return;
    }

    this.state.doors = [
      ...this.state.doors.filter((door) => door.mapId !== this.state.currentMapId),
      ...result.doors.map((door) => ({ ...door, mapId: this.state.currentMapId })),
    ];
    this.state.gold += result.refundGold;
    this.recalculateZones();
  }

  private moveBoss(cell: GridCell): void {
    if (this.state.currentMapId !== this.state.boss.mapId) {
      this.state.message = 'Le boss final reste sur l etage profond en V1.';
      return;
    }

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

    this.updateActiveMapTiles(this.replaceAnchorTile(this.state.tiles, oldCell, nextBossCell, 'throne'));
    this.state.boss.homeCell = nextBossCell;
    this.state.boss.x = nextBossCell.x;
    this.state.boss.y = nextBossCell.y;
    this.state.boss.targetAdventurerId = null;
    this.state.message = 'Boss deplace. Le trone suit, les menaces restent.';
    this.recalculateZones();
  }

  private moveMainTreasure(cell: GridCell): void {
    const treasure = this.getMainTreasure();

    if (!treasure) {
      this.state.message = 'Aucun tresor principal a deplacer.';
      return;
    }

    if (this.state.currentMapId !== treasure.mapId) {
      this.state.message = "Le tresor principal reste sur l etage final en V1.";
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

    this.updateActiveMapTiles(this.replaceAnchorTile(this.state.tiles, treasure.cell, cell, 'treasure'));
    this.state.treasures = nextTreasures;
    this.state.treasure = this.toLegacyTreasureState(movedTreasure);
    this.state.message = 'Tresor principal deplace. La Guilde devra refaire ses cartes.';
    this.recalculateZones();
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
    this.recalculateZones();
  }

  private addSpecialTreasure(cell: GridCell, kind: Extract<DungeonTreasureKind, 'specialWeapon' | 'specialArmor' | 'specialTechnique'>): void {
    const specialKind = specialKindFromTreasureKind(kind);
    const cost = specialKind ? specialTreasureValue(specialKind) : 0;

    if (this.state.treasures.length >= MAX_TREASURES_V1) {
      this.state.message = `Maximum atteint: ${MAX_TREASURES_V1} tresors suffisent a armer les mauvaises personnes.`;
      return;
    }

    if (this.state.gold < cost) {
      this.state.message = `Pas assez d'or: ce tresor special coute ${cost} or.`;
      return;
    }

    const rejection = this.describeObjectiveAnchorRejection(cell, 'treasure');

    if (rejection) {
      this.state.message = rejection;
      return;
    }

    const treasure = this.createSpecialTreasure(cell, kind);
    const nextTreasures = [...this.state.treasures, treasure];
    const validation = this.validateDungeonLayout(nextTreasures, this.getBossCell());

    if (!validation.valid) {
      this.state.message = validation.reason ?? 'Tresor special refuse: il doit rester accessible.';
      return;
    }

    this.state.gold -= cost;
    this.state.treasures = nextTreasures;
    this.state.message = `${specialKind ? specialTreasureLabel(specialKind) : 'Tresor special'} depose: les heros risquent de repartir plus dangereux.`;
    this.recalculateZones();
  }

  private removeGoldTreasure(cell: GridCell): void {
    const treasure = this.state.treasures.find(
      (candidate) => candidate.mapId === this.state.currentMapId && candidate.kind !== 'main' && candidate.status !== 'stolen' && isSameCell(candidate.cell, cell),
    );

    if (!treasure) {
      this.state.message = 'Aucun tresor secondaire non vole a retirer ici.';
      return;
    }

    this.state.treasures = this.state.treasures.filter((candidate) => candidate.id !== treasure.id);
    this.state.gold += treasure.value;
    this.state.message = `Tresor secondaire retire: ${treasure.value} or recuperes.`;
    this.recalculateZones();
  }

  private collectRemainsLoot(cell: GridCell): void {
    const remains = [...this.state.remains]
      .filter((candidate) => candidate.mapId === this.state.currentMapId)
      .filter((candidate) => isSameCell(candidate.cell, cell))
      .reverse()
      .find((candidate) => !candidate.loot.claimed) ?? null;

    if (!remains) {
      const hasRemains = this.state.remains.some((candidate) => candidate.mapId === this.state.currentMapId && isSameCell(candidate.cell, cell));
      this.state.message = hasRemains
        ? 'Ces restes ont deja ete fouilles. Il ne reste que la mauvaise ambiance.'
        : 'Aucun reste aventurier a fouiller ici.';
      return;
    }

    this.state.gold += remains.loot.goldValue;
    remains.loot.claimed = true;
    this.state.message = `${remains.loot.label} recupere sur les restes de ${remains.ownerName}: +${remains.loot.goldValue} or.`;
  }

  private createDefenseEntity(type: DefenseType, cell: GridCell, summoned: boolean): DefenseEntity {
    const definition = getDefenseDefinition(type);
    const name = definition.kind === 'minion' ? this.nextMinionName(type) : `${definition.shortName}-${this.nextDefenseId}`;
    const entity: DefenseEntity = {
      id: `defense-${this.nextDefenseId}`,
      mapId: this.state.currentMapId,
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
      threatByAdventurerId: {},
      trapState: definition.kind === 'trap' ? 'armed' : null,
      roomLockZoneId: null,
      roomLockMinionIds: [],
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
    const bossMapId = this.state.boss.mapId;
    const bossTiles = this.tilesForMap(bossMapId);
    let spawned = 0;

    for (let radius = 1; radius <= 2 && spawned < count; radius += 1) {
      for (let dy = -radius; dy <= radius && spawned < count; dy += 1) {
        for (let dx = -radius; dx <= radius && spawned < count; dx += 1) {
          const cell = { x: bossCell.x + dx, y: bossCell.y + dy };

          if (
            !canBuildDefenseAt(bossTiles, cell) ||
            hasDefenseOnCell(this.state.defenses.filter((defense) => defense.mapId === bossMapId), cell) ||
            findActiveDoorAt(this.doorsForMap(bossMapId), cell)
          ) {
            continue;
          }

          this.state.defenses.push({ ...this.createDefenseEntity('skeleton', cell, true), mapId: bossMapId });
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
    const { profiles } = selectProfilesForWave(roster, this.state.world, this.state.wave, this.buildCompositionContext(this.state.wave));
    const lastRumor = this.state.world.rumors[this.state.world.rumors.length - 1] ?? null;

    this.state.phase = 'wave';
    this.state.currentMapId = ENTRANCE_MAP_ID;
    this.state.expeditionMapId = ENTRANCE_MAP_ID;
    this.syncLegacyActiveMapFields();
    this.state.remains = this.state.remains.map((remains) => updateRemainsVisualState(remains, this.state.wave));
    this.state.treasures = this.state.treasures.map((treasure) => ({
      ...treasure,
      status: 'secure',
      holderAdventurerId: null,
      droppedCell: null,
    }));
    this.state.treasure = this.toLegacyTreasureState(this.getMainTreasure());
    this.recalculateZones();
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
      bossEngagement: createBossEngagementState(),
      combatFeedbackEvents: [],
      remainsReactedKeys: new Set<string>(),
      remainsRecognizedKeys: new Set<string>(),
      roomsSeenThisExpedition: new Set<string>(),
      roomsEnteredThisExpedition: new Set<string>(),
      unexploredRooms: new Set<string>(),
      frontierRooms: new Set<string>(),
      explorationTarget: null,
      explorationChoicesRemaining: profiles.some((profile) => profile.role === 'cartographer') ? 4 : 2,
    };
    this.state.report = null;
    this.state.adventurers = [];
    this.state.paused = false;
    this.state.inspectedAdventurerId = null;
    this.state.bossAutopilotIntent = 'Attend une ouverture.';
    this.state.bossLastAbilityName = null;
    this.state.boss.tauntedByAdventurerId = null;
    this.state.boss.tauntTimerMs = 0;
    this.state.boss.threatByAdventurerId = {};
    resetBossAbilitiesForWave(this.state.boss);
    this.state.defenses.forEach((defense) => {
      defense.cooldownRemainingMs = 0;
      defense.abilityCooldowns = {};
      defense.abilityFxTimerMs = 0;
      defense.slowedTimerMs = 0;
      defense.tauntedByAdventurerId = null;
      defense.tauntTimerMs = 0;
      defense.threatByAdventurerId = {};
      if (defense.kind === 'trap') {
        defense.trapState = 'armed';
        defense.roomLockZoneId = null;
        defense.roomLockMinionIds = [];
      }
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
      defense.threatByAdventurerId = {};
    });
    this.state.doors = repairDoors(this.state.doors);
    this.state.remains = this.state.remains.map((remains) => updateRemainsVisualState(remains, this.state.wave));
    this.recalculateZones();
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
      dungeonMaps: this.state.dungeonMaps.map((map) => ({
        id: map.id,
        label: map.label,
        depth: map.depth,
      })),
      currentMapId: this.state.currentMapId,
      currentMapLabel: this.getActiveMap().label,
      expeditionMapId: this.state.expeditionMapId,
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
          (isAddTreasureTool(tool.type) && this.state.treasures.length >= MAX_TREASURES_V1) ||
          (tool.cost !== null && this.state.gold < tool.cost),
      })),
      availableDefenses: DEFENSE_ORDER.map((type) => {
        const definition = getDefenseDefinition(type);
        const uniqueGuardianAlreadyPlaced = type === 'guardian' && this.state.defenses.some((defense) => defense.alive && defense.type === 'guardian');
        return {
          type,
          kind: definition.kind,
          name: definition.name,
          description: definition.description,
          cost: definition.cost,
          color: definition.color,
          disabled: this.state.phase !== 'build' || this.state.gold < definition.cost || uniqueGuardianAlreadyPlaced,
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
      nextExpeditionHeldBackNames: continuityPreview.heldBackNames,
      nextExpeditionImposedRoleNote: continuityPreview.imposedRoleNote,
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

  getRenderState(): Pick<GameState, 'defenses' | 'adventurers' | 'remains' | 'zones' | 'boss' | 'phase' | 'gold' | 'selectedDefense' | 'selectedConstructionTool' | 'treasure' | 'treasures' | 'tiles' | 'doors'> & { combatFeedbackEvents: CombatFeedbackEvent[]; transitions: DungeonTransition[]; currentMapId: string; currentMapLabel: string } {
    const activeMap = this.getActiveMap();
    const boss = this.state.boss.mapId === this.state.currentMapId
      ? this.state.boss
      : { ...this.state.boss, hp: this.state.boss.hp, x: -100, y: -100, homeCell: { x: -100, y: -100 } };

    return {
      defenses: this.visibleDefenses(),
      adventurers: this.visibleAdventurers(),
      remains: this.visibleRemains(),
      zones: this.state.zones,
      boss,
      phase: this.state.phase,
      gold: this.state.gold,
      selectedDefense: this.state.selectedDefense,
      selectedConstructionTool: this.state.selectedConstructionTool,
      treasure: this.state.treasure,
      treasures: this.visibleTreasures(),
      tiles: this.state.tiles,
      doors: this.visibleDoors(),
      combatFeedbackEvents: this.state.runtime?.combatFeedbackEvents.filter((event) => this.eventVisibleOnCurrentMap(event)) ?? [],
      transitions: activeMap.transitions,
      currentMapId: activeMap.id,
      currentMapLabel: activeMap.label,
    };
  }

  private previewPartyPlan(): PartyPlan {
    if (this.state.phase === 'wave' && this.state.runtime) {
      return this.state.runtime.partyPlan;
    }

    const lastRumor = this.state.world.rumors[this.state.world.rumors.length - 1] ?? null;
    return createPartyPlan(this.state.wave, this.state.world.dungeonReputation.value, lastRumor?.effect ?? null);
  }

  private buildAdaptiveRoster(wave: number): AdventurerRole[] {
    const candidateRoles = getReturningSurvivorCandidates(this.state.world, PARTY_SIZE).map((profile) => profile.role);
    const cartographerPressure = computeCartographerRecruitmentPressure(this.state.world);
    const memory = {
      ...this.state.memory,
      rolePressure: {
        ...this.state.memory.rolePressure,
        cartographer: (this.state.memory.rolePressure.cartographer ?? 0) + cartographerPressure,
      },
    };

    return buildWaveRoster(wave, memory, this.hasActiveLockedDoor(), candidateRoles);
  }

  private buildPlannedRoster(wave: number): AdventurerRole[] {
    return this.buildAdaptiveRoster(wave);
  }

  private buildCompositionContext(wave: number): ExpeditionCompositionContext {
    return {
      wave,
      hasActiveLockedDoor: this.hasActiveLockedDoor(),
      doorBlockedWithoutThief: this.state.memory.doorBlockedWithoutThief,
      rolePressure: this.state.memory.rolePressure,
    };
  }

  private previewExpeditionComposition(wave: number) {
    return planExpeditionComposition(this.buildAdaptiveRoster(wave), this.state.world, this.buildCompositionContext(wave));
  }

  private buildContinuityPreview(wave: number): {
    returningNames: string[];
    heldBackNames: string[];
    imposedRoleNote: string | null;
    newVolunteerCount: number;
    veteranName: string | null;
    plannedRoles: AdventurerRole[];
  } {
    const composition = this.previewExpeditionComposition(wave);
    const veteran = composition.returningProfiles[0] ?? null;

    return {
      returningNames: composition.returningProfiles.map((profile) => profile.name),
      heldBackNames: composition.benchedProfiles.map((profile) => profile.name),
      imposedRoleNote: composition.imposedRoleLabel,
      newVolunteerCount: Math.max(0, PARTY_SIZE - composition.returningProfiles.length),
      veteranName: veteran ? veteran.name : null,
      plannedRoles: [
        ...composition.returningProfiles.map((profile) => profile.role),
        ...composition.recruitRoles.slice(0, PARTY_SIZE - composition.returningProfiles.length),
      ].slice(0, PARTY_SIZE),
    };
  }

  private validateDungeonLayout(
    treasures = this.state.treasures,
    bossCell = this.getBossCell(),
  ): DungeonValidation {
    return this.validateDungeonLayoutOnMaps(this.state.dungeonMaps, treasures, bossCell);
  }

  private validateDungeonLayoutOnMaps(
    maps: DungeonMap[],
    treasures = this.state.treasures,
    bossCell = this.getBossCell(),
  ): DungeonValidation {
    const activeTreasures = this.getActiveTreasures(treasures);
    const entryToTreasure = activeTreasures.length === 0
      ? this.hasGlobalWalkablePathInMaps(maps, ENTRANCE_MAP_ID, ENTRY_CELL, this.state.boss.mapId, bossCell)
      : activeTreasures.every((treasure) => this.hasGlobalWalkablePathInMaps(maps, ENTRANCE_MAP_ID, ENTRY_CELL, treasure.mapId, treasure.cell));
    const treasureToBoss = activeTreasures.length === 0
      ? entryToTreasure
      : activeTreasures.every((treasure) => this.hasGlobalWalkablePathInMaps(maps, treasure.mapId, treasure.cell, this.state.boss.mapId, bossCell));
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

  private recalculateZones(): void {
    this.state.dungeonMaps = recalculateDungeonMapZones({
      maps: this.state.dungeonMaps,
      defenses: this.state.defenses,
      treasures: this.state.treasures,
      bossMapId: this.state.boss.mapId,
      bossCell: this.getBossCell(),
    });
    this.syncLegacyActiveMapFields();
  }

  private syncLegacyActiveMapFields(): void {
    this.syncLegacyActiveMapFieldsForState(this.state);
  }

  private syncLegacyActiveMapFieldsForState(state: GameState): void {
    const activeMap = state.dungeonMaps.find((map) => map.id === state.currentMapId) ?? state.dungeonMaps[0];
    state.currentMapId = activeMap.id;
    state.tiles = activeMap.tiles;
    state.zones = activeMap.zones;
  }

  private getActiveMap(): DungeonMap {
    return this.getMap(this.state.currentMapId);
  }

  private getMap(mapId: string): DungeonMap {
    return this.state.dungeonMaps.find((map) => map.id === mapId) ?? this.state.dungeonMaps[0];
  }

  private tilesForMap(mapId: string): GameState['tiles'] {
    return this.getMap(mapId).tiles;
  }

  private updateActiveMapTiles(tiles: GameState['tiles']): void {
    this.state.dungeonMaps = this.state.dungeonMaps.map((map) => (
      map.id === this.state.currentMapId ? { ...map, tiles } : map
    ));
    this.syncLegacyActiveMapFields();
  }

  private transitionsFrom(mapId: string): DungeonTransition[] {
    return this.getMap(mapId).transitions.filter((transition) => !transition.locked);
  }

  private findTransitionAt(mapId: string, cell: GridCell): DungeonTransition | null {
    return this.transitionsFrom(mapId).find((transition) => isSameCell(transition.fromCell, cell)) ?? null;
  }

  private hasGlobalWalkablePath(
    fromMapId: string,
    fromCell: GridCell,
    toMapId: string,
    toCell: GridCell,
    visited = new Set<string>(),
  ): boolean {
    const visitKey = `${fromMapId}:${cellKey(fromCell)}`;

    if (visited.has(visitKey)) {
      return false;
    }

    const nextVisited = new Set(visited);
    nextVisited.add(visitKey);

    if (fromMapId === toMapId) {
      return hasWalkablePath(fromCell, toCell, getBlockedCellKeys(this.tilesForMap(fromMapId)));
    }

    return this.transitionsFrom(fromMapId).some((transition) =>
      hasWalkablePath(fromCell, transition.fromCell, getBlockedCellKeys(this.tilesForMap(fromMapId))) &&
      this.hasGlobalWalkablePath(transition.toMapId, transition.toCell, toMapId, toCell, nextVisited),
    );
  }

  private hasGlobalWalkablePathInMaps(
    maps: DungeonMap[],
    fromMapId: string,
    fromCell: GridCell,
    toMapId: string,
    toCell: GridCell,
    visited = new Set<string>(),
  ): boolean {
    const map = maps.find((candidate) => candidate.id === fromMapId) ?? null;

    if (!map) {
      return false;
    }

    const visitKey = `${fromMapId}:${cellKey(fromCell)}`;

    if (visited.has(visitKey)) {
      return false;
    }

    const nextVisited = new Set(visited);
    nextVisited.add(visitKey);

    if (fromMapId === toMapId) {
      return hasWalkablePath(fromCell, toCell, getBlockedCellKeys(map.tiles));
    }

    return map.transitions
      .filter((transition) => !transition.locked)
      .some((transition) =>
        hasWalkablePath(fromCell, transition.fromCell, getBlockedCellKeys(map.tiles)) &&
        this.hasGlobalWalkablePathInMaps(maps, transition.toMapId, transition.toCell, toMapId, toCell, nextVisited),
      );
  }

  private targetThroughTransition(adventurer: AdventurerEntity, targetMapId: string, targetCell: GridCell): GridCell {
    if (adventurer.mapId === targetMapId) {
      return targetCell;
    }

    const currentDepth = this.getMap(adventurer.mapId).depth;
    const targetDepth = this.getMap(targetMapId).depth;
    const expectedDirection = Math.sign(targetDepth - currentDepth);
    const transition = this.transitionsFrom(adventurer.mapId)
      .filter((candidate) => this.hasGlobalWalkablePath(candidate.toMapId, candidate.toCell, targetMapId, targetCell))
      .map((candidate) => {
        const toDepth = this.getMap(candidate.toMapId).depth;
        const direction = Math.sign(toDepth - currentDepth);
        const directionalPenalty = expectedDirection !== 0 && direction !== expectedDirection ? 100 : 0;
        return {
          transition: candidate,
          score: directionalPenalty + Math.abs(targetDepth - toDepth),
        };
      })
      .sort((a, b) => a.score - b.score)[0]?.transition ?? null;

    return transition?.fromCell ?? targetCell;
  }

  private setDisplayedMap(mapId: string): void {
    if (!this.state.dungeonMaps.some((map) => map.id === mapId)) {
      return;
    }

    this.state.currentMapId = mapId;
    this.syncLegacyActiveMapFields();
  }

  private visibleDefenses(): DefenseEntity[] {
    return this.state.defenses.filter((defense) => defense.mapId === this.state.currentMapId);
  }

  private visibleDoors(): DungeonDoor[] {
    return this.state.doors.filter((door) => door.mapId === this.state.currentMapId);
  }

  private doorsForMap(mapId: string): DungeonDoor[] {
    return this.state.doors.filter((door) => door.mapId === mapId);
  }

  private visibleTreasures(): DungeonTreasure[] {
    return this.state.treasures.filter((treasure) => treasure.mapId === this.state.currentMapId);
  }

  private visibleRemains(): AdventurerRemains[] {
    return this.state.remains.filter((remains) => remains.mapId === this.state.currentMapId);
  }

  private visibleAdventurers(): AdventurerEntity[] {
    return this.state.adventurers.filter((adventurer) => adventurer.mapId === this.state.currentMapId);
  }

  private describeResealRejection(cell: GridCell): string | null {
    const tile = getTileAt(this.state.tiles, cell);

    if (!tile || (tile.type !== 'floor' && tile.type !== 'room')) {
      return 'Rebouchage refuse: choisis un sol ou une salle creusee simple.';
    }

    if (isInEntrySafeZone(cell) || isSameCell(cell, ENTRY_CELL)) {
      return "Rebouchage refuse: l'entree doit rester ouverte.";
    }

    if (this.getActiveMap().transitions.some((transition) => isSameCell(transition.fromCell, cell))) {
      return 'Rebouchage refuse: cette case porte une transition critique entre etages.';
    }

    if (this.state.currentMapId === this.state.boss.mapId && isSameCell(cell, this.getBossCell())) {
      return 'Rebouchage refuse: le boss garde son trone.';
    }

    if (this.visibleTreasures().some((treasure) => treasure.status !== 'stolen' && isSameCell(treasure.cell, cell))) {
      return 'Rebouchage refuse: un tresor occupe cette dalle.';
    }

    if (this.visibleDoors().some((door) => !door.destroyed && isSameCell(door.cell, cell))) {
      return 'Rebouchage refuse: retire la porte avant de remonter le mur.';
    }

    if (hasDefenseOnCell(this.visibleDefenses(), cell)) {
      return 'Rebouchage refuse: une defense occupe cette dalle.';
    }

    if (this.visibleRemains().some((remains) => isSameCell(remains.cell, cell))) {
      return 'Rebouchage refuse: des restes persistants reposent ici.';
    }

    if (this.visibleAdventurers().some((adventurer) => adventurer.alive && isSameCell({ x: Math.round(adventurer.x), y: Math.round(adventurer.y) }, cell))) {
      return 'Rebouchage refuse: un aventurier est sur cette dalle.';
    }

    return null;
  }

  private describeGuardianPlacementRejection(cell: GridCell): string | null {
    if (this.state.defenses.some((defense) => defense.alive && defense.type === 'guardian')) {
      return 'Un seul gardien de zone peut tenir le donjon pour cette V1.';
    }

    if (this.visibleRemains().some((remains) => isSameCell(remains.cell, cell))) {
      return 'Impossible: des restes aventuriers reposent ici.';
    }

    if (this.visibleTreasures().some((treasure) => treasure.status !== 'stolen' && isSameCell(treasure.cell, cell))) {
      return 'Impossible: le gardien ne doit pas se tenir sur un tresor.';
    }

    if (this.state.currentMapId === this.state.boss.mapId && isSameCell(cell, this.getBossCell())) {
      return 'Impossible: le gardien protege une zone, pas le trone du boss.';
    }

    if (!isGuardianPreferredCell(this.state.zones, cell)) {
      return "Le gardien doit tenir une zone de defense, une salle secondaire ou l'antichambre.";
    }

    if (
      !this.hasGlobalWalkablePath(ENTRANCE_MAP_ID, ENTRY_CELL, this.state.currentMapId, cell) ||
      !this.hasGlobalWalkablePath(this.state.currentMapId, cell, this.state.boss.mapId, this.getBossCell())
    ) {
      return "Placement refuse: le gardien doit rester sur une route accessible sans condamner l'approche du boss.";
    }

    return null;
  }

  private describeRoomLockTrapPlacementRejection(cell: GridCell): string | null {
    if (this.getActiveMap().transitions.some((transition) => isSameCell(transition.fromCell, cell))) {
      return 'Piege de verrouillage refuse: ne le place pas directement sur une transition critique.';
    }

    if (this.visibleRemains().some((remains) => isSameCell(remains.cell, cell))) {
      return 'Piege de verrouillage refuse: des restes persistants occupent cette dalle.';
    }

    if (this.visibleTreasures().some((treasure) => treasure.status !== 'stolen' && isSameCell(treasure.cell, cell))) {
      return 'Piege de verrouillage refuse: pas sur un tresor.';
    }

    if (this.state.currentMapId === this.state.boss.mapId && isSameCell(cell, this.getBossCell())) {
      return 'Piege de verrouillage refuse: pas sur le trone du boss en V1.';
    }

    const zone = findZoneForCell(this.state.zones, cell);

    if (!zone || zone.type === 'corridor' || zone.type === 'entrance' || zone.type === 'boss' || zone.type === 'treasure') {
      return 'Piege de verrouillage refuse: choisis une vraie salle defensive ou secondaire, hors entree/boss/tresor.';
    }

    const zoneKeys = new Set(zone.cells.map((zoneCell) => cellKey(zoneCell)));
    const hasMinionInRoom = this.visibleDefenses().some(
      (defense) => defense.alive && defense.kind === 'minion' && zoneKeys.has(cellKey(defense.cell)),
    );

    if (!hasMinionInRoom) {
      return 'Piege de verrouillage refuse: la salle doit deja contenir au moins un monstre.';
    }

    return null;
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
      damage: adventurer.damage,
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
      specialTreasureBonuses: profile.specialTreasureBonuses,
      specialTreasureEffects: formatSpecialTreasureBonuses(adventurer.specialTreasureBonuses, adventurer.role),
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
      this.visibleTreasures().some((treasure) => treasure.id !== movingTreasureId && treasure.status !== 'stolen' && isSameCell(treasure.cell, cell))
    ) {
      return 'Impossible: un tresor occupe deja cette dalle.';
    }

    if (
      target === 'treasure' &&
      this.visibleTreasures().some((treasure) => treasure.id !== movingTreasureId && treasure.status !== 'stolen' && isSameCell(treasure.cell, cell))
    ) {
      return 'Impossible: un autre tresor occupe deja cette dalle.';
    }

    if (hasDefenseOnCell(this.visibleDefenses(), cell)) {
      return 'Impossible: une defense occupe deja cette dalle.';
    }

    if (findActiveDoorAt(this.visibleDoors(), cell)) {
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

  private chooseWaveTreasureTarget(adventurer: AdventurerEntity | null = null): DungeonTreasure | null {
    const profile = adventurer ? this.state.world.profiles[adventurer.profileId] ?? null : null;
    const startMapId = adventurer?.mapId ?? ENTRANCE_MAP_ID;
    const startCell = adventurer ? { x: Math.round(adventurer.x), y: Math.round(adventurer.y) } : ENTRY_CELL;

    return this.getActiveTreasures()
      .map((treasure) => ({
        treasure,
        accessible: this.hasGlobalWalkablePath(startMapId, startCell, treasure.mapId, getTreasureCurrentCell(treasure) ?? treasure.cell),
        distance:
          Math.abs(startCell.x - treasure.cell.x) +
          Math.abs(startCell.y - treasure.cell.y) +
          (startMapId === treasure.mapId ? 0 : 18),
        score: treasureAttraction(treasure, adventurer, profile),
      }))
      .filter((entry) => entry.accessible)
      .sort((a, b) => (b.score - b.distance * 1.1) - (a.score - a.distance * 1.1) || specialTreasurePriority(b.treasure.kind) - specialTreasurePriority(a.treasure.kind))[0]?.treasure ?? null;
  }

  private getRuntimeTreasureTarget(adventurer: AdventurerEntity | null = null): DungeonTreasure | null {
    const runtime = this.state.runtime;
    const personalTarget = adventurer?.targetTreasureId
      ? this.state.treasures.find((treasure) => treasure.id === adventurer.targetTreasureId && treasure.status !== 'stolen') ?? null
      : null;

    if (personalTarget && (personalTarget.status === 'secure' || personalTarget.status === 'dropped')) {
      if (runtime) {
        runtime.targetTreasureId = personalTarget.id;
      }

      return personalTarget;
    }

    const preferred = runtime?.targetTreasureId
      ? this.state.treasures.find((treasure) => treasure.id === runtime.targetTreasureId && treasure.status !== 'stolen') ?? null
      : null;

    if (preferred && (preferred.status === 'secure' || preferred.status === 'dropped')) {
      if (adventurer) {
        adventurer.targetTreasureId = preferred.id;
      }

      return preferred;
    }

    const roleTarget = adventurer ? this.chooseWaveTreasureTarget(adventurer) : null;

    if (roleTarget && (roleTarget.status === 'secure' || roleTarget.status === 'dropped')) {
      if (runtime) {
        runtime.targetTreasureId = roleTarget.id;
      }

      if (adventurer) {
        adventurer.targetTreasureId = roleTarget.id;
      }

      return roleTarget;
    }

    const fallback = this.chooseWaveTreasureTarget();

    if (runtime) {
      runtime.targetTreasureId = fallback?.id ?? null;
    }

    if (adventurer) {
      adventurer.targetTreasureId = fallback?.id ?? null;
    }

    return fallback;
  }

  private createGoldTreasure(cell: GridCell): DungeonTreasure {
    const treasure: DungeonTreasure = {
      id: `gold-${this.nextTreasureId}`,
      mapId: this.state.currentMapId,
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

  private createSpecialTreasure(
    cell: GridCell,
    kind: Extract<DungeonTreasureKind, 'specialWeapon' | 'specialArmor' | 'specialTechnique'>,
  ): DungeonTreasure {
    const specialKind = specialKindFromTreasureKind(kind);
    const treasure: DungeonTreasure = {
      id: `special-${this.nextTreasureId}`,
      mapId: this.state.currentMapId,
      kind,
      cell: { ...cell },
      value: specialKind ? specialTreasureValue(specialKind) : 0,
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
    const mainTreasure = createMainTreasure();
    const boss = {
      ...BOSS_TEMPLATE,
      hp: BOSS_TEMPLATE.maxHp,
      attackTimerMs: 0,
      abilities: createBossAbilities(),
    };
    const dungeonMaps = createInitialDungeonMaps({
      defenses: [],
      treasures: [mainTreasure],
      bossCell: boss.homeCell,
    });
    const activeMap = dungeonMaps.find((map) => map.id === ENTRANCE_MAP_ID) ?? dungeonMaps[0];
    const state: GameState = {
      phase: 'build',
      wave: 1,
      gold: STARTING_GOLD,
      dungeonMaps,
      currentMapId: activeMap.id,
      expeditionMapId: activeMap.id,
      selectedDefense: 'spikeTrap',
      selectedConstructionTool: null,
      tiles: activeMap.tiles,
      doors: [],
      defenses: [],
      adventurers: [],
      remains: [],
      zones: activeMap.zones,
      boss,
      treasure: createSecureTreasure(),
      treasures: [mainTreasure],
      memory: {
        trapAvoidance: 0.35,
        trapDangerByCell: {},
        rolePressure: {
          warrior: 0,
          thief: 0,
          mage: 0,
          healer: 0,
          cartographer: 0,
        },
        doorBlockedWithoutThief: false,
      },
      world: createInitialWorldMemory(),
      runtime: null,
      report: null,
      message: "Le donjon commence brut: creuse tes routes, puis transforme-les en pieges.",
      paused: false,
      gameSpeed: 1,
      inspectedAdventurerId: null,
      bossAutopilotIntent: null,
      bossLastAbilityName: null,
    };
    this.syncLegacyActiveMapFieldsForState(state);
    return state;
  }

  private tickTimers(deltaMs: number): void {
    tickGlobalBarks(deltaMs);

    this.state.defenses.forEach((defense) => {
      defense.cooldownRemainingMs = Math.max(0, defense.cooldownRemainingMs - deltaMs);
      defense.abilityFxTimerMs = Math.max(0, defense.abilityFxTimerMs - deltaMs);
      defense.slowedTimerMs = Math.max(0, defense.slowedTimerMs - deltaMs);
      defense.tauntTimerMs = Math.max(0, defense.tauntTimerMs - deltaMs);
      decayThreat(defense.threatByAdventurerId, this.state.adventurers, deltaMs);
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
    decayThreat(this.state.boss.threatByAdventurerId, this.state.adventurers, deltaMs);
    tickBossAbilities(this.state.boss, deltaMs);

    if (this.state.runtime) {
      this.state.runtime.combatFeedbackEvents = this.state.runtime.combatFeedbackEvents
        .map((event) => ({ ...event, ageMs: event.ageMs + deltaMs }))
        .filter((event) => event.ageMs <= 900);
    }

    this.state.adventurers.forEach((adventurer) => {
      adventurer.attackTimerMs = Math.max(0, adventurer.attackTimerMs - deltaMs);
      adventurer.healTimerMs = Math.max(0, adventurer.healTimerMs - deltaMs);
      adventurer.abilityFxTimerMs = Math.max(0, adventurer.abilityFxTimerMs - deltaMs);
      adventurer.lootFeedbackTimerMs = Math.max(0, adventurer.lootFeedbackTimerMs - deltaMs);
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

      if (adventurer.lootFeedbackTimerMs === 0) {
        adventurer.lootFeedbackText = null;
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
        adventurers: this.state.adventurers.filter((adventurer) => adventurer.mapId === defense.mapId),
        doors: this.doorsForMap(defense.mapId),
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
      const target = this.findNearestAdventurer(
        defense.x,
        defense.y,
        definition.attackRange ?? 1,
        defense.tauntedByAdventurerId,
        defense.threatByAdventurerId,
        defense.mapId,
      );

      if (!target) {
        return;
      }

      const damage = definition.damage ?? 1;
      this.damageAdventurer(target, damage, 'minion', defense.type, defense.cell, defense);
      defense.cooldownRemainingMs = definition.attackCooldownMs ?? 900;
      runtime.stats.combatEngagementMs += deltaMs;
    });

    const bossTarget = this.chooseBossTargetWithEngagementLock();
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
      this.applyBossEngagementBehavior(adventurer);

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
        this.canAdventurerAttackBoss(adventurer) &&
        adventurer.mapId === this.state.boss.mapId &&
        distance(adventurer.x, adventurer.y, this.state.boss.x, this.state.boss.y) <= adventurer.attackRange + 0.3;

      if (!targetMinion && !canAttackBoss && this.tryStartOpportunisticLoot(adventurer)) {
        continue;
      }

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
      if (this.tryUseMapTransition(adventurer, currentCell)) {
        return;
      }

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
        knownTrapCells: this.getKnownTrapCells(adventurer.mapId),
        blockedCellKeys: getBlockedCellKeys(this.tilesForMap(adventurer.mapId)),
      });
    }

    const nextCell = adventurer.path[0];

    if (!nextCell) {
      this.recordMemoryObservation(adventurer, 'routeChangedSuspected', currentCell, 'Route introuvable', 0.42, 'room');
      if (adventurer.role === 'cartographer') {
        tryBark(adventurer, 'mapChanged', this.visibleBarkCount());
      }
      return;
    }

    if (this.tryAvoidLethalRetreatTrap(adventurer, currentCell, targetCell, nextCell)) {
      return;
    }

    if (this.roomLockBlocksStep(adventurer.mapId, currentCell, nextCell)) {
      adventurer.path = [];
      adventurer.hesitationTimerMs = Math.max(adventurer.hesitationTimerMs, 220);
      adventurer.behaviorState = 'evaluatingRoom';
      tryBark(adventurer, 'roomLockTriggered', this.visibleBarkCount());
      this.state.message = 'Les issues sont verrouillees: il faut abattre les defenseurs de la salle.';
      return;
    }

    const blockingDoor = findActiveDoorAt(this.doorsForMap(adventurer.mapId), nextCell);

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
      if (this.tryUseMapTransition(adventurer, nextCell)) {
        return;
      }

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
      (defense) =>
        defense.mapId === adventurer.mapId &&
        defense.alive &&
        defense.kind === 'trap' &&
        (defense.trapState === null || defense.trapState === 'armed') &&
        defense.cooldownRemainingMs <= 0 &&
        isSameCell(defense.cell, nextCell),
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

    const blockedCellKeys = getBlockedCellKeys(this.tilesForMap(adventurer.mapId));
    blockedCellKeys.add(cellKey(nextCell));
    const alternative = findPath(currentCell, targetCell, {
      role: adventurer.role,
      trapAvoidance: this.state.memory.trapAvoidance * personalityTrapAvoidance(adventurer) * 1.6,
      trapDangerByCell: this.state.memory.trapDangerByCell,
      knownTrapCells: this.getKnownTrapCells(adventurer.mapId),
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
      this.recordMemoryObservation(adventurer, 'doorSeen', door.cell, 'Porte verrouillee', 0.5, 'exact');
      this.state.message = `${adventurer.name} trouve une porte verrouillee. La force brute signe sa demission.`;
    }

    const livingThief = this.state.adventurers.find((candidate) => candidate.alive && !candidate.escaped && candidate.role === 'thief') ?? null;
    const thiefWithLockpicks = this.state.adventurers.find(
      (candidate) =>
        candidate.alive &&
        !candidate.escaped &&
        candidate.role === 'thief' &&
        candidate.lockpicksUsedThisExpedition < candidate.maxLockpicksPerExpedition,
    ) ?? null;

    if (!livingThief) {
      this.retreatFromDoorWithoutThief(adventurer);
      return;
    }

    if (!thiefWithLockpicks) {
      this.retreatFromDoorWithoutLockpicks(adventurer);
      return;
    }

    if (adventurer.role !== 'thief') {
      adventurer.hesitationTimerMs = Math.max(adventurer.hesitationTimerMs, 260);
      tryBark(adventurer, 'doorBlocked', this.visibleBarkCount());
      return;
    }

    if (adventurer.lockpicksUsedThisExpedition >= adventurer.maxLockpicksPerExpedition) {
      adventurer.hesitationTimerMs = Math.max(adventurer.hesitationTimerMs, 520);
      tryBark(adventurer, 'doorNoLockpicks', this.visibleBarkCount());
      this.state.message = `${adventurer.name}: Plus de crochets. Deux portes, pas trois.`;
      return;
    }

    if (door.beingPickedById && door.beingPickedById !== adventurer.id) {
      adventurer.hesitationTimerMs = Math.max(adventurer.hesitationTimerMs, 220);
      return;
    }

    const wasPicking = door.beingPickedById === adventurer.id;
    door.beingPickedById = adventurer.id;
    door.pickProgressMs = Math.min(door.pickRequiredMs, door.pickProgressMs + deltaMs);
    adventurer.hesitationTimerMs = Math.max(adventurer.hesitationTimerMs, 80);
    stats.thiefDoorLeads += 1;
    tryBark(adventurer, 'doorThief', this.visibleBarkCount());

    if (!wasPicking) {
      stats.storyEvents.push(`${adventurer.name} commence a crocheter une porte verrouillee.`);
    }
    this.state.message = `${adventurer.name} crochète la porte verrouillee...`;

    this.state.message = `${adventurer.name}: Je crochete cette porte.`;

    if (door.pickProgressMs >= door.pickRequiredMs) {
      door.locked = false;
      door.openedForExpedition = true;
      door.beingPickedById = null;
      door.pickProgressMs = door.pickRequiredMs;
      adventurer.lockpicksUsedThisExpedition += 1;
      stats.doorsPicked += 1;
      recordProfileDoorPicked(this.state.world, adventurer.profileId);
      this.recordMemoryObservation(adventurer, 'doorSeen', door.cell, 'Porte crochetee', 0.58, 'exact');
      stats.storyEvents.push(`${adventurer.name} crochete une porte verrouillee et ouvre le passage.`);
      tryBark(adventurer, 'doorOpened', this.visibleBarkCount());
      const remaining = Math.max(0, adventurer.maxLockpicksPerExpedition - adventurer.lockpicksUsedThisExpedition);
      this.state.message = remaining > 0
        ? `${adventurer.name}: C'est ouvert. Il me reste de quoi faire.`
        : `${adventurer.name}: C'est ouvert. Plus de crochets.`;
    }
  }

  private retreatFromDoorWithoutLockpicks(adventurer: AdventurerEntity): void {
    if (!this.state.runtime) {
      return;
    }

    if (this.state.runtime.stats.doorNoThiefRetreats === 0) {
      this.state.runtime.stats.storyEvents.push("L'expedition abandonne devant une porte verrouillee: le voleur n'a plus de crochets.");
      this.recordMemoryObservation(adventurer, 'routeBlocked', { x: Math.round(adventurer.x), y: Math.round(adventurer.y) }, 'Route bloquee par serrure', 0.54, 'room');
      this.state.memory.rolePressure.thief += 1.5;
      this.state.runtime.stats.doorNoThiefRetreats = 1;
      this.startGroupRetreat('Porte verrouillee: plus de crochets.', 'lockedDoorNoThief');
    }

    adventurer.hesitationTimerMs = Math.max(adventurer.hesitationTimerMs, 900);
    tryBark(adventurer, 'doorNoLockpicks', this.visibleBarkCount());
    this.state.message = 'Plus de crochets. La serrure gagne par plafond logistique.';
  }

  private retreatFromDoorWithoutThief(adventurer: AdventurerEntity): void {
    if (!this.state.runtime) {
      return;
    }

    if (this.state.runtime.stats.doorNoThiefRetreats === 0) {
      this.state.runtime.stats.storyEvents.push("L'expedition abandonne devant une porte verrouillee faute de voleur.");
      this.recordMemoryObservation(adventurer, 'routeBlocked', { x: Math.round(adventurer.x), y: Math.round(adventurer.y) }, 'Route bloquee par porte', 0.52, 'room');
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
      const treasure = this.getRuntimeTreasureTarget(adventurer);

      if (!treasure || (treasure.status !== 'secure' && treasure.status !== 'dropped')) {
        this.resolveTreasureStage(adventurer);
        return;
      }

      treasure.status = 'carried';
      treasure.holderAdventurerId = adventurer.id;
      treasure.droppedCell = null;
      this.state.treasure = this.toLegacyTreasureState(treasure);
      adventurer.carryingTreasure = true;
      adventurer.targetTreasureId = null;
      this.recordMemoryObservation(
        adventurer,
        isSpecialTreasureKind(treasure.kind) ? 'specialTreasureSeen' : 'treasureSeen',
        getTreasureCurrentCell(treasure),
        treasure.kind === 'main'
          ? 'Tresor principal'
          : isSpecialTreasureKind(treasure.kind)
            ? specialTreasureNameForKind(treasure.kind)
            : "Tresor d'or",
        0.62,
        'exact',
      );
      this.applySpecialTreasurePickupFeedback(adventurer, treasure);

      if (this.state.runtime) {
        const runtime = this.state.runtime;
        runtime.partyPlan.treasureClaimed = true;
        runtime.stats.treasureCarrierName = adventurer.name;
        runtime.stats.treasureTargetId = treasure.id;
        runtime.stats.storyEvents.push(
          treasure.kind === 'gold'
            ? `${adventurer.name} s'empare d'un tresor d'or (${treasure.value} or).`
            : isSpecialTreasureKind(treasure.kind)
              ? `${adventurer.name} s'empare de ${specialTreasureNameForKind(treasure.kind)}.`
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
        : isSpecialTreasureKind(treasure.kind)
          ? `${adventurer.name} empoche ${specialTreasureNameForKind(treasure.kind)}. Ce survivant deviendra dangereux s'il sort.`
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

  private applySpecialTreasurePickupFeedback(adventurer: AdventurerEntity, treasure: DungeonTreasure): void {
    if (!this.state.runtime || !isSpecialTreasureKind(treasure.kind)) {
      return;
    }

    const specialKind = specialKindFromTreasureKind(treasure.kind);

    if (!specialKind) {
      return;
    }

    const alreadyHadBonus = adventurer.specialTreasureBonuses.some((bonus) => bonus.kind === specialKind);
    const feedbackText = specialTreasurePickupText(specialKind);
    adventurer.lootFeedbackText = feedbackText;
    adventurer.lootFeedbackTimerMs = 1900;
    adventurer.behaviorState = 'opportunisticLoot';
    tryBark(adventurer, 'treasureTaken', this.visibleBarkCount());

    if (!alreadyHadBonus) {
      const bonus = {
        kind: specialKind,
        label: specialTreasureLabel(specialKind),
        sourceTreasureId: treasure.id,
        acquiredWave: this.state.wave,
      };
      const previousMaxHp = adventurer.maxHp;
      adventurer.specialTreasureBonuses.push(bonus);
      const modifiers = computeSpecialTreasureModifiersFromBonuses(adventurer.role, [bonus]);
      adventurer.damage += modifiers.damageBonus;
      adventurer.maxHp += modifiers.maxHpBonus;
      adventurer.hp += adventurer.maxHp - previousMaxHp;
    }

    const effect = formatSpecialTreasureBonuses(adventurer.specialTreasureBonuses.filter((bonus) => bonus.kind === specialKind), adventurer.role)[0]
      ?? specialTreasureLabel(specialKind);
    const line = `${adventurer.name}: ${feedbackText} (${effect}).`;
    this.state.runtime.stats.storyEvents.push(line);
    this.state.message = line;
  }

  private resolveTreasureStage(adventurer: AdventurerEntity): void {
    if (adventurer.targetStage !== 'treasure') {
      return;
    }

    const treasure = this.getRuntimeTreasureTarget(adventurer);

    if (treasure && (treasure.status === 'secure' || treasure.status === 'dropped')) {
      return;
    }

    adventurer.targetStage = this.state.runtime
      ? choosePostTreasureGoal(this.state.runtime.partyPlan, adventurer)
      : 'boss';
    adventurer.path = [];
    adventurer.targetTreasureId = null;
  }

  private tryStartOpportunisticLoot(adventurer: AdventurerEntity): boolean {
    if (!this.state.runtime || adventurer.carryingTreasure || adventurer.targetStage === 'exit') {
      return false;
    }

    const treasure = this.findOpportunisticTreasure(adventurer);

    if (!treasure) {
      return false;
    }

    const currentCell = { x: Math.round(adventurer.x), y: Math.round(adventurer.y) };
    const treasureCell = getTreasureCurrentCell(treasure);

    if (adventurer.targetStage === 'treasure' && adventurer.targetTreasureId === treasure.id) {
      if (treasureCell && isSameCell(currentCell, treasureCell)) {
        this.handleObjectiveReached(adventurer);
        return true;
      }

      return false;
    }

    const previousTarget = adventurer.targetTreasureId;
    adventurer.targetStage = 'treasure';
    adventurer.targetTreasureId = treasure.id;
    adventurer.behaviorState = 'opportunisticLoot';
    adventurer.path = [];
    this.state.runtime.targetTreasureId = treasure.id;

    if (previousTarget !== treasure.id) {
      this.state.runtime.stats.opportunisticLoots += 1;
      this.state.runtime.stats.storyEvents.push(`${adventurer.name} devia pour saisir un butin evident.`);
      this.state.message = `${adventurer.name} voit un butin sur le chemin et le prend en compte.`;
      tryBark(adventurer, 'opportunisticLoot', this.visibleBarkCount());
    }

    if (treasureCell && isSameCell(currentCell, treasureCell)) {
      this.handleObjectiveReached(adventurer);
    }

    return true;
  }

  private findOpportunisticTreasure(adventurer: AdventurerEntity): DungeonTreasure | null {
    const currentCell = { x: Math.round(adventurer.x), y: Math.round(adventurer.y) };
    const targetCell = this.getTargetCell(adventurer);
    const plannedPath = adventurer.path.length > 0
      ? adventurer.path
      : findPath(currentCell, targetCell, {
        role: adventurer.role,
        trapAvoidance: this.state.memory.trapAvoidance * personalityTrapAvoidance(adventurer),
        trapDangerByCell: this.state.memory.trapDangerByCell,
        knownTrapCells: this.getKnownTrapCells(adventurer.mapId),
        blockedCellKeys: getBlockedCellKeys(this.tilesForMap(adventurer.mapId)),
      });
    const nextPathKeys = new Set(plannedPath.slice(0, 5).map((cell) => cellKey(cell)));
    const immediateDanger = this.hasImmediateDangerNear(adventurer);

    return this.state.treasures
      .filter((treasure) => treasure.mapId === adventurer.mapId)
      .filter((treasure) => treasure.status === 'secure' || treasure.status === 'dropped')
      .map((treasure) => {
        const treasureCell = getTreasureCurrentCell(treasure);
        const pathToTreasure = treasureCell
          ? findPath(currentCell, treasureCell, {
            role: adventurer.role,
            trapAvoidance: this.state.memory.trapAvoidance * personalityTrapAvoidance(adventurer),
            trapDangerByCell: this.state.memory.trapDangerByCell,
            knownTrapCells: this.getKnownTrapCells(adventurer.mapId),
            blockedCellKeys: getBlockedCellKeys(this.tilesForMap(adventurer.mapId)),
          })
          : [];
        const directDistance = treasureCell ? distance(currentCell.x, currentCell.y, treasureCell.x, treasureCell.y) : Number.POSITIVE_INFINITY;
        const onPath = treasureCell ? nextPathKeys.has(cellKey(treasureCell)) : false;
        const adjacent = directDistance <= 1.45;
        const shortDetour = pathToTreasure.length > 0 && pathToTreasure.length <= (isSpecialTreasureKind(treasure.kind) ? 3 : 2);
        const special = isSpecialTreasureKind(treasure.kind);

        return {
          treasure,
          directDistance,
          pathLength: pathToTreasure.length,
          onPath,
          adjacent,
          shortDetour,
          special,
          score:
            (adjacent ? 80 : 0) +
            (onPath ? 58 : 0) +
            (shortDetour ? 34 : 0) +
            (special ? 26 : 0) +
            treasureAttraction(treasure, adventurer, this.state.world.profiles[adventurer.profileId] ?? null) -
            Math.max(0, pathToTreasure.length - 1) * 9,
        };
      })
      .filter((entry) => entry.adjacent || entry.onPath || entry.shortDetour)
      .filter((entry) => this.isOpportunisticTreasureSafe(adventurer, entry.treasure, entry.directDistance, immediateDanger))
      .sort((a, b) => b.score - a.score || specialTreasurePriority(b.treasure.kind) - specialTreasurePriority(a.treasure.kind))[0]?.treasure ?? null;
  }

  private isOpportunisticTreasureSafe(
    adventurer: AdventurerEntity,
    treasure: DungeonTreasure,
    directDistance: number,
    immediateDanger: boolean,
  ): boolean {
    const treasureCell = getTreasureCurrentCell(treasure);

    if (!treasureCell) {
      return false;
    }

    const minionOnTreasure = this.state.defenses.some(
      (defense) => defense.mapId === treasure.mapId && defense.alive && defense.kind === 'minion' && distance(defense.x, defense.y, treasureCell.x, treasureCell.y) <= 1.35,
    );
    const bossTooClose = this.state.boss.mapId === treasure.mapId && distance(this.state.boss.x, this.state.boss.y, treasureCell.x, treasureCell.y) <= this.state.boss.attackRange + 0.8;

    if (minionOnTreasure || bossTooClose) {
      return false;
    }

    if (!immediateDanger) {
      return true;
    }

    if (directDistance <= 0.45) {
      return true;
    }

    if (adventurer.role === 'healer' || adventurer.role === 'mage') {
      return false;
    }

    if (adventurer.role === 'thief' && directDistance <= 1.45) {
      const frontline = this.selectBossEngager();
      return !frontline || frontline.role === 'warrior';
    }

    return adventurer.role === 'warrior' && directDistance <= 1.45;
  }

  private hasImmediateDangerNear(adventurer: AdventurerEntity): boolean {
    const minionNear = this.state.defenses.some(
      (defense) => defense.mapId === adventurer.mapId && defense.alive && defense.kind === 'minion' && distance(defense.x, defense.y, adventurer.x, adventurer.y) <= 2.25,
    );
    const bossNear =
      adventurer.targetStage === 'boss' &&
      adventurer.mapId === this.state.boss.mapId &&
      distance(this.state.boss.x, this.state.boss.y, adventurer.x, adventurer.y) <= this.state.boss.detectionRange;

    return minionNear || bossNear;
  }

  private dropTreasure(adventurer: AdventurerEntity): void {
    if (!adventurer.carryingTreasure) {
      return;
    }

    adventurer.carryingTreasure = false;
    const treasure = this.state.treasures.find((candidate) => candidate.holderAdventurerId === adventurer.id);
    const droppedCell = { x: Math.round(adventurer.x), y: Math.round(adventurer.y) };

    if (treasure) {
      treasure.mapId = adventurer.mapId;
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
    const key = `${adventurer.mapId}:${cellKey(cell)}`;

    if (adventurer.lastCellKey === key || !adventurer.alive) {
      return;
    }

    adventurer.lastCellKey = key;

    if (!isSameCell(cell, ENTRY_CELL)) {
      adventurer.hasEnteredDungeon = true;
    }

    this.maybeEvaluateRoom(adventurer, cell);
    this.observeDungeonAround(adventurer, cell);
    this.observeCurrentZone(adventurer, cell);
    this.maybeReactToRemains(adventurer, cell);
    this.maybeTriggerRoomLock(adventurer, cell);

    const trap = this.state.defenses.find(
      (defense) =>
        defense.mapId === adventurer.mapId &&
        defense.alive &&
        defense.kind === 'trap' &&
        defense.type !== 'roomLockTrap' &&
        (defense.trapState === null || defense.trapState === 'armed') &&
        defense.cooldownRemainingMs <= 0 &&
        isSameCell(defense.cell, cell),
    );

    if (!trap) {
      return;
    }

    const definition = getDefenseDefinition(trap.type);
    const baseDamage = definition.trapDamage ?? 0;
    const damage = Math.max(1, Math.round(baseDamage * adventurer.trapDamageMultiplier));
    this.recordMemoryObservation(adventurer, 'trapSeen', trap.cell, getDefenseDefinition(trap.type).name, 0.52, 'exact');
    recordProfileTrapTriggered(this.state.world, adventurer.profileId);
    this.damageAdventurer(adventurer, damage, 'trap', trap.type, cell, trap);
    trap.cooldownRemainingMs = definition.trapCooldownMs ?? 1500;
  }

  private maybeTriggerRoomLock(adventurer: AdventurerEntity, cell: GridCell): void {
    if (!this.state.runtime || adventurer.targetStage === 'exit') {
      return;
    }

    const zone = findZoneForCell(this.getMap(adventurer.mapId).zones, cell);

    if (!zone || zone.type === 'corridor' || zone.type === 'entrance') {
      return;
    }

    const zoneKeys = new Set(zone.cells.map((zoneCell) => cellKey(zoneCell)));
    const trap = this.state.defenses.find(
      (defense) =>
        defense.mapId === adventurer.mapId &&
        defense.alive &&
        defense.type === 'roomLockTrap' &&
        defense.trapState === 'armed' &&
        zoneKeys.has(cellKey(defense.cell)),
    ) ?? null;

    if (!trap) {
      return;
    }

    const minionIds = this.state.defenses
      .filter((defense) => defense.mapId === adventurer.mapId && defense.alive && defense.kind === 'minion' && zoneKeys.has(cellKey(defense.cell)))
      .map((defense) => defense.id);

    if (minionIds.length === 0) {
      trap.trapState = 'cleared';
      trap.abilityFxTimerMs = COMBAT_ABILITY_BALANCE.abilityFxMs;
      this.state.message = 'Le piege de verrouillage claque a vide puis se rouvre.';
      return;
    }

    trap.trapState = 'triggered';
    trap.roomLockZoneId = zone.id;
    trap.roomLockMinionIds = minionIds;
    trap.abilityFxTimerMs = COMBAT_ABILITY_BALANCE.abilityFxMs;
    adventurer.path = [];
    adventurer.behaviorState = 'evaluatingRoom';
    adventurer.hesitationTimerMs = Math.max(adventurer.hesitationTimerMs, 220);
    this.recordMemoryObservation(adventurer, 'roomLockTrapSeen', trap.cell, 'Salle verrouillee', 0.54, adventurer.role === 'cartographer' ? 'exact' : 'room');
    this.recordMemoryObservation(adventurer, 'dangerousRoomSeen', zone.center, `${zone.label} verrouillee`, 0.46, adventurer.role === 'cartographer' ? 'exact' : 'room');
    this.state.runtime.stats.storyEvents.push(`${adventurer.name} declenche un piege de verrouillage: ${zone.label} se ferme.`);
    tryBark(adventurer, 'roomLockTriggered', this.visibleBarkCount());
    this.state.message = 'La salle se ferme. Les issues se verrouillent.';
  }

  private updateRoomLocks(): void {
    const runtime = this.state.runtime;

    if (!runtime) {
      return;
    }

    this.state.defenses
      .filter((defense) => defense.type === 'roomLockTrap' && defense.trapState === 'triggered')
      .forEach((trap) => {
        const remainingMinions = trap.roomLockMinionIds
          .map((id) => this.state.defenses.find((defense) => defense.id === id) ?? null)
          .filter((defense): defense is DefenseEntity => Boolean(defense && defense.alive));

        if (remainingMinions.length > 0) {
          return;
        }

        trap.trapState = 'cleared';
        trap.roomLockMinionIds = [];
        trap.abilityFxTimerMs = COMBAT_ABILITY_BALANCE.abilityFxMs;
        runtime.stats.storyEvents.push('La salle verrouillee se rouvre apres la mort de ses defenseurs.');
        const witness = this.state.adventurers.find((adventurer) => adventurer.alive && !adventurer.escaped && adventurer.mapId === trap.mapId) ?? null;

        if (witness) {
          this.recordMemoryObservation(witness, 'trappedRoomSurvived', trap.cell, 'Salle piegee survecue', 0.5, witness.role === 'cartographer' ? 'exact' : 'room');
          tryBark(witness, 'roomLockCleared', this.visibleBarkCount());
        }

        this.state.message = 'La salle se rouvre. Le verrou cede.';
      });
  }

  private tryUseMapTransition(adventurer: AdventurerEntity, cell: GridCell): boolean {
    const transition = this.findTransitionAt(adventurer.mapId, cell);

    if (!transition || transition.locked) {
      return false;
    }

    this.recordMemoryObservation(adventurer, 'transitionSeen', transition.fromCell, transition.label, 0.5, adventurer.role === 'cartographer' ? 'exact' : 'room');
    adventurer.mapId = transition.toMapId;
    adventurer.x = transition.toCell.x;
    adventurer.y = transition.toCell.y;
    adventurer.path = [];
    adventurer.lastCellKey = `${adventurer.mapId}:${cellKey(transition.toCell)}`;
    adventurer.behaviorState = 'regrouping';
    adventurer.hesitationTimerMs = Math.max(adventurer.hesitationTimerMs, adventurer.role === 'warrior' ? 120 : 220);
    this.recordMemoryObservation(adventurer, 'floorReached', transition.toCell, this.getMap(transition.toMapId).label, 0.52, adventurer.role === 'cartographer' ? 'exact' : 'room');
    this.state.expeditionMapId = transition.toMapId;
    this.setDisplayedMap(transition.toMapId);
    this.state.message = `${adventurer.name} emprunte ${transition.label} vers ${this.getMap(transition.toMapId).label}.`;
    return true;
  }

  private maybeEvaluateRoom(adventurer: AdventurerEntity, cell: GridCell): void {
    if (!this.state.runtime || adventurer.targetStage === 'exit') {
      return;
    }

    const tile = getTileAt(this.tilesForMap(adventurer.mapId), cell);
    const zone = findZoneForCell(this.getMap(adventurer.mapId).zones, cell);
    const roomKey = zone && isExplorableZone(zone)
      ? zoneMemoryKey(zone)
      : tile?.roomType
        ? `${adventurer.mapId}:${tile.roomType}:${cell.x >> 1},${cell.y >> 1}`
        : null;

    if (!tile || (tile.type !== 'room' && tile.type !== 'treasure' && tile.type !== 'throne') || !roomKey || adventurer.lastEvaluatedRoomKey === roomKey) {
      return;
    }

    adventurer.lastEvaluatedRoomKey = roomKey;
    adventurer.behaviorState = adventurer.role === 'cartographer' ? 'mapping' : 'evaluatingRoom';
    adventurer.hesitationTimerMs = Math.max(
      adventurer.hesitationTimerMs,
      adventurer.role === 'warrior' ? 120 : adventurer.role === 'cartographer' ? 360 : 220,
    );
    this.state.runtime.stats.roomEvaluations += 1;
    tryBark(adventurer, adventurer.role === 'warrior' ? 'secureArea' : adventurer.role === 'cartographer' ? 'mapping' : 'stayTogether', this.visibleBarkCount());
  }

  private observeDungeonAround(adventurer: AdventurerEntity, cell: GridCell): void {
    if (!this.state.runtime || !adventurer.alive || adventurer.escaped || adventurer.targetStage === 'exit') {
      return;
    }

    const radius = adventurer.role === 'cartographer' ? CARTOGRAPHER_OBSERVATION_RADIUS : BASE_OBSERVATION_RADIUS;
    const precision = adventurer.role === 'cartographer' ? 'room' : 'vague';

    this.state.doors
      .filter((door) => door.mapId === adventurer.mapId && !door.destroyed && distance(door.cell.x, door.cell.y, cell.x, cell.y) <= radius)
      .forEach((door) => {
        this.recordMemoryObservation(adventurer, 'doorSeen', door.cell, door.locked ? 'Porte verrouillee' : 'Porte ouverte', 0.44, precision);
      });

    this.state.defenses
      .filter((defense) => defense.mapId === adventurer.mapId && defense.alive && distance(defense.x, defense.y, cell.x, cell.y) <= radius)
      .forEach((defense) => {
        const label = getDefenseDefinition(defense.type).name;
        this.recordMemoryObservation(
          adventurer,
          defense.kind === 'trap' ? 'trapSeen' : 'defenderSeen',
          defense.cell,
          label,
          defense.kind === 'trap' ? 0.46 : 0.42,
          precision,
        );

        if (defense.type === 'guardian') {
          const recorded = this.recordMemoryObservation(
            adventurer,
            'guardianSeen',
            defense.cell,
            label,
            adventurer.role === 'cartographer' ? 0.58 : 0.46,
            adventurer.role === 'cartographer' ? 'exact' : precision,
          );

          if (recorded) {
            this.state.runtime!.stats.guardianSightings += 1;
          }
        }

        if (adventurer.role === 'cartographer' && defense.kind === 'trap') {
          tryBark(adventurer, 'mapTrap', this.visibleBarkCount());
        }
      });

    this.state.treasures
      .filter((treasure) => treasure.mapId === adventurer.mapId && treasure.status !== 'stolen')
      .map((treasure) => ({ treasure, cell: getTreasureCurrentCell(treasure) }))
      .filter((entry): entry is { treasure: DungeonTreasure; cell: GridCell } => entry.cell !== null)
      .filter((entry) => distance(entry.cell.x, entry.cell.y, cell.x, cell.y) <= radius)
      .forEach(({ treasure, cell: treasureCell }) => {
        this.recordMemoryObservation(
          adventurer,
          isSpecialTreasureKind(treasure.kind) ? 'specialTreasureSeen' : 'treasureSeen',
          treasureCell,
          treasure.kind === 'main'
            ? 'Tresor principal'
            : isSpecialTreasureKind(treasure.kind)
              ? specialTreasureNameForKind(treasure.kind)
              : "Tresor d'or",
          isSpecialTreasureKind(treasure.kind) ? 0.48 : 0.4,
          precision,
        );
      });

    if (adventurer.mapId === this.state.boss.mapId && distance(this.state.boss.x, this.state.boss.y, cell.x, cell.y) <= radius + 0.65) {
      this.recordMemoryObservation(adventurer, 'bossSeen', this.getBossCell(), 'Boss du donjon', 0.5, precision);

      if (adventurer.role === 'cartographer') {
        tryBark(adventurer, 'mapBoss', this.visibleBarkCount());
      }
    }

    const dangerCount = this.state.defenses.filter(
      (defense) => defense.mapId === adventurer.mapId && defense.alive && distance(defense.x, defense.y, cell.x, cell.y) <= Math.min(radius, 3.1),
    ).length;

    if (dangerCount >= 2) {
      this.recordMemoryObservation(adventurer, 'dangerZone', cell, 'Zone dangereuse', 0.38, precision);
      this.recordMemoryObservation(adventurer, 'dangerousZoneSeen', cell, 'Zone dangereuse confirmee', 0.4, precision);
    }
  }

  private observeCurrentZone(adventurer: AdventurerEntity, cell: GridCell): void {
    const runtime = this.state.runtime;

    if (!runtime || !adventurer.alive || adventurer.escaped || adventurer.targetStage === 'exit') {
      return;
    }

    const zone = findZoneForCell(this.getMap(adventurer.mapId).zones, cell);

    if (!zone) {
      adventurer.currentZoneId = null;
      return;
    }

    adventurer.currentZoneId = zone.id;
    if (isExplorableZone(zone)) {
      const key = zoneMemoryKey(zone);
      runtime.roomsSeenThisExpedition.add(key);
      runtime.roomsEnteredThisExpedition.add(key);
      runtime.unexploredRooms.delete(key);

      if (runtime.explorationTarget?.mapId === zone.mapId && runtime.explorationTarget.zoneId === zone.id) {
        runtime.explorationTarget = null;
      }
    }
    const important = zone.type === 'defense' || zone.type === 'secondary' || zone.type === 'antechamber' || zone.type === 'treasure' || zone.type === 'boss';

    if (!important || adventurer.lastImportantZoneId === zone.id) {
      return;
    }

    adventurer.lastImportantZoneId = zone.id;
    const precision = adventurer.role === 'cartographer' ? 'exact' : 'room';
    const confidence = adventurer.role === 'cartographer' ? 0.62 : 0.46;
    const reached = this.recordMemoryObservation(adventurer, 'zoneReached', zone.center, `${zone.label} atteinte`, confidence, precision);

    if (reached) {
      runtime.stats.zoneObservations += 1;
    }

    if (zone.type === 'antechamber') {
      if (this.recordMemoryObservation(adventurer, 'antechamberSeen', zone.center, 'Antichambre du boss', confidence + 0.04, precision)) {
        runtime.stats.zoneObservations += 1;
      }

      this.recordMemoryObservation(adventurer, 'bossApproachKnown', zone.center, 'Approche du boss', confidence + 0.02, precision);
      adventurer.behaviorState = adventurer.role === 'cartographer' ? 'mapping' : 'bossPreparation';
      adventurer.hesitationTimerMs = Math.max(adventurer.hesitationTimerMs, adventurer.role === 'warrior' ? 120 : 260);
      runtime.stats.tacticalHesitations += 1;
      tryBark(adventurer, adventurer.role === 'cartographer' ? 'mapBoss' : 'stayTogether', this.visibleBarkCount());
    }

    if (zone.type === 'treasure') {
      this.recordMemoryObservation(adventurer, 'treasureRoomSeen', zone.center, 'Salle du tresor', confidence, precision);
    }

    if (zone.dangerLevel >= 2.2 || this.zoneHasSeveralRemains(zone)) {
      this.recordMemoryObservation(adventurer, 'dangerousZoneSeen', zone.center, `${zone.label} dangereuse`, confidence - 0.04, precision);
    }

    if (zone.guardianId) {
      const guardian = this.state.defenses.find((defense) => defense.mapId === adventurer.mapId && defense.id === zone.guardianId && defense.alive) ?? null;

      if (guardian && this.recordMemoryObservation(adventurer, 'guardianSeen', guardian.cell, `${guardian.name} le ${getDefenseDefinition(guardian.type).name}`, confidence + 0.04, precision)) {
        runtime.stats.guardianSightings += 1;
      }
    }
  }

  private zoneHasSeveralRemains(zone: DungeonZone): boolean {
    const zoneCells = new Set(zone.cells.map((cell) => cellKey(cell)));
    return this.state.remains.filter((remains) => remains.mapId === zone.mapId && zoneCells.has(cellKey(remains.cell))).length >= 2;
  }

  private maybeReactToRemains(adventurer: AdventurerEntity, cell: GridCell): void {
    const runtime = this.state.runtime;

    if (!runtime || !adventurer.alive || adventurer.escaped) {
      return;
    }

    const nearby = this.state.remains
      .filter((remains) => remains.mapId === adventurer.mapId && remains.deathWave < this.state.wave && distance(remains.x, remains.y, cell.x, cell.y) <= 1.65)
      .sort((a, b) => distance(a.x, a.y, cell.x, cell.y) - distance(b.x, b.y, cell.x, cell.y))[0] ?? null;

    if (!nearby) {
      return;
    }

    const key = `${adventurer.profileId}:${nearby.id}`;
    const alreadyReacted = runtime.remainsReactedKeys.has(key);
    const profile = this.state.world.profiles[adventurer.profileId] ?? null;
    const cartographerInParty = runtime.partyProfiles.some((partyProfile) => partyProfile.role === 'cartographer');
    const kingdomAlreadyKnows = this.state.world.kingdomFacts.some(
      (fact) =>
        (fact.kind === 'deathSiteKnown' || fact.kind === 'relicRecognized' || fact.kind === 'remainsSeen') &&
        fact.mapId === nearby.mapId &&
        fact.cell &&
        isSameCell(fact.cell, nearby.cell),
    );
    const shouldReact = shouldReactToRemains({
      adventurer,
      remains: nearby,
      wave: this.state.wave,
      alreadyReacted,
      immediateDanger: this.hasImmediateDangerNear(adventurer),
    });
    const shouldRecognize = shouldReact && shouldRecognizeRelic({
      adventurer,
      profile,
      remains: nearby,
      kingdomAlreadyKnows,
      cartographerInParty,
      alreadyRecognized: runtime.remainsRecognizedKeys.has(key),
    });

    this.recordRemainsObservation(adventurer, nearby, shouldRecognize);

    if (!shouldReact) {
      return;
    }

    runtime.remainsReactedKeys.add(key);
    nearby.discoveredByFutureParty = true;
    nearby.reactionCount += 1;
    runtime.stats.remainsSeen += 1;

    if (shouldRecognize) {
      runtime.remainsRecognizedKeys.add(key);
      nearby.recognizedByProfileIds.push(adventurer.profileId);
      runtime.stats.relicsRecognized += 1;
    }

    const line = reactionLineFor(nearby, shouldRecognize);
    runtime.stats.remainsReactionEvents.push(line);
    runtime.stats.storyEvents.push(line);
    adventurer.hesitationTimerMs = Math.max(adventurer.hesitationTimerMs, adventurer.role === 'warrior' ? 180 : 360);
    runtime.stats.tacticalHesitations += 1;
    adventurer.behaviorState = adventurer.role === 'cartographer' ? 'mapping' : 'evaluatingRoom';
    tryBark(adventurer, shouldRecognize ? 'relicRecognized' : 'remainsSeen', this.visibleBarkCount());
    this.state.message = line;
  }

  private recordRemainsObservation(adventurer: AdventurerEntity, remains: AdventurerRemains, recognized: boolean): void {
    const precision = adventurer.role === 'cartographer' ? 'exact' : 'room';
    const baseConfidence = adventurer.role === 'cartographer' ? 0.62 : 0.46;
    const label = recognized
      ? `${remains.ownerName}: ${remains.relicLabel}`
      : `Restes de ${remains.ownerName}`;

    deathSiteFactKinds(remains, recognized).forEach((kind) => {
      const kindLabel =
        kind === 'relicRecognized'
          ? label
          : kind === 'bossKilledAdventurerHere'
            ? `Mort face au boss: ${remains.ownerName}`
            : kind === 'trapKilledAdventurerHere'
              ? `Mort sur piege: ${remains.ownerName}`
              : kind === 'dangerousDeathSite'
                ? `Site de mort dangereux: ${remains.ownerName}`
                : `Site de mort: ${remains.ownerName}`;

      this.recordMemoryObservation(
        adventurer,
        kind,
        remains.cell,
        kindLabel,
        kind === 'relicRecognized' ? baseConfidence + 0.1 : baseConfidence,
        precision,
      );
    });
  }

  private recordMemoryObservation(
    adventurer: AdventurerEntity,
    kind: KingdomMemoryFactKind,
    cell: GridCell | null,
    label: string,
    confidence: number,
    precision: 'vague' | 'room' | 'exact',
  ): boolean {
    const runtime = this.state.runtime;

    if (!runtime || !adventurer.alive || adventurer.escaped) {
      return false;
    }

    const observationKey = [
      adventurer.profileId,
      kind,
      adventurer.mapId,
      cell ? cellKey(cell) : 'unknown',
      label,
    ].join('|');
    const alreadyRecorded = runtime.stats.cartographyObservations.some((observation) => {
      const existingKey = [
        observation.observerProfileId,
        observation.kind,
        observation.mapId ?? null,
        observation.cell ? cellKey(observation.cell) : 'unknown',
        observation.label,
      ].join('|');

      return existingKey === observationKey;
    });

    if (alreadyRecorded) {
      return false;
    }

    runtime.stats.cartographyObservations.push({
      kind,
      label,
      mapId: adventurer.mapId,
      cell: cell ? { ...cell } : null,
      precision,
      confidence,
      observerProfileId: adventurer.profileId,
      observerName: adventurer.name,
      observerRole: adventurer.role,
      wave: this.state.wave,
    });

    if (adventurer.role === 'cartographer') {
      runtime.stats.cartographerObservedFacts += 1;
    }

    return true;
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

    const armorReduction = computeSpecialTreasureModifiersFromBonuses(
      adventurer.role,
      adventurer.specialTreasureBonuses,
    ).incomingDamageReduction;
    const reduction = adventurer.damageReductionTimerMs > 0
      ? Math.max(0, Math.round(damage * COMBAT_ABILITY_BALANCE.warriorDamageReduction))
      : 0;
    const mitigatedDamage = Math.max(0, damage - reduction - armorReduction);
    const actualDamage = Math.min(adventurer.hp, mitigatedDamage);
    adventurer.hp -= actualDamage;
    this.queueCombatFeedback({
      kind: 'damage',
      mapId: adventurer.mapId,
      amount: actualDamage,
      targetId: adventurer.id,
      targetName: adventurer.name,
      x: adventurer.x,
      y: adventurer.y,
      sourceId: source === 'boss' ? 'boss' : sourceDefense?.id ?? null,
      sourceName: source === 'boss' ? 'Boss' : sourceDefense?.name ?? (source === 'trap' ? 'Piege' : 'Defense'),
      sourceFaction: source === 'minion' ? 'monster' : source,
      sourceRole: null,
      sourceType: source === 'boss' ? 'boss' : sourceType,
      style: source === 'boss' ? 'boss' : source === 'trap' ? 'trap' : sourceType === 'guardian' ? 'guardian' : 'monster',
    });

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

      if (sourceDefense.type === 'guardian') {
        this.state.runtime.stats.guardianKills += 1;
        this.recordGuardianKillWitnesses(sourceDefense, adventurer);
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

    this.createRemainsForDeath(adventurer, {
      kind: source,
      type: source === 'boss' ? 'boss' : sourceType,
      label: cause,
    });

    return actualDamage;
  }

  private recordGuardianKillWitnesses(guardian: DefenseEntity, victim: AdventurerEntity): void {
    const runtime = this.state.runtime;

    if (!runtime) {
      return;
    }

    this.state.adventurers
      .filter((candidate) => candidate.mapId === guardian.mapId && candidate.alive && !candidate.escaped && candidate.id !== victim.id)
      .filter((candidate) => distance(candidate.x, candidate.y, guardian.x, guardian.y) <= 4.2)
      .forEach((witness) => {
        const precision = witness.role === 'cartographer' ? 'exact' : 'room';
        this.recordMemoryObservation(
          witness,
          'guardianKilledAdventurer',
          guardian.cell,
          `${guardian.name} a tue ${victim.name}`,
          witness.role === 'cartographer' ? 0.64 : 0.52,
          precision,
        );
      });

    runtime.stats.storyEvents.push(`${guardian.name} tient sa zone et abat ${victim.name}.`);
  }

  private createRemainsForDeath(
    adventurer: AdventurerEntity,
    cause: { kind: 'trap' | 'minion' | 'boss'; type: DefenseType | 'boss' | null; label: string },
  ): void {
    const cell = { x: Math.round(adventurer.x), y: Math.round(adventurer.y) };
    const profile = this.state.world.profiles[adventurer.profileId] ?? null;
    const remains = createAdventurerRemains({
      id: `remains-${this.nextRemainsId}`,
      adventurer,
      profile,
      cell,
      wave: this.state.wave,
      day: this.state.world.currentDay,
      cause,
    });

    this.nextRemainsId += 1;
    this.state.remains = compressRemains([...this.state.remains, remains]);

    if (this.state.runtime) {
      this.state.runtime.stats.storyEvents.push(
        `${adventurer.name} laisse des restes dans le donjon: ${remains.relicLabel}. ${describeRemainsLoot(remains.loot)}`,
      );
    }
  }

  private damageMinion(minion: DefenseEntity, damage: number, attacker: AdventurerEntity): void {
    if (minion.mapId !== attacker.mapId) {
      return;
    }

    if (minion.type === 'guardian' && this.state.runtime) {
      this.state.runtime.stats.guardianFights += 1;
      this.recordMemoryObservation(
        attacker,
        'guardianFought',
        minion.cell,
        `${attacker.name} affronte ${minion.name}`,
        attacker.role === 'cartographer' ? 0.62 : 0.5,
        attacker.role === 'cartographer' ? 'exact' : 'room',
      );
    }

    const actualDamage = Math.min(minion.hp, damage);
    minion.hp -= actualDamage;
    addThreat(minion.threatByAdventurerId, attacker, actualDamage * 2 + (attacker.role === 'warrior' ? 14 : attacker.role === 'thief' ? 1 : 0));
    this.queueCombatFeedback({
      kind: 'damage',
      mapId: minion.mapId,
      amount: actualDamage,
      targetId: minion.id,
      targetName: minion.name,
      x: minion.x,
      y: minion.y,
      sourceId: attacker.id,
      sourceName: attacker.name,
      sourceFaction: 'adventurer',
      sourceRole: attacker.role,
      sourceType: null,
      style: combatFeedbackStyleForRole(attacker.role),
      boostedBySpecial: hasSpecialDamageBonus(attacker),
    });

    if (minion.hp > 0) {
      minion.targetAdventurerId = attacker.id;
      minion.aiState = 'chase';
      minion.chaseTimerMs = 0;
      minion.stuckTimerMs = 0;
    }

    if (minion.hp <= 0) {
      minion.alive = false;
      recordProfileMonsterKill(this.state.world, attacker.profileId);
      const label = `${minion.name} le ${getDefenseDefinition(minion.type).name}`;
      this.state.runtime?.stats.storyEvents.push(`${attacker.name} abat ${label}.`);

      if (minion.type === 'guardian') {
        this.state.runtime!.stats.guardianDeaths += 1;
        this.recalculateZones();
      }

      if (minion.kills >= 3 || minion.wavesSurvived >= 2) {
        addChronicle(this.state.world, `${label} tombe apres ${minion.kills} victoires. Une minute de silence syndicale.`);
      }

      this.state.message = `${label} tombe. Il sera remplace par quelqu'un de moins syndique.`;
    }
  }

  private damageBoss(damage: number, attacker: AdventurerEntity): void {
    if (!this.state.runtime || attacker.mapId !== this.state.boss.mapId) {
      return;
    }

    const actualDamage = Math.min(this.state.boss.hp, damage);
    const previousProfileDamage = this.state.runtime.stats.bossDamageByProfile[attacker.profileId] ?? 0;
    const engagement = this.state.runtime.bossEngagement;
    this.state.boss.hp -= actualDamage;
    this.recordMemoryObservation(attacker, 'bossSeen', this.getBossCell(), 'Boss du donjon', 0.58, 'exact');

    if (!engagement.firstBossAttackerId && actualDamage > 0) {
      engagement.firstBossAttackerId = attacker.id;
      engagement.firstBossAttackerRole = attacker.role;
      engagement.lockedForFrontline = false;
      this.recordMemoryObservation(attacker, 'bossReached', this.getBossCell(), 'Salle du boss atteinte', 0.64, 'exact');
      this.state.runtime.stats.storyEvents.push(`${attacker.name} ouvre le combat contre le boss.`);
    }

    addThreat(this.state.boss.threatByAdventurerId, attacker, actualDamage * 2.2 + (attacker.role === 'warrior' ? 18 : attacker.role === 'thief' ? 1 : 0));
    this.state.runtime.stats.bossDamageTaken += actualDamage;
    this.queueCombatFeedback({
      kind: 'damage',
      mapId: this.state.boss.mapId,
      amount: actualDamage,
      targetId: 'boss',
      targetName: 'Boss',
      x: this.state.boss.x,
      y: this.state.boss.y,
      sourceId: attacker.id,
      sourceName: attacker.name,
      sourceFaction: 'adventurer',
      sourceRole: attacker.role,
      sourceType: null,
      style: combatFeedbackStyleForRole(attacker.role),
      boostedBySpecial: hasSpecialDamageBonus(attacker),
    });
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
    const adaptationNotes = [
      ...this.applyKingdomMemoryTransmission(runtime, currentWave),
      ...this.applyAdaptation(runtime.stats, runtime.elapsedMs),
    ];
    this.recordTopMinionFeat(runtime.stats);

    let rumor = generateTavernRumor({
      wave: currentWave,
      stats: runtime.stats,
      trapKills: sumStats(runtime.stats.trapStats, 'kills'),
      minionKills: sumStats(runtime.stats.minionStats, 'kills'),
      bossKills: runtime.stats.deaths.filter((record) => record.note.includes('entretien direct')).length,
      treasureStolen,
      cleared: true,
    });
    if (runtime.stats.cartographerReports > 0) {
      rumor = { ...rumor, text: `Croquis fiable: ${rumor.text}` };
    } else if (runtime.stats.cartographerLostReports > 0) {
      rumor = { ...rumor, text: `Carte perdue: ${rumor.text}` };
    }
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
    adaptationNotes.unshift(...this.applyKingdomMemoryTransmission(runtime, this.state.wave));
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

  private applyKingdomMemoryTransmission(runtime: WaveRuntime, wave: number): string[] {
    const survivorProfileIds = runtime.stats.survivors.map((record) => record.profileId);
    const survivorIdSet = new Set(survivorProfileIds);
    const partyCartographers = runtime.partyProfiles.filter((profile) => profile.role === 'cartographer');
    runtime.stats.cartographerSurvivors = partyCartographers.filter((profile) => survivorIdSet.has(profile.id)).length;
    runtime.stats.cartographerDeaths = runtime.stats.deaths.filter((record) => record.role === 'cartographer').length;

    const result = commitSurvivorObservations(
      this.state.world,
      runtime.stats.cartographyObservations,
      survivorProfileIds,
      wave,
    );

    runtime.stats.cartographerReports = result.cartographerReports;
    runtime.stats.cartographerLostReports = result.lostCartographerReports;

    if (result.cartographerReports > 0) {
      this.state.memory.rolePressure.cartographer = Math.max(0, (this.state.memory.rolePressure.cartographer ?? 0) - 0.65);
      addChronicle(
        this.state.world,
        `${result.cartographerNames[0] ?? 'Un cartographe'} remet un croquis moins faux que les precedents.`,
      );
    }

    if (result.lostCartographerReports > 0) {
      this.state.memory.rolePressure.cartographer = (this.state.memory.rolePressure.cartographer ?? 0) + 1.1;
      addChronicle(this.state.world, "Un cartographe disparait avec ses notes. La Guilde deteste l'ironie.");
    }

    const unreliablePressure = computeCartographerRecruitmentPressure(this.state.world);

    if (unreliablePressure >= 1.2) {
      this.state.memory.rolePressure.cartographer = (this.state.memory.rolePressure.cartographer ?? 0) + 0.45;
    }

    return summarizeCartographyResult(result);
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
    const cartographerLines = this.buildCartographerReportLines(runtime, wave);
    const remainsLines = this.buildRemainsReportLines(runtime, wave);
    const zoneLines = this.buildZoneReportLines(wave);
    const guardianLines = this.buildGuardianReportLines(runtime, wave);
    const storyLines = buildWaveStoryLines({
      cleared,
      wave,
      stats: runtime.stats,
      trapHighlights,
      minionHighlights,
      dungeonTitle: this.state.world.dungeonReputation.title,
      reputationDelta,
    });

    const report: Omit<WaveReport, 'chronicle' | 'guildTavernScene'> = {
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
      specialTreasureLoots: runtime.stats.specialTreasureLoots.slice(0, 4),
      cartographerSurvivors: runtime.stats.cartographerSurvivors,
      cartographerDeaths: runtime.stats.cartographerDeaths,
      cartographerReports: runtime.stats.cartographerReports,
      cartographerLostReports: runtime.stats.cartographerLostReports,
      cartographerLines,
      zoneObservations: runtime.stats.zoneObservations,
      guardianSightings: runtime.stats.guardianSightings,
      guardianFights: runtime.stats.guardianFights,
      guardianKills: runtime.stats.guardianKills,
      guardianDeaths: runtime.stats.guardianDeaths,
      zoneLines,
      guardianLines,
      remainsSeen: runtime.stats.remainsSeen,
      relicsRecognized: runtime.stats.relicsRecognized,
      remainsLines,
      dungeonReputation: this.state.world.dungeonReputation.value,
      reputationDelta,
      trapHighlights,
      minionHighlights,
      storyLines,
      learnedLines: [...this.buildLearnedLines(runtime, trapHighlights, minionHighlights), ...cartographerLines, ...zoneLines, ...guardianLines, ...remainsLines],
      sharedLines: this.buildSharedLines(runtime, storyLines, [...cartographerLines, ...zoneLines, ...guardianLines, ...remainsLines]),
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
      heldBackSurvivorNames: continuity.heldBackNames,
      imposedRoleNote: continuity.imposedRoleNote,
      newVolunteerCount: continuity.newVolunteerCount,
      veteranName: continuity.veteranName,
      deaths: runtime.stats.deaths.slice(-5).map((record) => record.note),
      survivors: runtime.stats.survivors.slice(-5).map((record) => record.note),
      adaptationNotes,
      verdict: cleared
        ? 'Tous les aventuriers sont morts. Ils reviendront, parce que les heros confondent obstination et scenario.'
        : 'Le boss est mort. Le donjon passe sous gestion heroique, donc probablement en open space.',
    };

    const reportWithChronicle: Omit<WaveReport, 'guildTavernScene'> = {
      ...report,
      chronicle: buildSurvivorChronicle(report),
    };

    return {
      ...reportWithChronicle,
      guildTavernScene: buildGuildTavernScene(reportWithChronicle),
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

  private buildSharedLines(runtime: WaveRuntime, storyLines: string[], cartographerLines: string[]): string[] {
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

    if (runtime.stats.specialTreasureLoots.length > 0) {
      lines.push(runtime.stats.specialTreasureLoots[0]);
    }

    lines.push(...cartographerLines.slice(0, 2));
    lines.push(storyLines[0] ?? 'Le royaume classe cette expedition comme instructive et tres mal payee.');
    return lines;
  }

  private buildCartographerReportLines(runtime: WaveRuntime, wave: number): string[] {
    const lines: string[] = [];

    if (runtime.stats.cartographerReports > 0) {
      const confirmedFacts = this.state.world.kingdomFacts
        .filter((fact) => fact.lastSeenWave === wave && fact.confirmedByCartographer)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 2);
      const factLabels = confirmedFacts
        .map((fact) => `${fact.label} (${Math.round(fact.confidence * 100)}%, ${fact.precision})`)
        .join(', ');

      lines.push(
        factLabels
          ? `Cartographe: croquis fiable sur ${factLabels}.`
          : `Cartographe: ${runtime.stats.cartographerReports} observation${runtime.stats.cartographerReports > 1 ? 's' : ''} transmise${runtime.stats.cartographerReports > 1 ? 's' : ''}.`,
      );
    }

    if (runtime.stats.cartographerLostReports > 0) {
      lines.push("Cartographe perdu: ses observations personnelles ne sont pas transmises.");
    }

    if (runtime.stats.cartographerObservedFacts > 0 && runtime.stats.cartographerReports === 0 && runtime.stats.cartographerDeaths > 0) {
      lines.push("Le cartographe avait vu quelque chose, mais personne n'a rapporte son carnet.");
    }

    return lines;
  }

  private buildZoneReportLines(wave: number): string[] {
    const lines: string[] = [];
    const zoneFacts = this.state.world.kingdomFacts
      .filter((fact) =>
        fact.lastSeenWave === wave &&
        (fact.kind === 'zoneReached' ||
          fact.kind === 'antechamberSeen' ||
          fact.kind === 'treasureRoomSeen' ||
          fact.kind === 'bossApproachKnown' ||
          fact.kind === 'dangerousZoneSeen' ||
          fact.kind === 'roomLockTrapSeen' ||
          fact.kind === 'dangerousRoomSeen' ||
          fact.kind === 'trappedRoomSurvived'),
      )
      .sort((a, b) => b.confidence - a.confidence);

    if (zoneFacts.length > 0) {
      const first = zoneFacts[0];
      lines.push(`Zone rapportee: ${first.label} (${first.precision}, ${Math.round(first.confidence * 100)}%).`);
    }

    if (zoneFacts.some((fact) => fact.kind === 'antechamberSeen' || fact.kind === 'bossApproachKnown')) {
      lines.push("Approche du boss identifiee: la prochaine expedition saura ou serrer les dents.");
    }

    return lines.slice(0, 2);
  }

  private buildGuardianReportLines(runtime: WaveRuntime, wave: number): string[] {
    const lines: string[] = [];
    const guardianFacts = this.state.world.kingdomFacts
      .filter((fact) =>
        fact.lastSeenWave === wave &&
        (fact.kind === 'guardianSeen' || fact.kind === 'guardianFought' || fact.kind === 'guardianKilledAdventurer'),
      )
      .sort((a, b) => b.confidence - a.confidence);

    if (guardianFacts.length > 0) {
      const first = guardianFacts[0];
      lines.push(`Gardien rapporte: ${first.label} (${first.precision}, ${Math.round(first.confidence * 100)}%).`);
    } else {
      return lines;
    }

    if (runtime.stats.guardianKills > 0) {
      lines.push(`Gardien: ${runtime.stats.guardianKills} aventurier${runtime.stats.guardianKills > 1 ? 's' : ''} abattu${runtime.stats.guardianKills > 1 ? 's' : ''}.`);
    } else if (runtime.stats.guardianDeaths > 0) {
      lines.push('Gardien abattu: la Guilde sait qu il n etait pas le boss.');
    } else if (runtime.stats.guardianFights > 0 && lines.length === 0) {
      lines.push('Gardien engage, mais aucun survivant fiable ne detaille le duel.');
    }

    return lines.slice(0, 2);
  }

  private buildRemainsReportLines(runtime: WaveRuntime, wave: number): string[] {
    const lines: string[] = [];
    const transmittedRemainFacts = this.state.world.kingdomFacts
      .filter((fact) =>
        fact.lastSeenWave === wave &&
        (fact.kind === 'remainsSeen' || fact.kind === 'deathSiteKnown' || fact.kind === 'relicRecognized'),
      )
      .sort((a, b) => b.confidence - a.confidence);

    if (transmittedRemainFacts.length === 0) {
      return lines;
    }

    const recognized = transmittedRemainFacts.find((fact) => fact.kind === 'relicRecognized');

    if (recognized) {
      lines.push(`Relique reconnue: ${recognized.label}.`);
    } else {
      const first = transmittedRemainFacts[0];
      lines.push(`Site de mort rapporte: ${first.label} (${first.precision}, ${Math.round(first.confidence * 100)}%).`);
    }

    if (runtime.stats.remainsSeen > 0) {
      lines.push(`${runtime.stats.remainsSeen} reaction${runtime.stats.remainsSeen > 1 ? 's' : ''} devant des restes persistants.`);
    }

    if (runtime.stats.relicsRecognized > 0) {
      lines.push(`${runtime.stats.relicsRecognized} relique${runtime.stats.relicsRecognized > 1 ? 's' : ''} identifiee${runtime.stats.relicsRecognized > 1 ? 's' : ''} sans inventer de lien familial.`);
    }

    return lines.slice(0, 3);
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

    runtime.stats.specialTreasureLoots.slice(0, 2).forEach((line) => lines.push(line));

    if (runtime.stats.cartographerSurvivors > 0) {
      lines.push(`Cartographe revenu: ${runtime.stats.cartographerReports} observation${runtime.stats.cartographerReports > 1 ? 's' : ''} fiable${runtime.stats.cartographerReports > 1 ? 's' : ''}.`);
    } else if (runtime.stats.cartographerDeaths > 0) {
      lines.push("Cartographe mort: la Guilde perd ses notes les plus precises.");
    }

    if (runtime.stats.remainsSeen > 0) {
      lines.push(`Restes observes: ${runtime.stats.remainsSeen} reaction${runtime.stats.remainsSeen > 1 ? 's' : ''}, ${runtime.stats.relicsRecognized} relique${runtime.stats.relicsRecognized > 1 ? 's' : ''} reconnue${runtime.stats.relicsRecognized > 1 ? 's' : ''}.`);
    }

    return lines;
  }

  private buildGuildChanges(wave: number, adaptationNotes: string[]): string[] {
    const continuity = this.buildContinuityPreview(wave + 1);
    const lines = [
      continuity.returningNames.length > 0
        ? `Revenants garantis: ${continuity.returningNames.slice(0, 3).join(', ')}${continuity.returningNames.length > 3 ? '...' : ''}.`
        : 'Aucun temoin fiable: cinq nouveaux volontaires seront requis.',
      continuity.heldBackNames.length > 0
        ? `Retenus au rapport: ${continuity.heldBackNames.join(', ')}.`
        : null,
      continuity.imposedRoleNote,
      continuity.veteranName ? `Veteran pressenti: ${continuity.veteranName}.` : `Nouveaux volontaires: ${continuity.newVolunteerCount}.`,
      `Composition probable: ${formatRoster(continuity.plannedRoles)}.`,
      ...adaptationNotes,
    ].filter((line): line is string => Boolean(line));

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
    const roomLockTarget = this.getRoomLockCombatTarget(adventurer);

    if (roomLockTarget) {
      return roomLockTarget;
    }

    const explorationTarget = this.getExplorationTargetCell(adventurer);

    if (explorationTarget) {
      return explorationTarget;
    }

    return this.getPrimaryTargetCell(adventurer);
  }

  private getPrimaryTargetCell(adventurer: AdventurerEntity): GridCell {
    if (adventurer.targetStage === 'treasure') {
      const treasure = this.getRuntimeTreasureTarget(adventurer);

      if (treasure?.status === 'dropped' && treasure.droppedCell) {
        return this.targetThroughTransition(adventurer, treasure.mapId, treasure.droppedCell);
      }

      return treasure ? this.targetThroughTransition(adventurer, treasure.mapId, treasure.cell) : this.targetThroughTransition(adventurer, this.state.boss.mapId, this.getBossCell());
    }

    if (adventurer.targetStage === 'exit') {
      return this.targetThroughTransition(adventurer, ENTRANCE_MAP_ID, ENTRY_CELL);
    }

    const engagement = this.state.runtime?.bossEngagement;

    if (adventurer.mapId !== this.state.boss.mapId) {
      return this.targetThroughTransition(adventurer, this.state.boss.mapId, this.getBossCell());
    }

    if (
      engagement?.lockedForFrontline &&
      !engagement.firstBossAttackerId &&
      adventurer.id !== engagement.frontlineAdventurerId
    ) {
      return this.getBossStagingCell(adventurer);
    }

    return this.targetThroughTransition(adventurer, this.state.boss.mapId, { x: Math.round(this.state.boss.x), y: Math.round(this.state.boss.y) });
  }

  private getRoomLockCombatTarget(adventurer: AdventurerEntity): GridCell | null {
    if (!this.state.runtime || !adventurer.alive || adventurer.escaped) {
      return null;
    }

    const lock = this.findActiveRoomLockContainingCell(adventurer.mapId, { x: Math.round(adventurer.x), y: Math.round(adventurer.y) });

    if (!lock) {
      return null;
    }

    const target = lock.trap.roomLockMinionIds
      .map((id) => this.state.defenses.find((defense) => defense.id === id) ?? null)
      .filter((defense): defense is DefenseEntity => Boolean(defense && defense.alive && defense.mapId === adventurer.mapId))
      .map((defense) => ({
        defense,
        distance: distance(adventurer.x, adventurer.y, defense.x, defense.y),
      }))
      .sort((a, b) => a.distance - b.distance)[0]?.defense ?? null;

    if (!target) {
      return null;
    }

    adventurer.behaviorState = adventurer.role === 'warrior' ? 'securingArea' : 'evaluatingRoom';
    return { x: Math.round(target.x), y: Math.round(target.y) };
  }

  private getExplorationTargetCell(adventurer: AdventurerEntity): GridCell | null {
    const runtime = this.state.runtime;

    if (
      !runtime ||
      adventurer.targetStage === 'exit' ||
      adventurer.carryingTreasure ||
      runtime.partyPlan.retreating ||
      this.hasImmediateDangerNear(adventurer) ||
      this.isBossDetectedByParty()
    ) {
      return null;
    }

    const currentZone = findZoneForCell(this.getMap(adventurer.mapId).zones, { x: Math.round(adventurer.x), y: Math.round(adventurer.y) });

    if (currentZone && isExplorableZone(currentZone)) {
      runtime.roomsEnteredThisExpedition.add(zoneMemoryKey(currentZone));
      if (runtime.explorationTarget?.mapId === currentZone.mapId && runtime.explorationTarget.zoneId === currentZone.id) {
        runtime.explorationTarget = null;
      }
    }

    if (runtime.explorationTarget) {
      const targetZone = this.getMap(runtime.explorationTarget.mapId).zones.find((zone) => zone.id === runtime.explorationTarget?.zoneId) ?? null;
      const targetKey = targetZone ? zoneMemoryKey(targetZone) : `${runtime.explorationTarget.mapId}:${runtime.explorationTarget.zoneId}`;

      if (!runtime.roomsEnteredThisExpedition.has(targetKey)) {
        adventurer.behaviorState = adventurer.role === 'cartographer' ? 'mapping' : 'exploring';
        return this.targetThroughTransition(adventurer, runtime.explorationTarget.mapId, runtime.explorationTarget.cell);
      }

      runtime.explorationTarget = null;
    }

    if (runtime.explorationChoicesRemaining <= 0 || adventurer.hp / adventurer.maxHp < 0.42) {
      return null;
    }

    const target = this.chooseUnexploredRoomTarget(adventurer);

    if (!target) {
      return null;
    }

    runtime.explorationTarget = target;
    runtime.explorationChoicesRemaining -= 1;
    runtime.frontierRooms.add(`${target.mapId}:${target.zoneId}`);
    runtime.stats.storyEvents.push(`${adventurer.name} propose d'explorer une salle inconnue proche.`);
    adventurer.behaviorState = adventurer.role === 'cartographer' ? 'mapping' : 'exploring';
    tryBark(adventurer, adventurer.role === 'cartographer' ? 'mapping' : 'secureArea', this.visibleBarkCount());
    this.state.message = adventurer.role === 'cartographer'
      ? `${adventurer.name}: On ne sait pas ce qu'il y a la-dedans. Je dois noter cette salle.`
      : `${adventurer.name} ralentit pour verifier une salle inconnue proche.`;
    return this.targetThroughTransition(adventurer, target.mapId, target.cell);
  }

  private chooseUnexploredRoomTarget(adventurer: AdventurerEntity): ExpeditionExplorationTarget | null {
    const runtime = this.state.runtime;

    if (!runtime) {
      return null;
    }

    const map = this.getMap(adventurer.mapId);
    const currentCell = { x: Math.round(adventurer.x), y: Math.round(adventurer.y) };
    const primaryTarget = this.getPrimaryTargetCell(adventurer);
    const blockedCellKeys = getBlockedCellKeys(map.tiles);
    const primaryPathLength = findPath(currentCell, primaryTarget, {
      role: adventurer.role,
      trapAvoidance: this.state.memory.trapAvoidance * personalityTrapAvoidance(adventurer),
      trapDangerByCell: this.state.memory.trapDangerByCell,
      knownTrapCells: this.getKnownTrapCells(adventurer.mapId),
      blockedCellKeys,
    }).length || 99;
    const hasCartographer = runtime.partyProfiles.some((profile) => profile.role === 'cartographer');
    const maxPath = adventurer.role === 'cartographer' || hasCartographer ? 16 : 10;
    const maxDetour = adventurer.role === 'cartographer' || hasCartographer ? 12 : 7;

    const selected = map.zones
      .filter(isExplorableZone)
      .filter((zone) => !runtime.roomsEnteredThisExpedition.has(zoneMemoryKey(zone)))
      .map((zone) => {
        const path = findPath(currentCell, zone.center, {
          role: adventurer.role,
          trapAvoidance: this.state.memory.trapAvoidance * personalityTrapAvoidance(adventurer),
          trapDangerByCell: this.state.memory.trapDangerByCell,
          knownTrapCells: this.getKnownTrapCells(adventurer.mapId),
          blockedCellKeys,
        });
        const pathLength = path.length;
        const score =
          zoneExplorationPriority(zone.type) +
          (hasCartographer ? 8 : 0) +
          (adventurer.role === 'cartographer' ? 8 : 0) -
          pathLength * 1.15 -
          Math.max(0, pathLength - primaryPathLength) * 0.9;

        return { zone, pathLength, score };
      })
      .filter((entry) => entry.pathLength > 0 && entry.pathLength <= maxPath && entry.pathLength <= primaryPathLength + maxDetour)
      .sort((a, b) => b.score - a.score || a.pathLength - b.pathLength)[0] ?? null;

    return selected
      ? { mapId: map.id, zoneId: selected.zone.id, cell: { ...selected.zone.center } }
      : null;
  }

  private getBossStagingCell(adventurer: AdventurerEntity): GridCell {
    const bossCell = { x: Math.round(this.state.boss.x), y: Math.round(this.state.boss.y) };
    const towardEntryX = Math.sign(ENTRY_CELL.x - bossCell.x) || -1;
    const sideY = Math.sign(ENTRY_CELL.y - bossCell.y) || 1;
    const offsets = bossStagingOffsets(adventurer.role);
    const currentCell = { x: Math.round(adventurer.x), y: Math.round(adventurer.y) };
    const blockedCellKeys = getBlockedCellKeys(this.tilesForMap(adventurer.mapId));

    return offsets
      .map((offset) => ({
        cell: {
          x: bossCell.x + offset.back * towardEntryX,
          y: bossCell.y + offset.side * sideY,
        },
        offset,
      }))
      .filter((entry) => isInsideGrid(entry.cell))
      .filter((entry) => !blockedCellKeys.has(cellKey(entry.cell)))
      .filter((entry) => !this.doorsForMap(adventurer.mapId).some((door) => !door.destroyed && !door.openedForExpedition && isSameCell(door.cell, entry.cell)))
      .map((entry) => ({
        cell: entry.cell,
        pathLength: isSameCell(currentCell, entry.cell)
          ? 0
          : findPath(currentCell, entry.cell, {
            role: adventurer.role,
            trapAvoidance: this.state.memory.trapAvoidance * personalityTrapAvoidance(adventurer),
            trapDangerByCell: this.state.memory.trapDangerByCell,
            knownTrapCells: this.getKnownTrapCells(adventurer.mapId),
            blockedCellKeys,
          }).length,
      }))
      .filter((entry) => entry.pathLength > 0 || isSameCell(currentCell, entry.cell))
      .sort((a, b) => a.pathLength - b.pathLength)[0]?.cell ?? bossCell;
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
        } else if (isSpecialTreasureKind(treasure.kind)) {
          const profile = this.state.world.profiles[adventurer.profileId] ?? null;
          const bonus = profile ? grantSpecialTreasureBonus(profile, treasure, this.state.wave) : null;

          if (bonus && profile) {
            const line = describeSpecialTreasureBonus(profile.name, bonus, profile.role);
            this.state.runtime.stats.specialTreasureLoots.push(line);
            this.state.runtime.stats.storyEvents.push(line);
            addChronicle(this.state.world, line);
          }
        } else {
          this.state.runtime.stats.treasureStolen = true;
        }
      } else {
        this.state.runtime.stats.treasureStolen = true;
        this.state.treasure = { status: 'stolen', holderAdventurerId: null, droppedCell: null };
      }

      recordTreasureTheft(this.state.world, adventurer.profileId, treasure?.kind === 'gold' ? treasure.value : 0);
      const escapedSpecialKind = treasure && isSpecialTreasureKind(treasure.kind)
        ? specialKindFromTreasureKind(treasure.kind)
        : null;
      this.state.runtime.stats.storyEvents.push(
        treasure?.kind === 'gold'
          ? `${adventurer.name} s'echappe avec ${treasure.value} or deja deposes.`
          : escapedSpecialKind
            ? `${adventurer.name} s'echappe avec ${specialTreasureLabel(escapedSpecialKind)}.`
            : `${adventurer.name} s'echappe avec le tresor du donjon.`,
      );
      this.state.message = treasure?.kind === 'gold'
        ? `${adventurer.name} sort avec un tresor d'or. L'or etait deja depose: pas de double facture.`
        : treasure && isSpecialTreasureKind(treasure.kind)
          ? `${adventurer.name} sort avec un tresor special. Tu viens peut-etre d'armer un survivant.`
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

  private updateBossEngagementLock(): void {
    const runtime = this.state.runtime;

    if (!runtime) {
      return;
    }

    const engagement = runtime.bossEngagement;
    const bossDetected = this.isBossDetectedByParty();

    if (!bossDetected || runtime.partyPlan.retreating || runtime.partyPlan.groupObjective === 'escapeWithTreasure') {
      engagement.frontlineAdventurerId = null;
      engagement.lockedForFrontline = false;
      engagement.preparationAnnounced = false;
      engagement.fallbackReason = null;
      return;
    }

    const engager = this.selectBossEngager();

    if (!engager) {
      engagement.frontlineAdventurerId = null;
      engagement.lockedForFrontline = false;
      engagement.fallbackReason = 'Aucun engageur vivant ou atteignable.';
      return;
    }

    const changedEngager = engagement.frontlineAdventurerId !== engager.id;
    engagement.frontlineAdventurerId = engager.id;
    engagement.lockedForFrontline = engagement.firstBossAttackerId === null;
    engagement.fallbackReason = engager.role === 'warrior' ? null : `${engager.name} devient engageur de repli.`;

    if (engagement.lockedForFrontline && changedEngager) {
      runtime.stats.bossEngagementLocks += 1;
    }

    if (engagement.lockedForFrontline && !engagement.preparationAnnounced) {
      engagement.preparationAnnounced = true;
      runtime.stats.storyEvents.push(`${engager.name} prend la ligne avant l'engagement du boss.`);
      this.state.message = `${engager.name} prend la ligne. Le reste attend l'ouverture.`;
      tryBark(engager, 'bossPrepare', this.visibleBarkCount());
    }
  }

  private isBossDetectedByParty(): boolean {
    return this.state.adventurers.some(
      (adventurer) =>
        adventurer.alive &&
        !adventurer.escaped &&
        adventurer.mapId === this.state.boss.mapId &&
        (adventurer.targetStage === 'boss' ||
          distance(adventurer.x, adventurer.y, this.state.boss.x, this.state.boss.y) <= this.state.boss.detectionRange + 1.2),
    );
  }

  private selectBossEngager(): AdventurerEntity | null {
    return this.state.adventurers
      .filter((adventurer) => adventurer.alive && !adventurer.escaped && adventurer.targetStage !== 'exit' && adventurer.mapId === this.state.boss.mapId)
      .filter((adventurer) => this.canReachBossForEngagement(adventurer))
      .map((adventurer) => ({
        adventurer,
        priority: bossEngagePriority(adventurer.role),
        distance: distance(adventurer.x, adventurer.y, this.state.boss.x, this.state.boss.y),
      }))
      .sort((a, b) => a.priority - b.priority || a.distance - b.distance)[0]?.adventurer ?? null;
  }

  private canReachBossForEngagement(adventurer: AdventurerEntity): boolean {
    if (adventurer.mapId !== this.state.boss.mapId) {
      return this.hasGlobalWalkablePath(adventurer.mapId, { x: Math.round(adventurer.x), y: Math.round(adventurer.y) }, this.state.boss.mapId, this.getBossCell());
    }

    if (distance(adventurer.x, adventurer.y, this.state.boss.x, this.state.boss.y) <= adventurer.attackRange + 0.45) {
      return true;
    }

    const currentCell = { x: Math.round(adventurer.x), y: Math.round(adventurer.y) };
    return findPath(currentCell, this.getBossCell(), {
      role: adventurer.role,
      trapAvoidance: 0,
      trapDangerByCell: {},
      knownTrapCells: new Set(),
      blockedCellKeys: getBlockedCellKeys(this.tilesForMap(adventurer.mapId)),
    }).length > 0;
  }

  private chooseBossTargetWithEngagementLock(): AdventurerEntity | null {
    const engagement = this.state.runtime?.bossEngagement;
    const frontline = engagement?.frontlineAdventurerId
      ? this.state.adventurers.find((adventurer) => adventurer.id === engagement.frontlineAdventurerId && adventurer.alive && !adventurer.escaped && adventurer.mapId === this.state.boss.mapId) ?? null
      : null;

    if (
      engagement?.lockedForFrontline &&
      frontline &&
      distance(this.state.boss.x, this.state.boss.y, frontline.x, frontline.y) <= this.state.boss.detectionRange + 1.6
    ) {
      return frontline;
    }

    return chooseBossTarget(this.state.boss, this.state.adventurers.filter((adventurer) => adventurer.mapId === this.state.boss.mapId));
  }

  private canAdventurerAttackBoss(adventurer: AdventurerEntity): boolean {
    if (adventurer.targetStage !== 'boss' || adventurer.mapId !== this.state.boss.mapId) {
      return false;
    }

    const engagement = this.state.runtime?.bossEngagement;

    if (!engagement?.lockedForFrontline || engagement.firstBossAttackerId) {
      return true;
    }

    return adventurer.id === engagement.frontlineAdventurerId;
  }

  private applyBossEngagementBehavior(adventurer: AdventurerEntity): void {
    const runtime = this.state.runtime;
    const engagement = runtime?.bossEngagement;

    if (
      !runtime ||
      !engagement?.lockedForFrontline ||
      engagement.firstBossAttackerId ||
      adventurer.targetStage !== 'boss' ||
      adventurer.id === engagement.frontlineAdventurerId
    ) {
      return;
    }

    if (adventurer.role === 'mage' || adventurer.role === 'healer') {
      adventurer.behaviorState = 'backlineHold';
      runtime.stats.backlineHolds += 1;
      tryBark(adventurer, 'backlineHold', this.visibleBarkCount());
    } else if (adventurer.role === 'thief') {
      adventurer.behaviorState = 'waitingForTank';
      tryBark(adventurer, 'waitTank', this.visibleBarkCount());
    } else {
      adventurer.behaviorState = 'bossPreparation';
    }

    const stagingCell = this.getBossStagingCell(adventurer);

    if (distance(adventurer.x, adventurer.y, stagingCell.x, stagingCell.y) <= 0.35) {
      adventurer.hesitationTimerMs = Math.max(adventurer.hesitationTimerMs, adventurer.role === 'thief' ? 220 : 280);
    }
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
    const adventurersOnBossMap = this.state.adventurers.filter((adventurer) => adventurer.mapId === this.state.boss.mapId);
    const decision = chooseBossAutopilotAbility(this.state.boss, {
      adventurers: adventurersOnBossMap,
      defenses: this.state.defenses.filter((defense) => defense.mapId === this.state.boss.mapId),
      doors: this.doorsForMap(this.state.boss.mapId),
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
      canMoveBetween: (fromX, fromY, toX, toY) => canEntityMoveBetween(this.tilesForMap(this.state.boss.mapId), fromX, fromY, toX, toY),
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
          blockedCellKeys: getBlockedCellKeys(this.tilesForMap(this.state.boss.mapId)),
        })[0] ?? null;
      },
    };
  }

  private monsterMovementGuard(): {
    canMoveBetween: (defense: DefenseEntity, fromX: number, fromY: number, toX: number, toY: number) => boolean;
    getNextWaypoint: (defense: DefenseEntity, fromX: number, fromY: number, targetX: number, targetY: number) => GridCell | null;
  } {
    return {
      canMoveBetween: (defense, fromX, fromY, toX, toY) =>
        canEntityMoveBetween(this.tilesForMap(defense.mapId), fromX, fromY, toX, toY) &&
        !this.closedDoorBlocksMovementBetween(defense.mapId, fromX, fromY, toX, toY) &&
        !this.roomLockBlocksEntityStep(defense, { x: Math.round(fromX), y: Math.round(fromY) }, { x: Math.round(toX), y: Math.round(toY) }),
      getNextWaypoint: (defense, fromX, fromY, targetX, targetY) => {
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
          blockedCellKeys: new Set([
            ...getBlockedCellKeys(this.tilesForMap(defense.mapId)),
            ...this.getClosedDoorCellKeys(defense.mapId),
            ...this.getRoomLockBlockedExitKeys(defense),
          ]),
        })[0] ?? null;
      },
    };
  }

  private closedDoorBlocksMovementBetween(mapId: string, fromX: number, fromY: number, toX: number, toY: number): boolean {
    const closedDoorKeys = this.getClosedDoorCellKeys(mapId);
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

  private roomLockBlocksStep(mapId: string, fromCell: GridCell, toCell: GridCell): boolean {
    const lock = this.findActiveRoomLockContainingCell(mapId, fromCell);

    if (!lock) {
      return false;
    }

    return !lock.zone.cells.some((cell) => isSameCell(cell, toCell));
  }

  private roomLockBlocksEntityStep(entity: DefenseEntity, fromCell: GridCell, toCell: GridCell): boolean {
    const lock = this.findActiveRoomLockContainingCell(entity.mapId, fromCell);

    if (!lock || !lock.trap.roomLockMinionIds.includes(entity.id)) {
      return false;
    }

    return !lock.zone.cells.some((cell) => isSameCell(cell, toCell));
  }

  private getRoomLockBlockedExitKeys(entity: DefenseEntity): Set<string> {
    const lock = this.findActiveRoomLockContainingCell(entity.mapId, { x: Math.round(entity.x), y: Math.round(entity.y) });

    if (!lock || !lock.trap.roomLockMinionIds.includes(entity.id)) {
      return new Set();
    }

    const zoneKeys = new Set(lock.zone.cells.map((cell) => cellKey(cell)));
    const blocked = new Set<string>();

    lock.zone.cells.forEach((cell) => {
      cardinalNeighbors(cell)
        .filter((neighbor) => !zoneKeys.has(cellKey(neighbor)))
        .forEach((neighbor) => blocked.add(cellKey(neighbor)));
    });

    return blocked;
  }

  private findActiveRoomLockContainingCell(mapId: string, cell: GridCell): { trap: DefenseEntity; zone: DungeonZone } | null {
    const map = this.getMap(mapId);
    const zone = findZoneForCell(map.zones, cell);

    if (!zone) {
      return null;
    }

    const trap = this.state.defenses.find(
      (defense) =>
        defense.mapId === mapId &&
        defense.type === 'roomLockTrap' &&
        defense.trapState === 'triggered' &&
        defense.roomLockZoneId === zone.id,
    ) ?? null;

    return trap ? { trap, zone } : null;
  }

  private getClosedDoorCellKeys(mapId = this.state.currentMapId): Set<string> {
    return new Set(
      this.state.doors
        .filter((door) => door.mapId === mapId && !door.destroyed && !door.openedForExpedition)
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
      adventurers: this.state.adventurers.filter((candidate) => candidate.mapId === adventurer.mapId),
      defenses: this.state.defenses.filter((defense) => defense.mapId === adventurer.mapId),
      boss: this.state.boss,
      doors: this.doorsForMap(adventurer.mapId),
      stats: runtime.stats,
      elapsedMs: runtime.elapsedMs,
      damageMinion: (target, damage, attacker) => this.damageMinion(target, damage, attacker),
      damageBoss: (damage, attacker) => this.damageBoss(damage, attacker),
      healAdventurer: (target, amount, healer) => this.healAdventurer(target, amount, healer),
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

  private healAdventurer(target: AdventurerEntity, amount: number, healer: AdventurerEntity | null = null): number {
    if (!target.alive || target.escaped) {
      return 0;
    }

    const healed = Math.min(amount, target.maxHp - target.hp);
    target.hp += healed;
    target.abilityFxTimerMs = Math.max(target.abilityFxTimerMs, COMBAT_ABILITY_BALANCE.abilityFxMs);

    if (healed > 0 && this.state.runtime) {
      this.queueCombatFeedback({
        kind: 'heal',
        mapId: target.mapId,
        amount: healed,
        targetId: target.id,
        targetName: target.name,
        x: target.x,
        y: target.y,
        sourceId: healer?.id ?? target.id,
        sourceName: healer?.name ?? target.name,
        sourceFaction: 'adventurer',
        sourceRole: healer?.role ?? target.role,
        sourceType: null,
        style: 'heal',
      });

      if (healer) {
        this.state.defenses.forEach((defense) => {
          if (defense.mapId === healer.mapId && defense.alive && defense.kind === 'minion' && distance(defense.x, defense.y, healer.x, healer.y) <= 4.4) {
            addThreat(defense.threatByAdventurerId, healer, healed * 0.65);
          }
        });

        if (healer.mapId === this.state.boss.mapId && distance(this.state.boss.x, this.state.boss.y, healer.x, healer.y) <= this.state.boss.detectionRange + 1.2) {
          addThreat(this.state.boss.threatByAdventurerId, healer, healed * 0.55);
        }
      }
    }

    return healed;
  }

  private queueCombatFeedback(
    event: Omit<CombatFeedbackEvent, 'id' | 'ageMs' | 'boostedBySpecial' | 'mapId'> & { boostedBySpecial?: boolean; mapId?: string },
  ): void {
    if (!this.state.runtime || event.amount <= 0) {
      return;
    }

    this.state.runtime.combatFeedbackEvents.push({
      boostedBySpecial: false,
      ...event,
      mapId: event.mapId ?? this.state.currentMapId,
      id: `combat-feedback-${this.nextCombatFeedbackId}`,
      ageMs: 0,
    });
    this.nextCombatFeedbackId += 1;
    this.state.runtime.stats.combatFeedbackEvents += 1;

    if (this.state.runtime.combatFeedbackEvents.length > 32) {
      this.state.runtime.combatFeedbackEvents = this.state.runtime.combatFeedbackEvents.slice(-32);
    }
  }

  private eventVisibleOnCurrentMap(event: CombatFeedbackEvent): boolean {
    return event.mapId === this.state.currentMapId;
  }

  private applyLocalDecision(adventurer: AdventurerEntity): void {
    if (!this.state.runtime) {
      return;
    }

    const decision = evaluateLocalAdventurerDecision(adventurer, {
      partyPlan: this.state.runtime.partyPlan,
      adventurers: this.state.adventurers.filter((candidate) => candidate.mapId === adventurer.mapId),
      defenses: this.state.defenses.filter((defense) => defense.mapId === adventurer.mapId),
      doors: this.doorsForMap(adventurer.mapId),
      targetCell: this.getTargetCell(adventurer),
    });

    adventurer.decisionSpeedMultiplier = decision.speedMultiplier;
    adventurer.behaviorState = decision.behaviorState;
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
      this.state.memory.doorBlockedWithoutThief = true;
      notes.push('Porte verrouillee sans specialiste: la Guilde inscrit "voleur requis" en haut du prochain contrat.');
    }

    if (stats.doorsPicked > 0) {
      this.state.memory.doorBlockedWithoutThief = false;
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
    this.recalculateZones();
    return refund;
  }

  private removeDeadMinions(): void {
    this.state.defenses = this.state.defenses.filter((defense) => defense.kind === 'trap' || defense.alive);
    this.recalculateZones();
  }

  private findNearestAdventurer(
    x: number,
    y: number,
    maxRange: number,
    preferredId: string | null = null,
    threatByAdventurerId: Record<string, number> = {},
    mapId: string | null = null,
  ): AdventurerEntity | null {
    const alive = this.state.adventurers.filter((adventurer) => adventurer.alive && !adventurer.escaped && (mapId === null || adventurer.mapId === mapId));
    return chooseThreatTarget(x, y, alive, maxRange, threatByAdventurerId, preferredId);
  }

  private findTargetMinion(adventurer: AdventurerEntity): DefenseEntity | null {
    return this.state.defenses
      .filter((defense) => defense.mapId === adventurer.mapId && defense.alive && defense.kind === 'minion')
      .map((defense) => ({
        defense,
        distance: distance(adventurer.x, adventurer.y, defense.x, defense.y),
        nemesisPriority:
          adventurer.personality === 'vengeful' && defense.type === adventurer.nemesisDefenseType ? 0 : 1,
      }))
      .filter((entry) => entry.distance <= adventurer.attackRange)
      .sort((a, b) => a.nemesisPriority - b.nemesisPriority || a.distance - b.distance)[0]?.defense ?? null;
  }

  private getKnownTrapCells(mapId = this.state.currentMapId): Set<string> {
    return new Set(
      this.state.defenses
        .filter((defense) => defense.mapId === mapId && defense.alive && defense.kind === 'trap' && (defense.trapState === null || defense.trapState === 'armed'))
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

  private hasActiveLockedDoor(): boolean {
    return this.state.doors.some((door) => !door.destroyed && !door.openedForExpedition);
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
    specialTreasureLoots: [],
    combatFeedbackEvents: 0,
    bossEngagementLocks: 0,
    opportunisticLoots: 0,
    roomEvaluations: 0,
    backlineHolds: 0,
    cartographyObservations: [],
    cartographerObservedFacts: 0,
    cartographerSurvivors: 0,
    cartographerDeaths: 0,
    cartographerReports: 0,
    cartographerLostReports: 0,
    zoneObservations: 0,
    guardianSightings: 0,
    guardianFights: 0,
    guardianKills: 0,
    guardianDeaths: 0,
    remainsSeen: 0,
    relicsRecognized: 0,
    remainsReactionEvents: [],
  };
}

function createBossEngagementState(): BossEngagementState {
  return {
    frontlineAdventurerId: null,
    firstBossAttackerId: null,
    firstBossAttackerRole: null,
    lockedForFrontline: false,
    preparationAnnounced: false,
    fallbackReason: null,
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
    mapId: FINAL_MAP_ID,
    kind: 'main',
    cell: { ...TREASURE_CELL },
    value: 0,
    status: 'secure',
    holderAdventurerId: null,
    droppedCell: null,
  };
}

function isAddTreasureTool(type: ConstructionTool): boolean {
  return type === 'addGoldTreasure'
    || type === 'addWeaponTreasure'
    || type === 'addArmorTreasure'
    || type === 'addTechniqueTreasure';
}

function treasureAttraction(
  treasure: DungeonTreasure,
  adventurer: AdventurerEntity | null,
  profile: AdventurerProfile | null,
): number {
  if (treasure.kind === 'main') {
    return adventurer ? 34 : 38;
  }

  if (treasure.kind === 'gold') {
    return adventurer?.personality === 'greedy' ? 32 : 24;
  }

  const specialKind = specialKindFromTreasureKind(treasure.kind);
  const alreadyHasBonus = specialKind && profile
    ? profile.specialTreasureBonuses.some((bonus) => bonus.kind === specialKind)
    : false;
  const role = adventurer?.role ?? null;
  const roleBonus =
    treasure.kind === 'specialArmor'
      ? role === 'warrior'
        ? 34
        : role === 'healer'
          ? 16
          : 10
      : treasure.kind === 'specialWeapon'
        ? role === 'warrior' || role === 'thief'
          ? 28
          : role === 'mage'
            ? 20
            : 8
      : treasure.kind === 'specialTechnique'
        ? role === 'mage' || role === 'healer'
          ? 34
          : role === 'cartographer'
            ? 28
            : role === 'thief'
            ? 24
            : 12
          : 0;

  return 62 + roleBonus - (alreadyHasBonus ? 42 : 0);
}

function specialTreasurePriority(kind: DungeonTreasureKind): number {
  if (kind === 'specialTechnique') {
    return 4;
  }

  if (kind === 'specialArmor' || kind === 'specialWeapon') {
    return 3;
  }

  if (kind === 'main') {
    return 2;
  }

  return kind === 'gold' ? 1 : 0;
}

function specialTreasureNameForKind(kind: DungeonTreasureKind): string {
  const specialKind = specialKindFromTreasureKind(kind);
  return specialKind ? specialTreasureLabel(specialKind) : 'un tresor special';
}

function bossEngagePriority(role: AdventurerRole): number {
  switch (role) {
    case 'warrior':
      return 0;
    case 'thief':
      return 2;
    case 'mage':
      return 3;
    case 'cartographer':
      return 4;
    case 'healer':
      return 5;
    default:
      return 9;
  }
}

function bossStagingOffsets(role: AdventurerRole): Array<{ back: number; side: number }> {
  switch (role) {
    case 'thief':
      return [
        { back: 1, side: -1 },
        { back: 1, side: 1 },
        { back: 2, side: -1 },
        { back: 2, side: 1 },
      ];
    case 'mage':
      return [
        { back: 2, side: -1 },
        { back: 3, side: -1 },
        { back: 2, side: 1 },
        { back: 3, side: 1 },
      ];
    case 'cartographer':
      return [
        { back: 2, side: 0 },
        { back: 2, side: -1 },
        { back: 3, side: 0 },
        { back: 3, side: 1 },
      ];
    case 'healer':
      return [
        { back: 3, side: 0 },
        { back: 3, side: 1 },
        { back: 4, side: 0 },
        { back: 2, side: 1 },
      ];
    default:
      return [
        { back: 1, side: 0 },
        { back: 1, side: -1 },
        { back: 1, side: 1 },
      ];
  }
}

function getTreasureCurrentCell(treasure: DungeonTreasure): GridCell | null {
  return treasure.status === 'dropped' && treasure.droppedCell ? treasure.droppedCell : treasure.cell;
}

function hasSpecialDamageBonus(adventurer: AdventurerEntity): boolean {
  return computeSpecialTreasureModifiersFromBonuses(adventurer.role, adventurer.specialTreasureBonuses).damageBonus > 0;
}

function combatFeedbackStyleForRole(role: AdventurerRole): CombatFeedbackStyle {
  switch (role) {
    case 'warrior':
      return 'tank';
    case 'thief':
      return 'rogue';
    case 'mage':
      return 'caster';
    case 'healer':
      return 'healer';
    case 'cartographer':
      return 'cartographer';
    default:
      return 'monster';
  }
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

function cardinalNeighbors(cell: GridCell): GridCell[] {
  return [
    { x: cell.x + 1, y: cell.y },
    { x: cell.x - 1, y: cell.y },
    { x: cell.x, y: cell.y + 1 },
    { x: cell.x, y: cell.y - 1 },
  ].filter(isInsideGrid);
}

function zoneMemoryKey(zone: DungeonZone): string {
  return `${zone.mapId}:${zone.id}`;
}

function isExplorableZone(zone: DungeonZone): boolean {
  return zone.type === 'secondary' ||
    zone.type === 'defense' ||
    zone.type === 'antechamber' ||
    zone.type === 'treasure';
}

function zoneExplorationPriority(type: DungeonZone['type']): number {
  switch (type) {
    case 'defense':
      return 34;
    case 'secondary':
      return 30;
    case 'treasure':
      return 24;
    case 'antechamber':
      return 18;
    default:
      return 0;
  }
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
