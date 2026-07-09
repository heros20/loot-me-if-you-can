import Phaser from 'phaser';
import { ENTITY_VISUALS, type EntityVisualProfile } from '../assets/animationManifest';
import { AUDIO_KEYS, TEXTURE_KEYS } from '../assets/manifest';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../game/constants';
import type { AdventurerRole, GamePhase, GuildTavernScene as GuildTavernScenePayload, TavernActor, TavernBeat, WaveReport } from '../game/types';
import { AudioSystem } from '../systems/audioSystem';
import {
  advanceTavernSceneState,
  createInitialTavernSceneState,
  isTavernSceneFullyRevealed,
  revealAllTavernBeats,
  type TavernSceneState,
} from '../systems/tavernDialogueSequence';
import { emitTavernProgress, emitUiAction, onUiAction } from '../ui/uiEvents';

export interface GuildTavernSceneData {
  report: WaveReport;
  phase: GamePhase;
  wave: number;
}

interface ActorView {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Sprite;
  nameLabel: Phaser.GameObjects.Text;
  tagLabel: Phaser.GameObjects.Text;
  highlight: Phaser.GameObjects.Graphics;
  baseX: number;
  baseY: number;
  seated: boolean;
}

interface GuildZone {
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const GUILD_ZONES = {
  tavernCounter: { key: 'tavern-counter', x: 48, y: 72, width: 280, height: 128 },
  strategyTable: { key: 'strategy-table', x: 260, y: 226, width: 440, height: 248 },
  missingBoard: { key: 'missing-board', x: 48, y: 222, width: 176, height: 176 },
  archiveCorner: { key: 'archive-corner', x: 690, y: 78, width: 220, height: 188 },
  recruiterCorner: { key: 'recruiter-corner', x: 718, y: 334, width: 206, height: 190 },
  tavernLife: { key: 'tavern-life', x: 54, y: 430, width: 198, height: 110 },
} satisfies Record<string, GuildZone>;

const SEAT_POSITIONS = [
  { x: 350, y: 300 },
  { x: 452, y: 286 },
  { x: 560, y: 304 },
  { x: 390, y: 446 },
  { x: 572, y: 444 },
];

const COUNTER_POSITIONS = [
  { x: 178, y: 132, actorId: 'tavernkeeper' },
  { x: 790, y: 170, actorId: 'archivist' },
  { x: 782, y: 406, actorId: 'recruiter' },
];

const VOLUNTEER_POSITIONS = [
  { x: 850, y: 394 },
  { x: 846, y: 444 },
  { x: 818, y: 486 },
  { x: 878, y: 486 },
];

const MOOD_TINT: Record<GuildTavernScenePayload['sceneMood'], number> = {
  triumphant: 0xe1b35a,
  grim: 0x8899aa,
  somber: 0x7a8a7a,
  tense: 0xc88b4a,
  neutral: 0xd4c4a8,
};

export class GuildTavernScene extends Phaser.Scene {
  private report!: WaveReport;
  private phase: GamePhase = 'report';
  private tavernScene!: GuildTavernScenePayload;
  private sceneState: TavernSceneState = { revealedCount: 0 };
  private actorViews = new Map<string, ActorView>();
  private bubbleContainer: Phaser.GameObjects.Container | null = null;
  private autoplayTimer: Phaser.Time.TimerEvent | null = null;
  private unsubscribeActions: (() => void) | null = null;
  private audio!: AudioSystem;
  private moodGlow!: Phaser.GameObjects.Graphics;
  private tavernLifeTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super('GuildTavernScene');
  }

  init(data: GuildTavernSceneData): void {
    this.report = data.report;
    this.phase = data.phase;
    this.tavernScene = data.report.guildTavernScene;
    this.sceneState = createInitialTavernSceneState(this.tavernScene);
  }

  create(): void {
    this.cameras.main.fadeIn(320, 0, 0, 0);
    this.audio = new AudioSystem(this);
    this.audio.playAmbience(AUDIO_KEYS.ambience.tavern, { volume: 0.42, fadeMs: 800 });
    this.drawRoom();
    this.drawTavernCounter();
    this.drawArchiveCorner();
    this.drawRecruiterCorner();
    this.drawStrategyTable();
    this.drawBoard();
    this.drawTavernLife();
    this.placeActors();
    this.drawHeader();
    this.bindInput();
    this.syncDialogue(true);
    this.scheduleAutoplay();
    this.scheduleTavernLife();
    this.publishProgress();
  }

  shutdown(): void {
    this.audio?.stopAmbience();
    this.autoplayTimer?.remove(false);
    this.tavernLifeTimer?.remove(false);
    this.tavernLifeTimer = null;
    this.autoplayTimer = null;
    this.unsubscribeActions?.();
    this.unsubscribeActions = null;
    this.actorViews.clear();
  }

