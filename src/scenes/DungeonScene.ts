import Phaser from 'phaser';
import { TEXTURE_KEYS } from '../assets/manifest';
import {
  BOSS_CELL,
  ENTRY_CELL,
  GRID_COLS,
  GRID_OFFSET_X,
  GRID_OFFSET_Y,
  GRID_ROWS,
  TILE_SIZE,
  TREASURE_CELL,
  WALL_CELLS,
  cellToWorld,
  gridPositionToWorld,
  isProtectedCell,
  isSameCell,
  isWallCell,
  worldToCell,
} from '../game/constants';
import { DungeonSimulation } from '../game/DungeonSimulation';
import type { AdventurerEntity, DefenseEntity, GridCell } from '../game/types';
import { getAdventurerDefinition, getDefenseDefinition } from '../entities/definitions';
import { emitUiState, onUiAction } from '../ui/uiEvents';

interface RenderedEntity {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
}

export class DungeonScene extends Phaser.Scene {
  private simulation = new DungeonSimulation();
  private unsubscribeActions: (() => void) | null = null;
  private defenseViews = new Map<string, RenderedEntity>();
  private adventurerViews = new Map<string, RenderedEntity>();
  private previousDefenseHp = new Map<string, number>();
  private previousAdventurerHp = new Map<string, number>();
  private bossView: RenderedEntity | null = null;
  private previousBossHp = 0;
  private hoverGraphics!: Phaser.GameObjects.Graphics;
  private hpGraphics!: Phaser.GameObjects.Graphics;
  private pathGraphics!: Phaser.GameObjects.Graphics;
  private uiPublishTimerMs = 0;

  constructor() {
    super('DungeonScene');
  }

  create(): void {
    this.simulation.startNewGame();
    this.drawDungeon();
    this.hoverGraphics = this.add.graphics();
    this.pathGraphics = this.add.graphics();
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

      this.simulation.placeSelectedDefense(cell);
      this.publishUi();
      this.syncRenderState();
    });

    this.unsubscribeActions = onUiAction((action) => {
      if (action.type === 'select-defense') {
        this.simulation.selectDefense(action.defenseType);
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

    for (let y = 0; y < GRID_ROWS; y += 1) {
      for (let x = 0; x < GRID_COLS; x += 1) {
        const cell = { x, y };
        const worldX = GRID_OFFSET_X + x * TILE_SIZE;
        const worldY = GRID_OFFSET_Y + y * TILE_SIZE;

        if (isWallCell(cell)) {
          this.add.image(worldX, worldY, TEXTURE_KEYS.tileWall).setOrigin(0);
          continue;
        }

        const texture = specialTileTexture(cell);
        this.add.image(worldX, worldY, texture).setOrigin(0);
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

    WALL_CELLS.forEach((cell) => {
      const world = cellToWorld(cell);
      this.add.rectangle(world.x, world.y, 18, 18, 0x171114, 0.28);
    });
  }

  private createBossView(): void {
    const world = cellToWorld(BOSS_CELL);
    const sprite = this.add.image(0, 0, TEXTURE_KEYS.boss);
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
  }

  private syncDefense(defense: DefenseEntity): void {
    let view = this.defenseViews.get(defense.id);
    const definition = getDefenseDefinition(defense.type);
    const world = defense.kind === 'minion'
      ? gridPositionToWorld(defense.x, defense.y)
      : cellToWorld(defense.cell);

    if (!view) {
      const sprite = this.add.image(0, 0, TEXTURE_KEYS.defense[defense.type]);
      const label = this.add
        .text(0, 20, definition.shortName, {
          color: '#fff4d8',
          fontSize: '9px',
          fontStyle: 'bold',
          fontFamily: 'monospace',
        })
        .setOrigin(0.5);
      const container = this.add.container(world.x, world.y, [sprite, label]);
      view = { container, sprite, label };
      this.defenseViews.set(defense.id, view);
    }

    const previousHp = this.previousDefenseHp.get(defense.id);
    if (previousHp !== undefined && defense.hp < previousHp) {
      this.pulseHit(view.container);
    }

    this.previousDefenseHp.set(defense.id, defense.hp);
    const currentWorld = defense.kind === 'minion'
      ? gridPositionToWorld(defense.x, defense.y)
      : cellToWorld(defense.cell);
    view.container.setPosition(currentWorld.x, currentWorld.y);
    view.container.setAlpha(defense.kind === 'trap' && defense.cooldownRemainingMs > 0 ? 0.52 : 1);
  }

  private syncAdventurer(adventurer: AdventurerEntity): void {
    let view = this.adventurerViews.get(adventurer.id);
    const definition = getAdventurerDefinition(adventurer.role);
    const world = gridPositionToWorld(adventurer.x, adventurer.y);

    if (!view) {
      const sprite = this.add.image(0, 0, TEXTURE_KEYS.adventurer[adventurer.role]);
      const label = this.add
        .text(0, 20, shortDisplayName(adventurer.name, definition.shortName), {
          color: '#fff4d8',
          fontSize: '8px',
          fontStyle: 'bold',
          fontFamily: 'monospace',
        })
        .setOrigin(0.5);
      const container = this.add.container(world.x, world.y, [sprite, label]);
      view = { container, sprite, label };
      this.adventurerViews.set(adventurer.id, view);
    }

    const previousHp = this.previousAdventurerHp.get(adventurer.id);
    if (previousHp !== undefined && adventurer.hp < previousHp) {
      this.pulseHit(view.container);
      this.cameras.main.shake(60, 0.0017);
    }

    this.previousAdventurerHp.set(adventurer.id, adventurer.hp);
    view.container.setPosition(world.x, world.y);
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

  private drawHover(x: number, y: number): void {
    const cell = worldToCell(x, y);
    this.hoverGraphics.clear();

    if (!cell) {
      return;
    }

    const invalid = isWallCell(cell) || isProtectedCell(cell);
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
    emitUiState(this.simulation.getSnapshot());
  }
}

function specialTileTexture(cell: GridCell): string {
  if (isSameCell(cell, ENTRY_CELL)) {
    return TEXTURE_KEYS.tileEntry;
  }

  if (isSameCell(cell, TREASURE_CELL)) {
    return TEXTURE_KEYS.tileTreasure;
  }

  if (isSameCell(cell, BOSS_CELL)) {
    return TEXTURE_KEYS.tileBoss;
  }

  return TEXTURE_KEYS.tileFloor;
}

function shortDisplayName(name: string, fallback: string): string {
  return name.split(' ')[0]?.slice(0, 9) ?? fallback;
}
