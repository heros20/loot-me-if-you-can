import Phaser from 'phaser';
import { TEXTURE_KEYS } from './manifest';

export function createPlaceholderTextures(scene: Phaser.Scene): void {
  makeTexture(scene, TEXTURE_KEYS.tileFloor, 48, (graphics) => {
    graphics.fillStyle(0x242025, 1);
    graphics.fillRect(0, 0, 48, 48);
    graphics.lineStyle(1, 0x3a3030, 1);
    graphics.strokeRect(0.5, 0.5, 47, 47);
  });

  makeTexture(scene, TEXTURE_KEYS.tileRock, 48, (graphics) => {
    graphics.fillStyle(0x24272b, 1);
    graphics.fillRect(0, 0, 48, 48);
    graphics.fillStyle(0x343a3d, 1);
    graphics.fillTriangle(2, 10, 18, 3, 12, 22);
    graphics.fillTriangle(24, 5, 47, 13, 32, 28);
    graphics.fillTriangle(6, 34, 25, 24, 42, 44);
    graphics.lineStyle(2, 0x161315, 0.9);
    graphics.strokeRect(1, 1, 46, 46);
  });

  makeTexture(scene, TEXTURE_KEYS.tileRoom, 48, (graphics) => {
    graphics.fillStyle(0x2c2522, 1);
    graphics.fillRect(0, 0, 48, 48);
    graphics.lineStyle(2, 0x6f5b45, 0.8);
    graphics.strokeRect(7, 7, 34, 34);
    graphics.lineStyle(1, 0x1a1616, 0.85);
    graphics.strokeRect(0.5, 0.5, 47, 47);
  });

  makeTexture(scene, TEXTURE_KEYS.tileGuardRoom, 48, (graphics) => {
    graphics.fillStyle(0x25332d, 1);
    graphics.fillRect(0, 0, 48, 48);
    graphics.lineStyle(2, 0x79c7a1, 0.82);
    graphics.strokeRect(8, 8, 32, 32);
    graphics.lineStyle(2, 0x3d725d, 0.72);
    graphics.lineBetween(15, 33, 33, 15);
    graphics.lineBetween(15, 15, 33, 33);
  });

  makeTexture(scene, TEXTURE_KEYS.tileCrypt, 48, (graphics) => {
    graphics.fillStyle(0x2b2a32, 1);
    graphics.fillRect(0, 0, 48, 48);
    graphics.lineStyle(2, 0x9f947e, 0.82);
    graphics.strokeCircle(24, 24, 13);
    graphics.lineStyle(1, 0x161315, 0.9);
    graphics.strokeRect(0.5, 0.5, 47, 47);
  });

  makeTexture(scene, TEXTURE_KEYS.tileTreasureRoom, 48, (graphics) => {
    graphics.fillStyle(0x342b1c, 1);
    graphics.fillRect(0, 0, 48, 48);
    graphics.fillStyle(0x5a4521, 1);
    graphics.fillRect(6, 6, 36, 36);
    graphics.lineStyle(2, 0xe1b35a, 0.92);
    graphics.strokeRect(8, 8, 32, 32);
    graphics.fillStyle(0xe1b35a, 0.9);
    graphics.fillCircle(24, 24, 4);
    graphics.fillCircle(16, 16, 2);
    graphics.fillCircle(32, 32, 2);
  });

  makeTexture(scene, TEXTURE_KEYS.tileThroneRoom, 48, (graphics) => {
    graphics.fillStyle(0x351b24, 1);
    graphics.fillRect(0, 0, 48, 48);
    graphics.lineStyle(2, 0x8f2631, 0.95);
    graphics.strokeRect(7, 7, 34, 34);
    graphics.lineStyle(2, 0xd85a32, 0.72);
    graphics.lineBetween(12, 34, 24, 12);
    graphics.lineBetween(24, 12, 36, 34);
    graphics.fillStyle(0xe1b35a, 0.88);
    graphics.fillTriangle(17, 21, 24, 12, 31, 21);
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

  makeTexture(scene, TEXTURE_KEYS.door, 34, (graphics) => {
    graphics.fillStyle(0x8a5a34, 1);
    graphics.fillRoundedRect(5, 3, 24, 28, 3);
    graphics.lineStyle(2, 0x2c1810, 1);
    graphics.strokeRoundedRect(5, 3, 24, 28, 3);
    graphics.fillStyle(0xe1b35a, 1);
    graphics.fillCircle(23, 17, 2);
  });

  makeTexture(scene, TEXTURE_KEYS.decor.transitionDown, 24, (graphics) => {
    graphics.fillStyle(0x0f0d10, 0.9);
    graphics.fillRoundedRect(1, 1, 22, 22, 4);
    graphics.fillStyle(0x6e93c9, 1);
    graphics.fillTriangle(6, 8, 18, 8, 12, 18);
  });

  makeTexture(scene, TEXTURE_KEYS.decor.transitionUp, 24, (graphics) => {
    graphics.fillStyle(0x0f0d10, 0.9);
    graphics.fillRoundedRect(1, 1, 22, 22, 4);
    graphics.fillStyle(0x79c7a1, 1);
    graphics.fillTriangle(6, 16, 18, 16, 12, 6);
  });

  makeTexture(scene, TEXTURE_KEYS.decor.treasureGold, 24, (graphics) => {
    graphics.fillStyle(0xe1b35a, 1);
    graphics.fillRoundedRect(4, 8, 16, 11, 3);
    graphics.fillStyle(0x7a4a13, 1);
    graphics.fillRect(7, 5, 10, 5);
  });

  makeTexture(scene, TEXTURE_KEYS.decor.treasureWeapon, 24, (graphics) => {
    graphics.lineStyle(3, 0xd85a32, 1);
    graphics.lineBetween(7, 18, 17, 6);
    graphics.lineStyle(2, 0xf6d88a, 1);
    graphics.lineBetween(6, 14, 11, 19);
  });

  makeTexture(scene, TEXTURE_KEYS.decor.treasureArmor, 24, (graphics) => {
    graphics.fillStyle(0x7d94d6, 1);
    graphics.fillTriangle(12, 4, 20, 8, 17, 19);
    graphics.fillTriangle(12, 4, 4, 8, 7, 19);
    graphics.lineStyle(1, 0xd8e2ff, 1);
    graphics.strokeTriangle(12, 4, 20, 8, 17, 19);
  });

  makeTexture(scene, TEXTURE_KEYS.decor.treasureTechnique, 24, (graphics) => {
    graphics.fillStyle(0xb873d6, 1);
    graphics.fillCircle(12, 12, 7);
    graphics.lineStyle(2, 0xe8c8ff, 1);
    graphics.strokeCircle(12, 12, 9);
  });

  makeTexture(scene, TEXTURE_KEYS.decor.remains, 24, (graphics) => {
    graphics.fillStyle(0xd8d0b8, 1);
    graphics.fillCircle(12, 8, 5);
    graphics.lineStyle(2, 0xd8d0b8, 1);
    graphics.lineBetween(5, 17, 19, 11);
    graphics.lineBetween(5, 11, 19, 17);
  });

  makeTexture(scene, TEXTURE_KEYS.decor.relic, 24, (graphics) => {
    graphics.fillStyle(0xd6b15f, 1);
    graphics.fillRoundedRect(7, 5, 10, 14, 2);
    graphics.lineStyle(1, 0x4a3217, 1);
    graphics.lineBetween(9, 9, 15, 9);
    graphics.lineBetween(9, 13, 14, 13);
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

  makeTexture(scene, TEXTURE_KEYS.defense.roomLockTrap, 34, (graphics) => {
    graphics.fillStyle(0x27313a, 1);
    graphics.fillCircle(17, 17, 15);
    graphics.lineStyle(3, 0x9fb0c0, 1);
    graphics.strokeRoundedRect(8, 11, 18, 15, 3);
    graphics.fillStyle(0xe1b35a, 1);
    graphics.fillCircle(17, 20, 3);
    graphics.lineStyle(2, 0x9fb0c0, 1);
    graphics.beginPath();
    graphics.arc(17, 13, 6, Math.PI, 0, false);
    graphics.strokePath();
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

  makeTexture(scene, TEXTURE_KEYS.defense.guardian, 38, (graphics) => {
    graphics.fillStyle(0x5a1f2a, 1);
    graphics.fillCircle(19, 19, 16);
    graphics.lineStyle(3, 0xd65f5f, 1);
    graphics.strokeCircle(19, 19, 15);
    graphics.fillStyle(0xf6d88a, 0.95);
    graphics.fillTriangle(11, 20, 19, 6, 27, 20);
    graphics.fillStyle(0x211318, 0.92);
    graphics.fillRect(11, 21, 16, 8);
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

  makeTexture(scene, TEXTURE_KEYS.adventurer.cartographer, 32, (graphics) => {
    graphics.fillStyle(0xd6b15f, 1);
    graphics.fillCircle(16, 16, 13);
    graphics.fillStyle(0x3b2b18, 0.75);
    graphics.fillRect(8, 10, 16, 11);
    graphics.fillStyle(0xf4ead2, 0.95);
    graphics.fillRect(10, 12, 12, 7);
    graphics.lineStyle(1, 0x3b2b18, 1);
    graphics.lineBetween(12, 13, 20, 13);
    graphics.lineBetween(12, 16, 19, 16);
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
