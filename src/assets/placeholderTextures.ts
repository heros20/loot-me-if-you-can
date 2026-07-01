import Phaser from 'phaser';
import { TEXTURE_KEYS } from './manifest';

export function createPlaceholderTextures(scene: Phaser.Scene): void {
  makeTexture(scene, TEXTURE_KEYS.tileFloor, 48, (graphics) => {
    graphics.fillStyle(0x242025, 1);
    graphics.fillRect(0, 0, 48, 48);
    graphics.lineStyle(1, 0x3a3030, 1);
    graphics.strokeRect(0.5, 0.5, 47, 47);
  });

  makeTexture(scene, TEXTURE_KEYS.tileWall, 48, (graphics) => {
    graphics.fillStyle(0x3a3431, 1);
    graphics.fillRect(0, 0, 48, 48);
    graphics.fillStyle(0x51473e, 1);
    graphics.fillRect(0, 7, 48, 5);
    graphics.fillRect(0, 25, 48, 5);
    graphics.lineStyle(2, 0x161315, 0.9);
    graphics.strokeRect(1, 1, 46, 46);
  });

  makeTexture(scene, TEXTURE_KEYS.tileEntry, 48, (graphics) => {
    graphics.fillStyle(0x263d37, 1);
    graphics.fillRect(0, 0, 48, 48);
    graphics.lineStyle(3, 0x79c7a1, 1);
    graphics.strokeCircle(24, 24, 16);
  });

  makeTexture(scene, TEXTURE_KEYS.tileTreasure, 48, (graphics) => {
    graphics.fillStyle(0x3a2e22, 1);
    graphics.fillRect(0, 0, 48, 48);
    graphics.fillStyle(0xe1b35a, 1);
    graphics.fillRect(13, 19, 22, 15);
    graphics.fillStyle(0x8f5f2b, 1);
    graphics.fillRect(16, 15, 16, 7);
  });

  makeTexture(scene, TEXTURE_KEYS.tileBoss, 48, (graphics) => {
    graphics.fillStyle(0x3b1720, 1);
    graphics.fillRect(0, 0, 48, 48);
    graphics.lineStyle(3, 0x8f2631, 1);
    graphics.strokeRect(6, 6, 36, 36);
  });

  makeTexture(scene, TEXTURE_KEYS.boss, 44, (graphics) => {
    graphics.fillStyle(0x8f2631, 1);
    graphics.fillCircle(22, 24, 16);
    graphics.fillStyle(0xe1b35a, 1);
    graphics.fillTriangle(10, 17, 15, 5, 20, 17);
    graphics.fillTriangle(24, 17, 29, 5, 34, 17);
    graphics.lineStyle(2, 0xfff4d8, 0.75);
    graphics.strokeCircle(22, 24, 16);
  });

  makeTexture(scene, TEXTURE_KEYS.defense.spikeTrap, 34, (graphics) => {
    graphics.fillStyle(0x2b2829, 1);
    graphics.fillCircle(17, 17, 15);
    graphics.fillStyle(0xc8c1ad, 1);
    graphics.fillTriangle(9, 24, 14, 8, 19, 24);
    graphics.fillTriangle(17, 25, 22, 9, 27, 25);
  });

  makeTexture(scene, TEXTURE_KEYS.defense.fireTrap, 34, (graphics) => {
    graphics.fillStyle(0x4a1e19, 1);
    graphics.fillCircle(17, 17, 15);
    graphics.fillStyle(0xd85a32, 1);
    graphics.fillTriangle(10, 25, 18, 6, 25, 25);
    graphics.fillStyle(0xe1b35a, 1);
    graphics.fillTriangle(14, 25, 19, 13, 23, 25);
  });

  makeTexture(scene, TEXTURE_KEYS.defense.slime, 34, (graphics) => {
    graphics.fillStyle(0x6dbb5d, 0.95);
    graphics.fillCircle(17, 19, 14);
    graphics.fillStyle(0xa7e489, 1);
    graphics.fillCircle(12, 14, 4);
  });

  makeTexture(scene, TEXTURE_KEYS.defense.skeleton, 34, (graphics) => {
    graphics.fillStyle(0xd8d0b8, 1);
    graphics.fillCircle(17, 14, 10);
    graphics.fillRect(13, 22, 8, 8);
    graphics.fillStyle(0x282323, 1);
    graphics.fillCircle(13, 14, 2);
    graphics.fillCircle(21, 14, 2);
  });

  makeTexture(scene, TEXTURE_KEYS.defense.goblin, 34, (graphics) => {
    graphics.fillStyle(0x9fbd4d, 1);
    graphics.fillCircle(17, 17, 13);
    graphics.fillStyle(0x5d782f, 1);
    graphics.fillTriangle(5, 15, 0, 10, 9, 11);
    graphics.fillTriangle(29, 15, 34, 10, 25, 11);
  });

  makeTexture(scene, TEXTURE_KEYS.adventurer.warrior, 32, (graphics) => {
    graphics.fillStyle(0xc88b4a, 1);
    graphics.fillCircle(16, 16, 13);
    graphics.lineStyle(3, 0xf4ead2, 0.7);
    graphics.strokeCircle(16, 16, 12);
  });

  makeTexture(scene, TEXTURE_KEYS.adventurer.thief, 32, (graphics) => {
    graphics.fillStyle(0x7d94d6, 1);
    graphics.fillCircle(16, 16, 13);
    graphics.fillStyle(0x1a1925, 0.7);
    graphics.fillRect(7, 11, 18, 6);
  });

  makeTexture(scene, TEXTURE_KEYS.adventurer.mage, 32, (graphics) => {
    graphics.fillStyle(0xb873d6, 1);
    graphics.fillCircle(16, 17, 12);
    graphics.fillStyle(0xf4ead2, 1);
    graphics.fillTriangle(7, 14, 16, 3, 25, 14);
  });

  makeTexture(scene, TEXTURE_KEYS.adventurer.healer, 32, (graphics) => {
    graphics.fillStyle(0x79c7a1, 1);
    graphics.fillCircle(16, 16, 13);
    graphics.fillStyle(0xf4ead2, 1);
    graphics.fillRect(14, 8, 4, 16);
    graphics.fillRect(8, 14, 16, 4);
  });
}

function makeTexture(
  scene: Phaser.Scene,
  key: string,
  size: number,
  draw: (graphics: Phaser.GameObjects.Graphics) => void,
): void {
  if (scene.textures.exists(key)) {
    return;
  }

  const graphics = scene.add.graphics();
  draw(graphics);
  graphics.generateTexture(key, size, size);
  graphics.destroy();
}
