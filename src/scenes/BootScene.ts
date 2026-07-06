import Phaser from 'phaser';
import { EXTERNAL_TEXTURES } from '../assets/manifest';
import { createPlaceholderTextures } from '../assets/placeholderTextures';

export class BootScene extends Phaser.Scene {
  private failedExternalTextures = new Set<string>();

  constructor() {
    super('BootScene');
  }

  preload(): void {
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      if (typeof file.key === 'string') {
        this.failedExternalTextures.add(file.key);
      }
    });

    EXTERNAL_TEXTURES.forEach((texture) => {
      this.load.image(texture.key, texture.path);
    });
  }

  create(): void {
    createPlaceholderTextures(this);

    if (this.failedExternalTextures.size > 0) {
      console.warn(
        `[assets] ${this.failedExternalTextures.size} external texture(s) failed to load; using generated fallbacks: ${
          [...this.failedExternalTextures].join(', ')
        }`,
      );
    }

    this.scene.start('MenuScene');
  }
}
