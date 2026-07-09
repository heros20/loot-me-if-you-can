import Phaser from 'phaser';
import { ENTITY_VISUALS, type EntityVisualProfile } from '../assets/animationManifest';
import { AUDIO_KEYS, TEXTURE_KEYS } from '../assets/manifest';
import {
  BOSS_CELL,
  DIG_COST,
  DOOR_COST,
  ENTRY_CELL,
  FINAL_MAP_ID,
  GRID_COLS,
  GRID_OFFSET_X,
  GRID_OFFSET_Y,
  GRID_ROWS,
  TILE_SIZE,
  cellKey,
  cellToWorld,
  gridPositionToWorld,
  isInEntrySafeZone,
  isSameCell,
  worldToCell,
} from '../game/constants';
import {
  getTileAt,
  hasAdjacentDugTile,
} from '../game/dungeonTiles';
import { DungeonSimulation } from '../game/DungeonSimulation';
import type {
  AdventurerEntity,
  AdventurerRemains,
  CombatFeedbackEvent,
  ConstructionTool,
  DefenseEntity,
  DungeonDoor,
  DungeonTransition,
  DungeonTile,
  DungeonTreasureKind,
} from '../game/types';
import { getAdventurerDefinition, getDefenseDefinition } from '../entities/definitions';
import { canBuildDefenseOnTile, canMarkRoomTile } from '../systems/dungeonConstruction';
import { canPlaceDoorAt, findActiveDoorAt, findDoorAt } from '../systems/doorSystem';
import { AudioSystem } from '../systems/audioSystem';
import { emitUiState, onUiAction } from '../ui/uiEvents';

interface RenderedEntity {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Sprite;
  label: Phaser.GameObjects.Text;
  badge?: Phaser.GameObjects.Text;
  fxLabel?: Phaser.GameObjects.Text;
  intentLabel?: Phaser.GameObjects.Text;
  bark?: Phaser.GameObjects.Text;
  actionUntilMs?: number;
  currentAnimation?: string;
}

interface RenderedDoor {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
}

export class DungeonScene extends Phaser.Scene {
  private simulation = new DungeonSimulation();
  private unsubscribeActions: (() => void) | null = null;
  private defenseViews = new Map<string, RenderedEntity>();
  private adventurerViews = new Map<string, RenderedEntity>();
  private doorViews = new Map<string, RenderedDoor>();
  private previousDefenseHp = new Map<string, number>();
  private previousAdventurerHp = new Map<string, number>();
  private previousDoorHp = new Map<string, number>();
  private previousDoorState = new Map<string, string>();
  private previousTrapState = new Map<string, string>();
  private previousTreasureState = new Map<string, string>();
  private previousRemainsLootState = new Map<string, boolean>();
  private previousAdventurerCell = new Map<string, string>();
  private seenCombatFeedbackIds = new Set<string>();
  private treasureViews = new Map<string, Phaser.GameObjects.Image>();
  private transitionViews = new Map<string, Phaser.GameObjects.Image>();
  private remainsViews = new Map<string, Phaser.GameObjects.Image>();
  private bossView: RenderedEntity | null = null;
  private previousBossHp = 0;
  private audio!: AudioSystem;
  private atmosphereGraphics!: Phaser.GameObjects.Graphics;
  private glowGraphics!: Phaser.GameObjects.Graphics;
  private hoverGraphics!: Phaser.GameObjects.Graphics;
  private safeZoneGraphics!: Phaser.GameObjects.Graphics;
  private hpGraphics!: Phaser.GameObjects.Graphics;
  private pathGraphics!: Phaser.GameObjects.Graphics;
  private transitionGraphics!: Phaser.GameObjects.Graphics;
  private treasureGraphics!: Phaser.GameObjects.Graphics;
  private remainsGraphics!: Phaser.GameObjects.Graphics;
  private hoverLabel!: Phaser.GameObjects.Text;
  private tileViews = new Map<string, Phaser.GameObjects.Image>();
  private uiPublishTimerMs = 0;
  private tavernReportKey: string | null = null;

  constructor() {
    super('DungeonScene');
  }

  create(): void {
    this.audio = new AudioSystem(this);
    this.simulation.startNewGame();
    this.drawDungeon();
    this.atmosphereGraphics = this.add.graphics().setDepth(8);
    this.glowGraphics = this.add.graphics().setDepth(9);
    this.safeZoneGraphics = this.add.graphics().setDepth(18);
    this.hoverGraphics = this.add.graphics().setDepth(250);
    this.pathGraphics = this.add.graphics().setDepth(14);
    this.transitionGraphics = this.add.graphics().setDepth(20);
    this.treasureGraphics = this.add.graphics().setDepth(23);
    this.remainsGraphics = this.add.graphics().setDepth(22);
    this.hoverLabel = this.add
      .text(0, 0, '', {
        color: '#fff4d8',
        fontSize: '9px',
        fontFamily: 'monospace',
        backgroundColor: 'rgba(15, 13, 16, 0.88)',
        padding: { x: 5, y: 3 },
        wordWrap: { width: 190 },
      })
      .setDepth(260)
      .setVisible(false);
    this.hpGraphics = this.add.graphics().setDepth(70);
    this.createBossView();
    this.bindInput();
    this.syncAmbience();
    this.publishUi();
  }

  update(_time: number, delta: number): void {
    this.simulation.update(Math.min(delta, 80));
    this.syncRenderState();
    this.drawHealthBars();
    this.drawPaths();
    this.drawTransitions();
    this.drawTreasure();
    this.drawRemains();
    this.drawSafeZone();
    this.drawAtmosphere();
    this.syncAmbience();
    this.uiPublishTimerMs -= delta;

    if (this.uiPublishTimerMs <= 0) {
      this.publishUi();
      this.uiPublishTimerMs = 120;
    }
  }