  private drawRoom(): void {
    const floorKey = this.textures.exists(TEXTURE_KEYS.tileFloor) ? TEXTURE_KEYS.tileFloor : TEXTURE_KEYS.tileRoom;
    this.cameras.main.setBackgroundColor('#100b09');
    this.add.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT, 0x100b09, 1).setDepth(-1000);

    for (let y = 0; y < CANVAS_HEIGHT; y += 32) {
      for (let x = 0; x < CANVAS_WIDTH; x += 32) {
        const tile = this.add.image(x, y, floorKey).setOrigin(0).setDisplaySize(32, 32).setAlpha(1);
        if ((x / 32 + y / 32) % 2 === 0) {
          tile.setTint(0xa88b66);
        } else {
          tile.setTint(0x9a8060);
        }
      }
    }

    const walls = this.add.graphics();
    walls.fillStyle(0x2a1f18, 1);
    walls.fillRect(0, 0, CANVAS_WIDTH, 48);
    walls.fillRect(0, 0, 24, CANVAS_HEIGHT);
    walls.fillRect(CANVAS_WIDTH - 24, 0, 24, CANVAS_HEIGHT);
    walls.lineStyle(2, 0x4a3528, 0.58);
    walls.strokeRect(24, 48, CANVAS_WIDTH - 48, CANVAS_HEIGHT - 72);
    walls.fillStyle(0x1a1410, 0.22);
    walls.fillRect(24, CANVAS_HEIGHT - 24, CANVAS_WIDTH - 48, 24);
    walls.fillStyle(0x3a2a20, 0.7);
    walls.fillRect(24, 48, CANVAS_WIDTH - 48, 18);
    walls.fillStyle(0x5a3a24, 0.2);
    [124, 322, 638, 836].forEach((x) => walls.fillRect(x, 66, 5, CANVAS_HEIGHT - 126));
    walls.fillStyle(0x7a4a2a, 0.22);
    walls.fillRect(0, 190, CANVAS_WIDTH, 5);
    walls.fillRect(0, 420, CANVAS_WIDTH, 5);

    const rug = this.add.graphics();
    rug.fillStyle(0x5f2730, 0.36);
    rug.fillRoundedRect(288, 258, 388, 192, 18);
    rug.lineStyle(2, 0xb78552, 0.28);
    rug.strokeRoundedRect(288, 258, 388, 192, 18);
    rug.lineStyle(1, 0xd0a15e, 0.18);
    rug.strokeRoundedRect(306, 276, 352, 156, 12);

    this.drawTorch(38, 118);
    this.drawTorch(922, 118);
    this.drawFireplace(412, 62);

