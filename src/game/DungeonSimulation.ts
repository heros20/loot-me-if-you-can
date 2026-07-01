import {
  BOSS_CELL,
  ENTRY_CELL,
  STARTING_GOLD,
  TREASURE_CELL,
  cellKey,
  isInsideGrid,
  isProtectedCell,
  isSameCell,
  isWallCell,
} from './constants';
import type {
  AdventurerDefinition,
  AdventurerEntity,
  AdventurerRole,
  BossEntity,
  DefenseEntity,
  DefenseStatsByType,
  DefenseType,
  EffectStats,
  GameState,
  GridCell,
  ReportEntry,
  WaveReport,
  WaveRuntime,
  WaveStats,
} from './types';
import type { CountItem, DungeonSnapshot } from './uiSnapshot';
import {
  ADVENTURER_DEFINITIONS,
  ADVENTURER_ORDER,
  DEFENSE_DEFINITIONS,
  DEFENSE_ORDER,
  getAdventurerDefinition,
  getDefenseDefinition,
} from '../entities/definitions';
import { buildWaveRoster, createAdventurer } from '../systems/waveDirector';
import { findPath } from '../systems/pathfinding';
import {
  activateProfileForExpedition,
  addChronicle,
  advanceWorldDay,
  createInjury,
  createInitialWorldMemory,
  recordBossDefeatSurvivors,
  recordProfileMonsterKill,
  recordProfileNemesis,
  recordProfileDeath,
  recordProfileSurvival,
  recordProfileTrapTriggered,
  selectProfilesForWave,
  updateDungeonReputation,
} from '../systems/adventurerProfiles';
import { buildWaveStoryLines } from '../systems/narrativeReports';
import { chooseBossTarget, updateBossMovement } from '../systems/bossAISystem';
import { updateMonsterAI } from '../systems/monsterAISystem';
import {
  applyPartyDecisions,
  choosePostTreasureGoal,
  createPartyPlan,
  updatePartyPlan,
} from '../systems/partyAISystem';

const BOSS_TEMPLATE: Omit<BossEntity, 'hp' | 'attackTimerMs'> = {
  homeCell: BOSS_CELL,
  x: BOSS_CELL.x,
  y: BOSS_CELL.y,
  maxHp: 260,
  damage: 14,
  attackRange: 1.25,
  detectionRange: 2.65,
  leashRange: 1.85,
  attackCooldownMs: 820,
  targetAdventurerId: null,
};

export class DungeonSimulation {
  private state: GameState;
  private nextDefenseId = 1;
  private nextAdventurerId = 1;

  constructor() {
    this.state = this.createInitialState();
  }

  startNewGame(): void {
    this.nextDefenseId = 1;
    this.nextAdventurerId = 1;
    this.state = this.createInitialState();
  }

