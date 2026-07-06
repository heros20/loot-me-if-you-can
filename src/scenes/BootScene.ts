import Phaser from 'phaser';
import { EXTERNAL_TEXTURES } from '../assets/manifest';
import { createPlaceholderTextures } from '../assets/placeholderTextures';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    EXTERNAL_TEXTURES.forEach((texture) => {
      this.load.image(texture.key, texture.path);
    });
  }

  create(): void {
    createPlaceholderTextures(this);
    this.scene.start('MenuScene');
  }
}
