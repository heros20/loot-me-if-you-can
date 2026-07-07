import Phaser from 'phaser';
import { TEXTURE_KEYS } from '../assets/manifest';
import {
  BOSS_CELL,
  DIG_COST,
  DOOR_COST,
  ENTRY_CELL,
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
  CombatFeedbackEvent,
  ConstructionTool,
  DefenseEntity,
  DungeonDoor,
  DungeonTile,
  DungeonTreasureKind,
} from '../game/types';
import { getAdventurerDefinition, getDefenseDefinition } from '../entities/definitions';
import { canBuildDefenseOnTile, canMarkRoomTile } from '../systems/dungeonConstruction';
import { canPlaceDoorAt, findActiveDoorAt, findDoorAt } from '../systems/doorSystem';
import { emitUiState, onUiAction } from '../ui/uiEvents';

interface RenderedEntity {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  badge?: Phaser.GameObjects.Text;
  fxLabel?: Phaser.GameObjects.Text;
  intentLabel?: Phaser.GameObjects.Text;
  bark?: Phaser.GameObjects.Text;
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
  private seenCombatFeedbackIds = new Set<string>();
  private bossView: RenderedEntity | null = null;
  private previousBossHp = 0;
  private hoverGraphics!: Phaser.GameObjects.Graphics;
  private safeZoneGraphics!: Phaser.GameObjects.Graphics;
  private hpGraphics!: Phaser.GameObjects.Graphics;
  private pathGraphics!: Phaser.GameObjects.Graphics;
  private treasureGraphics!: Phaser.GameObjects.Graphics;
  private tileViews = new Map<string, Phaser.GameObjects.Image>();
  private uiPublishTimerMs = 0;
  private tavernReportKey: string | null = null;

  constructor() {
    super('DungeonScene');
  }

  create(): void {
    this.simulation.startNewGame();
    this.drawDungeon();
    this.safeZoneGraphics = this.add.graphics();
    this.hoverGraphics = this.add.graphics();
    this.pathGraphics = this.add.graphics();
    this.treasureGraphics = this.add.graphics();
    this.hpGraphics = this.add.graphics();
    this.createBossView();
    this.bindInput();
    this.publishUi();
  }

  update(_time: number, delta: number): void {
    this.simulation.update(Math.min(delta, 80));
    this.syncRenderState();
    this.drawHealthBars();
    this.drawPaths();
    this.drawTreasure();
    this.drawSafeZone();
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
      } else {
        this.simulation.placeSelectedDefense(cell);
      }