  update(deltaMs: number): void {
    if (this.state.phase !== 'wave' || !this.state.runtime) {
      return;
    }

    const runtime = this.state.runtime;
    runtime.elapsedMs += deltaMs;

    this.tickTimers(deltaMs);
    this.spawnAdventurers(deltaMs);
    this.updatePartyDecisions();
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

  selectDefense(type: DefenseType): void {
    this.state.selectedDefense = type;
    this.state.message = `${getDefenseDefinition(type).name} selectionne. La decoration devient enfin hostile.`;
  }

  placeSelectedDefense(cell: GridCell): void {
    if (this.state.phase !== 'build') {
      this.state.message = 'Pendant la vague, on regarde ses mauvais choix agir.';
      return;
    }

    const selected = this.state.selectedDefense;

    if (!selected) {
      this.state.message = 'Choisis une horreur a poser avant de tapisser le sol de regrets.';
      return;
    }

    if (!isInsideGrid(cell) || isWallCell(cell) || isProtectedCell(cell)) {
      this.state.message = 'Cette dalle refuse ton autorite. Tres insolent.';
      return;
    }

    if (this.state.defenses.some((defense) => defense.alive && isSameCell(defense.cell, cell))) {
      this.state.message = 'Une defense occupe deja cette dalle. Meme les monstres ont besoin de place.';
      return;
    }

    const definition = getDefenseDefinition(selected);

    if (this.state.gold < definition.cost) {
      this.state.message = "Budget insuffisant. Le mal aussi a une comptabilite.";
      return;
    }

    this.state.gold -= definition.cost;
    this.state.defenses.push({
      id: `defense-${this.nextDefenseId}`,
      type: selected,
      kind: definition.kind,
      cell: { ...cell },
      homeCell: { ...cell },
      x: cell.x,
      y: cell.y,
      hp: definition.hp ?? 1,
      maxHp: definition.hp ?? 1,
      cooldownRemainingMs: 0,
      alive: true,
      aiState: 'idle',
      targetAdventurerId: null,
      patrolAngle: this.nextDefenseId * 0.71,
    });
    this.nextDefenseId += 1;
    this.state.message = `${definition.name} pose. C'est juridiquement discutable, donc parfait.`;
  }

  launchWave(): void {
    if (this.state.phase !== 'build') {
      return;
    }

    advanceWorldDay(this.state.world, 3 + this.state.wave);
    const roster = buildWaveRoster(this.state.wave, this.state.memory);
    const profiles = selectProfilesForWave(roster, this.state.world, this.state.wave);

    this.state.phase = 'wave';
    this.state.runtime = {
      elapsedMs: 0,
      spawnTimerMs: 0,
      spawnQueue: [...profiles],
      spawned: 0,
      partyPlan: createPartyPlan(this.state.wave, this.state.world.dungeonReputation.value),
      stats: createEmptyWaveStats(),
    };
    this.state.report = null;
    this.state.adventurers = [];
    this.state.defenses.forEach((defense) => {
      defense.cooldownRemainingMs = 0;
    });
    this.state.message = `${this.state.runtime.partyPlan.label}: les heros arrivent avec une strategie, ce qui est nouveau et inquietant.`;
  }

  continueBuild(): void {
    if (this.state.phase !== 'report') {
      return;
    }

    this.state.phase = 'build';
    this.state.defenses = this.state.defenses.filter((defense) => defense.kind === 'trap' || defense.alive);
    this.state.defenses.forEach((defense) => {
      if (defense.kind === 'minion') {
        defense.hp = Math.min(defense.maxHp, defense.hp + Math.ceil(defense.maxHp * 0.28));
      }

      defense.cooldownRemainingMs = 0;
    });
    this.state.message = 'Nouvelle preparation. Les survivants racontent deja des mensonges tactiques.';
  }

  restart(): void {
    this.startNewGame();
  }

  getSnapshot(): DungeonSnapshot {
    const previewRoster = this.state.phase === 'wave' && this.state.runtime
      ? this.state.runtime.spawnQueue.map((profile) => profile.role)
      : buildWaveRoster(this.state.wave, this.state.memory);
    const allRoles = [
      ...this.state.adventurers.map((adventurer) => adventurer.role),
      ...previewRoster,
    ];

    return {
      phase: this.state.phase === 'menu' ? 'build' : this.state.phase,
      wave: this.state.wave,
      gold: this.state.gold,
      selectedDefense: this.state.selectedDefense,
      bossHp: Math.ceil(this.state.boss.hp),
      bossMaxHp: this.state.boss.maxHp,
      message: this.state.message,
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
      adventurersByRole: countRoles(allRoles),
      defensesByKind: this.countDefensesByKind(),
      liveAdventurers: this.state.adventurers.length,
      nextWaveSize: previewRoster.length,
      canLaunchWave: this.state.phase === 'build',
      report: this.state.report,
      survivedWaves: Math.max(0, this.state.wave - 1),
      dungeonReputation: this.state.world.dungeonReputation.value,
      dungeonReputationTitle: this.state.world.dungeonReputation.title,
      recentJournal: this.state.world.expeditionHistory.slice(-5).map((record) => record.note),
      recentChronicles: this.state.world.chronicles.slice(-5).map((entry) => `Jour ${entry.day}: ${entry.text}`),
      activeAdventurerNames: this.state.adventurers.map((adventurer) => adventurer.name),
    };
  }

  getRenderState(): Pick<GameState, 'defenses' | 'adventurers' | 'boss' | 'phase' | 'selectedDefense'> {
    return {
      defenses: this.state.defenses,
      adventurers: this.state.adventurers,
      boss: this.state.boss,
      phase: this.state.phase,
      selectedDefense: this.state.selectedDefense,
    };
  }

  private createInitialState(): GameState {
    return {
      phase: 'build',
      wave: 1,
      gold: STARTING_GOLD,
      selectedDefense: 'spikeTrap',
      defenses: [],
      adventurers: [],
      boss: {
        ...BOSS_TEMPLATE,
        hp: BOSS_TEMPLATE.maxHp,
        attackTimerMs: 0,
      },
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
    };
  }

  private tickTimers(deltaMs: number): void {
    this.state.defenses.forEach((defense) => {
      defense.cooldownRemainingMs = Math.max(0, defense.cooldownRemainingMs - deltaMs);
    });

    this.state.boss.attackTimerMs = Math.max(0, this.state.boss.attackTimerMs - deltaMs);

    this.state.adventurers.forEach((adventurer) => {
      adventurer.attackTimerMs = Math.max(0, adventurer.attackTimerMs - deltaMs);
      adventurer.healTimerMs = Math.max(0, adventurer.healTimerMs - deltaMs);
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

      const definition = getDefenseDefinition(defense.type);
      const target = this.findNearestAdventurer(defense.x, defense.y, definition.attackRange ?? 1);

      if (!target) {
        return;
      }

      const damage = definition.damage ?? 1;
      this.damageAdventurer(target, damage, 'minion', defense.type, defense.cell);
      defense.cooldownRemainingMs = definition.attackCooldownMs ?? 900;
      runtime.stats.combatEngagementMs += deltaMs;
    });

    const bossTarget = chooseBossTarget(this.state.boss, this.state.adventurers);
    updateBossMovement(this.state.boss, bossTarget, deltaMs);

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
      if (!adventurer.alive) {
        continue;
      }

      const definition = getAdventurerDefinition(adventurer.role);
      this.maybeStartRetreat(adventurer);

      if (adventurer.targetStage === 'exit') {
        this.moveAdventurer(adventurer, deltaMs);
        continue;
      }

      const healed = this.tryHeal(adventurer, definition);

      if (healed) {
        continue;
      }

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

  private tryHeal(adventurer: AdventurerEntity, definition: AdventurerDefinition): boolean {
    const healAmount = definition.healAmount;
    const healRange = definition.healRange;

    if (adventurer.role !== 'healer' || adventurer.healTimerMs > 0 || !healAmount || !healRange) {
      return false;
    }

    const target = this.state.adventurers
      .filter((candidate) => candidate.alive && candidate.hp < candidate.maxHp)
      .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)
      .find((candidate) => distance(adventurer.x, adventurer.y, candidate.x, candidate.y) <= healRange);

    if (!target) {
      return false;
    }

    const healed = Math.min(healAmount, target.maxHp - target.hp);
    target.hp += healed;
    adventurer.healTimerMs = definition.healCooldownMs ?? 1200;

    if (this.state.runtime) {
      this.state.runtime.stats.healingDone += healed;
    }

    return true;
  }

  private moveAdventurer(adventurer: AdventurerEntity, deltaMs: number): void {
    const targetCell = this.getTargetCell(adventurer);
    const currentCell = { x: Math.round(adventurer.x), y: Math.round(adventurer.y) };

    if (isSameCell(currentCell, targetCell)) {
      this.handleObjectiveReached(adventurer);
      return;
    }

    if (adventurer.path.length === 0) {
      adventurer.path = findPath(currentCell, targetCell, {
        role: adventurer.role,
        trapAvoidance: this.state.memory.trapAvoidance * personalityTrapAvoidance(adventurer),
        trapDangerByCell: this.state.memory.trapDangerByCell,
        knownTrapCells: this.getKnownTrapCells(),
      });
    }

    const nextCell = adventurer.path[0];

    if (!nextCell) {
      return;
    }

    const dx = nextCell.x - adventurer.x;
    const dy = nextCell.y - adventurer.y;
    const remaining = Math.hypot(dx, dy);
    const step = adventurer.speed * adventurer.speedMultiplier * deltaMs;

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

  private handleObjectiveReached(adventurer: AdventurerEntity): void {
    if (adventurer.targetStage === 'treasure') {
      if (this.state.runtime) {
        this.state.runtime.partyPlan.treasureClaimed = true;
      }

      adventurer.targetStage = this.state.runtime
        ? choosePostTreasureGoal(this.state.runtime.partyPlan, adventurer)
        : 'boss';
      adventurer.path = [];
      this.state.message = `${adventurer.name} atteint le Tresor du Donjon. Les assurances refusent deja le dossier.`;

      if (!this.state.world.chronicles.some((entry) => entry.text.includes('atteint la salle du boss'))) {
        addChronicle(this.state.world, 'Le premier aventurier atteint la salle du boss.');
      }

      return;
    }

    if (adventurer.targetStage === 'exit') {
      this.recordEscape(adventurer);
    }
  }

  private handleCellEntered(adventurer: AdventurerEntity, cell: GridCell): void {
    const key = cellKey(cell);

    if (adventurer.lastCellKey === key || !adventurer.alive) {
      return;
    }

    adventurer.lastCellKey = key;
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
    this.damageAdventurer(adventurer, damage, 'trap', trap.type, cell);
    trap.cooldownRemainingMs = definition.trapCooldownMs ?? 1500;
  }

  private damageAdventurer(
    adventurer: AdventurerEntity,
    damage: number,
    source: 'trap' | 'minion' | 'boss',
    sourceType: DefenseType | null,
    sourceCell: GridCell,
  ): number {
    if (!this.state.runtime || !adventurer.alive) {
      return 0;
    }

    const actualDamage = Math.min(adventurer.hp, damage);
    adventurer.hp -= actualDamage;

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
    this.state.runtime.stats.adventurersKilled += 1;
    const cause = describeDeathCause(source, sourceType);
    const deathRecord = recordProfileDeath(this.state.world, adventurer.profileId, this.state.wave, `${adventurer.name} meurt: ${cause}.`);

    if (deathRecord) {
      this.state.runtime.stats.deaths.push(deathRecord);
    }

    if (source === 'trap' && sourceType) {
      recordStats(this.state.runtime.stats.trapStats, sourceType, 0, 1);
      const key = cellKey(sourceCell);
      this.state.memory.trapDangerByCell[key] = (this.state.memory.trapDangerByCell[key] ?? 0) + 1.25;
      this.state.message = `${adventurer.name} decouvre le concept de dalle regrettable.`;
    }

    if (source === 'minion' && sourceType) {
      recordStats(this.state.runtime.stats.minionStats, sourceType, 0, 1);
      this.state.message = `${adventurer.name} est neutralise par un employe sous-paye.`;
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
      this.state.runtime?.stats.storyEvents.push(`${attacker.name} abat ${getDefenseDefinition(minion.type).name}.`);
      this.state.message = `${getDefenseDefinition(minion.type).name} tombe. Il sera remplace par quelqu'un de moins syndique.`;
    }
  }

  private damageBoss(damage: number, attacker: AdventurerEntity): void {
    if (!this.state.runtime) {
      return;
    }

    const actualDamage = Math.min(this.state.boss.hp, damage);
    this.state.boss.hp -= actualDamage;
    this.state.runtime.stats.bossDamageTaken += actualDamage;
    this.state.runtime.stats.bossDamageByProfile[attacker.profileId] =
      (this.state.runtime.stats.bossDamageByProfile[attacker.profileId] ?? 0) + actualDamage;

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
    const goldAwarded = 14 + currentWave * 4;
    const adaptationNotes = this.applyAdaptation(runtime.stats, runtime.elapsedMs);
    const previousTitle = this.state.world.dungeonReputation.title;
    const reputationDelta = updateDungeonReputation(
      this.state.world,
      runtime.stats.adventurersKilled * 2 + runtime.stats.adventurersEscaped + currentWave,
      'Les morts et survivants bavards ameliorent la notoriete du donjon.',
    );
    this.addReputationChronicle(previousTitle);
    const bossHeal = 24 + currentWave * 2;
    this.state.boss.hp = Math.min(this.state.boss.maxHp, this.state.boss.hp + bossHeal);
    this.state.gold += goldAwarded;
    this.state.report = this.createReport(true, currentWave, runtime, goldAwarded, adaptationNotes, reputationDelta);
    this.state.wave += 1;
    this.state.phase = 'report';
    this.state.runtime = null;
    this.state.message = 'Vague repoussee. La paperasse de necromancie commence.';
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
    this.state.report = this.createReport(false, this.state.wave, runtime, 0, adaptationNotes, reputationDelta);
    this.state.phase = 'defeat';
    this.state.runtime = null;
  }

  private createReport(
    cleared: boolean,
    wave: number,
    runtime: WaveRuntime,
    goldAwarded: number,
    adaptationNotes: string[],
    reputationDelta: number,
  ): WaveReport {
    const trapHighlights = statsToReportEntries(runtime.stats.trapStats, 'trap');
    const minionHighlights = statsToReportEntries(runtime.stats.minionStats, 'minion');

    return {
      wave,
      cleared,
      durationSeconds: Math.round(runtime.elapsedMs / 1000),
      adventurersKilled: runtime.stats.adventurersKilled,
      adventurersEscaped: runtime.stats.adventurersEscaped,
      bossDamageTaken: Math.round(runtime.stats.bossDamageTaken),
      goldAwarded,
      dungeonReputation: this.state.world.dungeonReputation.value,
      reputationDelta,
      trapHighlights,
      minionHighlights,
      storyLines: buildWaveStoryLines({
        cleared,
        wave,
        stats: runtime.stats,
        trapHighlights,
        minionHighlights,
        dungeonTitle: this.state.world.dungeonReputation.title,
        reputationDelta,
      }),
      notableAdventurers: buildNotableAdventurers(runtime.stats),
      deaths: runtime.stats.deaths.slice(-5).map((record) => record.note),
      survivors: runtime.stats.survivors.slice(-5).map((record) => record.note),
      adaptationNotes,
      verdict: cleared
        ? 'Tous les aventuriers sont morts. Ils reviendront, parce que les heros confondent obstination et scenario.'
        : 'Le boss est mort. Le donjon passe sous gestion heroique, donc probablement en open space.',
    };
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

    adventurer.targetStage = 'exit';
    adventurer.path = [];
    this.state.message = `${adventurer.name} choisit la strategie heroique dite "sortir vivant".`;
  }

  private getTargetCell(adventurer: AdventurerEntity): GridCell {
    if (adventurer.targetStage === 'treasure') {
      return TREASURE_CELL;
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
    );

    if (decision) {
      this.state.message = decision;
      this.state.runtime.stats.storyEvents.push(decision);
    }

    applyPartyDecisions(this.state.runtime.partyPlan, this.state.adventurers);
  }

  private updateMonsterMovement(deltaMs: number): void {
    const result = updateMonsterAI(this.state.defenses, this.state.adventurers, deltaMs);
    const slowedIds = new Set(result.slowedAdventurerIds);

    this.state.adventurers.forEach((adventurer) => {
      adventurer.slowedTimerMs = Math.max(0, adventurer.slowedTimerMs - deltaMs);

      if (slowedIds.has(adventurer.id)) {
        adventurer.slowedTimerMs = 620;
      }

      adventurer.speedMultiplier = adventurer.slowedTimerMs > 0 ? 0.58 : 1;
    });
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

    if (trapCount >= 3 || trapDamage >= 55 || trapKills >= 2) {
      this.state.memory.rolePressure.thief += 1;
      this.state.memory.trapAvoidance = Math.min(2.75, this.state.memory.trapAvoidance + 0.28);
      notes.push('Ils recrutent plus de voleurs et notent les dalles meurtrieres. Delation cartographique.');
    }

    if (durationMs >= 26000 || stats.combatEngagementMs >= 9000) {
      this.state.memory.rolePressure.healer += 1;
      notes.push('Les combats durent trop longtemps: un soigneur supplementaire prepare des pansements pretentieux.');
    }

    if (minionDamage >= 70 || minionKills >= 2) {
      this.state.memory.rolePressure.warrior += 1;
      notes.push('Tes sbires font mal: ils enverront plus de guerriers epais comme des portes de crypte.');
    }

    if (notes.length === 0) {
      this.state.memory.rolePressure.mage += 1;
      notes.push('Ils improvisent avec plus de magie. Quand on manque de plan, on ajoute des etincelles.');
    }

    return notes;
  }

  private removeDeadMinions(): void {
    this.state.defenses = this.state.defenses.filter((defense) => defense.kind === 'trap' || defense.alive);
  }

  private findNearestAdventurer(x: number, y: number, maxRange: number): AdventurerEntity | null {
    return this.state.adventurers
      .filter((adventurer) => adventurer.alive)
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
  };
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

function describeDeathCause(source: 'trap' | 'minion' | 'boss', sourceType: DefenseType | null): string {
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
