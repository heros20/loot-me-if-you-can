import Phaser from 'phaser';
import { registerPresentationAnimations } from '../assets/animationManifest';
import { AUDIO_ASSETS, EXTERNAL_TEXTURES, SPRITESHEET_ASSETS } from '../assets/manifest';
import { createPlaceholderTextures } from '../assets/placeholderTextures';

export class BootScene extends Phaser.Scene {
  private failedExternalAssets = new Set<string>();

  constructor() {
    super('BootScene');
  }

  preload(): void {
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      if (typeof file.key === 'string') {
        this.failedExternalAssets.add(file.key);
      }
    });

    EXTERNAL_TEXTURES.forEach((texture) => {
      this.load.image(texture.key, texture.path);
    });

    SPRITESHEET_ASSETS.forEach((sheet) => {
      this.load.spritesheet(sheet.key, sheet.path, {
        frameWidth: sheet.frameWidth,
        frameHeight: sheet.frameHeight,
      });
    });

    AUDIO_ASSETS.forEach((sound) => {
      this.load.audio(sound.key, sound.path);
    });
  }

  create(): void {
    createPlaceholderTextures(this);
    registerPresentationAnimations(this);

    if (this.failedExternalAssets.size > 0) {
      console.warn(
        `[assets] ${this.failedExternalAssets.size} external asset(s) failed to load; using visual fallbacks or silent audio: ${
          [...this.failedExternalAssets].join(', ')
        }`,
      );
    }

    this.scene.start('MenuScene');
  }
}
