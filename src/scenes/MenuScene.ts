import Phaser from 'phaser';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../game/constants';
import { emitUiState, onUiAction } from '../ui/uiEvents';

export class MenuScene extends Phaser.Scene {
  private unsubscribeActions: (() => void) | null = null;

  constructor() {
    super('MenuScene');
  }

  create(): void {
    this.drawBackdrop();
    emitUiState({ phase: 'menu' });

    this.unsubscribeActions = onUiAction((action) => {
      if (action.type === 'start-game') {
        this.scene.start('DungeonScene');
      }
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeActions?.();
      this.unsubscribeActions = null;
    });
  }

  private drawBackdrop(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x151217, 1);
    graphics.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    for (let i = 0; i < 34; i += 1) {
      const x = 70 + (i % 9) * 102;
      const y = 80 + Math.floor(i / 9) * 128;
      graphics.fillStyle(i % 3 === 0 ? 0x2b171c : 0x211b1e, 1);
      graphics.fillRect(x, y, 50, 50);
      graphics.lineStyle(1, 0x3b3030, 0.55);
      graphics.strokeRect(x, y, 50, 50);
    }

    graphics.fillStyle(0x8f2631, 0.35);
    graphics.fillCircle(760, 410, 150);
    graphics.fillStyle(0xe1b35a, 0.16);
    graphics.fillCircle(820, 230, 84);
  }
}