    this.moodGlow = this.add.graphics();
    this.moodGlow.fillStyle(MOOD_TINT[this.tavernScene.sceneMood], 0.055);
    this.moodGlow.fillCircle(CANVAS_WIDTH / 2, 304, 310);
  }

  private drawTavernCounter(): void {
    const zone = GUILD_ZONES.tavernCounter;
    this.drawZoneFrame(zone, 0x2a1b16, 0.12);

    const counter = this.add.graphics();
    counter.fillStyle(0x2b1d17, 1);
    counter.fillRoundedRect(zone.x + 12, zone.y + 70, zone.width - 24, 42, 8);
    counter.fillStyle(0x5e3a24, 1);
    counter.fillRoundedRect(zone.x + 8, zone.y + 56, zone.width - 16, 36, 8);
    counter.lineStyle(2, 0x9a663d, 0.85);
    counter.strokeRoundedRect(zone.x + 8, zone.y + 56, zone.width - 16, 36, 8);
    counter.fillStyle(0x7d5638, 1);
    counter.fillRect(zone.x + 24, zone.y + 88, zone.width - 48, 8);

    this.drawShelf(zone.x + 28, zone.y + 16, 96);
    this.drawShelf(zone.x + 142, zone.y + 16, 94);
    this.drawBarrel(zone.x + 30, zone.y + 82);
    this.drawBarrel(zone.x + 236, zone.y + 82);
    this.drawMug(zone.x + 132, zone.y + 72);
    this.drawMug(zone.x + 156, zone.y + 70);
    this.drawCandle(zone.x + 204, zone.y + 70);
  }

  private drawArchiveCorner(): void {
    const zone = GUILD_ZONES.archiveCorner;
    this.drawZoneFrame(zone, 0x1f211d, 0.1);

    const archive = this.add.graphics();
    archive.fillStyle(0x31251c, 1);
    archive.fillRoundedRect(zone.x + 18, zone.y + 22, zone.width - 36, 74, 6);
    archive.lineStyle(2, 0x6c4b32, 0.7);
    archive.strokeRoundedRect(zone.x + 18, zone.y + 22, zone.width - 36, 74, 6);
    archive.fillStyle(0x6a442b, 1);
    archive.fillRoundedRect(zone.x + 42, zone.y + 122, zone.width - 70, 48, 7);
    archive.lineStyle(2, 0x9b7046, 0.75);
    archive.strokeRoundedRect(zone.x + 42, zone.y + 122, zone.width - 70, 48, 7);

    for (let i = 0; i < 10; i += 1) {
      const bookX = zone.x + 30 + i * 16;
      const bookHeight = 30 + (i % 3) * 7;
      archive.fillStyle([0x704345, 0x435d59, 0x6b5730][i % 3], 1);
      archive.fillRect(bookX, zone.y + 80 - bookHeight, 10, bookHeight);
    }

    this.drawPaper(zone.x + 74, zone.y + 134, 34, 24, -0.08);
    this.drawPaper(zone.x + 116, zone.y + 138, 38, 22, 0.1);
    this.drawCandle(zone.x + 172, zone.y + 132);
  }

  private drawRecruiterCorner(): void {
    const zone = GUILD_ZONES.recruiterCorner;
    this.drawZoneFrame(zone, 0x241f18, 0.1);

    const recruiter = this.add.graphics();
    recruiter.fillStyle(0x3b2a1f, 1);
    recruiter.fillRoundedRect(zone.x + 20, zone.y + 28, zone.width - 40, 76, 6);
    recruiter.lineStyle(2, 0x8c603c, 0.75);
    recruiter.strokeRoundedRect(zone.x + 20, zone.y + 28, zone.width - 40, 76, 6);
    recruiter.fillStyle(0x19130f, 0.65);
    recruiter.fillRect(zone.x + 32, zone.y + 40, zone.width - 64, 6);
    recruiter.fillRect(zone.x + 32, zone.y + 62, zone.width - 64, 6);
    recruiter.fillRect(zone.x + 32, zone.y + 84, zone.width - 64, 6);
    recruiter.fillStyle(0x6a442b, 1);
    recruiter.fillRoundedRect(zone.x + 38, zone.y + 124, zone.width - 76, 38, 7);

    this.drawPaper(zone.x + 54, zone.y + 130, 38, 22, -0.05);
    this.drawPaper(zone.x + 104, zone.y + 132, 42, 22, 0.07);
    this.drawCandle(zone.x + 160, zone.y + 130);
  }

  private drawStrategyTable(): void {
    const zone = GUILD_ZONES.strategyTable;
    this.drawZoneFrame(zone, 0x251915, 0.08);

    const table = this.add.graphics();
    table.fillStyle(0x261913, 0.42);
    table.fillEllipse(zone.x + zone.width / 2, zone.y + zone.height / 2 + 26, 410, 86);
    table.fillStyle(0x5c3d28, 1);
    table.fillRoundedRect(zone.x + 48, zone.y + 94, zone.width - 96, 108, 18);
    table.fillStyle(0x70482e, 1);
    table.fillRoundedRect(zone.x + 38, zone.y + 82, zone.width - 76, 104, 18);
    table.lineStyle(3, 0xa76d42, 0.9);
    table.strokeRoundedRect(zone.x + 38, zone.y + 82, zone.width - 76, 104, 18);
    table.lineStyle(1, 0xd3a266, 0.28);
    table.lineBetween(zone.x + 76, zone.y + 96, zone.x + zone.width - 76, zone.y + 96);
    table.lineBetween(zone.x + 72, zone.y + 148, zone.x + zone.width - 72, zone.y + 148);

    const mapX = zone.x + 150;
    const mapY = zone.y + 102;
    this.drawPaper(mapX, mapY, 120, 62, -0.04);
    const map = this.add.graphics();
    map.lineStyle(2, 0x5b4a35, 0.75);
    map.beginPath();
    map.moveTo(mapX + 16, mapY + 42);
    map.lineTo(mapX + 38, mapY + 30);
    map.lineTo(mapX + 52, mapY + 46);
    map.lineTo(mapX + 76, mapY + 22);
    map.lineTo(mapX + 102, mapY + 36);
    map.strokePath();
    map.fillStyle(0x8a3038, 0.9);
    map.fillCircle(mapX + 78, mapY + 23, 4);
    map.fillStyle(0x294b42, 0.9);
    map.fillCircle(mapX + 38, mapY + 30, 4);

    this.drawMug(zone.x + 98, zone.y + 128);
    this.drawMug(zone.x + 300, zone.y + 142);
    this.drawCandle(zone.x + 120, zone.y + 106);
    this.drawCandle(zone.x + 316, zone.y + 114);

    table.setData('testid', 'tavern-strategy-table');
  }

  private drawBoard(): void {
    const zone = GUILD_ZONES.missingBoard;
    this.drawZoneFrame(zone, 0x201818, 0.1);

    const board = this.add.container(zone.x + 14, zone.y + 22);
    const boardWidth = zone.width - 28;
    const boardHeight = zone.height - 40;
    const bg = this.add.graphics();
    bg.fillStyle(0x1e1814, 0.96);
    bg.fillRoundedRect(0, 0, boardWidth, boardHeight, 6);
    bg.lineStyle(1, 0x8a3038, 0.8);
    bg.strokeRoundedRect(0, 0, boardWidth, boardHeight, 6);
    bg.fillStyle(0x6a442b, 0.9);
    bg.fillRect(8, 8, boardWidth - 16, 3);
    bg.fillRect(8, boardHeight - 12, boardWidth - 16, 3);
    bg.fillStyle(0xb98b53, 0.9);
    bg.fillCircle(14, 14, 2);
    bg.fillCircle(boardWidth - 14, 14, 2);

    const title = this.add.text(boardWidth / 2, 18, 'Disparus', {
      color: '#e88b8b',
      fontSize: '10px',
      fontStyle: 'bold',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0);

    const listedNames = this.tavernScene.dead.length > 0
      ? this.tavernScene.dead.slice(0, 6).map((name) => this.formatDisplayName(name)).join('\n')
      : 'Aucun nom raye';
    const names = this.add.text(12, 40, listedNames, {
      color: '#d4c4a8',
      fontSize: '10px',
      fontFamily: 'monospace',
      lineSpacing: 2,
      wordWrap: { width: boardWidth - 24 },
    });

    board.add([bg, title, names]);
    board.setData('testid', 'tavern-board');
  }

  private drawTavernLife(): void {
    const zone = GUILD_ZONES.tavernLife;
    this.drawZoneFrame(zone, 0x2a1b14, 0.07);

    const life = this.add.graphics();
    life.fillStyle(0x251812, 0.62);
    life.fillEllipse(zone.x + 56, zone.y + 54, 82, 38);
    life.fillEllipse(zone.x + 142, zone.y + 58, 74, 34);
    life.fillStyle(0x5f3b25, 1);
    life.fillRoundedRect(zone.x + 26, zone.y + 34, 64, 38, 10);
    life.fillRoundedRect(zone.x + 112, zone.y + 40, 58, 34, 10);
    life.lineStyle(2, 0x9a663d, 0.7);
    life.strokeRoundedRect(zone.x + 26, zone.y + 34, 64, 38, 10);
    life.strokeRoundedRect(zone.x + 112, zone.y + 40, 58, 34, 10);
    life.fillStyle(0x3a2a20, 1);
    life.fillCircle(zone.x + 20, zone.y + 52, 9);
    life.fillCircle(zone.x + 96, zone.y + 58, 9);
    life.fillCircle(zone.x + 104, zone.y + 44, 8);
    life.fillCircle(zone.x + 178, zone.y + 58, 8);
    this.drawMug(zone.x + 48, zone.y + 44);
    this.drawMug(zone.x + 134, zone.y + 50);
  }

  private drawHeader(): void {
    this.add
      .text(480, 16, this.tavernScene.title, {
        color: '#fff4d8',
        fontSize: '16px',
        fontStyle: 'bold',
        fontFamily: 'Georgia, serif',
      })
      .setOrigin(0.5, 0);

    this.add
      .text(480, 36, `Expedition ${this.report.wave} - ${this.tavernScene.subtitle}`, {
        color: '#c9b08a',
        fontSize: '11px',
        fontFamily: 'monospace',
        align: 'center',
        wordWrap: { width: 760 },
      })
      .setOrigin(0.5, 0);
  }

  private placeActors(): void {
    this.tavernScene.layout.tableSlots.forEach((slot, index) => {
      const pos = SEAT_POSITIONS[index] ?? SEAT_POSITIONS[2];

      if (slot.actor) {
        this.createActorView(slot.actor, pos.x, pos.y, true);
        return;
      }

      this.createEmptySeat(slot.deadName, pos.x, pos.y);
    });

    COUNTER_POSITIONS.forEach(({ x, y, actorId }) => {
      const actor = this.tavernScene.layout.counterActors.find((entry) => entry.id === actorId);

      if (actor) {
        this.createActorView(actor, x, y, false);
      }
    });

    this.tavernScene.layout.backgroundActors.forEach((actor, index) => {
      const pos = VOLUNTEER_POSITIONS[index] ?? VOLUNTEER_POSITIONS[VOLUNTEER_POSITIONS.length - 1];
      this.createActorView(actor, pos.x, pos.y, false);
    });
  }

  private createActorView(actor: TavernActor, x: number, y: number, seated: boolean): void {
    const visual = this.visualForActor(actor);
    const sprite = this.add.sprite(0, seated ? 4 : 0, visual.texture).setDisplaySize(seated ? 38 : Math.min(42, visual.displaySize), seated ? 38 : Math.min(42, visual.displaySize));
    this.playAnimation(sprite, visual.idle);

    if (actor.kind === 'npc') {
      sprite.setTint(0xb8a890);
    }

    if (actor.isVeteran) {
      sprite.setTint(0xe1b35a);
    }

    const highlight = this.add.graphics();
    highlight.lineStyle(2, 0xe1b35a, 0);
    highlight.strokeCircle(0, seated ? 4 : 0, 22);

    const nameLabel = this.add.text(0, seated ? 28 : 24, this.formatDisplayName(actor.name), {
      color: '#fff4d8',
      fontSize: '9px',
      fontStyle: 'bold',
      fontFamily: 'monospace',
      align: 'center',
    }).setOrigin(0.5, 0);

    const tagLabel = this.add.text(0, seated ? 40 : 36, actor.statusLabel, {
      color: '#9f947e',
      fontSize: '8px',
      fontFamily: 'monospace',
      align: 'center',
    }).setOrigin(0.5, 0);

    const container = this.add.container(x, y, [highlight, sprite, nameLabel, tagLabel]);
    container.setData('testid', 'tavern-actor');
    container.setData('actorId', actor.id);
    const view = { container, sprite, nameLabel, tagLabel, highlight, baseX: x, baseY: y, seated };
    this.actorViews.set(actor.id, view);
    this.animateActorLife(view, actor, visual);
  }

  private createEmptySeat(deadName: string | null, x: number, y: number): void {
    const chair = this.add.graphics();
    chair.lineStyle(2, 0x6a5040, 0.55);
    chair.strokeCircle(0, 4, 14);
    chair.lineStyle(1, 0x6a5040, 0.35);
    chair.strokeCircle(0, 4, 8);

    const label = this.add.text(0, 28, deadName ? this.formatDisplayName(deadName) : 'Vide', {
      color: deadName ? '#e88b8b' : '#6a6058',
      fontSize: '8px',
      fontFamily: 'monospace',
      fontStyle: deadName ? 'bold' : 'normal',
      align: 'center',
    }).setOrigin(0.5, 0);

    const container = this.add.container(x, y, [chair, label]);
    container.setData('testid', 'tavern-empty-seat');
    container.setAlpha(deadName ? 0.95 : 0.55);
  }

  private visualForActor(actor: TavernActor): EntityVisualProfile {
    if (actor.kind === 'survivor' && actor.role !== 'guild' && actor.role !== 'rumor') {
      return ENTITY_VISUALS.adventurer[actor.role as AdventurerRole];
    }

    const role =
      actor.id === 'archivist'
        ? 'mage'
        : actor.id === 'recruiter'
          ? 'warrior'
          : actor.id === 'tavernkeeper'
            ? 'healer'
            : actor.id.startsWith('volunteer-')
              ? ['warrior', 'thief', 'cartographer', 'mage'][Number(actor.id.replace(/\D/g, '')) % 4] ?? 'thief'
              : 'cartographer';

    return ENTITY_VISUALS.adventurer[role as AdventurerRole];
  }

  private animateActorLife(view: ActorView, actor: TavernActor, visual: EntityVisualProfile): void {
    if (view.seated) {
      this.tweens.add({
        targets: view.sprite,
        y: view.sprite.y - 2,
        angle: actor.isVeteran ? 1.6 : 1,
        duration: 1300 + (view.baseX % 5) * 180,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      return;
    }

    if (actor.id === 'tavernkeeper' || actor.id === 'archivist' || actor.id === 'recruiter') {
      this.tweens.add({
        targets: view.sprite,
        y: view.sprite.y - 1.5,
        angle: actor.id === 'tavernkeeper' ? -1.4 : 1.2,
        duration: 1500 + (view.baseY % 4) * 180,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      return;
    }

    const roamRadius = actor.id.startsWith('volunteer-') ? 28 : 18;
    const targetX = Phaser.Math.Clamp(view.baseX + Phaser.Math.Between(-roamRadius, roamRadius), 720, 902);
    const targetY = Phaser.Math.Clamp(view.baseY + Phaser.Math.Between(-roamRadius, roamRadius), 360, 502);
    this.playAnimation(view.sprite, visual.walk);
    this.tweens.add({
      targets: view.container,
      x: targetX,
      y: targetY,
      duration: 2200 + Phaser.Math.Between(0, 900),
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
      repeatDelay: 900 + Phaser.Math.Between(0, 1200),
      onYoyo: () => this.playAnimation(view.sprite, visual.idle),
      onRepeat: () => this.playAnimation(view.sprite, visual.walk),
    });
  }

  private playAnimation(sprite: Phaser.GameObjects.Sprite, key: string): void {
    if (this.anims.exists(key)) {
      sprite.play(key, true);
    }
  }

  private formatDisplayName(name: string): string {
    const normalized = name
      .replace(/\u00b9/g, '1')
      .replace(/\u00b2/g, '2')
      .replace(/\u00b3/g, '3');

    return normalized.replace(/^([A-Za-z]+)(\d+)(\s|$)/, (_match, base: string, suffix: string, spacer: string) => {
      return `${base} ${this.toRoman(Number(suffix))}${spacer}`;
    });
  }

  private toRoman(value: number): string {
    if (!Number.isFinite(value) || value <= 0 || value > 20) {
      return String(value);
    }

    const numerals: Array<[number, string]> = [
      [10, 'X'],
      [9, 'IX'],
      [5, 'V'],
      [4, 'IV'],
      [1, 'I'],
    ];
    let remaining = Math.floor(value);
    let result = '';

    numerals.forEach(([amount, roman]) => {
      while (remaining >= amount) {
        result += roman;
        remaining -= amount;
      }
    });

    return result;
  }

  private drawZoneFrame(zone: GuildZone, color: number, alpha: number): void {
    const frame = this.add.graphics();
    frame.fillStyle(color, alpha);
    frame.fillRoundedRect(zone.x, zone.y, zone.width, zone.height, 10);
    frame.lineStyle(1, 0xd7a764, 0.07);
    frame.strokeRoundedRect(zone.x, zone.y, zone.width, zone.height, 10);
    frame.setData('testid', zone.key);
  }

  private drawTorch(x: number, y: number): void {
    const torch = this.add.graphics();
    torch.fillStyle(0x4a2e1c, 1);
    torch.fillRect(x - 3, y, 6, 30);
    torch.fillStyle(0xe1b35a, 0.9);
    torch.fillCircle(x, y - 6, 10);
    torch.fillStyle(0xf6d072, 0.95);
    torch.fillCircle(x, y - 9, 5);
    torch.fillStyle(0xe1b35a, 0.055);
    torch.fillCircle(x, y - 4, 42);
  }

  private drawFireplace(x: number, y: number): void {
    const fireplace = this.add.graphics();
    fireplace.fillStyle(0x17100d, 1);
    fireplace.fillRoundedRect(x, y, 136, 68, 8);
    fireplace.lineStyle(2, 0x6d4b33, 0.85);
    fireplace.strokeRoundedRect(x, y, 136, 68, 8);
    fireplace.fillStyle(0x2d2018, 1);
    fireplace.fillRoundedRect(x + 18, y + 18, 100, 38, 6);
    fireplace.fillStyle(0xe07b38, 0.9);
    fireplace.fillEllipse(x + 68, y + 44, 36, 24);
    fireplace.fillStyle(0xf4c35a, 0.9);
    fireplace.fillEllipse(x + 68, y + 40, 18, 28);
    fireplace.fillStyle(0xe1b35a, 0.045);
    fireplace.fillCircle(x + 68, y + 42, 88);
  }

  private drawShelf(x: number, y: number, width: number): void {
    const shelf = this.add.graphics();
    shelf.fillStyle(0x5a3a24, 1);
    shelf.fillRoundedRect(x, y + 28, width, 8, 3);

    for (let i = 0; i < 5; i += 1) {
      const bottleX = x + 10 + i * 17;
      shelf.fillStyle([0x3d5e47, 0x5a3d64, 0x7d5638][i % 3], 1);
      shelf.fillRoundedRect(bottleX, y + 6 + (i % 2) * 4, 9, 24 - (i % 2) * 4, 4);
      shelf.fillStyle(0xc9b08a, 0.9);
      shelf.fillRect(bottleX + 2, y + 4 + (i % 2) * 4, 5, 4);
    }
  }

  private drawBarrel(x: number, y: number): void {
    const barrel = this.add.graphics();
    barrel.fillStyle(0x6a442b, 1);
    barrel.fillEllipse(x, y, 28, 38);
    barrel.lineStyle(2, 0x2c1b14, 0.55);
    barrel.strokeEllipse(x, y, 28, 38);
    barrel.lineStyle(2, 0xb78552, 0.55);
    barrel.lineBetween(x - 12, y - 8, x + 12, y - 8);
    barrel.lineBetween(x - 12, y + 8, x + 12, y + 8);
  }

  private drawMug(x: number, y: number): void {
    const mug = this.add.graphics();
    mug.fillStyle(0xd2b075, 1);
    mug.fillRoundedRect(x, y, 12, 14, 3);
    mug.lineStyle(2, 0xd2b075, 1);
    mug.strokeCircle(x + 13, y + 7, 5);
    mug.fillStyle(0xf5e2b7, 0.85);
    mug.fillRect(x + 2, y + 2, 8, 3);
  }

  private drawCandle(x: number, y: number): void {
    const candle = this.add.graphics();
    candle.fillStyle(0xf0d9a3, 1);
    candle.fillRoundedRect(x, y, 8, 18, 2);
    candle.fillStyle(0xe1b35a, 0.18);
    candle.fillCircle(x + 4, y - 2, 12);
    candle.fillStyle(0xf4c35a, 1);
    candle.fillEllipse(x + 4, y - 4, 6, 10);
  }

  private drawPaper(x: number, y: number, width: number, height: number, rotation: number): void {
    const paper = this.add.graphics();
    paper.fillStyle(0xd8c393, 1);
    paper.fillRoundedRect(-width / 2, -height / 2, width, height, 3);
    paper.lineStyle(1, 0x8c6d43, 0.45);
    paper.strokeRoundedRect(-width / 2, -height / 2, width, height, 3);
    paper.lineStyle(1, 0x80694c, 0.5);
    paper.lineBetween(-width / 2 + 6, -height / 2 + 8, width / 2 - 6, -height / 2 + 8);
    paper.lineBetween(-width / 2 + 6, -height / 2 + 15, width / 2 - 10, -height / 2 + 15);
    paper.setPosition(x + width / 2, y + height / 2);
    paper.setRotation(rotation);
  }

  private bindInput(): void {
    this.unsubscribeActions = onUiAction((action) => {
      if (action.type === 'tavern-advance') {
        this.audio.playRandomSound(AUDIO_KEYS.interaction.paper, { volume: 0.24, cooldownMs: 160 });
        this.handleAdvance();
      }

      if (action.type === 'tavern-skip') {
        this.audio.playRandomSound(AUDIO_KEYS.ui.confirm, { volume: 0.32, cooldownMs: 160 });
        this.handleSkip();
      }

      if (action.type === 'toggle-audio-mute') {
        const muted = this.audio.toggleMute();

        if (!muted) {
          this.audio.playRandomSound(AUDIO_KEYS.ui.toggle, { volume: 0.32, cooldownMs: 0 });
        }
      }

      if (action.type === 'set-audio-volume') {
        this.audio.setMasterVolume(action.volume);
      }
    });
  }

  private handleAdvance(): void {
    if (!isTavernSceneFullyRevealed(this.tavernScene, this.sceneState)) {
      this.sceneState = advanceTavernSceneState(this.tavernScene, this.sceneState);
      this.syncDialogue(false);
      this.scheduleAutoplay();
      this.publishProgress();
      return;
    }

    if (this.phase === 'report') {
      emitUiAction({ type: 'continue-build' });
    }
  }

  private handleSkip(): void {
    if (this.phase === 'report') {
      emitUiAction({ type: 'continue-build' });
      return;
    }

    this.sceneState = revealAllTavernBeats(this.tavernScene);
    this.syncDialogue(false);
    this.autoplayTimer?.remove(false);
    this.publishProgress();
  }

  private scheduleAutoplay(): void {
    this.autoplayTimer?.remove(false);

    if (isTavernSceneFullyRevealed(this.tavernScene, this.sceneState)) {
      return;
    }

    this.autoplayTimer = this.time.addEvent({
      delay: 2800,
      callback: () => this.handleAdvance(),
    });
  }

  private scheduleTavernLife(): void {
    this.tavernLifeTimer?.remove(false);
    this.tavernLifeTimer = this.time.addEvent({
      delay: 2200,
      loop: true,
      callback: () => {
        const actors = [...this.actorViews.values()];
        const actor = Phaser.Utils.Array.GetRandom(actors);

        if (actor) {
          this.tweens.add({
            targets: actor.sprite,
            scaleX: actor.sprite.scaleX * 1.06,
            scaleY: actor.sprite.scaleY * 0.96,
            duration: 120,
            yoyo: true,
            ease: 'Quad.easeOut',
          });
        }

        const roll = Phaser.Math.Between(0, 4);
        if (roll === 0) {
          this.audio.playRandomSound(AUDIO_KEYS.interaction.wood, { volume: 0.1, cooldownMs: 2400, skipRecent: true });
        } else if (roll === 1) {
          this.audio.playRandomSound(AUDIO_KEYS.footsteps, { volume: 0.07, cooldownMs: 1800, skipRecent: true });
        } else if (roll === 2) {
          this.audio.playRandomSound(AUDIO_KEYS.interaction.paper, { volume: 0.08, cooldownMs: 2600, skipRecent: true });
        }
      },
    });
  }

  private syncDialogue(initial: boolean): void {
    this.children.list
      .filter((child) => child.getData('tavernBubbleExtra') === true)
      .forEach((child) => child.destroy());

    this.bubbleContainer?.destroy(true);
    this.bubbleContainer = null;

    this.actorViews.forEach((view) => {
      view.highlight.clear();
      view.highlight.lineStyle(2, 0xe1b35a, 0);
      view.highlight.strokeCircle(0, view.sprite.y, 22);
      view.container.setScale(1);
    });

    const revealedBeats = this.tavernScene.beats.slice(0, this.sceneState.revealedCount);
    const activeBeat = revealedBeats[revealedBeats.length - 1] ?? null;

    if (!activeBeat) {
      return;
    }

    const speakerView = this.actorViews.get(activeBeat.actorId);

    if (speakerView) {
      speakerView.highlight.clear();
      speakerView.highlight.lineStyle(2, 0xe1b35a, 0.95);
      speakerView.highlight.strokeCircle(0, speakerView.sprite.y, 24);
      this.tweens.add({
        targets: speakerView.container,
        scaleX: 1.06,
        scaleY: 1.06,
        duration: initial ? 0 : 180,
        yoyo: false,
      });
      this.showBubble(activeBeat, speakerView.container.x, speakerView.container.y, initial);
      return;
    }

    this.showBubble(activeBeat, CANVAS_WIDTH / 2, 200, initial);
  }

  private showBubble(beat: TavernBeat, speakerX: number, speakerY: number, initial: boolean): void {
    const maxWidth = this.bubbleMaxWidthFor(beat.actorId);
    const text = this.add.text(0, 0, beat.text, {
      color: '#1a1410',
      fontSize: '11px',
      fontFamily: 'monospace',
      wordWrap: { width: maxWidth - 24 },
      lineSpacing: 3,
    });

    const paddingX = 12;
    const paddingY = 10;
    const bubbleWidth = Math.min(maxWidth, text.width + paddingX * 2);
    const bubbleHeight = text.height + paddingY * 2;
    const placement = this.resolveBubblePlacement(beat.actorId, speakerX, speakerY, bubbleWidth, bubbleHeight);

    const bg = this.add.graphics();
    bg.fillStyle(0xfff4d8, 0.98);
    bg.fillRoundedRect(-bubbleWidth / 2, -bubbleHeight / 2, bubbleWidth, bubbleHeight, 8);
    bg.lineStyle(1, 0xc9b08a, 0.9);
    bg.strokeRoundedRect(-bubbleWidth / 2, -bubbleHeight / 2, bubbleWidth, bubbleHeight, 8);
    bg.fillStyle(0xfff4d8, 1);
    const pointerX = Phaser.Math.Clamp(speakerX - placement.x, -bubbleWidth / 2 + 18, bubbleWidth / 2 - 18);
    bg.fillTriangle(pointerX - 8, bubbleHeight / 2, pointerX + 8, bubbleHeight / 2, pointerX, bubbleHeight / 2 + 10);

    text.setPosition(-text.width / 2, -text.height / 2);

    this.bubbleContainer = this.add.container(placement.x, placement.y, [bg, text]);
    this.bubbleContainer.setData('testid', 'tavern-bubble');
    this.bubbleContainer.setAlpha(0.15);
    this.tweens.add({
      targets: this.bubbleContainer,
      alpha: 1,
      y: placement.y - 6,
      duration: initial ? 0 : 220,
      ease: 'Sine.easeOut',
    });

    const speakerLabel = this.add
      .text(placement.x, placement.y - bubbleHeight / 2 - 14, this.formatDisplayName(beat.speakerName), {
        color: '#e1b35a',
        fontSize: '9px',
        fontStyle: 'bold',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5, 1)
      .setAlpha(0.9);
    speakerLabel.setData('tavernBubbleExtra', true);
  }

  private bubbleMaxWidthFor(actorId: string): number {
    if (actorId === 'recruiter' || actorId.startsWith('volunteer-')) {
      return 218;
    }

    if (actorId === 'archivist' || actorId === 'tavernkeeper') {
      return 232;
    }

    return 246;
  }

  private resolveBubblePlacement(
    actorId: string,
    speakerX: number,
    speakerY: number,
    bubbleWidth: number,
    bubbleHeight: number,
  ): { x: number; y: number } {
    let x = speakerX;
    let y = speakerY - 72;

    if (actorId === 'recruiter' || actorId.startsWith('volunteer-')) {
      x = speakerX - 68;
      y = speakerY > 430 ? speakerY - 136 : speakerY - 112;
    } else if (actorId === 'archivist') {
      x = speakerX - 130;
      y = speakerY - 52;
    } else if (actorId === 'tavernkeeper') {
      x = speakerX + 148;
      y = speakerY - 42;
    } else if (speakerY > 400) {
      y = speakerY - 118;
    }

    return {
      x: Phaser.Math.Clamp(x, bubbleWidth / 2 + 18, CANVAS_WIDTH - bubbleWidth / 2 - 18),
      y: Phaser.Math.Clamp(y, bubbleHeight / 2 + 70, CANVAS_HEIGHT - bubbleHeight / 2 - 126),
    };
  }

  private publishProgress(): void {
    emitTavernProgress({
      revealedCount: this.sceneState.revealedCount,
      totalBeats: this.tavernScene.beats.length,
      fullyRevealed: isTavernSceneFullyRevealed(this.tavernScene, this.sceneState),
    });
  }
}