      this.publishUi();
      this.syncRenderState();
    });

    this.unsubscribeActions = onUiAction((action) => {
      if (action.type === 'select-defense') {
        this.simulation.selectDefense(action.defenseType);
        this.publishUi();
      }

      if (action.type === 'select-construction') {
        this.simulation.selectConstructionTool(action.constructionType);
        this.publishUi();
      }

      if (action.type === 'launch-wave') {
        this.simulation.launchWave();
        this.publishUi();
      }

      if (action.type === 'continue-build') {
        this.simulation.continueBuild();
        this.publishUi();
      }

      if (action.type === 'use-ability') {
        this.simulation.useBossAbility(action.abilityType);
        this.publishUi();
      }

      if (action.type === 'toggle-pause') {
        this.simulation.togglePause();
        this.publishUi();
      }

      if (action.type === 'set-speed') {
        this.simulation.setGameSpeed(action.speed);
        this.publishUi();
      }

      if (action.type === 'close-inspection') {
        this.simulation.clearInspection();
        this.publishUi();
      }

      if (action.type === 'restart') {
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

        const image = this.add.image(worldX, worldY, tileTexture(tile)).setOrigin(0).setDisplaySize(TILE_SIZE, TILE_SIZE);
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
    const sprite = this.add.image(0, 0, TEXTURE_KEYS.boss).setDisplaySize(42, 42);
    const label = this.add
      .text(0, 24, 'BOSS', {
        color: '#fff4d8',
        fontSize: '10px',
        fontStyle: 'bold',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);
    const container = this.add.container(world.x, world.y, [sprite, label]);
    this.bossView = { container, sprite, label };
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
        view.container.destroy(true);
        this.defenseViews.delete(id);
        this.previousDefenseHp.delete(id);
      }
    });

    renderState.adventurers.forEach((adventurer) => this.syncAdventurer(adventurer));
    this.adventurerViews.forEach((view, id) => {
      if (!aliveAdventurerIds.has(id)) {
        this.spawnDeathPuff(view.container.x, view.container.y, 0xc88b4a);
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
      this.bossView.container.setPosition(bossWorld.x, bossWorld.y);
      this.bossView.container.setAlpha(renderState.phase === 'defeat' ? 0.55 : 1);

      if (this.previousBossHp > 0 && renderState.boss.hp < this.previousBossHp) {
        this.pulseHit(this.bossView.container);
        this.cameras.main.shake(90, 0.0025);
      }

      this.previousBossHp = renderState.boss.hp;
    }

    this.syncCombatFeedback(renderState.combatFeedbackEvents);
  }

  private syncDungeonTiles(tiles: DungeonTile[]): void {
    for (let y = 0; y < GRID_ROWS; y += 1) {
      for (let x = 0; x < GRID_COLS; x += 1) {
        const cell = { x, y };
        const key = cellKey(cell);
        const tileView = this.tileViews.get(key);
        const texture = tileTexture(getTileAt(tiles, cell));

        if (tileView && tileView.texture.key !== texture) {
          tileView.setTexture(texture).setDisplaySize(TILE_SIZE, TILE_SIZE);
        }
      }
    }
  }

  private syncDefense(defense: DefenseEntity): void {
    let view = this.defenseViews.get(defense.id);
    const definition = getDefenseDefinition(defense.type);
    const world = defense.kind === 'minion'
      ? gridPositionToWorld(defense.x, defense.y)
      : cellToWorld(defense.cell);

    if (!view) {
      const sprite = this.add
        .image(0, 0, TEXTURE_KEYS.defense[defense.type])
        .setDisplaySize(defense.kind === 'minion' ? 28 : 24, defense.kind === 'minion' ? 28 : 24);
      const labelText = defense.kind === 'minion' ? shortDisplayName(defense.name, definition.shortName) : definition.shortName;
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
      view = { container, sprite, label, fxLabel };
      this.defenseViews.set(defense.id, view);
    }

    const currentWorld = defense.kind === 'minion'
      ? gridPositionToWorld(defense.x, defense.y)
      : cellToWorld(defense.cell);
    const previousHp = this.previousDefenseHp.get(defense.id);
    if (previousHp !== undefined && defense.hp < previousHp) {
      this.pulseHit(view.container);
    }

    this.previousDefenseHp.set(defense.id, defense.hp);
    view.container.setPosition(currentWorld.x, currentWorld.y);
    view.container.setAlpha(defense.kind === 'trap' && defense.cooldownRemainingMs > 0 ? 0.52 : 1);

    if (defense.abilityFxTimerMs > 0) {
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
    const world = gridPositionToWorld(adventurer.x, adventurer.y);

    if (!view) {
      const sprite = this.add.image(0, 0, TEXTURE_KEYS.adventurer[adventurer.role]).setDisplaySize(28, 28);
      const badge = this.add
        .text(0, -17, roleBadgeText(adventurer), {
          color: '#100e12',
          fontSize: '8px',
          fontStyle: 'bold',
          fontFamily: 'monospace',
          backgroundColor: roleBadgeColor(adventurer),
          padding: { x: 3, y: 1 },
        })
        .setOrigin(0.5);
      const fxLabel = this.add
        .text(0, -29, '', {
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
        .text(0, 31, '', {
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
        .text(0, 20, shortDisplayName(adventurer.name, definition.shortName), {
          color: '#fff4d8',
          fontSize: '8px',
          fontStyle: 'bold',
          fontFamily: 'monospace',
        })
        .setOrigin(0.5);
      const bark = this.add
        .text(0, -46, '', {
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
      view = { container, sprite, label, badge, fxLabel, intentLabel, bark };
      this.adventurerViews.set(adventurer.id, view);
    }

    const previousHp = this.previousAdventurerHp.get(adventurer.id);
    if (previousHp !== undefined && adventurer.hp < previousHp) {
      this.pulseHit(view.container);
      this.cameras.main.shake(60, 0.0017);
    }

    this.previousAdventurerHp.set(adventurer.id, adventurer.hp);
    view.container.setPosition(world.x, world.y);
    view.container.setAlpha(adventurer.stunnedTimerMs > 0 ? 0.55 : 1);
    view.badge?.setText(roleBadgeText(adventurer)).setBackgroundColor(roleBadgeColor(adventurer));
    view.sprite.setDisplaySize(adventurer.carryingTreasure ? 31 : 28, adventurer.carryingTreasure ? 31 : 28);

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
    }

    this.previousDoorHp.set(door.id, door.pickProgressMs);
    view.container.setPosition(world.x, world.y);
    const picking = door.beingPickedById !== null && !door.openedForExpedition;
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
        this.drawTreasureMarker(world.x + 12, world.y - 12, treasure.kind, 5);
        return;
      }

      const cell = treasure.status === 'dropped' && treasure.droppedCell ? treasure.droppedCell : treasure.cell;

      if (!cell) {
        return;
      }

      const world = cellToWorld(cell);
      this.drawTreasureMarker(world.x, world.y, treasure.kind, treasure.kind === 'main' ? 8 : 6);
    });
  }

  private drawTreasureMarker(x: number, y: number, kind: DungeonTreasureKind, radius: number): void {
    const fill = treasureFillColor(kind);
    const stroke = treasureStrokeColor(kind);

    this.treasureGraphics.fillStyle(fill, 0.96);
    this.treasureGraphics.fillCircle(x, y, radius);
    this.treasureGraphics.lineStyle(2, stroke, 1);
    this.treasureGraphics.strokeCircle(x, y, radius);

    if (kind !== 'main') {
      this.treasureGraphics.lineStyle(1, 0x3a220a, 0.9);
      this.treasureGraphics.beginPath();
      this.treasureGraphics.moveTo(x - radius + 2, y);
      this.treasureGraphics.lineTo(x + radius - 2, y);
      this.treasureGraphics.strokePath();
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

    if (!cell) {
      return;
    }

    const renderState = this.simulation.getRenderState();
    const tile = getTileAt(renderState.tiles, cell);
    const constructionTool = renderState.selectedConstructionTool;
    const activeTreasureOnCell = renderState.treasures.some((treasure) => treasure.status !== 'stolen' && isSameCell(treasure.cell, cell));
    const invalid = constructionTool === 'dig'
      ? tile?.type !== 'rock' || !hasAdjacentDugTile(renderState.tiles, cell) || renderState.gold < DIG_COST
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
          : !canBuildDefenseOnTile(tile);
    const color = invalid ? 0x8f2631 : 0xe1b35a;
    this.hoverGraphics.lineStyle(3, color, 0.86);
    this.hoverGraphics.strokeRect(
      GRID_OFFSET_X + cell.x * TILE_SIZE + 2,
      GRID_OFFSET_Y + cell.y * TILE_SIZE + 2,
      TILE_SIZE - 4,
      TILE_SIZE - 4,
    );
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

function tileTexture(tile: DungeonTile | null): string {
  if (!tile) {
    return TEXTURE_KEYS.tileRock;
  }

  if (tile.type === 'rock') {
    return TEXTURE_KEYS.tileRock;
  }

  if (tile.type === 'entrance') {
    return TEXTURE_KEYS.tileEntry;
  }

  if (tile.type === 'treasure') {
    return TEXTURE_KEYS.tileTreasure;
  }

  if (tile.type === 'throne') {
    return TEXTURE_KEYS.tileBoss;
  }

  if (tile.roomType === 'guardRoom') {
    return TEXTURE_KEYS.tileGuardRoom;
  }

  if (tile.roomType === 'crypt') {
    return TEXTURE_KEYS.tileCrypt;
  }

  if (tile.roomType === 'treasureRoom') {
    return TEXTURE_KEYS.tileTreasureRoom;
  }

  if (tile.roomType === 'throneRoom') {
    return TEXTURE_KEYS.tileThroneRoom;
  }

  if (tile.type === 'room') {
    return TEXTURE_KEYS.tileRoom;
  }

  return TEXTURE_KEYS.tileFloor;
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
    default:
      return 'ACTIF';
  }
}

function defenseFxText(defense: DefenseEntity): string {
  switch (defense.type) {
    case 'goblin':
      return 'SOURNOIS';
    case 'skeleton':
      return 'LOURD';
    case 'slime':
      return 'COLLE';
    case 'fireTrap':
    case 'spikeTrap':
      return 'PIEGE -';
    default:
      return 'ACTIF';
  }
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
    case 'boss':
      return { color: 0xff6b6b, prefix: 'BOSS', fontSize: 13 };
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