  private bindInput(): void {
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.drawHover(pointer.x, pointer.y);
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const cell = worldToCell(pointer.x, pointer.y);

      if (!cell) {
        return;
      }

      const phase = this.simulation.getRenderState().phase;

      if (phase === 'wave') {
        this.simulation.inspectAdventurerAt(cell);
        this.audio.playRandomSound(AUDIO_KEYS.ui.select, { volume: 0.28, cooldownMs: 120 });
      } else {
        const tool = this.simulation.getRenderState().selectedConstructionTool;
        this.simulation.placeSelectedDefense(cell);
        this.playBuildInteractionSound(tool);
      }

      this.publishUi();
      this.syncRenderState();
    });

    this.unsubscribeActions = onUiAction((action) => {
      if (action.type === 'select-defense') {
        this.simulation.selectDefense(action.defenseType);
        this.audio.playRandomSound(AUDIO_KEYS.ui.select, { volume: 0.35 });
        this.publishUi();
      }

      if (action.type === 'select-construction') {
        this.simulation.selectConstructionTool(action.constructionType);
        this.audio.playRandomSound(AUDIO_KEYS.ui.select, { volume: 0.35 });
        this.publishUi();
      }

      if (action.type === 'select-map') {
        this.simulation.selectMap(action.mapId);
        this.audio.playRandomSound(AUDIO_KEYS.interaction.paper, { volume: 0.28, cooldownMs: 220 });
        this.publishUi();
        this.syncRenderState();
      }

      if (action.type === 'launch-wave') {
        this.simulation.launchWave();
        this.audio.playRandomSound(AUDIO_KEYS.ui.confirm, { volume: 0.5, cooldownMs: 240 });
        this.publishUi();
      }

      if (action.type === 'continue-build') {
        this.simulation.continueBuild();
        this.audio.playRandomSound(AUDIO_KEYS.ui.confirm, { volume: 0.42, cooldownMs: 240 });
        this.publishUi();
      }

      if (action.type === 'use-ability') {
        this.simulation.useBossAbility(action.abilityType);
        this.audio.playRandomSound(AUDIO_KEYS.boss.roar, { volume: 0.52, cooldownMs: 520, rate: 0.9 });
        this.publishUi();
      }

      if (action.type === 'toggle-pause') {
        this.simulation.togglePause();
        this.audio.playRandomSound(AUDIO_KEYS.ui.toggle, { volume: 0.32, cooldownMs: 140 });
        this.publishUi();
      }

      if (action.type === 'set-speed') {
        this.simulation.setGameSpeed(action.speed);
        this.audio.playRandomSound(AUDIO_KEYS.ui.click, { volume: 0.24, cooldownMs: 100 });
        this.publishUi();
      }

      if (action.type === 'toggle-audio-mute') {
        const muted = this.audio.toggleMute();

        if (!muted) {
          this.audio.playRandomSound(AUDIO_KEYS.ui.toggle, { volume: 0.34, cooldownMs: 0 });
        }
      }

      if (action.type === 'set-audio-volume') {
        this.audio.setMasterVolume(action.volume);
      }

      if (action.type === 'close-inspection') {
        this.simulation.clearInspection();
        this.audio.playRandomSound(AUDIO_KEYS.ui.click, { volume: 0.24 });
        this.publishUi();
      }

      if (action.type === 'restart') {
        this.audio.stopAmbience();
        this.scene.restart();
      }
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeActions?.();
      this.unsubscribeActions = null;
    });
  }

  private drawDungeon(): void {
    const grid = this.add.graphics();
    grid.fillStyle(0x181519, 1);
    grid.fillRect(0, 0, this.scale.width, this.scale.height);
    const renderState = this.simulation.getRenderState();

    for (let y = 0; y < GRID_ROWS; y += 1) {
      for (let x = 0; x < GRID_COLS; x += 1) {
        const cell = { x, y };
        const worldX = GRID_OFFSET_X + x * TILE_SIZE;
        const worldY = GRID_OFFSET_Y + y * TILE_SIZE;
        const tile = getTileAt(renderState.tiles, cell);

        const visual = tileVisual(tile, renderState.currentMapId, cell);
        const image = this.add
          .image(worldX, worldY, visual.texture)
          .setOrigin(0)
          .setDisplaySize(TILE_SIZE, TILE_SIZE)
          .setTint(visual.tint)
          .setAlpha(visual.alpha);
        this.tileViews.set(cellKey(cell), image);
      }
    }

    grid.lineStyle(2, 0x0f0d10, 0.95);
    grid.strokeRect(
      GRID_OFFSET_X - 1,
      GRID_OFFSET_Y - 1,
      GRID_COLS * TILE_SIZE + 2,
      GRID_ROWS * TILE_SIZE + 2,
    );

    this.add
      .text(GRID_OFFSET_X, GRID_OFFSET_Y - 30, 'ENTREE DES OPTIMISTES', {
        color: '#9f947e',
        fontSize: '12px',
        fontFamily: 'monospace',
      })
      .setAlpha(0.85);
  }

  private createBossView(): void {
    const world = cellToWorld(BOSS_CELL);
    const visual = ENTITY_VISUALS.boss;
    const sprite = this.add.sprite(0, -5, visual.texture).setDisplaySize(visual.displaySize, visual.displaySize);
    this.playAnimation(sprite, visual.idle);
    const label = this.add
      .text(0, 38, 'BOSS', {
        color: '#fff4d8',
        fontSize: '10px',
        fontStyle: 'bold',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);
    const container = this.add.container(world.x, world.y, [sprite, label]);
    container.setDepth(45);
    this.bossView = { container, sprite, label, currentAnimation: visual.idle };
  }

  private syncRenderState(): void {
    const renderState = this.simulation.getRenderState();
    this.syncDungeonTiles(renderState.tiles);
    const aliveDefenseIds = new Set(renderState.defenses.map((defense) => defense.id));
    const aliveAdventurerIds = new Set(renderState.adventurers.map((adventurer) => adventurer.id));

    renderState.defenses.forEach((defense) => this.syncDefense(defense));
    this.defenseViews.forEach((view, id) => {
      if (!aliveDefenseIds.has(id)) {
        this.spawnDeathPuff(view.container.x, view.container.y, 0x9fbd4d);
        this.audio.playRandomSound(AUDIO_KEYS.combat.death, { volume: 0.34, cooldownMs: 260, rate: 0.92 });
        view.container.destroy(true);
        this.defenseViews.delete(id);
        this.previousDefenseHp.delete(id);
      }
    });

    renderState.adventurers.forEach((adventurer) => this.syncAdventurer(adventurer));
    this.adventurerViews.forEach((view, id) => {
      if (!aliveAdventurerIds.has(id)) {
        this.spawnDeathPuff(view.container.x, view.container.y, 0xc88b4a);
        this.audio.playRandomSound(AUDIO_KEYS.combat.death, { volume: 0.38, cooldownMs: 260, rate: 0.82 });
        view.container.destroy(true);
        this.adventurerViews.delete(id);
        this.previousAdventurerHp.delete(id);
      }
    });
    this.layoutAdventurerBarks();

    const activeDoorIds = new Set(renderState.doors.map((door) => door.id));
    renderState.doors.forEach((door) => this.syncDoor(door));
    this.doorViews.forEach((view, id) => {
      if (!activeDoorIds.has(id)) {
        view.container.destroy(true);
        this.doorViews.delete(id);
        this.previousDoorHp.delete(id);
      }
    });

    if (this.bossView) {
      const bossWorld = gridPositionToWorld(renderState.boss.x, renderState.boss.y);
      const bossMoving = Phaser.Math.Distance.Between(this.bossView.container.x, this.bossView.container.y, bossWorld.x, bossWorld.y) > 0.5;
      this.bossView.container.setPosition(bossWorld.x, bossWorld.y);
      this.bossView.container.setAlpha(renderState.phase === 'defeat' ? 0.55 : 1);
      this.syncEntityAnimation(this.bossView, ENTITY_VISUALS.boss, bossMoving || renderState.boss.targetAdventurerId !== null);

      if (this.previousBossHp > 0 && renderState.boss.hp < this.previousBossHp) {
        this.pulseHit(this.bossView.container);
        this.cameras.main.shake(90, 0.0025);
      }

      this.previousBossHp = renderState.boss.hp;
    }

    this.syncCombatFeedback(renderState.combatFeedbackEvents);
    this.syncStateChangeFeedback(renderState);
    this.syncMovementAudio(renderState.adventurers);
  }

  private syncDungeonTiles(tiles: DungeonTile[]): void {
    const renderState = this.simulation.getRenderState();
    for (let y = 0; y < GRID_ROWS; y += 1) {
      for (let x = 0; x < GRID_COLS; x += 1) {
        const cell = { x, y };
        const key = cellKey(cell);
        const tileView = this.tileViews.get(key);
        const visual = tileVisual(getTileAt(tiles, cell), renderState.currentMapId, cell);

        if (tileView) {
          if (tileView.texture.key !== visual.texture) {
            tileView.setTexture(visual.texture).setDisplaySize(TILE_SIZE, TILE_SIZE);
          }

          tileView.setTint(visual.tint).setAlpha(visual.alpha);
        }
      }
    }
  }

  private syncDefense(defense: DefenseEntity): void {
    let view = this.defenseViews.get(defense.id);
    const definition = getDefenseDefinition(defense.type);
    const visual: EntityVisualProfile = ENTITY_VISUALS.defense[defense.type];
    const world = defense.kind === 'minion'
      ? gridPositionToWorld(defense.x, defense.y)
      : cellToWorld(defense.cell);
    const defenseSize = visual.displaySize;

    if (!view) {
      const sprite = this.add
        .sprite(0, visual.hover ? -4 : 0, visual.texture)
        .setDisplaySize(defenseSize, defenseSize);
      this.playAnimation(sprite, visual.idle);
      const labelText = defense.type === 'guardian'
        ? 'GARD'
        : defense.kind === 'minion'
          ? shortDisplayName(defense.name, definition.shortName)
          : definition.shortName;
      const label = this.add
        .text(0, 20, labelText, {
          color: '#fff4d8',
          fontSize: '9px',
          fontStyle: 'bold',
          fontFamily: 'monospace',
        })
        .setOrigin(0.5);
      const fxLabel = this.add
        .text(0, -25, '', {
          color: '#100e12',
          fontSize: '8px',
          fontStyle: 'bold',
          fontFamily: 'monospace',
          backgroundColor: 'rgba(246, 216, 138, 0.92)',
          padding: { x: 3, y: 1 },
        })
        .setOrigin(0.5)
        .setVisible(false);
      const container = this.add.container(world.x, world.y, [sprite, label, fxLabel]);
      view = { container, sprite, label, fxLabel, currentAnimation: visual.idle };
      this.defenseViews.set(defense.id, view);
    }

    const currentWorld = defense.kind === 'minion'
      ? gridPositionToWorld(defense.x, defense.y)
      : cellToWorld(defense.cell);
    const moving = defense.kind === 'minion'
      && Phaser.Math.Distance.Between(view.container.x, view.container.y, currentWorld.x, currentWorld.y) > 0.5;
    const previousHp = this.previousDefenseHp.get(defense.id);
    if (previousHp !== undefined && defense.hp < previousHp) {
      this.pulseHit(view.container);
    }

    this.previousDefenseHp.set(defense.id, defense.hp);
    view.container.setPosition(currentWorld.x, currentWorld.y);
    view.container.setAlpha(trapVisualAlpha(defense));
    view.sprite.setDisplaySize(defenseSize, defenseSize);
    this.syncEntityAnimation(view, visual, moving);
    view.label.setText(defense.type === 'guardian' ? 'GARD' : defense.kind === 'minion' ? shortDisplayName(defense.name, definition.shortName) : trapMapShortName(defense, definition.shortName));

    if (defense.kind === 'trap' && defense.trapState === 'disarmed') {
      view.sprite.setTint(0x8a8f96);
      view.fxLabel?.setText('DESARME').setVisible(true).setAlpha(0.84);
    } else if (defense.kind === 'trap' && defense.trapState === 'triggered') {
      view.sprite.setTint(0x9fb0c0);
      view.fxLabel?.setText('VERROU').setVisible(true).setAlpha(0.9);
    } else if (defense.kind === 'trap' && defense.trapState === 'cleared') {
      view.sprite.setTint(0x6f7f6f);
      view.fxLabel?.setText('OUVERT').setVisible(true).setAlpha(0.72);
    } else if (defense.abilityFxTimerMs > 0) {
      view.sprite.setTint(0xf6d88a);
      view.fxLabel?.setText(defenseFxText(defense)).setVisible(true).setAlpha(Math.min(1, defense.abilityFxTimerMs / 220));
    } else if (defense.slowedTimerMs > 0) {
      view.sprite.setTint(0x9fd6ff);
      view.fxLabel?.setText('RALENTI').setVisible(true).setAlpha(0.72);
    } else {
      view.sprite.clearTint();
      view.fxLabel?.setVisible(false);
    }
  }

  private syncAdventurer(adventurer: AdventurerEntity): void {
    let view = this.adventurerViews.get(adventurer.id);
    const definition = getAdventurerDefinition(adventurer.role);
    const visual: EntityVisualProfile = ENTITY_VISUALS.adventurer[adventurer.role];
    const world = gridPositionToWorld(adventurer.x, adventurer.y);

    if (!view) {
      const sprite = this.add.sprite(0, -3, visual.texture).setDisplaySize(visual.displaySize, visual.displaySize);
      this.playAnimation(sprite, visual.idle);
      const badge = this.add
        .text(0, -25, roleBadgeText(adventurer), {
          color: '#100e12',
          fontSize: '8px',
          fontStyle: 'bold',
          fontFamily: 'monospace',
          backgroundColor: roleBadgeColor(adventurer),
          padding: { x: 3, y: 1 },
        })
        .setOrigin(0.5);
      const fxLabel = this.add
        .text(0, -38, '', {
          color: '#100e12',
          fontSize: '8px',
          fontStyle: 'bold',
          fontFamily: 'monospace',
          backgroundColor: 'rgba(246, 216, 138, 0.94)',
          padding: { x: 3, y: 1 },
        })
        .setOrigin(0.5)
        .setVisible(false);
      const intentLabel = this.add
        .text(0, 36, '', {
          color: '#fff4d8',
          fontSize: '8px',
          fontStyle: 'bold',
          fontFamily: 'monospace',
          backgroundColor: 'rgba(15, 13, 16, 0.82)',
          padding: { x: 3, y: 1 },
        })
        .setOrigin(0.5)
        .setVisible(false);
      const label = this.add
        .text(0, 27, shortDisplayName(adventurer.name, definition.shortName), {
          color: '#fff4d8',
          fontSize: '8px',
          fontStyle: 'bold',
          fontFamily: 'monospace',
        })
        .setOrigin(0.5);
      const bark = this.add
        .text(0, -58, '', {
          color: '#fff4d8',
          fontSize: '9px',
          fontFamily: 'monospace',
          backgroundColor: 'rgba(15, 13, 16, 0.82)',
          padding: { x: 4, y: 2 },
          wordWrap: { width: 126 },
          align: 'center',
        })
        .setOrigin(0.5, 1)
        .setDepth(200)
        .setVisible(false);
      const container = this.add.container(world.x, world.y, [sprite, badge, fxLabel, label, intentLabel, bark]);
      container.setDepth(30);
      view = { container, sprite, label, badge, fxLabel, intentLabel, bark, currentAnimation: visual.idle };
      this.adventurerViews.set(adventurer.id, view);
    }

    const moving = Phaser.Math.Distance.Between(view.container.x, view.container.y, world.x, world.y) > 0.45;
    const previousHp = this.previousAdventurerHp.get(adventurer.id);
    if (previousHp !== undefined && adventurer.hp < previousHp) {
      this.pulseHit(view.container);
      this.cameras.main.shake(60, 0.0017);
    }

    this.previousAdventurerHp.set(adventurer.id, adventurer.hp);
    view.container.setPosition(world.x, world.y);
    view.container.setAlpha(adventurer.stunnedTimerMs > 0 ? 0.55 : 1);
    view.badge?.setText(roleBadgeText(adventurer)).setBackgroundColor(roleBadgeColor(adventurer));
    const adventurerSize = visual.displaySize + (adventurer.carryingTreasure ? 3 : 0);
    view.sprite.setDisplaySize(adventurerSize, adventurerSize);
    this.syncEntityAnimation(view, visual, moving);

    if (adventurer.lootFeedbackText && adventurer.lootFeedbackTimerMs > 0) {
      view.sprite.setTint(0xf6d88a);
      view.fxLabel?.setText(adventurer.lootFeedbackText).setVisible(true).setAlpha(Math.min(1, adventurer.lootFeedbackTimerMs / 420));
    } else if (adventurer.abilityFxTimerMs > 0) {
      view.sprite.setTint(0xf6d88a);
      view.fxLabel?.setText(adventurerFxText(adventurer)).setVisible(true).setAlpha(Math.min(1, adventurer.abilityFxTimerMs / 220));
    } else if (adventurer.damageReductionTimerMs > 0) {
      view.sprite.setTint(0xffd37a);
      view.fxLabel?.setText('PROTEGE').setVisible(true).setAlpha(0.82);
    } else if (adventurer.slowedTimerMs > 0) {
      view.sprite.setTint(0x9fd6ff);
      view.fxLabel?.setText('RALENTI').setVisible(true).setAlpha(0.72);
    } else if (adventurer.fearTimerMs > 0) {
      view.sprite.setTint(0x9fb7e8);
      view.fxLabel?.setText('FUITE').setVisible(true).setAlpha(0.78);
    } else {
      view.sprite.clearTint();
      view.fxLabel?.setVisible(false);
    }

    const intent = retreatIntentText(adventurer);
    view.intentLabel?.setText(intent).setVisible(intent.length > 0);

    if (view.bark) {
      view.bark.setText(adventurer.barkText ?? '');
      view.bark.setVisible(Boolean(adventurer.barkText && adventurer.barkTimerMs > 0));
      view.bark.setAlpha(Math.min(1, adventurer.barkTimerMs / 450));
    }
  }

  private layoutAdventurerBarks(): void {
    const placed: Array<{ left: number; right: number; top: number; bottom: number }> = [];
    const candidates = [...this.adventurerViews.values()]
      .filter((view) => view.bark?.visible && view.bark.text.length > 0)
      .sort((a, b) => a.container.y - b.container.y || a.container.x - b.container.x);
    const offsets = [-46, -64, -82, -28];

    candidates.forEach((view) => {
      const bark = view.bark;

      if (!bark) {
        return;
      }

      const width = Math.min(126, Math.max(54, bark.text.length * 5.2 + 12));
      const height = bark.text.length > 34 ? 38 : 24;
      const placement = offsets
        .map((offset) => ({
          offset,
          rect: {
            left: view.container.x - width / 2,
            right: view.container.x + width / 2,
            top: view.container.y + offset - height,
            bottom: view.container.y + offset,
          },
        }))
        .find((candidate) => candidate.rect.top >= 8 && !placed.some((rect) => rectanglesOverlap(rect, candidate.rect)));

      if (!placement) {
        bark.setVisible(false);
        return;
      }

      bark.setY(placement.offset).setVisible(true);
      placed.push(placement.rect);
    });
  }

  private syncDoor(door: DungeonDoor): void {
    let view = this.doorViews.get(door.id);
    const world = cellToWorld(door.cell);

    if (!view) {
      const sprite = this.add.image(0, 0, TEXTURE_KEYS.door).setDisplaySize(TILE_SIZE - 6, TILE_SIZE - 6);
      const label = this.add
        .text(0, 0, 'P', {
          color: '#fff4d8',
          fontSize: '11px',
          fontStyle: 'bold',
          fontFamily: 'monospace',
        })
        .setOrigin(0.5);
      const container = this.add.container(world.x, world.y, [sprite, label]);
      view = { container, sprite, label };
      this.doorViews.set(door.id, view);
    }

    const previousHp = this.previousDoorHp.get(door.id);

    if (previousHp !== undefined && door.pickProgressMs > previousHp) {
      this.pulseHit(view.container);
      this.audio.playRandomSound(AUDIO_KEYS.doors.pick, { volume: 0.16, cooldownMs: 420 });
    }

    this.previousDoorHp.set(door.id, door.pickProgressMs);
    view.container.setPosition(world.x, world.y);
    const picking = door.beingPickedById !== null && !door.openedForExpedition;
    view.sprite.setTexture(door.openedForExpedition ? TEXTURE_KEYS.doorOpen : TEXTURE_KEYS.door).setDisplaySize(TILE_SIZE - 3, TILE_SIZE - 3);
    if (picking) {
      view.sprite.setTint(0xe1b35a);
    } else if (door.openedForExpedition) {
      view.sprite.setTint(0x79c7a1);
    } else {
      view.sprite.clearTint();
    }
    view.label.setText(door.openedForExpedition ? 'O' : picking ? '...' : 'L');
    view.container.setAlpha(door.openedForExpedition ? 0.58 : 1);
  }

  private pulseHit(container: Phaser.GameObjects.Container): void {
    this.tweens.add({
      targets: container,
      scaleX: 1.18,
      scaleY: 1.18,
      duration: 70,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  private syncEntityAnimation(view: RenderedEntity, visual: EntityVisualProfile, moving: boolean): void {
    const actionActive = (view.actionUntilMs ?? 0) > this.time.now;
    const key = actionActive ? visual.action : moving ? visual.walk : visual.idle;
    this.playAnimation(view.sprite, key, view);

    const pulse = this.time.now / (moving ? 85 : 240);
    const baseY = visual.hover ? -4 : view.sprite.displayHeight > 44 ? -5 : -3;
    const bob = moving ? Math.sin(pulse) * 1.8 : Math.sin(pulse) * 0.65;
    view.sprite.setY(baseY + bob);
    view.sprite.setAngle(moving ? Math.sin(pulse * 0.7) * 1.8 : 0);
  }

  private playEntityAction(view: RenderedEntity, visual: EntityVisualProfile, durationMs = 420): void {
    view.actionUntilMs = Math.max(view.actionUntilMs ?? 0, this.time.now + durationMs);
    this.playAnimation(view.sprite, visual.action, view);
  }

  private playAnimation(sprite: Phaser.GameObjects.Sprite, key: string, view?: RenderedEntity): void {
    if (!this.anims.exists(key)) {
      return;
    }

    if (view?.currentAnimation === key && sprite.anims.isPlaying) {
      return;
    }

    sprite.play(key, true);

    if (view) {
      view.currentAnimation = key;
    }
  }

  private spawnDeathPuff(x: number, y: number, color: number): void {
    for (let i = 0; i < 5; i += 1) {
      const particle = this.add.circle(x, y, 3, color, 0.72);
      this.tweens.add({
        targets: particle,
        x: x + Math.cos(i * 1.26) * 18,
        y: y + Math.sin(i * 1.26) * 18,
        alpha: 0,
        scale: 0.35,
        duration: 280,
        onComplete: () => particle.destroy(),
      });
    }
  }

  private syncCombatFeedback(events: CombatFeedbackEvent[]): void {
    const stackByCell = new Map<string, number>();

    events.forEach((event) => {
      if (this.seenCombatFeedbackIds.has(event.id)) {
        return;
      }

      this.seenCombatFeedbackIds.add(event.id);
      const world = gridPositionToWorld(event.x, event.y);
      const key = `${Math.round(world.x / 12)},${Math.round(world.y / 12)}`;
      const stack = stackByCell.get(key) ?? 0;
      stackByCell.set(key, stack + 1);
      const style = combatFeedbackVisual(event);
      const sign = event.kind === 'heal' ? '+' : '-';
      const label = event.kind === 'heal'
        ? `${sign}${event.amount}`
        : `${style.prefix} ${sign}${event.amount}${event.boostedBySpecial ? '*' : ''}`;
      this.playCombatSourceAnimation(event);
      this.spawnCombatVfx(event, world.x, world.y, style.color);
      this.playCombatFeedbackSound(event);
      this.spawnFloatingText(
        world.x + (stack % 2 === 0 ? -5 : 5),
        world.y - 30 - stack * 9,
        label,
        style.color,
        style.fontSize,
      );
    });

    if (this.seenCombatFeedbackIds.size > 160) {
      this.seenCombatFeedbackIds = new Set([...this.seenCombatFeedbackIds].slice(-96));
    }
  }

  private playCombatSourceAnimation(event: CombatFeedbackEvent): void {
    if (event.sourceFaction === 'boss' && this.bossView) {
      this.playEntityAction(this.bossView, ENTITY_VISUALS.boss, 620);
      this.cameras.main.shake(110, 0.0028);
      return;
    }

    if (event.sourceFaction === 'adventurer' && event.sourceId && event.sourceRole) {
      const view = this.adventurerViews.get(event.sourceId);

      if (view) {
        this.playEntityAction(view, ENTITY_VISUALS.adventurer[event.sourceRole], event.kind === 'heal' ? 520 : 420);
      }

      return;
    }

    if (event.sourceFaction === 'monster' && event.sourceId && event.sourceType && event.sourceType !== 'trap' && event.sourceType !== 'boss') {
      const view = this.defenseViews.get(event.sourceId);

      if (view) {
        this.playEntityAction(view, ENTITY_VISUALS.defense[event.sourceType], event.sourceType === 'guardian' ? 560 : 420);
      }
    }
  }

  private spawnFloatingText(x: number, y: number, text: string, color: number, fontSize = 11): void {
    const label = this.add
      .text(x, y, text, {
        color: `#${color.toString(16).padStart(6, '0')}`,
        fontSize: `${fontSize}px`,
        fontStyle: 'bold',
        fontFamily: 'monospace',
        stroke: '#100e12',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(260);

    this.tweens.add({
      targets: label,
      y: y - 18,
      alpha: 0,
      duration: 620,
      ease: 'Sine.easeOut',
      onComplete: () => label.destroy(),
    });
  }

  private syncStateChangeFeedback(renderState: ReturnType<DungeonSimulation['getRenderState']>): void {
    renderState.doors.forEach((door) => {
      const state = door.openedForExpedition ? 'opened' : door.beingPickedById ? 'picking' : 'closed';
      const previous = this.previousDoorState.get(door.id);
      const world = cellToWorld(door.cell);

      if (previous && previous !== state) {
        if (state === 'picking') {
          this.audio.playRandomSound(AUDIO_KEYS.doors.pick, { volume: 0.22, cooldownMs: 320 });
          this.spawnLockpickVfx(world.x, world.y);
        } else if (state === 'opened') {
          this.audio.playRandomSound(AUDIO_KEYS.doors.open, { volume: 0.46, cooldownMs: 260 });
          this.spawnDoorVfx(world.x, world.y, 0x79c7a1);
        } else if (previous === 'opened') {
          this.audio.playRandomSound(AUDIO_KEYS.doors.close, { volume: 0.38, cooldownMs: 260 });
        }
      }

      this.previousDoorState.set(door.id, state);
    });

    renderState.defenses
      .filter((defense) => defense.kind === 'trap')
      .forEach((trap) => {
        const state = `${trap.trapState ?? 'none'}:${trap.cooldownRemainingMs > 0 ? 'cooldown' : 'ready'}`;
        const previous = this.previousTrapState.get(trap.id);
        const world = cellToWorld(trap.cell);

        if (previous && previous !== state) {
          if (trap.type === 'roomLockTrap' && trap.trapState === 'triggered') {
            this.audio.playRandomSound(AUDIO_KEYS.traps.roomLock, { volume: 0.5, cooldownMs: 520 });
            this.spawnRoomLockVfx(world.x, world.y);
            this.cameras.main.shake(90, 0.002);
          } else if (trap.type === 'roomLockTrap' && trap.trapState === 'cleared') {
            this.audio.playRandomSound(AUDIO_KEYS.doors.open, { volume: 0.35, cooldownMs: 360 });
            this.spawnDoorVfx(world.x, world.y, 0x9fb0c0);
          } else if (state.endsWith('cooldown') && previous.endsWith('ready')) {
            this.audio.playRandomSound(AUDIO_KEYS.traps.trigger, { volume: 0.46, cooldownMs: 260 });
            this.spawnTrapBurst(world.x, world.y, trap.type === 'fireTrap' ? 0xd85a32 : 0xe1b35a);
          } else if (trap.trapState === 'disarmed') {
            this.audio.playRandomSound(AUDIO_KEYS.traps.disarm, { volume: 0.32, cooldownMs: 280 });
            this.spawnDisarmVfx(world.x, world.y);
          }
        }

        this.previousTrapState.set(trap.id, state);
      });

    renderState.treasures.forEach((treasure) => {
      const state = `${treasure.status}:${treasure.holderAdventurerId ?? ''}:${treasure.droppedCell ? cellKey(treasure.droppedCell) : ''}`;
      const previous = this.previousTreasureState.get(treasure.id);

      if (previous && previous !== state) {
        const point = this.treasureWorldPosition(treasure, renderState.adventurers);

        if (treasure.status === 'carried') {
          this.audio.playRandomSound(treasure.kind === 'gold' || treasure.kind === 'main' ? AUDIO_KEYS.loot.coins : AUDIO_KEYS.loot.special, {
            volume: treasure.kind === 'main' ? 0.48 : 0.38,
            cooldownMs: 260,
          });
          this.spawnLootVfx(point.x, point.y, treasureFillColor(treasure.kind));
        } else if (treasure.status === 'dropped') {
          this.audio.playRandomSound(AUDIO_KEYS.interaction.stone, { volume: 0.22, cooldownMs: 280 });
          this.spawnImpactBurst(point.x, point.y, 0xd6b15f, 14);
        }
      }

      this.previousTreasureState.set(treasure.id, state);
    });

    renderState.remains.forEach((remains) => {
      const previousClaimed = this.previousRemainsLootState.get(remains.id);

      if (previousClaimed === false && remains.loot.claimed) {
        const world = cellToWorld(remains.cell);
        this.audio.playRandomSound(AUDIO_KEYS.loot.coins, { volume: 0.3, cooldownMs: 260 });
        this.spawnLootVfx(world.x, world.y, 0xd6b15f);
      }

      this.previousRemainsLootState.set(remains.id, remains.loot.claimed);
    });
  }

  private syncMovementAudio(adventurers: AdventurerEntity[]): void {
    if (this.simulation.getRenderState().phase !== 'wave') {
      return;
    }

    adventurers.forEach((adventurer) => {
      const current = `${adventurer.mapId}:${Math.round(adventurer.x)},${Math.round(adventurer.y)}`;
      const previous = this.previousAdventurerCell.get(adventurer.id);

      if (previous && previous !== current) {
        this.audio.playRandomSound(AUDIO_KEYS.footsteps, {
          volume: adventurer.carryingTreasure ? 0.16 : 0.11,
          cooldownMs: 180,
          skipRecent: true,
        });
      }

      this.previousAdventurerCell.set(adventurer.id, current);
    });
  }

  private playBuildInteractionSound(tool: ConstructionTool | null): void {
    switch (tool) {
      case 'dig':
      case 'reseal':
        this.audio.playRandomSound(AUDIO_KEYS.construction.dig, { volume: 0.36, cooldownMs: 180 });
        return;
      case 'door':
      case 'removeDoor':
        this.audio.playRandomSound(AUDIO_KEYS.doors.lock, { volume: 0.28, cooldownMs: 160 });
        return;
      case 'moveTreasure':
      case 'addGoldTreasure':
      case 'addWeaponTreasure':
      case 'addArmorTreasure':
      case 'addTechniqueTreasure':
      case 'removeTreasure':
        this.audio.playRandomSound(AUDIO_KEYS.loot.coins, { volume: 0.3, cooldownMs: 180 });
        return;
      case 'collectRemainsLoot':
        this.audio.playRandomSound(AUDIO_KEYS.interaction.paper, { volume: 0.24, cooldownMs: 220 });
        return;
      case 'guardRoom':
      case 'crypt':
      case 'moveBoss':
        this.audio.playRandomSound(AUDIO_KEYS.interaction.stone, { volume: 0.24, cooldownMs: 180 });
        return;
      default:
        this.audio.playRandomSound(AUDIO_KEYS.ui.click, { volume: 0.22, cooldownMs: 120 });
    }
  }

  private syncAmbience(): void {
    const renderState = this.simulation.getRenderState();

    if (renderState.phase === 'report' || renderState.phase === 'defeat') {
      this.audio.stopAmbience();
      return;
    }

    if (renderState.phase === 'wave' && this.isBossFightActive(renderState)) {
      this.audio.crossfadeAmbience(AUDIO_KEYS.ambience.boss, { volume: 0.5, rate: 0.98, fadeMs: 900 });
      return;
    }

    if (renderState.phase === 'wave' && this.isGuardianFightActive(renderState)) {
      this.audio.crossfadeAmbience(AUDIO_KEYS.ambience.guardian, { volume: 0.42, rate: 0.96, fadeMs: 700 });
      return;
    }

    const deep = renderState.currentMapId === FINAL_MAP_ID;
    this.audio.crossfadeAmbience(deep ? AUDIO_KEYS.ambience.deep : AUDIO_KEYS.ambience.dungeon, {
      volume: deep ? 0.9 : 0.72,
      rate: deep ? 0.94 : 1,
      fadeMs: 900,
    });
  }

  private isBossFightActive(renderState: ReturnType<DungeonSimulation['getRenderState']>): boolean {
    if (renderState.boss.mapId !== renderState.currentMapId) {
      return false;
    }

    if (renderState.boss.targetAdventurerId || renderState.boss.hp < renderState.boss.maxHp) {
      return true;
    }

    return renderState.adventurers.some((adventurer) => {
      if (adventurer.mapId !== renderState.boss.mapId) {
        return false;
      }

      return Math.abs(adventurer.x - renderState.boss.x) + Math.abs(adventurer.y - renderState.boss.y) <= 4;
    });
  }

  private isGuardianFightActive(renderState: ReturnType<DungeonSimulation['getRenderState']>): boolean {
    const guardian = renderState.defenses.find((defense) => defense.alive && defense.type === 'guardian' && defense.mapId === renderState.currentMapId);

    if (!guardian) {
      return false;
    }

    if (guardian.hp < guardian.maxHp) {
      return true;
    }

    return renderState.adventurers.some((adventurer) => {
      if (adventurer.mapId !== guardian.mapId) {
        return false;
      }

      return Math.abs(adventurer.x - guardian.cell.x) + Math.abs(adventurer.y - guardian.cell.y) <= 3;
    });
  }

  private drawAtmosphere(): void {
    const renderState = this.simulation.getRenderState();
    const deep = renderState.currentMapId === FINAL_MAP_ID;
    const alpha = deep ? 0.22 : 0.15;

    this.atmosphereGraphics.clear();
    this.glowGraphics.clear();
    this.atmosphereGraphics.fillStyle(0x060509, alpha);
    this.atmosphereGraphics.fillRect(GRID_OFFSET_X, GRID_OFFSET_Y, GRID_COLS * TILE_SIZE, GRID_ROWS * TILE_SIZE);
    this.atmosphereGraphics.fillStyle(0x020103, deep ? 0.42 : 0.32);
    this.atmosphereGraphics.fillRect(GRID_OFFSET_X, GRID_OFFSET_Y, GRID_COLS * TILE_SIZE, 22);
    this.atmosphereGraphics.fillRect(GRID_OFFSET_X, GRID_OFFSET_Y + GRID_ROWS * TILE_SIZE - 22, GRID_COLS * TILE_SIZE, 22);
    this.atmosphereGraphics.fillRect(GRID_OFFSET_X, GRID_OFFSET_Y, 22, GRID_ROWS * TILE_SIZE);
    this.atmosphereGraphics.fillRect(GRID_OFFSET_X + GRID_COLS * TILE_SIZE - 22, GRID_OFFSET_Y, 22, GRID_ROWS * TILE_SIZE);

    const entry = cellToWorld(ENTRY_CELL);
    this.drawGlow(entry.x, entry.y, 0xe1b35a, 38, 0.08);

    renderState.doors.forEach((door) => {
      if (!door.openedForExpedition) {
        const world = cellToWorld(door.cell);
        this.drawGlow(world.x, world.y, 0x6f7f91, 28, 0.055);
      }
    });

    renderState.treasures.forEach((treasure) => {
      if (treasure.status === 'stolen') {
        return;
      }

      const point = this.treasureWorldPosition(treasure, renderState.adventurers);
      this.drawGlow(point.x, point.y, treasureFillColor(treasure.kind), treasure.kind === 'main' ? 42 : 28, 0.07);
    });

    if (renderState.currentMapId === renderState.boss.mapId) {
      const boss = gridPositionToWorld(renderState.boss.x, renderState.boss.y);
      this.drawGlow(boss.x, boss.y, 0x8f2631, 58, deep ? 0.1 : 0.06);
    }
  }

  private drawGlow(x: number, y: number, color: number, radius: number, alpha: number): void {
    this.glowGraphics.fillStyle(color, alpha);
    this.glowGraphics.fillCircle(x, y, radius);
  }

  private spawnCombatVfx(event: CombatFeedbackEvent, x: number, y: number, color: number): void {
    if (event.kind === 'heal') {
      this.spawnHealPulse(x, y);
      return;
    }

    const source = this.findSourceWorld(event);

    if (event.style === 'caster' || event.sourceRole === 'mage') {
      this.spawnProjectile(source, { x, y }, 0xb873d6, 4);
      return;
    }

    if (event.style === 'healer') {
      this.spawnHealPulse(x, y);
      return;
    }

    if (event.style === 'boss') {
      this.spawnBossShockwave(x, y);
      return;
    }

    if (event.style === 'guardian') {
      this.spawnImpactBurst(x, y, 0xff9a7a, 22);
      this.spawnSlash(x, y, 0xffc0a0, 1.2);
      return;
    }

    if (event.style === 'trap') {
      this.spawnTrapBurst(x, y, 0xd85a32);
      return;
    }

    if (event.style === 'rogue' && source) {
      this.spawnProjectile(source, { x, y }, 0x7d94d6, 3);
      return;
    }

    this.spawnSlash(x, y, color, event.style === 'tank' ? 1.1 : 0.9);
    this.spawnImpactBurst(x, y, color, 14);
  }

  private playCombatFeedbackSound(event: CombatFeedbackEvent): void {
    if (event.kind === 'heal') {
      this.audio.playRandomSound(AUDIO_KEYS.magic.heal, { volume: 0.34, cooldownMs: 280, rate: 1.08 });
      return;
    }

    if (event.style === 'boss') {
      this.audio.playRandomSound(AUDIO_KEYS.boss.attack, { volume: 0.58, cooldownMs: 420, rate: 0.86 });
      this.audio.playRandomSound(AUDIO_KEYS.combat.armor, { volume: 0.42, cooldownMs: 180 });
      return;
    }

    if (event.style === 'guardian') {
      this.audio.playRandomSound(AUDIO_KEYS.combat.armor, { volume: 0.46, cooldownMs: 220, rate: 0.92 });
      return;
    }

    if (event.style === 'trap') {
      this.audio.playRandomSound(AUDIO_KEYS.traps.trigger, { volume: 0.44, cooldownMs: 240 });
      return;
    }

    if (event.style === 'caster' || event.sourceRole === 'mage') {
      this.audio.playRandomSound(AUDIO_KEYS.magic.cast, { volume: 0.36, cooldownMs: 240 });
      return;
    }

    if (event.sourceType === 'slime') {
      this.audio.playRandomSound(AUDIO_KEYS.combat.slime, { volume: 0.34, cooldownMs: 260 });
      return;
    }

    if (event.sourceFaction === 'monster') {
      this.audio.playRandomSound(AUDIO_KEYS.combat.hit, { volume: 0.38, cooldownMs: 150, rate: 0.92 });
      return;
    }

    this.audio.playRandomSound(AUDIO_KEYS.combat.melee, { volume: 0.34, cooldownMs: 120 });
  }

  private spawnProjectile(source: { x: number; y: number } | null, target: { x: number; y: number }, color: number, radius: number): void {
    if (!source || Phaser.Math.Distance.Between(source.x, source.y, target.x, target.y) < 18) {
      this.spawnImpactBurst(target.x, target.y, color, 14);
      return;
    }

    const projectile = this.add.circle(source.x, source.y, radius, color, 0.95).setDepth(120);
    this.tweens.add({
      targets: projectile,
      x: target.x,
      y: target.y,
      alpha: 0.3,
      duration: 140,
      ease: 'Quad.easeOut',
      onComplete: () => {
        projectile.destroy();
        this.spawnImpactBurst(target.x, target.y, color, 14);
      },
    });
  }

  private spawnSlash(x: number, y: number, color: number, scale: number): void {
    const slash = this.add.graphics().setDepth(130);
    slash.lineStyle(Math.max(2, 3 * scale), color, 0.95);
    slash.beginPath();
    slash.arc(0, 0, 16 * scale, Phaser.Math.DegToRad(210), Phaser.Math.DegToRad(330), false);
    slash.strokePath();
    slash.setPosition(x, y);
    slash.setRotation(Phaser.Math.FloatBetween(-0.55, 0.55));
    this.tweens.add({
      targets: slash,
      alpha: 0,
      scaleX: 1.45,
      scaleY: 1.45,
      duration: 180,
      ease: 'Sine.easeOut',
      onComplete: () => slash.destroy(),
    });
  }

  private spawnImpactBurst(x: number, y: number, color: number, radius: number): void {
    const ring = this.add.graphics().setDepth(125);
    ring.lineStyle(2, color, 0.82);
    ring.strokeCircle(0, 0, radius);
    ring.setPosition(x, y);
    this.tweens.add({
      targets: ring,
      alpha: 0,
      scaleX: 1.7,
      scaleY: 1.7,
      duration: 240,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    });

    for (let i = 0; i < 4; i += 1) {
      const particle = this.add.circle(x, y, 2, color, 0.72).setDepth(126);
      this.tweens.add({
        targets: particle,
        x: x + Math.cos(i * Math.PI / 2 + 0.4) * (radius + 7),
        y: y + Math.sin(i * Math.PI / 2 + 0.4) * (radius + 7),
        alpha: 0,
        duration: 220,
        onComplete: () => particle.destroy(),
      });
    }
  }

  private spawnHealPulse(x: number, y: number): void {
    const pulse = this.add.graphics().setDepth(126);
    pulse.lineStyle(2, 0x9ee29f, 0.9);
    pulse.strokeCircle(0, 0, 12);
    pulse.lineStyle(1, 0xe5ffe1, 0.75);
    pulse.lineBetween(-8, 0, 8, 0);
    pulse.lineBetween(0, -8, 0, 8);
    pulse.setPosition(x, y);
    this.tweens.add({
      targets: pulse,
      alpha: 0,
      scaleX: 1.8,
      scaleY: 1.8,
      duration: 360,
      ease: 'Sine.easeOut',
      onComplete: () => pulse.destroy(),
    });
  }

  private spawnTrapBurst(x: number, y: number, color: number): void {
    const burst = this.add.graphics().setDepth(128);
    burst.fillStyle(color, 0.22);
    burst.fillCircle(0, 0, 18);
    burst.lineStyle(2, color, 0.85);
    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI * 2 * i) / 8;
      burst.lineBetween(Math.cos(angle) * 6, Math.sin(angle) * 6, Math.cos(angle) * 22, Math.sin(angle) * 22);
    }
    burst.setPosition(x, y);
    this.tweens.add({
      targets: burst,
      alpha: 0,
      scaleX: 1.35,
      scaleY: 1.35,
      duration: 260,
      ease: 'Quad.easeOut',
      onComplete: () => burst.destroy(),
    });
  }

  private spawnBossShockwave(x: number, y: number): void {
    this.spawnImpactBurst(x, y, 0xff6b6b, 28);
    this.cameras.main.shake(110, 0.0028);
    this.audio.playRandomSound(AUDIO_KEYS.boss.roar, { volume: 0.32, cooldownMs: 900, rate: 0.88 });
  }

  private spawnRoomLockVfx(x: number, y: number): void {
    const ring = this.add.graphics().setDepth(132);
    ring.lineStyle(3, 0x6f7f91, 0.95);
    ring.strokeCircle(0, 0, 10);
    ring.lineStyle(2, 0x15191f, 0.95);
    ring.strokeCircle(0, 0, 22);
    ring.setPosition(x, y);
    this.tweens.add({
      targets: ring,
      alpha: 0,
      scaleX: 2.1,
      scaleY: 2.1,
      duration: 420,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  private spawnDoorVfx(x: number, y: number, color: number): void {
    const flash = this.add.graphics().setDepth(124);
    flash.lineStyle(2, color, 0.85);
    flash.strokeRoundedRect(-15, -18, 30, 36, 4);
    flash.setPosition(x, y);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 1.25,
      duration: 260,
      ease: 'Sine.easeOut',
      onComplete: () => flash.destroy(),
    });
  }

  private spawnLockpickVfx(x: number, y: number): void {
    const tick = this.add.graphics().setDepth(124);
    tick.lineStyle(2, 0xe1b35a, 0.9);
    tick.lineBetween(-9, -4, 2, 5);
    tick.lineBetween(2, 5, 11, -7);
    tick.setPosition(x, y - 12);
    this.tweens.add({
      targets: tick,
      y: y - 20,
      alpha: 0,
      duration: 300,
      ease: 'Sine.easeOut',
      onComplete: () => tick.destroy(),
    });
  }

  private spawnDisarmVfx(x: number, y: number): void {
    const mark = this.add.graphics().setDepth(124);
    mark.lineStyle(2, 0x9fb0c0, 0.9);
    mark.lineBetween(-10, -10, 10, 10);
    mark.lineBetween(10, -10, -10, 10);
    mark.setPosition(x, y);
    this.tweens.add({
      targets: mark,
      alpha: 0,
      scaleX: 1.4,
      scaleY: 1.4,
      duration: 300,
      onComplete: () => mark.destroy(),
    });
  }

  private spawnLootVfx(x: number, y: number, color: number): void {
    this.spawnImpactBurst(x, y, color, 12);
    const sparkle = this.add.graphics().setDepth(130);
    sparkle.fillStyle(color, 0.95);
    sparkle.fillCircle(0, 0, 3);
    sparkle.fillCircle(-8, 6, 2);
    sparkle.fillCircle(9, -4, 2);
    sparkle.setPosition(x, y);
    this.tweens.add({
      targets: sparkle,
      y: y - 18,
      alpha: 0,
      duration: 480,
      ease: 'Sine.easeOut',
      onComplete: () => sparkle.destroy(),
    });
  }

  private findSourceWorld(event: CombatFeedbackEvent): { x: number; y: number } | null {
    if (!event.sourceId) {
      return event.sourceType === 'boss' && this.bossView
        ? { x: this.bossView.container.x, y: this.bossView.container.y }
        : null;
    }

    const adventurer = this.adventurerViews.get(event.sourceId);
    if (adventurer) {
      return { x: adventurer.container.x, y: adventurer.container.y };
    }

    const defense = this.defenseViews.get(event.sourceId);
    if (defense) {
      return { x: defense.container.x, y: defense.container.y };
    }

    return event.sourceType === 'boss' && this.bossView
      ? { x: this.bossView.container.x, y: this.bossView.container.y }
      : null;
  }

  private treasureWorldPosition(
    treasure: { status: string; holderAdventurerId: string | null; droppedCell: { x: number; y: number } | null; cell: { x: number; y: number } },
    adventurers: AdventurerEntity[],
  ): { x: number; y: number } {
    if (treasure.status === 'carried' && treasure.holderAdventurerId) {
      const carrier = adventurers.find((adventurer) => adventurer.id === treasure.holderAdventurerId);

      if (carrier) {
        const world = gridPositionToWorld(carrier.x, carrier.y);
        return { x: world.x + 12, y: world.y - 12 };
      }
    }

    const cell = treasure.status === 'dropped' && treasure.droppedCell ? treasure.droppedCell : treasure.cell;
    return cellToWorld(cell);
  }

  private drawHealthBars(): void {
    const renderState = this.simulation.getRenderState();
    this.hpGraphics.clear();

    renderState.defenses
      .filter((defense) => defense.kind === 'minion')
      .forEach((defense) => {
        const world = gridPositionToWorld(defense.x, defense.y);
        this.drawBar(world.x - 16, world.y - 24, 32, defense.hp / defense.maxHp, 0x6dbb5d);
      });

    renderState.adventurers.forEach((adventurer) => {
      const world = gridPositionToWorld(adventurer.x, adventurer.y);
      this.drawBar(world.x - 14, world.y - 24, 28, adventurer.hp / adventurer.maxHp, 0xc88b4a);
    });

    renderState.doors
      .filter((door) => !door.destroyed && !door.openedForExpedition && door.beingPickedById !== null)
      .forEach((door) => {
        const world = cellToWorld(door.cell);
        this.drawBar(world.x - 12, world.y - 20, 24, door.pickProgressMs / door.pickRequiredMs, 0xe1b35a);
      });

    const bossWorld = gridPositionToWorld(renderState.boss.x, renderState.boss.y);
    this.drawBar(bossWorld.x - 22, bossWorld.y - 32, 44, renderState.boss.hp / renderState.boss.maxHp, 0x8f2631);
  }

  private drawBar(x: number, y: number, width: number, ratio: number, color: number): void {
    this.hpGraphics.fillStyle(0x0f0d10, 0.9);
    this.hpGraphics.fillRect(x, y, width, 4);
    this.hpGraphics.fillStyle(color, 1);
    this.hpGraphics.fillRect(x, y, Math.max(0, width * Phaser.Math.Clamp(ratio, 0, 1)), 4);
  }

  private drawPaths(): void {
    const renderState = this.simulation.getRenderState();
    this.pathGraphics.clear();

    if (renderState.phase !== 'wave') {
      return;
    }

    this.pathGraphics.lineStyle(2, 0xe1b35a, 0.22);

    renderState.adventurers.forEach((adventurer) => {
      if (adventurer.path.length === 0) {
        return;
      }

      const start = gridPositionToWorld(adventurer.x, adventurer.y);
      this.pathGraphics.beginPath();
      this.pathGraphics.moveTo(start.x, start.y);
      adventurer.path.slice(0, 5).forEach((cell) => {
        const world = cellToWorld(cell);
        this.pathGraphics.lineTo(world.x, world.y);
      });
      this.pathGraphics.strokePath();
    });
  }

  private drawTreasure(): void {
    const renderState = this.simulation.getRenderState();
    const visibleIds = new Set<string>();
    this.treasureGraphics.clear();

    renderState.treasures.forEach((treasure) => {
      if (treasure.status === 'stolen') {
        return;
      }

      if (treasure.status === 'carried' && treasure.holderAdventurerId) {
        const carrier = renderState.adventurers.find((adventurer) => adventurer.id === treasure.holderAdventurerId);

        if (!carrier) {
          return;
        }

        const world = gridPositionToWorld(carrier.x, carrier.y);
        this.syncTreasureSprite(treasure.id, world.x + 12, world.y - 12, treasure.kind, 15, 0.9);
        this.drawTreasureGlow(world.x + 12, world.y - 12, treasure.kind, 7);
        visibleIds.add(treasure.id);
        return;
      }

      const cell = treasure.status === 'dropped' && treasure.droppedCell ? treasure.droppedCell : treasure.cell;

      if (!cell) {
        return;
      }

      const world = cellToWorld(cell);
      const size = treasure.kind === 'main' ? 22 : 18;
      this.syncTreasureSprite(treasure.id, world.x, world.y, treasure.kind, size, 1);
      this.drawTreasureGlow(world.x, world.y, treasure.kind, treasure.kind === 'main' ? 10 : 8);
      visibleIds.add(treasure.id);
    });

    this.treasureViews.forEach((view, id) => {
      if (!visibleIds.has(id)) {
        view.destroy();
        this.treasureViews.delete(id);
      }
    });
  }

  private syncTreasureSprite(id: string, x: number, y: number, kind: DungeonTreasureKind, size: number, alpha: number): void {
    let view = this.treasureViews.get(id);

    if (!view) {
      view = this.add.image(x, y, treasureTexture(kind)).setDepth(24);
      this.treasureViews.set(id, view);
      this.tweens.add({
        targets: view,
        scaleX: 1.18,
        scaleY: 1.18,
        duration: 220,
        yoyo: true,
        ease: 'Sine.easeOut',
      });
    }

    view
      .setPosition(x, y)
      .setTexture(treasureTexture(kind))
      .setDisplaySize(size, size)
      .setTint(treasureTint(kind))
      .setAlpha(alpha);
  }

  private drawTreasureGlow(x: number, y: number, kind: DungeonTreasureKind, radius: number): void {
    const fill = treasureFillColor(kind);
    const stroke = treasureStrokeColor(kind);

    this.treasureGraphics.fillStyle(fill, 0.16);
    this.treasureGraphics.fillCircle(x, y, radius + 6);
    this.treasureGraphics.lineStyle(1, stroke, 0.75);
    this.treasureGraphics.strokeCircle(x, y, radius + 3);

    if (kind !== 'main') {
      this.treasureGraphics.lineStyle(1, fill, 0.55);
      this.treasureGraphics.beginPath();
      this.treasureGraphics.moveTo(x - radius + 2, y);
      this.treasureGraphics.lineTo(x + radius - 2, y);
      this.treasureGraphics.strokePath();
    }
  }

  private drawTransitions(): void {
    const renderState = this.simulation.getRenderState();
    const visibleIds = new Set<string>();
    this.transitionGraphics.clear();

    renderState.transitions.forEach((transition) => {
      if (transition.locked) {
        return;
      }

      const world = cellToWorld(transition.fromCell);
      const down = transition.label.toLowerCase().includes('desc');
      this.syncTransitionSprite(transition.id, world.x, world.y, down);
      this.drawTransitionMarker(world.x, world.y, down);
      visibleIds.add(transition.id);
    });

    this.transitionViews.forEach((view, id) => {
      if (!visibleIds.has(id)) {
        view.destroy();
        this.transitionViews.delete(id);
      }
    });
  }

  private syncTransitionSprite(id: string, x: number, y: number, down: boolean): void {
    let view = this.transitionViews.get(id);

    if (!view) {
      view = this.add.image(x, y, down ? TEXTURE_KEYS.decor.transitionDown : TEXTURE_KEYS.decor.transitionUp).setDepth(21);
      this.transitionViews.set(id, view);
    }

    view
      .setTexture(down ? TEXTURE_KEYS.decor.transitionDown : TEXTURE_KEYS.decor.transitionUp)
      .setPosition(x, y)
      .setDisplaySize(19, 19)
      .setTint(down ? 0x7d94d6 : 0x79c7a1)
      .setAlpha(0.92);
  }

  private drawTransitionMarker(x: number, y: number, down: boolean): void {
    const fill = down ? 0x6e93c9 : 0x79c7a1;
    const stroke = down ? 0xcfe0f6 : 0xd8ead9;
    this.transitionGraphics.fillStyle(0x0f0d10, 0.82);
    this.transitionGraphics.fillRoundedRect(x - 11, y - 11, 22, 22, 5);
    this.transitionGraphics.lineStyle(2, stroke, 0.92);
    this.transitionGraphics.strokeRoundedRect(x - 11, y - 11, 22, 22, 5);
    this.transitionGraphics.fillStyle(fill, 0.98);
    this.transitionGraphics.beginPath();

    if (down) {
      this.transitionGraphics.moveTo(x - 6, y - 3);
      this.transitionGraphics.lineTo(x + 6, y - 3);
      this.transitionGraphics.lineTo(x, y + 6);
    } else {
      this.transitionGraphics.moveTo(x - 6, y + 4);
      this.transitionGraphics.lineTo(x + 6, y + 4);
      this.transitionGraphics.lineTo(x, y - 6);
    }

    this.transitionGraphics.closePath();
    this.transitionGraphics.fillPath();
  }

  private drawRemains(): void {
    const renderState = this.simulation.getRenderState();
    const byCell = new Map<string, AdventurerRemains[]>();
    const visibleIds = new Set<string>();

    this.remainsGraphics.clear();
    renderState.remains.forEach((remains) => {
      const key = cellKey(remains.cell);
      const stack = byCell.get(key) ?? [];
      stack.push(remains);
      byCell.set(key, stack);
    });

    byCell.forEach((stack) => {
      const visible = stack.slice(-3);
      const world = cellToWorld(stack[0].cell);

      visible.forEach((remains, index) => {
        const x = world.x - 5 + index * 5;
        const y = world.y + 6 - index * 3;
        this.syncRemainsSprite(remains.id, x, y, remains.visualState, remains.emotionalTone, !remains.loot.claimed);
        visibleIds.add(remains.id);
        this.drawRemainsMarker(
          x,
          y,
          remains.visualState,
          remains.emotionalTone,
          !remains.loot.claimed,
        );
      });

      if (stack.length > 3) {
        this.remainsGraphics.fillStyle(0x0f0d10, 0.86);
        this.remainsGraphics.fillCircle(world.x + 11, world.y - 9, 6);
        this.remainsGraphics.fillStyle(0xf6d88a, 0.95);
        this.remainsGraphics.fillCircle(world.x + 11, world.y - 9, 2);
      }
    });

    this.remainsViews.forEach((view, id) => {
      if (!visibleIds.has(id)) {
        view.destroy();
        this.remainsViews.delete(id);
      }
    });
  }

  private syncRemainsSprite(
    id: string,
    x: number,
    y: number,
    visualState: AdventurerRemains['visualState'],
    tone: AdventurerRemains['emotionalTone'],
    hasLoot: boolean,
  ): void {
    let view = this.remainsViews.get(id);

    if (!view) {
      view = this.add.image(x, y - 4, TEXTURE_KEYS.decor.remains).setDepth(21);
      this.remainsViews.set(id, view);
    }

    view
      .setPosition(x, y - 4)
      .setTexture(hasLoot ? TEXTURE_KEYS.decor.relic : TEXTURE_KEYS.decor.remains)
      .setDisplaySize(hasLoot ? 15 : 17, hasLoot ? 15 : 17)
      .setTint(hasLoot ? remainsToneColor(tone) : 0xd8d0b8)
      .setAlpha(visualState === 'old' ? 0.48 : visualState === 'bones' ? 0.62 : 0.78);
  }

  private drawRemainsMarker(
    x: number,
    y: number,
    visualState: AdventurerRemains['visualState'],
    tone: AdventurerRemains['emotionalTone'],
    hasLoot: boolean,
  ): void {
    const alpha = visualState === 'old' ? 0.56 : visualState === 'bones' ? 0.72 : 0.88;
    const tint = remainsToneColor(tone);

    this.remainsGraphics.lineStyle(3, 0xe6dcc8, alpha);
    this.remainsGraphics.beginPath();
    this.remainsGraphics.moveTo(x - 6, y - 3);
    this.remainsGraphics.lineTo(x + 6, y + 3);
    this.remainsGraphics.moveTo(x + 5, y - 4);
    this.remainsGraphics.lineTo(x - 5, y + 4);
    this.remainsGraphics.strokePath();
    this.remainsGraphics.fillStyle(0xe6dcc8, alpha);
    this.remainsGraphics.fillCircle(x, y - 6, 4);
    this.remainsGraphics.lineStyle(1, tint, 0.9);
    this.remainsGraphics.strokeCircle(x, y - 6, 5);

    if (hasLoot) {
      this.remainsGraphics.fillStyle(0xf6d88a, 0.96);
      this.remainsGraphics.fillCircle(x + 7, y - 10, 2);
      this.remainsGraphics.lineStyle(1, 0x7a4a13, 0.9);
      this.remainsGraphics.strokeCircle(x + 7, y - 10, 3);
    }
  }

  private drawSafeZone(): void {
    const renderState = this.simulation.getRenderState();
    this.safeZoneGraphics.clear();

    if (renderState.phase !== 'build') {
      return;
    }

    this.safeZoneGraphics.fillStyle(0x79b8ff, 0.08);
    this.safeZoneGraphics.lineStyle(1, 0x79b8ff, 0.28);

    for (let y = 0; y < GRID_ROWS; y += 1) {
      for (let x = 0; x < GRID_COLS; x += 1) {
        const cell = { x, y };

        if (!isInEntrySafeZone(cell)) {
          continue;
        }

        this.safeZoneGraphics.fillRect(
          GRID_OFFSET_X + x * TILE_SIZE + 1,
          GRID_OFFSET_Y + y * TILE_SIZE + 1,
          TILE_SIZE - 2,
          TILE_SIZE - 2,
        );
        this.safeZoneGraphics.strokeRect(
          GRID_OFFSET_X + x * TILE_SIZE + 1,
          GRID_OFFSET_Y + y * TILE_SIZE + 1,
          TILE_SIZE - 2,
          TILE_SIZE - 2,
        );
      }
    }
  }

  private drawHover(x: number, y: number): void {
    const cell = worldToCell(x, y);
    this.hoverGraphics.clear();
    this.hoverLabel.setVisible(false);

    if (!cell) {
      return;
    }

    const renderState = this.simulation.getRenderState();
    const tile = getTileAt(renderState.tiles, cell);
    const remainsOnCell = renderState.remains.filter((remains) => isSameCell(remains.cell, cell));
    const transitionOnCell = renderState.transitions.find((transition) => isSameCell(transition.fromCell, cell)) ?? null;
    const hasUnclaimedRemainsLoot = remainsOnCell.some((remains) => !remains.loot.claimed);
    const constructionTool = renderState.selectedConstructionTool;
    const activeTreasureOnCell = renderState.treasures.some((treasure) => treasure.status !== 'stolen' && isSameCell(treasure.cell, cell));
    const defenseOnCell = renderState.defenses.find((defense) => defense.alive && isSameCell(defense.cell, cell)) ?? null;
    const selectedDefense = renderState.selectedDefense;
    const guardianAlreadyPlaced = renderState.defenses.some((defense) => defense.alive && defense.type === 'guardian');
    const guardianPreferredCell = renderState.zones.some(
      (zone) =>
        (zone.type === 'defense' || zone.type === 'secondary' || zone.type === 'antechamber') &&
        zone.cells.some((zoneCell) => isSameCell(zoneCell, cell)),
    );
    const roomLockZone = renderState.zones.find(
      (zone) =>
        (zone.type === 'defense' || zone.type === 'secondary' || zone.type === 'antechamber') &&
        zone.cells.some((zoneCell) => isSameCell(zoneCell, cell)),
    ) ?? null;
    const roomLockZoneHasMinion = roomLockZone
      ? renderState.defenses.some(
        (defense) =>
          defense.alive &&
          defense.kind === 'minion' &&
          roomLockZone.cells.some((zoneCell) => isSameCell(zoneCell, defense.cell)),
      )
      : false;
    const invalid = constructionTool === 'dig'
      ? tile?.type !== 'rock' || !hasAdjacentDugTile(renderState.tiles, cell) || renderState.gold < DIG_COST
      : constructionTool === 'reseal'
        ? !this.simulation.previewResealTile(cell).ok
      : constructionTool === 'guardRoom' || constructionTool === 'crypt'
        ? !canMarkRoomTile(tile)
        : constructionTool === 'door'
          ? !canPlaceDoorAt(renderState.tiles, cell)
            || Boolean(findActiveDoorAt(renderState.doors, cell))
            || renderState.defenses.some((defense) => defense.alive && isSameCell(defense.cell, cell))
            || renderState.gold < DOOR_COST
          : constructionTool === 'removeDoor'
            ? !findDoorAt(renderState.doors, cell)
          : constructionTool === 'moveBoss'
            ? !tile
              || tile.type !== 'floor' && tile.type !== 'room'
              || isInEntrySafeZone(cell)
              || isSameCell(cell, ENTRY_CELL)
              || activeTreasureOnCell
              || Boolean(findActiveDoorAt(renderState.doors, cell))
              || renderState.defenses.some((defense) => defense.alive && isSameCell(defense.cell, cell))
          : constructionTool === 'moveTreasure' || isTreasurePlacementTool(constructionTool)
            ? !tile
              || tile.type !== 'floor' && tile.type !== 'room'
              || isInEntrySafeZone(cell)
              || isSameCell(cell, ENTRY_CELL)
              || isSameCell(cell, renderState.boss.homeCell)
              || activeTreasureOnCell
              || Boolean(findActiveDoorAt(renderState.doors, cell))
              || renderState.defenses.some((defense) => defense.alive && isSameCell(defense.cell, cell))
              || renderState.gold < treasurePlacementCost(constructionTool)
          : constructionTool === 'removeTreasure'
            ? !renderState.treasures.some((treasure) => treasure.kind !== 'main' && treasure.status !== 'stolen' && isSameCell(treasure.cell, cell))
          : constructionTool === 'collectRemainsLoot'
            ? !hasUnclaimedRemainsLoot
          : !canBuildDefenseOnTile(tile)
            || transitionOnCell !== null
            || defenseOnCell !== null
            || (selectedDefense === 'guardian' && (
              guardianAlreadyPlaced ||
              !guardianPreferredCell ||
              remainsOnCell.length > 0 ||
              activeTreasureOnCell ||
              isSameCell(cell, renderState.boss.homeCell)
            ))
            || (selectedDefense === 'roomLockTrap' && (
              !roomLockZone ||
              !roomLockZoneHasMinion ||
              remainsOnCell.length > 0 ||
              activeTreasureOnCell ||
              isSameCell(cell, renderState.boss.homeCell)
            ));
    const color = invalid ? 0x8f2631 : 0xe1b35a;
    this.hoverGraphics.lineStyle(3, color, 0.86);
    this.hoverGraphics.strokeRect(
      GRID_OFFSET_X + cell.x * TILE_SIZE + 2,
      GRID_OFFSET_Y + cell.y * TILE_SIZE + 2,
      TILE_SIZE - 4,
      TILE_SIZE - 4,
    );

    if (remainsOnCell.length > 0) {
      const world = cellToWorld(cell);
      const first = remainsOnCell[remainsOnCell.length - 1];
      this.hoverLabel
        .setText(remainsMapLabel(first, remainsOnCell.length))
        .setData('details', remainsTooltip(first))
        .setPosition(Math.min(world.x + 18, GRID_OFFSET_X + GRID_COLS * TILE_SIZE - 198), Math.max(8, world.y - 34))
        .setVisible(true);
      return;
    }

    if (transitionOnCell) {
      const world = cellToWorld(cell);
      this.hoverLabel
        .setText(transitionMapLabel(transitionOnCell))
        .setPosition(Math.min(world.x + 18, GRID_OFFSET_X + GRID_COLS * TILE_SIZE - 170), Math.max(8, world.y - 28))
        .setVisible(true);
      return;
    }

    if (defenseOnCell?.kind === 'trap') {
      const world = cellToWorld(cell);
      this.hoverLabel
        .setText(trapTooltip(defenseOnCell))
        .setPosition(Math.min(world.x + 18, GRID_OFFSET_X + GRID_COLS * TILE_SIZE - 170), Math.max(8, world.y - 28))
        .setVisible(true);
      return;
    }

    const zone = renderState.zones.find((candidate) => candidate.cells.some((zoneCell) => isSameCell(zoneCell, cell)));

    if (zone && (zone.type !== 'corridor' || selectedDefense === 'guardian')) {
      const world = cellToWorld(cell);
      const guardianSuffix = zone.guardianId ? '\nGardien: present' : '';
      this.hoverLabel
        .setText(`${zone.label}\nDanger: ${zone.dangerLevel.toFixed(1)}${guardianSuffix}`)
        .setPosition(Math.min(world.x + 18, GRID_OFFSET_X + GRID_COLS * TILE_SIZE - 170), Math.max(8, world.y - 28))
        .setVisible(true);
    }
  }

  private publishUi(): void {
    const snapshot = this.simulation.getSnapshot();
    emitUiState(snapshot);
    this.syncTavernScene(snapshot);
  }

  private syncTavernScene(snapshot: ReturnType<DungeonSimulation['getSnapshot']>): void {
    const inTavern = snapshot.phase === 'report' || snapshot.phase === 'defeat';
    const tavernScene = this.scene.get('GuildTavernScene');

    if (!inTavern || !snapshot.report) {
      if (tavernScene?.scene.isActive()) {
        this.scene.stop('GuildTavernScene');
      }

      this.tavernReportKey = null;
      return;
    }

    const reportKey = `${snapshot.phase}-${snapshot.report.wave}-${snapshot.report.verdict}`;

    if (this.tavernReportKey === reportKey && tavernScene?.scene.isActive()) {
      return;
    }

    if (tavernScene?.scene.isActive()) {
      this.scene.stop('GuildTavernScene');
    }

    this.tavernReportKey = reportKey;
    this.scene.launch('GuildTavernScene', {
      report: snapshot.report,
      phase: snapshot.phase,
      wave: snapshot.wave,
    });
  }
}

function tileVisual(tile: DungeonTile | null, mapId: string, cell: { x: number; y: number }): { texture: string; tint: number; alpha: number } {
  const deep = mapId === FINAL_MAP_ID;
  const variation = cellHash(cell) % 4;
  const floorTints = deep
    ? [0x59606b, 0x63605f, 0x4f5d58, 0x66565e]
    : [0x6d6a68, 0x756b60, 0x616b68, 0x6f6258];

  if (!tile) {
    return { texture: TEXTURE_KEYS.tileRock, tint: deep ? 0x4c5059 : 0x5e6064, alpha: 1 };
  }

  if (tile.type === 'rock') {
    return { texture: TEXTURE_KEYS.tileRock, tint: deep ? 0x454d57 : 0x565c61, alpha: 1 };
  }

  if (tile.type === 'entrance') {
    return { texture: TEXTURE_KEYS.tileEntry, tint: 0x7ca78c, alpha: 1 };
  }

  if (tile.type === 'treasure') {
    return { texture: TEXTURE_KEYS.tileTreasure, tint: 0xb48a48, alpha: 1 };
  }

  if (tile.type === 'throne') {
    return { texture: TEXTURE_KEYS.tileBoss, tint: 0x8f3540, alpha: 1 };
  }

  if (tile.roomType === 'guardRoom') {
    return { texture: TEXTURE_KEYS.tileGuardRoom, tint: deep ? 0x5f7d71 : 0x698b76, alpha: 1 };
  }

  if (tile.roomType === 'crypt') {
    return { texture: TEXTURE_KEYS.tileCrypt, tint: deep ? 0x75727e : 0x827b72, alpha: 1 };
  }

  if (tile.roomType === 'treasureRoom') {
    return { texture: TEXTURE_KEYS.tileTreasureRoom, tint: deep ? 0x8a6c3d : 0x9a7141, alpha: 1 };
  }

  if (tile.roomType === 'throneRoom') {
    return { texture: TEXTURE_KEYS.tileThroneRoom, tint: deep ? 0x8b303d : 0x963945, alpha: 1 };
  }

  if (tile.type === 'room') {
    return { texture: TEXTURE_KEYS.tileRoom, tint: floorTints[(variation + 1) % floorTints.length], alpha: 1 };
  }

  return { texture: TEXTURE_KEYS.tileFloor, tint: floorTints[variation], alpha: 1 };
}

function cellHash(cell: { x: number; y: number }): number {
  return Math.abs((cell.x * 73856093) ^ (cell.y * 19349663));
}

function treasureTexture(kind: DungeonTreasureKind): string {
  switch (kind) {
    case 'specialWeapon':
      return TEXTURE_KEYS.decor.treasureWeapon;
    case 'specialArmor':
      return TEXTURE_KEYS.decor.treasureArmor;
    case 'specialTechnique':
      return TEXTURE_KEYS.decor.treasureTechnique;
    case 'gold':
    case 'main':
    default:
      return TEXTURE_KEYS.decor.treasureGold;
  }
}

function treasureTint(kind: DungeonTreasureKind): number {
  switch (kind) {
    case 'main':
      return 0xf6d88a;
    case 'gold':
      return 0xffc44d;
    case 'specialWeapon':
      return 0xd85a32;
    case 'specialArmor':
      return 0x8ea6ff;
    case 'specialTechnique':
      return 0xb873d6;
    default:
      return 0xffc44d;
  }
}

function shortDisplayName(name: string, fallback: string): string {
  return name.split(' ')[0]?.slice(0, 9) ?? fallback;
}

function roleBadgeText(adventurer: AdventurerEntity): string {
  if (adventurer.carryingTreasure) {
    return 'COFFRE';
  }

  switch (adventurer.role) {
    case 'warrior':
      return 'GUER';
    case 'thief':
      return 'VOL';
    case 'mage':
      return 'MAG';
    case 'healer':
      return 'SOIN';
    case 'cartographer':
      return 'CART';
    default:
      return '?';
  }
}

function roleBadgeColor(adventurer: AdventurerEntity): string {
  if (adventurer.carryingTreasure) {
    return 'rgba(246, 216, 138, 0.96)';
  }

  switch (adventurer.role) {
    case 'warrior':
      return 'rgba(200, 139, 74, 0.94)';
    case 'thief':
      return 'rgba(125, 148, 214, 0.94)';
    case 'mage':
      return 'rgba(184, 115, 214, 0.94)';
    case 'healer':
      return 'rgba(121, 199, 161, 0.94)';
    case 'cartographer':
      return 'rgba(214, 177, 95, 0.94)';
    default:
      return 'rgba(244, 234, 210, 0.9)';
  }
}

function adventurerFxText(adventurer: AdventurerEntity): string {
  switch (adventurer.role) {
    case 'warrior':
      return 'TAUNT';
    case 'thief':
      return 'PIEGE -';
    case 'mage':
      return 'GLACE';
    case 'healer':
      return 'SOIN';
    case 'cartographer':
      return 'CARTE';
    default:
      return 'ACTIF';
  }
}

function defenseFxText(defense: DefenseEntity): string {
  switch (defense.type) {
    case 'guardian':
      return 'GARDE';
    case 'goblin':
      return 'SOURNOIS';
    case 'skeleton':
      return 'LOURD';
    case 'slime':
      return 'COLLE';
    case 'fireTrap':
    case 'spikeTrap':
      return 'PIEGE -';
    case 'roomLockTrap':
      return 'VERROU';
    default:
      return 'ACTIF';
  }
}

function trapMapShortName(defense: DefenseEntity, fallback: string): string {
  if (defense.trapState === 'disarmed') {
    return 'OFF';
  }

  if (defense.trapState === 'triggered') {
    return 'LOCK';
  }

  if (defense.trapState === 'cleared') {
    return 'CLR';
  }

  return fallback;
}

function trapVisualAlpha(defense: DefenseEntity): number {
  if (defense.kind !== 'trap') {
    return 1;
  }

  if (defense.trapState === 'disarmed' || defense.trapState === 'cleared') {
    return 0.56;
  }

  if (defense.cooldownRemainingMs > 0) {
    return 0.52;
  }

  return 1;
}

function isTreasurePlacementTool(tool: ConstructionTool | null): boolean {
  return tool === 'addGoldTreasure'
    || tool === 'addWeaponTreasure'
    || tool === 'addArmorTreasure'
    || tool === 'addTechniqueTreasure';
}

function treasurePlacementCost(tool: ConstructionTool | null): number {
  switch (tool) {
    case 'addGoldTreasure':
      return 20;
    case 'addWeaponTreasure':
    case 'addArmorTreasure':
      return 18;
    case 'addTechniqueTreasure':
      return 20;
    default:
      return 0;
  }
}

function treasureFillColor(kind: DungeonTreasureKind): number {
  switch (kind) {
    case 'main':
      return 0xf6d88a;
    case 'gold':
      return 0xffc44d;
    case 'specialWeapon':
      return 0xd85a32;
    case 'specialArmor':
      return 0x7d94d6;
    case 'specialTechnique':
      return 0xb873d6;
    default:
      return 0xffc44d;
  }
}

function treasureStrokeColor(kind: DungeonTreasureKind): number {
  switch (kind) {
    case 'main':
      return 0xa8791f;
    case 'gold':
      return 0x7a4a13;
    case 'specialWeapon':
      return 0x7d2f1b;
    case 'specialArmor':
      return 0x3d508f;
    case 'specialTechnique':
      return 0x66357d;
    default:
      return 0x7a4a13;
  }
}

function remainsTooltip(remains: AdventurerRemains): string {
  const loot = remains.loot.claimed
    ? `Butin: deja fouille.`
    : `Butin: ${remains.loot.label} (+${remains.loot.goldValue} or).`;

  return `Restes de ${remains.ownerName} - ${roleLabel(remains.ownerRole)}.\n${remains.causeLabel}. ${remains.relicLabel}.\n${loot}`;
}

function remainsMapLabel(remains: AdventurerRemains, stackCount: number): string {
  return stackCount > 1 ? `${remains.ownerName}\n+${stackCount - 1}` : remains.ownerName;
}

function transitionMapLabel(transition: DungeonTransition): string {
  return `${transition.label}\nVers ${transition.toMapId}`;
}

function trapTooltip(defense: DefenseEntity): string {
  const definition = getDefenseDefinition(defense.type);
  const state =
    defense.trapState === 'disarmed'
      ? 'Desarme'
      : defense.trapState === 'triggered'
        ? 'Verrouille'
        : defense.trapState === 'cleared'
          ? 'Rouvre'
          : 'Arme';

  return `${definition.name}\nEtat: ${state}`;
}

function roleLabel(role: AdventurerRemains['ownerRole']): string {
  switch (role) {
    case 'warrior':
      return 'Guerrier';
    case 'thief':
      return 'Voleur';
    case 'mage':
      return 'Mage';
    case 'healer':
      return 'Soigneur';
    case 'cartographer':
      return 'Cartographe';
    default:
      return 'Aventurier';
  }
}

function remainsToneColor(tone: AdventurerRemains['emotionalTone']): number {
  switch (tone) {
    case 'revenge':
      return 0xc75a42;
    case 'respect':
      return 0xd6b15f;
    case 'grief':
      return 0x9f947e;
    case 'fear':
      return 0x7d94d6;
    case 'warning':
    default:
      return 0xe1b35a;
  }
}

function combatFeedbackVisual(event: CombatFeedbackEvent): { color: number; prefix: string; fontSize: number } {
  if (event.kind === 'heal') {
    return { color: 0x9ee29f, prefix: '', fontSize: 12 };
  }

  switch (event.style) {
    case 'tank':
      return { color: 0xf6d88a, prefix: 'G', fontSize: 11 };
    case 'rogue':
      return { color: 0x7d94d6, prefix: 'V', fontSize: 11 };
    case 'caster':
      return { color: 0xb873d6, prefix: 'M', fontSize: 11 };
    case 'healer':
      return { color: 0x79c7a1, prefix: 'S', fontSize: 11 };
    case 'cartographer':
      return { color: 0xd6b15f, prefix: 'C', fontSize: 11 };
    case 'boss':
      return { color: 0xff6b6b, prefix: 'BOSS', fontSize: 13 };
    case 'guardian':
      return { color: 0xff9a7a, prefix: 'GUARD', fontSize: 12 };
    case 'trap':
      return { color: 0xe1b35a, prefix: 'PIEGE', fontSize: 10 };
    case 'monster':
    default:
      return { color: 0xc88b4a, prefix: 'DEF', fontSize: 11 };
  }
}

function retreatIntentText(adventurer: AdventurerEntity): string {
  if (adventurer.retreatIntent === 'disobey') {
    return adventurer.targetStage === 'boss' ? 'RESTE' : 'REFUS';
  }

  if (adventurer.targetStage !== 'exit') {
    return '';
  }

  if (adventurer.carryingTreasure) {
    return 'PORTEUR';
  }

  switch (adventurer.retreatIntent) {
    case 'coverRetreat':
      return 'COUVRE';
    case 'panicRetreat':
      return 'PANIQUE';
    case 'followRetreat':
      return 'FUITE';
    default:
      return 'FUITE';
  }
}

function rectanglesOverlap(
  a: { left: number; right: number; top: number; bottom: number },
  b: { left: number; right: number; top: number; bottom: number },
): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}
