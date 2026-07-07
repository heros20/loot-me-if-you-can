import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { DungeonScene } from './scenes/DungeonScene';
import { GuildTavernScene } from './scenes/GuildTavernScene';
import { MenuScene } from './scenes/MenuScene';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from './game/constants';
import { GameDomUi } from './ui/domUi';
import './styles.css';

const uiRoot = document.querySelector<HTMLDivElement>('#ui-root');

if (!uiRoot) {
  throw new Error('Missing #ui-root element.');
}

new GameDomUi(uiRoot);

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-canvas',
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  backgroundColor: '#151217',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene, DungeonScene, GuildTavernScene],
});
